"""Tests for the Zernio webhook receiver (M4).

Every delivery is signed with the test secret and posted through Django's
test client, so the real signature check, dedupe insert and status mapping
run in every test.
"""

import hashlib
import hmac
import json

from django.test import Client, TestCase, override_settings
from django.urls import reverse

from apps.composer.models import PlatformPost, Post
from apps.organizations.models import Organization
from apps.publisher.models import ZernioWebhookEvent
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace

SECRET = "whsec-test"
ACC = "6af1c27578e791344ced7001"
ZPOST = "6bf2c27578e791344ced7002"


def _sign(body: bytes, secret: str = SECRET) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _payload(event="post.platform.published", event_id="evt-1", *, status="published", metadata=True, **target_over):
    target = {"platform": "facebook", "accountId": ACC, "status": status, "platformPostId": "fb-9"}
    target.update(target_over)
    post = {"_id": ZPOST, "platforms": [target]}
    if metadata:
        post["metadata"] = {"platform_post_id": None}  # filled by caller
    return {"id": event_id, "event": event, "timestamp": "2026-10-31T13:00:00Z", "post": post}


@override_settings(ZERNIO_ENABLED=True, ZERNIO_API_KEY="k", ZERNIO_WEBHOOK_SECRET=SECRET)
class ZernioWebhookTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Org")
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
        self.post = Post.objects.create(workspace=self.workspace, caption="Hi")
        self.pp = PlatformPost.objects.create(
            post=self.post,
            social_account=self.account,
            status=PlatformPost.Status.PUBLISHING,
            provider="zernio",
            provider_post_id=ZPOST,
        )
        self.client = Client()
        self.url = reverse("zernio_webhook")

    def _post(self, payload, *, secret=SECRET, sig_header="HTTP_X_ZERNIO_SIGNATURE", raw=None):
        body = raw if raw is not None else json.dumps(payload).encode()
        return self.client.post(
            self.url,
            data=body,
            content_type="application/json",
            **{sig_header: _sign(body, secret)} if secret is not None else {},
        )

    def _post_for_pp(self, event="post.platform.published", event_id="evt-1", **over):
        payload = _payload(event, event_id, **over)
        payload["post"]["metadata"]["platform_post_id"] = str(self.pp.id)
        return self._post(payload)

    # --- signature / envelope ------------------------------------------------

    def test_bad_signature_is_rejected(self):
        response = self._post(_payload(), secret="wrong")
        assert response.status_code == 403
        assert ZernioWebhookEvent.objects.count() == 0

    @override_settings(ZERNIO_WEBHOOK_SECRET="")
    def test_unconfigured_secret_fails_closed(self):
        response = self._post(_payload())
        assert response.status_code == 403

    def test_legacy_signature_header_alias_accepted(self):
        payload = _payload("webhook.test", "evt-alias")
        response = self._post(payload, sig_header="HTTP_X_LATE_SIGNATURE")
        assert response.status_code == 200

    def test_invalid_json_is_a_400(self):
        response = self._post(None, raw=b"{not json")
        assert response.status_code == 400

    def test_missing_event_id_is_a_400(self):
        payload = _payload("webhook.test", event_id=None)
        del payload["id"]
        response = self.client.post(
            self.url,
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_ZERNIO_SIGNATURE=_sign(json.dumps(payload).encode()),
        )
        assert response.status_code == 400

    def test_webhook_test_event_is_acked_and_stored(self):
        response = self._post(_payload("webhook.test", "evt-test"))
        assert response.status_code == 200
        row = ZernioWebhookEvent.objects.get(event_id="evt-test")
        assert row.processed_at is not None

    # --- post status mapping --------------------------------------------------

    def test_platform_published_settles_the_row(self):
        response = self._post_for_pp()
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED
        assert self.pp.platform_post_id == "fb-9"
        assert self.pp.published_at is not None

    def test_rollup_published_settles_via_metadata_fallback(self):
        self.pp.status = PlatformPost.Status.SCHEDULED
        self.pp.save(update_fields=["status"])
        payload = _payload("post.published", "evt-2")
        payload["post"]["metadata"]["platform_post_id"] = str(self.pp.id)
        response = self._post(payload)
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED

    def test_resolution_falls_back_to_provider_post_id(self):
        payload = _payload("post.platform.published", "evt-3", metadata=False)
        response = self._post(payload)
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED

    def test_platform_failed_fails_with_provider_error(self):
        response = self._post_for_pp("post.platform.failed", "evt-4", status="failed", error="token expired")
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.FAILED
        assert self.pp.last_provider_error == "token expired"
        assert "token expired" in self.pp.publish_error

    def test_post_cancelled_fails_as_cancelled(self):
        response = self._post_for_pp("post.cancelled", "evt-5", status="cancelled")
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.FAILED
        assert "cancelled" in self.pp.publish_error

    def test_late_failure_cannot_regress_a_published_row(self):
        self.pp.status = PlatformPost.Status.PUBLISHED
        self.pp.save(update_fields=["status"])
        response = self._post_for_pp("post.platform.failed", "evt-6", status="failed", error="boom")
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED

    def test_late_success_settles_a_gave_up_row(self):
        # _give_up_unconfirmed leaves the row FAILED with provider_post_id
        # kept for exactly this reconciliation.
        self.pp.status = PlatformPost.Status.FAILED
        self.pp.publish_error = "never confirmed"
        self.pp.save(update_fields=["status", "publish_error"])
        response = self._post_for_pp("post.platform.published", "evt-7")
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED

    def test_untracked_post_is_acked(self):
        payload = _payload("post.platform.published", "evt-8")
        payload["post"]["metadata"]["platform_post_id"] = "00000000-0000-0000-0000-000000000000"
        payload["post"]["_id"] = "unknown"
        response = self._post(payload)
        assert response.status_code == 200

    # --- dedupe ---------------------------------------------------------------

    def test_redelivery_is_not_reprocessed(self):
        assert self._post_for_pp(event_id="evt-9").status_code == 200
        first = ZernioWebhookEvent.objects.get(event_id="evt-9")
        response = self._post_for_pp(event_id="evt-9")
        assert response.status_code == 200
        assert response.json()["status"] == "duplicate"
        assert ZernioWebhookEvent.objects.filter(event_id="evt-9").count() == 1
        first.refresh_from_db()
        assert first.processed_at is not None

    # --- account events --------------------------------------------------------

    def test_account_disconnected_marks_the_account(self):
        payload = {
            "id": "evt-10",
            "event": "account.disconnected",
            "timestamp": "2026-10-31T13:00:00Z",
            "account": {"accountId": ACC, "profileId": "prof-1"},
        }
        response = self._post(payload)
        assert response.status_code == 200
        self.account.refresh_from_db()
        assert self.account.connection_status == SocialAccount.ConnectionStatus.DISCONNECTED

    def test_platform_deleted_only_records_provider_state(self):
        self.pp.status = PlatformPost.Status.PUBLISHED
        self.pp.save(update_fields=["status"])
        response = self._post_for_pp("post.platform.deleted", "evt-11", status="deleted")
        assert response.status_code == 200
        self.pp.refresh_from_db()
        assert self.pp.status == PlatformPost.Status.PUBLISHED
        assert self.pp.last_provider_status == "deleted"

    def test_unknown_event_is_acked(self):
        response = self._post(_payload("post.recycled", "evt-12"))
        assert response.status_code == 200
        assert ZernioWebhookEvent.objects.get(event_id="evt-12").processed_at is not None
