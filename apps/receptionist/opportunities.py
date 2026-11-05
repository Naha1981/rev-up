"""Market and demand opportunities, computed from what the owner tracks.

Sources: competitor dishes mapped to own menu items (price gaps), Google
ratings (rating gaps), competitor promotions, and the waitlist (demand that
outgrows the tables). Refresh is cheap and runs when the Competitors screen
loads; rows dedupe on a stable key so the owner's acted/dismissed marks stick.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import (
    Competitor,
    MarketOpportunity,
    WaitlistEntry,
)

logger = logging.getLogger(__name__)

PRICE_GAP_RAND = Decimal("10")
PROMO_FRESH_DAYS = 7
DEMAND_WAITLIST_COUNT = 5


def _upsert(
    workspace,
    key: str,
    kind: str,
    title: str,
    detail: str,
    competitor=None,
    confidence: int = 0,
    impact_rand=None,
    evidence: list | None = None,
) -> None:
    MarketOpportunity.objects.update_or_create(
        workspace=workspace,
        dedupe_key=key,
        defaults={
            "kind": kind,
            "title": title,
            "detail": detail,
            "competitor": competitor,
            "confidence": confidence,
            "impact_rand": impact_rand,
            "evidence": evidence or [],
        },
    )


def _monthly_units(workspace, item) -> int:
    from apps.menus.models import DishSale

    since = timezone.localdate() - timedelta(days=30)
    return sum(row.quantity for row in DishSale.objects.filter(workspace=workspace, item=item, sold_on__gte=since))


def refresh(workspace) -> list:
    """Recompute every opportunity for the workspace. Returns the live list."""
    profile = getattr(workspace, "receptionist_profile", None)
    own_rating = profile.google_rating if profile else None
    seen: set[str] = set()

    for competitor in Competitor.objects.filter(workspace=workspace).prefetch_related("dishes__own_item", "promos"):
        for dish in competitor.dishes.all():
            if dish.own_item is None:
                continue
            gap = dish.own_item.price - dish.price
            units = _monthly_units(workspace, dish.own_item)
            impact = (abs(gap) * units) if units else None
            if gap > PRICE_GAP_RAND:
                key = f"price_gap:{dish.id}"
                seen.add(key)
                _upsert(
                    workspace,
                    key,
                    MarketOpportunity.Kind.PRICE_GAP,
                    f"{competitor.name} undercuts your {dish.own_item.name}",
                    f"Their {dish.name} is R{dish.price}; yours is R{dish.own_item.price} - R{gap} more. "
                    "Match it, beat it on portion or quality, or let the dish compete on something else.",
                    competitor,
                    confidence=90,
                    impact_rand=impact,
                    evidence=[
                        f"Their menu: {dish.name} R{dish.price} (logged on the Competitors screen)",
                        f"Your menu: {dish.own_item.name} R{dish.own_item.price}",
                        f"Your sales: {units} sold in the last 30 days"
                        if units
                        else "No sales logged yet, so no rand impact estimate",
                    ],
                )
            elif gap < -PRICE_GAP_RAND:
                key = f"price_advantage:{dish.id}"
                seen.add(key)
                _upsert(
                    workspace,
                    key,
                    MarketOpportunity.Kind.PRICE_ADVANTAGE,
                    f"Your {dish.own_item.name} beats {competitor.name} on price",
                    f"Their {dish.name} is R{dish.price}; yours is R{dish.own_item.price} - R{-gap} less. "
                    "Worth saying out loud: feature it on the public menu and in campaigns.",
                    competitor,
                    confidence=80,
                    impact_rand=impact,
                    evidence=[
                        f"Their menu: {dish.name} R{dish.price} (logged on the Competitors screen)",
                        f"Your menu: {dish.own_item.name} R{dish.own_item.price}",
                    ],
                )

        if competitor.rating is not None and own_rating is not None and own_rating > competitor.rating:
            key = f"rating:{competitor.id}"
            seen.add(key)
            _upsert(
                workspace,
                key,
                MarketOpportunity.Kind.RATING_GAP,
                f"You outrate {competitor.name}",
                f"Google: you {own_rating}, them {competitor.rating}. Ask happy customers for reviews "
                "while the gap is in your favour.",
                competitor,
                confidence=70,
                evidence=[
                    f"Your Google rating: {own_rating} (Competitors screen)",
                    f"Their Google rating: {competitor.rating} (Competitors screen)",
                ],
            )

        fresh_promo = competitor.promos.filter(
            created_at__gte=timezone.now() - timedelta(days=PROMO_FRESH_DAYS)
        ).first()
        if fresh_promo is not None:
            key = f"promo:{fresh_promo.id}"
            seen.add(key)
            _upsert(
                workspace,
                key,
                MarketOpportunity.Kind.PROMO,
                f"{competitor.name} is running a promotion",
                f'Spotted: "{fresh_promo.text}". Answer with your own campaign to regulars before '
                "they drift - the Campaigns screen drafts it in minutes.",
                competitor,
                confidence=60,
                evidence=[f'Promotion logged: "{fresh_promo.text}" (Competitors screen)'],
            )

    recent_waitlist = WaitlistEntry.objects.filter(
        workspace=workspace, created_at__gte=timezone.now() - timedelta(days=7)
    ).count()
    if recent_waitlist >= DEMAND_WAITLIST_COUNT:
        key = "demand:waitlist"
        seen.add(key)
        avg_value = _avg_booking_value(workspace)
        _upsert(
            workspace,
            key,
            MarketOpportunity.Kind.DEMAND,
            "Demand is outgrowing your tables",
            f"{recent_waitlist} parties joined the waitlist in the last 7 days. Consider longer hours "
            "on the busy nights or an off-peak campaign to spread the load.",
            confidence=65,
            impact_rand=(avg_value * recent_waitlist) if avg_value else None,
            evidence=[
                f"{recent_waitlist} waitlist entries in the last 7 days (Waitlist screen)",
                f"Average booking value: R{avg_value}" if avg_value else "No booking values captured yet",
            ],
        )

    # Records whose trigger disappeared (price fixed, promo aged out) leave the
    # board unless the owner acted or dismissed - stale "new" ones are removed.
    MarketOpportunity.objects.filter(workspace=workspace, status=MarketOpportunity.Status.NEW).exclude(
        dedupe_key__in=seen
    ).delete()
    return list(MarketOpportunity.objects.filter(workspace=workspace))


def _avg_booking_value(workspace):
    from decimal import Decimal

    from .models import Booking

    values = [
        b.value
        for b in Booking.objects.filter(workspace=workspace, status=Booking.Status.DONE, value__isnull=False)[:50]
    ]
    if not values:
        return None
    return sum(values, Decimal("0")) / len(values)


DRAFT_CONFIDENCE = 75

DRAFT_BODIES = {
    MarketOpportunity.Kind.PRICE_GAP: (
        "Hi {first name}, this week only: come in for your favourite and mention this message - "
        "we will make it worth your while. Book on WhatsApp."
    ),
    MarketOpportunity.Kind.PRICE_ADVANTAGE: (
        "Hi {first name}, did you know our best dish also beats the neighbours on price? "
        "Come taste it this week - book on WhatsApp."
    ),
    MarketOpportunity.Kind.RATING_GAP: (
        "Hi {first name}, thank you for rating us the area's favourite! Bring a friend this week "
        "and show them why - book on WhatsApp."
    ),
    MarketOpportunity.Kind.PROMO: (
        "Hi {first name}, we would rather spoil YOU than watch you try the neighbour's special. "
        "This week, your usual comes with something extra - book on WhatsApp."
    ),
    MarketOpportunity.Kind.DEMAND: (
        "Hi {first name}, weekends are filling up fast. Book a midweek table this week and skip "
        "the wait entirely - reply here and we will sort it."
    ),
}


def draft_campaign(opp: MarketOpportunity):
    # returns Campaign; imported inside to avoid a circular import
    """Prepare a campaign draft for an opportunity. Never sends: the owner
    approves on the Campaigns screen like any other draft."""
    from .campaigns import create_campaign

    if opp.campaign_id:
        return opp.campaign
    body = DRAFT_BODIES.get(opp.kind)
    if body is None:
        raise ValueError("No draft available for this opportunity.")
    segment = "dormant" if opp.kind in (MarketOpportunity.Kind.PROMO, MarketOpportunity.Kind.DEMAND) else "all"
    campaign = create_campaign(opp.workspace, f"Revenue: {opp.title[:90]}", segment, body)
    opp.campaign = campaign
    opp.status = MarketOpportunity.Status.ACTED
    opp.save(update_fields=["campaign", "status", "updated_at"])
    return campaign


def auto_draft(workspace) -> int:
    """Draft mode: prepare drafts for high-confidence opportunities that lack one."""
    profile = getattr(workspace, "receptionist_profile", None)
    if profile is None or profile.revenue_mode != "draft":
        return 0
    made = 0
    for opp in MarketOpportunity.objects.filter(
        workspace=workspace,
        status=MarketOpportunity.Status.NEW,
        campaign__isnull=True,
        confidence__gte=DRAFT_CONFIDENCE,
    ):
        draft_campaign(opp)
        made += 1
    return made
