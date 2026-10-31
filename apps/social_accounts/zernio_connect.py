"""Zernio connect flow - how a stranger links a social account to RevUp.

There is no Meta/LinkedIn/TikTok developer app anywhere in this product
(owner decision, 31 Oct 2026). One tap on the connect grid opens Zernio's
hosted consent page, Zernio holds every platform token, and the redirect
back carries only ids and a username - never a secret. Our side stores the
Zernio account id and syncs the account list from the API, so what the
grid shows is what Zernio actually has, not what a redirect claimed.

Flow:
    connect grid POST -> connect_zernio -> Zernio hosted OAuth
        -> zernio_callback (connected=...&profileId=... or error=...)
        -> sync_zernio_accounts (server-side confirm via GET /v1/accounts)
        -> SocialAccount rows with provider="zernio"
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST
from django_ratelimit.decorators import ratelimit

from apps.members.decorators import require_permission
from providers.zernio import SUPPORTED_PLATFORMS, ZernioClient, ZernioError

from .models import SocialAccount, WorkspaceProviderProfile

logger = logging.getLogger(__name__)

# Pending connect state, stashed between the grid POST and the callback.
ZERNIO_SESSION_KEY = "zernio_connect"

# Grid platform value -> Zernio platform slug. Zernio runs one "instagram"
# and one "linkedin" flow; our grid's finer labels are display-only.
ZERNIO_PLATFORM_SLUGS = {
    "facebook": "facebook",
    "instagram": "instagram",
    "instagram_login": "instagram",
    "tiktok": "tiktok",
    "linkedin_personal": "linkedin",
    "linkedin_company": "linkedin",
    "youtube": "youtube",
    "pinterest": "pinterest",
    "threads": "threads",
    "google_business": "googlebusiness",
    "twitter": "twitter",
    "reddit": "reddit",
    "bluesky": "bluesky",
    "telegram": "telegram",
    "whatsapp": "whatsapp",
    "discord": "discord",
    "slack": "slack",
}
ZERNIO_MANAGED_PLATFORMS = tuple(ZERNIO_PLATFORM_SLUGS)

# Zernio's hosted Instagram flow covers both professional login methods, so
# the separate "Instagram (Direct)" card would be a second button doing the
# same thing. Hidden from the grid while Zernio manages these platforms.
ZERNIO_HIDDEN_GRID_PLATFORMS = frozenset({"instagram_login"})


def zernio_ready() -> bool:
    """True when the Zernio connect path can serve a user right now."""
    return bool(getattr(settings, "ZERNIO_ENABLED", False) and getattr(settings, "ZERNIO_API_KEY", ""))


def zernio_slug_for(platform: str) -> str | None:
    """The Zernio platform slug for one of our grid values, or None."""
    return ZERNIO_PLATFORM_SLUGS.get(platform)


def get_or_create_workspace_profile(workspace) -> WorkspaceProviderProfile:
    """This workspace's Zernio profile, creating it on first connect.

    The Zernio profile is created with externalId = our workspace UUID, so a
    lost local row is recoverable by lookup instead of by a new profile (and
    its duplicate billing).
    """
    existing = WorkspaceProviderProfile.objects.filter(
        workspace=workspace, provider=WorkspaceProviderProfile.Provider.ZERNIO
    ).first()
    if existing:
        return existing

    with ZernioClient() as client:
        profile = client.get_or_create_profile(name=workspace.name, external_id=str(workspace.id))
    record, _ = WorkspaceProviderProfile.objects.get_or_create(
        workspace=workspace,
        provider=WorkspaceProviderProfile.Provider.ZERNIO,
        defaults={"profile_id": profile["_id"]},
    )
    return record


def _our_platform_for(zernio_account: dict) -> str | None:
    """Our platform value for a Zernio account object, or None to skip it.

    LinkedIn comes back as one "linkedin" platform; Zernio marks organization
    accounts in metadata.organizationInfo, which is what splits our
    (Company Page) from (Personal Profile).
    """
    platform = zernio_account.get("platform", "")
    if platform == "linkedin":
        metadata = zernio_account.get("metadata") or {}
        if metadata.get("organizationInfo"):
            return "linkedin_company"
        return "linkedin_personal"
    if platform in ("facebook", "instagram", "tiktok"):
        return platform
    return None


def sync_zernio_accounts(workspace, provider_profile, *, client: ZernioClient | None = None) -> list[SocialAccount]:
    """Upsert this workspace's SocialAccounts from Zernio's account list.

    Server-side confirm: the connect redirect only hints that something
    connected; this is what records it. Idempotent - safe after every
    callback and on a manual re-sync. Only platforms RevUp connects are
    imported; anything else on the profile (it should not exist - the client
    refuses those connects) is skipped.
    """
    if client is None:
        with ZernioClient() as owned:
            zernio_accounts = owned.list_accounts(profile_id=provider_profile.profile_id)
    else:
        zernio_accounts = client.list_accounts(profile_id=provider_profile.profile_id)

    synced = []
    for zernio_account in zernio_accounts:
        platform = _our_platform_for(zernio_account)
        if platform is None:
            continue
        account_id = zernio_account.get("_id", "")
        # platformUserId is stable across reconnects and is the match key the
        # Zernio docs tell integrators to use; the Zernio account id is the
        # fallback for a platform that reports none.
        native_id = zernio_account.get("platformUserId") or account_id
        if not native_id:
            continue

        defaults = {
            "account_name": zernio_account.get("displayName") or zernio_account.get("username") or "Connected account",
            "account_handle": zernio_account.get("username") or "",
            "avatar_url": zernio_account.get("profilePicture") or "",
            "provider": "zernio",
            "provider_account_id": account_id,
            "provider_profile_id": provider_profile.profile_id,
        }
        # Follower counts need Zernio's analytics add-on; when the field is
        # absent, keep whatever we already show rather than zeroing it.
        if zernio_account.get("followersCount") is not None:
            defaults["follower_count"] = zernio_account["followersCount"]

        if not zernio_account.get("isActive", True):
            defaults["connection_status"] = SocialAccount.ConnectionStatus.DISCONNECTED
            defaults["last_error"] = "This account was disconnected. Connect it again to keep using it."
        elif zernio_account.get("needsReconnection"):
            defaults["connection_status"] = SocialAccount.ConnectionStatus.DISCONNECTED
            defaults["last_error"] = "The connection expired. Reconnect to refresh it."
        else:
            defaults["connection_status"] = SocialAccount.ConnectionStatus.CONNECTED
            defaults["last_error"] = ""

        account, created = SocialAccount.objects.update_or_create(
            workspace=workspace,
            platform=platform,
            account_platform_id=native_id,
            defaults=defaults,
        )
        if created:
            from apps.calendar.services import create_default_queue_and_slots

            create_default_queue_and_slots(account)
        synced.append(account)
    return synced


def start_zernio_connect(request, workspace, platform: str, *, reconnect_account: SocialAccount | None = None):
    """Begin the hosted connect: profile, connect URL, session state, redirect.

    Shared by the grid's connect POST and by reconnect, so both enforce the
    same checks and stash the same session state.
    """
    slug = ZERNIO_PLATFORM_SLUGS[platform]
    profile = get_or_create_workspace_profile(workspace)
    redirect_url = request.build_absolute_uri(reverse("social_accounts:zernio_callback"))
    with ZernioClient() as client:
        if reconnect_account is not None and reconnect_account.provider_account_id:
            auth_url = client.get_connect_url(
                slug,
                profile_id=profile.profile_id,
                redirect_url=redirect_url,
                reconnect_account_id=reconnect_account.provider_account_id,
            )
        else:
            auth_url = client.get_connect_url(slug, profile_id=profile.profile_id, redirect_url=redirect_url)
    request.session[ZERNIO_SESSION_KEY] = {
        "workspace_id": str(workspace.id),
        "platform": platform,
        "profile_id": profile.profile_id,
        "user_id": str(request.user.id),
    }
    return redirect(auth_url)


# ------------------------------------------------------------------
# Views
# ------------------------------------------------------------------


@login_required
@require_permission("manage_social_accounts")
@ratelimit(key="user", rate="20/m", method="POST", block=True)
@require_POST
def connect_zernio(request, workspace_id, platform):
    """One-tap connect for a Zernio-managed platform."""
    if platform not in ZERNIO_PLATFORM_SLUGS:
        messages.error(request, "This platform is not available.")
        return redirect("social_accounts:connect", workspace_id=workspace_id)
    if not zernio_ready():
        messages.error(request, "Connecting accounts is temporarily unavailable. Please try again later.")
        return redirect("social_accounts:connect", workspace_id=workspace_id)
    try:
        return start_zernio_connect(request, request.workspace, platform)
    except ZernioError:
        logger.exception("Zernio connect failed to start for %s", platform)
        messages.error(request, "Could not start the connection. Please try again.")
        return redirect("social_accounts:connect", workspace_id=workspace_id)


@login_required
@require_GET
@ratelimit(key="user", rate="20/m", block=True)
def zernio_callback(request):
    """Landing page after Zernio's hosted connect.

    Success params: connected={platform}&profileId&accountId&username.
    Failure params: error&platform (always), error_message (optional).
    """
    pending = request.session.pop(ZERNIO_SESSION_KEY, None)
    workspace_id = (pending or {}).get("workspace_id")
    if not pending or not workspace_id:
        messages.error(request, "Your connection session expired. Please try again.")
        return redirect("dashboard")

    def _back_to_grid():
        return redirect("social_accounts:connect", workspace_id=workspace_id)

    # The user owns the outcome either way: re-check access before recording
    # anything, exactly as the direct OAuth callback does.
    from apps.members.models import WorkspaceMembership

    membership = WorkspaceMembership.objects.filter(user=request.user, workspace_id=workspace_id).first()
    if not membership or not membership.effective_permissions.get("manage_social_accounts", False):
        raise PermissionDenied("You no longer have access to this workspace.")

    error = request.GET.get("error")
    if error:
        platform = request.GET.get("platform", "")
        detail = request.GET.get("error_message", "")
        if error == "oauth_denied":
            messages.warning(request, "The connection was cancelled before it finished. Nothing was connected.")
        elif error == "missing_tiktok_permissions":
            messages.error(
                request,
                "TikTok needs every permission accepted on its screen. Try again and accept them all.",
            )
        elif error in ("no_facebook_pages", "platform_requires_selection"):
            messages.error(request, "No suitable account was found to connect.")
        else:
            messages.error(request, "The connection did not finish. Please try again.")
        logger.info("Zernio connect ended with error=%s platform=%s detail=%s", error, platform, detail)
        return _back_to_grid()

    connected_platform = request.GET.get("connected", "")
    profile_id = request.GET.get("profileId", "")
    if not connected_platform or not profile_id:
        messages.error(request, "The connection came back incomplete. Please try again.")
        return _back_to_grid()

    # Cross-tenant guard: the callback must answer the connect WE started, on
    # the profile that belongs to THIS workspace. A profile id from anywhere
    # else means the redirect does not describe this user's action.
    if profile_id != pending.get("profile_id"):
        logger.warning(
            "Zernio callback profile mismatch: expected %s, got %s",
            pending.get("profile_id"),
            profile_id,
        )
        messages.error(request, "The connection did not match this workspace. Please try again.")
        return _back_to_grid()
    if str(request.user.id) != pending.get("user_id"):
        raise PermissionDenied("Connect session does not match the signed-in user.")

    if connected_platform not in SUPPORTED_PLATFORMS:
        messages.error(request, "This platform is not available.")
        return _back_to_grid()

    from apps.workspaces.models import Workspace

    workspace = get_object_or_404(Workspace, id=workspace_id)
    provider_profile = get_object_or_404(
        WorkspaceProviderProfile,
        workspace=workspace,
        provider=WorkspaceProviderProfile.Provider.ZERNIO,
    )

    try:
        synced = sync_zernio_accounts(workspace, provider_profile)
    except ZernioError:
        logger.exception("Zernio account sync failed after connect for workspace %s", workspace_id)
        messages.error(
            request,
            "Your account connected, but we could not confirm it yet. It will appear shortly - refresh in a moment.",
        )
        return redirect("social_accounts:list", workspace_id=workspace_id)

    names = [a.account_name for a in synced]
    if names:
        messages.success(request, f"Connected: {', '.join(names)}")
    else:
        messages.warning(request, "No new account was found. If you expected one, try connecting again.")
    return redirect("social_accounts:list", workspace_id=workspace_id)
