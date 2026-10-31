# Generated to satisfy makemigrations --check: choices-only change, no DDL.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("receptionist", "0005_quote"),
    ]

    operations = [
        migrations.AlterField(
            model_name='businessprofile',
            name='industry',
            field=models.CharField(choices=[('plumber', 'Plumbing'), ('electrician', 'Electrical'), ('security', 'Security'), ('solar', 'Solar / inverters'), ('auto-workshop', 'Auto workshop'), ('mobile-mechanic', 'Mobile mechanic'), ('towing', 'Towing / roadside'), ('hvac', 'Aircon / refrigeration'), ('roofing', 'Roofing / waterproofing'), ('gates-access', 'Gates / fencing / access control'), ('pest-control', 'Pest control'), ('property-maintenance', 'Property maintenance'), ('container-transport', 'Container transport'), ('pool', 'Pool services'), ('aesthetics', 'Aesthetics / cosmetic clinic'), ('real-estate', 'Real estate'), ('property-management', 'Property management'), ('legal', 'Law firm'), ('financial-broker', 'Financial / insurance broker'), ('funeral', 'Funeral services'), ('dental', 'Dental practice'), ('trades', 'Trades (general building & repairs)'), ('general', 'General local service')], default='general', max_length=20),
        ),
    ]
