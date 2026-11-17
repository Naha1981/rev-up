"""No migrations, task draining, publisher, operator API or business routes."""

import os
import re
import socket
from urllib.parse import urlsplit

_dbhost = urlsplit(os.environ["DATABASE_URL"]).hostname
_synthetic = os.environ.get("REVUP_RECOVERY_SYNTHETIC") == "1"
_allowed_hosts = [_dbhost] if _synthetic else [_dbhost, "api.resend.com"]
_connect = socket.socket.connect


def _synthetic_connect(self, address):
    if isinstance(address, tuple) and address[0] not in ("127.0.0.1", "::1", _dbhost):
        allowed = {item[4][0] for host in _allowed_hosts for item in socket.getaddrinfo(host, None)}
        if address[0] not in allowed:
            raise OSError("Synthetic recovery egress blocked")
    return _connect(self, address)


socket.socket.connect = _synthetic_connect
os.environ["DJANGO_SETTINGS_MODULE"] = "tools.recovery_host.settings"
from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
from django.db import connection  # noqa: E402 - initialize guarded Django environment before app imports

with connection.cursor() as cursor:
    if _synthetic:
        cursor.execute("SELECT marker, synthetic_only, egress_disabled FROM cf_staging_boundary")
        if cursor.fetchall() not in (
            [("revup-full-journey-11nov2026", True, True)],
            [("revup-full-journey-14nov2026", True, True)],
        ):
            raise RuntimeError("Wrong synthetic boundary")
    else:
        cursor.execute("SELECT id, password FROM accounts_user LIMIT 0")
        cursor.execute("SELECT user_id FROM cf_sessions LIMIT 0")


def application(environ, start_response):
    path = environ.get("PATH_INFO", "")
    if path == "/health/":
        start_response("200 OK", [("Content-Type", "application/json"), ("Cache-Control", "no-store")])
        return [b'{"ok":true,"scope":"recovery-only"}']
    if re.fullmatch(r"/accounts/password/reset/(?:done/|key/[-A-Za-z0-9_]+/|key/done/)?", path) or path.startswith(
        "/static/"
    ):
        return app(environ, start_response)
    start_response("404 Not Found", [("Content-Type", "text/plain")])
    return [b"Not found"]
