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


def _sidecar_post(path, body: bytes):
    req = urllib.request.Request(_sidecar_url(path), data=body, headers={"Content-Type": "text/plain"})
    with urllib.request.urlopen(req, timeout=SIDECAR_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


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
            messages.error(request, "Paste a fuller test enquiry (at least 20 characters).")
            return redirect("responder:dashboard", workspace_id=workspace.id)
        try:
            result = _sidecar_post("/selftest/enquiry", enquiry.encode("utf-8"))
        except Exception as exc:
            messages.error(request, f"Sidecar call failed: {exc}")
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
    }
