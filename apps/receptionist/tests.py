"""Receptionist: tenant isolation, dry-run drafting, escalation, intake."""

import json
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import BusinessProfile, Contact, FuneralClaim, Message, TradeDispatch, ZernioChannel
from .services import needs_human
from .webhooks import handle_inbox_message


def _workspace(name):
    org = Organization.objects.create(name=f"{name} org")
    return Workspace.objects.create(organization=org, name=name)


def _payload(account_id, wa="27821234567", text="Hi, do you open on Saturdays?", mid="m1"):
    return {
        "event": "message.received",
        "message": {
            "id": mid,
            "direction": "incoming",
            "sender": {"id": wa, "phoneNumber": "+" + wa},
            "text": text,
            "account": {"accountId": account_id},
        },
    }


class FakeResp:
    status_code = 200

    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        return None

    def json(self):
        return {"choices": [{"message": {"content": json.dumps(self._data)}}]}


class FakeClient:
    def __init__(self, data):
        self._data = data
        self.calls = []

    def post(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return FakeResp(self._data)


class SequenceClient:
    """Returns a different fake response per call; empty string means empty content."""

    def __init__(self, items):
        self._items = list(items)
        self.calls = []

    def post(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        item = self._items.pop(0)
        return FakeResp(item)


REPLY = {"reply": "Good morning! Yes, we are open Saturdays 8:00-13:00.", "intake": {}}


class ReceptionistFlowTests(TestCase):
    def setUp(self):
        self.ws_a = _workspace("aa-funerals")
        self.ws_b = _workspace("bb-dental")
        self.profile_a = BusinessProfile.objects.create(
            workspace=self.ws_a,
            industry="funeral",
            business_name="AA Funerals",
            pricing_data={"standard service": "R15,000"},
        )
        BusinessProfile.objects.create(workspace=self.ws_b, industry="dental", business_name="BB Dental")
        self.channel_a = ZernioChannel.objects.create(workspace=self.ws_a, zernio_account_id="acct-a")
        self.channel_b = ZernioChannel.objects.create(workspace=self.ws_b, zernio_account_id="acct-b")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_inbound_drafts_reply_never_sends(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="Good morning, how can I help?", intake={})
        handle_inbox_message(_payload("acct-a"))
        contact = Contact.objects.get(workspace=self.ws_a, wa_id="27821234567")
        inbound = Message.objects.get(contact=contact, direction="inbound")
        self.assertEqual(inbound.body, "Hi, do you open on Saturdays?")
        draft = Message.objects.get(contact=contact, direction="outbound")
        self.assertTrue(draft.is_draft)
        self.assertEqual(draft.sender_type, "ai")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_tenant_isolation(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="Hello", intake={})
        handle_inbox_message(_payload("acct-a", wa="27111111111"))
        handle_inbox_message(_payload("acct-b", wa="27111111111"))
        self.assertEqual(Contact.objects.filter(workspace=self.ws_a).count(), 1)
        self.assertEqual(Contact.objects.filter(workspace=self.ws_b).count(), 1)
        self.assertEqual(Contact.objects.filter(workspace=self.ws_a).get().wa_id, "27111111111")
        self.assertEqual(Message.objects.filter(workspace=self.ws_b).count(), 2)
        self.assertEqual(Contact.objects.count(), 2)

    def test_unmapped_account_dropped(self):
        handle_inbox_message(_payload("acct-unknown"))
        self.assertEqual(Contact.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_duplicate_delivery_idempotent(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="Hello", intake={})
        handle_inbox_message(_payload("acct-a", mid="m-dup"))
        handle_inbox_message(_payload("acct-a", mid="m-dup"))
        self.assertEqual(Message.objects.filter(zernio_message_id="m-dup").count(), 1)

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_escalation_flags_needs_human(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="I am so sorry for your loss.", escalate=True, intake={})
        handle_inbox_message(_payload("acct-a", text="My mother passed away, I need help with the claim"))
        contact = Contact.objects.get(workspace=self.ws_a)
        self.assertTrue(contact.needs_human)

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_funeral_intake_creates_claim(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(
            body="Thank you, we will call you back shortly.",
            intake={"name": "Thabo Mokoena", "detail": "Sipho Mokoena", "policy_number": "POL-123"},
        )
        handle_inbox_message(_payload("acct-a", text="Claim for Sipho Mokoena, policy POL-123"))
        claim = FuneralClaim.objects.get(workspace=self.ws_a)
        self.assertEqual(claim.claimant_name, "Thabo Mokoena")
        self.assertEqual(claim.policy_number, "POL-123")


class EscalationTests(TestCase):
    def test_keywords(self):
        self.assertTrue(needs_human("Can I speak to a person please"))
        self.assertTrue(needs_human("my father passed away"))
        self.assertTrue(needs_human("Emergency! burst pipe flooding the kitchen"))
        self.assertTrue(needs_human("I want a refund"))
        self.assertFalse(needs_human("What time do you open?"))
        self.assertFalse(needs_human("How much is a consultation?"))


class ReplyServiceTests(TestCase):
    @patch("apps.receptionist.services.getattr")
    def test_draft_reply_uses_free_gemini_route(self, _g):
        ws = _workspace("cc-trades")
        profile = BusinessProfile.objects.create(
            workspace=ws, industry="trades", business_name="CC Plumbing", call_out_fee="450.00"
        )
        client = FakeClient({"reply": "Our call-out fee is R450. What is the address?", "intake": {}})
        with self.settings(GROQ_API_KEY="k"):
            from .services import draft_reply

            draft = draft_reply(profile, [], "Do you charge a call-out fee?", client=client)
        self.assertIn("R450", draft.body)
        self.assertFalse(draft.escalate)
        url = client.calls[0][0][0]
        self.assertIn("api.groq.com", url)

    def test_draft_retries_when_reasoning_eats_budget(self):
        ws = _workspace("retry-dental")
        profile = BusinessProfile.objects.create(workspace=ws, industry="dental", business_name="Dent")
        client = SequenceClient(
            [
                "",  # gpt-oss spent the whole budget on reasoning: empty content
                {"reply": "Yes, we are open tomorrow 8:00-17:00.", "intake": {}},
            ]
        )
        with self.settings(GROQ_API_KEY="k"):
            from .services import draft_reply

            draft = draft_reply(profile, [], "Are you open tomorrow?", client=client)
        self.assertIn("open tomorrow", draft.body)
        self.assertEqual(len(client.calls), 2)

    def test_trades_intake_creates_dispatch(self):
        from .webhooks import _apply_intake

        contact = Contact.objects.create(workspace=self_ws(), wa_id="27000000000")
        _apply_intake(contact.workspace, contact, "trades", {"detail": "leaking geyser", "address": "12 Main Rd"})
        self.assertEqual(TradeDispatch.objects.get().address, "12 Main Rd")


def self_ws():
    return _workspace("dd-trades")


class ViewTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user_model = get_user_model()
        self.ws = _workspace("ee-dental")
        self.user = user_model.objects.create_user(
            email="owner@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        self.outsider = user_model.objects.create_user(
            email="outsider@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)

    def test_setup_requires_membership(self):
        self.client.force_login(self.outsider)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertEqual(resp.status_code, 403)

    def test_setup_creates_profile_and_redirects(self):
        self.client.force_login(self.user)
        resp = self.client.post(
            f"/workspace/{self.ws.id}/receptionist/setup/",
            {
                "industry": "dental",
                "business_name": "Smile Dental",
                "operating_hours": "Mon-Fri 8-17",
                "pricing_data": '{"Consultation": "R850"}',
            },
        )
        self.assertEqual(resp.status_code, 302)
        profile = BusinessProfile.objects.get(workspace=self.ws)
        self.assertEqual(profile.industry, "dental")
        self.assertEqual(profile.pricing_data["Consultation"], "R850")

    def test_inbox_shows_only_own_contacts(self):
        self.client.force_login(self.user)
        BusinessProfile.objects.create(workspace=self.ws, industry="dental", business_name="Smile Dental")
        mine = Contact.objects.create(workspace=self.ws, wa_id="27111111111", name="Patient One")
        Message.objects.create(
            workspace=self.ws, contact=mine, direction="inbound", sender_type="user", body="Toothache"
        )
        other_ws = _workspace("ff-other")
        Contact.objects.create(workspace=other_ws, wa_id="27222222222", name="Stranger")
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/")
        self.assertContains(resp, "Patient One")
        self.assertNotContains(resp, "Stranger")


class RealPayloadShapeTests(TestCase):
    """The actual Zernio message.received schema (from their OpenAPI spec)."""

    def setUp(self):
        self.ws = _workspace("gg-funerals")
        BusinessProfile.objects.create(workspace=self.ws, industry="funeral", business_name="GG Funerals")
        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-sandbox")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_real_payload_shape(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="Our condolences. May I take a callback number?", intake={})
        handle_inbox_message(
            {
                "id": "evt-1",
                "event": "message.received",
                "message": {
                    "id": "zmsg-1",
                    "conversationId": "conv-1",
                    "platform": "whatsapp",
                    "direction": "incoming",
                    "text": "Hi, do you work Saturdays?",
                    "sender": {
                        "id": "27672347593",
                        "phoneNumber": "+27672347593",
                        "name": "Thabiso",
                    },
                    "attachments": [],
                    "isRead": False,
                },
                "conversation": {"id": "conv-1", "participantName": "Thabiso"},
                "account": {"id": "x", "accountId": "acct-sandbox", "platform": "whatsapp"},
            }
        )
        contact = Contact.objects.get(workspace=self.ws)
        self.assertEqual(contact.wa_id, "27672347593")
        self.assertEqual(contact.name, "Thabiso")
        self.assertTrue(Message.objects.filter(contact=contact, direction="outbound", is_draft=True).exists())


class SandboxSendTests(TestCase):
    """The sandbox send guard: only the sandbox account + the owner's demo number."""

    def _fixtures(self):
        ws = _workspace("Send WS")
        BusinessProfile.objects.create(workspace=ws, business_name="Send Dental", is_active=True)
        return ws

    def _channel(self, ws, account):
        return ZernioChannel.objects.create(workspace=ws, zernio_account_id=account)

    def _draft(self, ws, contact):
        return Message.objects.create(
            workspace=ws,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.AI,
            body="Hi! Yes, we work Saturdays.",
            is_draft=True,
        )

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_guard_allows_sandbox_account_and_demo_number(self, mock_post):
        from apps.receptionist.sending import SANDBOX_ACCOUNT_ID, send_draft

        mock_post.return_value = Mock(
            status_code=200, content=b'{"message":{"id":"zm1"}}', json=lambda: {"message": {"id": "zm1"}}
        )
        ws = self._fixtures()
        channel = self._channel(ws, SANDBOX_ACCOUNT_ID)
        contact = Contact.objects.create(workspace=ws, wa_id="27672347593", zernio_conversation_id="conv1")
        draft = self._draft(ws, contact)
        self.assertTrue(send_draft(channel, contact, draft))
        draft.refresh_from_db()
        self.assertFalse(draft.is_draft)
        self.assertEqual(draft.zernio_message_id, "zm1")

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_guard_refuses_other_number(self, mock_post):
        from apps.receptionist.sending import SANDBOX_ACCOUNT_ID, send_draft

        ws = self._fixtures()
        channel = self._channel(ws, SANDBOX_ACCOUNT_ID)
        contact = Contact.objects.create(workspace=ws, wa_id="27820001122", zernio_conversation_id="conv1")
        draft = self._draft(ws, contact)
        self.assertFalse(send_draft(channel, contact, draft))
        mock_post.assert_not_called()
        draft.refresh_from_db()
        self.assertTrue(draft.is_draft)

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_guard_refuses_non_sandbox_account(self, mock_post):
        from apps.receptionist.sending import send_draft

        ws = self._fixtures()
        channel = self._channel(ws, "some-real-account")
        contact = Contact.objects.create(workspace=ws, wa_id="27672347593", zernio_conversation_id="conv1")
        draft = self._draft(ws, contact)
        self.assertFalse(send_draft(channel, contact, draft))
        mock_post.assert_not_called()

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_webhook_captures_conversation_and_autosends(self, mock_post):
        from apps.receptionist.sending import SANDBOX_ACCOUNT_ID
        from apps.receptionist.webhooks import handle_inbox_message

        mock_post.return_value = Mock(
            status_code=200, content=b'{"message":{"id":"zm9"}}', json=lambda: {"message": {"id": "zm9"}}
        )
        ws = self._fixtures()
        self._channel(ws, SANDBOX_ACCOUNT_ID)
        payload = {
            "type": "message.received",
            "message": {
                "id": "z-in-1",
                "direction": "incoming",
                "text": "Do you work Saturdays?",
                "sender": {"phoneNumber": "+27672347593", "name": "Nahalabs"},
                "account": {"accountId": SANDBOX_ACCOUNT_ID},
            },
            "conversation": {"id": "conv-real-1", "participantName": "Nahalabs"},
        }
        with patch("apps.receptionist.webhooks.draft_reply") as mock_draft:
            mock_draft.return_value = Mock(body="Yes, 8:00-13:00.", intake={}, escalate=False)
            handle_inbox_message(payload)
        contact = Contact.objects.get(workspace=ws, wa_id="27672347593")
        self.assertEqual(contact.zernio_conversation_id, "conv-real-1")
        outbound = Message.objects.get(workspace=ws, direction=Message.Direction.OUTBOUND)
        self.assertFalse(outbound.is_draft)
        self.assertEqual(outbound.zernio_message_id, "zm9")
        mock_post.assert_called_once()


class ZernioChannelTests(TestCase):
    def test_phone_number_saved_without_plus(self):
        ws = _workspace("chan")
        ch = ZernioChannel.objects.create(workspace=ws, zernio_account_id="a1", phone_number="+12029087457")
        self.assertEqual(ch.phone_number, "12029087457")


class PricingParserTests(TestCase):
    def test_lines_format(self):
        from apps.receptionist.views import _parse_pricing

        self.assertEqual(
            _parse_pricing("Check-up and clean: R850\nFilling: R1,200"),
            {"Check-up and clean": "R850", "Filling": "R1,200"},
        )

    def test_json_still_accepted(self):
        from apps.receptionist.views import _parse_pricing

        self.assertEqual(_parse_pricing('{"Check-up": "R850"}'), {"Check-up": "R850"})

    def test_blank_and_garbage(self):
        from apps.receptionist.views import _parse_pricing

        self.assertEqual(_parse_pricing(""), {})
        self.assertIsNone(_parse_pricing("no colon here"))
        self.assertIsNone(_parse_pricing("{not json"))


class WhatsAppConnectTests(TestCase):
    def _member_client(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user = get_user_model().objects.create_user(
            email="owner@example.com", password="x", tos_accepted_at=timezone.now()
        )
        ws = _workspace("Connect WS")
        WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role="owner")
        self.client.force_login(user)
        return ws

    def test_setup_shows_connected_channel(self):
        ws = self._member_client()
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc1", phone_number="12029087457")
        resp = self.client.get(f"/workspace/{ws.id}/receptionist/setup/")
        self.assertContains(resp, "Connected")
        self.assertContains(resp, "+12029087457")

    @patch("providers.zernio.ZernioClient")
    def test_bind_creates_channel_for_own_account(self, mock_client_cls):
        ws = self._member_client()
        from apps.social_accounts.models import WorkspaceProviderProfile

        WorkspaceProviderProfile.objects.create(workspace=ws, provider="zernio", profile_id="prof1")
        mock_client_cls.return_value.__enter__.return_value.list_accounts.return_value = [
            {"_id": "acc1", "username": "+2711000111", "name": "My Business"}
        ]
        resp = self.client.post(f"/workspace/{ws.id}/receptionist/setup/bind-whatsapp/", {"account_id": "acc1"})
        self.assertEqual(resp.status_code, 302)
        channel = ZernioChannel.objects.get(workspace=ws)
        self.assertEqual(channel.zernio_account_id, "acc1")
        self.assertEqual(channel.phone_number, "2711000111")

    def test_whatsapp_callback_returns_to_receptionist_setup(self):
        ws = self._member_client()
        from apps.social_accounts.models import WorkspaceProviderProfile

        WorkspaceProviderProfile.objects.create(workspace=ws, provider="zernio", profile_id="prof1")
        session = self.client.session
        session["zernio_connect"] = {
            "workspace_id": str(ws.id),
            "platform": "whatsapp",
            "profile_id": "prof1",
            "user_id": str(session["_auth_user_id"]),
        }
        session.save()
        resp = self.client.get(reverse("social_accounts:zernio_callback") + "?connected=whatsapp&profileId=prof1")
        self.assertRedirects(resp, f"/workspace/{ws.id}/receptionist/setup/", fetch_redirect_response=False)

    @patch("providers.zernio.ZernioClient")
    def test_bind_refuses_account_not_on_profile(self, mock_client_cls):
        ws = self._member_client()
        from apps.social_accounts.models import WorkspaceProviderProfile

        WorkspaceProviderProfile.objects.create(workspace=ws, provider="zernio", profile_id="prof1")
        mock_client_cls.return_value.__enter__.return_value.list_accounts.return_value = [
            {"_id": "acc1", "username": "+2711000111"}
        ]
        self.client.post(f"/workspace/{ws.id}/receptionist/setup/bind-whatsapp/", {"account_id": "acc-other"})
        self.assertFalse(ZernioChannel.objects.filter(workspace=ws).exists())
