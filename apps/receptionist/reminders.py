"""Service reminders: the retention engine for service businesses.

When a booking is marked Done and the owner has set service_reminder_days
on the receptionist setup page, one WhatsApp reminder is scheduled for that
many days later ("time for your next service"). The send rides the same
guarded path as the review pipeline: the customer can STOP it, and the send
is skipped when the workspace has no connected WhatsApp number.
"""

from __future__ import annotations

import datetime as dt
import logging

from django.utils import timezone

from .models import Booking, Contact, ServiceReminder
from .reviews import OPT_OUT_FOOTER, ReviewConfigError, _deliver

logger = logging.getLogger(__name__)

# Send inside the owner's morning, not at midnight: 09:00 Johannesburg time
# on the due date.
SEND_HOUR = 9


def reminder_message(workspace, contact: Contact, service: str) -> str:
    from .reviews import _business_name, _first_name

    what = service or "your vehicle"
    return (
        f"Hi {_first_name(contact)}, {_business_name(workspace)} here. "
        f"It's time to book {what} in for its next service. "
        "Reply to this message and we will find you a slot."
    )


def schedule_for_booking(booking: Booking) -> ServiceReminder | None:
    """A booking was marked Done: schedule its service reminder if switched on."""
    profile = getattr(booking.workspace, "receptionist_profile", None)
    days = int(getattr(profile, "service_reminder_days", 0) or 0)
    if profile is None or days <= 0:
        return None
    contact = booking.contact
    if contact.opted_out:
        logger.info("reminders: contact %s opted out; no service reminder", contact.id)
        return None
    due_on = timezone.localdate() + dt.timedelta(days=days)
    reminder = ServiceReminder.objects.create(
        workspace=booking.workspace,
        contact=contact,
        booking=booking,
        service=(booking.service or "")[:200],
        due_on=due_on,
    )
    from .tasks import run_service_reminder

    due_at = timezone.make_aware(dt.datetime.combine(due_on, dt.time(SEND_HOUR, 0)))
    run_service_reminder(str(reminder.id), schedule=due_at)
    return reminder


def send_due(reminder: ServiceReminder) -> str:
    """Send one due reminder. Returns sent|cancelled|failed|held."""
    claimed = ServiceReminder.objects.filter(id=reminder.id, status=ServiceReminder.Status.SCHEDULED).update(
        status=ServiceReminder.Status.SENDING
    )
    if not claimed:
        return "cancelled"

    contact = reminder.contact
    workspace = reminder.workspace

    if contact.opted_out:
        ServiceReminder.objects.filter(id=reminder.id).update(status=ServiceReminder.Status.CANCELLED)
        return "cancelled"

    try:
        _deliver(workspace, contact, reminder_message(workspace, contact, reminder.service) + OPT_OUT_FOOTER)
    except ReviewConfigError as exc:
        # Missing channel or send guard refusal: keep it scheduled for the
        # next drain rather than losing the reminder.
        ServiceReminder.objects.filter(id=reminder.id).update(status=ServiceReminder.Status.SCHEDULED)
        logger.info("reminders: reminder %s held (%s)", reminder.id, exc)
        return "held"
    except Exception as exc:
        ServiceReminder.objects.filter(id=reminder.id).update(
            status=ServiceReminder.Status.FAILED, error=str(exc)[:500]
        )
        logger.exception("reminders: reminder %s failed", reminder.id)
        return "failed"

    ServiceReminder.objects.filter(id=reminder.id).update(status=ServiceReminder.Status.SENT, sent_at=timezone.now())
    return "sent"


def send_all_due(now=None) -> int:
    """Catch-up for the cron drain: send every reminder whose due date has come."""
    now = now or timezone.localdate()
    sent = 0
    for reminder in ServiceReminder.objects.filter(status=ServiceReminder.Status.SCHEDULED, due_on__lte=now):
        if send_due(reminder) == "sent":
            sent += 1
    return sent
