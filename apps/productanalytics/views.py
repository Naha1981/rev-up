"""Owner-only analytics dashboard: visits, uniques, signups, top pages."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from .models import ProductEvent


@staff_member_required
def dashboard(request):
    now = timezone.now()
    since = now - timedelta(days=30)
    events = ProductEvent.objects.filter(created_at__gte=since)

    def counts(days):
        qs = events.filter(created_at__gte=now - timedelta(days=days))
        return {
            "views": qs.filter(kind=ProductEvent.Kind.PAGE_VIEW).count(),
            "uniques": qs.filter(kind=ProductEvent.Kind.PAGE_VIEW).values("visitor_hash").distinct().count(),
            "signups": qs.filter(kind=ProductEvent.Kind.SIGNUP).count(),
            "logins": qs.filter(kind=ProductEvent.Kind.LOGIN).count(),
        }

    top_pages = (
        events.filter(kind=ProductEvent.Kind.PAGE_VIEW)
        .values("path")
        .annotate(n=Count("id"))
        .order_by("-n")[:10]
    )
    daily = (
        events.filter(kind=ProductEvent.Kind.PAGE_VIEW)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(n=Count("id"), uniques=Count("visitor_hash", distinct=True))
        .order_by("-day")[:14]
    )
    return render(
        request,
        "productanalytics/dashboard.html",
        {"today": counts(1), "week": counts(7), "month": counts(30), "top_pages": top_pages, "daily": daily},
    )
