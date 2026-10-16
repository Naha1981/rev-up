import os

from django.db import migrations


def set_site(apps, schema_editor):
    # White-label: allauth builds password-reset/confirmation links from the
    # Site row. Domain follows CANONICAL_HOST so a future custom domain only
    # needs an env change, falling back to the current canonical host.
    domain = os.environ.get("CANONICAL_HOST", "nahalabs-growth.onrender.com")
    Site = apps.get_model("sites", "Site")
    Site.objects.update_or_create(
        id=1,
        defaults={"domain": domain, "name": "NahaLabs"},
    )


def reset_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(id=1).update(domain="example.com", name="example.com")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_add_review_banner_dismissed_at"),
        ("sites", "0002_alter_domain_unique"),
    ]
    operations = [migrations.RunPython(set_site, reset_site)]
