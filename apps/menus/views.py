import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from apps.members.models import WorkspaceMembership
from apps.workspaces.models import Workspace

from .models import MenuCategory, MenuItem, public_menu_url

logger = logging.getLogger(__name__)

VALID_DIETARY = {c for c, _ in MenuItem.DIETARY_CHOICES}


def _get_workspace(request, workspace_id):
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not request.user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise PermissionDenied("You are not a member of this workspace.")
    return workspace


@login_required
@require_http_methods(["GET", "POST"])
def manage(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    if request.method == "POST":
        name = (request.POST.get("name") or "").strip()[:120]
        category_name = (request.POST.get("category") or "").strip()[:80]
        description = (request.POST.get("description") or "").strip()[:300]
        price_raw = (request.POST.get("price") or "").strip().replace(",", ".")
        dietary = [d for d in request.POST.getlist("dietary") if d in VALID_DIETARY]
        try:
            price = round(float(price_raw), 2)
            if price < 0 or price > 1_000_000:
                raise ValueError
        except (TypeError, ValueError):
            price = None
        if not name or price is None:
            messages.error(request, "Give the item a name and a valid price in rand.")
        else:
            category = None
            if category_name:
                category, _ = MenuCategory.objects.get_or_create(workspace=workspace, name=category_name)
            MenuItem.objects.create(
                workspace=workspace,
                category=category,
                name=name,
                description=description,
                price=price,
                dietary=dietary,
            )
            messages.success(request, f"{name} added to the menu.")
        return redirect("menus:manage", workspace_id=workspace.id)

    items = list(MenuItem.objects.filter(workspace=workspace).select_related("category"))
    categories = [c.name for c in MenuCategory.objects.filter(workspace=workspace)]
    return render(
        request,
        "menus/manage.html",
        {
            "workspace": workspace,
            "items": items,
            "categories": categories,
            "dietary_choices": MenuItem.DIETARY_CHOICES,
            "public_url": public_menu_url(workspace.id),
        },
    )


@login_required
@require_http_methods(["POST"])
def item_action(request, workspace_id, item_id, action):
    workspace = _get_workspace(request, workspace_id)
    item = get_object_or_404(MenuItem, id=item_id, workspace=workspace)
    if action == "toggle":
        item.is_available = not item.is_available
        item.save(update_fields=["is_available", "updated_at"])
        messages.success(request, f"{item.name} is now {'available' if item.is_available else 'sold out'}.")
    elif action == "delete":
        name = item.name
        item.delete()
        messages.success(request, f"{name} removed from the menu.")
    else:
        messages.error(request, "Unknown action.")
    return redirect("menus:manage", workspace_id=workspace.id)


@require_http_methods(["GET"])
def public(request, workspace_id):
    """Customer-facing menu page. No login; shows available items only."""
    workspace = get_object_or_404(Workspace, id=workspace_id)
    items = list(MenuItem.objects.filter(workspace=workspace, is_available=True).select_related("category"))
    profile = getattr(workspace, "receptionist_profile", None)
    business_name = profile.business_name if profile and profile.business_name else workspace.name
    grouped = []
    seen = {}
    for item in items:
        key = item.category.name if item.category else "Menu"
        if key not in seen:
            seen[key] = {"name": key, "items": []}
            grouped.append(seen[key])
        seen[key]["items"].append(item)
    hours = profile.operating_hours if profile else {}
    return render(
        request,
        "menus/public.html",
        {
            "workspace": workspace,
            "business_name": business_name,
            "grouped": grouped,
            "hours": hours,
        },
    )
