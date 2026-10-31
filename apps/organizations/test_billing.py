"""Trial state, billing page, plan selection, and trial lock."""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.members.models import WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace


def _setup(email="owner@example.com", staff=False):
    from django.contrib.auth import get_user_model

    org = Organization.objects.create(name="Billing Org")
    ws = Workspace.objects.create(organization=org, name="billing ws")
    user = get_user_model().objects.create_user(
        email=email, password="x" * 20, tos_accepted_at=timezone.now(), is_staff=staff
    )
    WorkspaceMembership.objects.create(user=user, workspace=ws)
    from apps.members.models import OrgMembership

    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    return org, ws, user


class TrialStateTests(TestCase):
    def test_new_org_is_on_trial_day_one_with_reference(self):
        org = Organization.objects.create(name="Fresh Org")
        self.assertEqual(org.subscription_status, "trial")
        self.assertIsNotNone(org.trial_started_at)
        self.assertTrue(org.payment_reference.startswith("RU-"))
        status, day, days_left = org.trial_state()
        self.assertEqual((status, day, days_left), ("trial", 1, 7))

    def test_trial_expires_after_seven_days(self):
        org = Organization.objects.create(name="Old Trial Org")
        org.trial_started_at = timezone.now() - timedelta(days=7)
        status, _day, days_left = org.trial_state()
        self.assertEqual(status, "expired")
        self.assertEqual(days_left, 0)

    def test_active_org_never_expires(self):
        org = Organization.objects.create(name="Paid Org", subscription_status="active")
        org.trial_started_at = timezone.now() - timedelta(days=90)
        status, _day, _left = org.trial_state()
        self.assertEqual(status, "active")


class BillingPageTests(TestCase):
    def test_page_shows_plans_reference_and_trial(self):
        org, ws, user = _setup()
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/billing/")
        self.assertContains(resp, "R499")
        self.assertContains(resp, "R999")
        self.assertContains(resp, "R1,999")
        self.assertContains(resp, org.payment_reference)
        self.assertContains(resp, "day 1 of 7")
        self.assertContains(resp, "wa.me/27612980377")
        self.assertContains(resp, "auto-posting")

    def test_choose_plan(self):
        org, ws, user = _setup()
        self.client.force_login(user)
        resp = self.client.post(f"/workspaces/{ws.id}/billing/", {"plan": "growth"})
        self.assertEqual(resp.status_code, 302)
        org.refresh_from_db()
        self.assertEqual(org.plan, "growth")

    def test_choose_rejects_unknown_plan(self):
        org, ws, user = _setup()
        self.client.force_login(user)
        self.client.post(f"/workspaces/{ws.id}/billing/", {"plan": "free-forever"})
        org.refresh_from_db()
        self.assertEqual(org.plan, "starter")

    def test_non_member_rejected(self):
        from django.contrib.auth import get_user_model

        org, ws, _user = _setup()
        outsider = get_user_model().objects.create_user(
            email="out@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        self.client.force_login(outsider)
        resp = self.client.get(f"/workspaces/{ws.id}/billing/")
        self.assertIn(resp.status_code, (403, 404))


class TrialLockTests(TestCase):
    def _expire(self, org):
        org.trial_started_at = timezone.now() - timedelta(days=8)
        org.save(update_fields=["trial_started_at"])

    def test_expired_member_redirected_to_billing(self):
        org, ws, user = _setup()
        self._expire(org)
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/settings/")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("/billing/", resp["Location"])

    def test_expired_member_can_still_open_billing(self):
        org, ws, user = _setup()
        self._expire(org)
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/billing/")
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "trial has ended")

    def test_active_org_not_locked(self):
        org, ws, user = _setup()
        org.subscription_status = "active"
        org.save(update_fields=["subscription_status"])
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/settings/")
        self.assertNotEqual(resp.status_code, 302)
