from django.urls import path

from . import tenant_connect, views

app_name = "receptionist"

urlpatterns = [
    path("", views.inbox, name="inbox"),
    path("setup/", views.setup, name="setup"),
    path("setup/connect-whatsapp/", views.connect_whatsapp, name="connect_whatsapp"),
    path("bookings/", views.bookings, name="bookings"),
    path("waitlist/", views.waitlist, name="waitlist"),
    path("loyalty/", views.loyalty, name="loyalty"),
    path("complaints/", views.complaints, name="complaints"),
    path("complaints/<uuid:complaint_id>/<str:action>/", views.complaint_action, name="complaint_action"),
    path("loyalty/vouchers/<uuid:voucher_id>/<str:action>/", views.voucher_action, name="voucher_action"),
    path("campaigns/", views.campaigns, name="campaigns"),
    path("campaigns/<uuid:campaign_id>/<str:action>/", views.campaign_action, name="campaign_action"),
    path("competitors/", views.competitors, name="competitors"),
    path(
        "competitors/opportunities/<uuid:opportunity_id>/<str:action>/",
        views.opportunity_action,
        name="opportunity_action",
    ),
    path("revenue/", views.revenue_employee, name="revenue"),
    path("revenue/<uuid:opportunity_id>/execute/", views.revenue_execute, name="revenue_execute"),
    path("support/", views.support, name="support"),
    path("waitlist/<uuid:entry_id>/<str:action>/", views.waitlist_action, name="waitlist_action"),
    path("quotes/", views.quotes, name="quotes"),
    path("reviews/", views.review_dashboard, name="reviews"),
    path("calendar/connect/", views.calendar_connect, name="calendar_connect"),
    path("calendar/disconnect/", views.calendar_disconnect, name="calendar_disconnect"),
    path("quotes/<uuid:quote_id>/<str:action>/", views.quote_action, name="quote_action"),
    path("bookings/<uuid:booking_id>/<str:action>/", views.booking_action, name="booking_action"),
    path("setup/bind-whatsapp/", views.bind_whatsapp, name="bind_whatsapp"),
    path("setup/your-whatsapp/", tenant_connect.tenant_setup, name="tenant_wa_setup"),
    path("setup/your-whatsapp/start/", tenant_connect.tenant_connect_start, name="tenant_wa_start"),
    path("setup/your-whatsapp/callback/", tenant_connect.tenant_callback, name="tenant_wa_callback"),
    path("contacts/<uuid:contact_id>/", views.conversation, name="conversation"),
    path("contacts/<uuid:contact_id>/card/", views.contact_update, name="contact_update"),
]
