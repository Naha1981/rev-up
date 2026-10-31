"""Tests for the Zernio connect flow (M2).

Zernio's API is faked with httpx.MockTransport so every test runs the real
client code - URL building, auth header, envelope parsing - without network.
"""

from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from django.urls import reverse

from apps.social_accounts.models import SocialAccount, WorkspaceProviderProfile
from apps.social_accounts.zernio_connect import (
    ZERNIO_MANAGED_PLATFORMS,
    ZERNIO_SESSION_KEY,
    sync_zernio_accounts,
    zernio_ready,
)
from providers.zernio import ZernioClient

PROFILE_ID = "6ae5c27578e791344ced7480"
ACCOUNT_ID = "6af1c27578e791344ced7001"


@pytest.fixture
def workspace(db, organization):
    from apps.workspaces.models import Workspace

    return Workspace.objects.create(name="Test WS", organization=organization)


@pytest.fixture
def manager_setup(db, user, organization, workspace):
    from apps.members.models import OrgMembership, WorkspaceMembership

    OrgMembership.objects.create(user=user, organization=organization, org_role="owner")
    WorkspaceMembership.objects.create(user=user, workspace=workspace, workspace_role="manager")
    return user


@pytest.fixture
def authenticated_client(client, user, manager_setup):
    client.force_login(user)
    return client


@pytest.fixture
def zernio_on(settings):
    settings.ZERNIO_ENABLED = True
    settings.ZERNIO_API_KEY = "test-key"
    return settings


def _zernio_transport(routes):
    """Build an httpx.MockTransport from {path: response_dict_or_list}."""

    def handler(request: httpx.Request) -> httpx.Response:
        body = routes.get(request.url.path)
        if isinstance(body, list):
            status, payload = body
        else:
            status, payload = 200, body
        if payload is None:
            return httpx.Response(404, json={"error": "not found", "code": "not_found", "type": "not_found"})
        return httpx.Response(status, json=payload)

    return httpx.MockTransport(handler)


def _client(routes) -> ZernioClient:
    # base_url without the /api/v1 prefix so route keys stay short paths.
    return ZernioClient(api_key="test-key", base_url="https://mock.test", transport=_zernio_transport(routes))


def _account_payload(**overrides):
    account = {
        "_id": ACCOUNT_ID,
        "platform": "facebook",
        "profileId": PROFILE_ID,
        "username": "acmebrand",
        "displayName": "Acme Brand",
        "platformUserId": "page-123",
        "profilePicture": "https://img.example.com/acme.png",
        "isActive": True,
        "needsReconnection": False,
    }
    account.update(overrides)
    return account


# ------------------------------------------------------------------
# zernio_ready
# ------------------------------------------------------------------


class TestZernioReady:
    def test_off_by_default(self, settings):
        settings.ZERNIO_ENABLED = False
        settings.ZERNIO_API_KEY = "test-key"
        assert zernio_ready() is False

    def test_requires_api_key(self, settings):
        settings.ZERNIO_ENABLED = True
        settings.ZERNIO_API_KEY = ""
        assert zernio_ready() is False

    def test_on(self, zernio_on):
        assert zernio_ready() is True


# ------------------------------------------------------------------
# Connect grid
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestConnectGrid:
    def test_grid_marks_managed_platforms_configured_when_zernio_on(self, authenticated_client, workspace, zernio_on):
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.get(url)
        assert response.status_code == 200
        for platform in ("facebook", "instagram", "tiktok", "linkedin_personal", "linkedin_company"):
            assert platform in response.context["configured_platforms"]
        assert response.context["zernio_platforms"] == set(ZERNIO_MANAGED_PLATFORMS)

    def test_grid_hides_instagram_login_card_when_zernio_on(self, authenticated_client, workspace, zernio_on):
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.get(url)
        values = [value for value, _label in response.context["platform_choices"]]
        assert "instagram_login" not in values
        assert "instagram" in values

    def test_grid_never_offers_meta_connect(self, authenticated_client, workspace, zernio_on, settings):
        """Even with Meta app credentials present, no managed-platform card posts
        to the old OAuth endpoint (other platforms - mastodon etc. - legitimately
        still use it, so the check is per-card)."""
        settings.PLATFORM_CREDENTIALS_FROM_ENV = {"facebook": {"app_id": "i", "app_secret": "s"}}
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.get(url)
        for platform in ("facebook", "instagram", "tiktok", "linkedin_personal", "linkedin_company"):
            # The old form carries the platform in a hidden input; the Zernio
            # form encodes it in the action URL instead.
            assert f'name="platform" value="{platform}"'.encode() not in response.content
            zernio_url = reverse(
                "social_accounts:connect_zernio", kwargs={"workspace_id": workspace.id, "platform": platform}
            )
            assert f'action="{zernio_url}"'.encode() in response.content

    def test_grid_marks_managed_platforms_unavailable_when_zernio_off(self, authenticated_client, workspace, settings):
        """ZERNIO_ENABLED=false is an off-switch, not a Meta fallback."""
        settings.ZERNIO_ENABLED = False
        settings.PLATFORM_CREDENTIALS_FROM_ENV = {
            "facebook": {"app_id": "i", "app_secret": "s"},
            "tiktok": {"client_key": "k", "client_secret": "s"},
        }
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.get(url)
        for platform in ("facebook", "instagram", "tiktok", "linkedin_personal", "linkedin_company"):
            assert platform not in response.context["configured_platforms"]
        assert response.context["zernio_platforms"] == set()


# ------------------------------------------------------------------
# Connect start
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestConnectStart:
    def _post(self, client, workspace, platform):
        url = reverse("social_accounts:connect_zernio", kwargs={"workspace_id": workspace.id, "platform": platform})
        return client.post(url)

    def test_starts_hosted_flow_and_stashes_session(self, authenticated_client, workspace, zernio_on, monkeypatch):
        routes = {
            "/profiles": {"profile": {"_id": PROFILE_ID, "name": "Test WS"}},
            "/connect/facebook": {"authUrl": "https://zernio.com/connect/facebook?token=abc", "state": "s"},
        }
        monkeypatch.setattr("apps.social_accounts.zernio_connect.ZernioClient", lambda *a, **k: _client(routes))
        response = self._post(authenticated_client, workspace, "facebook")
        assert response.status_code == 302
        assert response.url == "https://zernio.com/connect/facebook?token=abc"

        session = authenticated_client.session[ZERNIO_SESSION_KEY]
        assert session["workspace_id"] == str(workspace.id)
        assert session["platform"] == "facebook"
        assert session["profile_id"] == PROFILE_ID

        record = WorkspaceProviderProfile.objects.get(workspace=workspace)
        assert record.profile_id == PROFILE_ID

    def test_profile_created_once_across_connects(self, authenticated_client, workspace, zernio_on, monkeypatch):
        calls = []

        def handler(request: httpx.Request) -> httpx.Response:
            calls.append(f"{request.method} {request.url.path}")
            if request.url.path == "/profiles" and request.method == "POST":
                return httpx.Response(201, json={"profile": {"_id": PROFILE_ID}})
            if request.url.path == "/connect/tiktok":
                return httpx.Response(200, json={"authUrl": "https://zernio.com/connect/tiktok?x=1"})
            return httpx.Response(404, json={"error": "nf"})

        monkeypatch.setattr(
            "apps.social_accounts.zernio_connect.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        self._post(authenticated_client, workspace, "tiktok")
        self._post(authenticated_client, workspace, "tiktok")
        assert calls.count("POST /profiles") == 1
        assert WorkspaceProviderProfile.objects.filter(workspace=workspace).count() == 1

    def test_linkedin_company_maps_to_zernio_linkedin(self, authenticated_client, workspace, zernio_on, monkeypatch):
        seen = {}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/profiles" and request.method == "POST":
                return httpx.Response(201, json={"profile": {"_id": PROFILE_ID}})
            if request.url.path.startswith("/connect/"):
                seen["path"] = request.url.path
                return httpx.Response(200, json={"authUrl": "https://zernio.com/connect/linkedin?x=1"})
            return httpx.Response(404, json={"error": "nf"})

        monkeypatch.setattr(
            "apps.social_accounts.zernio_connect.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        self._post(authenticated_client, workspace, "linkedin_company")
        assert seen["path"] == "/connect/linkedin"

    def test_unknown_platform_rejected(self, authenticated_client, workspace, zernio_on):
        response = self._post(authenticated_client, workspace, "twitter")
        assert response.status_code == 302  # back to grid with an error message

    def test_requires_zernio_on(self, authenticated_client, workspace, settings):
        settings.ZERNIO_ENABLED = False
        response = self._post(authenticated_client, workspace, "facebook")
        assert response.status_code == 302
        assert WorkspaceProviderProfile.objects.count() == 0

    def test_requires_permission(self, client, user, workspace, zernio_on):
        """A signed-in user with no workspace role gets 403."""
        client.force_login(user)
        url = reverse("social_accounts:connect_zernio", kwargs={"workspace_id": workspace.id, "platform": "facebook"})
        response = client.post(url)
        assert response.status_code == 403

    def test_old_connect_post_routes_managed_platform_to_zernio(
        self, authenticated_client, workspace, zernio_on, monkeypatch
    ):
        """A hand-built POST to the legacy endpoint cannot reach Meta OAuth."""
        routes = {
            "/profiles": {"profile": {"_id": PROFILE_ID}},
            "/connect/facebook": {"authUrl": "https://zernio.com/connect/facebook?token=z"},
        }
        monkeypatch.setattr("apps.social_accounts.zernio_connect.ZernioClient", lambda *a, **k: _client(routes))
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.post(url, {"platform": "facebook"})
        assert response.status_code == 302
        assert response.url.startswith("https://zernio.com/connect/")

    def test_old_connect_post_never_reaches_meta_when_zernio_off(self, authenticated_client, workspace, settings):
        settings.ZERNIO_ENABLED = False
        settings.PLATFORM_CREDENTIALS_FROM_ENV = {"facebook": {"app_id": "i", "app_secret": "s"}}
        url = reverse("social_accounts:connect", kwargs={"workspace_id": workspace.id})
        response = authenticated_client.post(url, {"platform": "facebook"})
        assert response.status_code == 302
        assert response.url == url  # bounced back to the grid, not off to Meta


# ------------------------------------------------------------------
# Callback
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestZernioCallback:
    def _seed_session(self, client, workspace, user, platform="facebook", profile_id=PROFILE_ID):
        session = client.session
        session[ZERNIO_SESSION_KEY] = {
            "workspace_id": str(workspace.id),
            "platform": platform,
            "profile_id": profile_id,
            "user_id": str(user.id),
        }
        session.save()

    def _profile(self, workspace):
        return WorkspaceProviderProfile.objects.create(workspace=workspace, profile_id=PROFILE_ID)

    def test_success_syncs_accounts(self, authenticated_client, user, workspace, zernio_on, monkeypatch):
        self._seed_session(authenticated_client, workspace, user)
        self._profile(workspace)
        monkeypatch.setattr(
            "apps.social_accounts.zernio_connect.ZernioClient",
            lambda *a, **k: _client({"/accounts": {"accounts": [_account_payload()]}}),
        )
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(
            url, {"connected": "facebook", "profileId": PROFILE_ID, "accountId": ACCOUNT_ID, "username": "acmebrand"}
        )
        assert response.status_code == 302

        account = SocialAccount.objects.get(workspace=workspace)
        assert account.platform == "facebook"
        assert account.account_platform_id == "page-123"
        assert account.provider == "zernio"
        assert account.provider_account_id == ACCOUNT_ID
        assert account.provider_profile_id == PROFILE_ID
        assert account.account_name == "Acme Brand"
        assert account.account_handle == "acmebrand"
        assert account.connection_status == SocialAccount.ConnectionStatus.CONNECTED
        assert account.oauth_access_token == ""  # Zernio holds the tokens

    def test_error_redirect_surfaces_message_and_creates_nothing(
        self, authenticated_client, user, workspace, zernio_on
    ):
        self._seed_session(authenticated_client, workspace, user)
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(url, {"error": "oauth_denied", "platform": "facebook"})
        assert response.status_code == 302
        assert SocialAccount.objects.count() == 0

    def test_missing_session_rejected(self, authenticated_client, workspace, zernio_on):
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(
            url, {"connected": "facebook", "profileId": PROFILE_ID, "accountId": "a", "username": "u"}
        )
        assert response.status_code == 302
        assert response.url == reverse("dashboard")

    def test_cross_tenant_profile_id_rejected(self, authenticated_client, user, workspace, zernio_on):
        """A callback naming another workspace's profile records nothing."""
        self._seed_session(authenticated_client, workspace, user, profile_id=PROFILE_ID)
        self._profile(workspace)
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(
            url,
            {"connected": "facebook", "profileId": "6bf2c27578e791344ced7999", "accountId": "x", "username": "u"},
        )
        assert response.status_code == 302
        assert SocialAccount.objects.count() == 0

    def test_other_user_session_rejected(self, authenticated_client, user, workspace, zernio_on, db):
        from django.contrib.auth import get_user_model

        other = get_user_model().objects.create_user(email="other@example.com", password="x")
        self._seed_session(authenticated_client, workspace, other)  # session belongs to someone else
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(
            url, {"connected": "facebook", "profileId": PROFILE_ID, "accountId": "a", "username": "u"}
        )
        assert response.status_code == 403

    def test_unsupported_platform_rejected(self, authenticated_client, user, workspace, zernio_on):
        self._seed_session(authenticated_client, workspace, user, platform="twitter")
        url = reverse("social_accounts:zernio_callback")
        response = authenticated_client.get(
            url, {"connected": "twitter", "profileId": PROFILE_ID, "accountId": "a", "username": "u"}
        )
        assert response.status_code == 302
        assert SocialAccount.objects.count() == 0


# ------------------------------------------------------------------
# Sync
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestSyncZernioAccounts:
    def _profile(self, workspace):
        return WorkspaceProviderProfile.objects.create(workspace=workspace, profile_id=PROFILE_ID)

    def test_idempotent(self, workspace):
        profile = self._profile(workspace)
        client = _client({"/accounts": {"accounts": [_account_payload()]}})
        sync_zernio_accounts(workspace, profile, client=client)
        sync_zernio_accounts(workspace, profile, client=client)
        assert SocialAccount.objects.filter(workspace=workspace).count() == 1

    def test_linkedin_organization_maps_to_company(self, workspace):
        profile = self._profile(workspace)
        payload = _account_payload(
            platform="linkedin",
            platformUserId="org-9",
            metadata={"organizationInfo": {"name": "Acme Org"}},
        )
        client = _client({"/accounts": {"accounts": [payload]}})
        sync_zernio_accounts(workspace, profile, client=client)
        account = SocialAccount.objects.get(workspace=workspace)
        assert account.platform == "linkedin_company"

    def test_linkedin_member_maps_to_personal(self, workspace):
        profile = self._profile(workspace)
        payload = _account_payload(platform="linkedin", platformUserId="member-7", metadata={})
        client = _client({"/accounts": {"accounts": [payload]}})
        sync_zernio_accounts(workspace, profile, client=client)
        account = SocialAccount.objects.get(workspace=workspace)
        assert account.platform == "linkedin_personal"

    def test_needs_reconnection_marks_disconnected(self, workspace):
        profile = self._profile(workspace)
        client = _client({"/accounts": {"accounts": [_account_payload(needsReconnection=True)]}})
        sync_zernio_accounts(workspace, profile, client=client)
        account = SocialAccount.objects.get(workspace=workspace)
        assert account.connection_status == SocialAccount.ConnectionStatus.DISCONNECTED
        assert "Reconnect" in account.last_error

    def test_unsupported_platform_skipped(self, workspace):
        profile = self._profile(workspace)
        client = _client({"/accounts": {"accounts": [_account_payload(platform="twitter")]}})
        synced = sync_zernio_accounts(workspace, profile, client=client)
        assert synced == []
        assert SocialAccount.objects.count() == 0

    def test_missing_follower_count_keeps_existing(self, workspace):
        """No analytics add-on: followersCount is absent and must not zero the display."""
        profile = self._profile(workspace)
        SocialAccount.objects.create(
            workspace=workspace,
            platform="facebook",
            account_platform_id="page-123",
            account_name="Acme",
            follower_count=500,
        )
        client = _client({"/accounts": {"accounts": [_account_payload()]}})  # no followersCount key
        sync_zernio_accounts(workspace, profile, client=client)
        account = SocialAccount.objects.get(workspace=workspace)
        assert account.follower_count == 500

    def test_cross_tenant_isolation(self, workspace, organization, db):
        """Syncing workspace A's profile never touches workspace B's rows."""
        from apps.workspaces.models import Workspace

        other = Workspace.objects.create(name="Other WS", organization=organization)
        SocialAccount.objects.create(
            workspace=other,
            platform="facebook",
            account_platform_id="page-123",
            account_name="Other workspace account",
            provider="direct",
        )
        profile = self._profile(workspace)
        client = _client({"/accounts": {"accounts": [_account_payload()]}})
        sync_zernio_accounts(workspace, profile, client=client)

        theirs = SocialAccount.objects.get(workspace=other)
        assert theirs.provider == "direct"
        assert theirs.account_name == "Other workspace account"
        assert SocialAccount.objects.filter(workspace=workspace).count() == 1


# ------------------------------------------------------------------
# Reconnect + disconnect
# ------------------------------------------------------------------


@pytest.mark.django_db
class TestReconnectDisconnect:
    def _zernio_account(self, workspace, **overrides):
        defaults = {
            "workspace": workspace,
            "platform": "facebook",
            "account_platform_id": "page-123",
            "account_name": "Acme Brand",
            "provider": "zernio",
            "provider_account_id": ACCOUNT_ID,
            "provider_profile_id": PROFILE_ID,
        }
        defaults.update(overrides)
        return SocialAccount.objects.create(**defaults)

    def test_reconnect_zernio_account_uses_reconnect_account_id(
        self, authenticated_client, workspace, zernio_on, monkeypatch
    ):
        account = self._zernio_account(workspace)
        WorkspaceProviderProfile.objects.create(workspace=workspace, profile_id=PROFILE_ID)
        seen = {}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/connect/facebook":
                seen["params"] = parse_qs(urlparse(str(request.url)).query)
                return httpx.Response(200, json={"authUrl": "https://zernio.com/connect/facebook?re=1"})
            return httpx.Response(404, json={"error": "nf"})

        monkeypatch.setattr(
            "apps.social_accounts.zernio_connect.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        url = reverse("social_accounts:reconnect", kwargs={"workspace_id": workspace.id, "account_id": account.id})
        response = authenticated_client.post(url)
        assert response.status_code == 302
        assert response.url == "https://zernio.com/connect/facebook?re=1"
        assert seen["params"]["reconnectAccountId"] == [ACCOUNT_ID]

    def test_disconnect_calls_zernio_delete(self, authenticated_client, workspace, zernio_on, monkeypatch):
        account = self._zernio_account(workspace)
        calls = []

        def handler(request: httpx.Request) -> httpx.Response:
            calls.append(f"{request.method} {request.url.path}")
            return httpx.Response(200, json={"message": "Disconnected"})

        monkeypatch.setattr(
            "providers.zernio.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        url = reverse("social_accounts:disconnect", kwargs={"workspace_id": workspace.id, "account_id": account.id})
        response = authenticated_client.post(url)
        assert response.status_code == 302
        assert calls == [f"DELETE /accounts/{ACCOUNT_ID}"]
        assert SocialAccount.objects.count() == 0

    def test_disconnect_tolerates_already_gone(self, authenticated_client, workspace, zernio_on, monkeypatch):
        account = self._zernio_account(workspace)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(404, json={"error": "not found", "code": "not_found", "type": "not_found"})

        monkeypatch.setattr(
            "providers.zernio.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        url = reverse("social_accounts:disconnect", kwargs={"workspace_id": workspace.id, "account_id": account.id})
        response = authenticated_client.post(url)
        assert response.status_code == 302
        assert SocialAccount.objects.count() == 0

    def test_disconnect_aborts_on_retryable_zernio_failure(
        self, authenticated_client, workspace, zernio_on, monkeypatch
    ):
        """A Zernio 5xx must not strand a billed, connected account invisibly."""
        account = self._zernio_account(workspace)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "boom"})

        monkeypatch.setattr(
            "providers.zernio.ZernioClient",
            lambda *a, **k: ZernioClient(
                api_key="k", base_url="https://mock.test", transport=httpx.MockTransport(handler)
            ),
        )
        url = reverse("social_accounts:disconnect", kwargs={"workspace_id": workspace.id, "account_id": account.id})
        response = authenticated_client.post(url)
        assert response.status_code == 302
        assert SocialAccount.objects.count() == 1  # kept for the retry

    def test_disconnect_never_calls_meta_revoke(self, authenticated_client, workspace, zernio_on, monkeypatch):
        account = self._zernio_account(workspace)
        monkeypatch.setattr(
            "providers.zernio.ZernioClient",
            lambda *a, **k: _client({f"/accounts/{ACCOUNT_ID}": {"message": "ok"}}),
        )
        with pytest.MonkeyPatch.context() as mp:
            import providers

            mp.setattr(providers, "get_provider", lambda *a, **k: (_ for _ in ()).throw(AssertionError("Meta touched")))
            url = reverse("social_accounts:disconnect", kwargs={"workspace_id": workspace.id, "account_id": account.id})
            response = authenticated_client.post(url)
        assert response.status_code == 302


# ------------------------------------------------------------------
# Client: delete_account
# ------------------------------------------------------------------


class TestDeleteAccountClient:
    def test_delete_success(self):
        client = _client({"/accounts/a1": {"message": "Disconnected"}})
        assert client.delete_account("a1") is True

    def test_delete_404_is_already_gone(self):
        client = ZernioClient(
            api_key="k",
            base_url="https://mock.test",
            transport=httpx.MockTransport(
                lambda r: httpx.Response(404, json={"error": "nf", "code": "not_found", "type": "not_found"})
            ),
        )
        assert client.delete_account("a1") is False

    def test_delete_500_raises_retryable(self):
        from providers.zernio import ZernioError

        client = ZernioClient(
            api_key="k",
            base_url="https://mock.test",
            transport=httpx.MockTransport(lambda r: httpx.Response(500, json={"error": "boom"})),
        )
        with pytest.raises(ZernioError) as exc_info:
            client.delete_account("a1")
        assert exc_info.value.retryable is True
