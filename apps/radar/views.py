"""Radar screen: live demand-radar feed + what it generated for this workspace."""

import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from apps.common.industry_presets import INDUSTRY_CHOICES, INDUSTRY_PRESETS, get_preset
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


def _signal_niche(workspace, area):
    """Business description for the drafting prompt: trading name + trade + area."""
    preset = get_preset(workspace.industry)
    name = workspace.name
    profile = getattr(workspace, "receptionist_profile", None)
    if profile and profile.business_name:
        name = profile.business_name
    bits = [name, preset.get("label") or "local business"]
    if area:
        bits.append(f"in {area}")
    return ", ".join(bits)


@login_required
@require_http_methods(["POST"])
def draft_from_signal(request, workspace_id):
    """Turn one demand signal into an AI-drafted post in the review queue.

    The owner approves every draft - nothing is ever auto-published.
    """
    workspace = _get_workspace(request, workspace_id)
    title = (request.POST.get("title") or "").strip()[:200]
    summary = (request.POST.get("summary") or "").strip()[:400]
    if not title:
        messages.error(request, "That signal has no topic to draft from.")
        return redirect("radar:dashboard", workspace_id=workspace.id)
    area = (get_setting(workspace.id, "radar.area", workspace.organization_id) or "").strip()

    from apps.content_agent.models import AgentConfig
    from apps.content_agent.services import draft_posts, queue_drafts_for_review

    config = AgentConfig(
        workspace=workspace,
        niche=_signal_niche(workspace, area),
        topics=[title],
        posts_per_run=1,
    )
    topic = f"{title}. {summary}".strip(". ")
    try:
        drafts = draft_posts(config, [topic])
    except Exception as exc:
        logger.warning("radar: signal draft failed for workspace %s: %s", workspace.id, exc)
        drafts = []
    if not drafts:
        messages.error(request, "Could not draft a post from that signal right now - try again in a few minutes.")
        return redirect("radar:dashboard", workspace_id=workspace.id)
    created = queue_drafts_for_review(config, drafts[:1])
    if created:
        messages.success(request, "Draft created from the signal - it is waiting in your review queue.")
    else:
        messages.error(request, "The draft could not be queued - try again shortly.")
    return redirect("radar:dashboard", workspace_id=workspace.id)


@login_required
@require_http_methods(["GET", "POST"])
def dashboard(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    org_id = workspace.organization_id

    if request.method == "POST":
        feed_url = (request.POST.get("feed_url") or "").strip()
        account_id = (request.POST.get("social_account_id") or "").strip()
        max_items = (request.POST.get("max_items_per_run") or "").strip()
        area = (request.POST.get("area") or "").strip()[:120]
        industry = (request.POST.get("industry") or "").strip()
        if industry in INDUSTRY_PRESETS and workspace.industry != industry:
            workspace.industry = industry
            workspace.save(update_fields=["industry"])
        _set_workspace_value(workspace, "radar.feed_url", feed_url or None)
        _set_workspace_value(workspace, "radar.area", area or None)
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

    area = (get_setting(workspace.id, "radar.area", org_id) or "").strip()
    last_run = get_setting(workspace.id, "radar.last_run", org_id) or ""
    ingested_links = set(RadarIngestedItem.objects.filter(workspace=workspace).values_list("link", flat=True))
    keywords = [k.lower() for k in get_preset(workspace.industry).get("radar_keywords", [])]
    items = []
    for item in ((feed or {}).get("radar") or {}).get("items") or []:
        hay = " ".join(str(item.get(k) or "") for k in ("title", "group", "source", "summary")).lower()
        relevant = not keywords or any(k in hay for k in keywords)
        items.append({**item, "ingested": item.get("link") in ingested_links, "relevant": relevant})
    generated = False
    if not feed_url:
        from .models import RadarFeedItem

        for row in RadarFeedItem.objects.filter(workspace=workspace)[:15]:
            hay = f"{row.title} {row.summary}".lower()
            relevant = not keywords or any(k in hay for k in keywords)
            items.append(
                {
                    "title": row.title,
                    "link": row.link,
                    "source": row.source,
                    "summary": row.summary,
                    "group": "Industry news",
                    "score": row.score,
                    "ingested": row.link in ingested_links,
                    "relevant": relevant,
                }
            )
        generated = True

    from .demand import build_demand_items

    items = build_demand_items(workspace, area) + items

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
            "generated": generated,
            "area": area,
            "last_run": last_run,
            "items": items,
            "industry_choices": INDUSTRY_CHOICES,
            "preset": get_preset(workspace.industry),
            "drafts": drafts,
            "accounts": accounts,
        },
    )
