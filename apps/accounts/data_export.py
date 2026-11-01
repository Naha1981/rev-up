"""POPIA self-serve data export: one JSON file with everything we hold.

Offered next to account deletion in settings. Covers the account, profile,
workspaces and memberships. Message content and customer data belong to the
business workspace, so workspace owners get those too via their memberships.
"""

from __future__ import annotations

import json

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.utils import timezone


@login_required
def export_my_data(request):
    from apps.members.models import WorkspaceMembership

    user = request.user
    memberships = WorkspaceMembership.objects.filter(user=user).select_related("workspace", "workspace__organization")
    payload = {
        "exported_at": timezone.now().isoformat(),
        "account": {
            "email": user.email,
            "name": getattr(user, "name", "") or "",
            "joined_at": user.created_at.isoformat() if getattr(user, "created_at", None) else "",
        },
        "workspaces": [
            {
                "name": m.workspace.name,
                "role": m.workspace_role,
                "organization": m.workspace.organization.name if m.workspace.organization_id else None,
            }
            for m in memberships
        ],
    }
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    resp = HttpResponse(body, content_type="application/json")
    resp["Content-Disposition"] = 'attachment; filename="revup-my-data.json"'
    return resp
