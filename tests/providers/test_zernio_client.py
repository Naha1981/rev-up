"""ZernioClient contract tests - mocked transport, no network.

Every assertion pins something the Zernio docs (verified 31 Oct 2026)
promise: the Bearer header, the profile/connect/accounts/posts endpoints,
the Idempotency-Key retry contract, the 200/201/207 split, the error
envelope, and the HMAC-SHA256 webhook signature.
"""

import hashlib
import hmac
import json

import httpx
import pytest

from providers.exceptions import ProviderError
from providers.zernio import (
    SUPPORTED_PLATFORMS,
    ZernioClient,
    ZernioError,
    normalise_status,
)

API_KEY = "zrn-test-key"


def make_client(handler, **kwargs):
    return ZernioClient(api_key=API_KEY, transport=httpx.MockTransport(handler), **kwargs)


def json_response(status, body, headers=None):
    return httpx.Response(status, json=body, headers=headers or {})


# ------------------------------------------------------------------ basics


def test_bearer_header_sent_and_key_never_in_text():
    seen = {}

    def handler(request):
        seen["authorization"] = request.headers.get("Authorization")
        return json_response(200, {"profiles": []})

    with make_client(handler) as client:
        client.get_profile_by_external_id("ws-1")

    assert seen["authorization"] == f"Bearer {API_KEY}"
    assert API_KEY not in str(client)
    assert API_KEY not in repr(client)


def test_missing_api_key_refused_without_a_request():
    with pytest.raises(ZernioError) as exc_info:
        ZernioClient(api_key="")
    assert exc_info.value.retryable is False
    assert exc_info.value.code == "missing_credentials"


def test_client_is_a_provider_error_family():
    assert issubclass(ZernioError, ProviderError)


# ----------------------------------------------------------------- profiles


def test_create_profile_posts_name_and_external_id():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        seen["idem"] = request.headers.get("Idempotency-Key")
        return json_response(201, {"message": "created", "profile": {"_id": "prof-1", "externalId": "ws-1"}})

    with make_client(handler) as client:
        profile = client.create_profile(
            name="Acme", external_id="ws-1", timezone="Africa/Johannesburg", idempotency_key="k-1"
        )

    assert profile["_id"] == "prof-1"
    assert seen["body"] == {"name": "Acme", "externalId": "ws-1", "timezone": "Africa/Johannesburg"}
    assert seen["idem"] == "k-1"


def test_profile_conflict_raises_with_existing_id_in_raw():
    def handler(request):
        return json_response(
            409,
            {
                "error": "A profile with this externalId already exists",
                "type": "invalid_request_error",
                "code": "profile_external_id_conflict",
                "details": {"existingProfileId": "prof-existing"},
            },
        )

    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.create_profile(name="Acme", external_id="ws-1")

    err = exc_info.value
    assert err.code == "profile_external_id_conflict"
    assert err.status_code == 409
    assert err.retryable is False  # NOT idempotency_conflict - retrying conflicts forever
    assert err.raw_response["details"]["existingProfileId"] == "prof-existing"


def test_get_or_create_profile_recovers_the_existing_profile():
    calls = []

    def handler(request):
        calls.append(request.method)
        if request.method == "POST":
            return json_response(
                409,
                {
                    "error": "dup",
                    "code": "profile_external_id_conflict",
                    "details": {"existingProfileId": "prof-existing"},
                },
            )
        return json_response(200, {"profiles": [{"_id": "prof-existing", "externalId": "ws-1"}]})

    with make_client(handler) as client:
        profile = client.get_or_create_profile(name="Acme", external_id="ws-1")

    assert profile["_id"] == "prof-existing"
    assert calls == ["POST", "GET"]


def test_get_or_create_profile_reraises_other_errors():
    def handler(request):
        return json_response(500, {"error": "boom", "code": "api_error"})

    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.get_or_create_profile(name="Acme", external_id="ws-1")

    assert exc_info.value.code == "api_error"
    assert exc_info.value.retryable is True


def test_get_profile_by_external_id_returns_none_when_absent():
    with make_client(lambda r: json_response(200, {"profiles": []})) as client:
        assert client.get_profile_by_external_id("nope") is None


# ------------------------------------------------------------------ connect


def test_connect_url_passes_profile_and_redirect():
    seen = {}

    def handler(request):
        seen["path"] = request.url.path
        seen["params"] = dict(request.url.params)
        return json_response(200, {"authUrl": "https://zernio.com/connect/abc"})

    with make_client(handler) as client:
        url = client.get_connect_url("facebook", profile_id="prof-1", redirect_url="https://revup.example/connected")

    assert url == "https://zernio.com/connect/abc"
    assert seen["path"] == "/api/v1/connect/facebook"  # base_url prefix included
    assert seen["params"] == {"profileId": "prof-1", "redirect_url": "https://revup.example/connected"}


def test_connect_url_refuses_unsupported_platforms_without_a_request():
    def handler(request):
        raise AssertionError("no request may leave for a refused platform")

    with make_client(handler) as client:
        for platform in ("x", "snapchat", "myspace"):
            with pytest.raises(ZernioError) as exc_info:
                client.get_connect_url(platform, profile_id="prof-1", redirect_url="https://revup.example/cb")
            assert exc_info.value.code == "unsupported_platform"
            assert exc_info.value.retryable is False


def test_supported_platforms_cover_the_full_spec():
    """Every platform the spec makes connectable. Snapchat stays out (closed beta)."""
    assert set(SUPPORTED_PLATFORMS) == {
        "facebook",
        "instagram",
        "tiktok",
        "linkedin",
        "twitter",
        "youtube",
        "pinterest",
        "threads",
        "googlebusiness",
        "reddit",
        "bluesky",
        "telegram",
        "whatsapp",
        "discord",
        "slack",
    }


def test_connect_url_accepts_a_nested_data_envelope():
    with make_client(lambda r: json_response(200, {"data": {"authUrl": "https://zernio.com/connect/xyz"}})) as client:
        assert (
            client.get_connect_url("instagram", profile_id="p", redirect_url="https://r.example/cb")
            == "https://zernio.com/connect/xyz"
        )


def test_connect_url_without_authurl_is_retryable():
    with (
        make_client(lambda r: json_response(200, {"unexpected": True})) as client,
        pytest.raises(ZernioError) as exc_info,
    ):
        client.get_connect_url("facebook", profile_id="p", redirect_url="https://r.example/cb")
    assert exc_info.value.retryable is True


# ----------------------------------------------------------------- accounts


def test_list_accounts_passes_filters_and_returns_the_list():
    seen = {}

    def handler(request):
        seen["params"] = dict(request.url.params)
        return json_response(
            200,
            {"accounts": [{"_id": "acc-1", "platform": "instagram", "username": "acme"}], "hasAnalyticsAccess": True},
        )

    with make_client(handler) as client:
        accounts = client.list_accounts(profile_id="prof-1", platform="instagram", status="connected")

    assert [a["_id"] for a in accounts] == ["acc-1"]
    assert seen["params"] == {"profileId": "prof-1", "platform": "instagram", "status": "connected"}


# -------------------------------------------------------------------- posts

PLATFORM_ENTRY = {"platform": "facebook", "accountId": "acc-1"}


def test_create_post_body_and_idempotency_key():
    seen: dict = {}

    def create_post_handler(request):
        seen["body"] = json.loads(request.content)
        seen["idem"] = request.headers.get("Idempotency-Key")
        return json_response(201, {"message": "Post created", "post": {"_id": "post-1", "status": "scheduled"}})

    with make_client(create_post_handler) as client:
        result = client.create_post(
            platforms=[PLATFORM_ENTRY],
            content="hello",
            media_items=[{"url": "https://cdn.example/a.jpg", "type": "image"}],
            scheduled_for="2026-11-01T09:00:00+02:00",
            timezone="Africa/Johannesburg",
            metadata={"workspace": "ws-1"},
            idempotency_key="11111111-1111-1111-1111-111111111111",
        )

    assert result["post"]["_id"] == "post-1"
    assert result["partial"] is False
    assert result["idempotent_replay"] is False
    assert seen["idem"] == "11111111-1111-1111-1111-111111111111"
    assert seen["body"]["platforms"] == [PLATFORM_ENTRY]
    assert seen["body"]["content"] == "hello"
    assert seen["body"]["mediaItems"] == [{"url": "https://cdn.example/a.jpg", "type": "image"}]
    assert seen["body"]["scheduledFor"] == "2026-11-01T09:00:00+02:00"
    assert seen["body"]["timezone"] == "Africa/Johannesburg"
    assert seen["body"]["metadata"] == {"workspace": "ws-1"}
    assert "publishNow" not in seen["body"]
    assert "isDraft" not in seen["body"]


def test_create_post_200_is_an_idempotent_replay_not_a_new_post():
    def handler(request):
        return json_response(
            200,
            {
                "message": "Post already exists (idempotent retry)",
                "post": {"_id": "post-original", "status": "scheduled"},
            },
        )

    with make_client(handler) as client:
        result = client.create_post(platforms=[PLATFORM_ENTRY], content="hi", idempotency_key="k-dup")

    assert result["idempotent_replay"] is True
    assert result["post"]["_id"] == "post-original"


def test_create_post_207_is_partial_not_success_not_error():
    def handler(request):
        return json_response(
            207,
            {
                "message": "partial",
                "post": {"_id": "post-2", "status": "partial"},
                "platformResults": [{"platform": "facebook", "status": "failed", "error": "boom"}],
            },
        )

    with make_client(handler) as client:
        result = client.create_post(platforms=[PLATFORM_ENTRY], content="hi", publish_now=True, idempotency_key="k-207")

    assert result["partial"] is True
    assert result["idempotent_replay"] is False
    assert result["post"]["status"] == "partial"


def test_create_post_duplicate_content_409_is_permanent_and_names_the_original():
    def handler(request):
        return json_response(
            409,
            {
                "error": "Duplicate post",
                "code": "duplicate_post",
                "accountId": "acc-1",
                "platform": "facebook",
                "existingPostId": "post-original",
            },
        )

    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.create_post(platforms=[PLATFORM_ENTRY], content="same", idempotency_key="k-new")

    err = exc_info.value
    assert err.status_code == 409
    assert err.retryable is False
    assert err.raw_response["existingPostId"] == "post-original"


def test_idempotency_conflict_409_is_retryable_with_retry_after():
    def handler(request):
        return json_response(
            409, {"error": "still processing", "code": "idempotency_conflict"}, headers={"Retry-After": "2"}
        )

    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.create_post(platforms=[PLATFORM_ENTRY], content="hi", idempotency_key="k-busy")

    assert exc_info.value.retryable is True
    assert exc_info.value.retry_after == 2.0


def test_get_post_returns_the_post_object():
    with make_client(lambda r: json_response(200, {"post": {"_id": "post-9", "status": "published"}})) as client:
        assert client.get_post("post-9")["_id"] == "post-9"


# ------------------------------------------------------------- error shape


@pytest.mark.parametrize(
    "status,retryable",
    [(400, False), (401, False), (403, False), (404, False), (422, False), (429, True), (500, True), (503, True)],
)
def test_error_envelope_parsing_and_retryability(status, retryable):
    body = {"error": "something broke", "type": "api_error", "code": "some_code", "platform": "meta"}

    with make_client(lambda r: json_response(status, body)) as client, pytest.raises(ZernioError) as exc_info:
        client.list_accounts()

    err = exc_info.value
    assert err.status_code == status
    assert err.code == "some_code"
    assert err.error_type == "api_error"
    assert err.platform == "meta"
    assert err.retryable is retryable
    assert str(err) == "something broke"


def test_non_json_error_body_still_raises_safely():
    with (
        make_client(lambda r: httpx.Response(502, text="<html>bad gateway</html>")) as client,
        pytest.raises(ZernioError) as exc_info,
    ):
        client.list_accounts()
    assert exc_info.value.status_code == 502
    assert exc_info.value.retryable is True


def test_timeout_is_a_retryable_error():
    def handler(request):
        raise httpx.ReadTimeout("slow", request=request)

    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.list_accounts()

    assert exc_info.value.retryable is True
    assert exc_info.value.status_code == 0


def test_api_key_never_leaks_into_error_text():
    def handler(request):
        return json_response(500, {"error": "upstream broke", "code": "api_error"})

    # Zernio's own envelope text is upstream's; this pins that OUR exception
    # surface never carries the key or the Bearer header.
    with make_client(handler) as client, pytest.raises(ZernioError) as exc_info:
        client.list_accounts()
    err = exc_info.value
    for attr in (str(err), err.code, err.error_type):
        assert API_KEY not in attr
        assert "Bearer" not in attr


# ----------------------------------------------------------------- webhooks


def test_create_webhook_settings_posts_name_url_secret_events():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        return json_response(200, {"success": True, "webhook": {"_id": "wh-1", "isActive": True}})

    with make_client(handler) as client:
        webhook = client.create_webhook_settings(
            name="RevUp production",
            url="https://revup.example/api/webhooks/zernio",
            secret="s3cret",
            events=["post.published", "post.failed"],
            profile_ids=["prof-1"],
        )

    assert webhook["_id"] == "wh-1"
    assert seen["body"] == {
        "name": "RevUp production",
        "url": "https://revup.example/api/webhooks/zernio",
        "secret": "s3cret",
        "events": ["post.published", "post.failed"],
        "profileIds": ["prof-1"],
    }


def test_verify_webhook_signature_roundtrip():
    body = json.dumps({"id": "evt-1", "event": "post.published"}).encode()
    signature = hmac.new(b"s3cret", body, hashlib.sha256).hexdigest()

    assert ZernioClient.verify_webhook_signature(body, signature, "s3cret") is True
    assert ZernioClient.verify_webhook_signature(body, signature.upper(), "s3cret") is True
    assert ZernioClient.verify_webhook_signature(body, "0" * 64, "s3cret") is False
    assert ZernioClient.verify_webhook_signature(body, signature, "wrong") is False
    assert ZernioClient.verify_webhook_signature(body, signature, "") is False
    assert ZernioClient.verify_webhook_signature(body, "", "s3cret") is False
    # A re-serialised body is not the raw body: different bytes must fail.
    assert ZernioClient.verify_webhook_signature(body + b" ", signature, "s3cret") is False


# ------------------------------------------------------------ status mapping


@pytest.mark.parametrize(
    "zernio,expected",
    [
        ("pending", "scheduled"),
        ("uploading", "publishing"),
        ("processing", "publishing"),
        ("published", "published"),
        ("failed", "failed"),
        ("cancelled", "draft"),
    ],
)
def test_normalise_status_known_values(zernio, expected):
    assert normalise_status(zernio) == expected


def test_normalise_status_unknown_returns_none_never_a_guess():
    assert normalise_status("some_future_status") is None
    assert normalise_status("") is None
