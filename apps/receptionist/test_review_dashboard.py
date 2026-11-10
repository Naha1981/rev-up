"""Owner-facing review numbers: aggregation, bucketing, the screen itself."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from apps.members.models import WorkspaceMembership
from apps.organizations.models import Organization
from apps.receptionist import review_stats, reviews
from apps.receptionist.models import (
    BusinessProfile,
    Contact,
    ReviewEvent,
    ReviewLink,
    ZernioChannel,
)
from apps.workspaces.models import Workspace

pytestmark = pytest.mark.django_db

User = get_user_model()


def _workspace(plan="growth", reviews_on=True):
    org = Organization.objects.create(subscription_status="active", name="Test Org", plan=plan)
    ws = Workspace.objects.create(name="Thandi's Workspace", organization=org)
    BusinessProfile.objects.create(
        workspace=ws,
        business_name="Thandi's Salon",
        google_review_url="https://g.page/r/example",
        review_requests_enabled=reviews_on,
    )
    ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc-test")
    return ws


def _contact(ws, name="Sam", wa_id="27710000001"):
    return Contact.objects.create(workspace=ws, wa_id=wa_id, name=name, zernio_conversation_id="conv-1")


def _sent(ws, contact, step, when):
    event = ReviewEvent.objects.create(
        workspace=ws, contact=contact, step=step, scheduled_for=when, status=ReviewEvent.Status.SENT
    )
    ReviewEvent.objects.filter(id=event.id).update(sent_at=when)
    return event


def _months_ago(n, day=15):
    now = timezone.localtime(timezone.now())
    year, month = now.year, now.month
    for _ in range(n):
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    day = min(day, 28)
    return timezone.make_aware(timezone.datetime(year, month, day, 12, 0))


class TestMonthlyStats:
    def test_events_clicks_optouts_land_in_their_months(self):
        ws = _workspace()
        c = _contact(ws)
        _sent(ws, c, ReviewEvent.Step.CHECK_IN, _months_ago(1))
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, _months_ago(1))
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, timezone.now())
        link = ReviewLink.objects.create(
            workspace=ws, contact=c, short_code="stats001", original_url="https://g.page/r/example"
        )
        ReviewLink.objects.filter(id=link.id).update(clicked_at=_months_ago(1))
        c.opted_out = True
        c.opted_out_at = timezone.now()
        c.save()

        months = review_stats.monthly_stats(ws)
        last = months[-1]
        prev = months[-2]
        assert prev.checkins == 1 and prev.asked == 1 and prev.clicks == 1
        assert prev.reminders == 0 and prev.optouts == 0
        assert last.asked == 1 and last.optouts == 1 and last.current is True
        assert len(months) == 6

    def test_scheduled_and_failed_events_never_count(self):
        ws = _workspace()
        c = _contact(ws)
        ReviewEvent.objects.create(
            workspace=ws, contact=c, step=ReviewEvent.Step.CHECK_IN, scheduled_for=timezone.now()
        )
        ReviewEvent.objects.create(
            workspace=ws,
            contact=c,
            step=ReviewEvent.Step.REVIEW_REQUEST,
            scheduled_for=timezone.now(),
            status=ReviewEvent.Status.FAILED,
        )
        months = review_stats.monthly_stats(ws)
        assert all(m.checkins == 0 and m.asked == 0 for m in months)

    def test_totals_cover_history_beyond_the_window(self):
        ws = _workspace()
        c = _contact(ws)
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, _months_ago(9))
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, timezone.now())
        totals = review_stats.totals(ws)
        assert totals["asked"] == 2
        assert sum(m.asked for m in review_stats.monthly_stats(ws)) == 1

    def test_recent_activity_newest_first_and_capped(self):
        ws = _workspace()
        c = _contact(ws, name="Pat")
        older = _months_ago(0, day=1)
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, older)
        link = ReviewLink.objects.create(
            workspace=ws, contact=c, short_code="stats002", original_url="https://g.page/r/example"
        )
        ReviewLink.objects.filter(id=link.id).update(clicked_at=timezone.now())
        activity = review_stats.recent_activity(ws)
        assert activity[0]["what"] == "opened your Google review link"
        assert activity[0]["who"] == "Pat"
        assert activity[1]["what"] == "was asked for a review"
        assert len(activity) == 2

    def test_stop_records_the_opt_out_time(self):
        ws = _workspace()
        c = _contact(ws)
        reviews.unsubscribe_contact(c)
        c.refresh_from_db()
        assert c.opted_out and c.opted_out_at is not None
        months = review_stats.monthly_stats(ws)
        assert months[-1].optouts == 1


class TestReviewDashboardView:
    def _login(self, ws, member=True):
        user = User.objects.create_user(email="owner@example.com", password="pw-12345", tos_accepted_at=timezone.now())
        if member:
            WorkspaceMembership.objects.create(user=user, workspace=ws)
        client = Client()
        client.force_login(user)
        return client

    def test_member_sees_the_numbers(self):
        ws = _workspace()
        c = _contact(ws)
        _sent(ws, c, ReviewEvent.Step.REVIEW_REQUEST, timezone.now())
        resp = self._login(ws).get(f"/workspace/{ws.id}/receptionist/reviews/")
        assert resp.status_code == 200
        body = resp.content.decode()
        assert "customers asked for a review" in body
        assert "opened your review link" in body
        assert "Google keeps the final step private" in body
        assert "Thandi&#x27;s Salon" in body
        assert "This month" in body and "All time" in body

    def test_reviews_off_shows_the_off_state(self):
        ws = _workspace(reviews_on=False)
        resp = self._login(ws).get(f"/workspace/{ws.id}/receptionist/reviews/")
        assert resp.status_code == 200
        assert "Review requests are off" in resp.content.decode()

    def test_no_profile_shows_the_off_state(self):
        org = Organization.objects.create(subscription_status="active", name="Org2", plan="growth")
        ws = Workspace.objects.create(name="Bare", organization=org)
        resp = self._login(ws).get(f"/workspace/{ws.id}/receptionist/reviews/")
        assert resp.status_code == 200
        assert "Review requests are off" in resp.content.decode()

    def test_non_member_is_refused(self):
        ws = _workspace()
        resp = self._login(ws, member=False).get(f"/workspace/{ws.id}/receptionist/reviews/")
        assert resp.status_code == 403

    def test_anonymous_is_sent_to_login(self):
        ws = _workspace()
        resp = Client().get(f"/workspace/{ws.id}/receptionist/reviews/")
        assert resp.status_code == 302 and "/accounts/login" in resp.url

    def test_inbox_links_to_reviews(self):
        ws = _workspace()
        resp = self._login(ws).get(f"/workspace/{ws.id}/receptionist/")
        assert f"/workspace/{ws.id}/receptionist/reviews/" in resp.content.decode()
