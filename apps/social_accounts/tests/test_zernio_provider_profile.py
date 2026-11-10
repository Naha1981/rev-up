"""WorkspaceProviderProfile and the SocialAccount provider fields (M1)."""

from django.db import IntegrityError
from django.test import TestCase

from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount, WorkspaceProviderProfile
from apps.workspaces.models import Workspace


class WorkspaceProviderProfileTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="Z Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="Z WS")

    def test_one_profile_per_workspace_and_provider(self):
        WorkspaceProviderProfile.objects.create(workspace=self.workspace, profile_id="prof-1")
        with self.assertRaises(IntegrityError):
            WorkspaceProviderProfile.objects.create(
                workspace=self.workspace,
                provider=WorkspaceProviderProfile.Provider.ZERNIO,
                profile_id="prof-2",
            )

    def test_defaults(self):
        profile = WorkspaceProviderProfile.objects.create(workspace=self.workspace, profile_id="prof-1")
        assert profile.provider == WorkspaceProviderProfile.Provider.ZERNIO
        assert profile.status == WorkspaceProviderProfile.Status.ACTIVE
        assert profile.metadata == {}

    def test_different_workspaces_may_each_hold_a_profile(self):
        other = Workspace.objects.create(organization=self.org, name="Other WS")
        WorkspaceProviderProfile.objects.create(workspace=self.workspace, profile_id="prof-1")
        WorkspaceProviderProfile.objects.create(workspace=other, profile_id="prof-2")
        assert WorkspaceProviderProfile.objects.count() == 2


class SocialAccountProviderFieldsTest(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="P Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="P WS")

    def _account(self, **kwargs):
        return SocialAccount.objects.create(
            workspace=self.workspace,
            platform=kwargs.pop("platform", "facebook"),
            account_platform_id=kwargs.pop("account_platform_id", "fb-1"),
            account_name="Acct",
            **kwargs,
        )

    def test_new_rows_default_to_zernio(self):
        account = self._account()
        assert account.provider == "zernio"
        assert account.provider_account_id == ""
        assert account.provider_profile_id == ""

    def test_zernio_ids_round_trip(self):
        account = self._account(provider_account_id="z-acc-9", provider_profile_id="z-prof-3")
        account.refresh_from_db()
        assert account.provider_account_id == "z-acc-9"
        assert account.provider_profile_id == "z-prof-3"
