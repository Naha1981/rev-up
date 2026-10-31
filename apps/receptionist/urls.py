from django.urls import path

from . import views

app_name = "receptionist"

urlpatterns = [
    path("", views.inbox, name="inbox"),
    path("setup/", views.setup, name="setup"),
    path("setup/connect-whatsapp/", views.connect_whatsapp, name="connect_whatsapp"),
    path("setup/bind-whatsapp/", views.bind_whatsapp, name="bind_whatsapp"),
    path("contacts/<uuid:contact_id>/", views.conversation, name="conversation"),
]
