"""Per-tier monthly allowances: reply counter, hard stop, channel limit, usage."""

import pytest
from django.utils import timezone

from apps.receptionist.limits import (
    channels_over_allowance,
    connected_channel_count,
    monthly_ai_replies,
    replies_over_allowance,
    usage_snapshot,
)
from apps.receptionist.models import Contact, Message, ZernioChannel


@pytest.fixture
def org(db):
    from apps.organizations.models import Organization

    return Organization.objects.create(name="Limits Org", plan="starter")


@pytest.fixture
def ws(db, org):
    from apps.workspaces.models import Workspace

    return Workspace.objects.create(name="Limits WS", organization=org)


def _ai_reply(workspace, contact, days_ago=0):
    msg = Message.objects.create(
        workspace=workspace,
        contact=contact,
        direction=Message.Direction.OUTBOUND,
        sender_type=Message.SenderType.AI,
        body="reply",
    )
    if days_ago:
        Message.objects.filter(pk=msg.pk).update(created_at=timezone.now() - timezone.timedelta(days=days_ago))
    return msg


@pytest.mark.django_db
class TestReplyAllowance:
    def test_counts_only_this_month_ai_replies(self, org, ws):
        contact = Contact.objects.create(workspace=ws, wa_id="271")
        _ai_reply(ws, contact)
        _ai_reply(ws, contact, days_ago=40)  # last month: excluded
        Message.objects.create(
            workspace=ws,
            contact=contact,
            direction=Message.Direction.OUTBOUND,
            sender_type=Message.SenderType.HUMAN_AGENT,
            body="human",  # human reply: excluded
        )
        assert monthly_ai_replies(org) == 1

    def test_allowance_per_tier(self, org):
        org.plan = "starter"
        assert org.monthly_reply_allowance() == 500
        org.plan = "growth"
        assert org.monthly_reply_allowance() == 1000
        org.plan = "business-pro"
        assert org.monthly_reply_allowance() == 2500

    def test_over_allowance(self, org, ws, monkeypatch):
        monkeypatch.setattr("apps.receptionist.limits.monthly_ai_replies", lambda o, now=None: 500)
        assert replies_over_allowance(org) is True
        org.plan = "growth"
        assert replies_over_allowance(org) is False


@pytest.mark.django_db
class TestChannelAllowance:
    def test_counts_numbers_and_social(self, org, ws):
        from apps.social_accounts.models import SocialAccount

        assert connected_channel_count(org) == 0
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="ch1")
        assert connected_channel_count(org) == 1
        SocialAccount.objects.create(
            workspace=ws,
            platform="facebook",
            account_platform_id="x",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        assert connected_channel_count(org) == 2

    def test_over_allowance_at_tier_limit(self, org, ws):
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="ch1")
        assert channels_over_allowance(org) is True  # starter: 1
        org.plan = "growth"
        assert channels_over_allowance(org) is False


@pytest.mark.django_db
class TestUsageSnapshot:
    def test_snapshot_math(self, org, ws):
        contact = Contact.objects.create(workspace=ws, wa_id="272")
        for _ in range(2):
            _ai_reply(ws, contact)
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="ch1")
        snap = usage_snapshot(org)
        assert snap["replies_used"] == 2
        assert snap["replies_limit"] == 500
        assert snap["replies_pct"] == 0
        assert snap["channels_used"] == 1
        assert snap["channels_limit"] == 1
        assert snap["near_limit"] is False  # replies well under 80%
        assert snap["channels_full"] is True  # channels at limit


@pytest.mark.django_db
class TestHardStop:
    def _payload(self, account_id, wa_id="27999"):
        return {
            "message": {
                "_id": "m1",
                "direction": "inbound",
                "text": "hi",
                "account": {"accountId": account_id},
                "sender": {"phoneNumber": wa_id, "name": "Cust"},
            },
            "conversation": {"id": "conv1"},
        }

    def test_reply_path_flags_human_and_sends_nothing(self, org, ws, monkeypatch):
        """At the allowance the AI path flips needs_human and never drafts."""
        from apps.receptionist import webhooks
        from apps.receptionist.models import BusinessProfile

        monkeypatch.setattr("apps.receptionist.limits.monthly_ai_replies", lambda o, now=None: 999)
        monkeypatch.setattr("apps.receptionist.limits.replies_over_allowance", lambda o: True)

        def _boom(*a, **k):
            raise AssertionError("draft_reply must not run past the allowance")

        monkeypatch.setattr(webhooks, "draft_reply", _boom)
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc1")
        BusinessProfile.objects.create(workspace=ws, business_name="T", is_active=True)
        webhooks.handle_inbox_message(self._payload("acc1"))
        contact = Contact.objects.get(workspace=ws, wa_id="27999")
        assert contact.needs_human is True
        assert not Message.objects.filter(contact=contact, direction=Message.Direction.OUTBOUND).exists()

    def test_under_allowance_drafts_normally(self, org, ws, monkeypatch):
        from apps.receptionist import webhooks
        from apps.receptionist.models import BusinessProfile

        monkeypatch.setattr("apps.receptionist.limits.replies_over_allowance", lambda o: False)

        class _Draft:
            escalate = False
            body = "Sure, we can help."
            intake = None

        monkeypatch.setattr(webhooks, "draft_reply", lambda *a, **k: _Draft())
        monkeypatch.setattr("apps.receptionist.sending.send_draft", lambda *a, **k: None)
        ZernioChannel.objects.create(workspace=ws, zernio_account_id="acc1")
        BusinessProfile.objects.create(workspace=ws, business_name="T", is_active=True)
        webhooks.handle_inbox_message(self._payload("acc1"))
        contact = Contact.objects.get(workspace=ws, wa_id="27999")
        assert contact.needs_human is False
        assert Message.objects.filter(
            contact=contact, direction=Message.Direction.OUTBOUND, sender_type=Message.SenderType.AI
        ).exists()
