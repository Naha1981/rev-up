"""Content-agent disposition honors ``publishing.generated_post_mode``.

The hand-off from generation to the publish lane is the workspace's
choice: approval (default), draft, or auto (scheduled an hour apart,
degrading to approval when the approval workflow blocks scheduling).
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.composer.models import PlatformPost, Post
from apps.content_agent.models import AgentConfig
from apps.content_agent.services import Draft, queue_drafts_for_review
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.settings_manager.models import WorkspaceSetting
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace


class GeneratedPostModeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com", password="testpass123", tos_accepted_at=timezone.now()
        )
        self.org = Organization.objects.create(name="Org")
        self.ws = Workspace.objects.create(organization=self.org, name="WS")
        OrgMembership.objects.create(user=self.user, organization=self.org, org_role=OrgMembership.OrgRole.OWNER)
        WorkspaceMembership.objects.create(
            user=self.user, workspace=self.ws, workspace_role=WorkspaceMembership.WorkspaceRole.OWNER
        )
        self.account = SocialAccount.objects.create(
            workspace=self.ws,
            platform="linkedin_personal",
            account_platform_id="li-1",
            account_name="LinkedIn",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.config = AgentConfig.objects.create(workspace=self.ws, niche="restaurant", topics=["specials"])
        self.drafts = [
            Draft(topic="t1", caption="caption one", hashtags=["#a"]),
            Draft(topic="t2", caption="caption two", hashtags=[]),
        ]

    def _set_mode(self, mode):
        WorkspaceSetting.objects.update_or_create(
            workspace=self.ws, key="publishing.generated_post_mode", defaults={"value": mode}
        )

    def test_default_parks_in_pending_review(self):
        ids = queue_drafts_for_review(self.config, self.drafts)
        assert len(ids) == 2
        statuses = {pp.status for pp in PlatformPost.objects.filter(post_id__in=ids)}
        assert statuses == {PlatformPost.Status.PENDING_REVIEW}

    def test_draft_mode_keeps_children_draft(self):
        self._set_mode("draft")
        ids = queue_drafts_for_review(self.config, self.drafts)
        statuses = {pp.status for pp in PlatformPost.objects.filter(post_id__in=ids)}
        assert statuses == {PlatformPost.Status.DRAFT}

    def test_auto_mode_schedules_an_hour_apart(self):
        self._set_mode("auto")
        now = timezone.now()
        ids = queue_drafts_for_review(self.config, self.drafts, now=now)
        times = sorted(
            PlatformPost.objects.filter(post_id__in=ids).values_list("scheduled_at", flat=True)
        )
        assert all(t is not None for t in times)
        assert abs((times[0] - (now + timedelta(hours=1))).total_seconds()) < 2
        assert abs((times[1] - (now + timedelta(hours=2))).total_seconds()) < 2
        statuses = {pp.status for pp in PlatformPost.objects.filter(post_id__in=ids)}
        assert statuses == {PlatformPost.Status.SCHEDULED}
        # Post-level aggregate is set too, so the calendar shows them.
        assert Post.objects.filter(id__in=ids, scheduled_at__isnull=False).count() == 2

    def test_auto_mode_degrades_to_approval_under_approval_workflow(self):
        self._set_mode("auto")
        self.ws.approval_workflow_mode = "required_internal"
        self.ws.save(update_fields=["approval_workflow_mode"])
        ids = queue_drafts_for_review(self.config, self.drafts)
        statuses = {pp.status for pp in PlatformPost.objects.filter(post_id__in=ids)}
        assert statuses == {PlatformPost.Status.PENDING_REVIEW}
