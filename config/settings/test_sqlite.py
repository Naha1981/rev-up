"""Local-only test settings: test suite over sqlite, no Postgres needed."""

from .test import *  # noqa: F401, F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
