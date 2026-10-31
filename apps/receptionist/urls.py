from django.urls import path

from . import views

app_name = "receptionist"

urlpatterns = [
    path("", views.inbox, name="inbox"),
    path("setup/", views.setup, name="setup"),
    path("setup/connect-whatsapp/", views.connect_whatsapp, name="connect_whatsapp"),
    path("bookings/", views.bookings, name="bookings"),
    path("quotes/", views.quotes, name="quotes"),
    path("quotes/<uuid:quote_id>/<str:action>/", views.quote_action, name="quote_action"),
    path("bookings/<uuid:booking_id>/<str:action>/", views.booking_action, name="booking_action"),
    path("setup/bind-whatsapp/", views.bind_whatsapp, name="bind_whatsapp"),
    path("contacts/<uuid:contact_id>/", views.conversation, name="conversation"),
]
