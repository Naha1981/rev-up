"""Regression tests for idea-board provisioning.

Two first-run defects shared one root cause: the starter Kanban columns were
only created lazily by the board render (_idea_columns).

1. An idea created before the board was ever opened (e.g. from the Publish
   sidebar) was saved with group=NULL and never appeared on the board -
   the user's first saved work looked lost.
2. The lazy creation also seeded an "introductory" idea into every new
   workspace - unlabelled sample content in a customer's own workspace.
"""

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.composer.models import Idea, IdeaGroup
from apps.composer.views import _idea_columns
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace


class IdeaBoardProvisioningTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="testpass123",
            tos_accepted_at=timezone.now(),
        )
        self.org = Organization.objects.create(name="Test Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="Test Workspace")
        OrgMembership.objects.create(user=self.user, organization=self.org, org_role=OrgMembership.OrgRole.OWNER)
        WorkspaceMembership.objects.create(
            user=self.user, workspace=self.workspace, workspace_role=WorkspaceMembership.WorkspaceRole.OWNER
        )
        self.client = Client()
        self.client.force_login(self.user)

    def _create_idea_via_http(self):
        url = reverse("composer:idea_create", kwargs={"workspace_id": self.workspace.id})
        return self.client.post(url, {"title": "First idea", "description": "", "tags": ""})

    def test_idea_created_before_first_board_visit_lands_in_a_column(self):
        # No IdeaGroup rows exist yet - the board was never opened.
        self.assertEqual(IdeaGroup.objects.for_workspace(self.workspace.id).count(), 0)
        resp = self._create_idea_via_http()
        self.assertIn(resp.status_code, (200, 204))
        idea = Idea.objects.for_workspace(self.workspace.id).get(title="First idea")
        self.assertIsNotNone(idea.group_id)
        self.assertEqual(idea.group.name, "Unassigned")

    def test_new_workspace_board_has_no_seeded_idea(self):
        columns, _ = _idea_columns(self.workspace)
        self.assertEqual(sum(len(c["ideas"]) for c in columns), 0)
        self.assertEqual(Idea.objects.for_workspace(self.workspace.id).count(), 0)

    def test_orphaned_idea_surfaces_in_unassigned(self):
        # Pre-fix data: an idea saved with no group must still render.
        _idea_columns(self.workspace)  # create the columns
        orphan = Idea.objects.create(
            workspace=self.workspace,
            author=self.user,
            title="Orphan",
            group=None,
            status=Idea.Status.UNASSIGNED,
        )
        columns, _ = _idea_columns(self.workspace)
        unassigned = next(c for c in columns if c["label"] == "Unassigned")
        self.assertIn(orphan.id, [i.id for i in unassigned["ideas"]])
