import os

os.environ["SECRET_KEY"] = "synthetic-acceptance-not-production"
os.environ["ENCRYPTION_KEY_SALT"] = "synthetic-acceptance-not-production"
os.environ["EMAIL_BACKEND_TYPE"] = "dummy"
os.environ["DATABASE_URL"] = "postgresql://sandbox@127.0.0.1:55431/brightbean_test"
from config.settings.base import *  # noqa: F403 - standard Django settings inheritance

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
STUDIO_WORKER_ENABLED = False

MIDDLEWARE = [m for m in MIDDLEWARE if m != "apps.common.run_due.RequestTaskDrainMiddleware"]

# Any unexpected Python network operation is limited to this disposable loopback DB.
import socket
_connect = socket.socket.connect
def _local_connect(self, address):
    if isinstance(address, tuple) and address[0] not in {"127.0.0.1", "::1", "localhost"}:
        raise RuntimeError("Synthetic recovery egress disabled")
    return _connect(self, address)
socket.socket.connect = _local_connect
