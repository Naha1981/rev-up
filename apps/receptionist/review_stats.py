"""Owner-facing review numbers: what the review pipeline did for one business.

Everything on the Reviews screen comes from here. Counts are bucketed by
calendar month in the app's own timezone (Africa/Johannesburg), so "This
month" means the same thing to the owner and to the screen.

One honesty rule, from Google's side: Google never tells a business when a
customer actually posts a review. The closest true measure is the customer
opening the business's review link, and that is what "opened your review
link" counts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from django.utils import timezone

from .models import Contact, ReviewEvent, ReviewLink

MONTHS_SHOWN = 6

ACTIVITY_WHAT: dict[str, str] = {
    ReviewEvent.Step.CHECK_IN: "was checked in with",
    ReviewEvent.Step.REVIEW_REQUEST: "was asked for a review",
    ReviewEvent.Step.REMINDER: "was sent a reminder",
}


@dataclass
class MonthBucket:
    """One calendar month of review activity, in plain counts."""

    year: int
    month: int
    checkins: int = 0
    asked: int = 0
    reminders: int = 0
    clicks: int = 0
    optouts: int = 0
    current: bool = field(default=False)

    @property
    def label(self) -> str:
        return datetime(self.year, self.month, 1).strftime("%b %Y")


def _month_starts(months: int) -> list[tuple[int, int]]:
    """(year, month) pairs for the current and previous months, newest last."""
    now = timezone.localtime(timezone.now())
    year, month = now.year, now.month
    pairs = []
    for _ in range(months):
        pairs.append((year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    pairs.reverse()
    return pairs


def monthly_stats(workspace, months: int = MONTHS_SHOWN) -> list[MonthBucket]:
    """Month-by-month review activity for one business, oldest to newest."""
    pairs = _month_starts(months)
    first_year, first_month = pairs[0]
    start = timezone.make_aware(datetime(first_year, first_month, 1))

    buckets: dict[tuple[int, int], MonthBucket] = {(y, m): MonthBucket(year=y, month=m) for y, m in pairs}
    buckets[pairs[-1]].current = True

    def bucket_of(dt) -> MonthBucket | None:
        local = timezone.localtime(dt)
        return buckets.get((local.year, local.month))

    sent_events = ReviewEvent.objects.filter(
        workspace=workspace,
        status=ReviewEvent.Status.SENT,
        sent_at__gte=start,
    ).values_list("step", "sent_at")
    for step, sent_at in sent_events:
        bucket = bucket_of(sent_at)
        if bucket is None:
            continue
        if step == ReviewEvent.Step.CHECK_IN:
            bucket.checkins += 1
        elif step == ReviewEvent.Step.REVIEW_REQUEST:
            bucket.asked += 1
        else:
            bucket.reminders += 1

    clicked = ReviewLink.objects.filter(workspace=workspace, clicked_at__gte=start).values_list("clicked_at", flat=True)
    for clicked_at in clicked:
        bucket = bucket_of(clicked_at)
        if bucket is not None:
            bucket.clicks += 1

    optouts = Contact.objects.filter(workspace=workspace, opted_out=True, opted_out_at__gte=start).values_list(
        "opted_out_at", flat=True
    )
    for opted_out_at in optouts:
        bucket = bucket_of(opted_out_at)
        if bucket is not None:
            bucket.optouts += 1

    return list(buckets.values())


def totals(workspace) -> dict[str, int]:
    """All-time counts, including anything older than the monthly window."""
    sent = ReviewEvent.objects.filter(workspace=workspace, status=ReviewEvent.Status.SENT)
    return {
        "checkins": sent.filter(step=ReviewEvent.Step.CHECK_IN).count(),
        "asked": sent.filter(step=ReviewEvent.Step.REVIEW_REQUEST).count(),
        "reminders": sent.filter(step=ReviewEvent.Step.REMINDER).count(),
        "clicks": ReviewLink.objects.filter(workspace=workspace, clicked_at__isnull=False).count(),
        "optouts": Contact.objects.filter(workspace=workspace, opted_out=True).count(),
    }


def recent_activity(workspace, limit: int = 10) -> list[dict]:
    """The latest things that happened, newest first, for the activity list."""
    rows: list[dict] = []

    sent = (
        ReviewEvent.objects.filter(workspace=workspace, status=ReviewEvent.Status.SENT)
        .select_related("contact")
        .order_by("-sent_at")[:limit]
    )
    for event in sent:
        rows.append(
            {
                "when": event.sent_at,
                "who": event.contact.name or event.contact.wa_id,
                "what": ACTIVITY_WHAT[event.step],
            }
        )

    clicks = (
        ReviewLink.objects.filter(workspace=workspace, clicked_at__isnull=False)
        .select_related("contact")
        .order_by("-clicked_at")[:limit]
    )
    for link in clicks:
        rows.append(
            {
                "when": link.clicked_at,
                "who": link.contact.name or link.contact.wa_id,
                "what": "opened your Google review link",
            }
        )

    optouts = Contact.objects.filter(workspace=workspace, opted_out=True, opted_out_at__isnull=False).order_by(
        "-opted_out_at"
    )[:limit]
    for contact in optouts:
        rows.append(
            {"when": contact.opted_out_at, "who": contact.name or contact.wa_id, "what": "asked to stop messages"}
        )

    rows.sort(key=lambda row: row["when"], reverse=True)
    return rows[:limit]
