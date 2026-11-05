from django.urls import path

from . import views

app_name = "radar"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("draft-signal/", views.draft_from_signal, name="draft_from_signal"),
]
