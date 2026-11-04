"""RevUp Auto: panel beater / auto electrician profiles and photo quote intake."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.members.models import WorkspaceMembership
from apps.notifications.models import EventType, Notification
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import Booking, BusinessProfile, Contact, Message, ZernioChannel
from .services import ReplyDraft
from .webhooks import handle_inbox_message


def _workspace(name):
    org = Organization.objects.create(name=f"{name} org")
    return Workspace.objects.create(organization=org, name=name)


def _media_payload(account_id, wa="27821234567", text="", urls=None, mid="m1"):
    return {
        "event": "message.received",
        "message": {
            "id": mid,
            "direction": "incoming",
            "sender": {"id": wa, "phoneNumber": "+" + wa},
            "text": text,
            "attachments": [{"type": "image", "url": u} for u in (urls or [])],
            "account": {"accountId": account_id},
        },
    }


class PanelBeaterProfileTests(TestCase):
    def test_new_industries_are_valid_choices(self):
        from apps.receptionist.models import Industry

        values = [c.value for c in Industry]
        self.assertIn("panel-beater", values)
        self.assertIn("auto-electrician", values)
        self.assertIn("auto-workshop", values)
        self.assertIn("mobile-mechanic", values)

    def test_signup_presets_exist(self):
        from apps.common.industry_presets import INDUSTRY_PRESETS

        self.assertIn("panel_beater", INDUSTRY_PRESETS)
        self.assertIn("auto_electrician", INDUSTRY_PRESETS)

    def test_workspace_signup_maps_to_receptionist_industry(self):
        from apps.receptionist.models import WORKSPACE_INDUSTRY_MAP, Industry

        self.assertEqual(WORKSPACE_INDUSTRY_MAP["panel_beater"], Industry.PANEL_BEATER)
        self.assertEqual(WORKSPACE_INDUSTRY_MAP["auto_electrician"], Industry.AUTO_ELECTRICIAN)

    def test_panel_beater_brief_forbids_photo_estimates(self):
        from apps.receptionist.models import Industry
        from apps.receptionist.services import _INDUSTRY_BRIEFS

        brief = _INDUSTRY_BRIEFS[Industry.PANEL_BEATER]
        self.assertIn("NEVER estimate", brief)
        self.assertIn("photos", brief)


class PhotoIntakeTests(TestCase):
    def setUp(self):
        self.ws = _workspace("pb-panelbeaters")
        BusinessProfile.objects.create(workspace=self.ws, industry="panel-beater", business_name="PB Panel Beaters")
        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-pb")
        self.user = get_user_model().objects.create_user(email="owner-pb@example.com", password="x")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws, workspace_role="owner")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_media_only_message_is_stored_not_dropped(self, mock_draft):
        mock_draft.return_value = ReplyDraft(body="Thanks, 3 photos received. The team will assess them.", intake={})
        handle_inbox_message(
            _media_payload(
                "acct-pb",
                urls=[
                    "https://cdn.example.com/1.jpg",
                    "https://cdn.example.com/2.jpg",
                    "https://cdn.example.com/3.jpg",
                ],
            )
        )
        msg = Message.objects.get(workspace=self.ws, direction="inbound")
        self.assertEqual(len(msg.media_urls), 3)
        self.assertIn("3 photos", msg.body)

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_photos_reach_the_draft_prompt(self, mock_draft):
        mock_draft.return_value = ReplyDraft(body="Got the photos, thanks.", intake={})
        handle_inbox_message(
            _media_payload("acct-pb", text="here is the damage", urls=["https://cdn.example.com/dent.jpg"])
        )
        incoming = mock_draft.call_args[0][2]
        self.assertIn("1 photo", incoming)
        self.assertIn("here is the damage", incoming)

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_owner_is_alerted_with_media_urls(self, mock_draft):
        mock_draft.return_value = ReplyDraft(body="Thanks.", intake={})
        handle_inbox_message(_media_payload("acct-pb", urls=["https://cdn.example.com/a.jpg"]))
        note = Notification.objects.get(user=self.user, event_type=EventType.RECEPTIONIST_MEDIA_INTAKE)
        self.assertEqual(note.data["media_urls"], ["https://cdn.example.com/a.jpg"])

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_photo_quote_intake_creates_booking(self, mock_draft):
        mock_draft.return_value = ReplyDraft(
            body="Thanks, the team will assess the photos.",
            intake={"name": "Sipho", "detail": "Polo 2019 rear bumper damage", "preferred_time": "this week"},
        )
        handle_inbox_message(
            _media_payload("acct-pb", text="need a quote please", urls=["https://cdn.example.com/b.jpg"], mid="m9")
        )
        booking = Booking.objects.get(workspace=self.ws)
        self.assertEqual(booking.service, "Polo 2019 rear bumper damage")

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_textless_medialess_message_still_dropped(self, mock_draft):
        handle_inbox_message(_media_payload("acct-pb", text="", urls=[]))
        self.assertFalse(Message.objects.filter(workspace=self.ws).exists())
        mock_draft.assert_not_called()

    @patch("apps.receptionist.webhooks.draft_reply")
    def test_string_attachment_shape_accepted(self, mock_draft):
        mock_draft.return_value = ReplyDraft(body="Thanks.", intake={})
        payload = _media_payload("acct-pb", urls=[])
        payload["message"]["attachments"] = ["https://cdn.example.com/plain.jpg"]
        handle_inbox_message(payload)
        msg = Message.objects.get(workspace=self.ws, direction="inbound")
        self.assertEqual(msg.media_urls, ["https://cdn.example.com/plain.jpg"])


class ConversationMediaDisplayTests(TestCase):
    def test_conversation_page_lists_photo_links(self):
        ws = _workspace("pb-display")
        BusinessProfile.objects.create(workspace=ws, industry="panel-beater", business_name="PB Display")
        user = get_user_model().objects.create_user(
            email="viewer-pb@example.com", password="x", tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role="owner")
        contact = Contact.objects.create(workspace=ws, wa_id="27820001122")
        Message.objects.create(
            workspace=ws,
            contact=contact,
            direction="inbound",
            sender_type="user",
            body="[2 photos received]",
            media_urls=["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.jpg"],
        )
        self.client.force_login(user)
        resp = self.client.get(f"/workspace/{ws.id}/receptionist/contacts/{contact.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "https://cdn.example.com/1.jpg")
        self.assertContains(resp, "Photo 2")


class ReviewTriageTests(TestCase):
    """Negative replies route to the owner, after check-in AND after the ask."""

    def setUp(self):
        self.ws = _workspace("pb-reviews")
        BusinessProfile.objects.create(workspace=self.ws, industry="panel-beater", business_name="PB Reviews")
        ZernioChannel.objects.create(workspace=self.ws, zernio_account_id="acct-pbr")
        self.user = get_user_model().objects.create_user(email="owner-pbr@example.com", password="x")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws, workspace_role="owner")

    def _contact(self, status):
        return Contact.objects.create(workspace=self.ws, wa_id="27821112233", review_status=status)

    def _inbound(self, text, mid):
        payload = {
            "event": "message.received",
            "message": {
                "id": mid,
                "direction": "incoming",
                "sender": {"id": "27821112233", "phoneNumber": "+27821112233"},
                "text": text,
                "account": {"accountId": "acct-pbr"},
            },
        }
        with patch("apps.receptionist.webhooks.draft_reply") as mock_draft:
            mock_draft.return_value = ReplyDraft(body="Noted.", intake={})
            handle_inbox_message(payload)

    def test_negative_after_check_in_flags_and_alerts_owner(self):
        contact = self._contact("check_in_sent")
        self._inbound("I am not happy, the panel is still not fixed", "n1")
        contact.refresh_from_db()
        self.assertEqual(contact.review_status, "issue_flagged")
        self.assertTrue(contact.needs_human)
        note = Notification.objects.get(user=self.user, event_type=EventType.RECEPTIONIST_REVIEW_ISSUE)
        self.assertIn("still not fixed", note.data["note"])

    def test_negative_after_review_request_flags_and_alerts_owner(self):
        contact = self._contact("review_requested")
        self._inbound("Terrible work, worst service", "n2")
        contact.refresh_from_db()
        self.assertEqual(contact.review_status, "issue_flagged")
        self.assertTrue(
            Notification.objects.filter(user=self.user, event_type=EventType.RECEPTIONIST_REVIEW_ISSUE).exists()
        )

    def test_positive_reply_never_flags(self):
        contact = self._contact("check_in_sent")
        self._inbound("Great job, thank you so much!", "n3")
        contact.refresh_from_db()
        self.assertEqual(contact.review_status, "check_in_sent")
        self.assertFalse(
            Notification.objects.filter(user=self.user, event_type=EventType.RECEPTIONIST_REVIEW_ISSUE).exists()
        )

    def test_sa_phrasing_counts_as_negative(self):
        from .reviews import looks_negative

        self.assertTrue(looks_negative("Not impressed at all"))
        self.assertTrue(looks_negative("The car came back with the same problem"))
        self.assertTrue(looks_negative("What a rip off"))
        self.assertFalse(looks_negative("Thanks, all sorted"))
