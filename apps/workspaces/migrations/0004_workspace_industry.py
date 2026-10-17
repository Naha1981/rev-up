from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("workspaces", "0003_alter_workspace_primary_color_and_more")]

    operations = [
        migrations.AddField(
            model_name="workspace",
            name="industry",
            field=models.CharField(db_index=True, default="general", max_length=32),
        ),
    ]
