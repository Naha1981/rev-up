"""Owner support assistant: answers questions from the workspace's own data.

Every answer states its confidence and the sources it used. When nothing in
the data grounds an answer, the assistant says so and offers human follow-up.
It never invents figures."""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import (
    Booking,
    Campaign,
    CampaignRecipient,
    Complaint,
    MarketOpportunity,
    SupportMessage,
    WaitlistEntry,
)


def _today_bookings(workspace):
    today = timezone.localdate()
    return Booking.objects.filter(
        workspace=workspace,
        scheduled_start__date=today,
    ).exclude(status=Booking.Status.CANCELLED)


def answer(workspace, question: str):
    """Return (text, confidence, sources, suggest_escalation)."""
    q = question.lower()
    today = timezone.localdate()

    if any(w in q for w in ("booking", "table", "reservation", "tonight", "today")):
        rows = list(_today_bookings(workspace))
        confirmed = [b for b in rows if b.status == Booking.Status.CONFIRMED]
        done = [b for b in rows if b.status == Booking.Status.DONE]
        week = Booking.objects.filter(
            workspace=workspace, scheduled_start__date__gte=today - timedelta(days=7)
        ).exclude(status=Booking.Status.CANCELLED)
        if not rows and not week:
            return (
                "You have no bookings logged yet. Once bookings come in I can answer questions about them.",
                40,
                ["0 bookings in the last 7 days"],
                False,
            )
        return (
            f"Today: {len(confirmed)} confirmed booking{'s' if len(confirmed) != 1 else ''}"
            + (f", {len(done)} already done" if done else "")
            + f". This week so far: {week.count()} bookings. Open the Bookings screen for the full board.",
            95,
            [f"{len(confirmed)} confirmed bookings today", f"{week.count()} bookings in the last 7 days"],
            False,
        )

    if any(w in q for w in ("waitlist", "waiting", "queue")):
        waiting = WaitlistEntry.objects.filter(workspace=workspace, status=WaitlistEntry.Status.WAITING)
        return (
            f"{waiting.count()} partie{'s are' if waiting.count() != 1 else ' is'} on the waitlist right now. Manage them on the Waitlist screen."
            if waiting.count()
            else "The waitlist is empty right now.",
            95,
            [f"{waiting.count()} waiting on the waitlist"],
            False,
        )

    if any(w in q for w in ("complaint", "unhappy", "angry", "review", "reputation")):
        open_c = Complaint.objects.filter(workspace=workspace, status=Complaint.Status.OPEN)
        return (
            f"You have {open_c.count()} open complaint{'s' if open_c.count() != 1 else ''}."
            + (
                " Answer them on the Complaints screen - quick replies protect your rating."
                if open_c.count()
                else " Nothing needs attention."
            ),
            95,
            [f"{open_c.count()} open complaints"],
            False,
        )

    if any(w in q for w in ("campaign", "revenue", "sales", "money", "attribut", "marketing")):
        running = Campaign.objects.filter(
            workspace=workspace, status__in=[Campaign.Status.SCHEDULED, Campaign.Status.SENDING]
        ).count()
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        attributed = CampaignRecipient.objects.filter(
            campaign__workspace=workspace,
            attributed_booking__isnull=False,
            attributed_booking__created_at__gte=month_start,
        )
        total = sum((r.attributed_amount for r in attributed), Decimal("0"))
        return (
            f"This month your campaigns are linked to R{total} across {attributed.count()} attributed booking{'s' if attributed.count() != 1 else ''}."
            f" {running} campaign{'s are' if running != 1 else ' is'} running. The Revenue screen has the full picture.",
            90,
            [f"R{total} attributed this month", f"{attributed.count()} attributed bookings"],
            False,
        )

    if any(w in q for w in ("competitor", "rival", "opportunit", "market")):
        open_o = MarketOpportunity.objects.filter(workspace=workspace, status=MarketOpportunity.Status.NEW)
        if open_o:
            top = open_o[0]
            return (
                f"{open_o.count()} open opportunit{'ies' if open_o.count() != 1 else 'y'}. Top one: {top.title}."
                " See them all on the Revenue screen.",
                90,
                [f"{open_o.count()} open opportunities"],
                False,
            )
        return (
            "No open opportunities right now - the Competitors screen is where new ones appear.",
            85,
            ["0 open opportunities"],
            False,
        )

    if any(w in q for w in ("menu", "dish", "food", "sell", "popular", "star")):
        from apps.menus.models import DishSale

        since = today - timedelta(days=30)
        sales = DishSale.objects.filter(workspace=workspace, sold_on__gte=since).values_list("item__name", flat=True)
        if sales:
            return (
                "Menu performance is on the Menu screen - stars, plowhorses, puzzles and dogs from the last 30 days of sales and costs.",
                70,
                [f"{sales.count()} dishes with sales logged in 30 days"],
                False,
            )
        return (
            "No dish sales logged yet. Log a day's sales on the Menu screen and I can talk about what is working.",
            50,
            ["0 dishes with sales logged in 30 days"],
            False,
        )

    if any(w in q for w in ("human", "person", "help me", "someone", "call me", "escalat")):
        return (
            "Understood - I have flagged this for a human to follow up. Anything else I can answer from your numbers in the meantime?",
            100,
            ["Owner asked for a human"],
            True,
        )

    return (
        "I do not have enough in your data to answer that confidently. I can answer about bookings, the waitlist, complaints, campaigns and attributed revenue, competitors and your menu. Want me to flag this for a human?",
        20,
        [],
        True,
    )


def handle(workspace, question: str) -> SupportMessage:
    SupportMessage.objects.create(workspace=workspace, role=SupportMessage.Role.OWNER, text=question)
    text, confidence, sources, escalate = answer(workspace, question)
    reply = SupportMessage.objects.create(
        workspace=workspace,
        role=SupportMessage.Role.ASSISTANT,
        text=text,
        confidence=confidence,
        sources=sources,
        escalated=escalate,
    )
    return reply
