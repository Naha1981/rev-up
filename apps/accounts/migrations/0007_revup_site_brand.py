from django.db import migrations


def rename_site(apps, schema_editor):
    Site = apps.get_model("sites", "Site")
    Site.objects.filter(id=1).update(name="RevUp")


class Migration(migrations.Migration):

    dependencies = [("accounts", "0006_set_site_nahalabs")]

    operations = [migrations.RunPython(rename_site, migrations.RunPython.noop)]
