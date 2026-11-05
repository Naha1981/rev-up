"""Inbound WhatsApp messages from Zernio inbox webhooks.

message.received payloads carry an account block (accountId/profileId). The
channel lookup resolves the workspace BEFORE anything is written - an
unmapped account's messages are logged and dropped, never guessed onto a
tenant. Replies are drafted and stored with is_draft=True; nothing sends
until live sending is enabled and approved.
"""

from __future__ import annotations

import datetime as _dt
import logging

from django.conf import settings
from django.db import transaction

from .models import Contact, Industry, Message, ZernioChannel
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
    media_urls = _extract_media_urls(message)
    if not wa_id or (not body and not media_urls):
        return
    if not body and media_urls:
        # Media-only message: the stored body keeps the inbox readable.
        body = f"[{len(media_urls)} photo{'s' if len(media_urls) != 1 else ''} received]"
    conversation = payload.get("conversation") or {}
    sender_name = sender.get("name") or conversation.get("participantName") or ""
    zernio_message_id = str(message.get("_id") or message.get("id") or "")

    with transaction.atomic():
        conversation_id = str(conversation.get("id") or conversation.get("conversationId") or "")
        contact, created = Contact.objects.get_or_create(
            workspace=workspace,
            wa_id=wa_id,
            defaults={"name": sender_name, "zernio_conversation_id": conversation_id},
        )
        if not created and conversation_id and contact.zernio_conversation_id != conversation_id:
            contact.zernio_conversation_id = conversation_id
            contact.save(update_fields=["zernio_conversation_id", "updated_at"])
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
            media_urls=media_urls,
            zernio_message_id=zernio_message_id,
        )
        if media_urls:
            _alert_owner_media_intake(workspace, contact, media_urls)

    # Opt-out keywords cancel the review pipeline immediately and block any
    # restart without fresh consent; the stored inbound message is the record.
    from . import reviews as _reviews

    if body.strip().upper() in _reviews.OPT_OUT_KEYWORDS:
        _reviews.unsubscribe_contact(contact)
        return

    # A negative reply right after the pipeline check-in or the review
    # request flags an issue for the owner. It never suppresses the review
    # request (Google policy).
    if contact.review_status in ("check_in_sent", "review_requested") and _reviews.looks_negative(body):
        _reviews.flag_issue(contact, body)

    # A customer who wrote again is the safest moment to clear any held
    # replies (send budget was exhausted, or the provider was down).
    from django.utils import timezone as _tz

    from .sending import send_draft

    pending = contact.messages.filter(
        direction=Message.Direction.OUTBOUND,
        is_draft=True,
        created_at__gte=_tz.now() - _dt.timedelta(hours=48),
    ).order_by("created_at")[:5]
    for held in pending:
        try:
            send_draft(channel, contact, held)
        except Exception:
            logger.exception("receptionist: held reply retry failed for contact %s", contact.id)
            break

    # Per-tenant draft budget: one abusive or runaway tenant must not burn the
    # shared free AI quota. Past the cap the conversation stays in the inbox
    # flagged for a human instead of getting an AI reply.
    # Tier allowance first: past the org's monthly reply allowance the
    # conversation flips to a human - no AI spend, no silent failure.
    from .limits import replies_over_allowance

    if replies_over_allowance(workspace.organization):
        if not contact.needs_human:
            contact.needs_human = True
            contact.save(update_fields=["needs_human", "updated_at"])
        logger.info("receptionist: workspace %s at monthly reply allowance, human flagged", workspace.id)
        return

    max_drafts = int(getattr(settings, "RECEPTIONIST_MAX_DRAFTS_PER_DAY", 300))
    today_count = Message.objects.filter(
        workspace=workspace,
        direction=Message.Direction.OUTBOUND,
        sender_type=Message.SenderType.AI,
        created_at__gte=_tz.now() - _dt.timedelta(days=1),
    ).count()
    if today_count >= max_drafts:
        if not contact.needs_human:
            contact.needs_human = True
            contact.save(update_fields=["needs_human", "updated_at"])
        logger.warning("receptionist: workspace %s over draft budget, human flagged", workspace.id)
        return

    history = [(m.sender_type, m.body) for m in contact.messages.order_by("-created_at")[:12]]
    history.reverse()
    incoming = body
    if media_urls:
        incoming = f"[Customer sent {len(media_urls)} photo{'s' if len(media_urls) != 1 else ''}] {body}".strip()
    try:
        draft = draft_reply(profile, history[:-1], incoming, contact=contact)
    except Exception:
        logger.exception("receptionist: reply drafting failed for workspace %s", workspace.id)
        return

    with transaction.atomic():
        if draft.escalate and not contact.needs_human:
            contact.needs_human = True
            contact.save(update_fields=["needs_human", "updated_at"])
        outbound = Message.objects.create(
            workspace=workspace,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.AI,
            body=draft.body,
            is_draft=True,
        )
        _apply_intake(workspace, contact, profile.industry, draft.intake)

    try:
        send_draft(channel, contact, outbound)
    except Exception:
        logger.exception("receptionist: send failed for contact %s", contact.id)


def _extract_media_urls(message: dict) -> list[str]:
    """Photo/file URLs from a Zernio message payload (any attachment shape)."""
    urls: list[str] = []
    for item in message.get("attachments") or []:
        if isinstance(item, str):
            urls.append(item)
        elif isinstance(item, dict):
            url = item.get("url") or item.get("mediaUrl") or item.get("link") or item.get("src") or ""
            if url:
                urls.append(str(url))
    return urls[:10]


def _alert_owner_media_intake(workspace, contact, media_urls: list[str]) -> None:
    """Tell the owner/managers a customer sent photos, with the conversation link."""
    try:
        from apps.members.models import WorkspaceMembership
        from apps.notifications.engine import notify
        from apps.notifications.models import EventType

        members = WorkspaceMembership.objects.filter(
            workspace=workspace, workspace_role__in=["owner", "manager"]
        ).select_related("user")
        for membership in members:
            notify(
                membership.user,
                EventType.RECEPTIONIST_MEDIA_INTAKE,
                f"Photos received from {contact.name or contact.wa_id}",
                f"{len(media_urls)} photo{'s' if len(media_urls) != 1 else ''} arrived on WhatsApp. "
                "Open the receptionist inbox to view and assess them.",
                data={"contact_id": str(contact.id), "media_urls": media_urls},
            )
    except Exception:
        logger.exception("receptionist: owner media alert failed for workspace %s", workspace.id)


def _apply_intake(workspace, contact, industry: str, intake: dict) -> None:
    """Create an industry intake record when the customer gave usable detail."""
    if not intake or not any(intake.values()):
        return
    from .models import Booking, DentalAppointment, FuneralClaim, TradeDispatch

    detail = (intake.get("detail") or "").strip()
    if industry == Industry.RESTAURANT and detail.isdigit():
        # The model sometimes lifts just the party size out of "table for
        # two"; "Table for 2" reads correctly on the board and in the
        # confirmation reply.
        detail = f"Table for {detail}"
    preferred = (intake.get("preferred_time") or "").strip()
    if detail or preferred:
        Booking.objects.create(
            workspace=workspace, contact=contact, service=detail[:200], preferred_time=preferred[:200]
        )

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
