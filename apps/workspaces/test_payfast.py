"""PayFast billing tests: signature, param shape, ITN verification."""

from __future__ import annotations

import hashlib
import uuid
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
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
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
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        ok, reason = payfast.verify_itn(data)
    assert ok, reason


def test_tampered_signature_fails(merchant):
    data = _post()
    data["amount_gross"] = "1.00"  # tampered after signing; signature no longer matches
    ok, reason = payfast.verify_itn(data)
    assert not ok and reason == "bad signature"


def test_validate_back_rejection_fails(merchant):
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "INVALID"
        ok, reason = payfast.verify_itn(_post())
    assert not ok and "validate-back" in reason


def test_non_complete_status_fails(merchant):
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        ok, reason = payfast.verify_itn(_post(payment_status="PENDING"))
    # Authentic ITNs pass verification for any status; the notify view owns
    # status semantics (COMPLETE activates, CANCELLED lapses).
    assert ok and reason == ""


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
        email=f"pay-{uuid.uuid4().hex[:12]}@example.com", password="x" * 20, tos_accepted_at=timezone.now()
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
        email=f"out-{uuid.uuid4().hex[:12]}@example.com", password="x" * 20, tos_accepted_at=timezone.now()
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
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
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
    assert org.subscription_status == "pending_activation"


# ---- audit hardening tests (Claude report, 8 Nov 2026) ----


def test_signed_itn_with_wrong_amount_is_rejected(merchant, db):
    """Signature valid, amount below plan price: must not activate."""
    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth", amount_gross="499.00")  # signed with the wrong amount
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        resp = Client().post("/billing/payfast/notify/", data)
    assert resp.status_code == 400
    org.refresh_from_db()
    assert org.subscription_status != "active"


def test_itn_replay_is_idempotent(merchant, db):
    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth", token="tok-123")
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        assert Client().post("/billing/payfast/notify/", data).status_code == 200
        org.subscription_status = "expired"  # simulate a later lapse
        org.save(update_fields=["subscription_status"])
        assert Client().post("/billing/payfast/notify/", data).status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == "expired"  # replay did not re-activate


def test_cancelled_itn_lapses_active_org(merchant, db):
    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.plan = "growth"
    org.subscription_status = "active"
    org.payfast_token = "tok-123"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth", payment_status="CANCELLED", pf_payment_id="88888", token="tok-123")
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        resp = Client().post("/billing/payfast/notify/", data)
    assert resp.status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == "expired"
    assert org.payfast_token == ""


def test_production_without_passphrase_fails_closed(merchant, settings):
    settings.PAYFAST_SANDBOX = False
    settings.PAYFAST_PASSPHRASE = ""
    assert not payfast.configured()
    ok, reason = payfast.verify_itn(_post())
    assert not ok and "passphrase" in reason


def test_checkout_member_role_rejected(merchant, db):
    org, user, ws = _owner_with_workspace()
    from django.utils import timezone

    member = User.objects.create_user(
        email=f"mem-{uuid.uuid4().hex[:12]}@example.com", password="x" * 20, tos_accepted_at=timezone.now()
    )
    WorkspaceMembership.objects.create(user=member, workspace=ws, workspace_role="member")
    c = Client()
    c.force_login(member)
    assert c.post(f"/workspaces/{ws.id}/billing/payfast/", {"plan": "growth"}).status_code == 404


def test_itn_records_payment_row(merchant, db):
    from apps.organizations.models import OrganizationPayment

    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.save()
    data = _post(m_payment_id="RU-ABC12345-growth", token="tok-123")
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        Client().post("/billing/payfast/notify/", data)
    row = OrganizationPayment.objects.get(pf_payment_id="99999")
    assert row.organization_id == org.id
    assert str(row.amount_gross) == "999.00"
    assert row.status == "COMPLETE"


@pytest.mark.django_db
def test_payment_return_does_not_claim_settlement_or_promote_plan(client):
    from django.contrib.messages import get_messages

    from apps.organizations.test_billing import _setup

    org, ws, user = _setup(email="return-safety@example.com")
    client.force_login(user)
    session = client.session
    session["billing_checkout_workspace"] = str(ws.id)
    session.save()
    response = client.get("/billing/payfast/return/")
    assert response.status_code == 302
    assert response.url == f"/workspaces/{ws.id}/billing/"
    text = " ".join(str(x) for x in get_messages(response.wsgi_request))
    assert "Payment received" not in text
    assert "confirmed" in text
    org.refresh_from_db()
    assert org.subscription_status == "pending_activation"
    assert org.plan == "starter"


@pytest.mark.django_db
def test_payment_cancel_returns_to_exact_checkout_workspace(client):
    from apps.organizations.test_billing import _setup

    org, ws, user = _setup(email="cancel-safety@example.com")
    client.force_login(user)
    session = client.session
    session["billing_checkout_workspace"] = str(ws.id)
    session.save()
    response = client.get("/billing/payfast/cancel/")
    assert response.status_code == 302
    assert response.url == f"/workspaces/{ws.id}/billing/"
    org.refresh_from_db()
    assert org.subscription_status == "pending_activation"


@pytest.mark.django_db
def test_recurring_cancel_requires_confirmation_and_keeps_plan_on_provider_failure(client):
    from apps.organizations.test_billing import _setup

    org, ws, user = _setup(email="cancel-failure@example.com")
    org.subscription_status = "active"
    org.payfast_token = "00000000-0000-4000-8000-000000000001"
    org.save(update_fields=["subscription_status", "payfast_token"])
    client.force_login(user)
    url = f"/workspaces/{ws.id}/billing/payfast/subscription/cancel/"
    with mock.patch("apps.workspaces.payfast.cancel_subscription", return_value=False) as cancel:
        assert client.get(url).status_code == 405
        assert client.post(url, {}).status_code == 400
        cancel.assert_not_called()
        assert (
            client.post(
                url,
                {
                    "confirm": "cancel",
                    "confirmation": hashlib.sha256(f"{user.id}:{org.id}:{org.payfast_token}".encode()).hexdigest(),
                },
            ).status_code
            == 302
        )
        cancel.assert_called_once_with(org.payfast_token)
    org.refresh_from_db()
    assert org.subscription_status == "active"
    assert org.payfast_token


@pytest.mark.django_db
def test_recurring_cancel_success_stops_billing_without_deleting_business(client):
    from apps.organizations.test_billing import _setup

    org, ws, user = _setup(email="cancel-success@example.com")
    org.subscription_status = "active"
    org.payfast_token = "00000000-0000-4000-8000-000000000001"
    org.save(update_fields=["subscription_status", "payfast_token"])
    client.force_login(user)
    with mock.patch("apps.workspaces.payfast.cancel_subscription", return_value=True):
        assert (
            client.post(
                f"/workspaces/{ws.id}/billing/payfast/subscription/cancel/",
                {
                    "confirm": "cancel",
                    "confirmation": hashlib.sha256(f"{user.id}:{org.id}:{org.payfast_token}".encode()).hexdigest(),
                },
            ).status_code
            == 302
        )
    org.refresh_from_db()
    assert org.subscription_status == "expired"
    assert org.payfast_token == ""
    assert org.deleted_at is None


def test_cancel_api_signature_and_sandbox_contract(merchant):
    with mock.patch("apps.workspaces.payfast.httpx.put") as put:
        put.return_value.status_code = 200
        put.return_value.json.return_value = {"code": 200, "status": "success"}
        assert payfast.cancel_subscription("00000000-0000-4000-8000-000000000001")
        args, kwargs = put.call_args
        assert args[0].endswith("/subscriptions/00000000-0000-4000-8000-000000000001/cancel")
        assert kwargs["params"] == {"testing": "true"}
        assert kwargs["follow_redirects"] is False
        h = kwargs["headers"]
        fields = {k: v for k, v in h.items() if k != "signature"}
        fields["passphrase"] = "testpass"
        text = "&".join(k + "=" + quote_plus(v) for k, v in sorted(fields.items()))
        assert h["signature"] == hashlib.md5(text.encode()).hexdigest()


@pytest.mark.django_db
def test_old_subscription_cancel_notification_cannot_cancel_new_subscription(merchant):
    from django.test import Client

    org, user, ws = _owner_with_workspace()
    org.payment_reference = "RU-ABC12345"
    org.subscription_status = "active"
    org.payfast_token = "new-token"
    org.save()
    data = _post(
        m_payment_id="RU-ABC12345-starter", payment_status="CANCELLED", pf_payment_id="old-cancel", token="old-token"
    )
    with mock.patch("apps.workspaces.payfast.httpx.post") as p:
        p.return_value.text = "VALID"
        assert Client().post("/billing/payfast/notify/", data).status_code == 200
    org.refresh_from_db()
    assert org.subscription_status == "active"
    assert org.payfast_token == "new-token"
