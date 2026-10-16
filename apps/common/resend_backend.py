"""Email backend that sends through the Resend HTTP API.

Render's free tier blocks outbound SMTP (ports 25/465/587/2525 all hang),
so SMTP is unusable there. This backend talks to https://api.resend.com/emails
over HTTPS (443) instead. Selected via EMAIL_BACKEND_TYPE=resend.
"""

import json
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

RESEND_API_URL = "https://api.resend.com/emails"


class ResendAPIBackend(BaseEmailBackend):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api_key = getattr(settings, "RESEND_API_KEY", "")

    def send_messages(self, email_messages):
        if not self.api_key:
            if self.fail_silently:
                return 0
            raise RuntimeError("RESEND_API_KEY is not configured")
        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _send(self, message):
        payload = {
            "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
            "to": list(message.to),
            "subject": message.subject or "",
            "text": message.body or "",
        }
        if message.cc:
            payload["cc"] = list(message.cc)
        if message.bcc:
            payload["bcc"] = list(message.bcc)
        if message.reply_to:
            payload["reply_to"] = list(message.reply_to)
        # Pick up an HTML alternative when present (allauth sends one).
        alternatives = getattr(message, "alternatives", None) or []
        for content, mimetype in alternatives:
            if mimetype == "text/html":
                payload["html"] = content
                break
        req = urllib.request.Request(
            RESEND_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                # Resend's edge 403s the default Python-urllib UA.
                "User-Agent": "NahaLabs/1.0 (+https://nahalabs.co.za)",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return 200 <= resp.status < 300
        except Exception:
            if self.fail_silently:
                return False
            raise
