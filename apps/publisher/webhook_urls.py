from django.urls import path

from .zernio_webhooks import zernio_webhook

urlpatterns = [
    path("zernio/", zernio_webhook, name="zernio_webhook"),
]
