"""Custom storage backends."""

from botocore.exceptions import ClientError
from storages.backends.s3boto3 import S3Boto3Storage


class SupabaseS3Storage(S3Boto3Storage):
    """S3Boto3Storage tolerant of Supabase's edge returning 403 on HEAD.

    Supabase's Cloudflare edge answers signed HeadObject requests with 403
    (instead of 404) for some egress networks. django-storages' exists()
    only treats 404 as "missing" and re-raises everything else, which turns
    every upload of a new file into a 500. A 403 here means the edge refused
    the probe, not that the object exists, so treat it as missing and let the
    PUT decide.
    """

    def exists(self, name):
        try:
            return super().exists(name)
        except ClientError as err:
            if err.response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 403:
                return False
            raise
