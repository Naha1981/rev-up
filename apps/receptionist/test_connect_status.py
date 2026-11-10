import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from apps.members.models import WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import BusinessProfile, CalendarConnection, ZernioChannel

pytestmark = pytest.mark.django_db

User = get_user_model()


def _ws():
    org = Organization.objects.create(subscription_status="active", name="Test Org", plan="growth")
    ws = Workspace.objects.create(name="Thandi's Place", organization=org)
    BusinessProfile.objects.create(workspace=ws, business_name="Thandi's Place")
    return ws


def _client(ws):
    user = User.objects.create_user(email="t@example.com", password="x", name="T", tos_accepted_at=timezone.now())
    WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role="owner")
    c = Client()
    c.force_login(user)
    return c


@pytest.mark.parametrize("page", ["inbox", "bookings"])
def test_not_connected_state_shown(page):
    ws = _ws()
    resp = _client(ws).get(f"/workspace/{ws.id}/receptionist/{'bookings/' if page == 'bookings' else ''}")
    assert resp.status_code == 200
    assert "WhatsApp not connected" in resp.content.decode()
    assert "Calendar not connected" in resp.content.decode()
    assert "Connect in Settings" in resp.content.decode()


@pytest.mark.parametrize("page", ["inbox", "bookings"])
def test_connected_state_shown(page):
    ws = _ws()
    ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc-1", phone_number="27710000000")
    CalendarConnection.objects.create(workspace=ws, google_email="owner@example.com")
    resp = _client(ws).get(f"/workspace/{ws.id}/receptionist/{'bookings/' if page == 'bookings' else ''}")
    body = resp.content.decode()
    assert resp.status_code == 200
    assert "WhatsApp connected" in body and "+27710000000" in body
    assert "Calendar connected" in body and "owner@example.com" in body
    assert "not connected" not in body
