"""WhatsApp campaigns: owner-approved sends to customer segments.

Segments (every customer, dormant 30+ days, VIPs), optional A/B variants,
owner approval, scheduling, delivery tracking and booking/revenue
attribution. Sends ride the same guards as every other outbound message:
only customers who wrote to the business before are messaged, opted-out
customers are skipped, and sends hold while no WhatsApp number is connected.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.utils import timezone

from .models import Campaign, CampaignRecipient, Contact, Message, ZernioChannel
from .reviews import HELD_RETRY_DELAY, OPT_OUT_FOOTER, _first_name
from .sending import over_budget, send_draft

logger = logging.getLogger(__name__)

DORMANT_DAYS = 30
ATTRIBUTION_WINDOW = timedelta(days=30)


def segment_contacts(workspace, segment: str):
    """Customers in the segment who have not opted out."""
    qs = Contact.objects.filter(workspace=workspace, opted_out=False)
    if segment == Campaign.Segment.DORMANT:
        cutoff = timezone.now() - timedelta(days=DORMANT_DAYS)
        qs = qs.filter(models.Q(last_visit_at__isnull=True) | models.Q(last_visit_at__lt=cutoff))
    elif segment == Campaign.Segment.VIP:
        qs = qs.filter(is_vip=True)
    return qs.order_by("created_at")


def create_campaign(workspace, name: str, segment: str, body_a: str, body_b: str = "") -> Campaign:
    if not name:
        raise ValueError("Give the campaign a name.")
    if segment not in Campaign.Segment.values:
        raise ValueError("Unknown segment.")
    if not body_a.strip():
        raise ValueError("Write the message first.")
    return Campaign.objects.create(
        workspace=workspace, name=name, segment=segment, body_a=body_a.strip(), body_b=body_b.strip()
    )


def approve(campaign: Campaign, when) -> None:
    """Owner approval: freeze the recipient list and queue the send."""
    if campaign.status != Campaign.Status.DRAFT:
        raise ValueError("Only a draft can be approved.")
    contacts = list(segment_contacts(campaign.workspace, campaign.segment))
    if not contacts:
        raise ValueError("No customers in this segment yet.")
    use_b = bool(campaign.body_b)
    CampaignRecipient.objects.bulk_create(
        CampaignRecipient(
            campaign=campaign,
            contact=contact,
            variant=CampaignRecipient.Variant.B if use_b and i % 2 else CampaignRecipient.Variant.A,
        )
        for i, contact in enumerate(contacts)
    )
    now = timezone.now()
    campaign.approved_at = now
    campaign.scheduled_at = when
    campaign.status = Campaign.Status.SCHEDULED if when > now else Campaign.Status.SENDING
    campaign.save(update_fields=["approved_at", "scheduled_at", "status"])
    from .tasks import run_campaign

    run_campaign(str(campaign.id), schedule=when)


def cancel(campaign: Campaign) -> bool:
    if campaign.status in (Campaign.Status.DRAFT, Campaign.Status.SCHEDULED):
        campaign.status = Campaign.Status.CANCELLED
        campaign.save(update_fields=["status"])
        return True
    return False


def _gate(workspace) -> tuple[bool, str]:
    if not ZernioChannel.objects.filter(workspace=workspace).exists():
        return False, "no connected WhatsApp number"
    if over_budget(workspace):
        return False, "over the send budget"
    return True, ""


def send_campaign(campaign: Campaign) -> str:
    """Send to every pending recipient. Returns sent|held|cancelled."""
    claimed = Campaign.objects.filter(
        id=campaign.id, status__in=[Campaign.Status.SCHEDULED, Campaign.Status.SENDING]
    ).update(status=Campaign.Status.SENDING)
    if not claimed:
        return "cancelled"

    allowed, reason = _gate(campaign.workspace)
    if not allowed:
        Campaign.objects.filter(id=campaign.id).update(status=Campaign.Status.SCHEDULED)
        from .tasks import run_campaign

        run_campaign(str(campaign.id), schedule=timezone.now() + HELD_RETRY_DELAY)
        logger.info("campaigns: campaign %s held (%s)", campaign.id, reason)
        return "held"

    channel = ZernioChannel.objects.filter(workspace=campaign.workspace).first()
    pending = campaign.recipients.filter(status=CampaignRecipient.Status.PENDING).select_related("contact")
    for recipient in pending:
        contact = recipient.contact
        if contact.opted_out:
            recipient.status = CampaignRecipient.Status.SKIPPED
            recipient.error = "opted out"
            recipient.save(update_fields=["status", "error"])
            continue
        body = campaign.body_b if recipient.variant == CampaignRecipient.Variant.B else campaign.body_a
        body = body.replace("{first name}", _first_name(contact))
        message = Message.objects.create(
            workspace=campaign.workspace,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.AI,
            body=body + OPT_OUT_FOOTER,
            is_draft=True,
        )
        recipient.message = message
        try:
            if send_draft(channel, contact, message):
                recipient.status = CampaignRecipient.Status.SENT
                recipient.sent_at = timezone.now()
            else:
                recipient.status = CampaignRecipient.Status.SKIPPED
                recipient.error = "held by the reply guard"
        except Exception as exc:
            recipient.status = CampaignRecipient.Status.FAILED
            recipient.error = str(exc)[:300]
            logger.exception("campaigns: recipient %s failed", recipient.id)
        recipient.save(update_fields=["status", "sent_at", "error", "message"])

    if not campaign.recipients.filter(status=CampaignRecipient.Status.PENDING).exists():
        Campaign.objects.filter(id=campaign.id).update(status=Campaign.Status.SENT)
    return "sent"


def attribute_booking(booking) -> None:
    """Link a finished booking to the campaign that brought the customer back."""
    recipient = (
        CampaignRecipient.objects.filter(
            campaign__workspace=booking.workspace,
            contact=booking.contact,
            status=CampaignRecipient.Status.SENT,
            sent_at__gte=timezone.now() - ATTRIBUTION_WINDOW,
            attributed_booking__isnull=True,
        )
        .order_by("-sent_at")
        .first()
    )
    if recipient is None:
        return
    recipient.attributed_booking = booking
    recipient.attributed_amount = booking.value or Decimal("0")
    recipient.save(update_fields=["attributed_booking", "attributed_amount"])


def stats(campaign: Campaign) -> dict:
    """Per-variant delivery and attribution numbers for the campaign screen."""

    def per(variant: str) -> dict:
        rows = [r for r in campaign.recipients.all() if r.variant == variant]
        return {
            "total": len(rows),
            "sent": sum(1 for r in rows if r.status == CampaignRecipient.Status.SENT),
            "failed": sum(1 for r in rows if r.status == CampaignRecipient.Status.FAILED),
            "skipped": sum(1 for r in rows if r.status == CampaignRecipient.Status.SKIPPED),
            "bookings": sum(1 for r in rows if r.attributed_booking_id),
            "revenue": sum((r.attributed_amount for r in rows), Decimal("0")),
        }

    return {"a": per(CampaignRecipient.Variant.A), "b": per(CampaignRecipient.Variant.B) if campaign.body_b else None}
