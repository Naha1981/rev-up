from unittest.mock import patch

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.composer.models import Post
from apps.content_agent.services import Draft
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace


@pytest.fixture
def ws_owner(db):
    user = User.objects.create_user(
        email="owner@example.com", password="testpass123", name="Owner", tos_accepted_at=timezone.now()
    )
    org = Organization.objects.create(name="Bistro Org")
    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    ws = Workspace.objects.create(organization=org, name="Test Bistro", industry="restaurant")
    WorkspaceMembership.objects.create(user=user, workspace=ws)
    return user, ws


@pytest.mark.django_db
def test_draft_from_signal_creates_review_post(ws_owner):
    user, ws = ws_owner
    client = Client()
    client.force_login(user)
    url = reverse("radar:draft_from_signal", args=[ws.id])
    fake = [Draft(topic="Payday in 2 days", caption="Payday Friday! Book your table now.", hashtags=["#JoburgEats"])]
    # the view imports both helpers inside the function, so patch at the source module
    with (
        patch("apps.content_agent.services.draft_posts", return_value=fake),
        patch("apps.content_agent.services.queue_drafts_for_review", return_value=["post-id"]) as mq,
    ):
        resp = client.post(url, {"title": "Payday in 2 days (the 25th)", "summary": "Customers get paid soon."})
    assert resp.status_code == 302
    assert mq.called


@pytest.mark.django_db
def test_draft_from_signal_requires_membership(ws_owner):
    _, ws = ws_owner
    other = User.objects.create_user(
        email="other@example.com", password="testpass123", name="Other", tos_accepted_at=timezone.now()
    )
    client = Client()
    client.force_login(other)
    url = reverse("radar:draft_from_signal", args=[ws.id])
    resp = client.post(url, {"title": "Weekend in 2 days"})
    assert resp.status_code in (403, 404)


@pytest.mark.django_db
def test_draft_from_signal_handles_provider_failure(ws_owner):
    user, ws = ws_owner
    client = Client()
    client.force_login(user)
    url = reverse("radar:draft_from_signal", args=[ws.id])
    with patch("apps.content_agent.services.draft_posts", side_effect=RuntimeError("no key")):
        resp = client.post(url, {"title": "Weekend in 2 days"})
    assert resp.status_code == 302
    assert Post.objects.filter(workspace=ws).count() == 0
