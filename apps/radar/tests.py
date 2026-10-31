import uuid

import pytest

from apps.radar.models import RadarIngestedItem
from apps.radar.services import ingest_feed_for_workspace
from apps.settings_manager.models import WorkspaceSetting
from apps.social_accounts.models import SocialAccount

FEED = {
    "business": "pilot-7f3a",
    "business_name": "Pilot restaurant",
    "radar": {
        "real": True,
        "items": [
            {
                "group": "Costs",
                "title": "Food inflation bites",
                "link": "https://news.example/a",
                "source": "Farmer's Weekly",
                "score": 4,
            },
            {
                "group": "Dining",
                "title": "Joburg dining trends",
                "link": "https://news.example/b",
                "source": "F&H",
                "score": 3,
            },
        ],
    },
}


def _fetch(feed):
    return lambda url: feed


def _wire_workspace(workspace, account, mode=None):
    WorkspaceSetting.objects.create(workspace=workspace, key="radar.feed_url", value="https://feed.example/pilot.json")
    WorkspaceSetting.objects.create(workspace=workspace, key="radar.social_account_id", value=str(account.id))
    if mode:
        WorkspaceSetting.objects.create(workspace=workspace, key="publishing.generated_post_mode", value=mode)


@pytest.fixture
def workspace(db, user):
    from apps.workspaces.models import Workspace

    org = user.org_memberships.first().organization
    return Workspace.objects.create(name="Radar WS", organization=org)


@pytest.fixture
def radar_account(workspace):
    return SocialAccount.objects.create(
        workspace=workspace,
        platform="threads",
        account_platform_id=f"t-{uuid.uuid4().hex[:8]}",
        account_name="Radar Test",
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )


@pytest.mark.django_db
class TestRadarIngest:
    def test_default_approval_mode_lands_in_pending_review(self, workspace, radar_account):
        _wire_workspace(workspace, radar_account)
        result = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        assert result == {"created": 2, "skipped": 0, "mode": "approval"}
        item = RadarIngestedItem.objects.get(workspace=workspace, link="https://news.example/a")
        assert item.post is not None
        pp = item.post.platform_posts.get()
        assert pp.status == "pending_review"

    def test_dedup_by_link_across_runs(self, workspace, radar_account):
        _wire_workspace(workspace, radar_account)
        first = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        second = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        assert first["created"] == 2
        assert second == {"created": 0, "skipped": 2, "mode": "approval"}
        assert RadarIngestedItem.objects.filter(workspace=workspace).count() == 2

    def test_draft_mode_keeps_draft(self, workspace, radar_account):
        _wire_workspace(workspace, radar_account, mode="draft")
        result = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        assert result["mode"] == "draft"
        pp = RadarIngestedItem.objects.get(workspace=workspace, link="https://news.example/b").post.platform_posts.get()
        assert pp.status == "draft"

    def test_max_items_per_run_caps(self, workspace, radar_account):
        _wire_workspace(workspace, radar_account)
        WorkspaceSetting.objects.create(workspace=workspace, key="radar.max_items_per_run", value=1)
        result = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        assert result["created"] == 1

    def test_no_feed_url_skips(self, workspace):
        assert ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))["mode"] == "no-feed"

    def test_feed_without_account_warns_and_skips(self, workspace):
        WorkspaceSetting.objects.create(
            workspace=workspace, key="radar.feed_url", value="https://feed.example/pilot.json"
        )
        assert ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))["mode"] == "no-account"

    def test_account_needs_reconnect_skips_cleanly(self, workspace, radar_account):
        _wire_workspace(workspace, radar_account)
        radar_account.connection_status = SocialAccount.ConnectionStatus.ERROR
        radar_account.save(update_fields=["connection_status"])
        result = ingest_feed_for_workspace(workspace, fetcher=_fetch(FEED))
        assert result == {"created": 0, "skipped": 0, "mode": "account-needs-reconnect"}
        assert RadarIngestedItem.objects.filter(workspace=workspace).count() == 0
