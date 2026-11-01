"""Cron-called due-task drain - the event-driven replacement for the 24/7 poller.

The old in-process worker polled Postgres every second around the clock,
which pins the serverless database awake and burns the free compute quota.
Now: tasks created during a request run inline (BACKGROUND_TASK_RUN_ASYNC),
and a free external cron caller hits this endpoint every ~15 minutes to
drain anything time-scheduled (e.g. planned publishing). Between calls the
app and the database sleep.

Auth: shared token in the X-Run-Due-Token header. When INTERNAL_CRON_TOKEN
is unset the endpoint does not exist (404), so an unconfigured deploy
exposes nothing.
"""

from __future__ import annotations

import logging
import threading
import time

from django.conf import settings
from django.http import HttpResponseForbidden, HttpResponseNotFound, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

# Bound each drain so the HTTP call finishes well inside proxy timeouts; the
# next cron tick picks up anything left over.
DRAIN_SECONDS = 45


def drain_due_tasks(seconds: int = DRAIN_SECONDS) -> int:
    """Run due background tasks synchronously until none remain or time is up.

    Uses the library runner directly instead of the process_tasks command,
    whose signal handlers only work on the main thread (gunicorn serves
    requests on worker threads). Returns the number of tasks run.
    """
    from background_task.tasks import autodiscover, tasks
    from django.test import override_settings

    autodiscover()  # the registry is lazy; only the management command did this before
    deadline = time.monotonic() + seconds
    ran = 0
    # Run synchronously even when production enables RUN_ASYNC: the drain IS
    # the worker, so pool dispatch would only make completion unobservable.
    with override_settings(BACKGROUND_TASK_RUN_ASYNC=False):
        while time.monotonic() < deadline and tasks.run_next_task():
            ran += 1
    return ran


@csrf_exempt
@require_POST
def run_due(request):
    token = getattr(settings, "INTERNAL_CRON_TOKEN", "")
    if not token:
        return HttpResponseNotFound()
    if request.headers.get("X-Run-Due-Token", "") != token:
        return HttpResponseForbidden("bad token")
    try:
        ran = drain_due_tasks(DRAIN_SECONDS)
    except Exception:
        logger.exception("run-due drain failed")
        return JsonResponse({"ok": False}, status=500)
    return JsonResponse({"ok": True, "tasks_run": ran})


# ------------------------------------------------------------------
# Request-time inline drain
# ------------------------------------------------------------------

_drain_lock = threading.Lock()
_drain_running = False


def _drain_due_tasks(seconds: int = 15) -> None:
    """Drain due tasks in a daemon thread; one drain at a time process-wide."""
    global _drain_running
    with _drain_lock:
        if _drain_running:
            return
        _drain_running = True
    try:
        drain_due_tasks(seconds)
    except Exception:
        logger.exception("request-time task drain failed")
    finally:
        with _drain_lock:
            _drain_running = False


def _due_tasks_exist() -> bool:
    from background_task.models import Task

    now = timezone.now()
    return Task.objects.unlocked(now).filter(run_at__lte=now, failed_at=None).exists()


# Paths that must never touch the database. Render's health check hits
# /health/ around the clock; if the due-task check queried the task table on
# those pings the serverless database would never scale to zero, which is the
# whole point of the event-driven design.
_QUIET_PREFIXES = ("/health/", "/internal/run-due/", "/robots.txt", "/favicon", "/static/", "/media/")


class RequestTaskDrainMiddleware:
    """After any real request, drain due background tasks in a daemon thread.

    The database is awake anyway while the app serves traffic, so draining
    here adds no idle compute - and when nobody uses the app, nothing runs
    and the database scales to zero. The response itself is never delayed:
    the drain runs beside it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith(_QUIET_PREFIXES):
            return response  # the run-due endpoint drains for itself
        try:
            if _due_tasks_exist():
                threading.Thread(target=_drain_due_tasks, daemon=True, name="request-task-drain").start()
        except Exception:
            logger.exception("due-task check failed; continuing without drain")
        return response
