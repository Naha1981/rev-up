"""Demand-radar -> RevUp hand-off.

Polls a workspace's configured radar feed (the stage-2 demand radar, e.g.
https://naha1981.github.io/nahalabs-radar/feed/pilot-7f3a.json), dedups by
item link, and pushes new items through the same ``create_post`` service
the ingest API uses - so the workspace's ``publishing.generated_post_mode``
setting decides whether items land in Approvals, Drafts, or the publisher.

Workspace settings (settings_manager):
    radar.feed_url          - URL of the JSON feed; absent = workspace skipped
    radar.social_account_id - UUID of the SocialAccount to post to
    radar.max_items_per_run - optional cap, default 3
"""

import json
import logging
import urllib.request

from apps.common.industry_presets import get_preset
import uuid as uuid_mod

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.composer.services import approval_gate_allows_schedule, create_post, transition_platform_post
from apps.settings_manager.helpers import get_generated_post_mode, get_setting
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace

from .models import RadarIngestedItem

logger = logging.getLogger(__name__)

DEFAULT_MAX_ITEMS = 3
FETCH_TIMEOUT_SECONDS = 20


def fetch_feed(feed_url: str) -> dict:
    req = urllib.request.Request(feed_url, headers={"User-Agent": "nahalabs-radar-poller/1.0"})
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT_SECONDS) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _caption_for(item: dict, business_name: str) -> str:
    title = (item.get("title") or "").strip()
    source = (item.get("source") or "").strip()
    link = (item.get("link") or "").strip()
    group = (item.get("group") or "").strip()
    parts = []
    if group:
        parts.append(f"[{group}]")
    parts.append(title or "Radar signal")
    if source:
        parts.append(f"- {source}")
    if link:
        parts.append(link)
    caption = " ".join(parts)
    return caption[:2000]


def ingest_feed_for_workspace(workspace: Workspace, *, fetcher=fetch_feed) -> dict:
    """Poll one workspace's feed; returns {created: n, skipped: n, mode: str}."""
    feed_url = get_setting(workspace.id, "radar.feed_url", workspace.organization_id)
    if not feed_url:
        return {"created": 0, "skipped": 0, "mode": "no-feed"}
    account_id = get_setting(workspace.id, "radar.social_account_id", workspace.organization_id)
    if not account_id:
        logger.warning("radar: workspace %s has feed_url but no social_account_id", workspace.id)
        return {"created": 0, "skipped": 0, "mode": "no-account"}
    try:
        social_account = SocialAccount.objects.get(id=uuid_mod.UUID(str(account_id)), workspace=workspace)
    except (SocialAccount.DoesNotExist, ValueError):
        logger.warning("radar: workspace %s radar account %s not found", workspace.id, account_id)
        return {"created": 0, "skipped": 0, "mode": "bad-account"}

    max_items = int(get_setting(workspace.id, "radar.max_items_per_run", workspace.organization_id) or DEFAULT_MAX_ITEMS)
    mode = get_generated_post_mode(workspace.id, workspace.organization_id)
    if mode == "auto" and not approval_gate_allows_schedule(workspace, None):
        mode = "approval"  # same degradation contract as the ingest API

    feed = fetcher(feed_url)
    business_name = (feed.get("business_name") or "").strip()
    items = (feed.get("radar") or {}).get("items") or []

    # Industry preset filter: only ingest signals relevant to the workspace's
    # industry. "general" (empty keyword list) ingests everything.
    keywords = [k.lower() for k in get_preset(getattr(workspace, "industry", None)).get("radar_keywords", [])]
    if keywords:
        def _relevant(it):
            hay = " ".join(str(it.get(k) or "") for k in ("title", "group", "source", "summary")).lower()
            return any(k in hay for k in keywords)
        before = len(items)
        items = [it for it in items if _relevant(it)]
        if before != len(items):
            logger.info("radar: industry filter kept %d/%d items for workspace %s", len(items), before, workspace.id)

    created = skipped = 0
    for item in items:
        if created >= max_items:
            break
        link = (item.get("link") or "").strip()
        if not link:
            skipped += 1
            continue
        try:
            with transaction.atomic():  # savepoint: a duplicate rolls back cleanly
                ledger = RadarIngestedItem(workspace=workspace, link=link, title=(item.get("title") or "")[:512])
                ledger.save()
        except IntegrityError:
            skipped += 1
            continue  # already ingested on an earlier run

        scheduled = mode == "auto"
        post = create_post(
            workspace=workspace,
            social_account=social_account,
            caption=_caption_for(item, business_name),
            title=(item.get("title") or "")[:128],
            internal_notes=f"radar ingest from {feed_url} (business {feed.get('business')}, score {item.get('score')})",
            scheduled_at=timezone.now() if scheduled else None,
            status="scheduled" if scheduled else "draft",
        )
        if mode == "approval":
            for pp in post.platform_posts.all():
                transition_platform_post(pp, "pending_review")
        ledger.post = post
        ledger.save(update_fields=["post"])
        created += 1
    return {"created": created, "skipped": skipped, "mode": mode}


def poll_all_workspace_feeds(*, fetcher=fetch_feed) -> dict:
    """One sweep over every workspace with a radar feed configured."""
    from apps.settings_manager.models import WorkspaceSetting

    workspace_ids = (
        WorkspaceSetting.objects.filter(key="radar.feed_url").exclude(value__isnull=True).values_list("workspace_id", flat=True)
    )
    results = {}
    for ws in Workspace.objects.filter(id__in=workspace_ids):
        try:
            results[str(ws.id)] = ingest_feed_for_workspace(ws, fetcher=fetcher)
        except Exception:
            logger.exception("radar: poll failed for workspace %s", ws.id)
            results[str(ws.id)] = {"error": "poll failed"}
    return results
