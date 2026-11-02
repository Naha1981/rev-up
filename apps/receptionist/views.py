"""Receptionist screens: self-onboarding + the conversation inbox.

Workspace members set up their business profile (industry, hours, prices in
rand, rules) and watch the receptionist work: inbound messages, drafted
replies, intake records, and contacts waiting on a human.
"""

import json
import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core import signing
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods

from apps.members.models import WorkspaceMembership
from apps.workspaces.models import Workspace

from .models import (
    Booking,
    BusinessProfile,
    CalendarConnection,
    Contact,
    DentalAppointment,
    FuneralClaim,
    Industry,
    Message,
    Quote,
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
            "google_review_url": (request.POST.get("google_review_url") or "").strip(),
            "review_requests_enabled": request.POST.get("review_requests_enabled") == "1",
            "emergency_contact_phone": (request.POST.get("emergency_contact_phone") or "").strip(),
            "custom_rules": (request.POST.get("custom_rules") or "").strip(),
        }
        call_out = (request.POST.get("call_out_fee") or "").strip()
        defaults["call_out_fee"] = call_out or None
        BusinessProfile.objects.update_or_create(workspace=workspace, defaults=defaults)
        messages.success(request, "Receptionist settings saved.")
        return redirect("receptionist:inbox", workspace_id=workspace.id)

    from .models import WORKSPACE_INDUSTRY_MAP

    selected_industry = (
        profile.industry if profile else WORKSPACE_INDUSTRY_MAP.get(workspace.industry, Industry.GENERAL)
    )
    pricing_text = _pricing_lines(profile.pricing_data) if profile and profile.pricing_data else ""
    hours_text = ""
    if profile and profile.operating_hours:
        hours_text = profile.operating_hours.get("text", "")
    channel = ZernioChannel.objects.filter(workspace=workspace).first()
    from . import calendar_sync

    calendar = CalendarConnection.objects.filter(workspace=workspace).first()
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
            "selected_industry": selected_industry,
            "pricing_text": pricing_text,
            "hours_text": hours_text,
            "channel": channel,
            "wa_accounts": wa_accounts,
            "reviews_available": _reviews_available(workspace),
            "calendar": calendar,
            "calendar_ready": calendar_sync.configured(),
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
        from . import calendar_sync

        slot = calendar_sync.booking_slot(booking)
        if slot is not None:
            clash = calendar_sync.slot_conflicts(workspace, slot, booking.duration_minutes)
            if clash is not None:
                who = clash.contact.name or clash.contact.wa_id
                messages.error(
                    request,
                    f"That time is already taken by {who} ({clash.service or 'booking'} "
                    f"at {timezone.localtime(clash.scheduled_start):%H:%M}). Use Change time to pick another slot.",
                )
                return redirect("receptionist:bookings", workspace_id=workspace.id)
            booking.scheduled_start = slot
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=["status", "scheduled_start"])
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
        delivered = False
        if channel is not None:
            from .sending import send_draft

            try:
                delivered = send_draft(channel, booking.contact, reply)
            except Exception:
                logger.exception("receptionist: booking confirmation send failed for %s", booking.contact.id)
        conn = CalendarConnection.objects.filter(workspace=workspace).first()
        if conn is not None:
            calendar_sync.create_booking_event(conn, booking)
        if delivered:
            messages.success(request, "Booking confirmed and the customer has been told on WhatsApp.")
        else:
            messages.success(
                request,
                "Booking confirmed. The WhatsApp confirmation was not sent - it is saved as a draft in the inbox.",
            )
    elif action == "done" and booking.status == Booking.Status.CONFIRMED:
        booking.status = Booking.Status.DONE
        booking.save(update_fields=["status"])
        # A finished job starts the review pipeline (check-in, review
        # request, reminder). A pipeline hiccup must never break the board.
        try:
            from . import reviews as _reviews

            _reviews.start_pipeline(booking)
        except Exception:
            logger.exception("reviews: pipeline start failed for booking %s", booking.id)
        messages.success(request, "Booking marked done.")
    elif action == "cancel" and booking.status in (Booking.Status.REQUESTED, Booking.Status.CONFIRMED):
        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status"])
        from . import calendar_sync

        conn = CalendarConnection.objects.filter(workspace=workspace).first()
        if conn is not None:
            calendar_sync.delete_booking_event(conn, booking)
        messages.success(request, "Booking cancelled and removed from the calendar.")
    elif action == "reschedule" and booking.status in (Booking.Status.REQUESTED, Booking.Status.CONFIRMED):
        from . import calendar_sync

        new_time = (request.POST.get("new_time") or "").strip()
        slot = (
            calendar_sync.booking_slot(
                booking,
            )
            if not new_time
            else None
        )
        if new_time:
            booking.preferred_time = new_time
            slot = calendar_sync.booking_slot(booking)
        if slot is None:
            messages.error(
                request,
                "I could not read a date or time in that. Try something like 'Tuesday 2pm' or '5 Nov 09:00'.",
            )
            return redirect("receptionist:bookings", workspace_id=workspace.id)
        clash = calendar_sync.slot_conflicts(workspace, slot, booking.duration_minutes, exclude_id=booking.id)
        if clash is not None:
            who = clash.contact.name or clash.contact.wa_id
            messages.error(
                request,
                f"That time is already taken by {who} ({clash.service or 'booking'} "
                f"at {timezone.localtime(clash.scheduled_start):%H:%M}). Pick another slot.",
            )
            return redirect("receptionist:bookings", workspace_id=workspace.id)
        booking.scheduled_start = slot
        booking.save(update_fields=["preferred_time", "scheduled_start"])
        if booking.status == Booking.Status.CONFIRMED:
            conn = CalendarConnection.objects.filter(workspace=workspace).first()
            if conn is not None:
                calendar_sync.update_booking_event(conn, booking)
            messages.success(
                request, f"Booking moved to {timezone.localtime(slot):%a %-d %b, %H:%M} and the calendar updated."
            )
        else:
            messages.success(request, f"Time saved: {timezone.localtime(slot):%a %-d %b, %H:%M}.")
    return redirect("receptionist:bookings", workspace_id=workspace.id)


def _parse_rand(raw: str) -> int | None:
    """'R1,500.00' / '1500' -> cents; None when not a clean positive amount."""
    cleaned = raw.strip().lstrip("Rr").replace(",", "").replace(" ", "")
    if not cleaned:
        return None
    try:
        value = Decimal(cleaned)
    except InvalidOperation:
        return None
    if value <= 0 or value > 10_000_000:
        return None
    return int(value * 100)


def _quote_message(profile, quote) -> str:
    what = quote.title or "the work"
    return (
        f"Hi {quote.customer_name}, your quote from {profile.business_name}: "
        f"{what} - R{quote.amount_rand}. Reply here to accept or with any questions."
    )


@login_required
def quotes(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    profile = BusinessProfile.objects.filter(workspace=workspace).first()
    if request.method == "POST":
        name = request.POST.get("customer_name", "").strip()
        title = request.POST.get("title", "").strip()
        phone = request.POST.get("phone", "").strip().lstrip("+").replace(" ", "")
        amount_cents = _parse_rand(request.POST.get("amount", ""))
        if not name:
            messages.error(request, "Add the customer's name.")
        elif amount_cents is None:
            messages.error(request, "Add the amount in rand, e.g. 1500 or R1,500.00.")
        else:
            contact = Contact.objects.filter(workspace=workspace, wa_id=phone).first() if phone else None
            Quote.objects.create(
                workspace=workspace,
                contact=contact,
                customer_name=name[:200],
                title=title[:200],
                amount_cents=amount_cents,
            )
            messages.success(request, f"Quote saved for {name}.")
        return redirect("receptionist:quotes", workspace_id=workspace.id)
    rows = Quote.objects.filter(workspace=workspace).select_related("contact")
    today = timezone.localdate()
    return render(
        request,
        "receptionist/quotes.html",
        {"workspace": workspace, "profile": profile, "quotes": rows, "today": today},
    )


@login_required
@require_http_methods(["POST"])
def quote_action(request, workspace_id, quote_id, action):
    workspace = _get_workspace(request, workspace_id)
    quote = get_object_or_404(Quote, id=quote_id, workspace=workspace)
    profile = BusinessProfile.objects.filter(workspace=workspace).first()
    today = timezone.localdate()

    if action == "send" and quote.status == Quote.Status.DRAFT:
        if profile is None:
            messages.error(request, "Set up your business profile first.")
            return redirect("receptionist:setup", workspace_id=workspace.id)
        quote.status = Quote.Status.SENT
        quote.sent_on = today
        quote.follow_up_on = today + timedelta(days=3)
        quote.save(update_fields=["status", "sent_on", "follow_up_on"])
        _send_quote_message(request, workspace, profile, quote, _quote_message(profile, quote))
        messages.success(request, f"Quote sent to {quote.customer_name}; follow-up due in 3 days.")
    elif action == "chase" and quote.status == Quote.Status.SENT:
        quote.follow_up_on = today + timedelta(days=3)
        quote.save(update_fields=["follow_up_on"])
        body = (
            f"Hi {quote.customer_name}, checking you received our quote for "
            f"{quote.title or 'the work'} (R{quote.amount_rand}). Happy to answer any questions."
        )
        _send_quote_message(request, workspace, profile, quote, body)
        messages.success(request, f"Follow-up sent to {quote.customer_name}; next chase in 3 days.")
    elif action == "won" and quote.status in (Quote.Status.DRAFT, Quote.Status.SENT):
        quote.status = Quote.Status.WON
        quote.save(update_fields=["status"])
        messages.success(request, f"Marked {quote.customer_name}'s quote as won.")
    elif action == "lost" and quote.status in (Quote.Status.DRAFT, Quote.Status.SENT):
        quote.status = Quote.Status.LOST
        quote.save(update_fields=["status"])
    return redirect("receptionist:quotes", workspace_id=workspace.id)


def _send_quote_message(request, workspace, profile, quote, body: str) -> None:
    """Send one quote-related WhatsApp message through the reply-only guard."""
    if profile is None:
        return
    if quote.contact is None:
        messages.warning(
            request,
            f"Saved, but {quote.customer_name} has not messaged you on WhatsApp yet - "
            "the quote text stays here until they do.",
        )
        return
    reply = Message.objects.create(
        workspace=workspace,
        contact=quote.contact,
        direction=Message.Direction.OUTBOUND,
        sender_type=Message.SenderType.HUMAN_AGENT,
        body=body,
        is_draft=True,
    )
    channel = ZernioChannel.objects.filter(workspace=workspace).first()
    if channel is None:
        return
    from .sending import send_draft

    try:
        send_draft(channel, quote.contact, reply)
    except Exception:
        logger.exception("receptionist: quote send failed for %s", quote.contact.id)


@login_required
@require_GET
def calendar_connect(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    from . import calendar_sync

    if not calendar_sync.configured():
        messages.error(request, "Calendar connection is not available yet - NahaLabs is enabling it.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    return redirect(calendar_sync.authorize_url(workspace.id, request.user.id))


@login_required
@require_http_methods(["POST"])
def calendar_disconnect(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    CalendarConnection.objects.filter(workspace=workspace).delete()
    messages.success(request, "Google Calendar disconnected.")
    return redirect("receptionist:setup", workspace_id=workspace.id)


@login_required
@require_GET
def calendar_callback(request):
    """Top-level OAuth callback: state carries the signed workspace + user."""
    from . import calendar_sync

    try:
        state = calendar_sync.read_state(request.GET.get("state", ""))
    except signing.BadSignature:
        raise PermissionDenied("Bad calendar connect state.") from None
    workspace = _get_workspace(request, state["ws"])
    if state["u"] != str(request.user.id):
        raise PermissionDenied("Calendar connect was started by someone else.")
    code = request.GET.get("code", "")
    if not code:
        messages.error(request, "Google did not complete the connection.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    tokens = calendar_sync.exchange_code(code)
    access = tokens.get("access_token", "")
    refresh = tokens.get("refresh_token", "")
    if not access or not refresh:
        messages.error(request, "Google did not return the access we need - please try connecting again.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    from django.utils import timezone as _tz

    CalendarConnection.objects.update_or_create(
        workspace=workspace,
        defaults={
            "google_email": calendar_sync.fetch_email(access),
            "access_token": access,
            "refresh_token": refresh,
            "token_expiry": _tz.now() + timedelta(seconds=int(tokens.get("expires_in", 3600))),
        },
    )
    messages.success(request, "Google Calendar connected - confirmed bookings now appear there.")
    return redirect("receptionist:setup", workspace_id=workspace.id)


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
    from apps.social_accounts.zernio_connect import (
        ZernioCapacityError,
        start_zernio_connect,
        zernio_ready,
    )
    from providers.zernio import ZernioError

    if not zernio_ready():
        messages.error(request, "Connecting is temporarily unavailable. Please try again later.")
        return redirect("receptionist:setup", workspace_id=workspace.id)
    try:
        return start_zernio_connect(request, workspace, "whatsapp")
    except ZernioCapacityError as exc:
        messages.warning(request, exc.user_message)
        return redirect("receptionist:setup", workspace_id=workspace.id)
    except ZernioError:
        messages.error(request, "Could not start the connection. Please try again.")
        return redirect("receptionist:setup", workspace_id=workspace.id)


def _reviews_available(workspace) -> bool:
    organization = getattr(workspace, "organization", None)
    if organization is None:
        return True
    from .reviews import REVIEW_PLANS

    return organization.plan in REVIEW_PLANS


# Link-preview crawlers fetch shared links without a person opening them.
# Counting those as clicks would cancel genuine reminders, so they are
# served the card but never recorded.
_PREVIEW_BOT_UA = (
    "whatsapp",
    "facebookexternalhit",
    "twitterbot",
    "slackbot",
    "telegrambot",
    "discordbot",
    "linkedinbot",
)


def review_redirect(request, code: str):
    """Public tracked review link.

    Humans get an instant redirect to the business's own review page.
    Chat apps only fetch the link to build a preview card, so the page
    carries clean business-branded card metadata (name, a short line, a
    neutral star image) and their fetch is never counted as a click.
    """
    from django.http import HttpResponseNotFound
    from django.shortcuts import render
    from django.templatetags.static import static

    from . import reviews as _reviews
    from .models import ReviewLink

    link = ReviewLink.objects.filter(short_code=code).select_related("workspace").first()
    if link is None:
        return HttpResponseNotFound("Link not found")
    ua = request.META.get("HTTP_USER_AGENT", "").lower()
    if not any(bot in ua for bot in _PREVIEW_BOT_UA):
        _reviews.record_click(code)
    card_image = request.build_absolute_uri(static("receptionist/review-card.png"))
    return render(
        request,
        "receptionist/review_redirect.html",
        {
            "business_name": link.workspace.name,
            "target_url": link.original_url,
            "card_image": card_image,
        },
    )
