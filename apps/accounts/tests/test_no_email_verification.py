"""No email verification anywhere (owner rule, 4 Nov 2026).

Signup must not send a confirmation mail and must not route through the
verification page: the new user lands straight in the app. Return login
must work with no verified-email record existing.
"""

from unittest.mock import patch

import pytest
from django.conf import settings
from django.core import mail
from django.urls import reverse

from apps.accounts.models import User


@pytest.fixture(autouse=True)
def _website_probe_ok():
    """The signup form probes website reachability over the network; fake it."""
    with patch("apps.common.web_presence._probe", return_value=True):
        yield


def _signup(client):
    return client.post(
        reverse("account_signup"),
        {
            "email": "stranger@example.com",
            "password1": "Stranger-Pass-123!",
            "industry": "panel_beater",
            "website_url": "https://www.strangerpanels.co.za",
        },
        follow=False,
    )


@pytest.mark.django_db
def test_setting_is_none():
    assert settings.ACCOUNT_EMAIL_VERIFICATION == "none"


@pytest.mark.django_db
def test_signup_sends_no_confirmation_mail(client):
    response = _signup(client)
    assert response.status_code in (302, 303)
    assert "confirm" not in response["Location"].lower()
    assert "verification" not in response["Location"].lower()
    assert len(mail.outbox) == 0
    user = User.objects.get(email="stranger@example.com")
    assert user.is_active
    # logged in straight away, no verified-email step in between
    assert client.session.get("_auth_user_id") == str(user.pk)


@pytest.mark.django_db
def test_signup_then_return_login(client):
    _signup(client)
    client.logout()
    response = client.post(
        reverse("account_login"),
        {"login": "stranger@example.com", "password": "Stranger-Pass-123!"},
        follow=False,
    )
    assert response.status_code in (302, 303)
    assert "confirm" not in response["Location"].lower()
    user = User.objects.get(email="stranger@example.com")
    assert client.session.get("_auth_user_id") == str(user.pk)
