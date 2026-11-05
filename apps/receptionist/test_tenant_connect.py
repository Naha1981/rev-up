"""Tests for the customer-owned WhatsApp connection (tenant's own key).

Zernio's API is faked with httpx.MockTransport, same pattern as
apps/social_accounts/tests/test_zernio_connect.py: the real client code runs
- URL building, auth header, envelope parsing - without network.
"""

import hashlib
import hmac
import json

import httpx
import pytest
from django.urls import reverse

from apps.receptionist import sending, tenant_connect
from apps.receptionist.models import Contact, Message, TenantMessagingConnection, ZernioChannel
from providers.zernio import ZernioClient

PROFILE_ID = "6ae5c27578e791344ced7480"
ACCOUNT_ID = "6af1c27578e791344ced7001"
WEBHOOK_ID = "wh_01"


@pytest.fixture
def workspace(db, organization):
    from apps.workspaces.models import Workspace

    return Workspace.objects.create(name="Test WS", organization=organization)


@pytest.fixture
def member(db, user, organization, workspace):
    from apps.members.models import OrgMembership, WorkspaceMembership

    OrgMembership.objects.create(user=user, organization=organization, org_role="owner")
    WorkspaceMembership.objects.create(user=user, workspace=workspace, workspace_role="manager")
    return user


@pytest.fixture
def auth_client(client, member):
    client.force_login(member)
    return client


@pytest.fixture
def flag_on(settings):
    settings.TENANT_OWNED_WHATSAPP_ENABLED = True
    return settings


def _client(routes) -> ZernioClient:
    def handler(request: httpx.Request) -> httpx.Response:
        body = routes.get(request.url.path)
        if isinstance(body, list):
            status, payload = body
        else:
            status, payload = 200, body
        if payload is None:
            return httpx.Response(404, json={"error": "not found", "code": "not_found", "type": "not_found"})
        return httpx.Response(status, json=payload)

    return ZernioClient(api_key="tenant-key", base_url="https://mock.test", transport=httpx.MockTransport(handler))


def _patch_client(monkeypatch, routes):
    monkeypatch.setattr(tenant_connect, "ZernioClient", lambda api_key: _client(routes))


def _ok_routes(**overrides):
    routes = {
        "/accounts": {"accounts": []},
        "/profiles": {"profiles": [{"_id": PROFILE_ID, "name": "Test WS"}]},
        "/connect/whatsapp": {"authUrl": "https://connect.mock/abc"},
        "/webhooks/settings": {"webhook": {"_id": WEBHOOK_ID}},
        "/webhooks/test": {"success": True},
    }
    routes.update(overrides)
    return routes


# ------------------------------------------------------------------
# save key
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestSaveKey:
    def test_flag_off_404(self, auth_client, workspace):
        resp = auth_client.get(reverse("receptionist:tenant_wa_setup", args=[workspace.id]))
        assert resp.status_code == 404

    def test_bad_key_not_saved(self, auth_client, workspace, flag_on, monkeypatch):
        _patch_client(monkeypatch, {"/accounts": [401, {"error": "bad key", "code": "unauthorized"}]})
        resp = auth_client.post(
            reverse("receptionist:tenant_wa_setup", args=[workspace.id]),
            {"action": "save_key", "api_key": "wrong-key"},
        )
        assert resp.status_code == 302
        assert TenantMessagingConnection.objects.count() == 0

    def test_good_key_saved_and_profile_resolved(self, auth_client, workspace, flag_on, monkeypatch):
        _patch_client(monkeypatch, _ok_routes())
        resp = auth_client.post(
            reverse("receptionist:tenant_wa_setup", args=[workspace.id]),
            {"action": "save_key", "api_key": "tenant-key"},
        )
        assert resp.status_code == 302
        conn = TenantMessagingConnection.objects.get(workspace=workspace)
        assert conn.profile_id == PROFILE_ID
        assert conn.status == TenantMessagingConnection.Status.KEY_VALID
        assert conn.api_key == "tenant-key"  # decrypts back to the pasted key
        # The stored value is not the plaintext.
        from django.db import connection as db_connection

        pk_literal = conn.pk.hex if db_connection.vendor == "sqlite" else str(conn.pk)
        with db_connection.cursor() as cur:
            cur.execute("select api_key from receptionist_tenantmessagingconnection where id = %s", [pk_literal])
            raw = cur.fetchone()[0]
        assert raw != "tenant-key"

    def test_other_workspace_member_forbidden(self, client, workspace, flag_on, django_user_model):
        from django.utils import timezone

        stranger = django_user_model.objects.create_user(
            email="stranger@example.com", password="x", tos_accepted_at=timezone.now()
        )
        client.force_login(stranger)
        resp = client.get(reverse("receptionist:tenant_wa_setup", args=[workspace.id]))
        assert resp.status_code == 403


# ------------------------------------------------------------------
# connect start
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestConnectStart:
    def _saved_connection(self, workspace):
        return TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            status=TenantMessagingConnection.Status.KEY_VALID,
        )

    def test_start_uses_tenant_key_and_stashes_session(self, auth_client, workspace, flag_on, monkeypatch):
        conn = self._saved_connection(workspace)
        captured = {}
        real = _client(_ok_routes())

        class CaptureClient(ZernioClient):
            def __init__(self, api_key):
                captured["api_key"] = api_key
                self._inner = real

            def __enter__(self):
                return self._inner

            def __exit__(self, *a):
                return None

        monkeypatch.setattr(tenant_connect, "ZernioClient", CaptureClient)
        resp = auth_client.post(reverse("receptionist:tenant_wa_start", args=[workspace.id]))
        assert resp.status_code == 302
        assert resp.url == "https://connect.mock/abc"
        assert captured["api_key"] == "tenant-key"
        session = auth_client.session[tenant_connect.SESSION_KEY]
        assert session["workspace_id"] == str(workspace.id)
        assert session["profile_id"] == PROFILE_ID
        conn.refresh_from_db()
        assert conn.status == TenantMessagingConnection.Status.CONNECTING

    def test_start_402_free_tier_message(self, auth_client, workspace, flag_on, monkeypatch):
        self._saved_connection(workspace)
        _patch_client(
            monkeypatch, {"/connect/whatsapp": [402, {"error": "free_tier_limit", "code": "free_tier_limit"}]}
        )
        resp = auth_client.post(reverse("receptionist:tenant_wa_start", args=[workspace.id]))
        assert resp.status_code == 302  # back to setup with the free-tier message, no crash

    def test_start_without_key_redirects(self, auth_client, workspace, flag_on):
        resp = auth_client.post(reverse("receptionist:tenant_wa_start", args=[workspace.id]))
        assert resp.status_code == 302
        assert TenantMessagingConnection.objects.count() == 0


# ------------------------------------------------------------------
# callback
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestCallback:
    def _connecting(self, workspace, client, user):
        TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            status=TenantMessagingConnection.Status.CONNECTING,
        )
        session = client.session
        session[tenant_connect.SESSION_KEY] = {
            "workspace_id": str(workspace.id),
            "profile_id": PROFILE_ID,
            "user_id": str(user.id),
        }
        session.save()

    def _callback_url(self, workspace, **params):
        base = reverse("receptionist:tenant_wa_callback", args=[workspace.id])
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base}?{query}" if query else base

    def test_session_mismatch_rejected(self, auth_client, workspace, flag_on):
        TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
        )
        resp = auth_client.get(
            self._callback_url(workspace, connected="whatsapp", profileId=PROFILE_ID, accountId=ACCOUNT_ID)
        )
        assert resp.status_code == 302
        assert ZernioChannel.objects.count() == 0

    def test_error_cancel_maps_cleanly(self, auth_client, workspace, member, flag_on, monkeypatch):
        self._connecting(workspace, auth_client, member)
        resp = auth_client.get(self._callback_url(workspace, error="connection_cancelled"))
        assert resp.status_code == 302
        conn = TenantMessagingConnection.objects.get(workspace=workspace)
        assert conn.status == TenantMessagingConnection.Status.KEY_VALID

    def test_success_registers_webhook_and_channel(self, auth_client, workspace, member, flag_on, monkeypatch):
        self._connecting(workspace, auth_client, member)
        _patch_client(
            monkeypatch,
            _ok_routes(
                **{
                    "/accounts": {
                        "accounts": [
                            {
                                "_id": ACCOUNT_ID,
                                "platform": "whatsapp",
                                "profileId": PROFILE_ID,
                                "username": "27612345678",
                                "name": "Test WS WhatsApp",
                            }
                        ]
                    },
                }
            ),
        )
        resp = auth_client.get(
            self._callback_url(
                workspace,
                connected="whatsapp",
                profileId=PROFILE_ID,
                accountId=ACCOUNT_ID,
                username="27612345678",
            )
        )
        assert resp.status_code == 302
        conn = TenantMessagingConnection.objects.get(workspace=workspace)
        assert conn.status == TenantMessagingConnection.Status.CONNECTED
        assert conn.account_id == ACCOUNT_ID
        assert conn.phone_number == "27612345678"
        assert conn.webhook_id == WEBHOOK_ID
        assert len(conn.webhook_secret) == 64
        channel = ZernioChannel.objects.get(workspace=workspace)
        assert channel.zernio_account_id == ACCOUNT_ID
        assert channel.is_sandbox is False

    def test_account_not_on_tenant_list_rejected(self, auth_client, workspace, member, flag_on, monkeypatch):
        self._connecting(workspace, auth_client, member)
        _patch_client(monkeypatch, _ok_routes())  # /accounts returns empty
        resp = auth_client.get(
            self._callback_url(
                workspace,
                connected="whatsapp",
                profileId=PROFILE_ID,
                accountId=ACCOUNT_ID,
            )
        )
        assert resp.status_code == 302
        conn = TenantMessagingConnection.objects.get(workspace=workspace)
        assert conn.status == TenantMessagingConnection.Status.CONNECTING  # not flipped
        assert ZernioChannel.objects.count() == 0


# ------------------------------------------------------------------
# webhook signature fallback + disconnect handling
# ------------------------------------------------------------------


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest.mark.django_db
class TestTenantWebhook:
    def _post(self, client, payload: dict, secret: str):
        body = json.dumps(payload).encode()
        return client.post(
            "/webhooks/zernio/",
            data=body,
            content_type="application/json",
            HTTP_X_ZERNIO_SIGNATURE=_sign(body, secret),
        )

    def test_tenant_secret_accepted_and_disconnect_marks_needs_attention(self, client, workspace, settings):
        settings.ZERNIO_WEBHOOK_SECRET = "shared-secret"
        conn = TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            account_id=ACCOUNT_ID,
            webhook_id=WEBHOOK_ID,
            webhook_secret="tenant-secret",
            status=TenantMessagingConnection.Status.CONNECTED,
        )
        resp = self._post(
            client,
            {
                "id": "evt_tenant_1",
                "event": "account.disconnected",
                "account": {"accountId": ACCOUNT_ID, "profileId": PROFILE_ID},
            },
            "tenant-secret",
        )
        assert resp.status_code == 200
        conn.refresh_from_db()
        assert conn.status == TenantMessagingConnection.Status.NEEDS_ATTENTION

    def test_wrong_secret_403(self, client, workspace, settings):
        settings.ZERNIO_WEBHOOK_SECRET = "shared-secret"
        TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            account_id=ACCOUNT_ID,
            webhook_id=WEBHOOK_ID,
            webhook_secret="tenant-secret",
            status=TenantMessagingConnection.Status.CONNECTED,
        )
        resp = self._post(
            client,
            {
                "id": "evt_tenant_2",
                "event": "account.disconnected",
                "account": {"accountId": ACCOUNT_ID, "profileId": PROFILE_ID},
            },
            "forged-secret",
        )
        assert resp.status_code == 403
        TenantMessagingConnection.objects.get(workspace=workspace).refresh_from_db()
        assert (
            TenantMessagingConnection.objects.get(workspace=workspace).status
            == TenantMessagingConnection.Status.CONNECTED
        )


# ------------------------------------------------------------------
# sending on the tenant's key
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestTenantSending:
    def _setup_chat(self, workspace):
        channel = ZernioChannel.objects.create(
            workspace=workspace,
            zernio_account_id=ACCOUNT_ID,
            phone_number="27612345678",
            is_sandbox=False,
        )
        contact = Contact.objects.create(workspace=workspace, wa_id="27770000001", zernio_conversation_id="conv-1")
        Message.objects.create(
            workspace=workspace,
            contact=contact,
            direction=Message.Direction.INBOUND,
            sender_type=Message.SenderType.USER,
            body="hi",
            is_draft=False,
        )
        draft = Message.objects.create(
            workspace=workspace,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.AI,
            body="hello back",
            is_draft=True,
        )
        return channel, contact, draft

    def test_send_uses_tenant_key(self, workspace, settings, monkeypatch):
        settings.ZERNIO_API_KEY = "shared-key"
        settings.ZERNIO_BASE_URL = "https://mock.test/api/v1"
        TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            account_id=ACCOUNT_ID,
            status=TenantMessagingConnection.Status.CONNECTED,
        )
        channel, contact, draft = self._setup_chat(workspace)
        captured = {}

        def fake_post(url, headers=None, json=None, timeout=None):
            captured["headers"] = headers

            class Resp:
                content = b'{"messageId": "m1"}'

                def raise_for_status(self):
                    return None

                def json(self):
                    return {"messageId": "m1"}

            return Resp()

        monkeypatch.setattr(sending.httpx, "post", fake_post)
        assert sending.send_draft(channel, contact, draft) is True
        assert captured["headers"]["Authorization"] == "Bearer tenant-key"
        draft.refresh_from_db()
        assert draft.is_draft is False

    def test_needs_attention_holds_drafts(self, workspace, settings, monkeypatch):
        settings.ZERNIO_API_KEY = "shared-key"
        TenantMessagingConnection.objects.create(
            workspace=workspace,
            api_key="tenant-key",
            profile_id=PROFILE_ID,
            account_id=ACCOUNT_ID,
            status=TenantMessagingConnection.Status.NEEDS_ATTENTION,
        )
        channel, contact, draft = self._setup_chat(workspace)
        monkeypatch.setattr(
            sending.httpx, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("must not send"))
        )
        assert sending.send_draft(channel, contact, draft) is False
        draft.refresh_from_db()
        assert draft.is_draft is True

    def test_no_tenant_connection_uses_shared_key(self, workspace, settings, monkeypatch):
        settings.ZERNIO_API_KEY = "shared-key"
        settings.ZERNIO_BASE_URL = "https://mock.test/api/v1"
        channel, contact, draft = self._setup_chat(workspace)
        captured = {}

        def fake_post(url, headers=None, json=None, timeout=None):
            captured["headers"] = headers

            class Resp:
                content = b"{}"

                def raise_for_status(self):
                    return None

                def json(self):
                    return {}

            return Resp()

        monkeypatch.setattr(sending.httpx, "post", fake_post)
        assert sending.send_draft(channel, contact, draft) is True
        assert captured["headers"]["Authorization"] == "Bearer shared-key"
