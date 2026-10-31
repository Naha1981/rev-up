"""Receptionist: tenant isolation, dry-run drafting, escalation, intake."""

import json
from unittest.mock import patch

from django.test import TestCase
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
            "direction": "inbound",
            "from": wa,
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
        return {"candidates": [{"content": {"parts": [{"text": json.dumps(self._data)}]}}]}


class FakeClient:
    def __init__(self, data):
        self._data = data
        self.calls = []

    def post(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return FakeResp(self._data)


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
        with self.settings(CONTENT_AGENT_GEMINI_API_KEY="k"):
            from .services import draft_reply

            draft = draft_reply(profile, [], "Do you charge a call-out fee?", client=client)
        self.assertIn("R450", draft.body)
        self.assertFalse(draft.escalate)
        url = client.calls[0][0][0]
        self.assertIn("generativelanguage.googleapis.com", url)

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
