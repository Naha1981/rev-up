"""PayFast billing tests: signature, param shape, ITN verification."""

from __future__ import annotations

import hashlib
from unittest import mock
from urllib.parse import quote_plus

import pytest

from apps.workspaces import payfast


@pytest.fixture
def merchant(settings):
    settings.PAYFAST_MERCHANT_ID = "10000100"
    settings.PAYFAST_MERCHANT_KEY = "46f0cd694581a"
    settings.PAYFAST_PASSPHRASE = "testpass"
    settings.PAYFAST_SANDBOX = True
    return settings


def test_signature_is_md5_of_ordered_pairs_plus_passphrase(merchant):
    params = {"merchant_id": "10000100", "amount": "999.00", "item_name": "RevUp Growth (monthly)"}
    expected_payload = (
        "merchant_id=10000100&amount=999.00&item_name=" + quote_plus("RevUp Growth (monthly)") + "&passphrase=testpass"
    )
    assert payfast.sign(params) == hashlib.md5(expected_payload.encode()).hexdigest()


def test_empty_values_are_skipped(merchant):
    assert payfast.sign({"a": "1", "b": ""}) == payfast.sign({"a": "1"})


def test_sandbox_urls_when_sandbox_on(merchant):
    assert "sandbox.payfast.co.za" in payfast.process_url()


def test_live_urls_when_sandbox_off(merchant, settings):
    settings.PAYFAST_SANDBOX = False
    assert payfast.process_url() == "https://www.payfast.co.za/eng/process"


def _post(**over):
    data = {
        "m_payment_id": "RU-123-growth",
        "pf_payment_id": "99999",
        "payment_status": "COMPLETE",
        "amount_gross": "999.00",
        **over,
    }
    data["signature"] = payfast.sign(data)
    return data


def test_valid_itn_passes(merchant):
    data = _post()
    with mock.patch("apps.workspaces.payfast.requests.post") as p:
        p.return_value.text = "VALID"
        ok, reason = payfast.verify_itn(data)
    assert ok, reason


def test_tampered_signature_fails(merchant):
    data = _post()
    data["amount_gross"] = "1.00"  # tampered after signing; signature no longer matches
    ok, reason = payfast.verify_itn(data)
    assert not ok and reason == "bad signature"


def test_validate_back_rejection_fails(merchant):
    with mock.patch("apps.workspaces.payfast.requests.post") as p:
        p.return_value.text = "INVALID"
        ok, reason = payfast.verify_itn(_post())
    assert not ok and "validate-back" in reason


def test_non_complete_status_fails(merchant):
    with mock.patch("apps.workspaces.payfast.requests.post") as p:
        p.return_value.text = "VALID"
        ok, reason = payfast.verify_itn(_post(payment_status="PENDING"))
    assert not ok and "PENDING" in reason
