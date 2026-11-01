"""Background wrappers for the review pipeline.

Each pipeline step is a one-off task scheduled for its due time. Scheduling
rides the event-driven worker: tasks run inline when created during a
request and the cron-drained /internal/run-due/ endpoint catches the rest,
so no always-on poller burns the serverless database quota.
"""

from __future__ import annotations

import logging

from background_task import background
from django.utils import timezone

logger = logging.getLogger(__name__)


@background(schedule=0)
def run_review_event(event_id: str) -> None:
    """Send one due pipeline step; re-queue while the send gates hold it."""
    from .models import ReviewEvent
    from .reviews import HELD_RETRY_DELAY, send_event

    event = ReviewEvent.objects.filter(id=event_id).first()
    if event is None or event.status != ReviewEvent.Status.SCHEDULED:
        return
    outcome = send_event(event)
    if outcome == "held":
        run_review_event(event_id, schedule=timezone.now() + HELD_RETRY_DELAY)
