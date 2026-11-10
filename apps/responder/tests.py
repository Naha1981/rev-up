"""Responder screen: menu context passed to the dry-run sidecar."""

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.members.models import WorkspaceMembership
from apps.menus.models import MenuCategory, MenuItem
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from .views import _menu_context


def _workspace(name, industry):
    org = Organization.objects.create(subscription_status="active", name=f"{name} org")
    return Workspace.objects.create(organization=org, name=name, industry=industry)


class MenuContextTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="responder-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Responder Bistro", "restaurant")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)

    def test_restaurant_workspace_gets_menu_summary(self):
        cat = MenuCategory.objects.create(workspace=self.ws, name="Mains")
        MenuItem.objects.create(workspace=self.ws, category=cat, name="Peri-Peri Chicken", price="129.00")
        MenuItem.objects.create(
            workspace=self.ws, category=cat, name="Veggie Bowl", price="89.00", dietary=["vegetarian"]
        )
        MenuItem.objects.create(workspace=self.ws, category=cat, name="Old Special", price="99.00", is_available=False)
        ctx = _menu_context(self.ws)
        self.assertIn("Peri-Peri Chicken R129.00", ctx)
        self.assertIn("Veggie Bowl R89.00 (vegetarian)", ctx)
        self.assertNotIn("Old Special", ctx)

    def test_non_restaurant_workspace_with_a_menu_also_gets_summary(self):
        ws = _workspace("Responder Salon", "salon")
        MenuItem.objects.create(workspace=ws, name="Gel Nails", price="250.00")
        self.assertIn("Gel Nails R250.00", _menu_context(ws))

    def test_restaurant_without_menu_gets_empty(self):
        self.assertEqual(_menu_context(self.ws), "")
