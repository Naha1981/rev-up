"""Login page must show why a failed sign-in failed.

Bug: templates/account/login.html rendered messages and per-field errors
but never form.non_field_errors, so a wrong password re-rendered the page
with no visible message - on a phone it looked like the button did nothing.
"""

import pytest
from django.urls import reverse

from apps.accounts.models import User


@pytest.mark.django_db
def test_wrong_password_shows_non_field_error(client):
    User.objects.create_user(
        email="login-err@example.com",
        password="Correct-Horse-123!",
        tos_accepted_at="2026-01-01T00:00:00Z",
    )
    response = client.post(
        reverse("account_login"),
        {"login": "login-err@example.com", "password": "Wrong-Pass-999"},
        follow=True,
    )
    assert response.status_code == 200
    content = response.content.decode()
    assert "not correct" in content.lower()
    assert 'role="alert"' in content


@pytest.mark.django_db
def test_login_page_renders(client):
    response = client.get(reverse("account_login"))
    assert response.status_code == 200
    assert 'name="login"' in response.content.decode()
