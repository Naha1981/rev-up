import sys,os,json,secrets
from pathlib import Path
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root),str(Path(__file__).parent)];os.environ['DJANGO_SETTINGS_MODULE']='synthetic_settings'
import django;django.setup()
from django.db import connection
with connection.cursor() as cur:
 cur.execute('select marker,synthetic_only,egress_disabled from cf_staging_boundary'); boundary=cur.fetchall()
 assert boundary==[('revup-full-journey-14nov2026',True,True)],'Wrong test boundary'
from apps.organizations.models import Organization
from apps.workspaces.models import Workspace
from apps.receptionist.models import Contact,ZernioChannel,TenantMessagingConnection
x=secrets.token_hex(8);o=Organization.objects.create(name='FICTIONAL receipt QA '+x);w=Workspace.objects.create(name='FICTIONAL receipt QA '+x,organization=o);c=Contact.objects.create(workspace=w,wa_id='fictional-'+x,name='Fictional receipt',opted_out=False,needs_human=False,zernio_conversation_id='fictional-conversation-'+x);ZernioChannel.objects.create(workspace=w,zernio_account_id='fictional-account-'+x,zernio_profile_id='fictional-profile-'+x);TenantMessagingConnection.objects.create(workspace=w,account_id='fictional-account-'+x,profile_id='fictional-profile-'+x,status='connected',api_key='will-replace-with-synthetic-encrypted-key')
print(json.dumps({'workspace':str(w.id),'contact':str(c.id)}))
