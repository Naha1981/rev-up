from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0007_alter_organization_subscription_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrganizationPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("pf_payment_id", models.CharField(max_length=64, unique=True)),
                ("plan", models.CharField(max_length=20)),
                ("amount_gross", models.DecimalField(decimal_places=2, max_digits=10)),
                ("status", models.CharField(max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
