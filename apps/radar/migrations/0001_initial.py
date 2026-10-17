import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("workspaces", "0003_alter_workspace_primary_color_and_more"),
        ("composer", "0023_platformpost_youtube_video_checked_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="RadarIngestedItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("link", models.URLField(max_length=2048)),
                ("title", models.CharField(blank=True, default="", max_length=512)),
                ("ingested_at", models.DateTimeField(auto_now_add=True)),
                (
                    "post",
                    models.ForeignKey(
                        blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="composer.post"
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name="radar_ingested_items", to="workspaces.workspace"
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="radaringesteditem",
            constraint=models.UniqueConstraint(fields=("workspace", "link"), name="radar_item_unique_per_workspace"),
        ),
    ]
