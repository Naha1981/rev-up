"""PayFast subscriptions for plan billing.

Sandbox first: PAYFAST_SANDBOX=true posts to the PayFast sandbox engine and
no live charge is possible. The ITN (instant transaction notification) is
verified three ways before it changes anything: signature, source validate
back against PayFast, and the payment reference belonging to the org.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import logging
from urllib.parse import quote_plus

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

FREQUENCY_MONTHLY = 3  # PayFast subscription frequency code for monthly


# PayFast's published ITN source networks (developers.payfast.co.za/docs,
# "Ports and IP addresses"). Enforcement is opt-in via
# PAYFAST_ITN_ENFORCE_IP because the correct client-IP source depends on the
# proxy in front of the app; signature + validate-back already authenticate.
ITN_ALLOWED_NETWORKS = tuple(
    ipaddress.ip_network(n)
    for n in (
        "197.97.145.144/28",
        "41.74.179.192/27",
        "102.216.36.0/28",
        "102.216.36.128/28",
        "144.126.193.139/32",
    )
)


def configured() -> bool:
    if not (getattr(settings, "PAYFAST_MERCHANT_ID", "") and getattr(settings, "PAYFAST_MERCHANT_KEY", "")):
        return False
    # In production a missing passphrase means ITNs cannot be authenticated:
    # fail closed instead of silently signing without the salt.
    return not (not sandbox() and not _passphrase())


def source_ip_allowed(remote_ip: str) -> bool:
    """True when the ITN source IP is in PayFast's published ranges.

    Only enforced when PAYFAST_ITN_ENFORCE_IP is on (production hardening);
    sandbox ITNs and unconfigured deployments skip it.
    """
    if sandbox() or not getattr(settings, "PAYFAST_ITN_ENFORCE_IP", False):
        return True
    try:
        ip = ipaddress.ip_address(remote_ip)
    except ValueError:
        return False
    return any(ip in net for net in ITN_ALLOWED_NETWORKS)


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


def verify_itn(post_data: dict, remote_ip: str = "") -> tuple[bool, str]:
    """Authenticate an ITN callback. Returns (ok, reason).

    Signature (constant-time), optional source-IP allowlist, then PayFast
    validate-back. Payment-status semantics belong to the caller: CANCELLED
    and FAILED are authentic ITNs too and must lapse/log the plan, not 400.
    """
    if not sandbox() and not _passphrase():
        return False, "passphrase not configured in production"
    if not source_ip_allowed(remote_ip):
        return False, "source ip not allowed"
    received = post_data.get("signature", "")
    ours = sign_itn(post_data)
    if not received or not hmac.compare_digest(received, ours):
        return False, "bad signature"
    try:
        resp = httpx.post(validate_url(), data=post_data, timeout=10)
        if resp.text.strip() != "VALID":
            return False, "payfast validate-back rejected"
    except httpx.HTTPError:
        logger.exception("payfast validate-back failed")
        return False, "validate-back unreachable"
    return True, ""


def cancel_subscription(token: str) -> bool:
    """Stop renewal through PayFast's API, not the browser checkout cancel URL."""
    import re

    from django.utils import timezone

    if not configured() or not _passphrase() or not re.fullmatch(r"[a-fA-F0-9-]{36}", token):
        return False
    headers = {
        "merchant-id": str(getattr(settings, "PAYFAST_MERCHANT_ID", "")),
        "version": "v1",
        "timestamp": timezone.now().strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    values = {**headers, "passphrase": _passphrase()}
    payload = "&".join(f"{k}={quote_plus(v)}" for k, v in sorted(values.items()))
    headers["signature"] = hashlib.md5(payload.encode()).hexdigest()
    try:
        response = httpx.put(
            f"https://api.payfast.co.za/subscriptions/{token}/cancel",
            headers=headers,
            params={"testing": "true"} if sandbox() else {},
            timeout=15,
            follow_redirects=False,
        )
        result = response.json()
        return response.status_code == 200 and result.get("code") == 200 and result.get("status") == "success"
    except (httpx.HTTPError, ValueError):
        return False
