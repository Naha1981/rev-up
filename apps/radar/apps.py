from django.apps import AppConfig
from django.db.models.signals import post_migrate


class RadarConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.radar"
    label = "radar"

    def ready(self):
        post_migrate.connect(self._register_poll_task, sender=self)

    @staticmethod
    def _register_poll_task(sender, **kwargs):
        try:
            from apps.common.background import register_recurring_task

            from .tasks import POLL_REPEAT_SECONDS, poll_radar_feeds

            register_recurring_task(poll_radar_feeds, repeat=POLL_REPEAT_SECONDS, verbose_name="radar_poll_feeds")
        except Exception:  # background tables may not exist pre-migrate
            pass
