from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="dashboard"),
    path("legal/terms/", views.terms_of_service, name="legal_terms"),
    path("legal/privacy/", views.privacy_policy, name="legal_privacy"),
]
