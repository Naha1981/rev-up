from django.urls import path

from . import payfast_views, views

app_name = "workspaces"

urlpatterns = [
    path("", views.workspace_list, name="list"),
    path("create/", views.workspace_create, name="create"),
    path("<uuid:workspace_id>/settings/", views.workspace_settings, name="settings"),
    path("<uuid:workspace_id>/billing/", views.workspace_billing, name="billing"),
    path("<uuid:workspace_id>/billing/payfast/", payfast_views.checkout, name="billing_payfast"),
    path("<uuid:workspace_id>/settings/approvals/", views.approvals_settings, name="approvals_settings"),
]
