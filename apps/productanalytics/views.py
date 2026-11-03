"""Owner-only analytics dashboard: visits, uniques, signups, top pages."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Max, Min
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from .models import ProductEvent
from .outreach import OUTREACH_BUSINESSES


@staff_member_required
def dashboard(request):
    now = timezone.now()
    today = timezone.localdate(now)
    since = now - timedelta(days=30)
    events = ProductEvent.objects.filter(created_at__gte=since)

    def counts(days):
        # Calendar days in the server's timezone, so "today" matches the
        # per-day table below (a rolling 24h window does not).
        start = today - timedelta(days=days - 1)
        qs = events.filter(created_at__date__gte=start)
        return {
            "views": qs.filter(kind=ProductEvent.Kind.PAGE_VIEW).count(),
            "uniques": qs.filter(kind=ProductEvent.Kind.PAGE_VIEW).values("visitor_hash").distinct().count(),
            "signups": qs.filter(kind=ProductEvent.Kind.SIGNUP).count(),
            "logins": qs.filter(kind=ProductEvent.Kind.LOGIN).count(),
        }

    top_pages = (
        events.filter(kind=ProductEvent.Kind.PAGE_VIEW).values("path").annotate(n=Count("id")).order_by("-n")[:10]
    )
    daily = (
        events.filter(kind=ProductEvent.Kind.PAGE_VIEW)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(n=Count("id"), uniques=Count("visitor_hash", distinct=True))
        .order_by("-day")[:14]
    )
    # Outreach tracked links: every known business appears, even with zero
    # clicks, so silence is visible. Plus one row for plain-URL visits.
    click_rows = {
        row["business_code"]: row
        for row in events.filter(kind=ProductEvent.Kind.PAGE_VIEW)
        .exclude(business_code="")
        .values("business_code")
        .annotate(
            clicks=Count("id"),
            uniques=Count("visitor_hash", distinct=True),
            last=Max("created_at"),
            first=Min("created_at"),
        )
    }
    outreach = [
        {
            "code": code,
            "name": info["name"],
            "sent": info["sent"],
            "clicks": click_rows.get(code, {}).get("clicks", 0),
            "uniques": click_rows.get(code, {}).get("uniques", 0),
            "first": click_rows.get(code, {}).get("first"),
            "last": click_rows.get(code, {}).get("last"),
        }
        for code, info in OUTREACH_BUSINESSES.items()
    ]
    unattributed = events.filter(kind=ProductEvent.Kind.PAGE_VIEW, business_code="", path="/").aggregate(
        clicks=Count("id"), uniques=Count("visitor_hash", distinct=True), last=Max("created_at")
    )
    return render(
        request,
        "productanalytics/dashboard.html",
        {
            "today": counts(1),
            "week": counts(7),
            "month": counts(30),
            "top_pages": top_pages,
            "daily": daily,
            "outreach": outreach,
            "unattributed": unattributed,
        },
    )
