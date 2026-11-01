"""Record one page-view event per HTML page load, skipping bots and assets."""

from __future__ import annotations

import hashlib

from django.utils import timezone

from .models import ProductEvent

_SKIP_PREFIXES = (
    "/static/",
    "/media/",
    "/health/",
    "/internal/",
    "/admin/",
    "/r/",
    "/billing/payfast/",
    "/api/",
    "/accounts/accept-terms",
    "/robots.txt",
    "/favicon",
    "/product-analytics/",
)

_BOT_UA = (
    "bot",
    "crawler",
    "spider",
    "whatsapp",
    "facebookexternalhit",
    "slackbot",
    "telegrambot",
    "discordbot",
    "linkedinbot",
    "headless",
    "uptime",
)


def visitor_hash(request) -> str:
    """Daily-rotating anonymous visitor id: session key if present, else a
    salted hash of address+agent. No raw IP is ever stored."""
    day = timezone.now().strftime("%Y-%m-%d")
    key = ""
    if hasattr(request, "session"):
        key = request.session.session_key or ""
    if not key:
        ip = request.META.get("REMOTE_ADDR", "")
        ua = request.META.get("HTTP_USER_AGENT", "")
        key = f"{ip}|{ua}"
    return hashlib.sha256(f"{day}|{key}".encode()).hexdigest()


class ProductAnalyticsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            if (
                request.method == "GET"
                and response.status_code == 200
                and "text/html" in response.get("Content-Type", "")
                and not request.path.startswith(_SKIP_PREFIXES)
                and not any(b in request.META.get("HTTP_USER_AGENT", "").lower() for b in _BOT_UA)
            ):
                referrer = request.META.get("HTTP_REFERER", "")
                domain = ""
                if referrer:
                    from urllib.parse import urlparse

                    domain = urlparse(referrer).netloc[:120]
                ProductEvent.objects.create(
                    kind=ProductEvent.Kind.PAGE_VIEW,
                    path=request.path[:300],
                    visitor_hash=visitor_hash(request),
                    user=request.user if request.user.is_authenticated else None,
                    referrer_domain=domain,
                )
        except Exception:  # analytics must never break a page
            import logging

            logging.getLogger(__name__).exception("product analytics: page-view record failed")
        return response
