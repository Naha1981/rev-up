"""Web-presence gate: new accounts must show where customers find them online.

A new account needs a website, or - when it has none - a Facebook page.
Website URLs are checked by fetching them. Facebook answers every anonymous
fetch with a login wall, so a Facebook page URL gets a strict format check
plus a fetch that proves Facebook serves the address; whether the page
itself exists can only be confirmed once the business connects its Facebook
account during onboarding.
"""

import ipaddress
import re
import socket
from urllib.parse import urljoin, urlsplit

import httpx
from django.core.exceptions import ValidationError

_TIMEOUT = httpx.Timeout(5.0, connect=4.0)
_MAX_REDIRECTS = 5
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

_FACEBOOK_HOSTS = {"facebook.com", "fb.com"}
_FACEBOOK_HOST_PREFIXES = ("www.", "m.", "web.", "l.", "lm.")
# First path segments that are never a business page.
_FACEBOOK_BAD_SEGMENTS = {
    "login",
    "help",
    "policies",
    "privacy",
    "terms",
    "sharer",
    "sharer.php",
    "dialog",
    "plugins",
    "profile.php",
    "groups",
    "hashtag",
    "search",
    "home.php",
}

WEBSITE_FORMAT_MSG = "That website address doesn't look right. Example: https://www.yourbusiness.co.za"
WEBSITE_UNREACHABLE_MSG = "We can't reach that website. Check the address, or use your Facebook page instead."
FACEBOOK_FORMAT_MSG = (
    "That doesn't look like a Facebook page link. Open your page on Facebook and copy the link from your browser."
)
FACEBOOK_UNREACHABLE_MSG = "We can't reach that Facebook page. Check the link and try again."
NEED_ONE_MSG = "Add your website or your Facebook page so customers can find you."


def normalize_url(raw):
    """Trim and add https:// when the scheme is missing. Returns '' for junk."""
    value = (raw or "").strip()
    if not value or any(c.isspace() for c in value):
        return ""
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", value):
        value = "https://" + value
    parts = urlsplit(value)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return ""
    return value


def _host_is_public(hostname):
    """True when every resolved address is a public routable IP (SSRF guard)."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except (socket.gaierror, UnicodeError):
        return False
    if not infos:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def _probe(url):
    """Fetch the URL (headers only), following redirects hop by hop so every
    target is re-checked against the public-host guard.

    Returns True when the site answered with a non-5xx response - the server
    exists and answered, which is what the gate proves. False on DNS failure,
    connection errors, timeouts and 5xx responses.
    """
    current = url
    try:
        with httpx.Client(
            timeout=_TIMEOUT,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            for _ in range(_MAX_REDIRECTS + 1):
                parts = urlsplit(current)
                host = parts.hostname or ""
                if parts.scheme not in ("http", "https") or "." not in host or not _host_is_public(host):
                    return False
                try:
                    with client.stream("GET", current, follow_redirects=False) as resp:
                        status = resp.status_code
                        location = resp.headers.get("location", "")
                except httpx.HTTPError:
                    return False
                if 300 <= status < 400 and location:
                    current = urljoin(current, location)
                    continue
                return status < 500
    except httpx.HTTPError:
        return False
    return False


def clean_website_url(raw):
    """Validate a website URL: format first, then a live reachability fetch.

    Returns the normalized URL ('' when the field was left empty).
    """
    value = normalize_url(raw)
    if not value:
        return ""
    host = urlsplit(value).hostname or ""
    if "." not in host:
        raise ValidationError(WEBSITE_FORMAT_MSG)
    if not _probe(value):
        raise ValidationError(WEBSITE_UNREACHABLE_MSG)
    return value


def clean_facebook_url(raw):
    """Validate a Facebook page URL: strict format, then a reachability fetch.

    Returns the normalized URL ('' when the field was left empty).
    """
    value = normalize_url(raw)
    if not value:
        return ""
    parts = urlsplit(value)
    host = (parts.hostname or "").lower()
    for prefix in _FACEBOOK_HOST_PREFIXES:
        if host.startswith(prefix):
            host = host[len(prefix) :]
            break
    if host not in _FACEBOOK_HOSTS:
        raise ValidationError(FACEBOOK_FORMAT_MSG)
    segments = [seg for seg in parts.path.split("/") if seg]
    if not segments or segments[0].lower() in _FACEBOOK_BAD_SEGMENTS:
        raise ValidationError(FACEBOOK_FORMAT_MSG)
    if not _probe(value):
        raise ValidationError(FACEBOOK_UNREACHABLE_MSG)
    return value


def validate_web_presence_form(form, cleaned):
    """Shared clean() for the signup form and the business-details form.

    Attaches format/reachability errors to their field and raises a non-field
    error when neither website nor Facebook page was given.
    """
    website = facebook = ""
    try:
        website = clean_website_url(cleaned.get("website_url"))
    except ValidationError as exc:
        form.add_error("website_url", exc)
    try:
        facebook = clean_facebook_url(cleaned.get("facebook_url"))
    except ValidationError as exc:
        form.add_error("facebook_url", exc)
    if not website and not facebook and "website_url" not in form.errors and "facebook_url" not in form.errors:
        raise ValidationError(NEED_ONE_MSG)
    cleaned["website_url"] = website
    cleaned["facebook_url"] = facebook
    return cleaned
