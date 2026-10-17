"""POST /api/v1/posts/ingest - the upstream hand-off endpoint.

The workspace's ``publishing.generated_post_mode`` setting picks the
disposition (approval / draft / auto); the caller never does. These tests
pin each mode, the publish_directly contract on the auto path, and the
approval-workflow degradation.
"""

from __future__ import annotations

import json
from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.api_keys import services
from apps.composer.models import PlatformPost, Post
from apps.members.models import (
    PERMISSION_KEYS,
    OrgMembership,
    WorkspaceMembership,
)
from apps.settings_manager.models import WorkspaceSetting
from apps.social_accounts.models import SocialAccount


class _SecureClient(Client):
    def generic(self, method, path, *args, **kwargs):
        kwargs["secure"] = True
        return super().generic(method, path, *args, **kwargs)


@pytest.fixture
def user(db):
    from apps.accounts.models import User

    u = User.objects.create_user(
        email="ingest@example.com",
        password="testpass123",
        name="Ingest",
        tos_accepted_at=timezone.now(),
    )
    om = u.org_memberships.first()
    om.org_role = OrgMembership.OrgRole.OWNER
    om.save(update_fields=["org_role"])
    return u


@pytest.fixture
def workspace(db, user):
    from apps.workspaces.models import Workspace

    org = user.org_memberships.first().organization
    return Workspace.objects.create(name="Ingest WS", organization=org)


@pytest.fixture
def workspace_owner(db, user, workspace):
    return WorkspaceMembership.objects.create(
        user=user, workspace=workspace, workspace_role=WorkspaceMembership.WorkspaceRole.OWNER
    )


@pytest.fixture
def social_account(db, workspace):
    return SocialAccount.objects.create(
        workspace=workspace,
        platform="linkedin_personal",
        account_platform_id="li-ingest",
        account_name="LinkedIn Ingest",
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )


@pytest.fixture
def issued_key(db, user, workspace_owner, workspace, social_account):
    return services.issue_api_key(
        workspace=workspace,
        social_accounts=[social_account],
        issued_by=user,
        name="ingest",
        permissions=list(PERMISSION_KEYS),
    )


@pytest.fixture
def client(issued_key):
    return _SecureClient(HTTP_AUTHORIZATION=f"Bearer {issued_key.plaintext_token}")


def _set_mode(workspace, mode):
    WorkspaceSetting.objects.update_or_create(
        workspace=workspace,
        key="publishing.generated_post_mode",
        defaults={"value": mode},
    )


def _ingest(client, social_account, **overrides):
    body = {"social_account_id": str(social_account.id), "caption": "Generated upstream post"}
    body.update(overrides)
    return client.post(
        "/api/v1/posts/ingest",
        data=json.dumps(body),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestIngestDisposition:
    def test_default_mode_lands_in_approval(self, client, workspace, social_account):
        resp = _ingest(client, social_account)
        assert resp.status_code == 201, resp.content
        post = Post.objects.get(id=resp.json()["id"])
        assert {pp.status for pp in post.platform_posts.all()} == {PlatformPost.Status.PENDING_REVIEW}

    def test_draft_mode_keeps_children_draft(self, client, workspace, social_account):
        _set_mode(workspace, "draft")
        resp = _ingest(client, social_account)
        assert resp.status_code == 201, resp.content
        post = Post.objects.get(id=resp.json()["id"])
        assert {pp.status for pp in post.platform_posts.all()} == {PlatformPost.Status.DRAFT}

    def test_auto_mode_schedules_for_next_tick(self, client, workspace, social_account):
        _set_mode(workspace, "auto")
        resp = _ingest(client, social_account)
        assert resp.status_code == 201, resp.content
        post = Post.objects.get(id=resp.json()["id"])
        pp = post.platform_posts.get()
        assert pp.status == PlatformPost.Status.SCHEDULED
        assert pp.scheduled_at is not None and pp.scheduled_at <= timezone.now() + timedelta(minutes=1)

    def test_auto_mode_honours_explicit_future_time(self, client, workspace, social_account):
        _set_mode(workspace, "auto")
        future = timezone.now() + timedelta(hours=3)
        resp = _ingest(client, social_account, scheduled_at=future.isoformat())
        assert resp.status_code == 201, resp.content
        pp = Post.objects.get(id=resp.json()["id"]).platform_posts.get()
        assert pp.status == PlatformPost.Status.SCHEDULED
        assert abs((pp.scheduled_at - future).total_seconds()) < 2

    def test_auto_mode_rejects_past_scheduled_at(self, client, workspace, social_account):
        _set_mode(workspace, "auto")
        past = timezone.now() - timedelta(hours=1)
        resp = _ingest(client, social_account, scheduled_at=past.isoformat())
        assert resp.status_code == 422

    def test_auto_mode_degrades_to_approval_under_approval_workflow(self, client, workspace, social_account):
        _set_mode(workspace, "auto")
        workspace.approval_workflow_mode = "required_internal"
        workspace.save(update_fields=["approval_workflow_mode"])
        resp = _ingest(client, social_account)
        assert resp.status_code == 201, resp.content
        post = Post.objects.get(id=resp.json()["id"])
        assert {pp.status for pp in post.platform_posts.all()} == {PlatformPost.Status.PENDING_REVIEW}

    def test_unknown_mode_value_falls_back_to_approval(self, client, workspace, social_account):
        _set_mode(workspace, "publish_everything_now")
        resp = _ingest(client, social_account)
        assert resp.status_code == 201, resp.content
        post = Post.objects.get(id=resp.json()["id"])
        assert {pp.status for pp in post.platform_posts.all()} == {PlatformPost.Status.PENDING_REVIEW}

    def test_idempotent_replay(self, client, social_account):
        body = {"social_account_id": str(social_account.id), "caption": "same", "idempotency_key": "k-1"}
        first = client.post("/api/v1/posts/ingest", data=json.dumps(body), content_type="application/json")
        second = client.post("/api/v1/posts/ingest", data=json.dumps(body), content_type="application/json")
        assert first.status_code == 201
        assert second.status_code in (200, 201)
        assert first.json()["id"] == second.json()["id"]
        assert Post.objects.count() == 1
