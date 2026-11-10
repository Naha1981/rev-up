import hashlib

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import Http404
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods, require_POST

from apps.members.decorators import require_org_role
from apps.members.models import OrgMembership, WorkspaceMembership

from .models import Workspace


def _usage_snapshot(org):
    from apps.receptionist.limits import usage_snapshot

    return usage_snapshot(org)


PLAN_CARDS = [
    {
        "id": "starter",
        "name": "Starter",
        "price": 499,
        "price_fmt": "499",
        "blurb": "WhatsApp receptionist, inbox, intake, bookings, customers, the Google review booster and social posting.",
    },
    {
        "id": "growth",
        "name": "Growth",
        "price": 999,
        "price_fmt": "999",
        "blurb": "Everything in Starter, plus quotes and chasing, revenue-leaks board, lead scoring, social posting with weekly content plan drafts, and reporting.",
    },
    {
        "id": "business-pro",
        "name": "Business Pro",
        "price": 1999,
        "price_fmt": "1,999",
        "blurb": "Everything in Growth, plus auto-posting on social media, team seats, API keys and webhooks, and your business page.",
    },
]


@login_required
def workspace_list(request):
    memberships = WorkspaceMembership.objects.filter(user=request.user).select_related("workspace")
    workspaces = [m.workspace for m in memberships if not m.workspace.is_archived]
    return render(request, "workspaces/list.html", {"workspaces": workspaces})


@login_required
@require_POST
@require_org_role(OrgMembership.OrgRole.ADMIN)
def workspace_create(request):
    """Create a new workspace in the user's organization."""
    name = request.POST.get("name", "").strip()
    if not name:
        return redirect("dashboard")

    if not request.org:
        return redirect("dashboard")

    workspace = Workspace.objects.create(
        organization=request.org,
        name=name,
    )

    WorkspaceMembership.objects.create(
        user=request.user,
        workspace=workspace,
        workspace_role=WorkspaceMembership.WorkspaceRole.OWNER,
    )

    # Set as current workspace
    request.user.last_workspace_id = workspace.id
    request.user.save(update_fields=["last_workspace_id"])

    return redirect("calendar:calendar", workspace_id=workspace.id)


@login_required
@require_http_methods(["GET", "POST"])
def workspace_settings(request, workspace_id):
    try:
        workspace = Workspace.objects.get(id=workspace_id)
    except Workspace.DoesNotExist:
        raise Http404 from None

    membership = WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).first()
    if not membership:
        raise Http404

    is_owner_or_manager = membership.workspace_role in (
        WorkspaceMembership.WorkspaceRole.OWNER,
        WorkspaceMembership.WorkspaceRole.MANAGER,
    )

    if request.method == "POST":
        action = request.POST.get("action")

        if action == "archive_workspace" and is_owner_or_manager:
            with transaction.atomic():
                active_count = (
                    Workspace.objects.select_for_update()
                    .filter(organization=workspace.organization, is_archived=False)
                    .count()
                )
                if active_count <= 1:
                    messages.error(request, "Cannot archive the last workspace in the organization.")
                    return redirect("workspaces:settings", workspace_id=workspace.id)
                workspace.is_archived = True
                workspace.save(update_fields=["is_archived"])
            messages.success(request, f'Workspace "{workspace.name}" has been archived.')
            return redirect("organizations:workspaces")

        if action == "unarchive_workspace" and is_owner_or_manager:
            workspace.is_archived = False
            workspace.save(update_fields=["is_archived"])
            messages.success(request, f'Workspace "{workspace.name}" has been restored.')
            return redirect("workspaces:settings", workspace_id=workspace.id)

        if action == "delete_workspace" and is_owner_or_manager:
            with transaction.atomic():
                active_count = (
                    Workspace.objects.select_for_update()
                    .filter(organization=workspace.organization, is_archived=False)
                    .count()
                )
                if active_count <= 1 and not workspace.is_archived:
                    messages.error(request, "Cannot delete the last workspace in the organization.")
                    return redirect("workspaces:settings", workspace_id=workspace.id)
                workspace_name = workspace.name
                workspace.delete()
            messages.success(request, f'Workspace "{workspace_name}" has been permanently deleted.')
            return redirect("organizations:workspaces")

        if action == "content_agent" and is_owner_or_manager:
            from apps.content_agent.models import AgentConfig

            config, _ = AgentConfig.objects.get_or_create(workspace=workspace)
            config.enabled = request.POST.get("agent_enabled") == "1"
            config.niche = request.POST.get("niche", "").strip()[:255]
            raw_topics = request.POST.get("topics", "")
            config.topics = [t.strip() for t in raw_topics.replace(",", "\n").splitlines() if t.strip()][:20]
            try:
                config.posts_per_run = min(10, max(1, int(request.POST.get("posts_per_run", 3))))
            except (TypeError, ValueError):
                config.posts_per_run = 3
            try:
                config.min_interval_hours = min(168, max(1, int(request.POST.get("min_interval_hours", 20))))
            except (TypeError, ValueError):
                config.min_interval_hours = 20
            config.save()
            state = "enabled" if config.enabled else "disabled"
            messages.success(request, f"Content agent {state} for this workspace.")
            return redirect("workspaces:settings", workspace_id=workspace.id)

        name = request.POST.get("name", "").strip()

        if name:
            workspace.name = name

        # Handle logo deletion
        if request.POST.get("delete_icon") == "1":
            if workspace.icon:
                workspace.icon.delete(save=False)
        # Handle logo upload
        elif "icon" in request.FILES:
            icon = request.FILES["icon"]

            # Validate file type
            allowed_types = ("image/jpeg", "image/png", "image/webp", "image/gif")
            if icon.content_type not in allowed_types:
                messages.error(request, "Logo must be a JPEG, PNG, WebP, or GIF image.")
                return redirect("workspaces:settings", workspace_id=workspace.id)

            # Validate file size (2 MB max)
            max_size = 2 * 1024 * 1024
            if icon.size > max_size:
                messages.error(request, "Logo must be under 2 MB.")
                return redirect("workspaces:settings", workspace_id=workspace.id)

            # Delete old icon before saving new one
            if workspace.icon:
                workspace.icon.delete(save=False)
            workspace.icon = icon

        workspace.save()
        messages.success(request, "Workspace settings updated.")
        return redirect("workspaces:settings", workspace_id=workspace.id)

    active_count = Workspace.objects.filter(organization=workspace.organization, is_archived=False).count()
    is_last_active = active_count <= 1 and not workspace.is_archived
    can_archive = is_owner_or_manager and not workspace.is_archived and not is_last_active
    can_delete = is_owner_or_manager and not is_last_active

    agent_config = getattr(workspace, "content_agent_config", None)

    return render(
        request,
        "workspaces/settings.html",
        {
            "workspace": workspace,
            "settings_active": "general",
            "is_owner_or_manager": is_owner_or_manager,
            "can_archive": can_archive,
            "can_delete": can_delete,
            "agent_config": agent_config,
            "agent_topics_text": "\n".join(agent_config.topics) if agent_config else "",
        },
    )


@login_required
@require_http_methods(["GET", "POST"])
def approvals_settings(request, workspace_id):
    try:
        workspace = Workspace.objects.get(id=workspace_id)
    except Workspace.DoesNotExist:
        raise Http404 from None

    membership = WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).first()
    if not membership:
        raise Http404

    is_owner_or_manager = membership.workspace_role in (
        WorkspaceMembership.WorkspaceRole.OWNER,
        WorkspaceMembership.WorkspaceRole.MANAGER,
    )

    if request.method == "POST":
        if not is_owner_or_manager:
            raise Http404

        mode = request.POST.get("approval_workflow_mode", "")
        valid_modes = Workspace.ApprovalWorkflowMode.values
        if mode not in valid_modes:
            messages.error(request, "Invalid approval workflow mode.")
            return redirect("workspaces:approvals_settings", workspace_id=workspace.id)

        workspace.approval_workflow_mode = mode
        workspace.save(update_fields=["approval_workflow_mode", "updated_at"])
        messages.success(request, "Approval workflow updated.")
        return redirect("workspaces:approvals_settings", workspace_id=workspace.id)

    return render(
        request,
        "workspaces/approvals_settings.html",
        {
            "workspace": workspace,
            "settings_active": "approvals",
            "is_owner_or_manager": is_owner_or_manager,
            "approval_modes": Workspace.ApprovalWorkflowMode,
        },
    )


def _payfast_available() -> bool:
    from apps.workspaces import payfast

    return payfast.configured()


def _payfast_sandbox() -> bool:
    from apps.workspaces import payfast

    return payfast.sandbox()


@login_required
def workspace_billing(request, workspace_id):
    from urllib.parse import quote_plus

    from django.conf import settings as django_settings
    from django.shortcuts import get_object_or_404

    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise Http404
    org = workspace.organization
    if request.method == "POST":
        membership = WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).first()
        if membership is None or membership.workspace_role not in (
            WorkspaceMembership.WorkspaceRole.OWNER,
            WorkspaceMembership.WorkspaceRole.MANAGER,
        ):
            raise Http404
        chosen = request.POST.get("plan", "")
        if chosen in org.PLAN_PRICES_RAND:
            # A selection is not a payment. Only verified settlement activates a plan.
            request.session[f"billing_plan_{workspace.id}"] = chosen
            messages.info(request, "Plan selected. Complete payment to activate it.")
        return redirect("workspaces:billing", workspace_id=workspace.id)
    if not org.payment_reference:
        org.save()  # save() assigns the RU- reference when blank
    status, day, days_left = org.trial_state()
    selected = request.session.get(f"billing_plan_{workspace.id}", org.plan)
    card = next((c for c in PLAN_CARDS if c["id"] == selected), PLAN_CARDS[0])
    number = getattr(django_settings, "REVUP_BILLING_WHATSAPP", "")
    text = (
        f"Hi NahaLabs, I want to pay my RevUp {card['name']} subscription "
        f"(R{card['price']}/month). My payment reference is {org.payment_reference}."
    )
    return render(
        request,
        "workspaces/billing.html",
        {
            "workspace": workspace,
            "org": org,
            "cards": PLAN_CARDS,
            "card": card,
            "status": status,
            "trial_day": day,
            "days_left": days_left,
            "pay_url": (f"https://wa.me/{number}?text={quote_plus(text)}" if number else ""),
            "cancel_confirmation": hashlib.sha256(
                f"{request.user.id}:{org.id}:{org.payfast_token}".encode()
            ).hexdigest(),
            "usage": _usage_snapshot(org),
            "payfast_available": _payfast_available(),
            "payfast_sandbox": _payfast_sandbox(),
        },
    )
