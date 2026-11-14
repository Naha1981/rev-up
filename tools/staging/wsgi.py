"""Recovery/static only. No supervisor, cron or application business endpoints."""
import os,socket
from urllib.parse import urlsplit
os.environ['DJANGO_SETTINGS_MODULE']='tools.staging.settings'
u=urlsplit(os.environ['DATABASE_URL']);dbhost=u.hostname
# Defence in depth for Django HTTP/SMTP calls. PostgreSQL host is the only
# non-loopback connection allowed. No provider/mail/AI credentials are present.
connect=socket.socket.connect
def limited_connect(self,address):
 if isinstance(address,tuple) and address[0] not in ('127.0.0.1','::1',dbhost):
  try:allowed={x[4][0] for x in socket.getaddrinfo(dbhost,u.port or 5432)}
  except OSError:allowed=set()
  if address[0] not in allowed:raise OSError('Synthetic staging egress blocked')
 return connect(self,address)
socket.socket.connect=limited_connect
from django.core.wsgi import get_wsgi_application
app=get_wsgi_application()
from django.db import connection
with connection.cursor() as c:
 c.execute('SELECT marker,synthetic_only,egress_disabled FROM cf_staging_boundary');b=c.fetchall()
 if len(b)!=1 or b[0][0] not in ('revup-full-journey-11nov2026','revup-full-journey-14nov2026') or b[0][1:]!=(True,True):raise RuntimeError('Wrong synthetic boundary')
def application(environ,start_response):
 path=environ.get('PATH_INFO','')
 if path.startswith('/accounts/password/reset/') or path.startswith('/static/'):
  return app(environ,start_response)
 start_response('404 Not Found',[('Content-Type','text/plain')]);return[b'Not found']
