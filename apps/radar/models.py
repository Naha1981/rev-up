import uuid

from django.db import models


class RadarIngestedItem(models.Model):
    """Ledger of radar-feed items already turned into posts for a workspace.

    One row per (workspace, link): the poller is idempotent across restarts
    and intervals because the unique constraint rejects re-ingestion.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="radar_ingested_items")
    link = models.URLField(max_length=2048)
    title = models.CharField(max_length=512, blank=True, default="")
    post = models.ForeignKey("composer.Post", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    ingested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["workspace", "link"], name="radar_item_unique_per_workspace")]


class RadarFeedItem(models.Model):
    """A demand signal generated for a workspace from free public sources.

    Populated by the hourly generator (apps.radar.tasks.generate_radar_feed_items)
    for workspaces that have no custom ``radar.feed_url`` setting: one polite
    Google News RSS query per workspace per run, South Africa-localised, deduped
    by link. Displayed on the radar dashboard; never auto-published.
    """

    workspace = models.ForeignKey("workspaces.Workspace", on_delete=models.CASCADE, related_name="radar_feed_items")
    title = models.CharField(max_length=500)
    link = models.URLField(max_length=1000)
    source = models.CharField(max_length=255, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    group = models.CharField(max_length=120, blank=True, default="")
    score = models.PositiveSmallIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["workspace", "link"], name="radar_feed_item_unique_per_workspace")
        ]
        ordering = ["-published_at", "-fetched_at"]
