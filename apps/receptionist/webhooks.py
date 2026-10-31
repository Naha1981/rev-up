"""Inbound WhatsApp messages from Zernio inbox webhooks.

message.received payloads carry an account block (accountId/profileId). The
channel lookup resolves the workspace BEFORE anything is written - an
unmapped account's messages are logged and dropped, never guessed onto a
tenant. Replies are drafted and stored with is_draft=True; nothing sends
until live sending is enabled and approved.
"""

from __future__ import annotations

import logging

from django.db import transaction

from .models import Contact, Message, ZernioChannel
from .services import draft_reply

logger = logging.getLogger(__name__)

_INBOX_EVENTS = {"message.received"}


def handles(event_type: str) -> bool:
    return event_type in _INBOX_EVENTS


def handle_inbox_message(payload: dict) -> None:
    message = payload.get("message") or {}
    account = message.get("account") or payload.get("account") or {}
    account_id = account.get("accountId") or account.get("_id") or ""
    if not account_id:
        logger.info("receptionist: inbox event without account id, dropped")
        return
    channel = ZernioChannel.objects.select_related("workspace").filter(zernio_account_id=account_id).first()
    if channel is None:
        logger.info("receptionist: inbox event for unmapped Zernio account %s, dropped", account_id)
        return
    workspace = channel.workspace
    profile = getattr(workspace, "receptionist_profile", None)
    if profile is None or not profile.is_active:
        return

    direction = message.get("direction") or ("outbound" if message.get("fromMe") else "inbound")
    if direction not in ("inbound", "incoming"):
        return
    sender = message.get("sender") or {}
    if isinstance(sender, str):
        sender = {"id": sender}
    wa_id = (sender.get("phoneNumber") or "").lstrip("+") or str(sender.get("id") or "").split("@")[0].lstrip("+")
    body = (message.get("text") or message.get("body") or "").strip()
    if not wa_id or not body:
        return
    conversation = payload.get("conversation") or {}
    sender_name = sender.get("name") or conversation.get("participantName") or ""
    zernio_message_id = str(message.get("_id") or message.get("id") or "")

    with transaction.atomic():
        contact, _ = Contact.objects.get_or_create(
            workspace=workspace,
            wa_id=wa_id,
            defaults={"name": sender_name},
        )
        if (
            zernio_message_id
            and Message.objects.filter(workspace=workspace, zernio_message_id=zernio_message_id).exists()
        ):
            return
        Message.objects.create(
            workspace=workspace,
            contact=contact,
            direction=Message.Direction.INBOUND,
            sender_type=Message.SenderType.USER,
            body=body,
            zernio_message_id=zernio_message_id,
        )

    history = [(m.sender_type, m.body) for m in contact.messages.order_by("-created_at")[:12]]
    history.reverse()
    try:
        draft = draft_reply(profile, history[:-1], body)
    except Exception:
        logger.exception("receptionist: reply drafting failed for workspace %s", workspace.id)
        return

    with transaction.atomic():
        if draft.escalate and not contact.needs_human:
            contact.needs_human = True
            contact.save(update_fields=["needs_human", "updated_at"])
        Message.objects.create(
            workspace=workspace,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.AI,
            body=draft.body,
            is_draft=True,
        )
        _apply_intake(workspace, contact, profile.industry, draft.intake)


def _apply_intake(workspace, contact, industry: str, intake: dict) -> None:
    """Create an industry intake record when the customer gave usable detail."""
    if not intake or not any(intake.values()):
        return
    from .models import DentalAppointment, FuneralClaim, TradeDispatch

    name = (intake.get("name") or "").strip()
    detail = (intake.get("detail") or "").strip()
    if industry == "funeral" and (name or detail or intake.get("policy_number")):
        FuneralClaim.objects.create(
            workspace=workspace,
            contact=contact,
            deceased_name=detail[:200],
            claimant_name=name[:200],
            policy_number=(intake.get("policy_number") or "")[:64],
        )
    elif industry == "dental" and (name or detail):
        DentalAppointment.objects.create(
            workspace=workspace, contact=contact, patient_name=name[:200], reason=detail[:300]
        )
    elif industry == "trades" and (detail or intake.get("address")):
        TradeDispatch.objects.create(
            workspace=workspace,
            contact=contact,
            job_type=detail[:120],
            address=(intake.get("address") or "")[:300],
        )
