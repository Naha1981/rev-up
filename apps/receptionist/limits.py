"""Per-tier monthly allowances: AI replies and connected channels.

The global 60/hour and 300/day caps stay as anti-abuse safety nets. These
tier allowances are the business limit: past them the conversation flips to
a human (no AI spend, no silent failure) and the billing page shows usage.
"""

from __future__ import annotations

from django.utils import timezone

from .models import Message, ZernioChannel


def month_start(now=None):
    now = now or timezone.now()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def monthly_ai_replies(organization, now=None) -> int:
    """AI replies sent this calendar month across the org's workspaces."""
    return Message.objects.filter(
        workspace__organization=organization,
        direction=Message.Direction.OUTBOUND,
        sender_type=Message.SenderType.AI,
        is_draft=False,
        created_at__gte=month_start(now),
    ).count()


def replies_over_allowance(organization, now=None) -> bool:
    return monthly_ai_replies(organization, now) >= organization.monthly_reply_allowance()


def connected_channel_count(organization) -> int:
    """Connected WhatsApp numbers + connected social accounts, org-wide."""
    from apps.social_accounts.models import SocialAccount

    numbers = ZernioChannel.objects.filter(workspace__organization=organization).count()
    social = SocialAccount.objects.filter(
        workspace__organization=organization,
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    ).count()
    return numbers + social


def channels_over_allowance(organization) -> bool:
    return connected_channel_count(organization) >= organization.channel_allowance()


def usage_snapshot(organization, now=None) -> dict:
    replies_used = monthly_ai_replies(organization, now)
    reply_limit = organization.monthly_reply_allowance()
    channels_used = connected_channel_count(organization)
    channel_limit = organization.channel_allowance()
    return {
        "replies_used": replies_used,
        "replies_limit": reply_limit,
        "replies_pct": min(100, round(replies_used * 100 / reply_limit)) if reply_limit else 100,
        "channels_used": channels_used,
        "channels_limit": channel_limit,
        "near_limit": replies_used >= 0.8 * reply_limit or channels_used >= channel_limit,
    }
