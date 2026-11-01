"""Google Calendar connection for confirmed bookings.

The owner connects their own Google Calendar once; every booking they
confirm on the Bookings screen then appears there. Plain OAuth2 over httpx -
no new dependencies, and tokens are stored encrypted.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, time, timedelta

import httpx
from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import Booking, CalendarConnection

logger = logging.getLogger(__name__)

SCOPE = "https://www.googleapis.com/auth/calendar.events"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar}/events"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
_TIMEOUT = 15
_STATE_SALT = "receptionist-calendar-connect"


def configured() -> bool:
    return bool(
        getattr(settings, "GOOGLE_CALENDAR_CLIENT_ID", "") and getattr(settings, "GOOGLE_CALENDAR_CLIENT_SECRET", "")
    )


def callback_url() -> str:
    base = getattr(settings, "APP_URL", "https://revup.nahalabs.co.za").rstrip("/")
    return f"{base}/receptionist/google-calendar/callback/"


def sign_state(workspace_id, user_id) -> str:
    return signing.dumps({"ws": str(workspace_id), "u": str(user_id)}, salt=_STATE_SALT)


def read_state(state: str, max_age: int = 900) -> dict:
    return signing.loads(state, salt=_STATE_SALT, max_age=max_age)


def authorize_url(workspace_id, user_id) -> str:
    from urllib.parse import urlencode

    params = {
        "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
        "redirect_uri": callback_url(),
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": sign_state(workspace_id, user_id),
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    resp = httpx.post(
        TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
            "redirect_uri": callback_url(),
            "grant_type": "authorization_code",
        },
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_email(access_token: str) -> str:
    resp = httpx.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=_TIMEOUT)
    if resp.status_code != 200:
        return ""
    return str(resp.json().get("email") or "")


def _refresh(conn: CalendarConnection) -> str:
    resp = httpx.post(
        TOKEN_URL,
        data={
            "refresh_token": conn.refresh_token,
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
            "grant_type": "refresh_token",
        },
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    conn.access_token = data["access_token"]
    conn.token_expiry = timezone.now() + timedelta(seconds=int(data.get("expires_in", 3600)))
    conn.save(update_fields=["access_token", "token_expiry"])
    return conn.access_token


def valid_token(conn: CalendarConnection) -> str:
    if conn.token_expiry and conn.token_expiry > timezone.now() + timedelta(minutes=1):
        return conn.access_token
    return _refresh(conn)


_WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}
_MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def parse_requested_day(text: str, today: date | None = None) -> date | None:
    """Best-effort date for free text like 'Tuesday morning' or '3 Nov'.

    Returns None when nothing date-like is present - a wrong calendar entry
    is worse than none.
    """
    if not text:
        return None
    today = today or timezone.localdate()
    t = text.lower()
    if "today" in t or "asap" in t or "now" in t.split():
        return today
    if "tomorrow" in t:
        return today + timedelta(days=1)
    for name, num in _WEEKDAYS.items():
        if name in t:
            delta = (num - today.weekday()) % 7
            return today + timedelta(days=delta if delta else 7)
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\b", t)
    if m and m.group(2)[:3] in _MONTHS:
        day, month = int(m.group(1)), _MONTHS[m.group(2)[:3]]
        try:
            candidate = date(today.year, month, day)
        except ValueError:
            return None
        if candidate < today:
            candidate = date(today.year + 1, month, day)
        return candidate
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", t)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


_TIME_WORDS = {
    "early morning": 7,
    "morning": 9,
    "midday": 12,
    "noon": 12,
    "lunch": 12,
    "afternoon": 14,
    "evening": 17,
}

_EVENT_TZ = "Africa/Johannesburg"


def parse_requested_time(text: str) -> time | None:
    """Best-effort clock time for free text like 'Tuesday 9am' or '14:30'.

    Word times follow the plain meaning a customer expects: morning 09:00,
    midday 12:00, afternoon 14:00, evening 17:00. Returns None when nothing
    time-like is present.
    """
    if not text:
        return None
    t = text.lower()
    m = re.search(r"\b(\d{1,2})[:h](\d{2})\s*(am|pm)?\b", t)
    if not m:
        m = re.search(r"\b(\d{1,2})\s*(am|pm)\b", t)
    if m:
        hour = int(m.group(1))
        minute = int(m.group(2)) if m.group(2) and ":" in m.group(0) or "h" in m.group(0) else 0
        if m.lastindex and m.group(m.lastindex) in ("am", "pm"):
            if m.group(m.lastindex) == "pm" and hour < 12:
                hour += 12
            if m.group(m.lastindex) == "am" and hour == 12:
                hour = 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute)
    for word, hour in sorted(_TIME_WORDS.items(), key=lambda kv: -len(kv[0])):
        if word in t:
            return time(hour, 0)
    return None


def booking_slot(booking: Booking, today: date | None = None) -> datetime | None:
    """The booking's Johannesburg-local start as an aware datetime, or None."""
    day = parse_requested_day(booking.preferred_time, today)
    if day is None:
        return None
    clock = parse_requested_time(booking.preferred_time) or time(9, 0)
    return timezone.make_aware(datetime.combine(day, clock))


def slot_conflicts(workspace, start: datetime, duration_minutes: int, exclude_id=None) -> Booking | None:
    """The confirmed booking whose slot overlaps this one, if any."""
    end = start + timedelta(minutes=duration_minutes)
    others = Booking.objects.filter(
        workspace=workspace,
        status=Booking.Status.CONFIRMED,
        scheduled_start__isnull=False,
    )
    if exclude_id is not None:
        others = others.exclude(id=exclude_id)
    for other in others:
        other_end = other.scheduled_start + timedelta(minutes=other.duration_minutes)
        if other.scheduled_start < end and start < other_end:
            return other
    return None


def _event_body(booking: Booking, start: datetime) -> dict:
    start = timezone.localtime(start)
    end = start + timedelta(minutes=booking.duration_minutes)
    customer = booking.contact.name or booking.contact.wa_id
    return {
        "summary": f"{booking.service or 'Booking'} - {customer}",
        "description": (
            f"Confirmed RevUp booking.\nCustomer: {customer}\nWhatsApp: +{booking.contact.wa_id}"
            f"\nCustomer asked for: {booking.preferred_time or '-'}"
        ),
        "start": {"dateTime": start.isoformat(), "timeZone": _EVENT_TZ},
        "end": {"dateTime": end.isoformat(), "timeZone": _EVENT_TZ},
    }


def create_booking_event(conn: CalendarConnection, booking: Booking) -> bool:
    """Create the calendar event for a confirmed booking. False when skipped."""
    start_dt = booking.scheduled_start or booking_slot(booking)
    if start_dt is None:
        logger.info("calendar: no date in %r, skipping event for booking %s", booking.preferred_time, booking.id)
        return False
    try:
        token = valid_token(conn)
    except Exception:
        logger.exception("calendar: token refresh failed for workspace %s", conn.workspace_id)
        return False
    try:
        resp = httpx.post(
            EVENTS_URL.format(calendar=conn.calendar_id or "primary"),
            headers={"Authorization": f"Bearer {token}"},
            json=_event_body(booking, start_dt),
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
    except Exception:
        logger.exception("calendar: event create failed for booking %s", booking.id)
        return False
    event_id = ""
    try:
        candidate = resp.json().get("id", "")
        if isinstance(candidate, str):
            event_id = candidate
    except Exception:
        logger.exception("calendar: could not read event id for booking %s", booking.id)
    if event_id and booking.google_event_id != event_id:
        booking.google_event_id = event_id
        booking.save(update_fields=["google_event_id"])
    logger.info("calendar: event created for booking %s on %s", booking.id, start_dt)
    return True


def update_booking_event(conn: CalendarConnection, booking: Booking) -> bool:
    """Move an existing calendar event after a reschedule. False when skipped."""
    if not booking.google_event_id:
        return create_booking_event(conn, booking)
    start_dt = booking.scheduled_start or booking_slot(booking)
    if start_dt is None:
        return False
    try:
        token = valid_token(conn)
    except Exception:
        logger.exception("calendar: token refresh failed for workspace %s", conn.workspace_id)
        return False
    url = f"{EVENTS_URL.format(calendar=conn.calendar_id or 'primary')}/{booking.google_event_id}"
    try:
        resp = httpx.patch(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json=_event_body(booking, start_dt),
            timeout=_TIMEOUT,
        )
        if resp.status_code in (404, 410):
            booking.google_event_id = ""
            booking.save(update_fields=["google_event_id"])
            return create_booking_event(conn, booking)
        resp.raise_for_status()
    except Exception:
        logger.exception("calendar: event update failed for booking %s", booking.id)
        return False
    logger.info("calendar: event updated for booking %s on %s", booking.id, start_dt)
    return True


def delete_booking_event(conn: CalendarConnection, booking: Booking) -> bool:
    """Remove the calendar event when a booking is cancelled. Always True when gone."""
    if not booking.google_event_id:
        return True
    try:
        token = valid_token(conn)
    except Exception:
        logger.exception("calendar: token refresh failed for workspace %s", conn.workspace_id)
        return False
    url = f"{EVENTS_URL.format(calendar=conn.calendar_id or 'primary')}/{booking.google_event_id}"
    try:
        resp = httpx.delete(url, headers={"Authorization": f"Bearer {token}"}, timeout=_TIMEOUT)
        if resp.status_code not in (200, 204, 404, 410):
            resp.raise_for_status()
    except Exception:
        logger.exception("calendar: event delete failed for booking %s", booking.id)
        return False
    booking.google_event_id = ""
    booking.save(update_fields=["google_event_id"])
    logger.info("calendar: event deleted for booking %s", booking.id)
    return True
