import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.members.models import OrgMembership, WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .models import MenuCategory, MenuItem


@pytest.fixture
def ws_owner(db):
    user = User.objects.create_user(
        email="menu-owner@example.com", password="testpass123", name="Owner", tos_accepted_at=timezone.now()
    )
    org = Organization.objects.create(name="Menu Org")
    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    ws = Workspace.objects.create(organization=org, name="Test Bistro", industry="restaurant")
    WorkspaceMembership.objects.create(user=user, workspace=ws)
    return user, ws


@pytest.mark.django_db
def test_add_item_creates_category_and_item(ws_owner):
    user, ws = ws_owner
    client = Client()
    client.force_login(user)
    resp = client.post(
        reverse("menus:manage", args=[ws.id]),
        {"name": "Kota Deluxe", "price": "65", "category": "Mains", "dietary": ["halaal"]},
    )
    assert resp.status_code == 302
    item = MenuItem.objects.get(workspace=ws, name="Kota Deluxe")
    assert str(item.price) == "65.00"
    assert item.category.name == "Mains"
    assert item.dietary == ["halaal"]


@pytest.mark.django_db
def test_add_item_rejects_bad_price(ws_owner):
    user, ws = ws_owner
    client = Client()
    client.force_login(user)
    resp = client.post(reverse("menus:manage", args=[ws.id]), {"name": "Bad", "price": "lots"})
    assert resp.status_code == 302
    assert MenuItem.objects.filter(workspace=ws).count() == 0


@pytest.mark.django_db
def test_toggle_and_delete(ws_owner):
    user, ws = ws_owner
    item = MenuItem.objects.create(workspace=ws, name="Chips", price=25)
    client = Client()
    client.force_login(user)
    client.post(reverse("menus:item_action", args=[ws.id, item.id, "toggle"]))
    item.refresh_from_db()
    assert not item.is_available
    client.post(reverse("menus:item_action", args=[ws.id, item.id, "toggle"]))
    item.refresh_from_db()
    assert item.is_available
    client.post(reverse("menus:item_action", args=[ws.id, item.id, "delete"]))
    assert MenuItem.objects.filter(id=item.id).count() == 0


@pytest.mark.django_db
def test_manage_requires_membership(ws_owner):
    _, ws = ws_owner
    other = User.objects.create_user(
        email="menu-other@example.com", password="testpass123", name="Other", tos_accepted_at=timezone.now()
    )
    client = Client()
    client.force_login(other)
    resp = client.get(reverse("menus:manage", args=[ws.id]))
    assert resp.status_code in (403, 404)
    item = MenuItem.objects.create(workspace=ws, name="Chips", price=25)
    resp = client.post(reverse("menus:item_action", args=[ws.id, item.id, "delete"]))
    assert resp.status_code in (403, 404)
    assert MenuItem.objects.filter(id=item.id).exists()


@pytest.mark.django_db
def test_public_page_shows_available_only_and_no_login(ws_owner):
    _, ws = ws_owner
    cat = MenuCategory.objects.create(workspace=ws, name="Mains")
    MenuItem.objects.create(workspace=ws, category=cat, name="Kota", price=45, description="Full house")
    MenuItem.objects.create(workspace=ws, category=cat, name="Sold Out Special", price=99, is_available=False)
    client = Client()  # no login
    resp = client.get(f"/menu/{ws.id}/")
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "Kota" in body and "R45.00" in body
    assert "Sold Out Special" not in body
    assert "Test Bistro" in body


@pytest.mark.django_db
def test_public_page_404_for_unknown_workspace(db):
    client = Client()
    resp = client.get("/menu/00000000-0000-0000-0000-000000000000/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_receptionist_prompt_includes_menu(ws_owner):
    _, ws = ws_owner
    from apps.receptionist.models import BusinessProfile
    from apps.receptionist.services import _profile_block

    profile = BusinessProfile.objects.create(workspace=ws, business_name="Test Bistro", industry="restaurant")
    assert "Menu (ZAR)" not in _profile_block(profile)
    MenuItem.objects.create(workspace=ws, name="Kota", price=45)
    block = _profile_block(profile)
    assert "Menu (ZAR): Kota R45.00" in block
    assert f"/menu/{ws.id}/" in block


@pytest.mark.django_db
def test_public_menu_visible_to_signed_in_stranger(ws_owner):
    """A customer signed into their own account must still see another
    workspace's public menu (RBAC must not 403 public routes)."""
    _, ws = ws_owner
    cat = MenuCategory.objects.create(workspace=ws, name="Mains")
    MenuItem.objects.create(workspace=ws, category=cat, name="Peri-Peri Chicken", price="129.00")

    stranger = User.objects.create_user(
        email="menu-stranger@example.com",
        password="testpass123",
        name="Stranger",
        tos_accepted_at=timezone.now(),
    )
    org = Organization.objects.create(name="Stranger Org")
    OrgMembership.objects.create(user=stranger, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    other_ws = Workspace.objects.create(organization=org, name="Other Place")
    WorkspaceMembership.objects.create(user=stranger, workspace=other_ws)

    client = Client()
    client.force_login(stranger)
    resp = client.get(f"/menu/{ws.id}/")
    assert resp.status_code == 200
    assert b"Peri-Peri Chicken" in resp.content

    # the stranger's own workspace context must be untouched
    resp = client.get(f"/workspace/{ws.id}/menu/")
    assert resp.status_code == 403
