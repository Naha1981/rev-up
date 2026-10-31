"""Zernio webhook receiver.

POST /webhooks/zernio/ - signature-verified, deduplicated, terminal-safe.

Contract with Zernio (docs.zernio.com/webhooks):
- Deliveries are signed with OUR secret: X-Zernio-Signature is the lowercase
  hex HMAC-SHA256 of the raw request body (X-Late-Signature is the legacy
  alias). A missing secret or a mismatch fails closed with 403.
- The payload ``id`` (also the X-Zernio-Event-Id header) is stable across
  retries and is the dedupe key. We insert it before processing and ack
  conflicts.
- We always 2xx once the event is durably stored: redelivery is Zernio's
  retry, but our own transient failures are covered by the publisher's
  confirmation sweep (GET /v1/posts/{id}) and by reprocessing on redelivery
  when ``processed_at`` is still NULL.
- Status transitions never regress a terminal row: a published row stays
  published on a late failure event; a failed row CAN still be settled as
  published by a late success event (that is reconciliation, not regression).
"""

import json
import logging

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from providers.zernio import ZernioClient

from .models import ZernioWebhookEvent

logger = logging.getLogger(__name__)

# Event families we act on. Everything else is acked and stored without
# processing: Zernio's catalog is open-ended and an unknown event must never
# be an error on our side.
_ROLLUP_EVENTS = {"post.published", "post.partial", "post.failed", "post.cancelled"}
_PLATFORM_EVENTS = {"post.platform.published", "post.platform.failed"}
_ACCOUNT_EVENTS = {"account.connected", "account.disconnected"}


def _header(request, *names):
    for name in names:
        value = request.META.get(name)
        if value:
            return value
    return ""


@csrf_exempt
@require_POST
def zernio_webhook(request):
    secret = getattr(settings, "ZERNIO_WEBHOOK_SECRET", "")
    signature = _header(request, "HTTP_X_ZERNIO_SIGNATURE", "HTTP_X_LATE_SIGNATURE")
    if not secret or not ZernioClient.verify_webhook_signature(request.body, signature, secret):
        logger.warning("Zernio webhook rejected: bad signature or unconfigured secret")
        return JsonResponse({"error": "invalid signature"}, status=403)

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "invalid json"}, status=400)
    if not isinstance(payload, dict):
        return JsonResponse({"error": "invalid payload"}, status=400)

    event_id = payload.get("id") or _header(request, "HTTP_X_ZERNIO_EVENT_ID", "HTTP_X_LATE_EVENT_ID")
    if not event_id:
        return JsonResponse({"error": "missing event id"}, status=400)
    event_type = payload.get("event") or ""

    try:
        with transaction.atomic():
            event_row = ZernioWebhookEvent.objects.create(event_id=event_id, event_type=event_type, payload=payload)
    except IntegrityError:
        event_row = ZernioWebhookEvent.objects.get(event_id=event_id)
        if event_row.processed_at is not None:
            return JsonResponse({"status": "duplicate"})

    try:
        _process(event_type, payload)
    except Exception:
        logger.exception("Zernio webhook %s (%s) failed processing", event_id, event_type)
        event_row.processing_error = "processing raised; will retry on redelivery or via the confirm sweep"
        event_row.save(update_fields=["processing_error"])
        # Still ack: Zernio redelivers on non-2xx, and the sweep settles rows.
        return JsonResponse({"status": "accepted"})

    event_row.processed_at = timezone.now()
    event_row.processing_error = ""
    event_row.save(update_fields=["processed_at", "processing_error"])
    return JsonResponse({"status": "ok"})


def _process(event_type: str, payload: dict) -> None:
    if event_type in ("webhook.test", ""):
        return
    if event_type in _PLATFORM_EVENTS or event_type in _ROLLUP_EVENTS:
        _process_post_event(event_type, payload)
    elif event_type == "post.platform.deleted":
        _process_platform_deleted(payload)
    elif event_type == "post.tiktok.url_resolved":
        _process_tiktok_url(payload)
    elif event_type in _ACCOUNT_EVENTS:
        _process_account_event(event_type, payload)
    elif _receptionist_handles(event_type):
        _process_inbox_event(payload)
    else:
        logger.info("Zernio webhook: unhandled event type %s (acked)", event_type)


def _resolve_platform_post(payload: dict):
    """Correlate an event to its PlatformPost via the metadata we sent at
    dispatch (M3 sends {"platform_post_id": ...}), falling back to the Zernio
    post id recorded on the row."""
    from apps.composer.models import PlatformPost

    post = payload.get("post") or {}
    metadata = post.get("metadata") or {}
    platform_post_id = metadata.get("platform_post_id")
    qs = PlatformPost.objects.select_related("social_account", "post")
    if platform_post_id:
        row = qs.filter(id=platform_post_id).first()
        if row is not None:
            return row
    zernio_post_id = post.get("_id") or post.get("id")
    if zernio_post_id:
        return qs.filter(provider_post_id=zernio_post_id).first()
    return None


def _our_target(payload: dict, platform_post) -> dict:
    """The post.platforms[] entry for this row's account (or the only entry)."""
    post = payload.get("post") or {}
    targets = post.get("platforms") or []
    account_id = platform_post.social_account.provider_account_id
    for target in targets:
        if account_id and target.get("accountId") == account_id:
            return target
    return targets[0] if targets else {}


def _process_post_event(event_type: str, payload: dict) -> None:
    from apps.composer.models import PlatformPost

    from .engine import PublishEngine

    platform_post = _resolve_platform_post(payload)
    if platform_post is None:
        logger.info("Zernio %s for a post we do not track; acked", event_type)
        return

    target = _our_target(payload, platform_post)
    target_status = target.get("status") or ""
    platform_post.last_provider_status = target_status or event_type
    platform_post.last_status_synced_at = timezone.now()

    if event_type == "post.cancelled":
        _fail(platform_post, "This post was cancelled before publishing.", reason="cancelled")
        return

    if event_type in ("post.platform.failed", "post.failed") or (
        event_type == "post.partial" and target_status == "failed"
    ):
        err = target.get("error") or (payload.get("post") or {}).get("error") or ""
        if err:
            platform_post.last_provider_error = str(err)[:2000]
        platform_post.save(
            update_fields=["last_provider_status", "last_status_synced_at", "last_provider_error", "updated_at"]
        )
        _fail(
            platform_post,
            str(err or "The platform failed to publish this post."),
            reason="failed",
        )
        return

    if event_type in ("post.platform.published", "post.published") or (
        event_type == "post.partial" and target_status == "published"
    ):
        platform_post.save(update_fields=["last_provider_status", "last_status_synced_at", "updated_at"])
        if platform_post.status == PlatformPost.Status.PUBLISHED:
            return
        # A late success after we gave up reconciling is a settle, not a
        # regression: _give_up_unconfirmed keeps provider_post_id for this.
        PublishEngine()._mark_confirmed_published(
            platform_post, target.get("platformPostId") or platform_post.provider_post_id
        )
        return

    # post.partial with a still-running target, or a rollup we do not map:
    # record and wait for the terminal event / sweep.
    platform_post.save(update_fields=["last_provider_status", "last_status_synced_at", "updated_at"])


def _fail(platform_post, message: str, *, reason: str) -> None:
    """Fail through the engine, whose guarded UPDATE only fires while the row
    is non-terminal - a published row can never be failed by a late event."""
    from .engine import PUBLISH_GENERIC_MESSAGE, PublishEngine

    platform_post.save(update_fields=["last_provider_status", "last_status_synced_at", "updated_at"])
    PublishEngine()._fail_permanently(
        platform_post,
        message,
        user_message=message if len(message) <= 300 else PUBLISH_GENERIC_MESSAGE,
        reason=reason,
    )


def _process_platform_deleted(payload: dict) -> None:
    platform_post = _resolve_platform_post(payload)
    if platform_post is None:
        return
    platform_post.last_provider_status = "deleted"
    platform_post.last_status_synced_at = timezone.now()
    platform_post.save(update_fields=["last_provider_status", "last_status_synced_at", "updated_at"])


def _process_tiktok_url(payload: dict) -> None:
    platform_post = _resolve_platform_post(payload)
    if platform_post is None:
        return
    target = _our_target(payload, platform_post)
    url = target.get("publishedUrl") or (payload.get("post") or {}).get("publishedUrl") or ""
    if url and not platform_post.platform_post_id.startswith("http"):
        platform_post.platform_post_id = url
        platform_post.save(update_fields=["platform_post_id", "updated_at"])


def _process_account_event(event_type: str, payload: dict) -> None:
    from apps.social_accounts.models import SocialAccount, WorkspaceProviderProfile

    account = payload.get("account") or {}
    account_id = account.get("accountId") or account.get("id") or payload.get("accountId") or ""
    profile_id = account.get("profileId") or payload.get("profileId") or ""

    if event_type == "account.disconnected":
        qs = SocialAccount.objects.filter(provider="zernio")
        if account_id:
            qs = qs.filter(provider_account_id=account_id)
        elif profile_id:
            qs = qs.filter(provider_profile_id=profile_id)
        updated = qs.update(
            connection_status=SocialAccount.ConnectionStatus.DISCONNECTED,
            last_error="Disconnected at the provider; reconnect from Settings.",
        )
        logger.warning("Zernio account.disconnected: %s account(s) marked disconnected", updated)
        return

    # account.connected: refresh the workspace's account list server-side, the
    # same confirm step the connect callback runs (never trust the browser).
    if not profile_id:
        return
    profile = WorkspaceProviderProfile.objects.filter(
        provider=WorkspaceProviderProfile.Provider.ZERNIO, profile_id=profile_id
    ).first()
    if profile is None:
        return
    from apps.social_accounts.zernio_connect import sync_zernio_accounts

    try:
        sync_zernio_accounts(profile.workspace, profile)
    except Exception:
        logger.exception("account.connected sync failed for profile %s", profile_id)
        raise


def _receptionist_handles(event_type: str) -> bool:
    from apps.receptionist import webhooks as receptionist_webhooks

    return receptionist_webhooks.handles(event_type)


def _process_inbox_event(payload: dict) -> None:
    from apps.receptionist import webhooks as receptionist_webhooks

    receptionist_webhooks.handle_inbox_message(payload)
