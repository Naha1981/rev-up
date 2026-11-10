import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.media_library.storage import reset_cached_client
from apps.members.models import OrgMembership
from apps.organizations.models import Organization


@pytest.fixture
def user(db):
    u = User.objects.create_user(
        email="test@example.com", password="testpass123", name="Test User", tos_accepted_at=timezone.now()
    )
    # Pay-first: signup auto-provisions a locked (expired) org. Most tests act
    # for a paying customer, so activate the auto-provisioned org here; tests
    # for the locked state build their own users.
    membership = OrgMembership.objects.filter(user=u).select_related("organization").first()
    if membership:
        membership.organization.subscription_status = Organization.SubscriptionStatus.ACTIVE
        membership.organization.save(update_fields=["subscription_status"])
    return u


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Test Organization", subscription_status="active")


@pytest.fixture
def org_owner(db, user, organization):
    OrgMembership.objects.create(user=user, organization=organization, org_role=OrgMembership.OrgRole.OWNER)
    return user


@pytest.fixture(autouse=True)
def _fresh_storage_client():
    """Keep the memoized boto3 client from leaking across tests.

    ``apps.media_library.storage`` caches one client for the life of the
    process — the point is to stop django-storages rebuilding a boto3 Session
    per thread. Without this, the first test to touch S3 would pin its client
    and every later ``override_settings`` on a bucket or endpoint would be
    silently ignored.
    """
    reset_cached_client()
    yield
    reset_cached_client()
