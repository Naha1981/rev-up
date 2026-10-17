"""Radar screen: live demand-radar feed + what it generated for this workspace."""

import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from apps.members.models import WorkspaceMembership
from apps.settings_manager.helpers import get_setting
from apps.settings_manager.models import WorkspaceSetting
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace

from .models import RadarIngestedItem
from .services import fetch_feed

logger = logging.getLogger(__name__)


def _get_workspace(request, workspace_id):
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not request.user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise PermissionDenied("You are not a member of this workspace.")
    return workspace


def _set_workspace_value(workspace, key, value):
    WorkspaceSetting.objects.update_or_create(workspace=workspace, key=key, defaults={"value": value})


@login_required
@require_http_methods(["GET", "POST"])
def dashboard(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    org_id = workspace.organization_id

    if request.method == "POST":
        feed_url = (request.POST.get("feed_url") or "").strip()
        account_id = (request.POST.get("social_account_id") or "").strip()
        max_items = (request.POST.get("max_items_per_run") or "").strip()
        _set_workspace_value(workspace, "radar.feed_url", feed_url or None)
        _set_workspace_value(workspace, "radar.social_account_id", account_id or None)
        _set_workspace_value(workspace, "radar.max_items_per_run", int(max_items) if max_items.isdigit() else None)
        messages.success(request, "Radar settings saved. The poller picks them up on its next run (every 15 min).")
        return redirect("radar:dashboard", workspace_id=workspace.id)

    feed_url = get_setting(workspace.id, "radar.feed_url", org_id)
    account_id = get_setting(workspace.id, "radar.social_account_id", org_id)
    max_items = get_setting(workspace.id, "radar.max_items_per_run", org_id)

    feed = None
    feed_error = None
    if feed_url:
        try:
            feed = fetch_feed(feed_url)
        except Exception as exc:
            feed_error = str(exc)
            logger.warning("radar dashboard: fetch failed for %s: %s", feed_url, exc)

    ingested_links = set(RadarIngestedItem.objects.filter(workspace=workspace).values_list("link", flat=True))
    items = []
    for item in ((feed or {}).get("radar") or {}).get("items") or []:
        items.append({**item, "ingested": item.get("link") in ingested_links})

    drafts = (
        RadarIngestedItem.objects.filter(workspace=workspace, post__isnull=False)
        .select_related("post")
        .order_by("-ingested_at")[:20]
    )
    accounts = SocialAccount.objects.filter(workspace=workspace).order_by("platform")

    return render(
        request,
        "radar/dashboard.html",
        {
            "workspace": workspace,
            "feed_url": feed_url or "",
            "account_id": account_id or "",
            "max_items": max_items or 3,
            "feed": feed,
            "feed_error": feed_error,
            "items": items,
            "drafts": drafts,
            "accounts": accounts,
        },
    )
