"""Messaging-partner connected-account cost estimation.

Pricing (spec-confirmed 31 Oct 2026):
- First 2 connected accounts across the whole Zernio team: free.
- Accounts 3-10: $6 per account/month.
- Accounts 11-100: $3 per account/month.
- Accounts 101-2,000: $1 per account/month.

Profiles (businesses) are free; only connected accounts bill.
"""

from decimal import Decimal

from django.conf import settings

FREE_ALLOWANCE = 2

# (upper_bound_inclusive, price_per_account_usd_cents)
TIERS = (
    (10, 600),
    (100, 300),
    (2000, 100),
)


def estimate_cost(connected_accounts: int) -> dict:
    """Return the monthly cost breakdown for a connected-account count.

    Returns a dict with the count, how many are free, how many billable,
    the per-tier breakdown, and the total in USD cents.
    """
    count = max(0, int(connected_accounts))
    free = min(count, FREE_ALLOWANCE)
    remaining = count - free
    breakdown = []
    total_cents = 0
    lower = FREE_ALLOWANCE + 1
    for upper, price in TIERS:
        if remaining <= 0:
            break
        tier_size = upper - lower + 1
        in_tier = min(remaining, tier_size)
        breakdown.append(
            {
                "range": f"{lower}-{upper}",
                "accounts": in_tier,
                "price_cents": price,
                "subtotal_cents": in_tier * price,
            }
        )
        total_cents += in_tier * price
        remaining -= in_tier
        lower = upper + 1
    if remaining > 0:
        # Beyond published pricing - flag rather than guess a number.
        breakdown.append(
            {
                "range": f"{lower}+",
                "accounts": remaining,
                "price_cents": None,
                "subtotal_cents": None,
            }
        )
    return {
        "connected_accounts": count,
        "free_accounts": free,
        "billable_accounts": count - free,
        "tiers": breakdown,
        "total_cents": total_cents,
        "beyond_published_pricing": remaining > 0,
    }


def get_usd_zar_rate():
    """Return (rate: Decimal, note: str) for USD -> ZAR display.

    The rate is operator-set via env (ZERNIO_USD_ZAR_RATE /
    ZERNIO_USD_ZAR_RATE_DATE) - never a paid FX API.
    """
    rate = Decimal(str(settings.ZERNIO_USD_ZAR_RATE))
    note = f"rate R{rate}/$, set {settings.ZERNIO_USD_ZAR_RATE_DATE}"
    return rate, note


def format_zar(cents) -> str:
    """R1,234.56 formatting for USD cents converted at the current rate."""
    rate, _ = get_usd_zar_rate()
    rands = (Decimal(int(cents)) / 100) * rate
    return f"R{rands:,.2f}"
