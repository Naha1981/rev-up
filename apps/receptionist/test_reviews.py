"""Review pipeline tests, mirroring RepEngine's engine test list."""

from __future__ import annotations

from datetime import timedelta
from unittest import mock

import pytest
from django.test import Client, override_settings
from django.utils import timezone

from apps.organizations.models import Organization
from apps.receptionist import reviews
from apps.receptionist.models import (
    Booking,
    BusinessProfile,
    Contact,
    Message,
    ReviewEvent,
    ReviewLink,
    ZernioChannel,
)
from apps.workspaces.models import Workspace

pytestmark = pytest.mark.django_db

GOOGLE_URL = "https://g.page/r/example-review"


def _workspace(plan="growth"):
    org = Organization.objects.create(name="Test Org", plan=plan)
    ws = Workspace.objects.create(name="Test Biz", organization=org)
    BusinessProfile.objects.create(
        workspace=ws, business_name="Test Biz", google_review_url=GOOGLE_URL, review_requests_enabled=True
    )
    ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc-test")
    return ws


def _contact(ws, name="Sam", wa_id="27710000001"):
    c = Contact.objects.create(workspace=ws, wa_id=wa_id, name=name, zernio_conversation_id="conv-1")
    Message.objects.create(
        workspace=ws, contact=c, direction=Message.Direction.INBOUND, sender_type=Message.SenderType.USER, body="hi"
    )
    return c


def _booking(ws, contact, status=Booking.Status.CONFIRMED):
    return Booking.objects.create(workspace=ws, contact=contact, service="Check-up", status=status)


@pytest.fixture(autouse=True)
def _capture_sends():
    with mock.patch("apps.receptionist.reviews.send_draft", side_effect=_fake_send) as m:
        yield m


def _fake_send(channel, contact, message):
    message.is_draft = False
    message.save(update_fields=["is_draft"])
    return True


def _run_due(ws):
    due = ReviewEvent.objects.filter(
        workspace=ws, status=ReviewEvent.Status.SCHEDULED, scheduled_for__lte=timezone.now()
    )
    return [reviews.send_event(e) for e in due]


def _advance(event, delta):
    ReviewEvent.objects.filter(id=event.id).update(scheduled_for=timezone.now() - delta)


class TestPipelineOrder:
    def test_done_booking_schedules_check_in_in_15_min(self):
        ws = _workspace()
        booking = _booking(ws, _contact(ws))
        before = timezone.now()
        event = reviews.start_pipeline(booking)
        assert event.step == ReviewEvent.Step.CHECK_IN
        assert timedelta(minutes=14) < event.scheduled_for - before < timedelta(minutes=16)

    def test_full_flow_timings_and_messages(self, _capture_sends):
        ws = _workspace()
        contact = _contact(ws)
        event = reviews.start_pipeline(_booking(ws, contact))
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            _advance(event, timedelta(minutes=1))
            assert _run_due(ws) == ["sent"]
            check_in = Message.objects.get(workspace=ws, body__contains="checking in")
            assert "everything looks good" in check_in.body
            assert check_in.body.endswith("Reply STOP to opt out.")
            request = ReviewEvent.objects.get(step=ReviewEvent.Step.REVIEW_REQUEST)
            assert (
                timedelta(hours=1, minutes=59) < request.scheduled_for - timezone.now() < timedelta(hours=2, minutes=1)
            )

            _advance(request, timedelta(minutes=1))
            assert _run_due(ws) == ["sent"]
            link = ReviewLink.objects.get(contact=contact)
            ask = Message.objects.get(workspace=ws, body__contains="Google review?")
            assert f"/r/{link.short_code}" in ask.body
            reminder = ReviewEvent.objects.get(step=ReviewEvent.Step.REMINDER)
            assert (
                timedelta(hours=47, minutes=59)
                < reminder.scheduled_for - timezone.now()
                < timedelta(hours=48, minutes=1)
            )

            _advance(reminder, timedelta(minutes=1))
            assert _run_due(ws) == ["sent"]
            assert Message.objects.filter(workspace=ws, body__contains="quick follow-up").exists()

    def test_review_status_progresses(self):
        ws = _workspace()
        contact = _contact(ws)
        event = reviews.start_pipeline(_booking(ws, contact))
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            _advance(event, timedelta(minutes=1))
            _run_due(ws)
            contact.refresh_from_db()
            assert contact.review_status == "check_in_sent"


class TestClickCancelsReminder:
    def test_click_records_and_cancels(self):
        ws = _workspace()
        contact = _contact(ws)
        link = ReviewLink.objects.create(workspace=ws, contact=contact, short_code="abc12345", original_url=GOOGLE_URL)
        reminder = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REMINDER, scheduled_for=timezone.now()
        )
        assert reviews.record_click("abc12345") == GOOGLE_URL
        link.refresh_from_db()
        assert link.clicked_at is not None
        reminder.refresh_from_db()
        assert reminder.status == ReviewEvent.Status.CANCELLED
        contact.refresh_from_db()
        assert contact.review_status == "clicked"

    def test_reminder_not_sent_after_click(self, _capture_sends):
        ws = _workspace()
        contact = _contact(ws)
        ReviewLink.objects.create(
            workspace=ws, contact=contact, short_code="xyz99999", original_url=GOOGLE_URL, clicked_at=timezone.now()
        )
        event = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REMINDER, scheduled_for=timezone.now()
        )
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "cancelled"
        assert not Message.objects.filter(workspace=ws, body__contains="quick follow-up").exists()

    def test_redirect_view_records_click(self):
        ws = _workspace()
        contact = _contact(ws)
        ReviewLink.objects.create(workspace=ws, contact=contact, short_code="redir123", original_url=GOOGLE_URL)
        resp = Client().get("/r/redir123/")
        assert resp.status_code == 302
        assert resp["Location"] == GOOGLE_URL
        assert ReviewLink.objects.get(short_code="redir123").clicked_at is not None

    def test_unknown_code_404s(self):
        assert Client().get("/r/nope0000/").status_code == 404


class TestOptOut:
    def test_stop_cancels_everything_and_blocks_restart(self):
        ws = _workspace()
        contact = _contact(ws)
        e1 = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.CHECK_IN, scheduled_for=timezone.now()
        )
        e2 = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REMINDER, scheduled_for=timezone.now()
        )
        cancelled = reviews.unsubscribe_contact(contact)
        assert cancelled == 2
        contact.refresh_from_db()
        assert contact.opted_out and contact.review_status == "unsubscribed"
        for e in (e1, e2):
            e.refresh_from_db()
            assert e.status == ReviewEvent.Status.CANCELLED
        assert reviews.start_pipeline(_booking(ws, contact)) is None

    def test_opted_out_event_cancels_whole_chain(self, _capture_sends):
        ws = _workspace()
        contact = _contact(ws, wa_id="27710000002")
        other = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REMINDER, scheduled_for=timezone.now()
        )
        contact.opted_out = True
        contact.save(update_fields=["opted_out"])
        event = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.CHECK_IN, scheduled_for=timezone.now()
        )
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "cancelled"
        other.refresh_from_db()
        assert other.status == ReviewEvent.Status.CANCELLED
        assert _capture_sends.call_count == 0


class TestIssueFlag:
    def test_issue_does_not_suppress_review_request(self, _capture_sends):
        ws = _workspace()
        contact = _contact(ws)
        reviews.flag_issue(contact, "The tap is still leaking")
        contact.refresh_from_db()
        assert contact.review_status == "issue_flagged"
        assert contact.needs_human
        event = ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REVIEW_REQUEST, scheduled_for=timezone.now()
        )
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "sent"
        assert Message.objects.filter(workspace=ws, body__contains="Google review?").exists()
        contact.refresh_from_db()
        assert contact.review_status == "issue_flagged"  # flag survives the send

    def test_resolve_returns_to_pipeline(self):
        ws = _workspace()
        contact = _contact(ws)
        reviews.flag_issue(contact, "bad")
        assert reviews.resolve_issue(contact) is True
        contact.refresh_from_db()
        assert contact.review_status == "check_in_sent"
        assert reviews.resolve_issue(contact) is False


class TestGates:
    def _event(self, ws, contact):
        return ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.CHECK_IN, scheduled_for=timezone.now()
        )

    def test_global_flag_off_holds(self, _capture_sends):
        ws = _workspace()
        event = self._event(ws, _contact(ws))
        with override_settings(REVIEW_AUTOMATION_ENABLED=False):
            assert reviews.send_event(event) == "held"
        event.refresh_from_db()
        assert event.status == ReviewEvent.Status.SCHEDULED
        assert _capture_sends.call_count == 0

    def test_workspace_switch_off_holds(self, _capture_sends):
        ws = _workspace()
        profile = ws.receptionist_profile
        profile.review_requests_enabled = False
        profile.save(update_fields=["review_requests_enabled"])
        event = self._event(ws, _contact(ws))
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "held"
        assert _capture_sends.call_count == 0

    def test_starter_plan_holds(self, _capture_sends):
        ws = _workspace(plan="starter")
        event = self._event(ws, _contact(ws))
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "held"
        assert _capture_sends.call_count == 0

    def test_no_channel_holds(self, _capture_sends):
        ws = _workspace()
        ZernioChannel.objects.filter(workspace=ws).delete()
        event = self._event(ws, _contact(ws))
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "held"
        assert _capture_sends.call_count == 0

    def test_missing_google_link_fails_clearly(self, _capture_sends):
        ws = _workspace()
        profile = ws.receptionist_profile
        profile.google_review_url = ""
        profile.save(update_fields=["google_review_url"])
        event = ReviewEvent.objects.create(
            workspace=ws, contact=_contact(ws), step=ReviewEvent.Step.REVIEW_REQUEST, scheduled_for=timezone.now()
        )
        with override_settings(REVIEW_AUTOMATION_ENABLED=True):
            assert reviews.send_event(event) == "failed"
        event.refresh_from_db()
        assert "Google review link" in event.error


class TestBookingBoardTrigger:
    def test_mark_done_starts_pipeline(self):
        ws = _workspace()
        contact = _contact(ws)
        booking = _booking(ws, contact)
        from django.contrib.auth import get_user_model

        owner = get_user_model().objects.create_user(
            email="owner@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        from apps.members.models import WorkspaceMembership

        WorkspaceMembership.objects.create(workspace=ws, user=owner)
        client = Client()
        client.force_login(owner)
        resp = client.post(f"/workspace/{ws.id}/receptionist/bookings/{booking.id}/done/")
        booking.refresh_from_db()
        assert resp.status_code == 302
        assert booking.status == Booking.Status.DONE
        assert ReviewEvent.objects.filter(booking=booking, step=ReviewEvent.Step.CHECK_IN).exists()


class TestWebhookOptOutAndFlag:
    def _payload(self, body, wa_id="27710000001"):
        return {
            "message": {
                "id": "m1",
                "direction": "inbound",
                "text": body,
                "account": {"accountId": "acc-test"},
                "sender": {"phoneNumber": wa_id, "name": "Sam"},
            },
            "conversation": {"id": "conv-1"},
        }

    def test_stop_via_webhook(self):
        ws = _workspace()
        contact = _contact(ws)
        ReviewEvent.objects.create(
            workspace=ws, contact=contact, step=ReviewEvent.Step.REMINDER, scheduled_for=timezone.now()
        )
        from apps.receptionist.webhooks import handle_inbox_message

        with mock.patch("apps.receptionist.webhooks.draft_reply") as draft:
            handle_inbox_message(self._payload("STOP"))
        contact.refresh_from_db()
        assert contact.opted_out
        assert not ReviewEvent.objects.filter(contact=contact, status=ReviewEvent.Status.SCHEDULED).exists()
        draft.assert_not_called()

    def test_negative_checkin_reply_flags_issue(self):
        ws = _workspace()
        contact = _contact(ws)
        contact.review_status = "check_in_sent"
        contact.save(update_fields=["review_status"])
        from apps.receptionist.webhooks import handle_inbox_message

        class _Draft:
            escalate = False
            body = "Sorry to hear that - the owner will call you."
            intake = None

        with (
            mock.patch("apps.receptionist.webhooks.draft_reply", return_value=_Draft()),
            mock.patch("apps.receptionist.sending.send_draft", return_value=True),
        ):
            handle_inbox_message(self._payload("Honestly not happy, there is still a problem"))
        contact.refresh_from_db()
        assert contact.review_status == "issue_flagged"
        assert contact.needs_human
