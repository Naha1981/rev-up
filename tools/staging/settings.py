"""Isolated synthetic deployment only. Never import from production."""
import os
from urllib.parse import urlsplit
from config.settings.base import *
origin=urlsplit(os.environ['REVUP_STAGING_ORIGIN'])
if origin.scheme not in ('http','https') or not origin.hostname:raise RuntimeError('Explicit staging origin required')
u=urlsplit(os.environ['DATABASE_URL'])
if u.path not in ('/revup_journeys','/revup_finish_synthetic'):raise RuntimeError('Not a permitted synthetic database')
ALLOWED_HOSTS=[origin.hostname,'127.0.0.1','localhost']
CSRF_TRUSTED_ORIGINS=[os.environ['REVUP_STAGING_ORIGIN']]
SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO','https')
SESSION_COOKIE_SECURE=origin.scheme=='https'
CSRF_COOKIE_SECURE=origin.scheme=='https'
SECURE_SSL_REDIRECT=False
DEBUG=False
EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
EMAIL_SENDING_ENABLED=False
STUDIO_WORKER_ENABLED=False
BACKGROUND_TASK_RUN_ASYNC=False
CANONICAL_HOST_REDIRECT=''
STORAGES={'default':{'BACKEND':'django.core.files.storage.FileSystemStorage'},'staticfiles':{'BACKEND':'whitenoise.storage.CompressedStaticFilesStorage'}}
STATIC_ROOT=BASE_DIR/'staticfiles'
LOGGING={'version':1,'disable_existing_loggers':False,'handlers':{'null':{'class':'logging.NullHandler'}},'root':{'handlers':['null']}}
