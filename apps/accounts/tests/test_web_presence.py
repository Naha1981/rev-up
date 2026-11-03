"""Web-presence gate: signup fields, validation, and the social-signup gate."""

from unittest import mock

import pytest
from django.core.exceptions import ValidationError
from django.urls import reverse

from apps.accounts.forms import RevUpSignupForm
from apps.accounts.models import User
from apps.common import web_presence
from apps.workspaces.models import Workspace

PROBE = "apps.common.web_presence._probe"


# ---------- unit: normalize / format ----------


class TestNormalizeUrl:
    def test_adds_scheme(self):
        assert web_presence.normalize_url("www.example.co.za") == "https://www.example.co.za"

    def test_keeps_scheme(self):
        assert web_presence.normalize_url("http://example.com") == "http://example.com"

    def test_rejects_whitespace_and_junk(self):
        assert web_presence.normalize_url("not a url") == ""
        assert web_presence.normalize_url("ftp://example.com") == ""
        assert web_presence.normalize_url("") == ""


class TestCleanWebsiteUrl:
    def test_empty_is_allowed(self):
        assert web_presence.clean_website_url("") == ""

    def test_format_error_without_dot(self):
        with pytest.raises(ValidationError) as exc:
            web_presence.clean_website_url("localhost")
        assert "doesn't look right" in str(exc.value)

    def test_unreachable(self):
        with mock.patch(PROBE, return_value=False), pytest.raises(Exception) as exc:
            web_presence.clean_website_url("example.co.za")
        assert "can't reach that website" in str(exc.value)

    def test_ok_normalizes_scheme(self):
        with mock.patch(PROBE, return_value=True) as probe:
            assert web_presence.clean_website_url("example.co.za") == "https://example.co.za"
        probe.assert_called_once_with("https://example.co.za")


class TestCleanFacebookUrl:
    def test_empty_is_allowed(self):
        assert web_presence.clean_facebook_url("") == ""

    def test_rejects_non_facebook_domain(self):
        with pytest.raises(ValidationError) as exc:
            web_presence.clean_facebook_url("https://twitter.com/biz")
        assert "Facebook page link" in str(exc.value)

    def test_rejects_bare_facebook_root(self):
        with pytest.raises(ValidationError) as exc:
            web_presence.clean_facebook_url("https://www.facebook.com/")
        assert "Facebook page link" in str(exc.value)

    def test_rejects_non_page_paths(self):
        for path in ("login", "groups/12345", "profile.php?id=1", "help"):
            with pytest.raises(ValidationError):
                web_presence.clean_facebook_url(f"https://www.facebook.com/{path}")

    def test_accepts_page_url(self):
        with mock.patch(PROBE, return_value=True):
            assert web_presence.clean_facebook_url("facebook.com/nahalabs") == "https://facebook.com/nahalabs"

    def test_accepts_mobile_subdomain(self):
        with mock.patch(PROBE, return_value=True):
            assert web_presence.clean_facebook_url("https://m.facebook.com/nahalabs")

    def test_unreachable(self):
        with mock.patch(PROBE, return_value=False), pytest.raises(Exception) as exc:
            web_presence.clean_facebook_url("https://www.facebook.com/nahalabs")
        assert "can't reach that Facebook page" in str(exc.value)


class TestSsrfguard:
    def test_private_ips_rejected(self):
        fake = [(2, 1, 6, "", ("10.0.0.1", 0))]
        with mock.patch("apps.common.web_presence.socket.getaddrinfo", return_value=fake):
            assert web_presence._host_is_public("internal.example") is False

    def test_public_ip_ok(self):
        fake = [(2, 1, 6, "", ("8.8.8.8", 0))]
        with mock.patch("apps.common.web_presence.socket.getaddrinfo", return_value=fake):
            assert web_presence._host_is_public("example.com") is True


# ---------- forms ----------


@pytest.mark.django_db
class TestSignupFormGate:
    def _form(self, **extra):
        data = {"email": "newbiz@example.com", "password1": "testpass123!"}
        data.update(extra)
        return RevUpSignupForm(data=data)

    def test_neither_field_blocks_signup(self):
        form = self._form()
        assert not form.is_valid()
        assert "Add your website or your Facebook page" in str(form.non_field_errors())

    def test_website_only_ok(self):
        with mock.patch(PROBE, return_value=True):
            form = self._form(website_url="mybiz.co.za")
            assert form.is_valid(), form.errors
            assert form.cleaned_data["website_url"] == "https://mybiz.co.za"

    def test_facebook_only_ok(self):
        with mock.patch(PROBE, return_value=True):
            form = self._form(facebook_url="https://www.facebook.com/mybiz")
            assert form.is_valid(), form.errors

    def test_broken_website_shows_plain_error(self):
        with mock.patch(PROBE, return_value=False):
            form = self._form(website_url="mybiz.co.za")
            assert not form.is_valid()
            assert "reach that website" in str(form.errors["website_url"])


# ---------- end-to-end through the views ----------


def _signup(client, **extra):
    data = {"email": "stranger@example.com", "password1": "testpass123!"}
    data.update(extra)
    return client.post(reverse("account_signup"), data)


@pytest.mark.django_db
class TestSignupViewGate:
    def test_signup_with_website_stores_it_on_workspace(self, client):
        with mock.patch(PROBE, return_value=True):
            _signup(client, website_url="sowetofunerals.co.za")
        user = User.objects.get(email="stranger@example.com")
        ws = Workspace.objects.get(memberships__user=user)
        assert ws.website_url == "https://sowetofunerals.co.za"
        assert ws.facebook_url == ""
        assert ws.web_presence_gate_exempt is False

    def test_signup_with_facebook_only_stores_it(self, client):
        with mock.patch(PROBE, return_value=True):
            _signup(client, facebook_url="https://www.facebook.com/sowetofunerals")
        ws = Workspace.objects.get(memberships__user__email="stranger@example.com")
        assert ws.facebook_url == "https://www.facebook.com/sowetofunerals"
        assert ws.website_url == ""

    def test_signup_with_neither_is_blocked(self, client):
        response = _signup(client)
        assert response.status_code == 200
        assert not User.objects.filter(email="stranger@example.com").exists()
        assert b"Add your website or your Facebook page" in response.content


@pytest.mark.django_db
class TestWebPresenceGate:
    @pytest.fixture(autouse=True)
    def _gate_on(self, settings):
        settings.WEB_PRESENCE_GATE_ENABLED = True

    def _user(self):
        user = User.objects.create_user(email="gate@example.com", password="testpass123!")
        from django.utils import timezone

        user.tos_accepted_at = timezone.now()
        user.save(update_fields=["tos_accepted_at"])
        return user

    def test_missing_presence_redirects_everywhere(self, client):
        user = self._user()
        client.force_login(user)
        response = client.get("/")
        assert response.status_code == 302
        assert response.url == reverse("accounts:business_details")

    def test_business_details_post_lifts_gate(self, client):
        user = self._user()
        client.force_login(user)
        with mock.patch(PROBE, return_value=True):
            response = client.post(
                reverse("accounts:business_details"),
                {"facebook_url": "https://www.facebook.com/gatebiz"},
            )
        assert response.status_code == 302
        assert response.url == "/"
        ws = Workspace.objects.get(memberships__user=user)
        assert ws.facebook_url == "https://www.facebook.com/gatebiz"
        after = client.get("/")
        assert not (after.status_code == 302 and after.url == reverse("accounts:business_details"))

    def test_grandfathered_workspace_passes(self, client):
        user = self._user()
        ws = Workspace.objects.get(memberships__user=user)
        ws.web_presence_gate_exempt = True
        ws.save(update_fields=["web_presence_gate_exempt"])
        client.force_login(user)
        response = client.get("/")
        assert not (response.status_code == 302 and response.url == reverse("accounts:business_details"))
