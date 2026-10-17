"""Regression tests for scheduling a titleless post to a title-required platform.

DEV.to refuses articles without a title at publish time, so a titleless post
committed to a connected DEV.to account could only fail later, after the user
walked away. The composer now rejects the save up front with a title error,
matching the Pinterest-board and required-media guards.
"""

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace


class RequiredTitleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="testpass123",
            tos_accepted_at=timezone.now(),
        )
        self.org = Organization.objects.create(name="Org")
        self.ws = Workspace.objects.create(organization=self.org, name="WS")
        OrgMembership.objects.create(
            user=self.user, organization=self.org, org_role=OrgMembership.OrgRole.OWNER
        )
        WorkspaceMembership.objects.create(
            user=self.user, workspace=self.ws, workspace_role=WorkspaceMembership.WorkspaceRole.OWNER
        )
        self.devto = SocialAccount.objects.create(
            workspace=self.ws,
            platform="devto",
            account_platform_id="dv-1",
            account_name="Dev.to Acct",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.client = Client()
        self.client.force_login(self.user)
        self.save_url = reverse("composer:save_post", kwargs={"workspace_id": self.ws.id})

    def _schedule(self, **overrides):
        data = {
            "action": "schedule",
            "title": "",
            "caption": "body",
            "tags": "",
            "selected_accounts": str(self.devto.id),
            "scheduled_date": "2027-09-01",
            "scheduled_time": "09:00",
        }
        data.update(overrides)
        return self.client.post(self.save_url, data=data)

    def test_schedule_without_title_rejected(self):
        resp = self._schedule()
        self.assertEqual(resp.status_code, 400)
        self.assertIn("title", resp.json()["errors"])

    def test_schedule_with_title_passes_title_validation(self):
        resp = self._schedule(title="A real title")
        # Any failure here must not be the title guard.
        if resp.status_code == 400:
            self.assertNotIn("title", resp.json()["errors"])

    def test_override_title_satisfies_requirement(self):
        resp = self._schedule(**{f"override_title_{self.devto.id}": "Per-platform title"})
        if resp.status_code == 400:
            self.assertNotIn("title", resp.json()["errors"])

    def test_save_draft_without_title_allowed(self):
        resp = self._schedule(action="save_draft", scheduled_date="", scheduled_time="")
        self.assertIn(resp.status_code, (200, 204, 302))

    def test_other_platforms_unaffected(self):
        linkedin = SocialAccount.objects.create(
            workspace=self.ws,
            platform="linkedin_personal",
            account_platform_id="li-1",
            account_name="LinkedIn Acct",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        resp = self._schedule(selected_accounts=str(linkedin.id))
        if resp.status_code == 400:
            self.assertNotIn("title", resp.json()["errors"])
