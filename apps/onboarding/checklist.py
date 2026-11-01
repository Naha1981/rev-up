"""Onboarding checklist evaluation logic.

Computes the 5 checklist items and their completion status for a workspace.
Used by the workspace dashboard to render the dynamic "Get Started" card.
"""

from django.urls import reverse


def get_checklist_items(workspace):
    """Return a list of checklist item dicts with dynamic completion status.

    Each item has: key, title, description, completed (bool), url, icon_color, icon_svg

    SECURITY: `icon_svg` is rendered with `|safe` in the checklist template.
    It MUST remain a server-side constant string. Never populate it from user
    input, model fields, or any other untrusted source.
    """
    from apps.members.models import WorkspaceMembership
    from apps.receptionist.models import CalendarConnection
    from apps.social_accounts.models import SocialAccount
    from apps.whatsapp_connect.models import WhatsAppConnection

    workspace_id = workspace.id

    items = [
        {
            "key": "pair_whatsapp",
            "title": "Pair your WhatsApp",
            "description": "Connect your business WhatsApp so the receptionist can answer enquiries",
            "completed": WhatsAppConnection.objects.filter(
                workspace_id=workspace_id,
                status=WhatsAppConnection.Status.CONNECTED,
            ).exists(),
            "url": reverse(
                "receptionist:setup",
                kwargs={"workspace_id": workspace_id},
            ),
            "icon_color": "sky",
            "icon_svg": '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
        },
        {
            "key": "connect_calendar",
            "title": "Connect your Google Calendar",
            "description": "So the receptionist can book appointments at the right time",
            "completed": CalendarConnection.objects.filter(
                workspace_id=workspace_id,
            ).exists(),
            "url": reverse(
                "receptionist:calendar_connect",
                kwargs={"workspace_id": workspace_id},
            ),
            "icon_color": "sky",
            "icon_svg": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        },
        {
            "key": "connect_accounts",
            "title": "Connect social accounts",
            "description": "Link your social channels for publishing",
            "completed": SocialAccount.objects.for_workspace(workspace_id).exists(),
            "url": reverse(
                "social_accounts:connect",
                kwargs={"workspace_id": workspace_id},
            ),
            "icon_color": "sky",
            "icon_svg": '<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/><path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>',
        },
        {
            "key": "invite_members",
            "title": "Invite your team",
            "description": "Add team members to collaborate on content",
            "completed": WorkspaceMembership.objects.filter(
                workspace_id=workspace_id,
                workspace_role=WorkspaceMembership.WorkspaceRole.CLIENT,
            ).exists(),
            "url": reverse("members:list"),
            "icon_color": "sky",
            "icon_svg": '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/>',
        },
    ]
    return items
