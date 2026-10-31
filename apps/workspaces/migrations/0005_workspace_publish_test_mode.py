# Generated for M3 (publish routing test mode) on 2026-10-31.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0004_workspace_industry"),
    ]

    operations = [
        migrations.AddField(
            model_name="workspace",
            name="publish_test_mode",
            field=models.BooleanField(default=False),
        ),
    ]
