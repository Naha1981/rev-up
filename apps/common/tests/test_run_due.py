"""The /internal/run-due/ cron endpoint: auth + bounded drain."""

import pytest
from background_task import background
from background_task.models import Task
from django.test import override_settings
from django.utils import timezone

URL = "/internal/run-due/"
TOKEN = "test-cron-token"

_ran = []


@background
def _probe_task():
    _ran.append(timezone.now())


@pytest.fixture(autouse=True)
def _clear_ran():
    yield
    _ran.clear()


@pytest.mark.django_db
class TestRunDueEndpoint:
    def test_404_when_token_unconfigured(self, client):
        assert client.post(URL).status_code == 404

    @override_settings(INTERNAL_CRON_TOKEN=TOKEN)
    def test_403_without_token(self, client):
        assert client.post(URL).status_code == 403

    @override_settings(INTERNAL_CRON_TOKEN=TOKEN)
    def test_403_with_wrong_token(self, client):
        assert client.post(URL, HTTP_X_RUN_DUE_TOKEN="wrong").status_code == 403

    @override_settings(INTERNAL_CRON_TOKEN=TOKEN)
    def test_get_rejected(self, client):
        assert client.get(URL, HTTP_X_RUN_DUE_TOKEN=TOKEN).status_code == 405

    @override_settings(INTERNAL_CRON_TOKEN=TOKEN)
    def test_drains_due_task(self, client):
        Task.objects.create(
            task_name=_probe_task.name,
            task_params="[[], {}]",
            run_at=timezone.now(),
        )
        response = client.post(URL, HTTP_X_RUN_DUE_TOKEN=TOKEN)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert _ran, "due task did not run during the drain"
        assert not Task.objects.filter(task_name=_probe_task.name).exists()

    @override_settings(INTERNAL_CRON_TOKEN=TOKEN)
    def test_future_task_untouched(self, client):
        from datetime import timedelta

        Task.objects.create(
            task_name=_probe_task.name,
            task_params="[[], {}]",
            run_at=timezone.now() + timedelta(hours=2),
        )
        response = client.post(URL, HTTP_X_RUN_DUE_TOKEN=TOKEN)
        assert response.status_code == 200
        assert not _ran, "future task ran early"
        assert Task.objects.filter(task_name=_probe_task.name).exists()


@pytest.mark.django_db
class TestRequestDrainMiddleware:
    def test_request_triggers_drain_thread(self, client, monkeypatch):
        started = []
        monkeypatch.setattr(
            "apps.common.run_due.threading.Thread",
            lambda target=None, **kw: started.append(target) or type("T", (), {"start": lambda self: None})(),
        )
        Task.objects.create(task_name=_probe_task.name, task_params="[[], {}]", run_at=timezone.now())
        client.get("/")
        assert started, "no drain thread started for a request with due tasks"

    def test_request_without_due_tasks_starts_nothing(self, client, monkeypatch):
        Task.objects.all().delete()  # migrations register a recurring task that is due in every test db
        started = []
        monkeypatch.setattr(
            "apps.common.run_due.threading.Thread",
            lambda target=None, **kw: started.append(target) or type("T", (), {"start": lambda self: None})(),
        )
        client.get("/")
        assert not started

    def test_drain_actually_runs_due_task(self):
        Task.objects.create(task_name=_probe_task.name, task_params="[[], {}]", run_at=timezone.now())
        from apps.common.run_due import _drain_due_tasks

        _drain_due_tasks(seconds=5)
        assert _ran
        assert not Task.objects.filter(task_name=_probe_task.name).exists()


@pytest.mark.django_db
class TestQuietPaths:
    """Health-check and asset paths never touch the task table: if they did,
    the platform's around-the-clock health pings would pin the serverless
    database awake and defeat scale-to-zero."""

    def test_health_check_skips_due_task_query(self, client, monkeypatch):
        calls = []
        monkeypatch.setattr("apps.common.run_due._due_tasks_exist", lambda: calls.append(1) or False)
        client.get("/health/")
        assert not calls

    def test_real_page_checks_due_tasks(self, client, monkeypatch):
        calls = []
        monkeypatch.setattr("apps.common.run_due._due_tasks_exist", lambda: calls.append(1) or False)
        client.get("/")
        assert calls
