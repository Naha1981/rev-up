"""Recovery-only candidate. Synthetic mode is required until hosted proof passes."""
import os
from urllib.parse import urlsplit
from config.settings.base import *
_synthetic = os.environ.get('REVUP_RECOVERY_SYNTHETIC') == '1'
if not _synthetic and os.environ.get('REVUP_RECOVERY_ONLY') != '1':
    raise RuntimeError('Explicit recovery-only deployment required')
_origin = urlsplit(os.environ['REVUP_RECOVERY_ORIGIN'])
_database = urlsplit(os.environ['DATABASE_URL'])
if _origin.scheme not in ('http', 'https') or not _origin.hostname:
    raise RuntimeError('Explicit origin required')
if _synthetic:
    if _database.path not in ('/revup_journeys', '/revup_finish_synthetic'):
        raise RuntimeError('Synthetic database required')
else:
    if os.environ['REVUP_RECOVERY_ORIGIN'] != 'https://revup.nahalabs.co.za':
        raise RuntimeError('Wrong recovery origin')
    if _database.hostname != 'ep-sweet-mode-baxh02a8.c-8.eu-central-1.aws.neon.tech' or _database.path != '/revup':
        raise RuntimeError('Wrong shared authentication database')
    if EMAIL_BACKEND_TYPE != 'resend' or not RESEND_API_KEY:
        raise RuntimeError('Existing HTTPS transactional mail configuration required')
DEBUG = False
ALLOWED_HOSTS = [_origin.hostname, 'localhost', '127.0.0.1']
CSRF_TRUSTED_ORIGINS = [os.environ['REVUP_RECOVERY_ORIGIN']]
ROOT_URLCONF = 'config.urls'
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'apps.accounts.middleware.AuthRateLimitMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'csp.middleware.CSPMiddleware',
]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = _origin.scheme == 'https'
CSRF_COOKIE_SECURE = _origin.scheme == 'https'
SECURE_SSL_REDIRECT = False
CANONICAL_HOST_REDIRECT = ''
STUDIO_WORKER_ENABLED = False
BACKGROUND_TASK_RUN_ASYNC = False
if _synthetic:
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    EMAIL_SENDING_ENABLED = False
elif not EMAIL_SENDING_ENABLED or EMAIL_DAILY_SEND_LIMIT <= 0:
    raise RuntimeError('Transactional mail disabled')
STORAGES = {'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'}, 'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'}}
STATIC_ROOT = BASE_DIR / 'staticfiles'

USE_X_FORWARDED_HOST = True
