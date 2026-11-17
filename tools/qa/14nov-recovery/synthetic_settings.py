import os

os.environ["SECRET_KEY"] = "synthetic-journey-environment-not-production"
os.environ["ENCRYPTION_KEY_SALT"] = "synthetic-journey-salt"
os.environ["EMAIL_BACKEND_TYPE"] = "dummy"
os.environ["DATABASE_URL"] = "postgresql://sandbox@127.0.0.1:55440/revup_finish_synthetic"
from config.settings.base import *  # noqa: F403 - standard Django settings inheritance

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
STUDIO_WORKER_ENABLED = False
