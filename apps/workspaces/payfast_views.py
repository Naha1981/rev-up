"""PayFast checkout + ITN endpoints (sandbox-first plan billing)."""

from __future__ import annotations

import logging

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import get_object_or_404, redirect, render
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
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        return HttpResponseNotFound()
    card = next((c for c in PLAN_CARDS if c["id"] == request.POST.get("plan", "")), None)
    if card is None:
        return HttpResponseBadRequest("unknown plan")
    org = workspace.organization
    if not org.payment_reference:
        org.save()  # assigns the RU- reference when blank
    base = request.build_absolute_uri("/").rstrip("/")
    params = payfast.build_subscription_params(org, card, base)
    return render(
        request,
        "workspaces/payfast_checkout.html",
        {"process_url": payfast.process_url(), "params": params, "card": card, "sandbox": payfast.sandbox()},
    )


@csrf_exempt
@require_POST
def notify(request):
    """PayFast ITN: triple-verified, then the org's plan goes active."""
    post = request.POST.dict()
    ok, reason = payfast.verify_itn(post)
    if not ok:
        logger.warning("payfast ITN rejected: %s", reason)
        return HttpResponseBadRequest(reason)
    m_payment_id = post.get("m_payment_id", "")
    reference, _, plan = m_payment_id.partition("-")
    # m_payment_id is "RU-XXXXXXXX-<plan>"; the reference itself contains a dash.
    reference = "RU-" + m_payment_id.split("-")[1] if m_payment_id.startswith("RU-") else ""
    plan = m_payment_id.split("-", 2)[2] if m_payment_id.count("-") >= 2 else ""
    org = Organization.objects.filter(payment_reference=reference).first()
    if org is None or plan not in Organization.PLAN_PRICES_RAND:
        logger.warning("payfast ITN for unknown reference %r", m_payment_id)
        return HttpResponseBadRequest("unknown reference")
    org.plan = plan
    org.subscription_status = Organization.SubscriptionStatus.ACTIVE
    org.payfast_token = post.get("token", "")
    org.save(update_fields=["plan", "subscription_status", "payfast_token"])
    logger.info("payfast ITN: org %s active on %s", org.id, plan)
    return HttpResponse("OK")


def payfast_return(request):
    messages.success(request, "Payment received - your plan activates as soon as the bank confirms.")
    return redirect("dashboard")


def payfast_cancel(request):
    messages.info(request, "Payment cancelled. Nothing was charged.")
    return redirect("dashboard")
