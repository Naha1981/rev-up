"""Receptionist screens: self-onboarding + the conversation inbox.

Workspace members set up their business profile (industry, hours, prices in
rand, rules) and watch the receptionist work: inbound messages, drafted
replies, intake records, and contacts waiting on a human.
"""

import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_http_methods

from apps.members.models import WorkspaceMembership
from apps.workspaces.models import Workspace

from .models import (
    BusinessProfile,
    Contact,
    DentalAppointment,
    FuneralClaim,
    Industry,
    TradeDispatch,
)


def _get_workspace(request, workspace_id):
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise PermissionDenied("You are not a member of this workspace.")
    return workspace


@login_required
@require_http_methods(["GET", "POST"])
def setup(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    profile = getattr(workspace, "receptionist_profile", None)

    if request.method == "POST":
        industry = request.POST.get("industry") or Industry.GENERAL
        if industry not in Industry.values:
            industry = Industry.GENERAL
        pricing_raw = (request.POST.get("pricing_data") or "").strip()
        pricing = {}
        if pricing_raw:
            try:
                pricing = json.loads(pricing_raw)
                if not isinstance(pricing, dict):
                    raise ValueError
            except ValueError:
                messages.error(request, 'Price list must be JSON like {"Standard service": "R15,000"}.')
                return redirect("receptionist:setup", workspace_id=workspace.id)
        hours = (request.POST.get("operating_hours") or "").strip()
        defaults = {
            "industry": industry,
            "business_name": (request.POST.get("business_name") or workspace.name).strip(),
            "operating_hours": {"text": hours} if hours else {},
            "pricing_data": pricing,
            "payment_link_url": (request.POST.get("payment_link_url") or "").strip(),
            "emergency_contact_phone": (request.POST.get("emergency_contact_phone") or "").strip(),
            "custom_rules": (request.POST.get("custom_rules") or "").strip(),
        }
        call_out = (request.POST.get("call_out_fee") or "").strip()
        defaults["call_out_fee"] = call_out or None
        BusinessProfile.objects.update_or_create(workspace=workspace, defaults=defaults)
        messages.success(request, "Receptionist settings saved.")
        return redirect("receptionist:inbox", workspace_id=workspace.id)

    pricing_text = json.dumps(profile.pricing_data) if profile and profile.pricing_data else ""
    hours_text = ""
    if profile and profile.operating_hours:
        hours_text = profile.operating_hours.get("text", "")
    return render(
        request,
        "receptionist/setup.html",
        {
            "workspace": workspace,
            "profile": profile,
            "industries": Industry.choices,
            "pricing_text": pricing_text,
            "hours_text": hours_text,
        },
    )


@login_required
@require_GET
def inbox(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)
    profile = getattr(workspace, "receptionist_profile", None)
    contacts = (
        Contact.objects.filter(workspace=workspace)
        .prefetch_related("messages")
        .order_by("needs_human" and "needs_human" or "", "-updated_at")
    )
    contacts = sorted(
        contacts,
        key=lambda c: (not c.needs_human, -(c.messages.last().created_at.timestamp() if c.messages.last() else 0)),
    )
    return render(
        request,
        "receptionist/inbox.html",
        {
            "workspace": workspace,
            "profile": profile,
            "contacts": contacts,
            "funeral_claims": FuneralClaim.objects.filter(workspace=workspace).order_by("-created_at")[:20],
            "dental_appointments": DentalAppointment.objects.filter(workspace=workspace).order_by("-created_at")[:20],
            "trade_dispatches": TradeDispatch.objects.filter(workspace=workspace).order_by("-created_at")[:20],
        },
    )


@login_required
@require_GET
def conversation(request, workspace_id, contact_id):
    workspace = _get_workspace(request, workspace_id)
    contact = get_object_or_404(Contact, id=contact_id, workspace=workspace)
    return render(
        request,
        "receptionist/conversation.html",
        {"workspace": workspace, "contact": contact, "msgs": contact.messages.all()},
    )
