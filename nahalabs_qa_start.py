"""Disposable NahaLabs QA deployment only, 2026-10-15.
AGPL-3.0, source: https://github.com/Naha1981/brightbean-studio-nahalabs
The publishing worker runs in-process beside gunicorn (single Render web
service, no paid worker dyno). No outbound mail, no durable data.
Never use real clients.
"""

import os
import subprocess
import sys

subprocess.run([sys.executable, "manage.py", "migrate", "--noinput"], check=True)
# Idempotent across a restart that retains /tmp. No credential is logged.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
import django

django.setup()
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
email = os.environ["DJANGO_SUPERUSER_EMAIL"]
user, created = User.objects.get_or_create(
    email=email, defaults={"is_staff": True, "is_superuser": True, "tos_accepted_at": timezone.now()}
)
if created:
    user.set_password(os.environ["DJANGO_SUPERUSER_PASSWORD"])
    user.save()
EmailAddress.objects.update_or_create(user=user, email=email, defaults={"verified": True, "primary": True})


# The studio worker now starts inside the gunicorn worker via config/wsgi.py
# (worker_supervisor). A thread started here would die the moment execvp
# replaces this process image.
os.execvp(
    "gunicorn",
    [
        "gunicorn",
        "config.wsgi:application",
        "--bind",
        "0.0.0.0:" + os.environ.get("PORT", "8000"),
        "--workers",
        "1",
        "--threads",
        "4",
    ],
)
