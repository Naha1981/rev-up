from django.urls import path

from . import views

app_name = "receptionist"

urlpatterns = [
    path("", views.inbox, name="inbox"),
    path("setup/", views.setup, name="setup"),
    path("contacts/<uuid:contact_id>/", views.conversation, name="conversation"),
]
