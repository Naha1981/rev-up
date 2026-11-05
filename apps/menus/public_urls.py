from django.urls import path

from . import views

app_name = "menus_public"

urlpatterns = [
    path("<uuid:workspace_id>/", views.public, name="public"),
]
