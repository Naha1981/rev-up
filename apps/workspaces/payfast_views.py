"""PayFast checkout + ITN endpoints (sandbox-first plan billing)."""

from __future__ import annotations

import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.members.models import WorkspaceMembership
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace

from . import payfast
from .views import PLAN_CARDS

logger = logging.getLogger(__name__)


@login_required
@require_POST
def checkout(request, workspace_id):
    """Render the auto-submitting form that hands the customer to PayFast."""
    if not payfast.configured():
        return HttpResponseNotFound("Card payments are not available yet.")
    workspace = get_object_or_404(Workspace, id=workspace_id)
    membership = WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).first()
    if membership is None or membership.workspace_role not in (
        WorkspaceMembership.WorkspaceRole.OWNER,
        WorkspaceMembership.WorkspaceRole.MANAGER,
    ):
        return HttpResponseNotFound()
    card = next((c for c in PLAN_CARDS if c["id"] == request.POST.get("plan", "")), None)
    if card is None:
        return HttpResponseBadRequest("unknown plan")
    org = workspace.organization
    if not org.payment_reference:
        org.save()  # assigns the RU- reference when blank
    base = request.build_absolute_uri("/").rstrip("/")
    params = payfast.build_subscription_params(org, card, base)
    request.session["billing_checkout_workspace"] = str(workspace.id)
    return render(
        request,
        "workspaces/payfast_checkout.html",
        {"process_url": payfast.process_url(), "params": params, "card": card, "sandbox": payfast.sandbox()},
    )


@csrf_exempt
@require_POST
def notify(request):
    """PayFast ITN: authenticated, then the org's plan state follows payment."""
    from decimal import Decimal, InvalidOperation

    from apps.organizations.models import OrganizationPayment

    post = request.POST.dict()
    remote_ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get(
        "REMOTE_ADDR", ""
    )
    ok, reason = payfast.verify_itn(post, remote_ip=remote_ip)
    if not ok:
        logger.warning("payfast ITN rejected: %s", reason)
        return HttpResponseBadRequest(reason)
    m_payment_id = post.get("m_payment_id", "")
    # m_payment_id is "RU-XXXXXXXX-<plan>"; the reference itself contains a dash.
    reference = "RU-" + m_payment_id.split("-")[1] if m_payment_id.startswith("RU-") else ""
    plan = m_payment_id.split("-", 2)[2] if m_payment_id.count("-") >= 2 else ""
    org = Organization.objects.filter(payment_reference=reference).first()
    if org is None or plan not in Organization.PLAN_PRICES_RAND:
        logger.warning("payfast ITN for unknown reference %r", m_payment_id)
        return HttpResponseBadRequest("unknown reference")
    try:
        gross = Decimal(post.get("amount_gross", ""))
    except InvalidOperation:
        return HttpResponseBadRequest("bad amount")
    if gross != Decimal(Organization.PLAN_PRICES_RAND[plan]):
        logger.warning("payfast ITN amount mismatch: %s for %s", gross, plan)
        return HttpResponseBadRequest("amount mismatch")

    pf_id = post.get("pf_payment_id", "")
    status = post.get("payment_status", "")
    if pf_id and OrganizationPayment.objects.filter(pf_payment_id=pf_id).exists():
        return HttpResponse("OK")  # ITN replay: already applied

    if status == "COMPLETE":
        org.plan = plan
        org.subscription_status = Organization.SubscriptionStatus.ACTIVE
        org.payfast_token = post.get("token", "")
        if org.activated_at is None:
            org.activated_at = timezone.now()
        org.save(update_fields=["plan", "subscription_status", "payfast_token", "activated_at"])
        logger.info("payfast ITN: org %s active on %s", org.id, plan)
    elif status == "CANCELLED":
        if org.subscription_status == Organization.SubscriptionStatus.ACTIVE:
            org.subscription_status = Organization.SubscriptionStatus.EXPIRED
            org.payfast_token = ""
            org.save(update_fields=["subscription_status", "payfast_token"])
        logger.info("payfast ITN: org %s subscription cancelled", org.id)
    else:
        logger.warning("payfast ITN: org %s status %s (no state change)", org.id, status)

    if pf_id:
        OrganizationPayment.objects.create(
            organization=org, pf_payment_id=pf_id, plan=plan, amount_gross=gross, status=status
        )
    return HttpResponse("OK")


def payfast_return(request):
    messages.info(request, "Payment submitted. Your plan changes only after payment is confirmed.")
    return _billing_after_checkout(request)


def _billing_after_checkout(request):
    membership = (
        WorkspaceMembership.objects.filter(
            user=request.user, workspace_id=request.session.get("billing_checkout_workspace")
        ).first()
        if request.user.is_authenticated
        else None
    )
    if membership:
        return redirect("workspaces:billing", workspace_id=membership.workspace_id)
    return redirect("dashboard")


def payfast_cancel(request):
    messages.info(
        request, "Checkout cancelled. No plan change was made. Check your payment provider for any payment status."
    )
    return _billing_after_checkout(request)
