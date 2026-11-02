from django.urls import path

from . import views

app_name = "receptionist"

urlpatterns = [
    path("", views.inbox, name="inbox"),
    path("setup/", views.setup, name="setup"),
    path("setup/connect-whatsapp/", views.connect_whatsapp, name="connect_whatsapp"),
    path("bookings/", views.bookings, name="bookings"),
    path("quotes/", views.quotes, name="quotes"),
    path("reviews/", views.review_dashboard, name="reviews"),
    path("calendar/connect/", views.calendar_connect, name="calendar_connect"),
    path("calendar/disconnect/", views.calendar_disconnect, name="calendar_disconnect"),
    path("quotes/<uuid:quote_id>/<str:action>/", views.quote_action, name="quote_action"),
    path("bookings/<uuid:booking_id>/<str:action>/", views.booking_action, name="booking_action"),
    path("setup/bind-whatsapp/", views.bind_whatsapp, name="bind_whatsapp"),
    path("contacts/<uuid:contact_id>/", views.conversation, name="conversation"),
]
