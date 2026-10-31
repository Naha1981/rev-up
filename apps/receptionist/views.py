"""Receptionist screens: self-onboarding + the conversation inbox.

Workspace members set up their business profile (industry, hours, prices in
rand, rules) and watch the receptionist work: inbound messages, drafted
replies, intake records, and contacts waiting on a human.
"""

import json
import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_http_methods

from apps.members.models import WorkspaceMembership
from apps.workspaces.models import Workspace

from .models import (
    Booking,
    BusinessProfile,
    Contact,
    DentalAppointment,
    FuneralClaim,
    Industry,
    Message,
    TradeDispatch,
    ZernioChannel,
)

logger = logging.getLogger(__name__)


def _parse_pricing(raw: str) -> dict | None:
    """One service per line: 'Check-up and clean: R850'. JSON objects still accepted."""
    raw = raw.strip()
    if not raw:
        return {}
    if raw.startswith("{"):
        try:
            data = json.loads(raw)
        except ValueError:
            return None
        return data if isinstance(data, dict) else None
    pricing: dict[str, str] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        if ":" not in line:
            return None
        name, price = line.rsplit(":", 1)
        name, price = name.strip(), price.strip()
        if not name or not price:
            return None
        pricing[name] = price
    return pricing


def _pricing_lines(pricing: dict) -> str:
    return "\n".join(f"{name}: {price}" for name, price in pricing.items())


def _get_workspace(request, workspace_id):
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise PermissionDenied("You are not a member of this workspace.")
    return workspace


@login_required
@require_http_methods(["GET", "POST"])
def setup(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    profile = getattr(workspace, "receptionist_profile", None)

    if request.method == "POST":
        industry = request.POST.get("industry") or Industry.GENERAL
        if industry not in Industry.values:
            industry = Industry.GENERAL
        pricing_raw = (request.POST.get("pricing_data") or "").strip()
        pricing = _parse_pricing(pricing_raw)
        if pricing is None:
            messages.error(request, "Price list: one service per line, like Check-up and clean: R850")
            return redirect("receptionist:setup", workspace_id=workspace.id)
        hours = (request.POST.get("operating_hours") or "").strip()
        defaults = {
            "industry": industry,
            "business_name": (request.POST.get("business_name") or workspace.name).strip(),
            "operating_hours": {"text": hours} if hours else {},
            "pricing_data": pricing,
            "payment_link_url": (request.POST.get("payment_link_url") or "").strip(),
            "emergency_contact_phone": (request.POST.get("emergency_contact_phone") or "").strip(),
            "custom_rules": (request.POST.get("custom_rules") or "").strip(),
        }
        call_out = (request.POST.get("call_out_fee") or "").strip()
        defaults["call_out_fee"] = call_out or None
        BusinessProfile.objects.update_or_create(workspace=workspace, defaults=defaults)
        messages.success(request, "Receptionist settings saved.")
        return redirect("receptionist:inbox", workspace_id=workspace.id)

    pricing_text = _pricing_lines(profile.pricing_data) if profile and profile.pricing_data else ""
    hours_text = ""
    if profile and profile.operating_hours:
        hours_text = profile.operating_hours.get("text", "")
    channel = ZernioChannel.objects.filter(workspace=workspace).first()
    wa_accounts: list[dict] = []
    connect_ready = False
    if channel is None:
        from apps.social_accounts.zernio_connect import zernio_ready

        connect_ready = zernio_ready()
        from apps.social_accounts.models import WorkspaceProviderProfile

        provider = WorkspaceProviderProfile.objects.filter(workspace=workspace, provider="zernio").first()
        if provider:
            from providers.zernio import ZernioClient, ZernioError

            try:
                with ZernioClient() as client:
                    wa_accounts = [
                        {
                            "id": a.get("_id") or a.get("id"),
                            "label": a.get("username") or a.get("phoneNumber") or a.get("name") or "WhatsApp number",
                        }
                        for a in client.list_accounts(profile_id=provider.profile_id, platform="whatsapp")
                    ]
            except ZernioError:
                wa_accounts = []
    return render(
        request,
        "receptionist/setup.html",
        {
            "workspace": workspace,
            "profile": profile,
            "industries": Industry.choices,
            "pricing_text": pricing_text,
            "hours_text": hours_text,
            "channel": channel,
            "wa_accounts": wa_accounts,
            "connect_ready": connect_ready,
        },
    )


@login_required
@require_GET
def inbox(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    profile = getattr(workspace, "receptionist_profile", None)
    contacts = (
        Contact.objects.filter(workspace=workspace)
        .prefetch_related("messages")
        .order_by("needs_human" and "needs_human" or "", "-updated_at")
    )
    contacts = sorted(
        contacts,
        key=lambda c: (not c.needs_human, -(c.messages.last().created_at.timestamp() if c.messages.last() else 0)),
    )
    return render(
        request,
        "receptionist/inbox.html",
        {
            "workspace": workspace,
            "profile": profile,
            "contacts": contacts,
            "funeral_claims": FuneralClaim.objects.filter(workspace=workspace).order_by("-created_at")[:20],
            "dental_appointments": DentalAppointment.objects.filter(workspace=workspace).order_by("-created_at")[:20],
            "trade_dispatches": TradeDispatch.objects.filter(workspace=workspace).order_by("-created_at")[:20],
        },
    )


@login_required
@require_GET
def conversation(request, workspace_id, contact_id):
    workspace = _get_workspace(request, workspace_id)
    contact = get_object_or_404(Contact, id=contact_id, workspace=workspace)
    return render(
        request,
        "receptionist/conversation.html",
        {"workspace": workspace, "contact": contact, "msgs": contact.messages.all()},
    )


@login_required
@require_GET
def bookings(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    rows = Booking.objects.filter(workspace=workspace).select_related("contact")
    return render(request, "receptionist/bookings.html", {"workspace": workspace, "bookings": rows})


@login_required
@require_http_methods(["POST"])
def booking_action(request, workspace_id, booking_id, action):
    workspace = _get_workspace(request, workspace_id)
    booking = get_object_or_404(Booking, id=booking_id, workspace=workspace)
    if action == "confirm" and booking.status == Booking.Status.REQUESTED:
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=["status"])
        when = booking.preferred_time or "the requested time"
        what = booking.service or "your booking"
        reply = Message.objects.create(
            workspace=workspace,
            contact=booking.contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.HUMAN_AGENT,
            body=f"Good news - {what} is confirmed for {when}. Reply here if anything changes.",
            is_draft=True,
        )
        channel = ZernioChannel.objects.filter(workspace=workspace).first()
        if channel is not None:
            from .sending import send_draft

            try:
                send_draft(channel, booking.contact, reply)
            except Exception:
                logger.exception("receptionist: booking confirmation send failed for %s", booking.contact.id)
        messages.success(request, "Booking confirmed and the customer has been told on WhatsApp.")
    elif action == "cancel" and booking.status in (Booking.Status.REQUESTED, Booking.Status.CONFIRMED):
        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status"])
        messages.success(request, "Booking cancelled.")
    return redirect("receptionist:bookings", workspace_id=workspace.id)


@login_required
@require_http_methods(["POST"])
def bind_whatsapp(request, workspace_id):
    """Bind a WhatsApp number already connected to this workspace's provider profile."""
    workspace = _get_workspace(request, workspace_id)
    account_id = (request.POST.get("account_id") or "").strip()
    if not account_id:
        messages.error(request, "Choose a number first.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    from apps.social_accounts.models import WorkspaceProviderProfile
    from providers.zernio import ZernioClient, ZernioError

    provider = WorkspaceProviderProfile.objects.filter(workspace=workspace, provider="zernio").first()
    if provider is None:
        messages.error(request, "Connect a WhatsApp number first.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    try:
        with ZernioClient() as client:
            accounts = client.list_accounts(profile_id=provider.profile_id, platform="whatsapp")
    except ZernioError:
        messages.error(request, "Could not reach the connection service. Please try again.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    match = next((a for a in accounts if (a.get("_id") or a.get("id")) == account_id), None)
    if match is None:
        messages.error(request, "That number is not connected to this workspace.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    ZernioChannel.objects.update_or_create(
        workspace=workspace,
        defaults={
            "zernio_account_id": account_id,
            "zernio_profile_id": provider.profile_id,
            "phone_number": (match.get("username") or match.get("phoneNumber") or "").lstrip("+"),
            "label": match.get("name") or "WhatsApp",
        },
    )
    messages.success(request, "WhatsApp connected. Your receptionist is live on this number.")
    return redirect("receptionist:setup", workspace_id=workspace.id)


@login_required
@require_http_methods(["POST"])
def connect_whatsapp(request, workspace_id):
    """Start the hosted WhatsApp connect flow for this workspace."""
    workspace = _get_workspace(request, workspace_id)
    from apps.social_accounts.zernio_connect import start_zernio_connect, zernio_ready
    from providers.zernio import ZernioError

    if not zernio_ready():
        messages.error(request, "Connecting is temporarily unavailable. Please try again later.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    try:
        return start_zernio_connect(request, workspace, "whatsapp")
    except ZernioError:
        messages.error(request, "Could not start the connection. Please try again.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
