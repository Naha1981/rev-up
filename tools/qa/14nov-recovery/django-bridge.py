import os,sys,json,base64,secrets
from pathlib import Path
root=Path(__file__).resolve().parents[3]
sys.path[:0]=[str(root),str(Path(__file__).parent)];os.environ['DJANGO_SETTINGS_MODULE']='synthetic_settings'
import django;django.setup()
from django.db import connection
with connection.cursor() as cur:
 cur.execute('select marker,synthetic_only,egress_disabled from cf_staging_boundary'); boundary=cur.fetchall()
 assert boundary==[('revup-full-journey-14nov2026',True,True)],'Wrong test boundary'
from django.contrib.sites.models import Site
Site.objects.get_or_create(pk=1,defaults={'domain':'127.0.0.1:8766','name':'Fictional recovery QA'})
from django.conf import settings
settings.SECURE_SSL_REDIRECT=False
settings.SESSION_COOKIE_SECURE=False
settings.CSRF_COOKIE_SECURE=False
settings.STATICFILES_STORAGE='django.contrib.staticfiles.storage.StaticFilesStorage'
settings.STORAGES={'default':{'BACKEND':'django.core.files.storage.FileSystemStorage'},'staticfiles':{'BACKEND':'django.contrib.staticfiles.storage.StaticFilesStorage'}}
from django.test import Client
from django.core import mail
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from http.server import HTTPServer,BaseHTTPRequestHandler
email='synthetic-recovery-'+secrets.token_hex(5)+'@example.invalid';pwd=secrets.token_urlsafe(32);u=get_user_model().objects.create_user(email=email,password=pwd)
with connection.cursor() as cur:
 cur.execute("INSERT INTO cf_sessions(token_hash,user_id,expires_at) VALUES(%s,%s,now()+interval '1 day')",[secrets.token_hex(32),str(u.pk)])
initial_hash=u.password
client=Client(enforce_csrf_checks=True)
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  q=json.loads(self.rfile.read(int(self.headers['content-length'])))
  if q.get('qa')=='identity':out={'email':email,'user_id':str(u.pk)}
  elif q.get('qa')=='expired':
   from unittest.mock import patch
   from datetime import datetime,timedelta
   from allauth.account.forms import default_token_generator
   from allauth.account.utils import user_pk_to_url_str
   u.refresh_from_db()
   with patch.object(default_token_generator,'_now',return_value=datetime.now()-timedelta(days=10)):
    token=default_token_generator.make_token(u)
   out={'path':'/accounts/password/reset/key/'+user_pk_to_url_str(u)+'-'+token+'/'}
  elif q.get('qa')=='state':
   u.refresh_from_db()
   with connection.cursor() as cur:
    cur.execute('SELECT count(*) FROM cf_sessions WHERE user_id=%s',[str(u.pk)]); sessions=cur.fetchone()[0]
   out={'changed':u.password!=initial_hash,'old_worker_sessions':sessions}
  elif q.get('qa')=='mail':out={'bodies':[x.body for x in getattr(mail,'outbox',[])]}
  else:
   h=q.get('headers',{});kw={('CONTENT_TYPE' if k.lower()=='content-type' else 'HTTP_'+k.upper().replace('-','_')):v for k,v in h.items() if k.lower() not in ['host','content-length']};kw['HTTP_HOST']='127.0.0.1:8766';kw['SERVER_NAME']='127.0.0.1';kw['SERVER_PORT']='8766'
   if q['method']=='POST':kw['HTTP_ORIGIN']='http://127.0.0.1:8766'
   client.cookies.clear()
   r=client.generic(q['method'],q['path'],data=base64.b64decode(q.get('body','')),**kw)
   headers=list(r.headers.items());headers.extend([('set-cookie',x.OutputString())for x in r.cookies.values()]);out={'status':r.status_code,'headers':headers,'body':base64.b64encode(r.content).decode()}
  b=json.dumps(out).encode();self.send_response(200);self.send_header('Content-Length',len(b));self.end_headers();self.wfile.write(b)
HTTPServer(('127.0.0.1',8767),Handler).serve_forever()
