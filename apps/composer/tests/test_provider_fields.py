"""PlatformPost provider fields: defaults and the idempotency constraint (M1)."""

from django.db import IntegrityError
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.composer.models import PlatformPost, Post
from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace


def _platform_post(workspace, author, account, post, **kwargs):
    return PlatformPost(post=post, social_account=account, **kwargs)


class ProviderFieldTestCase(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="PP Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="PP WS")
        self.author = User.objects.create_user(email="pp@example.com", password="pw", tos_accepted_at=timezone.now())
        self.account = SocialAccount.objects.create(
            workspace=self.workspace,
            platform="facebook",
            account_platform_id="fb-1",
            account_name="FB",
        )
        self.post = Post.objects.create(
            workspace=self.workspace,
            author=self.author,
            title="T",
            caption="c",
        )

    def test_new_rows_default_to_zernio_and_empty_sync_state(self):
        pp = PlatformPost.objects.create(post=self.post, social_account=self.account)
        assert pp.provider == "zernio"
        assert pp.provider_post_id == ""
        assert pp.idempotency_key is None
        assert pp.last_provider_status == ""
        assert pp.last_provider_error == ""
        assert pp.last_status_synced_at is None


class IdempotencyConstraintTest(TransactionTestCase):
    """Unique (provider, idempotency_key); NULLs must never collide."""

    def setUp(self):
        self.org = Organization.objects.create(subscription_status="active", name="IK Org")
        self.workspace = Workspace.objects.create(organization=self.org, name="IK WS")
        self.author = User.objects.create_user(email="ik@example.com", password="pw", tos_accepted_at=timezone.now())
        self.account = SocialAccount.objects.create(
            workspace=self.workspace,
            platform="facebook",
            account_platform_id="fb-1",
            account_name="FB",
        )
        self.other_account = SocialAccount.objects.create(
            workspace=self.workspace,
            platform="instagram",
            account_platform_id="ig-1",
            account_name="IG",
        )

    def _post(self, title):
        return Post.objects.create(workspace=self.workspace, author=self.author, title=title, caption="c")

    def test_undispatched_rows_with_null_keys_never_collide(self):
        PlatformPost.objects.create(post=self._post("a"), social_account=self.account)
        PlatformPost.objects.create(post=self._post("b"), social_account=self.other_account)
        assert PlatformPost.objects.filter(idempotency_key__isnull=True).count() == 2

    def test_same_provider_and_key_is_refused(self):
        PlatformPost.objects.create(
            post=self._post("a"),
            social_account=self.account,
            idempotency_key="k-1",
        )
        with self.assertRaises(IntegrityError):
            PlatformPost.objects.create(
                post=self._post("b"),
                social_account=self.other_account,
                idempotency_key="k-1",
            )

    def test_same_key_under_another_provider_is_allowed(self):
        PlatformPost.objects.create(
            post=self._post("a"),
            social_account=self.account,
            idempotency_key="k-1",
        )
        PlatformPost.objects.create(
            post=self._post("b"),
            social_account=self.other_account,
            provider="other-provider",
            idempotency_key="k-1",
        )
        assert PlatformPost.objects.filter(idempotency_key="k-1").count() == 2
