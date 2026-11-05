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


def _upsert(workspace, key: str, kind: str, title: str, detail: str, competitor=None) -> None:
    MarketOpportunity.objects.update_or_create(
        workspace=workspace,
        dedupe_key=key,
        defaults={"kind": kind, "title": title, "detail": detail, "competitor": competitor},
    )


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
            )

    recent_waitlist = WaitlistEntry.objects.filter(
        workspace=workspace, created_at__gte=timezone.now() - timedelta(days=7)
    ).count()
    if recent_waitlist >= DEMAND_WAITLIST_COUNT:
        key = "demand:waitlist"
        seen.add(key)
        _upsert(
            workspace,
            key,
            MarketOpportunity.Kind.DEMAND,
            "Demand is outgrowing your tables",
            f"{recent_waitlist} parties joined the waitlist in the last 7 days. Consider longer hours "
            "on the busy nights or an off-peak campaign to spread the load.",
        )

    # Records whose trigger disappeared (price fixed, promo aged out) leave the
    # board unless the owner acted or dismissed - stale "new" ones are removed.
    MarketOpportunity.objects.filter(workspace=workspace, status=MarketOpportunity.Status.NEW).exclude(
        dedupe_key__in=seen
    ).delete()
    return list(MarketOpportunity.objects.filter(workspace=workspace))
