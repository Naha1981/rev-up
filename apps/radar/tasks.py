"""Periodic radar poll, runs inside the studio worker.

Registered on post_migrate via apps.radar.apps (register_recurring_task);
repeats every POLL_REPEAT_SECONDS. Only workspaces with a ``radar.feed_url``
setting are touched; per-item dedup lives in the RadarIngestedItem ledger.
"""

import logging

from background_task import background

from .services import poll_all_workspace_feeds

logger = logging.getLogger(__name__)

POLL_REPEAT_SECONDS = 15 * 60


@background(schedule=0)
def poll_radar_feeds():
    results = poll_all_workspace_feeds()
    if results:
        logger.info("radar poll: %s", results)
