"""First-party product analytics: page views and key actions.

No third-party tracker, no cookies beyond the session, no IP storage: a
daily-rotating hash stands in for a visitor, and referrers are reduced to
their domain. This is the launch-checklist analytics item - a test visit
must show live in the dashboard with signups and key actions tracked.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class ProductEvent(models.Model):
    class Kind(models.TextChoices):
        PAGE_VIEW = "page_view", "Page view"
        SIGNUP = "signup", "Signup"
        LOGIN = "login", "Login"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    path = models.CharField(max_length=300, blank=True, default="")
    visitor_hash = models.CharField(max_length=64, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    referrer_domain = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        db_table = "productanalytics_productevent"
        indexes = [models.Index(fields=["kind", "created_at"])]

    def __str__(self):
        return f"{self.kind} {self.path} @ {self.created_at:%Y-%m-%d %H:%M}"
