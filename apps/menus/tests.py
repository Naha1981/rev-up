from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone


def _workspace(name):
    from apps.organizations.models import Organization
    from apps.workspaces.models import Workspace

    org = Organization.objects.create(name=f"{name} org")
    return Workspace.objects.create(organization=org, name=name)


class MenuIntelligenceTests(TestCase):
    """Menu engineering matrix, sales logging, cost capture, isolation."""

    def setUp(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        from .models import DishSale, MenuItem

        self.user = User.objects.create_user(
            email="menu-owner@example.com",
            password="testpass123",
            name="Owner",
            tos_accepted_at=timezone.now(),
        )
        self.ws = _workspace("Matrix Bistro")
        WorkspaceMembership.objects.create(user=self.user, workspace=self.ws)
        self.client.force_login(self.user)
        today = timezone.localdate()

        def dish(name, price, cost, units):
            item = MenuItem.objects.create(
                workspace=self.ws,
                name=name,
                price=Decimal(price),
                food_cost=Decimal(cost) if cost is not None else None,
            )
            if units:
                DishSale.objects.create(workspace=self.ws, item=item, sold_on=today - timedelta(days=3), quantity=units)
            return item

        self.star = dish("Star Steak", "100", "40", 20)
        self.plowhorse = dish("Plowhorse Pasta", "100", "90", 20)
        self.puzzle = dish("Puzzle Prawns", "100", "30", 2)
        self.dog = dish("Dog Dumplings", "100", "95", 2)
        self.quiet = dish("Quiet Quiche", "50", None, 0)

    def test_matrix_classification(self):
        from . import engineering

        analysis = engineering.analyse(self.ws)
        by_name = {r.item.name: r for r in analysis["rows"]}
        self.assertEqual(by_name["Star Steak"].classification, "star")
        self.assertEqual(by_name["Plowhorse Pasta"].classification, "plowhorse")
        self.assertEqual(by_name["Puzzle Prawns"].classification, "puzzle")
        self.assertEqual(by_name["Dog Dumplings"].classification, "dog")
        self.assertEqual(by_name["Quiet Quiche"].classification, "")
        self.assertEqual(analysis["total_units"], 44)
        self.assertEqual(analysis["total_revenue"], Decimal("4400.00"))
        self.assertTrue(by_name["Star Steak"].recommendation)

    def test_missing_cost_flagged(self):
        from . import engineering
        from .models import DishSale

        DishSale.objects.create(workspace=self.ws, item=self.quiet, sold_on=timezone.localdate(), quantity=5)
        analysis = engineering.analyse(self.ws)
        row = next(r for r in analysis["rows"] if r.item.name == "Quiet Quiche")
        self.assertEqual(row.classification, "")
        self.assertIn("food cost", row.recommendation)
        self.assertEqual(analysis["missing_cost"], 1)

    def test_log_sales_upserts_same_day(self):
        from .models import DishSale

        url = reverse("menus:intelligence", args=[self.ws.id])
        self.client.post(url, {"form": "log_sales", f"qty_{self.quiet.id}": "7"})
        self.client.post(url, {"form": "log_sales", f"qty_{self.quiet.id}": "9"})
        sale = DishSale.objects.get(item=self.quiet, sold_on=timezone.localdate())
        self.assertEqual(sale.quantity, 9)

    def test_cost_capture(self):
        self.client.post(
            reverse("menus:intelligence", args=[self.ws.id]),
            {"form": "costs", f"cost_{self.quiet.id}": "12.50"},
        )
        self.quiet.refresh_from_db()
        self.assertEqual(self.quiet.food_cost, Decimal("12.50"))

    def test_screen_shows_matrix_and_recommendations(self):
        resp = self.client.get(reverse("menus:intelligence", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Star Steak")
        self.assertContains(resp, "Star")
        self.assertContains(resp, "Plowhorse")
        self.assertContains(resp, "R4400.00")

    def test_isolation(self):
        from apps.accounts.models import User
        from apps.members.models import WorkspaceMembership

        other = User.objects.create_user(
            email="menu-stranger@example.com",
            password="testpass123",
            name="Stranger",
            tos_accepted_at=timezone.now(),
        )
        ws2 = _workspace("Other Bistro")
        WorkspaceMembership.objects.create(user=other, workspace=ws2)
        self.client.force_login(other)
        resp = self.client.get(reverse("menus:intelligence", args=[ws2.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertNotContains(resp, "Star Steak")
        resp = self.client.get(reverse("menus:intelligence", args=[self.ws.id]))
        self.assertEqual(resp.status_code, 403)

    def test_menu_reachable_from_receptionist_nav_and_manage_links_intelligence(self):
        resp = self.client.get(reverse("receptionist:inbox", args=[self.ws.id]))
        self.assertContains(resp, reverse("menus:manage", args=[self.ws.id]))
        resp = self.client.get(reverse("menus:manage", args=[self.ws.id]))
        self.assertContains(resp, reverse("menus:intelligence", args=[self.ws.id]))
