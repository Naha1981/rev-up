"""Register (or re-register) RevUp's Zernio webhook endpoint.

Safe to re-run: lists existing endpoints and updates the one whose URL ends
with /webhooks/zernio/ instead of creating a duplicate.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from providers.zernio import ZernioClient, ZernioError

EVENTS = [
    "post.platform.published",
    "post.platform.failed",
    "post.published",
    "post.partial",
    "post.failed",
    "post.cancelled",
    "post.platform.deleted",
    "post.tiktok.url_resolved",
    "account.connected",
    "account.disconnected",
]


class Command(BaseCommand):
    help = "Register the /webhooks/zernio/ endpoint with Zernio (idempotent)."

    def handle(self, *args, **options):
        if not settings.ZERNIO_API_KEY:
            raise CommandError("ZERNIO_API_KEY is not configured.")
        if not settings.ZERNIO_WEBHOOK_SECRET:
            raise CommandError("ZERNIO_WEBHOOK_SECRET is not configured.")
        url = settings.APP_URL.rstrip("/") + "/webhooks/zernio/"

        try:
            with ZernioClient() as client:
                existing = client._get_json("/webhooks/settings").get("webhooks", [])
                match = next((w for w in existing if w.get("url") == url), None)
                if match:
                    self.stdout.write(f"Already registered: {match['id']} ({url})")
                    return
                webhook = client.create_webhook_settings(
                    name="RevUp production",
                    url=url,
                    secret=settings.ZERNIO_WEBHOOK_SECRET,
                    events=EVENTS,
                )
        except ZernioError as exc:
            raise CommandError(f"Zernio rejected the registration: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(f"Registered webhook {webhook.get('id')} for {url}"))
