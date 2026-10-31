from django.urls import path

from . import views

app_name = "platform_admin"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("businesses/<uuid:org_id>/", views.business_detail, name="business_detail"),
]
