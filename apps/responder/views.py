"""Responder screen: WhatsApp responder status + dry-run test console.

Talks to the Node responder sidecar (modules/responder) on its internal
port. Everything here is dry-run: the sidecar never sends to real numbers
unless WHATSAPP_MODE=live is explicitly approved and set.
"""

import json
import logging
import os
import urllib.request

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from apps.common.industry_presets import get_preset
from apps.members.models import WorkspaceMembership
from apps.workspaces.models import Workspace

logger = logging.getLogger(__name__)

SIDECAR_TIMEOUT = 30


def _sidecar_url(path):
    port = os.environ.get("RESPONDER_PORT", "3100")
    return f"http://127.0.0.1:{port}{path}"


def _sidecar_get(path):
    try:
        with urllib.request.urlopen(_sidecar_url(path), timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8")), None
    except Exception as exc:
        return None, str(exc)


def _sidecar_post(path, body: bytes, industry: str = "general", menu_context: str = "", business_name: str = ""):
    headers = {"Content-Type": "text/plain", "X-Industry": industry}
    if menu_context:
        headers["X-Menu-Context"] = menu_context
    if business_name:
        headers["X-Business-Name"] = business_name
    req = urllib.request.Request(
        _sidecar_url(path),
        data=body,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=SIDECAR_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _menu_context(workspace) -> str:
    """Short menu summary for the responder's dry-run reply (restaurant workspaces)."""
    if workspace.industry != "restaurant":
        return ""
    try:
        from apps.menus.models import MenuItem
    except ImportError:
        return ""
    items = MenuItem.objects.filter(workspace=workspace, is_available=True).order_by(
        "category__name", "position", "name"
    )[:12]
    parts = [f"{item.name} R{item.price}" for item in items]
    return "; ".join(parts)


def _get_workspace(request, workspace_id):
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not request.user.is_authenticated:
        raise PermissionDenied("Authentication required.")
    if not WorkspaceMembership.objects.filter(user=request.user, workspace=workspace).exists():
        raise PermissionDenied("You are not a member of this workspace.")
    return workspace


@login_required
@require_http_methods(["GET", "POST"])
def dashboard(request, workspace_id):
    workspace = _get_workspace(request, workspace_id)

    if request.method == "POST":
        enquiry = (request.POST.get("enquiry") or "").strip()
        if len(enquiry) < 20:
            messages.error(
                request,
                "Type a little more of the customer's message (at least 20 characters) so the receptionist has something to work with.",
            )
            return redirect("responder:dashboard", workspace_id=workspace.id)
        try:
            result = _sidecar_post(
                "/selftest/enquiry",
                enquiry.encode("utf-8"),
                workspace.industry,
                _menu_context(workspace),
                workspace.name,
            )
        except Exception:
            logger.exception("responder: test enquiry failed for workspace %s", workspace.id)
            messages.error(request, "The responder could not answer that just now - please try again in a moment.")
            return redirect("responder:dashboard", workspace_id=workspace.id)
        return render(
            request,
            "responder/dashboard.html",
            {**_context(workspace), "enquiry": enquiry, "result": result},
        )

    return render(request, "responder/dashboard.html", _context(workspace))


def _context(workspace):
    status, status_error = _sidecar_get("/selftest/status")
    return {
        "workspace": workspace,
        "status": status,
        "status_error": status_error,
        "enquiry": "",
        "result": None,
        "preset": get_preset(workspace.industry),
    }
