"""Zernio API client - RevUp's only social connect/publish provider path.

Decision (owner, 31 Oct 2026): no Meta developer app, review or verification
anywhere in RevUp. Facebook, Instagram, TikTok and LinkedIn accounts are
connected through Zernio's hosted OAuth UI and published through the Zernio
API; Zernio holds every platform token. There is deliberately no Meta
fallback - ZERNIO_ENABLED=false is an off-switch that pauses publishing, not
a switch back to anything.

Contract verified against docs.zernio.com on 31 Oct 2026:
- Base URL https://zernio.com/api/v1, ``Authorization: Bearer <api key>``.
- Profiles: POST /v1/profiles {name, externalId} (409
  ``profile_external_id_conflict`` on a duplicate, existing id in
  ``details.existingProfileId``); GET /v1/profiles?externalId= finds it.
- Connect: GET /v1/connect/{platform}?profileId&redirect_url returns the
  hosted ``authUrl``; the redirect comes back with
  ``connected={platform}&profileId&accountId&username`` or ``error=...``.
- Accounts: GET /v1/accounts?profileId&platform&status.
- Posts: POST /v1/posts, one request shape for every platform. Retries are
  safe with an ``Idempotency-Key`` header (24h window): a replayed key
  returns HTTP 200 with the original post, a still-processing original
  returns 409 ``idempotency_conflict`` with ``Retry-After``, and identical
  content to the same account within 24h is 409 with ``existingPostId``.
  An inline publish (``publishNow``) can answer 207 when some platforms
  failed - 207 is a 2xx, so branch on the status code, never on "ok".
- Webhooks: POST /v1/webhooks/settings registers {name, url, secret, events};
  deliveries are signed with the lowercase hex HMAC-SHA256 of the raw body
  keyed by our secret, in ``X-Zernio-Signature`` (legacy alias
  ``X-Late-Signature``).

Server-side only: the API key lives in the ZERNIO_API_KEY env var, travels
only in the Authorization header, and is never logged, returned, or included
in error text.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx
from django.conf import settings

from providers.exceptions import ProviderError

DEFAULT_BASE_URL = "https://zernio.com/api/v1"
DEFAULT_TIMEOUT_SECONDS = 30.0

# Platforms RevUp connects, in the owner's order: Facebook, Instagram,
# TikTok; LinkedIn last. X is deliberately absent - Zernio bills X API calls
# as pass-through and the owner excluded it. Anything not listed here is
# refused before it can cost money or surprise anyone.
SUPPORTED_PLATFORMS = ("facebook", "instagram", "tiktok", "linkedin")

# Zernio per-platform post status -> PlatformPost.Status values
# (apps.composer.models). Mapped as data, not by importing the app:
# providers/ must stay importable without Django apps.
#
# "cancelled" lands on "draft" - the post never went out and may be edited
# and rescheduled, which is exactly what a draft is. RevUp has no "cancelled"
# state of its own and "failed" would tell the user something went wrong
# when they (or the customer) simply called it off.
ZERNIO_STATUS_MAP: dict[str, str] = {
    "pending": "scheduled",
    "uploading": "publishing",
    "processing": "publishing",
    "published": "published",
    "failed": "failed",
    "cancelled": "draft",
}


def normalise_status(zernio_status: str) -> str | None:
    """Map a Zernio per-platform status to a PlatformPost.Status value.

    Returns None for anything unrecognised: Zernio documents its list as
    open-ended, so an unknown status must be recorded raw (the caller keeps
    it in ``last_provider_status``) rather than guessed into a transition the
    state machine never agreed to.
    """
    return ZERNIO_STATUS_MAP.get(zernio_status)


class ZernioError(ProviderError):
    """A failed Zernio API call.

    Carries the machine-readable ``code`` and ``type`` from Zernio's error
    envelope and the HTTP ``status_code``; the publisher's ambiguity checks
    read ``status_code`` through getattr, so it is always set (0 for a
    request that never got a response). ``retryable`` follows the envelope:
    429, 5xx, timeouts and a still-processing idempotency retry are worth
    another attempt; every other 4xx is permanent.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 0,
        code: str = "",
        error_type: str = "",
        platform: str = "",
        raw_response: dict | None = None,
        retryable: bool = True,
        retry_after: float | None = None,
    ):
        self.status_code = status_code
        self.code = code
        self.error_type = error_type
        self.retry_after = retry_after
        super().__init__(message, platform=platform, raw_response=raw_response, retryable=retryable)


class ZernioClient:
    """Thin httpx wrapper over the Zernio REST API.

    ``transport`` exists for tests (httpx.MockTransport); production callers
    never pass it. The client owns one httpx.Client; use it as a context
    manager or call :meth:`close` when done.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        transport: httpx.BaseTransport | None = None,
    ):
        key = api_key if api_key is not None else getattr(settings, "ZERNIO_API_KEY", "")
        if not key:
            raise ZernioError(
                "Zernio is not configured (ZERNIO_API_KEY is empty).",
                code="missing_credentials",
                retryable=False,
            )
        self._client = httpx.Client(
            base_url=(base_url or getattr(settings, "ZERNIO_BASE_URL", "") or DEFAULT_BASE_URL).rstrip("/"),
            headers={"Authorization": f"Bearer {key}"},
            timeout=timeout,
            transport=transport,
        )

    def __enter__(self) -> ZernioClient:
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    # ------------------------------------------------------------ HTTP core

    def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        try:
            return self._client.request(method, path, **kwargs)
        except httpx.TimeoutException as exc:
            raise ZernioError(
                f"Zernio did not answer in time ({exc.__class__.__name__}).",
                retryable=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise ZernioError(
                f"Zernio request failed before a response ({exc.__class__.__name__}).",
                retryable=True,
            ) from exc

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        try:
            body = response.json()
        except ValueError:
            body = {}
        code = body.get("code", "") if isinstance(body, dict) else ""
        retry_after: float | None = None
        if raw := response.headers.get("Retry-After"):
            try:
                retry_after = float(raw)
            except ValueError:
                retry_after = None
        # A 409 idempotency_conflict means the original request is still
        # being processed: safe and worth retrying after Retry-After. Every
        # other 4xx is permanent (a duplicate-content 409 must NOT be
        # retried - it would conflict forever).
        retryable = (
            response.status_code == 429
            or response.status_code >= 500
            or (response.status_code == 409 and code == "idempotency_conflict")
        )
        raise ZernioError(
            body.get("error") or f"Zernio answered HTTP {response.status_code}.",
            status_code=response.status_code,
            code=code,
            error_type=body.get("type", "") if isinstance(body, dict) else "",
            platform=body.get("platform", "") if isinstance(body, dict) else "",
            raw_response=body if isinstance(body, dict) else {},
            retryable=retryable,
            retry_after=retry_after,
        )

    def _get_json(self, path: str, **kwargs) -> dict:
        response = self._request("GET", path, **kwargs)
        self._raise_for_status(response)
        return response.json()

    def _post_json(self, path: str, *, idempotency_key: str | None = None, **kwargs) -> httpx.Response:
        headers = kwargs.pop("headers", {})
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        response = self._request("POST", path, headers=headers, **kwargs)
        self._raise_for_status(response)
        return response

    # -------------------------------------------------------------- profiles

    def create_profile(
        self,
        *,
        name: str,
        external_id: str,
        timezone: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """Create a Zernio profile. Returns the ``profile`` object (has ``_id``).

        ``external_id`` is our workspace UUID, so the profile can be found
        later without storing its Zernio id. Raises ZernioError with
        ``code='profile_external_id_conflict'`` on a duplicate - callers that
        want idempotency use :meth:`get_or_create_profile`.
        """
        payload: dict[str, Any] = {"name": name, "externalId": external_id}
        if timezone:
            payload["timezone"] = timezone
        response = self._post_json("/profiles", json=payload, idempotency_key=idempotency_key)
        return response.json()["profile"]

    def get_profile_by_external_id(self, external_id: str) -> dict | None:
        """Find a profile by the externalId we set on it, or None."""
        data = self._get_json("/profiles", params={"externalId": external_id})
        profiles = data.get("profiles", [])
        return profiles[0] if profiles else None

    def get_or_create_profile(
        self,
        *,
        name: str,
        external_id: str,
        timezone: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """Idempotent profile create: a conflict means it already exists."""
        try:
            return self.create_profile(
                name=name, external_id=external_id, timezone=timezone, idempotency_key=idempotency_key
            )
        except ZernioError as exc:
            if exc.code != "profile_external_id_conflict":
                raise
        existing = self.get_profile_by_external_id(external_id)
        if existing is None:
            raise ZernioError(
                "Zernio reported the profile exists but a lookup by externalId found nothing.",
                code="profile_external_id_conflict",
                retryable=True,
            )
        return existing

    # -------------------------------------------------------------- connect

    def get_connect_url(self, platform: str, *, profile_id: str, redirect_url: str) -> str:
        """The hosted Zernio OAuth URL for one platform. One tap for the user.

        Only :data:`SUPPORTED_PLATFORMS` are served - anything else (X above
        all) is refused here, before a request could connect something the
        owner excluded.
        """
        if platform not in SUPPORTED_PLATFORMS:
            raise ZernioError(
                f"Platform '{platform}' is not one RevUp connects ({', '.join(SUPPORTED_PLATFORMS)}).",
                code="unsupported_platform",
                retryable=False,
            )
        data = self._get_json(
            f"/connect/{platform}",
            params={"profileId": profile_id, "redirect_url": redirect_url},
        )
        # The documented shape carries ``authUrl``; accept a nested ``data``
        # envelope so a harmless API-side re-wrap cannot break connect.
        auth_url = data.get("authUrl") or (data.get("data") or {}).get("authUrl")
        if not auth_url:
            raise ZernioError(
                "Zernio answered connect without an authUrl.",
                raw_response=data,
                retryable=True,
            )
        return auth_url

    # ------------------------------------------------------------- accounts

    def list_accounts(
        self,
        *,
        profile_id: str | None = None,
        platform: str | None = None,
        status: str | None = None,
    ) -> list[dict]:
        """Connected accounts, optionally filtered. Server-side confirm after connect."""
        params = {
            k: v
            for k, v in {
                "profileId": profile_id,
                "platform": platform,
                "status": status,
            }.items()
            if v
        }
        return self._get_json("/accounts", params=params).get("accounts", [])

    # ---------------------------------------------------------------- posts

    def create_post(
        self,
        *,
        platforms: list[dict],
        content: str = "",
        media_items: list[dict] | None = None,
        scheduled_for: str | None = None,
        publish_now: bool = False,
        is_draft: bool = False,
        timezone: str | None = None,
        metadata: dict | None = None,
        idempotency_key: str,
    ) -> dict:
        """Create (and optionally publish) a post. Retries MUST reuse the key.

        ``platforms`` entries are ``{"platform": ..., "accountId": ...}`` with
        optional ``customContent``/``customMedia``/``platformSpecificData``.

        Returns a dict with ``post`` (the Zernio Post), plus:
        - ``idempotent_replay``: True when a reused key returned the original
          (HTTP 200) - nothing new was created;
        - ``partial``: True on HTTP 207, when an inline publish worked on
          some platforms and failed on others. 207 is a 2xx, so this flag is
          the only safe way to tell.
        ``warnings`` is passed through when Zernio sends it.
        """
        payload: dict[str, Any] = {"platforms": platforms}
        if content:
            payload["content"] = content
        if media_items:
            payload["mediaItems"] = media_items
        if scheduled_for:
            payload["scheduledFor"] = scheduled_for
        if publish_now:
            payload["publishNow"] = True
        if is_draft:
            payload["isDraft"] = True
        if timezone:
            payload["timezone"] = timezone
        if metadata:
            payload["metadata"] = metadata
        response = self._post_json("/posts", json=payload, idempotency_key=idempotency_key)
        body = response.json()
        return {
            "post": body.get("post", body),
            "warnings": body.get("warnings", []),
            "idempotent_replay": response.status_code == 200,
            "partial": response.status_code == 207,
        }

    def get_post(self, post_id: str) -> dict:
        """One Zernio post by id (status, per-platform results, URLs)."""
        data = self._get_json(f"/posts/{post_id}")
        return data.get("post", data)

    # ------------------------------------------------------------- webhooks

    def create_webhook_settings(
        self,
        *,
        name: str,
        url: str,
        secret: str,
        events: list[str],
        profile_ids: list[str] | None = None,
    ) -> dict:
        """Register a webhook endpoint. We pick the secret; Zernio never does."""
        payload: dict[str, Any] = {"name": name, "url": url, "secret": secret, "events": events}
        if profile_ids:
            payload["profileIds"] = profile_ids
        response = self._post_json("/webhooks/settings", json=payload)
        return response.json()["webhook"]

    def test_webhook(self, webhook_id: str) -> bool:
        """Send Zernio's webhook.test event to the endpoint. True when it answered 2xx."""
        data = self._post_json("/webhooks/test", json={"webhookId": webhook_id}).json()
        return bool(data.get("success"))

    @staticmethod
    def verify_webhook_signature(raw_body: bytes, signature: str, secret: str) -> bool:
        """Constant-time HMAC-SHA256 check of a delivery against our secret.

        ``raw_body`` must be the exact request bytes - never a re-serialised
        dict. A missing/empty secret or signature fails closed.
        """
        if not secret or not signature:
            return False
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature.lower())
