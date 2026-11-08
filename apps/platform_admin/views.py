"""Platform-owner admin dashboard (staff-only).

Customer surfaces never see this. This is the one place vendor names
(the messaging partner) may appear, gated behind is_staff.
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, render

from apps.members.models import OrgMembership
from apps.organizations.models import Organization
from apps.social_accounts.models import SocialAccount

from .costs import estimate_cost, format_zar, get_usd_zar_rate

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
            tier["price_display"] = f"{format_zar(tier['price_cents'])}/acct"
            tier["subtotal_display"] = format_zar(tier["subtotal_cents"])
        else:
            tier["price_display"] = "unpublished"
            tier["subtotal_display"] = "?"
    context = {
        "orgs": orgs,
        "business_count": len(orgs),
        "total_connected": total_connected,
        "cost": cost,
        "cost_dollars": f"{cost['total_cents'] / 100:,.2f}",
        "cost_zar": format_zar(cost["total_cents"]),
        "rate_note": get_usd_zar_rate()[1],
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


@staff_member_required
def business_create(request):
    """Create a business (org + default workspace) for a client, optionally
    emailing the client an invite to manage it themselves."""
    from django.contrib import messages
    from django.shortcuts import redirect

    from apps.members.models import WorkspaceMembership
    from apps.members.services import create_invitation
    from apps.workspaces.models import Workspace

    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        client_email = request.POST.get("client_email", "").strip().lower()
        timezone_name = request.POST.get("timezone", "Africa/Johannesburg").strip() or "Africa/Johannesburg"
        if not name:
            messages.error(request, "Business name is required.")
        else:
            org = Organization.objects.create(name=name, default_timezone=timezone_name)
            workspace = Workspace.objects.create(organization=org, name=name)
            if client_email:
                try:
                    create_invitation(
                        org,
                        client_email,
                        OrgMembership.OrgRole.ADMIN,
                        [
                            {
                                "workspace_id": str(workspace.id),
                                "role": WorkspaceMembership.WorkspaceRole.OWNER,
                            }
                        ],
                        request.user,
                    )
                    messages.success(
                        request,
                        f"Business '{name}' created and invite emailed to {client_email}.",
                    )
                except ValueError as exc:
                    messages.warning(request, f"Business '{name}' created, but the invite failed: {exc}")
            else:
                messages.success(request, f"Business '{name}' created.")
            return redirect("platform_admin:business_detail", org_id=org.id)
    return render(request, "platform_admin/business_form.html", {})


@staff_member_required
def business_toggle_access(request, org_id):
    """Suspend or restore a business's access (POST only)."""
    from django.contrib import messages
    from django.shortcuts import redirect
    from django.utils import timezone

    if request.method != "POST":
        return redirect("platform_admin:business_detail", org_id=org_id)
    org = get_object_or_404(Organization, id=org_id)
    if org.access_suspended_at is None:
        org.access_suspended_at = timezone.now()
        org.access_suspension_reason = request.POST.get("reason", "")[:255]
        org.save(update_fields=["access_suspended_at", "access_suspension_reason", "updated_at"])
        messages.success(request, f"Access to '{org.name}' paused.")
    else:
        org.access_suspended_at = None
        org.access_suspension_reason = ""
        org.save(update_fields=["access_suspended_at", "access_suspension_reason", "updated_at"])
        messages.success(request, f"Access to '{org.name}' restored.")
    return redirect("platform_admin:business_detail", org_id=org.id)
