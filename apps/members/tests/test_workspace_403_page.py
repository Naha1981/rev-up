"""Regression test: cross-workspace access renders the branded 403 page.

The workspace middleware raises PermissionDenied for non-members; Django
served its bare default 403 page in production. templates/403.html replaces
it with a branded page that routes the user back to their own workspace.
"""

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace


def _make_user_with_workspace(email, org_name, ws_name):
    user = User.objects.create_user(email=email, password="testpass123", tos_accepted_at=timezone.now())
    org = Organization.objects.create(name=org_name)
    ws = Workspace.objects.create(organization=org, name=ws_name)
    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role=WorkspaceMembership.WorkspaceRole.OWNER)
    return user, ws


class Workspace403PageTests(TestCase):
    def setUp(self):
        self.owner, self.owner_ws = _make_user_with_workspace("owner@example.com", "Org A", "WS A")
        self.outsider, _ = _make_user_with_workspace("outsider@example.com", "Org B", "WS B")
        self.client = Client()
        self.client.force_login(self.outsider)

    def test_foreign_workspace_url_renders_branded_403(self):
        url = reverse("calendar:calendar", args=[self.owner_ws.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)
        content = response.content.decode()
        self.assertIn("You don't have access to this workspace", content)
        self.assertIn('href="/"', content)
