"""Tests for social_accounts models."""

from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from django.db import IntegrityError
from django.utils import timezone

from apps.credentials.models import PlatformCredential
from apps.social_accounts.models import SocialAccount


@pytest.fixture
def organization(db):
    from apps.organizations.models import Organization

    return Organization.objects.create(name="Test Org")


@pytest.fixture
def workspace(db, organization):
    from apps.workspaces.models import Workspace

    return Workspace.objects.create(
        name="Test Workspace",
        organization=organization,
    )


@pytest.fixture
def social_account(db, workspace):
    return SocialAccount.objects.create(
        workspace=workspace,
        platform="facebook",
        account_platform_id="123456",
        account_name="Test Page",
        account_handle="testpage",
        oauth_access_token="test_access_token_value",
        oauth_refresh_token="test_refresh_token_value",
    )


@pytest.mark.django_db
class TestSocialAccount:
    def test_create_account(self, social_account):
        assert social_account.pk is not None
        assert social_account.platform == "facebook"
        assert social_account.account_name == "Test Page"
        assert social_account.connection_status == SocialAccount.ConnectionStatus.CONNECTED

    def test_str_representation(self, social_account):
        assert str(social_account) == "Test Page (Facebook)"

    def test_encrypted_token_round_trip(self, social_account):
        """Tokens should encrypt at rest and decrypt on read."""
        account = SocialAccount.objects.get(pk=social_account.pk)
        assert account.oauth_access_token == "test_access_token_value"
        assert account.oauth_refresh_token == "test_refresh_token_value"

    def test_unique_constraint(self, workspace, social_account):
        """Same workspace + platform + platform_id should be unique."""
        with pytest.raises(IntegrityError):
            SocialAccount.objects.create(
                workspace=workspace,
                platform="facebook",
                account_platform_id="123456",
                account_name="Duplicate",
            )

    def test_different_platform_same_id_allowed(self, workspace, social_account):
        """Different platform with same platform_id should be allowed."""
        account = SocialAccount.objects.create(
            workspace=workspace,
            platform="instagram",
            account_platform_id="123456",
            account_name="IG Account",
        )
        assert account.pk is not None

    def test_workspace_scoped_manager(self, workspace, social_account, organization):
        """for_workspace() should filter by workspace."""
        other_ws = workspace.__class__.objects.create(name="Other WS", organization=organization)
        SocialAccount.objects.create(
            workspace=other_ws,
            platform="linkedin_company",
            account_platform_id="789",
            account_name="Other Account",
        )

        accounts = SocialAccount.objects.for_workspace(workspace.id)
        assert accounts.count() == 1
        assert accounts.first().account_name == "Test Page"

    def test_is_token_expiring_soon_true(self, social_account):
        social_account.token_expires_at = timezone.now() + timedelta(days=3)
        social_account.save()
        assert social_account.is_token_expiring_soon is True

    def test_is_token_expiring_soon_false(self, social_account):
        social_account.token_expires_at = timezone.now() + timedelta(days=30)
        social_account.save()
        assert social_account.is_token_expiring_soon is False

    def test_is_token_expiring_soon_no_expiry(self, social_account):
        assert social_account.token_expires_at is None
        assert social_account.is_token_expiring_soon is False

    def test_needs_reconnect_error(self, social_account):
        social_account.connection_status = SocialAccount.ConnectionStatus.ERROR
        assert social_account.needs_reconnect is True

    def test_needs_reconnect_disconnected(self, social_account):
        social_account.connection_status = SocialAccount.ConnectionStatus.DISCONNECTED
        assert social_account.needs_reconnect is True

    def test_needs_reconnect_connected(self, social_account):
        assert social_account.needs_reconnect is False

    def test_cascade_delete_workspace(self, social_account, workspace):
        """Deleting workspace should cascade delete accounts."""
        workspace.delete()
        assert SocialAccount.objects.filter(pk=social_account.pk).count() == 0


class TestDisconnectRevocation:
    @pytest.mark.parametrize("platform", sorted(PlatformCredential.Platform.values))
    def test_the_revocation_claim_matches_the_provider(self, platform):
        """The disconnect confirmation promises revocation on these platforms,
        so each one's provider must actually call out to revoke — and every
        other provider must not, or the copy undersells what happens.

        Providers with no revocation endpoint simply make no call."""
        from providers import PROVIDER_REGISTRY

        if platform not in PROVIDER_REGISTRY:
            pytest.skip("Zernio-managed platform: disconnect revokes via Zernio, not a direct provider")

        provider = PROVIDER_REGISTRY[platform](
            {
                "client_id": "id",
                "client_secret": "secret",
                "client_key": "key",
            }
        )
        provider._request = MagicMock()
        provider.revoke_token("token")

        account = SocialAccount(platform=platform)
        calls_out = provider._request.called
        assert account.revokes_platform_grant_on_disconnect is calls_out, platform
        if calls_out:
            assert not account.keeps_platform_grant_on_disconnect, platform

    def test_youtube_revokes_with_the_refresh_token(self):
        """Google refuses an expired access token, and ours lives an hour."""
        account = SocialAccount(platform="youtube", oauth_access_token="access", oauth_refresh_token="refresh")
        assert account.revocation_token == "refresh"

    def test_youtube_falls_back_to_the_access_token(self):
        account = SocialAccount(platform="youtube", oauth_access_token="access")
        assert account.revocation_token == "access"

    def test_other_platforms_revoke_with_the_access_token(self):
        account = SocialAccount(platform="tiktok", oauth_access_token="access", oauth_refresh_token="refresh")
        assert account.revocation_token == "access"


@pytest.mark.django_db
class TestAnalyticsPlatformConfigEnabledPlatforms:
    """``enabled_platforms`` decides which platforms the analytics stack serves."""

    def test_platform_without_a_row_counts_as_enabled(self):
        """The seed migration enumerated the choices as of its own migration, so
        every slug added afterwards has no row. Reading
        that as "disabled" switched analytics off for them silently — and
        invisibly, since a platform with no row isn't listed in the admin either.
        """
        from apps.credentials.models import PlatformCredential
        from apps.social_accounts.models import AnalyticsPlatformConfig

        AnalyticsPlatformConfig.objects.filter(platform=PlatformCredential.Platform.THREADS).delete()

        assert PlatformCredential.Platform.THREADS in AnalyticsPlatformConfig.enabled_platforms()

    def test_disabled_row_is_honored(self):
        from apps.social_accounts.models import AnalyticsPlatformConfig

        AnalyticsPlatformConfig.objects.update_or_create(platform="instagram_login", defaults={"is_enabled": False})

        assert "instagram_login" not in AnalyticsPlatformConfig.enabled_platforms()

    def test_stale_slug_row_does_not_leak_into_the_result(self):
        """``instagram_personal`` was renamed to ``instagram_login``; a row left
        behind by a partially-applied rename must not appear as a platform.
        """
        from apps.social_accounts.models import AnalyticsPlatformConfig

        AnalyticsPlatformConfig.objects.create(platform="instagram_personal", is_enabled=True)

        assert "instagram_personal" not in AnalyticsPlatformConfig.enabled_platforms()
