"""Tests for publishing through Zernio (M3).

The Zernio API is faked with httpx.MockTransport so the real client code -
headers, payload shape, idempotency contract - runs in every test.
"""

from unittest.mock import MagicMock, patch

import httpx
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.composer.models import PlatformPost, Post, PostMedia
from apps.media_library.models import MediaAsset
from apps.organizations.models import Organization
from apps.publisher.engine import PublishEngine
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace
from providers.exceptions import PublishError
from providers.zernio import ZernioClient

ACC = "6af1c27578e791344ced7001"
POST_ID = "6bf2c27578e791344ced7002"


def _zernio_client(handler) -> ZernioClient:
    return ZernioClient(api_key="test-key", base_url="https://mock.test", transport=httpx.MockTransport(handler))


def _published_payload(status="published", **target_overrides):
    target = {
        "platform": "facebook",
        "accountId": ACC,
        "status": status,
        "platformPostId": "fb-9",
        "postUrl": "https://facebook.com/post/9",
    }
    target.update(target_overrides)
    return {"post": {"_id": POST_ID, "platforms": [target]}}


@override_settings(ZERNIO_ENABLED=True, ZERNIO_API_KEY="test-key", APP_URL="https://app.example")
class ZernioDispatchTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="WS")
        self.account = SocialAccount.objects.create(
            workspace=self.workspace,
            platform="facebook",
            account_platform_id="page-123",
            account_name="Acme",
            provider="zernio",
            provider_account_id=ACC,
            provider_profile_id="prof-1",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.post = Post.objects.create(workspace=self.workspace, caption="Hello world")
        self.pp = PlatformPost.objects.create(
            post=self.post,
            social_account=self.account,
            status=PlatformPost.Status.SCHEDULED,
        )
        self.requests = []

    def _handler(self, response_status=201, payload=None):
        def handler(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            return httpx.Response(response_status, json=payload if payload is not None else _published_payload())

        return handler

    def _dispatch(self, handler):
        with patch("providers.zernio.ZernioClient", lambda *a, **k: _zernio_client(handler)):
            return PublishEngine()._dispatch_to_provider(self.pp)

    def test_posts_via_zernio_with_idempotency_key(self):
        result = self._dispatch(self._handler())

        assert result["success"] is True
        assert result["platform_post_id"] == "fb-9"
        assert result["url"] == "https://facebook.com/post/9"
        assert result["async_publish"] is False

        self.pp.refresh_from_db()
        assert self.pp.provider == "zernio"
        assert self.pp.provider_post_id == POST_ID
        assert self.pp.idempotency_key  # minted and stored

        request = self.requests[0]
        assert request.headers["Idempotency-Key"] == self.pp.idempotency_key
        assert request.headers["Authorization"] == "Bearer test-key"
        body = __import__("json").loads(request.content)
        assert body["publishNow"] is True
        assert body["content"] == "Hello world"
        assert body["platforms"] == [{"platform": "facebook", "accountId": ACC}]

    def test_retry_reuses_the_same_key_and_replay_is_seen(self):
        self._dispatch(self._handler())
        first_key = self.pp.idempotency_key

        # Replay: same key answered 200 with the original post.
        result = self._dispatch(self._handler(response_status=200))

        assert len(self.requests) == 2
        assert self.requests[1].headers["Idempotency-Key"] == first_key
        assert result["response"]["idempotent_replay"] is True

    def test_processing_target_is_async(self):
        result = self._dispatch(self._handler(payload=_published_payload(status="processing", platformPostId=None)))

        assert result["success"] is True
        assert result["async_publish"] is True
        assert result["platform_post_id"] == ""
        self.pp.refresh_from_db()
        assert self.pp.last_provider_status == "processing"

    def test_failed_target_is_permanent(self):
        payload = _published_payload(status="failed", error="Page token expired")
        with pytest.raises(PublishError) as exc_info:
            self._dispatch(self._handler(payload=payload))
        assert exc_info.value.retryable is False
        self.pp.refresh_from_db()
        assert self.pp.last_provider_status == "failed"
        assert "Page token expired" in self.pp.last_provider_error

    def test_media_items_built_from_public_urls(self):
        asset = MediaAsset.objects.create(
            organization=self.org,
            workspace=self.workspace,
            filename="pic.png",
            media_type="image",
            file=SimpleUploadedFile("pic.png", b"\x89PNG\r\n\x1a\n", content_type="image/png"),
        )
        PostMedia.objects.create(post=self.post, media_asset=asset, position=0)

        self._dispatch(self._handler())

        body = __import__("json").loads(self.requests[0].content)
        assert len(body["mediaItems"]) == 1
        assert body["mediaItems"][0]["type"] == "image"
        assert body["mediaItems"][0]["url"].startswith("http")

    def test_test_mode_never_calls_zernio(self):
        self.workspace.publish_test_mode = True
        self.workspace.save()

        def forbidden(request):
            raise AssertionError(f"live endpoint called in test mode: {request.url}")

        result = self._dispatch(forbidden)

        assert result["success"] is True
        assert result["response"]["test_mode"] is True
        self.pp.refresh_from_db()
        assert self.pp.provider_post_id == f"test-{self.pp.id}"
        assert self.pp.last_provider_status == "simulated"
        assert self.requests == []

    @override_settings(ZERNIO_ENABLED=False)
    def test_off_switch_pauses_with_retryable_error(self):
        with pytest.raises(PublishError) as exc_info:
            self._dispatch(self._handler())
        assert exc_info.value.retryable is True
        assert self.requests == []

    def test_non_zernio_platform_rejected_before_any_call(self):
        self.account.platform = "youtube"
        self.account.save()
        with pytest.raises(PublishError) as exc_info:
            self._dispatch(self._handler())
        assert exc_info.value.retryable is False
        assert self.requests == []

    def test_direct_account_still_uses_the_old_path(self):
        """A legacy provider=direct account must NOT be routed to Zernio."""
        self.account.provider = "direct"
        self.account.save()
        with patch("apps.publisher.engine._provider_and_access_token") as mock_pat:
            mock_provider = MagicMock()
            mock_pat.return_value = (mock_provider, "token")
            mock_provider.needs_local_media = False
            mock_provider.supported_post_types = []
            mock_provider.publish_is_async = False
            mock_provider.publish_post.return_value = MagicMock(platform_post_id="x", url="", extra={})
            with patch("apps.publisher.engine.publish_blocker", return_value=None):
                result = PublishEngine()._dispatch_to_provider(self.pp)
        assert result["success"] is True
        assert self.requests == []


@override_settings(ZERNIO_ENABLED=True, ZERNIO_API_KEY="test-key")
class ZernioConfirmTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="WS")
        self.account = SocialAccount.objects.create(
            workspace=self.workspace,
            platform="facebook",
            account_platform_id="page-123",
            account_name="Acme",
            provider="zernio",
            provider_account_id=ACC,
            provider_profile_id="prof-1",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.post = Post.objects.create(workspace=self.workspace, caption="hi")
        self.pp = PlatformPost.objects.create(
            post=self.post,
            social_account=self.account,
            status=PlatformPost.Status.PUBLISHING,
            provider="zernio",
            provider_post_id=POST_ID,
        )

    def _sweep(self, handler):
        with patch("providers.zernio.ZernioClient", lambda *a, **k: _zernio_client(handler)):
            settled = PublishEngine().confirm_pending_publishes()
        self.pp.refresh_from_db()
        return settled

    def _get_handler(self, status_code, payload):
        return lambda request: httpx.Response(status_code, json=payload)

    def test_published_settles_as_published(self):
        settled = self._sweep(self._get_handler(200, _published_payload()))
        assert settled == 1
        assert self.pp.status == PlatformPost.Status.PUBLISHED
        assert self.pp.platform_post_id == "fb-9"
        assert self.pp.published_at is not None

    def test_failed_target_settles_as_failed(self):
        payload = _published_payload(status="failed", error="Video too long")
        settled = self._sweep(self._get_handler(200, payload))
        assert settled == 1
        assert self.pp.status == PlatformPost.Status.FAILED
        assert "Video too long" in self.pp.last_provider_error

    def test_still_processing_waits(self):
        payload = _published_payload(status="processing", platformPostId=None)
        settled = self._sweep(self._get_handler(200, payload))
        assert settled == 0
        assert self.pp.status == PlatformPost.Status.PUBLISHING
        assert self.pp.last_provider_status == "processing"

    def test_missing_handle_reaped_after_stale_timeout(self):
        from datetime import timedelta

        PlatformPost.objects.filter(pk=self.pp.pk).update(
            provider_post_id="", updated_at=timezone.now() - timedelta(hours=1)
        )
        settled = self._sweep(self._get_handler(200, {}))
        assert settled == 1
        assert self.pp.status == PlatformPost.Status.FAILED

    def test_unknown_post_gives_up_without_republish(self):
        settled = self._sweep(self._get_handler(404, {"error": "nf", "code": "not_found", "type": "not_found"}))
        assert settled == 1
        assert self.pp.status == PlatformPost.Status.FAILED

    def test_zernio_500_keeps_row_for_next_sweep(self):
        settled = self._sweep(self._get_handler(500, {"error": "boom"}))
        assert settled == 0
        assert self.pp.status == PlatformPost.Status.PUBLISHING
