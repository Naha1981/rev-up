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
    data["signature"] = payfast.sign_itn(data)
    return data


def test_valid_itn_passes(merchant):
    data = _post()
    with mock.patch("apps.workspaces.payfast.requests.post") as p:
        p.return_value.text = "VALID"
        ok, reason = payfast.verify_itn(data)
    assert ok, reason


def test_itn_with_empty_fields_signed_payfast_style_passes(merchant):
    """Regression: real ITNs carry empty vars and PayFast signs them INCLUDED.

    The first real sandbox ITN was rejected "bad signature" because the
    outbound rule skips empties; PayFast's ITN rule keeps them.
    """
    data = _post(custom_str1="", custom_str2="", phone="")
    # Re-sign with the empty fields included, the way PayFast actually signs.
    import hashlib
    from urllib.parse import quote_plus

    payload = "&".join(f"{k}={quote_plus(v.strip())}" for k, v in data.items() if k != "signature")
    payload += f"&passphrase={quote_plus('testpass')}"
    data["signature"] = hashlib.md5(payload.encode()).hexdigest()
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


# ---- view tests ----

from django.test import Client  # noqa: E402

from apps.accounts.models import User  # noqa: E402
from apps.members.models import WorkspaceMembership  # noqa: E402
from apps.organizations.models import Organization  # noqa: E402
from apps.workspaces.models import Workspace  # noqa: E402


def _owner_with_workspace():
    from django.utils import timezone

    org = Organization.objects.create(name="Pay Org", plan="starter")
    user = User.objects.create_user(
        email=f"pay-{timezone.now().timestamp()}@example.com", password="x" * 20, tos_accepted_at=timezone.now()
    )
    ws = Workspace.objects.create(name="Pay Biz", organization=org)
    WorkspaceMembership.objects.create(user=user, workspace=ws, workspace_role="owner")
    return org, user, ws


def test_checkout_renders_auto_submit_form_with_signed_params(merchant, db):
    org, user, ws = _owner_with_workspace()
    c = Client()
    c.force_login(user)
    resp = c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "growth"})
    assert resp.status_code == 200
    body = resp.content.decode()
    assert "sandbox.payfast.co.za/eng/process" in body
    assert f"{org.payment_reference}-growth" in body
    assert "999.00" in body
    assert "signature" in body
    assert "RevUp Growth (monthly)" in body


def test_checkout_non_member_rejected(merchant, db):
    org, user, ws = _owner_with_workspace()
    from django.utils import timezone

    outsider = User.objects.create_user(
        email=f"out-{timezone.now().timestamp()}@example.com", password="x" * 20, tos_accepted_at=timezone.now()
    )
    c = Client()
    c.force_login(outsider)
    # Workspace middleware denies non-members (403) before the view; the view
    # itself now returns 404 instead of raising a response class (was a 500).
    assert c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "growth"}).status_code == 403


def test_checkout_rejects_unknown_plan(merchant, db):
    org, user, ws = _owner_with_workspace()
    c = Client()
    c.force_login(user)
    assert c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "platinum"}).status_code == 400


def test_itn_activates_plan_and_stores_token(merchant, db):
    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth", token="tok-123")
    with mock.patch("apps.workspaces.payfast.requests.post") as p:
        p.return_value.text = "VALID"
        resp = Client().post("/billing/payfast/notify/", data)
    assert resp.status_code == 200
    org.refresh_from_db()
    assert org.plan == "growth"
    assert org.subscription_status == "active"
    assert org.payfast_token == "tok-123"


def test_itn_tampered_is_400_and_changes_nothing(merchant, db):
    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth")
    data["amount_gross"] = "1.00"
    resp = Client().post("/billing/payfast/notify/", data)
    assert resp.status_code == 400
    org.refresh_from_db()
    assert org.plan == "starter"
    assert org.subscription_status == "trial"
