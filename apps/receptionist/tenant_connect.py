"""Customer-owned WhatsApp connection: the tenant's own messaging account.

Each workspace connects its OWN messaging account (their login, their plan,
their bill). The tenant does three things once: create the account on the
messaging service's site, paste the API key here, and tap Connect WhatsApp to
scan one QR. From then on every WhatsApp call for this workspace uses THEIR
key (see sending.py) and their deliveries are signed with a per-tenant secret
(see publisher/zernio_webhooks.py).

The whole path sits behind settings.TENANT_OWNED_WHATSAPP_ENABLED so it can
ship dark and never collide with the shared-account connect flow.
"""

from __future__ import annotations

import logging
import secrets

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from providers.zernio import ZernioClient, ZernioError

from .models import TenantMessagingConnection, ZernioChannel

logger = logging.getLogger(__name__)

SESSION_KEY = "tenant_wa_connect"

# Delivery events this tenant's webhook registration asks for.
WEBHOOK_EVENTS = ["message.received", "message.delivered", "message.read", "account.disconnected"]


def _flag_on() -> bool:
    return bool(getattr(settings, "TENANT_OWNED_WHATSAPP_ENABLED", False))


def _get_workspace(request, workspace_id):
    from apps.members.models import WorkspaceMembership
    from apps.workspaces.models import Workspace

    if not WorkspaceMembership.objects.filter(user=request.user, workspace_id=workspace_id).exists():
        raise PermissionDenied("You do not have access to this workspace.")
    return Workspace.objects.get(id=workspace_id)


def _client_for(connection: TenantMessagingConnection) -> ZernioClient:
    return ZernioClient(api_key=connection.api_key)


def _resolve_profile(client: ZernioClient, workspace) -> dict:
    """Pick or create the tenant profile their WhatsApp number connects to.

    A profile with externalId = our workspace id makes every future webhook
    self-routing. Reuse it when it exists; otherwise reuse the account's only
    profile; otherwise create ours.
    """
    external_id = str(workspace.id)
    existing = client.get_profile_by_external_id(external_id)
    if existing is not None:
        return existing
    data = client._get_json("/profiles")
    profiles = data.get("profiles", [])
    if len(profiles) == 1:
        return profiles[0]
    return client.get_or_create_profile(name=workspace.name, external_id=external_id)


def _validate_key(api_key: str, workspace) -> tuple[str, str]:
    """Validate a pasted key server-side. Returns (profile_id, error_message).

    A wrong or revoked key must say exactly that - never guess, never save it.
    """
    try:
        with ZernioClient(api_key=api_key) as client:
            client.list_accounts()
            profile = _resolve_profile(client, workspace)
    except ZernioError as exc:
        if exc.status_code in (401, 403):
            return "", "That key was not accepted. Copy the full key from your messaging account and paste it again."
        logger.exception("tenant messaging: key validation call failed")
        return "", "Could not reach the messaging service. Please try again."
    return profile.get("_id") or profile.get("id") or "", ""


def _error_message(error: str, detail: str) -> str:
    text = f"{error} {detail}".lower()
    if "already_connected" in text or ("already" in text and "connect" in text):
        return "This number is connected somewhere else. Disconnect it there first, then try again."
    if "402" in text or "free_tier" in text or "payment" in text:
        return "Your free tier covers 2 numbers. Add a card in your messaging account to connect more."
    if error in ("oauth_denied", "connection_cancelled") or "cancel" in text:
        return "The connection was cancelled before it finished. Nothing was connected."
    return "The connection did not finish. Please try again."


@login_required
@require_http_methods(["GET", "POST"])
def tenant_setup(request, workspace_id):
    """The 3-step checklist: create account, paste key, connect WhatsApp."""
    if not _flag_on():
        raise Http404
    workspace = _get_workspace(request, workspace_id)
    connection = TenantMessagingConnection.objects.filter(workspace=workspace).first()

    if request.method == "POST":
        action = request.POST.get("action", "")
        if action == "save_key":
            api_key = (request.POST.get("api_key") or "").strip()
            if not api_key:
                messages.error(request, "Paste the key from your messaging account first.")
                return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
            profile_id, error = _validate_key(api_key, workspace)
            if error:
                messages.error(request, error)
                return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
            connection, _ = TenantMessagingConnection.objects.update_or_create(
                workspace=workspace,
                defaults={
                    "api_key": api_key,
                    "profile_id": profile_id,
                    "status": TenantMessagingConnection.Status.KEY_VALID,
                    "last_error": "",
                },
            )
            messages.success(request, "Key saved. Now connect your WhatsApp.")
            return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
        messages.error(request, "Unknown action.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)

    connected = connection is not None and connection.status == TenantMessagingConnection.Status.CONNECTED
    return render(
        request,
        "receptionist/tenant_setup.html",
        {
            "workspace": workspace,
            "connection": connection,
            "step1_done": connection is not None,
            "step2_done": connected,
            "step3_done": connected,
        },
    )


@login_required
@require_POST
def tenant_connect_start(request, workspace_id):
    """Generate the connect link with the TENANT's key and send them to it."""
    if not _flag_on():
        raise Http404
    workspace = _get_workspace(request, workspace_id)
    connection = TenantMessagingConnection.objects.filter(workspace=workspace).first()
    if connection is None or not connection.profile_id:
        messages.error(request, "Save your API key first.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
    redirect_url = request.build_absolute_uri(reverse("receptionist:tenant_wa_callback", args=[workspace.id]))
    try:
        with _client_for(connection) as client:
            auth_url = client.get_connect_url("whatsapp", profile_id=connection.profile_id, redirect_url=redirect_url)
    except ZernioError as exc:
        if exc.status_code == 402:
            messages.error(
                request, "Your free tier covers 2 numbers. Add a card in your messaging account to connect more."
            )
        else:
            logger.exception("tenant messaging: connect URL failed for workspace %s", workspace_id)
            messages.error(request, "Could not start the connection. Please try again.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
    connection.status = TenantMessagingConnection.Status.CONNECTING
    connection.save(update_fields=["status", "updated_at"])
    request.session[SESSION_KEY] = {
        "workspace_id": str(workspace.id),
        "profile_id": connection.profile_id,
        "user_id": str(request.user.id),
    }
    return redirect(auth_url)


@login_required
@require_GET
def tenant_callback(request, workspace_id):
    """Landing after the hosted connect: bind the number, register the webhook."""
    if not _flag_on():
        raise Http404
    workspace = _get_workspace(request, workspace_id)
    pending = request.session.pop(SESSION_KEY, None) or {}
    if pending.get("workspace_id") != str(workspace.id):
        messages.error(request, "Your connection session expired. Please try again.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
    if str(request.user.id) != pending.get("user_id"):
        raise PermissionDenied("Connect session does not match the signed-in user.")
    connection = TenantMessagingConnection.objects.filter(workspace=workspace).first()
    if connection is None:
        messages.error(request, "Save your API key first.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)

    error = request.GET.get("error", "")
    if error:
        messages.error(request, _error_message(error, request.GET.get("error_message", "")))
        connection.status = TenantMessagingConnection.Status.KEY_VALID
        connection.save(update_fields=["status", "updated_at"])
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)

    connected = request.GET.get("connected", "")
    profile_id = request.GET.get("profileId", "")
    account_id = request.GET.get("accountId", "")
    username = (request.GET.get("username") or request.GET.get("phoneNumber") or "").lstrip("+")
    if connected != "whatsapp" or not profile_id or not account_id:
        messages.error(request, "The connection came back incomplete. Please try again.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
    if profile_id != connection.profile_id:
        logger.warning(
            "tenant messaging callback profile mismatch: expected %s, got %s", connection.profile_id, profile_id
        )
        messages.error(request, "The connection did not match this workspace. Please try again.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)

    # Server-side confirm: the account must really exist on THEIR account list.
    try:
        with _client_for(connection) as client:
            accounts = client.list_accounts(profile_id=profile_id, platform="whatsapp")
    except ZernioError:
        logger.exception("tenant messaging: post-connect account confirm failed for workspace %s", workspace_id)
        messages.error(request, "Your number connected, but we could not confirm it yet. Refresh in a moment.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
    match = next((a for a in accounts if (a.get("_id") or a.get("id")) == account_id), None)
    if match is None:
        messages.error(request, "That number was not found on your messaging account. Please try again.")
        return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)

    # Register our endpoint into THEIR team with a per-tenant secret, then
    # prove the pipe end to end before the green tick.
    webhook_secret = secrets.token_hex(32)
    webhook_url = request.build_absolute_uri("/webhooks/zernio/")
    webhook_id = ""
    webhook_ok = False
    try:
        with _client_for(connection) as client:
            hook = client.create_webhook_settings(
                name=f"revup-{workspace.id}",
                url=webhook_url,
                secret=webhook_secret,
                events=WEBHOOK_EVENTS,
                profile_ids=[profile_id],
            )
            webhook_id = hook.get("_id") or hook.get("id") or ""
            webhook_ok = client.test_webhook(webhook_id) if webhook_id else False
    except ZernioError:
        logger.exception("tenant messaging: webhook registration failed for workspace %s", workspace_id)

    connection.account_id = account_id
    connection.phone_number = (match.get("username") or match.get("phoneNumber") or username or "").lstrip("+")
    connection.webhook_id = webhook_id
    connection.webhook_secret = webhook_secret if webhook_id else ""
    connection.status = TenantMessagingConnection.Status.CONNECTED
    connection.last_error = "" if webhook_ok else "Webhook check did not pass yet - replies may be delayed."
    connection.save()

    ZernioChannel.objects.update_or_create(
        workspace=workspace,
        defaults={
            "zernio_account_id": account_id,
            "zernio_profile_id": profile_id,
            "phone_number": connection.phone_number,
            "label": match.get("name") or "WhatsApp",
            "is_sandbox": False,
        },
    )
    if webhook_ok:
        messages.success(request, "WhatsApp connected. Your WhatsApp employee is live on your number.")
    else:
        messages.warning(
            request,
            "WhatsApp connected, but the live-message check did not finish. Try reconnecting if replies do not arrive.",
        )
    return redirect("receptionist:tenant_wa_setup", workspace_id=workspace.id)
