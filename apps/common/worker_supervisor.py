"""Start the studio-worker supervisor from inside a serving process.

Both start scripts (nahalabs_prod_start.py, nahalabs_qa_start.py) used to
start this thread before ``os.execvp(gunicorn, ...)``. execvp replaces the
process image, so the thread died at boot and the site ran with no worker at
all. Starting it here instead - from the WSGI module gunicorn imports inside
each serving worker - keeps the supervisor alive for exactly the life of that
worker process.
"""

import contextlib
import os
import subprocess
import sys
import threading
import time

_started = False
_lock = threading.Lock()


def _worker_loop():
    """Keep one studio worker alive for the life of this process.

    run_studio_worker recycles itself hourly (--duration 3600, same as the
    Procfile); the loop simply starts the next instance. A crash is retried
    after a short backoff instead of silently leaving the site with no
    publisher. The thread is a daemon, so the gunicorn worker's exit takes
    the loop with it and Render's container stop kills the child worker.
    """
    while True:
        with contextlib.suppress(Exception):
            subprocess.run(
                [sys.executable, "manage.py", "run_studio_worker", "--duration", "3600"],
                check=False,
            )
        time.sleep(5)


def start_worker_supervisor():
    """Start the supervisor thread once per process, unless disabled."""
    global _started
    # Default OFF: the event-driven design (inline execution + cron-drained
    # /internal/run-due/) replaces the 24/7 poller, which pinned the
    # serverless database awake and burned the free compute quota. Set
    # WORKER_ENABLED=true explicitly to bring the old in-process worker back.
    if os.environ.get("WORKER_ENABLED", "false") != "true":
        return
    with _lock:
        if _started:
            return
        _started = True
    threading.Thread(target=_worker_loop, daemon=True, name="studio-worker-supervisor").start()
