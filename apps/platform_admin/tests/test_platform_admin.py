import pytest
from django.test import override_settings
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


# --- business create + client invite ---------------------------------------


@pytest.mark.django_db
def test_business_create_creates_org_workspace_without_owner_membership(client):
    """Staff hold NO membership in client orgs - v1 request.org resolution
    uses .first() and multiple memberships would make it nondeterministic.
    The invite service grants staff an explicit bypass instead."""
    from apps.members.models import OrgMembership, WorkspaceMembership

    staff = make_user("owner3@example.com", is_staff=True)
    client.force_login(staff)
    resp = client.post(
        reverse("platform_admin:business_create"),
        {"name": "New Client Biz", "timezone": "Africa/Johannesburg"},
    )
    org = Organization.objects.get(name="New Client Biz")
    assert resp.status_code == 302
    assert str(org.id) in resp["Location"]
    assert org.workspaces.count() == 1
    assert not OrgMembership.objects.filter(user=staff, organization=org).exists()
    assert not WorkspaceMembership.objects.filter(user=staff, workspace__organization=org).exists()


@pytest.mark.django_db
def test_business_create_with_email_invites_client_as_admin(client):
    from apps.members.models import Invitation, OrgMembership

    staff = make_user("owner4@example.com", is_staff=True)
    client.force_login(staff)
    client.post(
        reverse("platform_admin:business_create"),
        {
            "name": "Invited Biz",
            "client_email": "client@example.com",
            "timezone": "Africa/Johannesburg",
        },
    )
    org = Organization.objects.get(name="Invited Biz")
    invite = Invitation.objects.get(organization=org, email="client@example.com")
    assert invite.org_role == OrgMembership.OrgRole.ADMIN
    assert len(invite.workspace_assignments) == 1


@pytest.mark.django_db
def test_business_create_requires_name(client):
    staff = make_user("owner5@example.com", is_staff=True)
    client.force_login(staff)
    resp = client.post(reverse("platform_admin:business_create"), {"name": ""})
    assert resp.status_code == 200
    assert not Organization.objects.filter(name="").exists()


@pytest.mark.django_db
def test_business_create_forbidden_for_customer(client):
    customer = make_user("customer3@example.com")
    client.force_login(customer)
    resp = client.post(reverse("platform_admin:business_create"), {"name": "Nope"})
    assert resp.status_code in (302, 403)
    assert not Organization.objects.filter(name="Nope").exists()


# --- access suspension ------------------------------------------------------


def _make_customer_in_org(email, org):
    from apps.members.models import OrgMembership

    user = make_user(email)
    # Signup signals auto-create a personal org + membership; v1 resolves
    # request.org via .first(), so the test user must hold exactly one.
    OrgMembership.objects.filter(user=user).delete()
    # A customer owns their org - owner role can reach org settings, so a
    # 403 on that page can only come from the suspension gate.
    OrgMembership.objects.create(user=user, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    return user


@pytest.mark.django_db
def test_toggle_access_suspends_and_restores(client):
    staff = make_user("owner6@example.com", is_staff=True)
    org = Organization.objects.create(name="Suspend Me")
    client.force_login(staff)
    url = reverse("platform_admin:business_toggle_access", args=[org.id])
    client.post(url, {"reason": "unpaid invoice"})
    org.refresh_from_db()
    assert org.access_suspended_at is not None
    assert org.access_suspension_reason == "unpaid invoice"
    client.post(url)
    org.refresh_from_db()
    assert org.access_suspended_at is None
    assert org.access_suspension_reason == ""


@pytest.mark.django_db
def test_suspended_org_member_sees_notice_not_app(client):
    from django.utils import timezone as tz

    org = Organization.objects.create(name="Paused Org", access_suspended_at=tz.now())
    member = _make_customer_in_org("paused@example.com", org)
    client.force_login(member)
    resp = client.get(reverse("organizations:settings"))
    assert resp.status_code == 403
    assert b"paused" in resp.content.lower()


@pytest.mark.django_db
def test_unsuspended_org_member_uses_app_normally(client):
    org = Organization.objects.create(name="Live Org")
    member = _make_customer_in_org("live@example.com", org)
    client.force_login(member)
    resp = client.get(reverse("organizations:settings"))
    assert resp.status_code == 200


@pytest.mark.django_db
def test_staff_unaffected_by_suspension(client):
    from django.utils import timezone as tz

    from apps.members.models import OrgMembership

    staff = make_user("owner7@example.com", is_staff=True)
    org = Organization.objects.create(name="Staff Org", access_suspended_at=tz.now())
    OrgMembership.objects.create(user=staff, organization=org, org_role=OrgMembership.OrgRole.OWNER)
    client.force_login(staff)
    resp = client.get(reverse("platform_admin:dashboard"))
    assert resp.status_code == 200


@pytest.mark.django_db
def test_toggle_access_forbidden_for_customer(client):
    org = Organization.objects.create(name="Guard Org")
    customer = _make_customer_in_org("guard@example.com", org)
    client.force_login(customer)
    resp = client.post(reverse("platform_admin:business_toggle_access", args=[org.id]))
    assert resp.status_code in (302, 403)
    org.refresh_from_db()
    assert org.access_suspended_at is None


# --- ZAR currency display ---------------------------------------------------


def test_format_zar_converts_at_operator_rate():
    from apps.platform_admin.costs import format_zar

    with override_settings(ZERNIO_USD_ZAR_RATE="20.00"):
        assert format_zar(600) == "R120.00"
        assert format_zar(123456) == "R24,691.20"


def test_rate_note_names_source():
    from apps.platform_admin.costs import get_usd_zar_rate

    with override_settings(ZERNIO_USD_ZAR_RATE="19.25", ZERNIO_USD_ZAR_RATE_DATE="31 Oct 2026"):
        rate, note = get_usd_zar_rate()
    assert str(rate) == "19.25"
    assert "R19.25/$" in note and "31 Oct 2026" in note and "env" not in note


@pytest.mark.django_db
def test_dashboard_shows_zar_with_usd_note(client):
    staff = make_user("owner8@example.com", is_staff=True)
    org = Organization.objects.create(name="ZAR Org")
    ws = Workspace.objects.create(organization=org, name="WS Z")
    SocialAccount.objects.create(
        workspace=ws,
        platform="facebook",
        account_platform_id="fb-z",
        account_name="FB Z",
        oauth_access_token="t",
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )
    SocialAccount.objects.create(
        workspace=ws,
        platform="instagram",
        account_platform_id="ig-z",
        account_name="IG Z",
        oauth_access_token="t",
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )
    SocialAccount.objects.create(
        workspace=ws,
        platform="tiktok",
        account_platform_id="tt-z",
        account_name="TT Z",
        oauth_access_token="t",
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )
    client.force_login(staff)
    with override_settings(ZERNIO_USD_ZAR_RATE="20.00"):
        resp = client.get(reverse("platform_admin:dashboard"))
    content = resp.content.decode()
    # 3 connected: 1 billable at $6 -> R120.00 headline, USD note present.
    assert "R120.00" in content
    assert "$6.00 USD" in content
    assert resp.context["rate_note"].startswith("rate R20.00/$")
