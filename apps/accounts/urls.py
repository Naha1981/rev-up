from django.urls import path

from . import data_export, views
from .views_signup import InvitePrefillSignupView, SignupLinkLoginView

app_name = "accounts"

urlpatterns = [
    path("login/", SignupLinkLoginView.as_view(), name="account_login"),
    path("signup/", InvitePrefillSignupView.as_view(), name="account_signup"),
    path("accept-terms/", views.accept_terms, name="accept_terms"),
    path("business-details/", views.business_details, name="business_details"),
    path("settings/", views.account_settings, name="settings"),
    path("export/", data_export.export_my_data, name="export_my_data"),
    path("logout/", views.logout_view, name="logout"),
    path("review-banner/dismiss/", views.dismiss_review_banner, name="dismiss_review_banner"),
]
