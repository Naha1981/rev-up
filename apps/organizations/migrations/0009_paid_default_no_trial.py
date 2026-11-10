from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("organizations", "0008_organizationpayment")]
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
                default="pending_activation",
                max_length=32,
            ),
        ),
    ]
