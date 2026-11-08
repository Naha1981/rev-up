# Align the model with the live schema (varchar(32)) and register the
# worker-written 'pending_activation' status as a first-class choice.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0006_organization_activated_at_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="subscription_status",
            field=models.CharField(
                choices=[
                    ("trial", "Early access"),
                    ("active", "Active"),
                    ("expired", "Not active"),
                    ("pending_activation", "Activation pending"),
                ],
                default="trial",
                max_length=32,
            ),
        ),
    ]
