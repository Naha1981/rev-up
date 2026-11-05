"""Trial enforcement: expired-trial orgs see the billing page, nothing else."""

from django.shortcuts import redirect
from django.urls import reverse


class TrialLockMiddleware:
    EXEMPT_PREFIXES = (
        "/accounts/",
        # Organisation settings stay reachable when locked: cancelling an
        # account (deleting the org) is the cancel route promised in terms.
        "/organizations/",
        "/admin/",
        "/platform-admin/",
        "/health/",
        "/robots.txt",
        "/webhooks/",
        "/api/",
        "/static/",
        "/media/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not request.user.is_authenticated or request.user.is_staff:
            return None
        if any(request.path.startswith(p) for p in self.EXEMPT_PREFIXES):
            return None
        org = None
        workspace_id = view_kwargs.get("workspace_id")
        if workspace_id:
            from apps.workspaces.models import Workspace

            ws = Workspace.objects.filter(id=workspace_id).select_related("organization").first()
            org = ws.organization if ws else None
        if org is None:
            org = getattr(request, "org", None)
        if org is None:
            return None
        status, _day, _left = org.trial_state()
        if status != org.SubscriptionStatus.EXPIRED:
            return None
        workspace = org.workspaces.order_by("created_at").first()
        if workspace is not None and not request.path.endswith("/billing/"):
            return redirect(reverse("workspaces:billing", kwargs={"workspace_id": workspace.id}))
        return None
