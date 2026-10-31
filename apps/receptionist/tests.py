"""Receptionist: tenant isolation, dry-run drafting, escalation, intake."""

import json
from datetime import timedelta
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import Booking, BusinessProfile, Contact, FuneralClaim, Message, Quote, TradeDispatch, ZernioChannel
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
        # Flow tests verify drafting and storage; sending is covered separately.
        send_patcher = patch("apps.receptionist.sending.send_draft", return_value=False)
        self.addCleanup(send_patcher.stop)
        send_patcher.start()
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


class BookingTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user_model = get_user_model()
        self.ws = _workspace("gg-plumbing")
        self.user = user_model.objects.create_user(
            email="plumber@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        self.outsider = user_model.objects.create_user(
            email="stranger2@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.profile = BusinessProfile.objects.create(workspace=self.ws, industry="trades", business_name="GG Plumbing")
        self.channel = ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-gg")

    def _booking(self, ws=None, contact=None, status="requested"):
        ws = ws or self.ws
        contact = contact or Contact.objects.create(workspace=ws, wa_id="27823334444", name="Lucky")
        return Booking.objects.create(
            workspace=ws, contact=contact, service="Fix leaking geyser", preferred_time="Tuesday morning", status=status
        )

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_intake_creates_booking(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(
            body="I can help with that.",
            intake={"name": "Lucky", "detail": "Fix leaking geyser", "preferred_time": "Tuesday morning"},
        )
        handle_inbox_message(_payload("acct-gg", text="My geyser is leaking, can you come Tuesday morning?"))
        booking = Booking.objects.get(workspace=self.ws)
        self.assertEqual(booking.service, "Fix leaking geyser")
        self.assertEqual(booking.preferred_time, "Tuesday morning")
        self.assertEqual(booking.status, "requested")
        self.assertEqual(booking.contact.wa_id, "27821234567")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_empty_intake_creates_no_booking(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="Hello!", intake={})
        handle_inbox_message(_payload("acct-gg"))
        self.assertEqual(Booking.objects.count(), 0)

    def test_bookings_page_lists_own_bookings_only(self):
        self.client.force_login(self.user)
        self._booking()
        other_ws = _workspace("hh-other")
        other_contact = Contact.objects.create(workspace=other_ws, wa_id="27999999999", name="Stranger")
        Booking.objects.create(workspace=other_ws, contact=other_contact, service="Other job")
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/bookings/")
        self.assertContains(resp, "Fix leaking geyser")
        self.assertNotContains(resp, "Other job")

    def test_bookings_requires_membership(self):
        self.client.force_login(self.outsider)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/bookings/")
        self.assertEqual(resp.status_code, 403)

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_marks_booking_and_sends_whatsapp(self, mock_send):
        self.client.force_login(self.user)
        booking = self._booking()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        self.assertEqual(resp.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        reply = Message.objects.get(contact=booking.contact, direction="outbound")
        self.assertIn("Fix leaking geyser", reply.body)
        self.assertIn("Tuesday morning", reply.body)
        self.assertEqual(reply.sender_type, "human_agent")
        mock_send.assert_called_once_with(self.channel, booking.contact, reply)

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_ignored_when_not_requested(self, mock_send):
        self.client.force_login(self.user)
        booking = self._booking(status="cancelled")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")
        mock_send.assert_not_called()
        self.assertEqual(Message.objects.filter(direction="outbound").count(), 0)

    def test_cancel_marks_booking(self):
        self.client.force_login(self.user)
        booking = self._booking()
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/cancel/")
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")

    def test_outsider_cannot_confirm(self):
        self.client.force_login(self.outsider)
        booking = self._booking()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        self.assertEqual(resp.status_code, 403)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "requested")


class QuoteTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user_model = get_user_model()
        self.ws = _workspace("jj-solar")
        self.user = user_model.objects.create_user(
            email="solar@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        self.outsider = user_model.objects.create_user(
            email="stranger3@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.profile = BusinessProfile.objects.create(workspace=self.ws, industry="trades", business_name="JJ Solar")
        self.channel = ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-jj")
        self.contact = Contact.objects.create(workspace=self.ws, wa_id="27821112222", name="Pieter")

    def _quote(self, **kw):
        defaults = {
            "workspace": self.ws,
            "contact": self.contact,
            "customer_name": "Pieter",
            "title": "5kW inverter install",
            "amount_cents": 4250000,
        }
        defaults.update(kw)
        return Quote.objects.create(**defaults)

    def test_create_quote_parses_rand(self):
        self.client.force_login(self.user)
        resp = self.client.post(
            f"/workspace/{self.ws.id}/receptionist/quotes/",
            {"customer_name": "Pieter", "phone": "+27 82 111 2222", "title": "5kW inverter", "amount": "R42,500.00"},
        )
        self.assertEqual(resp.status_code, 302)
        quote = Quote.objects.get(workspace=self.ws)
        self.assertEqual(quote.amount_cents, 4250000)
        self.assertEqual(quote.contact, self.contact)
        self.assertEqual(quote.status, "draft")

    def test_create_quote_rejects_bad_amount(self):
        self.client.force_login(self.user)
        self.client.post(
            f"/workspace/{self.ws.id}/receptionist/quotes/",
            {"customer_name": "Pieter", "amount": "lots"},
        )
        self.assertEqual(Quote.objects.count(), 0)

    def test_quotes_requires_membership(self):
        self.client.force_login(self.outsider)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/quotes/")
        self.assertEqual(resp.status_code, 403)

    def test_list_shows_only_own_quotes(self):
        self.client.force_login(self.user)
        self._quote()
        other_ws = _workspace("kk-other")
        Quote.objects.create(workspace=other_ws, customer_name="Hidden Person", amount_cents=100)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/quotes/")
        self.assertContains(resp, "Pieter")
        self.assertNotContains(resp, "Hidden Person")

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_send_marks_sent_and_messages_customer(self, mock_send):
        self.client.force_login(self.user)
        quote = self._quote()
        self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{quote.id}/send/")
        quote.refresh_from_db()
        self.assertEqual(quote.status, "sent")
        self.assertEqual(quote.sent_on, timezone.localdate())
        self.assertEqual(quote.follow_up_on, timezone.localdate() + timedelta(days=3))
        reply = Message.objects.get(contact=self.contact, direction="outbound")
        self.assertIn("JJ Solar", reply.body)
        self.assertIn("R42,500.00", reply.body)
        mock_send.assert_called_once()

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_send_without_contact_keeps_quote_sent_no_message(self, mock_send):
        self.client.force_login(self.user)
        quote = self._quote(contact=None)
        self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{quote.id}/send/")
        quote.refresh_from_db()
        self.assertEqual(quote.status, "sent")
        mock_send.assert_not_called()
        self.assertEqual(Message.objects.filter(direction="outbound").count(), 0)

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_chase_sends_followup_and_defers(self, mock_send):
        self.client.force_login(self.user)
        yesterday = timezone.localdate() - timedelta(days=1)
        quote = self._quote(status="sent", sent_on=yesterday, follow_up_on=yesterday)
        self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{quote.id}/chase/")
        quote.refresh_from_db()
        self.assertEqual(quote.follow_up_on, timezone.localdate() + timedelta(days=3))
        reply = Message.objects.get(contact=self.contact, direction="outbound")
        self.assertIn("checking you received", reply.body)
        mock_send.assert_called_once()

    def test_won_and_lost(self):
        self.client.force_login(self.user)
        quote = self._quote(status="sent")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{quote.id}/won/")
        quote.refresh_from_db()
        self.assertEqual(quote.status, "won")
        q2 = self._quote(customer_name="Second")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{q2.id}/lost/")
        q2.refresh_from_db()
        self.assertEqual(q2.status, "lost")

    def test_outsider_cannot_send(self):
        self.client.force_login(self.outsider)
        quote = self._quote()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/quotes/{quote.id}/send/")
        self.assertEqual(resp.status_code, 403)
        quote.refresh_from_db()
        self.assertEqual(quote.status, "draft")


class IndustryPackTests(TestCase):
    def test_every_industry_has_a_brief(self):
        from apps.receptionist.models import Industry
        from apps.receptionist.services import _INDUSTRY_BRIEFS

        for value in Industry.values:
            self.assertIn(value, _INDUSTRY_BRIEFS, f"no brief for {value}")
            self.assertLessEqual(len(value), 20, f"{value} exceeds the industry column")

    def test_twenty_approved_packs_present(self):
        from apps.receptionist.models import Industry

        approved = {
            "plumber",
            "electrician",
            "security",
            "solar",
            "auto-workshop",
            "mobile-mechanic",
            "towing",
            "hvac",
            "roofing",
            "gates-access",
            "pest-control",
            "property-maintenance",
            "container-transport",
            "pool",
            "dental",
            "aesthetics",
            "real-estate",
            "property-management",
            "legal",
            "financial-broker",
        }
        self.assertTrue(approved.issubset(set(Industry.values)))

    def test_setup_accepts_new_pack(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        ws = _workspace("mm-plumbing")
        user = get_user_model().objects.create_user(
            email="plumber2@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=user, workspace=ws)
        self.client.force_login(user)
        resp = self.client.post(
            f"/workspace/{ws.id}/receptionist/setup/",
            {"industry": "plumber", "business_name": "Fourways Plumbing", "pricing_data": '{"Call-out": "R650"}'},
        )
        self.assertEqual(resp.status_code, 302)
        profile = BusinessProfile.objects.get(workspace=ws)
        self.assertEqual(profile.industry, "plumber")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_pack_intake_creates_booking(self, mock_draft):
        from apps.receptionist.services import ReplyDraft

        ws = _workspace("nn-plumbing")
        BusinessProfile.objects.create(workspace=ws, industry="plumber", business_name="NN Plumbing")
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acct-nn")
        mock_draft.return_value = ReplyDraft(
            body="We can help with that.",
            intake={"name": "Vusi", "detail": "Burst geyser", "preferred_time": "today"},
        )
        handle_inbox_message(_payload("acct-nn", wa="27829998877", text="Geyser burst, need help today"))
        booking = Booking.objects.get(workspace=ws)
        self.assertEqual(booking.service, "Burst geyser")
        self.assertEqual(booking.preferred_time, "today")


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
        self._inbound(ws, contact)
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
        self._inbound(ws, contact)
        draft = self._draft(ws, contact)
        self.assertFalse(send_draft(channel, contact, draft))
        mock_post.assert_not_called()
        draft.refresh_from_db()
        self.assertTrue(draft.is_draft)

    def _inbound(self, ws, contact):
        return Message.objects.create(
            workspace=ws,
            contact=contact,
            direction=Message.Direction.INBOUND,
            sender_type=Message.SenderType.USER,
            body="Hi, are you open?",
        )

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_guard_allows_tenant_own_number_after_inbound(self, mock_post):
        """A tenant's own connected number may answer customers who wrote first."""
        from apps.receptionist.sending import send_draft

        mock_post.return_value = Mock(
            status_code=200, content=b'{"message":{"id":"zm2"}}', json=lambda: {"message": {"id": "zm2"}}
        )
        ws = self._fixtures()
        channel = self._channel(ws, "some-real-account")
        contact = Contact.objects.create(workspace=ws, wa_id="27820001133", zernio_conversation_id="conv9")
        self._inbound(ws, contact)
        draft = self._draft(ws, contact)
        self.assertTrue(send_draft(channel, contact, draft))

    @override_settings(ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1")
    @patch("apps.receptionist.sending.httpx.post")
    def test_guard_refuses_without_inbound_first(self, mock_post):
        """No cold outbound, ever: no inbound from this customer, no send."""
        from apps.receptionist.sending import send_draft

        ws = self._fixtures()
        channel = self._channel(ws, "some-real-account")
        contact = Contact.objects.create(workspace=ws, wa_id="27820001144", zernio_conversation_id="conv10")
        draft = self._draft(ws, contact)
        self.assertFalse(send_draft(channel, contact, draft))
        mock_post.assert_not_called()
        draft.refresh_from_db()
        self.assertTrue(draft.is_draft)

    @override_settings(
        ZERNIO_API_KEY="k", ZERNIO_BASE_URL="https://zernio.test/api/v1", RECEPTIONIST_MAX_SENDS_PER_HOUR=3
    )
    @patch("apps.receptionist.sending.httpx.post")
    def test_hourly_budget_holds_draft(self, mock_post):
        from apps.receptionist.sending import send_draft

        ws = self._fixtures()
        channel = self._channel(ws, "some-real-account")
        contact = Contact.objects.create(workspace=ws, wa_id="27820001155", zernio_conversation_id="conv11")
        self._inbound(ws, contact)
        for _ in range(3):
            Message.objects.create(
                workspace=ws,
                contact=contact,
                direction=Message.Direction.OUTBOUND,
                sender_type=Message.SenderType.AI,
                body="earlier",
                is_draft=False,
            )
        draft = self._draft(ws, contact)
        self.assertFalse(send_draft(channel, contact, draft))
        mock_post.assert_not_called()
        draft.refresh_from_db()
        self.assertTrue(draft.is_draft)  # held, not dropped: retried on the next inbound

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


class HeldDraftRetryTests(TestCase):
    """A draft held by budget or provider failure sends on the customer's next message."""

    @patch("apps.receptionist.sending.send_draft")
    @patch("apps.receptionist.webhooks.draft_reply")
    def test_held_draft_retries_before_new_reply(self, mock_draft, mock_send):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="new reply")
        ws = _workspace("retry-ws")
        BusinessProfile.objects.create(workspace=ws, business_name="R", is_active=True)
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acct-retry")
        contact = Contact.objects.create(workspace=ws, wa_id="27820001166", zernio_conversation_id="conv-r")
        Message.objects.create(
            workspace=ws, contact=contact, direction="inbound", sender_type="user", body="first question"
        )
        held = Message.objects.create(
            workspace=ws,
            contact=contact,
            direction="outbound",
            sender_type="ai",
            body="held reply",
            is_draft=True,
        )
        handle_inbox_message(
            {
                "event": "message.received",
                "message": {
                    "id": "m-retry-1",
                    "direction": "incoming",
                    "text": "following up",
                    "sender": {"phoneNumber": "+27820001166"},
                },
                "conversation": {"id": "conv-r"},
                "account": {"accountId": "acct-retry"},
            }
        )
        sent_ids = [c.args[2].id for c in mock_send.call_args_list]
        self.assertEqual(sent_ids[0], held.id)  # oldest held reply goes first
        self.assertEqual(mock_send.call_count, 2)  # held + new reply


class VolumeIsolationTests(TestCase):
    """25 tenants x 6 customers through the webhook: no leaks, dedup, per-tenant caps."""

    TENANTS = 25
    CUSTOMERS = 6

    def _payload(self, account_id, wa, text, mid):
        return {
            "event": "message.received",
            "message": {
                "id": mid,
                "direction": "incoming",
                "text": text,
                "sender": {"phoneNumber": f"+{wa}", "name": f"C{wa}"},
            },
            "conversation": {"id": f"conv-{wa}", "participantName": f"C{wa}"},
            "account": {"accountId": account_id},
        }

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    @patch("apps.receptionist.webhooks.draft_reply")
    def test_volume_no_cross_tenant_leaks(self, mock_draft, _send):
        from apps.receptionist.services import ReplyDraft

        mock_draft.side_effect = lambda profile, history, incoming: ReplyDraft(
            body=f"reply for {profile.business_name}"
        )
        workspaces = []
        for i in range(self.TENANTS):
            ws = _workspace(f"vol-{i}")
            BusinessProfile.objects.create(workspace=ws, business_name=f"Biz {i}", is_active=True)
            ZernioChannel.objects.create(workspace=ws, zernio_account_id=f"acct-{i}")
            workspaces.append(ws)
        for i, _ws in enumerate(workspaces):
            for j in range(self.CUSTOMERS):
                handle_inbox_message(
                    self._payload(f"acct-{i}", f"2782000{i:03d}{j}", f"question {j} from {i}", f"m-{i}-{j}")
                )
        # every tenant got its own customers, drafts and nothing else
        self.assertEqual(Contact.objects.count(), self.TENANTS * self.CUSTOMERS)
        for i, check_ws in enumerate(workspaces):
            contacts = Contact.objects.filter(workspace=check_ws)
            self.assertEqual(contacts.count(), self.CUSTOMERS)
            self.assertTrue(all(c.wa_id.startswith(f"2782000{i:03d}") for c in contacts))
            drafts = Message.objects.filter(workspace=check_ws, direction="outbound")
            self.assertEqual(drafts.count(), self.CUSTOMERS)
            self.assertTrue(all(f"Biz {i}" in m.body for m in drafts))
        # total rows: inbound + outbound per customer
        self.assertEqual(Message.objects.count(), self.TENANTS * self.CUSTOMERS * 2)

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    @patch("apps.receptionist.webhooks.draft_reply")
    def test_volume_duplicate_deliveries_deduped(self, mock_draft, _send):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="hi")
        ws = _workspace("vol-dup")
        BusinessProfile.objects.create(workspace=ws, business_name="Dup", is_active=True)
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acct-dup")
        for _ in range(10):  # provider retries the same delivery
            handle_inbox_message(self._payload("acct-dup", "27820009999", "same message", "m-dup-1"))
        self.assertEqual(Message.objects.filter(direction="inbound").count(), 1)
        self.assertEqual(Message.objects.filter(direction="outbound").count(), 1)

    @override_settings(RECEPTIONIST_MAX_DRAFTS_PER_DAY=4)
    @patch("apps.receptionist.sending.send_draft", return_value=True)
    @patch("apps.receptionist.webhooks.draft_reply")
    def test_draft_cap_flags_human_and_spares_other_tenants(self, mock_draft, _send):
        from apps.receptionist.services import ReplyDraft

        mock_draft.return_value = ReplyDraft(body="hi")
        ws_a = _workspace("cap-a")
        BusinessProfile.objects.create(workspace=ws_a, business_name="A", is_active=True)
        ZernioChannel.objects.create(workspace=ws_a, zernio_account_id="acct-cap-a")
        ws_b = _workspace("cap-b")
        BusinessProfile.objects.create(workspace=ws_b, business_name="B", is_active=True)
        ZernioChannel.objects.create(workspace=ws_b, zernio_account_id="acct-cap-b")
        for j in range(6):  # tenant A blows past its daily cap
            handle_inbox_message(self._payload("acct-cap-a", "27820007777", f"q{j}", f"m-cap-{j}"))
        contact_a = Contact.objects.get(workspace=ws_a)
        self.assertTrue(contact_a.needs_human)
        self.assertEqual(Message.objects.filter(workspace=ws_a, direction="outbound").count(), 4)
        # tenant B is unaffected by tenant A's abuse
        handle_inbox_message(self._payload("acct-cap-b", "27820008888", "q", "m-capb-1"))
        self.assertEqual(Message.objects.filter(workspace=ws_b, direction="outbound").count(), 1)
        self.assertFalse(Contact.objects.get(workspace=ws_b).needs_human)


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
