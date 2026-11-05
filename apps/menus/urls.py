from django.urls import path

from . import views

app_name = "menus"

urlpatterns = [
    path("", views.manage, name="manage"),
    path("items/<uuid:item_id>/<str:action>/", views.item_action, name="item_action"),
]
