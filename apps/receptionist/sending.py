"""WhatsApp sending for the receptionist: replies only, never cold outreach.

Owner decision (WhatsApp, 2026-10-31 20:44, verified on his channel): tenants
connect their OWN WhatsApp numbers through self-onboarding and the
receptionist answers their customers - this needs no per-send approval. His
standing rules bound it: a reply may only go to a customer who messaged the
business FIRST (no cold outbound, nothing to non-customers), and the owner's
sandbox demo stays locked to his own number. Per-tenant hourly/daily caps
keep one abusive or broken tenant from burning the shared free quota or
getting their own number flagged.
"""

from __future__ import annotations

import logging
from datetime import timedelta

import httpx
from django.conf import settings
from django.utils import timezone

from .models import Contact, Message, ZernioChannel

logger = logging.getLogger(__name__)

# The Zernio sandbox WhatsApp account (+1 202 908 7457) and the owner's own
# demo number. Sandbox sessions can only message opted-in numbers; this list
# is the code-level hard limit on top of that.
SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c"
SANDBOX_SEND_ALLOWLIST = frozenset({"27672347593"})

_TIMEOUT = 20


def _limits() -> tuple[int, int]:
    per_hour = int(getattr(settings, "RECEPTIONIST_MAX_SENDS_PER_HOUR", 60))
    per_day = int(getattr(settings, "RECEPTIONIST_MAX_SENDS_PER_DAY", 300))
    return per_hour, per_day


def over_budget(workspace) -> bool:
    """True when this workspace has used its hourly or daily send budget."""
    per_hour, per_day = _limits()
    now = timezone.now()
    sent = Message.objects.filter(workspace=workspace, direction=Message.Direction.OUTBOUND, is_draft=False)
    if sent.filter(created_at__gte=now - timedelta(hours=1)).count() >= per_hour:
        return True
    return sent.filter(created_at__gte=now - timedelta(days=1)).count() >= per_day


def may_send(channel: ZernioChannel, contact: Contact) -> bool:
    # Never message anyone who did not write to the business first.
    if not contact.messages.filter(direction=Message.Direction.INBOUND).exists():
        return False
    # The owner's sandbox demo stays locked to his own number.
    if channel.is_sandbox or channel.zernio_account_id == SANDBOX_ACCOUNT_ID:
        return contact.wa_id in SANDBOX_SEND_ALLOWLIST
    # A tenant's own number may answer its own customers.
    return True


def send_draft(channel: ZernioChannel, contact: Contact, message: Message) -> bool:
    """Send one stored draft through Zernio. Returns True when delivered to the API."""
    if not message.is_draft:
        return False
    if not may_send(channel, contact):
        logger.info("receptionist: send refused by reply-only guard (contact %s)", contact.id)
        return False
    if over_budget(channel.workspace):
        logger.warning("receptionist: workspace %s over send budget, draft held", channel.workspace_id)
        return False
    if not contact.zernio_conversation_id:
        logger.warning("receptionist: no conversation id for contact %s, cannot send", contact.id)
        return False
    url = f"{settings.ZERNIO_BASE_URL}/inbox/conversations/{contact.zernio_conversation_id}/messages"
    resp = httpx.post(
        url,
        headers={"Authorization": f"Bearer {settings.ZERNIO_API_KEY}"},
        json={"accountId": channel.zernio_account_id, "message": message.body},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json() if resp.content else {}
    zernio_id = str((data.get("message") or {}).get("id") or data.get("messageId") or data.get("id") or "")
    message.is_draft = False
    if zernio_id:
        message.zernio_message_id = zernio_id
    message.save(update_fields=["is_draft", "zernio_message_id"])
    logger.info("receptionist: reply sent to %s (conversation %s)", contact.wa_id, contact.zernio_conversation_id)
    return True
