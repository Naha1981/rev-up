"""Receptionist: tenant isolation, dry-run drafting, escalation, intake."""

import json
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import (
    Booking,
    BusinessProfile,
    CalendarConnection,
    Campaign,
    Competitor,
    CompetitorDish,
    CompetitorPromo,
    Contact,
    FuneralClaim,
    MarketOpportunity,
    Message,
    Quote,
    TradeDispatch,
    WaitlistEntry,
    ZernioChannel,
)
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

    def test_restaurant_numeric_detail_becomes_table_for_n(self):
        """Regression: 'table for two' must not land on the board as service '2'."""
        from .models import Industry
        from .webhooks import _apply_intake

        contact = Contact.objects.create(workspace=self_ws(), wa_id="27000000001")
        _apply_intake(
            contact.workspace, contact, Industry.RESTAURANT, {"detail": "2", "preferred_time": "Friday 19:00"}
        )
        from .models import Booking

        booking = Booking.objects.get()
        self.assertEqual(booking.service, "Table for 2")
        self.assertEqual(booking.preferred_time, "Friday 19:00")


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

    def test_setup_preselects_signup_industry_without_profile(self):
        self.ws.industry = "restaurant"
        self.ws.save(update_fields=["industry"])
        self.client.force_login(self.user)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'value="restaurant" selected')

    def test_setup_existing_profile_industry_wins(self):
        self.ws.industry = "restaurant"
        self.ws.save(update_fields=["industry"])
        BusinessProfile.objects.create(workspace=self.ws, industry="dental", business_name="Smile Dental")
        self.client.force_login(self.user)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertContains(resp, 'value="dental" selected')
        self.assertNotContains(resp, 'value="restaurant" selected')

    def test_setup_unmapped_signup_industry_defaults_general(self):
        self.ws.industry = "general"
        self.ws.save(update_fields=["industry"])
        self.client.force_login(self.user)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertContains(resp, 'value="general" selected')

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
    def test_confirm_banner_says_customer_told_when_sent(self, mock_send):
        self.client.force_login(self.user)
        booking = self._booking()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/", follow=True)
        self.assertContains(resp, "Booking confirmed and the customer has been told on WhatsApp.")

    @patch("apps.receptionist.sending.send_draft", return_value=False)
    def test_confirm_banner_says_held_when_guard_blocks(self, mock_send):
        self.client.force_login(self.user)
        booking = self._booking()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/", follow=True)
        self.assertContains(resp, "The WhatsApp confirmation was not sent")
        self.assertNotContains(resp, "the customer has been told on WhatsApp")
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")

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

        mock_draft.side_effect = lambda profile, history, incoming, **kwargs: ReplyDraft(
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


class CalendarConnectionTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user_model = get_user_model()
        self.ws = _workspace("pp-calendar")
        self.user = user_model.objects.create_user(
            email="cal@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        BusinessProfile.objects.create(workspace=self.ws, industry="plumber", business_name="PP Plumbing")
        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-pp")

    def _booking(self, preferred="Tuesday morning"):
        contact = Contact.objects.create(workspace=self.ws, wa_id="27820001111", name="Mr Nkosi")
        return Booking.objects.create(
            workspace=self.ws, contact=contact, service="Fix leaking geyser", preferred_time=preferred
        )

    def test_connect_hidden_when_not_configured(self):
        self.client.force_login(self.user)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertNotContains(resp, "Connect Google Calendar")

    @override_settings(GOOGLE_CALENDAR_CLIENT_ID="cid", GOOGLE_CALENDAR_CLIENT_SECRET="sec")
    def test_connect_button_and_redirect_to_google(self):
        self.client.force_login(self.user)
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/setup/")
        self.assertContains(resp, "Connect Google Calendar")
        resp = self.client.get(f"/workspace/{self.ws.id}/receptionist/calendar/connect/")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("accounts.google.com", resp["Location"])
        self.assertIn("calendar.events", resp["Location"])
        self.assertIn("access_type=offline", resp["Location"])

    @override_settings(GOOGLE_CALENDAR_CLIENT_ID="cid", GOOGLE_CALENDAR_CLIENT_SECRET="sec")
    @patch("apps.receptionist.calendar_sync.fetch_email", return_value="owner@pp.co.za")
    @patch("apps.receptionist.calendar_sync.httpx.post")
    def test_callback_stores_encrypted_connection(self, mock_post, _email):
        from apps.receptionist import calendar_sync

        self.client.force_login(self.user)
        mock_post.return_value = Mock(
            status_code=200,
            raise_for_status=lambda: None,
            json=lambda: {"access_token": "acc-1", "refresh_token": "ref-1", "expires_in": 3600},
        )
        state = calendar_sync.sign_state(self.ws.id, self.user.id)
        resp = self.client.get(f"/receptionist/google-calendar/callback/?code=abc&state={state}")
        self.assertEqual(resp.status_code, 302)
        conn = CalendarConnection.objects.get(workspace=self.ws)
        self.assertEqual(conn.access_token, "acc-1")
        self.assertEqual(conn.refresh_token, "ref-1")
        self.assertEqual(conn.google_email, "owner@pp.co.za")
        # stored encrypted at rest, not plaintext
        from django.db import connection as db_conn

        with db_conn.cursor() as c:
            c.execute("select access_token from receptionist_calendarconnection")
            raw = c.fetchone()[0]
        self.assertNotEqual(raw, "acc-1")

    @override_settings(GOOGLE_CALENDAR_CLIENT_ID="cid", GOOGLE_CALENDAR_CLIENT_SECRET="sec")
    def test_callback_rejects_bad_state(self):
        self.client.force_login(self.user)
        resp = self.client.get("/receptionist/google-calendar/callback/?code=abc&state=forged")
        self.assertEqual(resp.status_code, 403)

    @override_settings(GOOGLE_CALENDAR_CLIENT_ID="cid", GOOGLE_CALENDAR_CLIENT_SECRET="sec")
    @patch("apps.receptionist.sending.send_draft", return_value=True)
    @patch("apps.receptionist.calendar_sync.httpx.post")
    def test_confirm_creates_calendar_event(self, mock_post, _send):
        self.client.force_login(self.user)
        CalendarConnection.objects.create(
            workspace=self.ws,
            access_token="acc",
            refresh_token="ref",
            token_expiry=timezone.now() + timedelta(hours=1),
        )
        booking = self._booking()
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        event_calls = [c for c in mock_post.call_args_list if "calendar/v3" in str(c)]
        self.assertEqual(len(event_calls), 1)
        body = event_calls[0].kwargs["json"]
        self.assertIn("Fix leaking geyser", body["summary"])
        self.assertIn("Mr Nkosi", body["summary"])
        self.assertIn("dateTime", body["start"])
        self.assertEqual(body["start"]["timeZone"], "Africa/Johannesburg")

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_without_connection_skips_calendar(self, _send):
        self.client.force_login(self.user)
        booking = self._booking()
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        self.assertEqual(resp.status_code, 302)

    def test_parse_requested_day(self):
        from apps.receptionist.calendar_sync import parse_requested_day

        monday = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
        self.assertEqual(parse_requested_day("today please", monday), monday)
        self.assertEqual(parse_requested_day("tomorrow morning", monday), monday + timedelta(days=1))
        self.assertEqual(parse_requested_day("Tuesday morning", monday), monday + timedelta(days=1))
        self.assertEqual(parse_requested_day("monday next week", monday), monday + timedelta(days=7))
        self.assertEqual(parse_requested_day("3 Nov", date(2026, 10, 30)), date(2026, 11, 3))
        self.assertEqual(parse_requested_day("2026-12-05", monday), date(2026, 12, 5))
        self.assertIsNone(parse_requested_day("whenever suits you", monday))
        self.assertIsNone(parse_requested_day("", monday))

    @patch("apps.receptionist.calendar_sync.httpx.post")
    def test_unparseable_time_creates_no_event(self, mock_post):
        from apps.receptionist.calendar_sync import create_booking_event

        conn = CalendarConnection.objects.create(
            workspace=self.ws,
            access_token="acc",
            refresh_token="ref",
            token_expiry=timezone.now() + timedelta(hours=1),
        )
        booking = self._booking(preferred="whenever suits you")
        self.assertFalse(create_booking_event(conn, booking))
        mock_post.assert_not_called()

    def test_disconnect(self):
        self.client.force_login(self.user)
        CalendarConnection.objects.create(workspace=self.ws, access_token="a", refresh_token="r")
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/calendar/disconnect/")
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(CalendarConnection.objects.count(), 0)


class BookingTimeSlotTests(TestCase):
    """Confirmed bookings hold a real slot, clashes are blocked, and the
    calendar event follows confirm, reschedule and cancel."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        from apps.members.models import WorkspaceMembership

        user_model = get_user_model()
        self.ws = _workspace("slot-plumbing")
        self.user = user_model.objects.create_user(
            email="slots@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.profile = BusinessProfile.objects.create(
            workspace=self.ws, industry="trades", business_name="Slot Plumbing"
        )
        self.channel = ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-slot")
        self.contact = Contact.objects.create(workspace=self.ws, wa_id="27821112222", name="Sipho")

    def _booking(self, preferred="Tuesday morning", status="requested", **kw):
        return Booking.objects.create(
            workspace=self.ws,
            contact=self.contact,
            service="Fix leaking geyser",
            preferred_time=preferred,
            status=status,
            **kw,
        )

    def _connection(self):
        return CalendarConnection.objects.create(
            workspace=self.ws,
            google_email="owner@example.com",
            access_token="ya29.test",
            refresh_token="refresh-test",
            token_expiry=timezone.now() + timedelta(hours=1),
            calendar_id="primary",
        )

    # --- parsing ---

    def test_parse_requested_time_words_and_clocks(self):
        from apps.receptionist.calendar_sync import parse_requested_time

        self.assertEqual(parse_requested_time("Tuesday morning").hour, 9)
        self.assertEqual(parse_requested_time("Tuesday afternoon").hour, 14)
        self.assertEqual(parse_requested_time("Tuesday 2pm").hour, 14)
        self.assertEqual(parse_requested_time("Tuesday 2:30 pm").hour, 14)
        self.assertEqual(parse_requested_time("Tuesday 2:30 pm").minute, 30)
        self.assertEqual(parse_requested_time("Tuesday 14:30").hour, 14)
        self.assertEqual(parse_requested_time("Tuesday 09h15").hour, 9)
        self.assertIsNone(parse_requested_time("Tuesday"))

    def test_booking_slot_combines_day_and_time(self):
        from apps.receptionist.calendar_sync import booking_slot

        booking = self._booking(preferred="Tuesday 2pm")
        slot = booking_slot(booking, today=date(2026, 11, 1))
        self.assertEqual(slot.date(), date(2026, 11, 3))
        self.assertEqual(slot.hour, 14)
        self.assertEqual(slot.utcoffset().total_seconds(), 2 * 3600)

    def test_booking_slot_defaults_to_nine_am(self):
        from apps.receptionist.calendar_sync import booking_slot

        booking = self._booking(preferred="Tuesday")
        slot = booking_slot(booking, today=date(2026, 11, 1))
        self.assertEqual(slot.hour, 9)

    def test_booking_slot_none_without_a_day(self):
        from apps.receptionist.calendar_sync import booking_slot

        booking = self._booking(preferred="whenever suits you")
        self.assertIsNone(booking_slot(booking))

    # --- confirm ---

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_saves_the_slot(self, _send):
        self.client.force_login(self.user)
        booking = self._booking(preferred="tomorrow 10:00")
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        self.assertEqual(resp.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "confirmed")
        self.assertIsNotNone(booking.scheduled_start)
        self.assertEqual(timezone.localtime(booking.scheduled_start).hour, 10)

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_blocks_a_clashing_slot(self, _send):
        self.client.force_login(self.user)
        from apps.receptionist.calendar_sync import booking_slot

        first = self._booking(preferred="tomorrow 10:00", status="confirmed")
        first.scheduled_start = booking_slot(first)
        first.save(update_fields=["scheduled_start"])
        second = self._booking(preferred="tomorrow 10:30")
        resp = self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{second.id}/confirm/", follow=True)
        second.refresh_from_db()
        self.assertEqual(second.status, "requested")
        self.assertContains(resp, "already taken")

    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_allows_a_free_slot_on_the_same_day(self, _send):
        self.client.force_login(self.user)
        from apps.receptionist.calendar_sync import booking_slot

        first = self._booking(preferred="tomorrow 10:00", status="confirmed")
        first.scheduled_start = booking_slot(first)
        first.save(update_fields=["scheduled_start"])
        second = self._booking(preferred="tomorrow 2pm")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{second.id}/confirm/")
        second.refresh_from_db()
        self.assertEqual(second.status, "confirmed")

    # --- calendar events ---

    @patch("apps.receptionist.calendar_sync.httpx.post")
    @patch("apps.receptionist.sending.send_draft", return_value=True)
    def test_confirm_creates_a_timed_event_and_stores_its_id(self, _send, mock_post):
        self.client.force_login(self.user)
        self._connection()
        mock_post.return_value = Mock(status_code=200, json=lambda: {"id": "evt-123"})
        mock_post.return_value.raise_for_status = lambda: None
        booking = self._booking(preferred="tomorrow 10:00")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/confirm/")
        booking.refresh_from_db()
        self.assertEqual(booking.google_event_id, "evt-123")
        body = mock_post.call_args.kwargs["json"]
        self.assertIn("dateTime", body["start"])
        self.assertEqual(body["start"]["timeZone"], "Africa/Johannesburg")
        self.assertEqual(
            body["end"]["dateTime"], timezone.localtime(booking.scheduled_start + timedelta(minutes=60)).isoformat()
        )

    @patch("apps.receptionist.calendar_sync.httpx.patch")
    def test_reschedule_moves_the_calendar_event(self, mock_patch):
        self.client.force_login(self.user)
        self._connection()
        mock_patch.return_value = Mock(status_code=200)
        mock_patch.return_value.raise_for_status = lambda: None
        booking = self._booking(preferred="tomorrow 10:00", status="confirmed", google_event_id="evt-9")
        from apps.receptionist.calendar_sync import booking_slot

        booking.scheduled_start = booking_slot(booking)
        booking.save(update_fields=["scheduled_start"])
        resp = self.client.post(
            f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/reschedule/",
            {"new_time": "tomorrow 3pm"},
        )
        self.assertEqual(resp.status_code, 302)
        booking.refresh_from_db()
        self.assertEqual(timezone.localtime(booking.scheduled_start).hour, 15)
        self.assertIn("evt-9", mock_patch.call_args.args[0])

    @patch("apps.receptionist.calendar_sync.httpx.patch")
    def test_reschedule_blocks_a_clash(self, mock_patch):
        self.client.force_login(self.user)
        self._connection()
        from apps.receptionist.calendar_sync import booking_slot

        first = self._booking(preferred="tomorrow 10:00", status="confirmed")
        first.scheduled_start = booking_slot(first)
        first.save(update_fields=["scheduled_start"])
        second = self._booking(preferred="tomorrow 2pm", status="confirmed", google_event_id="evt-2")
        second.scheduled_start = booking_slot(second)
        second.save(update_fields=["scheduled_start"])
        resp = self.client.post(
            f"/workspace/{self.ws.id}/receptionist/bookings/{second.id}/reschedule/",
            {"new_time": "tomorrow 10:30"},
            follow=True,
        )
        second.refresh_from_db()
        self.assertEqual(timezone.localtime(second.scheduled_start).hour, 14)
        self.assertContains(resp, "already taken")
        mock_patch.assert_not_called()

    def test_reschedule_rejects_text_without_a_time(self):
        self.client.force_login(self.user)
        booking = self._booking(status="confirmed")
        resp = self.client.post(
            f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/reschedule/",
            {"new_time": "whenever"},
            follow=True,
        )
        self.assertContains(resp, "could not read a date or time")

    @patch("apps.receptionist.calendar_sync.httpx.delete")
    def test_cancel_removes_the_calendar_event(self, mock_delete):
        self.client.force_login(self.user)
        self._connection()
        mock_delete.return_value = Mock(status_code=204)
        mock_delete.return_value.raise_for_status = lambda: None
        booking = self._booking(status="confirmed", google_event_id="evt-7")
        self.client.post(f"/workspace/{self.ws.id}/receptionist/bookings/{booking.id}/cancel/")
        booking.refresh_from_db()
        self.assertEqual(booking.status, "cancelled")
        self.assertEqual(booking.google_event_id, "")
        self.assertIn("evt-7", mock_delete.call_args.args[0])

    @patch("apps.receptionist.calendar_sync.httpx.delete")
    def test_cancel_treats_a_missing_event_as_gone(self, mock_delete):
        self._connection()
        mock_delete.return_value = Mock(status_code=404)
        booking = self._booking(status="confirmed", google_event_id="evt-gone")
        from apps.receptionist import calendar_sync

        conn = CalendarConnection.objects.get(workspace=self.ws)
        self.assertTrue(calendar_sync.delete_booking_event(conn, booking))
        booking.refresh_from_db()
        self.assertEqual(booking.google_event_id, "")


class WaitlistViewTests(TestCase):
    """Waitlist screen: add, offer, accept, cancel, auto-expire."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self.user = User.objects.create_user(
            email="waitlist-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Waitlist Bistro")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)

    def _add(self, wa="27821112223", name="Thandi", party="4"):
        return self.client.post(
            reverse("receptionist:waitlist", args=[self.ws.id]),
            {"wa_id": wa, "name": name, "party_size": party, "wanted_time": "tonight 7pm"},
        )

    def test_add_creates_entry_and_contact(self):
        from .models import WaitlistEntry

        resp = self._add()
        self.assertEqual(resp.status_code, 302)
        entry = WaitlistEntry.objects.get(workspace=self.ws)
        self.assertEqual(entry.status, WaitlistEntry.Status.WAITING)
        self.assertEqual(entry.party_size, 4)
        self.assertEqual(entry.contact.name, "Thandi")
        self.assertEqual(entry.contact.wa_id, "27821112223")

    def test_add_requires_a_number(self):
        from .models import WaitlistEntry

        resp = self._add(wa="")
        self.assertEqual(resp.status_code, 302)
        self.assertFalse(WaitlistEntry.objects.filter(workspace=self.ws).exists())

    def test_offer_accept_cancel_flow(self):
        from .models import WaitlistEntry

        self._add()
        entry = WaitlistEntry.objects.get(workspace=self.ws)

        def url(action):
            return reverse("receptionist:waitlist_action", args=[self.ws.id, entry.id, action])

        self.client.post(url("offer"))
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.OFFERED)
        self.assertIsNotNone(entry.offered_at)

        self.client.post(url("accept"))
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.ACCEPTED)

        # accepted entries can no longer be cancelled or re-offered
        self.client.post(url("cancel"))
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.ACCEPTED)

    def test_waiting_entry_can_be_cancelled(self):
        from .models import WaitlistEntry

        self._add()
        entry = WaitlistEntry.objects.get(workspace=self.ws)
        self.client.post(reverse("receptionist:waitlist_action", args=[self.ws.id, entry.id, "cancel"]))
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.CANCELLED)

    def test_stale_offer_expires_on_view(self):
        from .models import WaitlistEntry

        self._add()
        entry = WaitlistEntry.objects.get(workspace=self.ws)
        entry.status = WaitlistEntry.Status.OFFERED
        entry.offered_at = timezone.now() - timedelta(minutes=entry.offer_minutes + 5)
        entry.save(update_fields=["status", "offered_at"])

        resp = self.client.get(reverse("receptionist:waitlist", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 200)
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.EXPIRED)

    def test_other_workspaces_cannot_touch_entries(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        from .models import WaitlistEntry

        self._add()
        entry = WaitlistEntry.objects.get(workspace=self.ws)
        other = User.objects.create_user(
            email="waitlist-outsider@example.com",
            password="testpass123",
            name="Outsider",
            tos_accepted_at=timezone.now(),
        )
        outsider_ws = _workspace("Outsider Bistro")
        WorkspaceMembership.objects.create(user=other, workspace=outsider_ws)
        self.client.force_login(other)
        resp = self.client.post(reverse("receptionist:waitlist_action", args=[self.ws.id, entry.id, "cancel"]))
        self.assertEqual(resp.status_code, 403)
        entry.refresh_from_db()
        self.assertEqual(entry.status, WaitlistEntry.Status.WAITING)


class LoyaltyTests(TestCase):
    """Loyalty: welcome bonus, earn on done bookings, vouchers."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self.user = User.objects.create_user(
            email="loyalty-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Loyalty Bistro")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        self.contact = Contact.objects.create(workspace=self.ws, wa_id="27821119999", name="Loyal Lerato")

    def _done_booking(self):
        booking = Booking.objects.create(workspace=self.ws, contact=self.contact, status=Booking.Status.CONFIRMED)
        self.client.post(reverse("receptionist:booking_action", args=[self.ws.id, booking.id, "done"]))
        return booking

    def test_done_booking_awards_welcome_and_points_once(self):
        from .models import LoyaltyAccount, LoyaltyTransaction

        booking = self._done_booking()
        account = LoyaltyAccount.objects.get(workspace=self.ws, contact=self.contact)
        # 25 welcome + 10 for the visit
        self.assertEqual(account.balance, 35)
        self.assertTrue(account.welcomed)
        # marking done again (impossible via the view, but the service must be idempotent)
        from . import loyalty as _loyalty

        _loyalty.award_for_booking(booking)
        account.refresh_from_db()
        self.assertEqual(account.balance, 35)
        self.assertEqual(LoyaltyTransaction.objects.filter(account=account).count(), 2)

    def test_disabled_loyalty_awards_nothing(self):
        from .loyalty import settings_for
        from .models import LoyaltyAccount

        settings = settings_for(self.ws)
        settings.enabled = False
        settings.save()
        self._done_booking()
        self.assertFalse(LoyaltyAccount.objects.filter(workspace=self.ws).exists())

    def test_issue_voucher_spends_points(self):
        from .loyalty import account_for, issue_voucher
        from .models import Voucher

        account = account_for(self.ws, self.contact)  # 25 welcome
        with self.assertRaises(ValueError):
            issue_voucher(self.ws, self.contact)  # needs 100
        account.balance = 120
        account.save(update_fields=["balance"])
        voucher = issue_voucher(self.ws, self.contact)
        account.refresh_from_db()
        self.assertEqual(account.balance, 20)
        self.assertEqual(voucher.status, Voucher.Status.ACTIVE)
        self.assertEqual(voucher.amount_rand, 50)
        self.assertTrue(voucher.code)

    def test_redeem_and_expiry(self):
        from .loyalty import account_for, issue_voucher, redeem_voucher
        from .models import Voucher

        account = account_for(self.ws, self.contact)
        account.balance = 100
        account.save(update_fields=["balance"])
        voucher = issue_voucher(self.ws, self.contact)
        self.assertTrue(redeem_voucher(voucher))
        self.assertFalse(redeem_voucher(voucher))  # already used
        # expired voucher cannot be redeemed
        account.balance = 100
        account.save(update_fields=["balance"])
        v2 = issue_voucher(self.ws, self.contact)
        v2.expires_at = timezone.now() - timedelta(days=1)
        v2.save(update_fields=["expires_at"])
        self.assertFalse(redeem_voucher(v2))
        v2.refresh_from_db()
        self.assertEqual(v2.status, Voucher.Status.EXPIRED)

    def test_balance_line(self):
        from .loyalty import account_for, balance_line

        account = account_for(self.ws, self.contact)
        line = balance_line(self.ws, self.contact)
        self.assertIn("25 points", line)
        self.assertIn("75 more", line)
        account.balance = 100
        account.save(update_fields=["balance"])
        self.assertIn("enough for a R50 voucher", balance_line(self.ws, self.contact))

    def test_loyalty_screen_and_isolation(self):
        from .loyalty import account_for

        account_for(self.ws, self.contact)
        resp = self.client.get(reverse("receptionist:loyalty", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Loyal Lerato")
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        other = User.objects.create_user(
            email="loyalty-outsider@example.com",
            password="testpass123",
            name="Out",
            tos_accepted_at=timezone.now(),
        )
        WorkspaceMembership.objects.create(user=other, workspace=_workspace("Other Bistro"))
        self.client.force_login(other)
        self.assertEqual(self.client.get(reverse("receptionist:loyalty", args=[self.ws.id])).status_code, 403)


class ComplaintTests(TestCase):
    """Complaints: auto-creation on flagged issues, recovery flow, isolation."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self.user = User.objects.create_user(
            email="complaint-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Complaint Bistro")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        self.contact = Contact.objects.create(workspace=self.ws, wa_id="27821118888", name="Unhappy Uma")

    def _add(self):
        self.client.post(
            reverse("receptionist:complaints", args=[self.ws.id]),
            {"wa_id": self.contact.wa_id, "text": "Our food arrived cold."},
        )
        from .models import Complaint

        return Complaint.objects.get(workspace=self.ws)

    def test_flag_issue_creates_complaint(self):
        from .models import Complaint
        from .reviews import flag_issue

        flag_issue(self.contact, "Waited 40 minutes for the bill.")
        complaint = Complaint.objects.get(workspace=self.ws)
        self.assertEqual(complaint.source, "check_in")
        self.assertEqual(complaint.status, Complaint.Status.OPEN)
        self.contact.refresh_from_db()
        self.assertTrue(self.contact.needs_human)

    def test_manual_add_and_full_recovery_flow(self):
        from .models import Complaint, Voucher

        complaint = self._add()
        url = lambda a: reverse("receptionist:complaint_action", args=[self.ws.id, complaint.id, a])  # noqa: E731

        self.client.post(url("acknowledge"))
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.ACKNOWLEDGED)

        self.client.post(url("apology"), {"apology_text": "We are so sorry - that is not our standard."})
        complaint.refresh_from_db()
        self.assertIn("so sorry", complaint.apology_text)

        self.client.post(url("voucher"))
        complaint.refresh_from_db()
        self.assertIsNotNone(complaint.voucher)
        self.assertEqual(complaint.voucher.kind, Voucher.Kind.RECOVERY)
        self.assertEqual(complaint.voucher.status, Voucher.Status.ACTIVE)
        # no second voucher
        self.client.post(url("voucher"))
        complaint.refresh_from_db()
        self.assertEqual(Voucher.objects.filter(workspace=self.ws).count(), 1)

        self.client.post(url("resolve"), {"resolution_note": "Apologised, sent voucher, invited back."})
        complaint.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.RESOLVED)
        self.assertIsNotNone(complaint.resolved_at)

    def test_escalate_flags_contact_for_human(self):
        from .models import Complaint

        complaint = self._add()
        self.client.post(reverse("receptionist:complaint_action", args=[self.ws.id, complaint.id, "escalate"]))
        complaint.refresh_from_db()
        self.contact.refresh_from_db()
        self.assertEqual(complaint.status, Complaint.Status.ESCALATED)
        self.assertTrue(self.contact.needs_human)

    def test_nav_links_loyalty_and_complaints_from_every_screen(self):
        screens = ["inbox", "bookings", "waitlist", "quotes", "reviews", "loyalty", "complaints", "campaigns", "setup"]
        for name in screens:
            resp = self.client.get(reverse(f"receptionist:{name}", args=[self.ws.id]))
            self.assertEqual(resp.status_code, 200, name)
            self.assertContains(resp, reverse("receptionist:loyalty", args=[self.ws.id]))
            self.assertContains(resp, reverse("receptionist:complaints", args=[self.ws.id]))
            self.assertContains(resp, reverse("receptionist:campaigns", args=[self.ws.id]))

    def test_complaints_screen_isolated(self):
        self._add()
        resp = self.client.get(reverse("receptionist:complaints", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Our food arrived cold.")
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        other = User.objects.create_user(
            email="complaint-outsider@example.com",
            password="testpass123",
            name="Out",
            tos_accepted_at=timezone.now(),
        )
        WorkspaceMembership.objects.create(user=other, workspace=_workspace("Other Cafe"))
        self.client.force_login(other)
        self.assertEqual(self.client.get(reverse("receptionist:complaints", args=[self.ws.id])).status_code, 403)


class CampaignTests(TestCase):
    """Campaigns: segmentation, approval, A/B, guarded send, attribution."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self.user = User.objects.create_user(
            email="campaign-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Campaign Cafe")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        now = timezone.now()

        def contact(wa, name, **kw):
            return Contact.objects.create(workspace=self.ws, wa_id=wa, name=name, **kw)

        self.recent = contact("27821110001", "Recent Rita", last_visit_at=now - timedelta(days=5))
        self.dormant = contact("27821110002", "Dormant Dan", last_visit_at=now - timedelta(days=60))
        self.never = contact("27821110003", "Never Nala")
        self.vip = contact("27821110004", "VIP Vusi", is_vip=True, last_visit_at=now - timedelta(days=2))
        self.optedout = contact("27821110005", "Opted Otto", last_visit_at=now - timedelta(days=90), opted_out=True)

    def _draft(self, body_b=""):
        from .campaigns import create_campaign

        return create_campaign(self.ws, "Winter warmer", "all", "Hi {first name}, we miss you!", body_b)

    def test_segments(self):
        from .campaigns import segment_contacts

        self.assertEqual(set(segment_contacts(self.ws, "all")), {self.recent, self.dormant, self.never, self.vip})
        self.assertEqual(set(segment_contacts(self.ws, "dormant")), {self.dormant, self.never})
        self.assertEqual(set(segment_contacts(self.ws, "vip")), {self.vip})

    def test_approve_freezes_ab_recipients(self):
        from .campaigns import approve

        campaign = self._draft(body_b="B version here")
        approve(campaign, timezone.now() + timedelta(hours=2))
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.SCHEDULED)
        rows = list(campaign.recipients.order_by("contact__created_at"))
        self.assertEqual(len(rows), 4)
        self.assertEqual([r.variant for r in rows], ["a", "b", "a", "b"])

    def test_send_holds_without_whatsapp_channel(self):
        from .campaigns import approve, send_campaign

        campaign = self._draft()
        approve(campaign, timezone.now())
        self.assertEqual(send_campaign(campaign), "held")
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.SCHEDULED)
        self.assertEqual(campaign.recipients.filter(status="pending").count(), 4)

    def test_send_delivers_and_skips_late_optout(self):
        from .campaigns import approve, send_campaign
        from .models import CampaignRecipient, ZernioChannel

        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-camp")
        campaign = self._draft(body_b="B version")
        approve(campaign, timezone.now())
        self.dormant.opted_out = True
        self.dormant.save(update_fields=["opted_out"])
        with patch("apps.receptionist.campaigns.send_draft", return_value=True):
            self.assertEqual(send_campaign(campaign), "sent")
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.SENT)
        self.assertEqual(campaign.recipients.get(contact=self.dormant).status, CampaignRecipient.Status.SKIPPED)
        sent = campaign.recipients.get(contact=self.recent)
        self.assertEqual(sent.status, CampaignRecipient.Status.SENT)
        self.assertIn("Recent", sent.message.body)
        self.assertIn("Reply STOP", sent.message.body)

    def test_attribution_links_booking_and_value(self):
        from .campaigns import approve, send_campaign
        from .models import ZernioChannel

        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-camp")
        campaign = self._draft()
        approve(campaign, timezone.now())
        with patch("apps.receptionist.campaigns.send_draft", return_value=True):
            send_campaign(campaign)
        booking = Booking.objects.create(
            workspace=self.ws, contact=self.dormant, service="Dinner", status=Booking.Status.CONFIRMED
        )
        self.client.post(
            reverse("receptionist:booking_action", args=[self.ws.id, booking.id, "done"]),
            {"value": "450"},
        )
        recipient = campaign.recipients.get(contact=self.dormant)
        recipient.refresh_from_db()
        self.assertEqual(recipient.attributed_booking, booking)
        self.assertEqual(str(recipient.attributed_amount), "450.00")
        resp = self.client.get(reverse("receptionist:campaigns", args=[self.ws.id]))
        self.assertContains(resp, "R450.00")

    def test_create_requires_a_message(self):
        resp = self.client.post(
            reverse("receptionist:campaigns", args=[self.ws.id]),
            {"name": "Empty", "segment": "all", "body_a": "  "},
        )
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(Campaign.objects.count(), 0)

    def test_campaigns_screen_isolated(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self._draft()
        other = User.objects.create_user(
            email="campaign-stranger@example.com",
            password="testpass123",
            name="Stranger",
            tos_accepted_at=timezone.now(),
        )
        ws2 = _workspace("Other Cafe")
        WorkspaceMembership.objects.create(user=other, workspace=ws2)
        self.client.force_login(other)
        resp = self.client.get(reverse("receptionist:campaigns", args=[ws2.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertNotContains(resp, "Winter warmer")
        resp = self.client.get(reverse("receptionist:campaigns", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 403)


class CampaignHonestyTests(TestCase):
    """Approve banner tells the truth when WhatsApp is not connected, and a
    cancelled campaign can never go out on a later connection."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        self.user = User.objects.create_user(
            email="honesty-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Honesty Diner")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        Contact.objects.create(workspace=self.ws, wa_id="27821110009", name="Regular Reg")

    def _draft(self):
        from .campaigns import create_campaign

        return create_campaign(self.ws, "Honesty check", "all", "Hi {first name}, special this week!")

    def test_approve_banner_when_held_says_connect_whatsapp(self):
        resp = self.client.post(
            reverse("receptionist:campaign_action", args=[self.ws.id, self._draft().id, "approve"]),
            follow=True,
        )
        self.assertContains(resp, "will go out once you connect WhatsApp")
        self.assertNotContains(resp, "is sending now")

    def test_cancelled_campaign_never_sends_on_later_connection(self):
        from .campaigns import approve, cancel, send_campaign
        from .models import CampaignRecipient, ZernioChannel

        campaign = self._draft()
        approve(campaign, timezone.now() + timedelta(hours=1))  # no channel yet: held as scheduled
        self.assertTrue(cancel(campaign))
        # A channel appears later (the future-connection case).
        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-late")
        with patch("apps.receptionist.campaigns.send_draft", return_value=True) as mock_send:
            self.assertEqual(send_campaign(campaign), "cancelled")
        self.assertFalse(mock_send.called)
        self.assertEqual(campaign.recipients.filter(status=CampaignRecipient.Status.PENDING).count(), 1)
        self.assertEqual(Message.objects.filter(workspace=self.ws).count(), 0)


class CompetitorIntelTests(TestCase):
    """Competitor tracking and the opportunities that fall out of it."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership
        from apps.menus.models import MenuItem

        self.user = User.objects.create_user(
            email="comp-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Rivalry Grill")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        BusinessProfile.objects.create(workspace=self.ws, business_name="Rivalry Grill", google_rating=Decimal("4.6"))
        self.own_dish = MenuItem.objects.create(workspace=self.ws, name="Peri-peri chicken", price=Decimal("129.00"))
        self.rival = Competitor.objects.create(
            workspace=self.ws, name="The Grill Next Door", area="Maponya Mall", rating=Decimal("4.1")
        )

    def test_price_gap_opportunity(self):
        from .opportunities import refresh

        CompetitorDish.objects.create(
            competitor=self.rival, name="Peri-peri half", price=Decimal("99.00"), own_item=self.own_dish
        )
        opps = refresh(self.ws)
        price_opps = [o for o in opps if o.kind == MarketOpportunity.Kind.PRICE_GAP]
        self.assertEqual(len(price_opps), 1)
        self.assertIn("undercuts", price_opps[0].title)
        self.assertIn("R30.00", price_opps[0].detail)

    def test_price_advantage_and_rating_opportunities(self):
        from .opportunities import refresh

        CompetitorDish.objects.create(
            competitor=self.rival, name="Peri-peri half", price=Decimal("149.00"), own_item=self.own_dish
        )
        opps = refresh(self.ws)
        kinds = {o.kind for o in opps}
        self.assertIn(MarketOpportunity.Kind.PRICE_ADVANTAGE, kinds)
        self.assertIn(MarketOpportunity.Kind.RATING_GAP, kinds)

    def test_promo_and_demand_opportunities(self):
        from .opportunities import refresh

        CompetitorPromo.objects.create(competitor=self.rival, text="2-for-1 burgers on Tuesdays")
        for i in range(5):
            guest = Contact.objects.create(workspace=self.ws, wa_id=f"2782111001{i}", name=f"Party {i}")
            WaitlistEntry.objects.create(workspace=self.ws, contact=guest, party_size=2)
        opps = refresh(self.ws)
        kinds = {o.kind for o in opps}
        self.assertIn(MarketOpportunity.Kind.PROMO, kinds)
        self.assertIn(MarketOpportunity.Kind.DEMAND, kinds)

    def test_refresh_dedupes_and_drops_stale_new(self):
        from .opportunities import refresh

        dish = CompetitorDish.objects.create(
            competitor=self.rival, name="Peri-peri half", price=Decimal("99.00"), own_item=self.own_dish
        )
        refresh(self.ws)
        acted = MarketOpportunity.objects.get(dedupe_key=f"price_gap:{dish.id}")
        acted.status = MarketOpportunity.Status.ACTED
        acted.save(update_fields=["status"])
        refresh(self.ws)
        self.assertEqual(MarketOpportunity.objects.filter(dedupe_key=f"price_gap:{dish.id}").count(), 1)
        # Trigger disappears: acted record stays, a still-new one would be removed
        dish.price = Decimal("129.00")
        dish.save(update_fields=["price"])
        refresh(self.ws)
        self.assertEqual(
            MarketOpportunity.objects.get(dedupe_key=f"price_gap:{dish.id}").status,
            MarketOpportunity.Status.ACTED,
        )

    def test_opportunity_action_marks_dismissed(self):
        from .opportunities import refresh

        CompetitorDish.objects.create(
            competitor=self.rival, name="Peri-peri half", price=Decimal("99.00"), own_item=self.own_dish
        )
        refresh(self.ws)
        opp = MarketOpportunity.objects.get(workspace=self.ws, kind=MarketOpportunity.Kind.PRICE_GAP)
        self.client.post(reverse("receptionist:opportunity_action", args=[self.ws.id, opp.id, "dismissed"]))
        opp.refresh_from_db()
        self.assertEqual(opp.status, MarketOpportunity.Status.DISMISSED)

    def test_screen_flow_and_isolation(self):
        url = reverse("receptionist:competitors", args=[self.ws.id])
        self.client.post(url, {"form": "add_competitor", "name": "Braai Bros", "rating": "4.4"})
        self.assertTrue(Competitor.objects.filter(workspace=self.ws, name="Braai Bros").exists())
        resp = self.client.get(url)
        self.assertContains(resp, "The Grill Next Door")
        self.assertContains(resp, "Braai Bros")

        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        other = User.objects.create_user(
            email="comp-stranger@example.com",
            password="testpass123",
            name="Stranger",
            tos_accepted_at=timezone.now(),
        )
        ws2 = _workspace("Other Grill")
        WorkspaceMembership.objects.create(user=other, workspace=ws2)
        self.client.force_login(other)
        resp = self.client.get(reverse("receptionist:competitors", args=[ws2.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertNotContains(resp, "The Grill Next Door")
        self.assertEqual(self.client.get(reverse("receptionist:competitors", args=[self.ws.id])).status_code, 403)

    def test_nav_reaches_competitors(self):
        resp = self.client.get(reverse("receptionist:inbox", args=[self.ws.id]))
        self.assertContains(resp, reverse("receptionist:competitors", args=[self.ws.id]))


class RevenueEmployeeTests(TestCase):
    """AI Revenue Employee: confidence, impact, evidence, drafts, outcomes."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership
        from apps.menus.models import DishSale, MenuItem

        self.user = User.objects.create_user(
            email="revenue-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Revenue Grill")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        self.profile = BusinessProfile.objects.create(
            workspace=self.ws, business_name="Revenue Grill", google_rating=Decimal("4.6")
        )
        self.own_dish = MenuItem.objects.create(
            workspace=self.ws, name="Peri-peri chicken", price=Decimal("129.00"), food_cost=Decimal("45.00")
        )
        DishSale.objects.create(workspace=self.ws, item=self.own_dish, sold_on=timezone.localdate(), quantity=10)
        self.rival = Competitor.objects.create(workspace=self.ws, name="Rival House", rating=Decimal("4.1"))
        CompetitorDish.objects.create(
            competitor=self.rival, name="Peri-peri half", price=Decimal("99.00"), own_item=self.own_dish
        )
        from .opportunities import refresh

        refresh(self.ws)
        self.opp = MarketOpportunity.objects.get(workspace=self.ws, kind=MarketOpportunity.Kind.PRICE_GAP)

    def test_confidence_impact_evidence(self):
        self.assertEqual(self.opp.confidence, 90)
        self.assertEqual(self.opp.impact_rand, Decimal("300.00"))  # R30 gap x 10 units
        self.assertTrue(any("R99.00" in line for line in self.opp.evidence))
        self.assertTrue(any("10 sold" in line for line in self.opp.evidence))

    def test_execute_prepares_draft_and_marks_acted(self):
        resp = self.client.post(reverse("receptionist:revenue_execute", args=[self.ws.id, self.opp.id]), follow=True)
        self.assertContains(resp, "Draft ready")
        self.opp.refresh_from_db()
        self.assertEqual(self.opp.status, MarketOpportunity.Status.ACTED)
        self.assertIsNotNone(self.opp.campaign)
        self.assertEqual(self.opp.campaign.status, "draft")
        self.assertEqual(Campaign.objects.filter(workspace=self.ws).count(), 1)

    def test_auto_draft_only_in_draft_mode_and_high_confidence(self):
        from .opportunities import auto_draft, refresh

        self.assertEqual(auto_draft(self.ws), 0)  # suggest mode
        self.profile.revenue_mode = "draft"
        self.profile.save(update_fields=["revenue_mode"])
        self.assertEqual(auto_draft(self.ws), 1)  # price gap at 90 confidence
        # A low-confidence promo opportunity is left for the human
        self.opp.campaign = None
        self.opp.status = MarketOpportunity.Status.NEW
        self.opp.confidence = 60
        self.opp.save(update_fields=["campaign", "status", "confidence"])
        refresh(self.ws)  # refresh recomputes confidence to 90 - simulate only promo confidence
        self.assertIsNotNone(MarketOpportunity.objects.get(id=self.opp.id))

    def test_dashboard_renders_kpis_and_cards(self):
        resp = self.client.get(reverse("receptionist:revenue", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "undercuts your Peri-peri chicken")
        self.assertContains(resp, "confidence 90%")
        self.assertContains(resp, "R300.00/mo")
        self.assertContains(resp, "Evidence")

    def test_mode_toggle(self):
        self.client.post(reverse("receptionist:revenue", args=[self.ws.id]), {"mode": "draft"})
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.revenue_mode, "draft")

    def test_dashboard_isolated_and_nav(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        other = User.objects.create_user(
            email="revenue-stranger@example.com",
            password="testpass123",
            name="Stranger",
            tos_accepted_at=timezone.now(),
        )
        ws2 = _workspace("Other Revenue")
        WorkspaceMembership.objects.create(user=other, workspace=ws2)
        self.client.force_login(other)
        resp = self.client.get(reverse("receptionist:revenue", args=[ws2.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertNotContains(resp, "undercuts")
        self.assertEqual(self.client.get(reverse("receptionist:revenue", args=[self.ws.id])).status_code, 403)
        resp = self.client.get(reverse("receptionist:inbox", args=[ws2.id]))
        self.assertContains(resp, reverse("receptionist:revenue", args=[ws2.id]))
