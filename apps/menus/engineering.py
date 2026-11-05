"""Menu engineering: classify dishes by popularity and margin.

Standard matrix over the logged sales window: a dish is popular when its
share of units sold beats 70% of the average share; its margin is high when
price minus food cost beats the sales-weighted average margin. The four
classes (star, plowhorse, puzzle, dog) each carry a plain recommendation.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from .models import DishSale, MenuItem

WINDOW_DAYS = 30
POPULARITY_RULE = Decimal("0.7")  # 70% rule: share >= 70% of average share

CLASSES = {
    "star": "Star",
    "plowhorse": "Plowhorse",
    "puzzle": "Puzzle",
    "dog": "Dog",
}

RECOMMENDATIONS = {
    "star": "Sells well at a strong margin. Hold the price, keep it available, and let the receptionist recommend it first.",
    "plowhorse": "Sells well but the margin is thin. Trim the portion cost or nudge the price up a few rand.",
    "puzzle": "Good margin but few takers. Feature it on the public menu and in campaigns so more customers try it.",
    "dog": "Low sales and a weak margin. Rework it, reprice it, or take it off the menu.",
}


@dataclass
class DishRow:
    item: MenuItem
    units: int
    revenue: Decimal
    margin: Decimal | None  # per portion; None when food cost is not captured
    total_margin: Decimal | None
    classification: str  # star|plowhorse|puzzle|dog|"" (no sales)
    recommendation: str


def analyse(workspace, days: int = WINDOW_DAYS) -> dict:
    """Per-dish performance over the trailing window, plus totals."""
    since = timezone.localdate() - timedelta(days=days)
    items = list(MenuItem.objects.filter(workspace=workspace).select_related("category"))
    sales = DishSale.objects.filter(workspace=workspace, sold_on__gte=since)
    units_by_item: dict = {}
    for row in sales:
        units_by_item[row.item_id] = units_by_item.get(row.item_id, 0) + row.quantity

    selling = [i for i in items if units_by_item.get(i.id, 0) > 0]
    total_units = sum(units_by_item.get(i.id, 0) for i in selling)
    avg_share = Decimal("1") / len(selling) if selling else Decimal("0")
    popularity_cutoff = POPULARITY_RULE * avg_share

    weighted_margin = Decimal("0")
    weighted_units = 0
    for i in selling:
        if i.food_cost is not None:
            weighted_margin += (i.price - i.food_cost) * units_by_item[i.id]
            weighted_units += units_by_item[i.id]
    avg_margin = (weighted_margin / weighted_units) if weighted_units else None

    rows = []
    for item in items:
        units = units_by_item.get(item.id, 0)
        revenue = item.price * units
        margin = (item.price - item.food_cost) if item.food_cost is not None else None
        classification = ""
        recommendation = ""
        if units > 0:
            if margin is None or avg_margin is None:
                recommendation = "Capture this dish's food cost to unlock the margin matrix."
            else:
                popular = (Decimal(units) / total_units) >= popularity_cutoff
                high_margin = margin >= avg_margin
                if popular and high_margin:
                    classification = "star"
                elif popular:
                    classification = "plowhorse"
                elif high_margin:
                    classification = "puzzle"
                else:
                    classification = "dog"
                recommendation = RECOMMENDATIONS[classification]
        rows.append(
            DishRow(
                item=item,
                units=units,
                revenue=revenue,
                margin=margin,
                total_margin=(margin * units) if margin is not None else None,
                classification=classification,
                recommendation=recommendation,
            )
        )

    rows.sort(key=lambda r: (r.units, r.revenue), reverse=True)
    return {
        "rows": rows,
        "days": days,
        "since": since,
        "total_units": total_units,
        "total_revenue": sum(r.revenue for r in rows),
        "total_margin": sum((r.total_margin for r in rows if r.total_margin is not None), Decimal("0")),
        "avg_margin": avg_margin,
        "missing_cost": sum(1 for r in rows if r.units > 0 and r.margin is None),
    }
