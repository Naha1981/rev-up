"""POPIA export: the file downloads with the account's own data."""

import json

import pytest
from django.test import Client
from django.utils import timezone

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_export_requires_login():
    assert Client().get("/accounts/export/").status_code == 302


def test_export_downloads_json_with_account_and_workspaces():
    user = User.objects.create_user(email="exporter@example.com", password="x" * 20, tos_accepted_at=timezone.now())
    c = Client()
    c.force_login(user)
    resp = c.get("/accounts/export/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/json"
    assert "attachment" in resp["Content-Disposition"]
    data = json.loads(resp.content)
    assert data["account"]["email"] == "exporter@example.com"
    assert "exported_at" in data
    # signup auto-provisions one owned workspace + org
    assert len(data["workspaces"]) == 1
    assert data["workspaces"][0]["role"] == "owner"
