"""Loyalty: points on completed visits, welcome bonus, reward vouchers.

All writes go through these helpers so the booking board, the receptionist
reply flow and the Loyalty screen agree on the rules.
"""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import (
    Booking,
    Contact,
    LoyaltyAccount,
    LoyaltySettings,
    LoyaltyTransaction,
    Voucher,
)


def settings_for(workspace) -> LoyaltySettings:
    settings, _ = LoyaltySettings.objects.get_or_create(workspace=workspace)
    return settings


def account_for(workspace, contact: Contact) -> LoyaltyAccount:
    account, created = LoyaltyAccount.objects.get_or_create(workspace=workspace, contact=contact)
    if created or not account.welcomed:
        settings = settings_for(workspace)
        if settings.welcome_bonus and not account.welcomed:
            _apply(account, LoyaltyTransaction.Kind.WELCOME, settings.welcome_bonus, "Welcome bonus")
    return account


def _apply(account: LoyaltyAccount, kind: str, points: int, note: str, booking: Booking | None = None):
    with transaction.atomic():
        LoyaltyTransaction.objects.create(account=account, kind=kind, points=points, note=note, booking=booking)
        account.balance = max(0, account.balance + points)
        if points > 0:
            account.lifetime_points += points
        if kind == LoyaltyTransaction.Kind.WELCOME:
            account.welcomed = True
        account.save()


def award_for_booking(booking: Booking):
    """Called when a booking is marked done. Returns the account, or None when
    loyalty is off for the workspace."""
    workspace = booking.workspace
    settings = settings_for(workspace)
    if not settings.enabled:
        return None
    account = account_for(workspace, booking.contact)
    already = LoyaltyTransaction.objects.filter(
        account=account, kind=LoyaltyTransaction.Kind.EARN, booking=booking
    ).exists()
    if already:
        return account
    _apply(
        account,
        LoyaltyTransaction.Kind.EARN,
        settings.points_per_visit,
        f"Visit #{booking.contact.visit_count}",
        booking,
    )
    return account


def issue_voucher(workspace, contact: Contact, kind: str = Voucher.Kind.LOYALTY, note: str = "") -> Voucher:
    """Spend points into a rand voucher. Raises ValueError when the balance is short."""
    settings = settings_for(workspace)
    if kind == Voucher.Kind.LOYALTY:
        account = account_for(workspace, contact)
        if account.balance < settings.points_for_voucher:
            raise ValueError(
                f"{contact} has {account.balance} points - {settings.points_for_voucher} needed for a voucher."
            )
        _apply(account, LoyaltyTransaction.Kind.REDEEM, -settings.points_for_voucher, "Reward voucher issued")
    while True:
        code = secrets.token_hex(4).upper()
        if not Voucher.objects.filter(code=code).exists():
            break
    return Voucher.objects.create(
        workspace=workspace,
        contact=contact,
        kind=kind,
        code=code,
        amount_rand=settings.voucher_value_rand,
        note=note,
        expires_at=timezone.now() + timedelta(days=settings.voucher_valid_days),
    )


def redeem_voucher(voucher: Voucher) -> bool:
    """Mark a voucher used at the till. False when it is not usable."""
    if voucher.expired():
        voucher.status = Voucher.Status.EXPIRED
        voucher.save(update_fields=["status"])
        return False
    if voucher.status != Voucher.Status.ACTIVE:
        return False
    voucher.status = Voucher.Status.REDEEMED
    voucher.redeemed_at = timezone.now()
    voucher.save(update_fields=["status", "redeemed_at"])
    return True


def balance_line(workspace, contact: Contact) -> str:
    """One honest sentence about the customer's points, for receptionist replies."""
    settings = settings_for(workspace)
    if not settings.enabled:
        return ""
    account = account_for(workspace, contact)
    needed = max(0, settings.points_for_voucher - account.balance)
    if needed:
        return (
            f"You have {account.balance} points - {needed} more and you earn a R{settings.voucher_value_rand} voucher."
        )
    return (
        f"You have {account.balance} points - enough for a "
        f"R{settings.voucher_value_rand} voucher whenever you're ready."
    )
