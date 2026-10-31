"""Sandbox-limited WhatsApp sending for the receptionist.

Approved scope (owner, 2026-10-31 19:53): the Zernio SANDBOX account may send
receptionist replies to the owner's own opted-in demo number ONLY. Real
customer numbers stay drafts until separately approved. Both conditions are
checked here on every send - there is no flag that widens this.
"""

from __future__ import annotations

import logging

import httpx
from django.conf import settings

from .models import Contact, Message, ZernioChannel

logger = logging.getLogger(__name__)

# The Zernio sandbox WhatsApp account (+1 202 908 7457) and the owner's own
# demo number. Sandbox sessions can only message opted-in numbers; this list
# is the code-level hard limit on top of that.
SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c"
SANDBOX_SEND_ALLOWLIST = frozenset({"27672347593"})

_TIMEOUT = 20


def may_send(channel: ZernioChannel, contact: Contact) -> bool:
    return channel.zernio_account_id == SANDBOX_ACCOUNT_ID and contact.wa_id in SANDBOX_SEND_ALLOWLIST


def send_draft(channel: ZernioChannel, contact: Contact, message: Message) -> bool:
    """Send one stored draft through Zernio. Returns True when delivered to the API."""
    if not message.is_draft:
        return False
    if not may_send(channel, contact):
        logger.info("receptionist: send refused by sandbox guard (contact %s)", contact.id)
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
    logger.info(
        "receptionist: sandbox reply sent to %s (conversation %s)", contact.wa_id, contact.zernio_conversation_id
    )
    return True
