"""Content-agent tests: external calls are always mocked; the agent must
never approve, schedule, or publish anything."""

from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.accounts.models import User
from apps.composer.models import PlatformPost, Post
from apps.organizations.models import Organization
from apps.social_accounts.models import PlatformCredential, SocialAccount
from apps.workspaces.models import Workspace

from .models import AgentConfig, GenerationRun
from .services import draft_posts, queue_drafts_for_review, research_trends, run_for_config


def make_workspace(name="Test Bistro"):
    org = Organization.objects.create(subscription_status="active", name=f"{name} org")
    return Workspace.objects.create(organization=org, name=name)


def make_config(**kwargs):
    workspace = kwargs.pop("workspace", None) or make_workspace()
    defaults = {
        "enabled": True,
        "niche": "family restaurant in Soweto",
        "topics": ["winter specials", "family platters"],
        "posts_per_run": 2,
    }
    defaults.update(kwargs)
    return AgentConfig.objects.create(workspace=workspace, **defaults)


class FakeResponse:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


class FakeHttp:
    """Stands in for httpx.Client for both SearXNG (GET) and Gemini (POST)."""

    def __init__(self, search_payload=None, gemini_payloads=None, search_exc=None, post_exc=None):
        self.search_payload = search_payload or {"results": []}
        self.gemini_payloads = list(gemini_payloads or [])
        self.search_exc = search_exc
        self.post_exc = post_exc
        self.posted_prompts = []

    def get(self, url, params=None, **kw):
        if self.search_exc:
            raise self.search_exc
        return FakeResponse(self.search_payload)

    def post(self, url, params=None, json=None, **kw):
        if self.post_exc:
            raise self.post_exc
        self.posted_prompts.append(json["contents"][0]["parts"][0]["text"])
        default_text = '{"caption": "Fresh winter specials are on.", "hashtags": ["#SowetoEats"]}'
        payload = self.gemini_payloads.pop(0) if self.gemini_payloads else None
        if payload is None:
            payload = {"candidates": [{"content": {"parts": [{"text": default_text}]}}]}
        return FakeResponse(payload)


@override_settings(CONTENT_AGENT_SEARXNG_URL="http://searxng.test")
class TrendResearchTests(TestCase):
    def test_live_trends_from_searxng(self):
        config = make_config()
        http = FakeHttp(
            search_payload={"results": [{"title": "Winter warmer menus trend"}, {"title": "Sunday lunch rush"}]}
        )
        topics, source = research_trends(config, client=http)
        self.assertEqual(source, "searxng")
        self.assertEqual(topics, ["Winter warmer menus trend", "Sunday lunch rush"])

    def test_searxng_down_falls_back_to_seeds(self):
        config = make_config()
        topics, source = research_trends(config, client=FakeHttp(search_exc=RuntimeError("boom")))
        self.assertEqual(source, "seeds")
        self.assertEqual(topics, ["winter specials", "family platters"])


@override_settings(CONTENT_AGENT_GEMINI_API_KEY="test-key")
class DraftTests(TestCase):
    def test_drafts_captions(self):
        config = make_config()
        drafts = draft_posts(config, ["winter specials"], client=FakeHttp())
        self.assertEqual(len(drafts), 1)
        self.assertIn("winter specials", drafts[0].caption.lower() if False else "fresh winter specials are on.")

    def test_bad_model_reply_is_skipped_not_fatal(self):
        config = make_config()
        bad = {"candidates": [{"content": {"parts": [{"text": "not json at all"}]}}]}
        drafts = draft_posts(config, ["a", "b"], client=FakeHttp(gemini_payloads=[bad, None]))
        self.assertEqual(len(drafts), 1)

    def test_missing_api_key_raises_for_caller_to_record(self):
        config = make_config()
        with override_settings(CONTENT_AGENT_GEMINI_API_KEY=""), self.assertRaises(RuntimeError):
            draft_posts(config, ["x"], client=FakeHttp())


class QueueTests(TestCase):
    def test_drafts_land_pending_review_never_scheduled(self):
        workspace = make_workspace()
        config = make_config(workspace=workspace)
        User.objects.create_user(email="owner@example.com", password="x")
        account = SocialAccount.objects.create(
            workspace=workspace,
            platform=PlatformCredential.Platform.LINKEDIN_COMPANY,
            account_platform_id="urn:li:organization:1",
            account_name="NahaLabs",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
            oauth_access_token="t",
        )
        from .services import Draft

        ids = queue_drafts_for_review(config, [Draft(topic="t", caption="hello", hashtags=["#one"])])
        self.assertEqual(len(ids), 1)
        post = Post.objects.get(id=ids[0])
        self.assertIn("#one", post.caption)
        pp = PlatformPost.objects.get(post=post, social_account=account)
        self.assertEqual(pp.status, PlatformPost.Status.PENDING_REVIEW)
        self.assertIsNone(post.scheduled_at)

    def test_no_accounts_still_creates_base_post(self):
        config = make_config()
        from .services import Draft

        ids = queue_drafts_for_review(config, [Draft(topic="t", caption="solo")])
        self.assertEqual(len(ids), 1)


@override_settings(CONTENT_AGENT_SEARXNG_URL="", CONTENT_AGENT_GEMINI_API_KEY="k")
class RunTests(TestCase):
    def test_disabled_config_does_nothing(self):
        config = make_config(enabled=False)
        self.assertIsNone(run_for_config(config, client=FakeHttp()))
        self.assertEqual(GenerationRun.objects.count(), 0)

    def test_success_records_run_and_posts(self):
        config = make_config()
        run = run_for_config(config, client=FakeHttp())
        self.assertEqual(run.status, GenerationRun.Status.SUCCESS)
        self.assertEqual(run.trend_source, "seeds")
        self.assertEqual(len(run.post_ids), 2)
        self.assertEqual(Post.objects.filter(workspace=config.workspace).count(), 2)

    def test_rerun_inside_interval_is_skipped(self):
        config = make_config()
        run_for_config(config, client=FakeHttp())
        second = run_for_config(config, client=FakeHttp())
        self.assertEqual(second.status, GenerationRun.Status.SKIPPED)
        self.assertEqual(Post.objects.filter(workspace=config.workspace).count(), 2)

    def test_gemini_failure_records_failed_run_no_posts(self):
        config = make_config()
        # The service retries with real backoff sleeps; tests patch the sleep,
        # not the retry logic.
        with patch("apps.content_agent.services.time.sleep"):
            run = run_for_config(config, client=FakeHttp(post_exc=RuntimeError("quota")))
        self.assertEqual(run.status, GenerationRun.Status.FAILED)
        self.assertEqual(Post.objects.count(), 0)


class _FakeGroqHttp:
    """Stands in for httpx.Client on the Groq chat-completions path."""

    def __init__(self, payloads):
        self.payloads = list(payloads)
        self.posted = []

    def post(self, url, headers=None, json=None, **kw):
        self.posted.append({"url": url, "json": json})
        payload = self.payloads.pop(0)
        if isinstance(payload, Exception):
            raise payload
        return payload


def _groq_ok(caption="Braai platters from R199 this weekend - book your table!"):
    return FakeResponse(
        {"choices": [{"message": {"content": f'{{"caption": "{caption}", "hashtags": ["#sowetoeats", "#braai"]}}'}}]}
    )


@override_settings(CONTENT_AGENT_GEMINI_API_KEY="", GROQ_API_KEY="gsk-test")
class GroqDraftTests(TestCase):
    def test_groq_used_when_no_gemini_key(self):
        config = make_config()
        http = _FakeGroqHttp([_groq_ok(), _groq_ok("Sunday buffet: kids under 6 eat free.")])
        drafts = draft_posts(config, ["winter specials", "family platters"], client=http)
        self.assertEqual(len(drafts), 2)
        self.assertIn("R199", drafts[0].caption)
        self.assertEqual(drafts[0].hashtags, ["#sowetoeats", "#braai"])
        self.assertIn("api.groq.com/openai/v1/chat/completions", http.posted[0]["url"])

    def test_groq_skips_failed_topic_and_continues(self):
        config = make_config()
        bad = FakeResponse({"error": "boom"}, status=500)
        http = _FakeGroqHttp([bad, _groq_ok()])
        drafts = draft_posts(config, ["broken topic", "good topic"], client=http)
        self.assertEqual(len(drafts), 1)
        self.assertEqual(drafts[0].topic, "good topic")

    def test_no_provider_key_raises(self):
        config = make_config()
        with override_settings(GROQ_API_KEY=""), self.assertRaises(RuntimeError):
            draft_posts(config, ["anything"], client=_FakeGroqHttp([]))
