from django.apps import AppConfig


class ProductAnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.productanalytics"

    def ready(self):
        from . import signals  # noqa: F401
