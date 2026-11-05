import uuid

from django.db import models


class MenuCategory(models.Model):
    """A menu section (Mains, Braai, Drinks...) for one workspace."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="menu_categories")
    name = models.CharField(max_length=80)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "menus_category"
        ordering = ["position", "name"]
        constraints = [
            models.UniqueConstraint(fields=["workspace", "name"], name="menus_category_unique_name"),
        ]

    def __str__(self):
        return f"{self.name} ({self.workspace_id})"


class MenuItem(models.Model):
    """One dish or product on a workspace's public menu. Prices in ZAR."""

    DIETARY_CHOICES = [
        ("halaal", "Halaal"),
        ("vegetarian", "Vegetarian"),
        ("vegan", "Vegan"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="menu_items")
    category = models.ForeignKey(
        MenuCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="items"
    )
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=300, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    dietary = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "menus_item"
        ordering = ["position", "name"]

    def __str__(self):
        return f"{self.name} (R{self.price})"


def public_menu_url(workspace_id) -> str:
    """Absolute URL of the customer-facing menu page for a workspace."""
    from django.conf import settings

    base = (getattr(settings, "APP_URL", "") or "").rstrip("/")
    return f"{base}/menu/{workspace_id}/"
