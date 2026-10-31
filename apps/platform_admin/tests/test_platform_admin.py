import pytest
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.platform_admin.costs import estimate_cost
from apps.social_accounts.models import SocialAccount
from apps.workspaces.models import Workspace


def make_user(email, **kw):
    return User.objects.create_user(
        email=email,
        password="x",
        name=email.split("@")[0],
        tos_accepted_at=timezone.now(),
        **kw,
    )


# --- cost calculator boundaries -------------------------------------------


@pytest.mark.parametrize(
    "count,free,billable,cents",
    [
        (0, 0, 0, 0),
        (1, 1, 0, 0),
        (2, 2, 0, 0),
        (3, 2, 1, 600),
        (10, 2, 8, 8 * 600),
        (11, 2, 9, 8 * 600 + 300),
        (100, 2, 98, 8 * 600 + 90 * 300),
        (101, 2, 99, 8 * 600 + 90 * 300 + 100),
        (2000, 2, 1998, 8 * 600 + 90 * 300 + 1900 * 100),
    ],
)
def test_estimate_cost_boundaries(count, free, billable, cents):
    result = estimate_cost(count)
    assert result["free_accounts"] == free
    assert result["billable_accounts"] == billable
    assert result["total_cents"] == cents
    assert result["beyond_published_pricing"] is False


def test_estimate_cost_beyond_published_pricing():
    result = estimate_cost(2001)
    assert result["beyond_published_pricing"] is True
    # Published tiers still charged; the overflow flagged, not guessed.
    assert result["total_cents"] == 8 * 600 + 90 * 300 + 1900 * 100
    assert result["tiers"][-1]["price_cents"] is None


# --- staff gating ----------------------------------------------------------


@pytest.mark.django_db
def test_dashboard_redirects_anonymous(client):
    resp = client.get(reverse("platform_admin:dashboard"))
    assert resp.status_code == 302


@pytest.mark.django_db
def test_dashboard_forbidden_for_customer(client):
    customer = make_user("customer@example.com")
    client.force_login(customer)
    resp = client.get(reverse("platform_admin:dashboard"))
    assert resp.status_code in (302, 403)


@pytest.mark.django_db
def test_business_detail_forbidden_for_customer(client):
    org = Organization.objects.create(name="Client Org")
    customer = make_user("customer2@example.com")
    client.force_login(customer)
    resp = client.get(reverse("platform_admin:business_detail", args=[org.id]))
    assert resp.status_code in (302, 403)


# --- dashboard content -----------------------------------------------------


@pytest.mark.django_db
def test_dashboard_counts_businesses_and_connected_accounts(client):
    staff = make_user("owner@example.com", is_staff=True)
    org_a = Organization.objects.create(name="Alpha Biz")
    org_b = Organization.objects.create(name="Beta Biz")
    ws_a = Workspace.objects.create(organization=org_a, name="WS A")
    ws_b = Workspace.objects.create(organization=org_b, name="WS B")
    for i in range(3):
        SocialAccount.objects.create(
            workspace=ws_a,
            platform="facebook",
            account_platform_id=f"fb-{i}",
            account_name=f"FB {i}",
            oauth_access_token="t",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
    SocialAccount.objects.create(
        workspace=ws_b,
        platform="instagram",
        account_platform_id="ig-1",
        account_name="IG 1",
        oauth_access_token="t",
        connection_status=SocialAccount.ConnectionStatus.DISCONNECTED,
    )
    client.force_login(staff)
    resp = client.get(reverse("platform_admin:dashboard"))
    assert resp.status_code == 200
    content = resp.content.decode()
    assert "Alpha Biz" in content and "Beta Biz" in content
    # 3 connected across the platform: 2 free, 1 billable at $6.
    # User creation signals auto-create personal orgs; count all live orgs.
    assert resp.context["business_count"] == Organization.objects.filter(deleted_at__isnull=True).count()
    assert resp.context["total_connected"] == 3
    assert resp.context["cost"]["total_cents"] == 600
    # Disconnected account must not appear as connected on the org row.
    row_b = next(o for o in resp.context["orgs"] if o.name == "Beta Biz")
    assert row_b.connected_accounts == 0


@pytest.mark.django_db
def test_business_detail_shows_accounts_and_members(client):
    staff = make_user("owner2@example.com", is_staff=True)
    org = Organization.objects.create(name="Detail Org")
    ws = Workspace.objects.create(organization=org, name="WS D")
    SocialAccount.objects.create(
        workspace=ws,
        platform="tiktok",
        account_platform_id="tt-1",
        account_name="TT One",
        account_handle="ttone",
        oauth_access_token="t",
        connection_status=SocialAccount.ConnectionStatus.TOKEN_EXPIRING,
    )
    client.force_login(staff)
    resp = client.get(reverse("platform_admin:business_detail", args=[org.id]))
    assert resp.status_code == 200
    content = resp.content.decode()
    assert "Detail Org" in content
    assert "TT One" in content and "ttone" in content
