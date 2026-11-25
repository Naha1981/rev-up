"""Bridge Worker-native images without making the private library public."""
import json
import time
from urllib.parse import quote

from django.conf import settings
from django.db import connection

from apps.common.encryption import encrypt_value


def native_media_item(post_id):
    with connection.cursor() as cur:
        # Legacy Django-only databases have no Worker image column/table.
        cur.execute("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='composer_post' AND column_name='media_id')")
        if not cur.fetchone()[0]:
            return None
        cur.execute("SELECT p.media_id,m.id,m.mime FROM composer_post p LEFT JOIN cf_media m ON m.id=p.media_id AND m.workspace_id=p.workspace_id WHERE p.id=%s", [str(post_id)])
        row = cur.fetchone()
    if not row or not row[0]:
        return None
    if not row[1]:
        raise ValueError("The attached image is not available in this business library")
    origin = getattr(settings, "APP_URL", "").rstrip("/")
    if not origin:
        raise ValueError("Publishing origin is not configured")
    token = encrypt_value(json.dumps({"media": str(row[1]), "post": str(post_id), "exp": int(time.time()*1000)+3500000}))
    return {"type": "image", "url": f"{origin}/published-media/{row[1]}?token={quote(token, safe='')}"}
