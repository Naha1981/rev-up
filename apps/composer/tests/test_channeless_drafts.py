"""Regression tests for drafts saved without a channel.

A draft saved before any channel is selected creates a Post with zero
PlatformPost children. derive_post_status([]) is "draft", but every drafts
surface required a draft child row, so those posts were invisible everywhere:
Publish -> Drafts tab, the composer /drafts/ page, and the tab badge count.
"""

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.composer.models import PlatformPost, Post
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace


class ChannelessDraftTests(TestCase):
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
        self.post = Post.objects.create(
            workspace=self.workspace,
            author=self.user,
            caption="Channel-less draft",
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_zero_child_post_derives_draft(self):
        self.assertEqual(self.post.status, "draft")

    def test_composer_drafts_page_lists_channeless_draft(self):
        url = reverse("composer:drafts_list", args=[self.workspace.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.post, response.context["drafts"])

    def test_publish_drafts_tab_lists_channeless_draft(self):
        url = reverse("calendar:calendar", args=[self.workspace.id]) + "?tab=drafts"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(self.post, response.context["orphan_drafts"])

    def test_drafts_badge_counts_channeless_draft(self):
        url = reverse("calendar:calendar", args=[self.workspace.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["drafts_count"], 1)

    def test_advanced_child_still_excludes_post(self):
        account = SocialAccount.objects.create(
            workspace=self.workspace, platform="bluesky", account_handle="t.bsky.social"
        )
        PlatformPost.objects.create(post=self.post, social_account=account, status="scheduled")
        url = reverse("composer:drafts_list", args=[self.workspace.id])
        response = self.client.get(url)
        self.assertNotIn(self.post, response.context["drafts"])
