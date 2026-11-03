"""Add web-presence gate fields; grandfather existing workspaces."""

from django.db import migrations, models


def exempt_existing(apps, schema_editor):
    Workspace = apps.get_model("workspaces", "Workspace")
    Workspace.objects.update(web_presence_gate_exempt=True)


def reapply_gate(apps, schema_editor):
    Workspace = apps.get_model("workspaces", "Workspace")
    Workspace.objects.update(web_presence_gate_exempt=False)


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0005_workspace_publish_test_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="workspace",
            name="website_url",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="workspace",
            name="facebook_url",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="workspace",
            name="web_presence_gate_exempt",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(exempt_existing, reapply_gate),
    ]
