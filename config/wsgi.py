import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_wsgi_application()

# Start the publishing/task worker INSIDE the serving process. Doing this in
# the start scripts before os.execvp() never worked - exec replaces the
# process image and kills every thread, leaving production with no worker.
# Gunicorn imports this module once per worker (we run --workers 1), so this
# yields exactly one supervisor, and it dies with the worker process.
from apps.common.worker_supervisor import start_worker_supervisor  # noqa: E402

start_worker_supervisor()
