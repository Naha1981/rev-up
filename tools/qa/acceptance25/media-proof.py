"""Disposable QA only: exercise actual provider payload without any network."""
import json
import time
from unittest.mock import patch
import httpx
from django.test import override_settings
from django.db import connection
from apps.composer.models import PlatformPost
from apps.publisher.engine import PublishEngine
from apps.common.encryption import encrypt_value
from providers.zernio import ZernioClient
with connection.cursor() as cur:
    cur.execute("SELECT synthetic_only,egress_disabled FROM cf_staging_boundary")
    assert cur.fetchall() == [(True,True)]
pp=PlatformPost.objects.get(post__title='SYNTHETIC private draft')
requests=[]
def handler(request):
    requests.append(request)
    return httpx.Response(201,json={'post':{'_id':'synthetic','platforms':[{'platform':'facebook','accountId':pp.social_account.provider_account_id,'status':'published','platformPostId':'synthetic-only'}]}})
with override_settings(APP_URL='http://127.0.0.1:8765',ZERNIO_ENABLED=True,ZERNIO_API_KEY='synthetic'):
    with patch('providers.zernio.ZernioClient',lambda *a,**k:ZernioClient(api_key='synthetic',base_url='https://mock.invalid',transport=httpx.MockTransport(handler))):
        result=PublishEngine()._dispatch_to_provider(pp)
assert result['success'] and len(requests)==1
payload=json.loads(requests[0].content)
assert len(payload['mediaItems'])==1 and payload['mediaItems'][0]['type']=='image'
url=payload['mediaItems'][0]['url']
from urllib.parse import urlparse
media_id=urlparse(url).path.split('/')[-1]
expired=encrypt_value(json.dumps({'media':media_id,'post':str(pp.post_id),'exp':int(time.time()*1000)-1}))
print('NATIVE_MEDIA_PROOF:'+json.dumps({'url':url,'expiredToken':expired}))
