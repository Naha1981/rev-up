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
import re
import time
import urllib.request
import uuid as uuid_mod
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from urllib.parse import quote_plus

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.common.industry_presets import get_preset
from apps.composer.services import approval_gate_allows_schedule, create_post, transition_platform_post
from apps.settings_manager.helpers import get_generated_post_mode, get_setting
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace

from .models import RadarFeedItem, RadarIngestedItem

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
    if social_account.needs_reconnect:
        logger.warning(
            "radar: workspace %s radar account %s needs reconnect (status %s); skipping feed ingest",
            workspace.id,
            account_id,
            social_account.connection_status,
        )
        return {"created": 0, "skipped": 0, "mode": "account-needs-reconnect"}

    max_items = int(
        get_setting(workspace.id, "radar.max_items_per_run", workspace.organization_id) or DEFAULT_MAX_ITEMS
    )
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
        WorkspaceSetting.objects.filter(key="radar.feed_url")
        .exclude(value__isnull=True)
        .values_list("workspace_id", flat=True)
    )
    results = {}
    for ws in Workspace.objects.filter(id__in=workspace_ids):
        try:
            results[str(ws.id)] = ingest_feed_for_workspace(ws, fetcher=fetcher)
        except Exception:
            logger.exception("radar: poll failed for workspace %s", ws.id)
            results[str(ws.id)] = {"error": "poll failed"}
    return results


# ---------------------------------------------------------------------------
# Generated feeds: free per-business demand signals (no custom feed URL needed)
# ---------------------------------------------------------------------------

MAX_GENERATED_QUERIES_PER_RUN = 20
KEEP_ITEMS_PER_WORKSPACE = 25
_RSS_TIMEOUT = 20
_TAG_RE = re.compile(r"<[^>]+>")


def fetch_rss(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "nahalabs-radar-generator/1.0"})
    with urllib.request.urlopen(req, timeout=_RSS_TIMEOUT) as resp:
        return resp.read()


def _parse_rss(xml_bytes: bytes) -> list[dict]:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return []
    items = []
    for node in root.iter("item"):

        def _text(tag, node=node):
            el = node.find(tag)
            return (el.text or "").strip() if el is not None else ""

        title = _text("title")
        link = _text("link")
        if not title or not link:
            continue
        source_el = node.find("source")
        source = (source_el.text or "").strip() if source_el is not None else ""
        summary = _TAG_RE.sub(" ", _text("description"))
        summary = " ".join(summary.split())[:280]
        published_at = None
        pub = _text("pubDate")
        if pub:
            try:
                published_at = parsedate_to_datetime(pub)
            except (TypeError, ValueError):
                published_at = None
        items.append(
            {
                "title": title[:500],
                "link": link[:1000],
                "source": source[:255],
                "summary": summary,
                "published_at": published_at,
            }
        )
    return items


def generated_query_for(workspace, area: str) -> str:
    """One SA-localised Google News query from the workspace's trade keywords
    and area. Free tier friendly: a single OR query, never a burst."""

    keywords = [k for k in get_preset(workspace.industry).get("radar_keywords", []) if k][:4]
    if not keywords:
        keywords = ["small business"]
    q = " OR ".join(keywords)
    bits = [f"({q})"]
    if area:
        bits.append(f'"{area}"')
    bits.append('"South Africa"')
    return " ".join(bits)


def generate_feed_for_workspace(workspace, *, fetcher=fetch_rss) -> int:
    """Fetch and store fresh demand signals for one workspace. Returns the
    number of NEW items stored. Never raises: a failed fetch stores nothing."""

    from apps.settings_manager.helpers import get_setting

    area = (get_setting(workspace.id, "radar.area", workspace.organization_id, default="") or "").strip()
    query = generated_query_for(workspace, area)
    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-ZA&gl=ZA&ceid=ZA:en"
    try:
        raw = fetcher(url)
    except Exception as exc:
        logger.warning("radar generator: fetch failed for workspace %s: %s", workspace.id, exc)
        return 0
    keywords = [k.lower() for k in get_preset(workspace.industry).get("radar_keywords", []) if k]
    group = area or get_preset(workspace.industry).get("label", "Industry")
    created = 0
    for item in _parse_rss(raw)[:15]:
        hay = f"{item['title']} {item['summary']}".lower()
        score = sum(1 for k in keywords if k in hay)
        try:
            with transaction.atomic():
                _, was_created = RadarFeedItem.objects.get_or_create(
                    workspace=workspace,
                    link=item["link"],
                    defaults={**item, "group": group, "score": score},
                )
        except IntegrityError:
            continue
        if was_created:
            created += 1
    # Trim to the newest KEEP_ITEMS_PER_WORKSPACE rows.
    stale = RadarFeedItem.objects.filter(workspace=workspace).values_list("id", flat=True)[KEEP_ITEMS_PER_WORKSPACE:]
    if stale:
        RadarFeedItem.objects.filter(id__in=list(stale)).delete()
    return created


def generate_feeds_for_all_workspaces(*, fetcher=fetch_rss) -> dict:
    """Hourly generator: workspaces without a custom radar.feed_url get a
    generated feed. Polite: at most MAX_GENERATED_QUERIES_PER_RUN fetches per
    run, two seconds apart."""

    from apps.settings_manager.models import WorkspaceSetting

    custom = set(
        WorkspaceSetting.objects.filter(key="radar.feed_url")
        .exclude(value__in=[None, ""])
        .values_list("workspace_id", flat=True)
    )
    results: dict[str, int] = {}
    workspaces = Workspace.objects.filter(is_archived=False).exclude(id__in=custom)[:MAX_GENERATED_QUERIES_PER_RUN]
    for workspace in workspaces:
        results[str(workspace.id)] = generate_feed_for_workspace(workspace, fetcher=fetcher)
        time.sleep(2)
    return results
