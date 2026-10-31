"""Cross-module constants for the analytics app."""

from __future__ import annotations

# Platforms whose APIs don't expose aggregate analytics. The analytics
# page renders a per-platform "not available" variant instead of zeroed-
# out KPI cards and charts.
#
# The cron skips these because ``sync_all_account_analytics`` filters on
# ``services.analytics_availability``. Each entry MUST *also* have
# ``BACKFILL_DAYS_PER_PLATFORM[<platform>] = 0`` in ``apps/analytics/tasks.py``
# — that guard alone is not sufficient (it only skips the per-post loop, after
# the account-level fetch has already run), but it keeps the per-post window
# honest for any caller that reads the table directly.
NO_ANALYTICS_PLATFORMS: dict[str, str] = {
    "linkedin_personal": ("LinkedIn doesn't expose personal-profile analytics. Only Company Pages have analytics."),
}
