"""Review-request pipeline, ported from the tested RepEngine engine.

Flow per completed booking: +15 min check-in, +2 h review request with a
tracked /r/<code> link to the business's own Google review page, +48 h
reminder. The reminder is cancelled when the link is clicked or the
customer opts out. Google policy (support.google.com/contributionpolicy/
answer/7400114): a negative check-in reply flags the customer for personal
follow-up but does NOT suppress the review request. Only STOP stops it.

Send gates (ALL must pass, else the event stays scheduled and is retried):
the global REVIEW_AUTOMATION_ENABLED flag (default off), the owner switch
on the receptionist setup page, the workspace plan covering review
requests, and a connected WhatsApp number. Messages go out as the
business, through the same guarded send path as receptionist replies.
"""

from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Booking, Contact, Message, ReviewEvent, ReviewLink, ZernioChannel
from .sending import send_draft

logger = logging.getLogger(__name__)

CHECK_IN_DELAY = timedelta(minutes=15)
REVIEW_REQUEST_DELAY = timedelta(hours=2)
REMINDER_DELAY = timedelta(hours=48)
HELD_RETRY_DELAY = timedelta(minutes=15)

# Plans that include the review-request pipeline. Suggested: Growth and up
# (follow-up is the Growth lifecycle promise); Business Pro keeps
# auto-posting on top.
REVIEW_PLANS = frozenset({"growth", "business-pro"})

OPT_OUT_FOOTER = "\nReply STOP to opt out."
OPT_OUT_KEYWORDS = frozenset({"STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"})

# A reply with any of these right after the check-in flags an issue for the
# owner. Deliberately simple and free (no AI spend on classification).
NEGATIVE_KEYWORDS = frozenset(
    {
        "not happy",
        "unhappy",
        "not satisfied",
        "terrible",
        "awful",
        "horrible",
        "worst",
        "bad service",
        "poor service",
        "disappointed",
        "complaint",
        "problem",
        "broken",
        "not fixed",
        "still leaking",
        "refund",
        "useless",
        "angry",
    }
)


def _first_name(contact: Contact) -> str:
    name = (contact.name or "").strip()
    return name.split()[0] if name else "there"


def _business_name(workspace) -> str:
    profile = getattr(workspace, "receptionist_profile", None)
    return (profile.business_name if profile else "") or workspace.name


def check_in_message(workspace, contact: Contact) -> str:
    return (
        f"Hey {_first_name(contact)}, this is {_business_name(workspace)}. "
        "Just checking in to make sure everything looks good with the work we did today."
    )


def review_request_message(workspace, contact: Contact, link: str) -> str:
    return (
        f"Hi {_first_name(contact)}, {_business_name(workspace)} here. "
        "Just wanted to say thanks again for the opportunity. If you have 30 seconds, "
        "would you mind sharing your experience in a quick Google review? "
        f"It helps other customers know they can trust us: {link}"
    )


def reminder_message(workspace, contact: Contact, link: str) -> str:
    return (
        f"Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review: {link}"
    )


def looks_negative(body: str) -> bool:
    text = body.lower()
    return any(word in text for word in NEGATIVE_KEYWORDS)


class ReviewConfigError(Exception):
    """The workspace is missing setup the pipeline needs (e.g. review link)."""


def automation_enabled() -> bool:
    return bool(getattr(settings, "REVIEW_AUTOMATION_ENABLED", False))


def review_gate(workspace) -> tuple[bool, str]:
    """All conditions for a real send; first failing reason returned."""
    if not automation_enabled():
        return False, "review automation is off globally"
    profile = getattr(workspace, "receptionist_profile", None)
    if profile is None or not profile.review_requests_enabled:
        return False, "review requests are off for this workspace"
    organization = getattr(workspace, "organization", None)
    if organization is not None and organization.plan not in REVIEW_PLANS:
        return False, f"plan {organization.plan} does not include review requests"
    if not ZernioChannel.objects.filter(workspace=workspace).exists():
        return False, "no connected WhatsApp number"
    return True, ""


def tracked_url(short_code: str) -> str:
    base = (settings.APP_URL or "").rstrip("/")
    return f"{base}/r/{short_code}"


def _schedule_event(workspace, contact: Contact, booking: Booking | None, step: str, when) -> ReviewEvent:
    event = ReviewEvent.objects.create(
        workspace=workspace,
        contact=contact,
        booking=booking,
        step=step,
        scheduled_for=when,
    )
    from .tasks import run_review_event

    run_review_event(str(event.id), schedule=when)
    return event


def start_pipeline(booking: Booking) -> ReviewEvent | None:
    """A booking was marked Done: schedule the +15 min check-in.

    An opted-out customer is never restarted without fresh consent.
    """
    contact = booking.contact
    if contact.opted_out:
        logger.warning(
            "reviews: booking %s done but contact %s opted out; pipeline not started",
            booking.id,
            contact.id,
        )
        return None
    return _schedule_event(
        booking.workspace, contact, booking, ReviewEvent.Step.CHECK_IN, timezone.now() + CHECK_IN_DELAY
    )


def _ensure_link(workspace, contact: Contact) -> ReviewLink:
    existing = ReviewLink.objects.filter(contact=contact).first()
    if existing is not None:
        return existing
    profile = getattr(workspace, "receptionist_profile", None)
    url = (profile.google_review_url if profile else "") or ""
    if not url:
        raise ReviewConfigError("No Google review link set on the receptionist setup page.")
    for _ in range(5):
        code = secrets.token_urlsafe(6)[:8]
        if not ReviewLink.objects.filter(short_code=code).exists():
            return ReviewLink.objects.create(workspace=workspace, contact=contact, short_code=code, original_url=url)
    raise ReviewConfigError("Could not allocate a short link code.")


def cancel_pending(contact: Contact, step: str | None = None) -> int:
    pending = ReviewEvent.objects.filter(contact=contact, status=ReviewEvent.Status.SCHEDULED)
    if step is not None:
        pending = pending.filter(step=step)
    return pending.update(status=ReviewEvent.Status.CANCELLED)


def _deliver(workspace, contact: Contact, body: str) -> None:
    channel = ZernioChannel.objects.filter(workspace=workspace).first()
    if channel is None:
        raise ReviewConfigError("No connected WhatsApp number.")
    message = Message.objects.create(
        workspace=workspace,
        contact=contact,
        direction=Message.Direction.OUTBOUND,
        sender_type=Message.SenderType.AI,
        body=body,
        is_draft=True,
    )
    if not send_draft(channel, contact, message):
        raise ReviewConfigError("Send refused by the reply guard or send budget.")


def send_event(event: ReviewEvent) -> str:
    """Run one due pipeline step. Returns sent|cancelled|failed|held."""
    claimed = ReviewEvent.objects.filter(id=event.id, status=ReviewEvent.Status.SCHEDULED).update(
        status=ReviewEvent.Status.SENDING
    )
    if not claimed:
        return "cancelled"  # another runner took it, or it was cancelled

    contact = event.contact
    workspace = event.workspace

    if contact.opted_out:
        ReviewEvent.objects.filter(id=event.id).update(status=ReviewEvent.Status.CANCELLED)
        cancel_pending(contact)
        return "cancelled"

    allowed, reason = review_gate(workspace)
    if not allowed:
        ReviewEvent.objects.filter(id=event.id).update(status=ReviewEvent.Status.SCHEDULED)
        logger.info("reviews: event %s held (%s)", event.id, reason)
        return "held"

    try:
        if event.step == ReviewEvent.Step.CHECK_IN:
            _deliver(workspace, contact, check_in_message(workspace, contact) + OPT_OUT_FOOTER)
            if contact.review_status != "issue_flagged":
                contact.review_status = "check_in_sent"
                contact.save(update_fields=["review_status", "updated_at"])
            _schedule_event(
                workspace,
                contact,
                event.booking,
                ReviewEvent.Step.REVIEW_REQUEST,
                timezone.now() + REVIEW_REQUEST_DELAY,
            )
        elif event.step == ReviewEvent.Step.REVIEW_REQUEST:
            link = _ensure_link(workspace, contact)
            _deliver(
                workspace,
                contact,
                review_request_message(workspace, contact, tracked_url(link.short_code)) + OPT_OUT_FOOTER,
            )
            if contact.review_status != "issue_flagged":
                contact.review_status = "review_requested"
                contact.save(update_fields=["review_status", "updated_at"])
            _schedule_event(
                workspace, contact, event.booking, ReviewEvent.Step.REMINDER, timezone.now() + REMINDER_DELAY
            )
        else:  # REMINDER
            found = ReviewLink.objects.filter(contact=contact).first()
            if found is not None and found.clicked_at is not None:
                ReviewEvent.objects.filter(id=event.id).update(status=ReviewEvent.Status.CANCELLED)
                return "cancelled"
            if found is None:
                raise ReviewConfigError("No tracked link exists for this contact.")
            _deliver(
                workspace, contact, reminder_message(workspace, contact, tracked_url(found.short_code)) + OPT_OUT_FOOTER
            )
    except Exception as exc:
        ReviewEvent.objects.filter(id=event.id).update(status=ReviewEvent.Status.FAILED, error=str(exc)[:500])
        logger.exception("reviews: event %s failed", event.id)
        return "failed"

    ReviewEvent.objects.filter(id=event.id).update(status=ReviewEvent.Status.SENT, sent_at=timezone.now())
    return "sent"


def record_click(short_code: str) -> str | None:
    """A tracked link was opened: record it and cancel the pending reminder."""
    link = ReviewLink.objects.filter(short_code=short_code).first()
    if link is None:
        return None
    if link.clicked_at is None:
        link.clicked_at = timezone.now()
        link.save(update_fields=["clicked_at"])
    contact = link.contact
    if contact.review_status not in ("unsubscribed", "issue_flagged") and not contact.opted_out:
        contact.review_status = "clicked"
        contact.save(update_fields=["review_status", "updated_at"])
    cancel_pending(contact, ReviewEvent.Step.REMINDER)
    return link.original_url


def unsubscribe_contact(contact: Contact) -> int:
    """STOP: cancel every pending step and block restart without consent."""
    contact.opted_out = True
    contact.opted_out_at = timezone.now()
    contact.review_status = "unsubscribed"
    contact.save(update_fields=["opted_out", "opted_out_at", "review_status", "updated_at"])
    cancelled = cancel_pending(contact)
    logger.info("reviews: contact %s opted out, %d pending steps cancelled", contact.id, cancelled)
    return cancelled


def flag_issue(contact: Contact, note: str) -> None:
    """Negative check-in reply: alert the business, never suppress the ask."""
    contact.review_status = "issue_flagged"
    contact.issue_note = note[:500]
    contact.needs_human = True
    contact.save(update_fields=["review_status", "issue_note", "needs_human", "updated_at"])
    logger.info("reviews: contact %s flagged an issue", contact.id)


def resolve_issue(contact: Contact) -> bool:
    """Issue handled: the customer returns to the pipeline (a pause, not an exclusion)."""
    if contact.review_status != "issue_flagged":
        return False
    contact.review_status = "check_in_sent"
    contact.issue_note = ""
    contact.save(update_fields=["review_status", "issue_note", "updated_at"])
    return True
