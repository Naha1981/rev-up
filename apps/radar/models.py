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
