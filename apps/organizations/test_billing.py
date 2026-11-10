"""Trial state, billing page, plan selection, and trial lock."""

from datetime import timedelta

from django.test import TestCase, override_settings
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
    WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role="owner")
    from apps.members.models import OrgMembership

    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    return org, ws, user


class TrialStateTests(TestCase):
    def test_signup_org_is_locked_until_payment(self):
        """New signups get no free trial: paid SaaS from day one."""
        from django.contrib.auth import get_user_model

        from apps.accounts.signals import provision_organization_and_workspace

        user = get_user_model().objects.create_user(
            email="fresh-signup@example.com", password="x" * 20, tos_accepted_at=timezone.now()
        )
        provision_organization_and_workspace(user)
        org = Organization.objects.get(memberships__user=user)
        self.assertEqual(org.subscription_status, "expired")
        status, _day, days_left = org.trial_state()
        self.assertEqual(status, "expired")
        self.assertEqual(days_left, 0)

    def test_explicit_expired_org_is_locked_immediately(self):
        org = Organization.objects.create(name="Locked Org", subscription_status="expired")
        status, _day, _left = org.trial_state()
        self.assertEqual(status, "expired")

    def test_new_org_needs_payment_with_reference(self):
        org = Organization.objects.create(name="Fresh Org")
        self.assertEqual(org.subscription_status, "pending_activation")
        self.assertIsNone(org.trial_started_at)
        self.assertTrue(org.payment_reference.startswith("RU-"))
        status, day, days_left = org.trial_state()
        self.assertEqual((status, day, days_left), ("pending_activation", 0, 0))

    def test_legacy_trial_never_grants_free_access(self):
        org = Organization.objects.create(name="Old Trial Org", subscription_status="trial")
        org.trial_started_at = timezone.now() - timedelta(days=7)
        status, _day, days_left = org.trial_state()
        self.assertEqual(status, "pending_activation")
        self.assertEqual(days_left, 0)

    def test_active_org_never_expires(self):
        org = Organization.objects.create(name="Paid Org", subscription_status="active")
        org.trial_started_at = timezone.now() - timedelta(days=90)
        status, _day, _left = org.trial_state()
        self.assertEqual(status, "active")


class WeekOneEntitlementTests(TestCase):
    """Product rule (5 Nov 2026): week one of a paid subscription unlocks every
    feature on any plan; after that the org keeps its own plan's allowances."""

    def test_week_one_unlocks_all_allowances_on_starter(self):
        org = Organization.objects.create(name="New Paid", subscription_status="active")
        self.assertEqual(org.plan, "starter")
        self.assertIsNotNone(org.activated_at)
        self.assertEqual(org.monthly_reply_allowance(), 2500)
        self.assertEqual(org.channel_allowance(), 3)

    def test_after_week_one_plan_allowances_apply(self):
        org = Organization.objects.create(name="Old Paid", subscription_status="active")
        Organization.objects.filter(id=org.id).update(activated_at=timezone.now() - timedelta(days=8))
        org.refresh_from_db()
        self.assertEqual(org.monthly_reply_allowance(), 500)
        self.assertEqual(org.channel_allowance(), 1)

    def test_unpaid_org_gets_no_week_one_unlock(self):
        org = Organization.objects.create(name="Unpaid", subscription_status="expired")
        self.assertFalse(org._in_week_one())
        self.assertEqual(org.monthly_reply_allowance(), 500)


class BillingPageTests(TestCase):
    @override_settings(REVUP_BILLING_WHATSAPP="27000000001")
    def test_page_shows_plans_reference_and_payment_needed(self):
        org, ws, user = _setup()
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/billing/")
        self.assertContains(resp, "R499")
        self.assertContains(resp, "R999")
        self.assertContains(resp, "R1,999")
        self.assertContains(resp, org.payment_reference)
        self.assertContains(resp, "Payment needed")
        self.assertContains(resp, "wa.me/27000000001")
        self.assertContains(resp, "auto-posting")

    def test_choose_plan(self):
        org, ws, user = _setup()
        self.client.force_login(user)
        resp = self.client.post(f"/workspaces/{ws.id}/billing/", {"plan": "growth"})
        self.assertEqual(resp.status_code, 302)
        org.refresh_from_db()
        self.assertEqual(org.plan, "starter")
        self.assertEqual(self.client.session[f"billing_plan_{ws.id}"], "growth")

    def test_paid_starter_cannot_upgrade_without_payment(self):
        org, ws, user = _setup(email="paid-plan-regression@example.com")
        org.subscription_status = "active"
        org.save(update_fields=["subscription_status"])
        self.client.force_login(user)
        response = self.client.post(f"/workspaces/{ws.id}/billing/", {"plan": "business-pro"})
        self.assertEqual(response.status_code, 302)
        org.refresh_from_db()
        self.assertEqual(org.plan, "starter")
        self.assertEqual(org.subscription_status, "active")

    def test_unknown_stored_plan_has_safe_billing_fallback(self):
        org, ws, user = _setup(email="bad-plan-regression@example.com")
        Organization.objects.filter(pk=org.pk).update(plan="unknown-old-plan")
        self.client.force_login(user)
        self.assertEqual(self.client.get(f"/workspaces/{ws.id}/billing/").status_code, 200)

    def test_viewer_member_cannot_choose_plan(self):
        org, ws, user = _setup(email="viewer-owner@example.com")
        viewer_email = "viewer@example.com"
        from django.contrib.auth import get_user_model

        viewer = get_user_model().objects.create_user(
            email=viewer_email, password="x" * 20, tos_accepted_at=timezone.now()
        )
        WorkspaceMembership.objects.create(user=viewer, workspace=ws, workspace_role="viewer")
        self.client.force_login(viewer)
        resp = self.client.post(f"/workspaces/{ws.id}/billing/", {"plan": "business-pro"})
        self.assertEqual(resp.status_code, 404)
        org.refresh_from_db()
        self.assertEqual(org.plan, "starter")

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


class NoFreeCopyTests(TestCase):
    """The owner removed every free offer: pricing copy must not regress."""

    def test_landing_and_signup_and_billing_have_no_free_offers(self):
        import pathlib

        root = pathlib.Path(__file__).resolve().parents[2]
        for rel in [
            "templates/landing.html",
            "templates/account/signup.html",
            "templates/workspaces/billing.html",
            "templates/legal/terms.html",
        ]:
            text = (root / rel).read_text().lower()
            for banned in ["free trial", "first week free", "free for 7 days", "start free", "no card"]:
                self.assertNotIn(banned, text, f"{rel} still offers: {banned}")

    def test_billing_page_renders_no_free_wording(self):
        org, ws, user = _setup()
        org.subscription_status = "expired"
        org.save(update_fields=["subscription_status"])
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/billing/")
        self.assertNotContains(resp, "free trial", status_code=200)
        self.assertNotContains(resp, "Free trial")


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
        self.assertContains(resp, "Payment needed")

    def test_active_org_not_locked(self):
        org, ws, user = _setup()
        org.subscription_status = "active"
        org.save(update_fields=["subscription_status"])
        self.client.force_login(user)
        resp = self.client.get(f"/workspaces/{ws.id}/settings/")
        self.assertNotEqual(resp.status_code, 302)
