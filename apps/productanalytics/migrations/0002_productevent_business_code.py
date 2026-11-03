"""Add business_code for outreach link attribution."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("productanalytics", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="productevent",
            name="business_code",
            field=models.CharField(blank=True, db_index=True, default="", max_length=32),
        ),
    ]
