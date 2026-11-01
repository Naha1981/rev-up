"""PayFast subscriptions for plan billing.

Sandbox first: PAYFAST_SANDBOX=true posts to the PayFast sandbox engine and
no live charge is possible. The ITN (instant transaction notification) is
verified three ways before it changes anything: signature, source validate
back against PayFast, and the payment reference belonging to the org.
"""

from __future__ import annotations

import hashlib
import logging
from urllib.parse import quote_plus

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

FREQUENCY_MONTHLY = 3  # PayFast subscription frequency code for monthly


def configured() -> bool:
    return bool(getattr(settings, "PAYFAST_MERCHANT_ID", "") and getattr(settings, "PAYFAST_MERCHANT_KEY", ""))


def sandbox() -> bool:
    return bool(getattr(settings, "PAYFAST_SANDBOX", True))


def engine_host() -> str:
    return "sandbox.payfast.co.za" if sandbox() else "www.payfast.co.za"


def process_url() -> str:
    return f"https://{engine_host()}/eng/process"


def validate_url() -> str:
    return f"https://{engine_host()}/eng/query/validate"


def _passphrase() -> str:
    return getattr(settings, "PAYFAST_PASSPHRASE", "")


def sign(params: dict) -> str:
    """PayFast MD5 signature: ordered pairs, values url-encoded, passphrase last."""
    pairs = [f"{k}={quote_plus(str(v).strip())}" for k, v in params.items() if v not in (None, "")]
    payload = "&".join(pairs)
    if _passphrase():
        payload += f"&passphrase={quote_plus(_passphrase())}"
    return hashlib.md5(payload.encode()).hexdigest()


def build_subscription_params(org, card: dict, base_url: str) -> dict:
    """One subscription signup: first month now, then monthly until cancelled."""
    params = {
        "merchant_id": getattr(settings, "PAYFAST_MERCHANT_ID", ""),
        "merchant_key": getattr(settings, "PAYFAST_MERCHANT_KEY", ""),
        "return_url": f"{base_url}/billing/payfast/return/",
        "cancel_url": f"{base_url}/billing/payfast/cancel/",
        "notify_url": f"{base_url}/billing/payfast/notify/",
        "m_payment_id": f"{org.payment_reference}-{card['id']}",
        "amount": f"{card['price']:.2f}",
        "item_name": f"RevUp {card['name']} (monthly)",
        "subscription_type": 1,
        "recurring_amount": f"{card['price']:.2f}",
        "frequency": FREQUENCY_MONTHLY,
        "cycles": 0,  # until cancelled
    }
    params["signature"] = sign(params)
    return params


def sign_itn(post_data: dict) -> str:
    """ITN signature: every posted field except ``signature``, in posted order.

    Unlike the outbound form, PayFast's ITN string INCLUDES empty variables -
    their own sample keeps them - so an ITN (which always carries empties such
    as custom_str1-5) never verifies against the outbound signing rule. First
    real sandbox swipe proved this: the ITN was rejected "bad signature".
    """
    pairs = [f"{k}={quote_plus(str(v).strip())}" for k, v in post_data.items() if k != "signature"]
    payload = "&".join(pairs)
    if _passphrase():
        payload += f"&passphrase={quote_plus(_passphrase())}"
    return hashlib.md5(payload.encode()).hexdigest()


def verify_itn(post_data: dict) -> tuple[bool, str]:
    """Validate an ITN callback. Returns (ok, reason)."""
    received = post_data.get("signature", "")
    ours = sign_itn(post_data)
    if not received or received != ours:
        return False, "bad signature"
    try:
        resp = requests.post(validate_url(), data=post_data, timeout=10)
        if resp.text.strip() != "VALID":
            return False, "payfast validate-back rejected"
    except requests.RequestException:
        logger.exception("payfast validate-back failed")
        return False, "validate-back unreachable"
    if post_data.get("payment_status") != "COMPLETE":
        return False, f"status {post_data.get('payment_status', '?')}"
    return True, ""
