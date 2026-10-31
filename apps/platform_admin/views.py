"""Platform-owner admin dashboard (staff-only).

Customer surfaces never see this. This is the one place vendor names
(Zernio) may appear, gated behind is_staff.
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, render

from apps.members.models import OrgMembership
from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount

from .costs import estimate_cost

User = get_user_model()


def _org_stats():
    """Per-organization rows with workspace and connected-account counts."""
    connected = Q(workspaces__social_accounts__connection_status="connected")
    return (
        Organization.objects.filter(deleted_at__isnull=True)
        .annotate(
            workspace_count=Count("workspaces", distinct=True),
            connected_accounts=Count("workspaces__social_accounts", filter=connected, distinct=True),
            member_count=Count("memberships", distinct=True),
        )
        .order_by("name")
    )


@staff_member_required
def dashboard(request):
    orgs = list(_org_stats())
    total_connected = sum(o.connected_accounts for o in orgs)
    cost = estimate_cost(total_connected)
    for tier in cost["tiers"]:
        if tier["price_cents"] is not None:
            tier["price_display"] = f"${tier['price_cents'] / 100:,.0f}"
            tier["subtotal_display"] = f"${tier['subtotal_cents'] / 100:,.2f}"
        else:
            tier["price_display"] = "unpublished"
            tier["subtotal_display"] = "?"
    context = {
        "orgs": orgs,
        "business_count": len(orgs),
        "total_connected": total_connected,
        "cost": cost,
        "cost_dollars": f"{cost['total_cents'] / 100:,.2f}",
        "user_count": User.objects.count(),
    }
    return render(request, "platform_admin/dashboard.html", context)


@staff_member_required
def business_detail(request, org_id):
    org = get_object_or_404(Organization, id=org_id)
    workspaces = (
        org.workspaces.annotate(
            connected_accounts=Count(
                "social_accounts",
                filter=Q(social_accounts__connection_status="connected"),
                distinct=True,
            )
        )
        .prefetch_related("social_accounts")
        .order_by("name")
    )
    members = OrgMembership.objects.filter(organization=org).select_related("user").order_by("user__email")
    accounts = SocialAccount.objects.filter(workspace__organization=org).order_by("platform", "connection_status")
    return render(
        request,
        "platform_admin/business_detail.html",
        {
            "org": org,
            "workspaces": workspaces,
            "members": members,
            "accounts": accounts,
        },
    )
