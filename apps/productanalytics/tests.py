"""Product analytics: middleware recording, bot skipping, dashboard access."""

from __future__ import annotations

import pytest
from django.test import Client

from apps.accounts.models import User
from apps.productanalytics.models import ProductEvent

pytestmark = pytest.mark.django_db


def test_page_view_recorded_with_no_ip_stored():
    resp = Client(HTTP_USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36").get("/")
    assert resp.status_code == 200
    ev = ProductEvent.objects.get(kind=ProductEvent.Kind.PAGE_VIEW)
    assert ev.path == "/"
    assert len(ev.visitor_hash) == 64


def test_bots_and_assets_skipped():
    assert Client(HTTP_USER_AGENT="WhatsApp/2.26.1.0 A").get("/").status_code == 200
    assert not ProductEvent.objects.exists()


def test_health_and_static_never_recorded():
    Client().get("/health/")
    Client().get("/r/anything/")
    assert not ProductEvent.objects.exists()


def test_dashboard_requires_staff():
    assert Client().get("/product-analytics/").status_code == 302
    user = User.objects.create_user(email="plain@example.com", password="x" * 20)
    c = Client()
    c.force_login(user)
    assert c.get("/product-analytics/").status_code == 302


def test_dashboard_shows_counts_for_staff():
    from django.utils import timezone

    staff = User.objects.create_user(
        email="staff@example.com", password="x" * 20, is_staff=True, tos_accepted_at=timezone.now()
    )
    c = Client(HTTP_USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
    c.get("/")
    c.force_login(staff)
    resp = c.get("/product-analytics/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "views today" in body
    assert "Product analytics" in body
