"""Locked (expired / pending-activation) orgs must still reach card checkout.

Regression test for the Claude audit P0 (8 Nov 2026): TrialLockMiddleware
redirected every non-billing path of a locked org, including the PayFast
checkout POST, so a locked org could never pay its way out of the lock.
"""

from __future__ import annotations

import uuid

import pytest
from django.test import Client
from django.utils import timezone

from apps.accounts.models import User
from apps.members.models import OrgMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace


@pytest.fixture
def merchant(settings):
    settings.PAYFAST_MERCHANT_ID = "10000100"
    settings.PAYFAST_MERCHANT_KEY = "46f0cd694581a"
    settings.PAYFAST_PASSPHRASE = "testpass"
    settings.PAYFAST_SANDBOX = True
    return settings


def _signup_user():
    # A real signup: the post-save signal provisions an org (expired until
    # first confirmed payment) plus a default workspace.
    return User.objects.create_user(
        email=f"locked-{uuid.uuid4().hex[:12]}@example.com",
        password="x" * 20,
        tos_accepted_at=timezone.now(),
    )


def test_locked_org_can_post_card_checkout(merchant, db):
    user = _signup_user()
    org = OrgMembership.objects.get(user=user).organization
    ws = Workspace.objects.filter(organization=org).first()
    assert ws is not None
    org = ws.organization
    assert org.subscription_status == Organization.SubscriptionStatus.EXPIRED

    c = Client()
    c.force_login(user)
    resp = c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "starter"})
    assert resp.status_code == 200
    assert "sandbox.payfast.co.za/eng/process" in resp.content.decode()


def test_locked_org_still_redirected_off_other_pages(merchant, db):
    user = _signup_user()
    org = OrgMembership.objects.get(user=user).organization
    ws = Workspace.objects.filter(organization=org).first()
    org = ws.organization
    assert org.subscription_status == Organization.SubscriptionStatus.EXPIRED

    c = Client()
    c.force_login(user)
    resp = c.get(f"/workspaces/{ws.id}/settings/")
    assert resp.status_code == 302
    assert resp["Location"].endswith("/billing/")


def test_pending_activation_org_is_locked_but_can_pay(merchant, db):
    user = _signup_user()
    org = OrgMembership.objects.get(user=user).organization
    ws = Workspace.objects.filter(organization=org).first()
    org = ws.organization
    org.subscription_status = Organization.SubscriptionStatus.PENDING_ACTIVATION
    org.save(update_fields=["subscription_status"])

    c = Client()
    c.force_login(user)
    # Other pages lock...
    assert c.get(f"/workspaces/{ws.id}/settings/").status_code == 302
    # ...but card checkout stays reachable.
    resp = c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "growth"})
    assert resp.status_code == 200
    assert "999.00" in resp.content.decode()
