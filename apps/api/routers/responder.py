"""``/api/v1/responder/*`` — run an enquiry through the WhatsApp responder.

Built for external apps (e.g. a listings site) to hand RevUp a customer
enquiry and get back the reply the responder WOULD send on WhatsApp.

The sidecar runs in dry-run on this deployment: replies are generated and
returned in the response, never sent to a real number. ``mode`` in the
response says so explicitly so consumers can't mistake it for a live send.

The workspace's industry preset (set at signup or on the Radar screen)
chooses the tone and qualifying questions.
"""

from __future__ import annotations

import json
import os
import urllib.request

from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from apps.api.limits import enforce_http_rate_limits
from apps.api.middleware import log_audit_entry

from .posts import _require_perm

router = Router(tags=["responder"])

SIDECAR_TIMEOUT = 30


class EnquiryRequest(BaseModel):
    enquiry: str = Field(min_length=20, max_length=200_000)


class EnquiryReply(BaseModel):
    to: str
    text: str


class EnquiryResponse(BaseModel):
    status: str
    reason: str | None = None
    replies: list[EnquiryReply]
    mode: str
    industry: str


def _sidecar_url(path: str) -> str:
    port = os.environ.get("RESPONDER_PORT", "3100")
    return f"http://127.0.0.1:{port}{path}"


@router.post("/enquiries", response={200: EnquiryResponse}, summary="Run an enquiry through the responder (dry-run)")
def submit_enquiry(request: HttpRequest, payload: EnquiryRequest):
    enforce_http_rate_limits(request, is_write=True)
    _require_perm(request, "use_responder")

    workspace = request.workspace  # type: ignore[attr-defined]
    req = urllib.request.Request(
        _sidecar_url("/selftest/enquiry"),
        data=payload.enquiry.encode("utf-8"),
        headers={"Content-Type": "text/plain", "X-Industry": workspace.industry},
    )
    try:
        with urllib.request.urlopen(req, timeout=SIDECAR_TIMEOUT) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        log_audit_entry(request, action="responder.enquiry", target_id=None, status_code=502)
        raise HttpError(502, f"Responder sidecar unavailable: {exc}")

    log_audit_entry(request, action="responder.enquiry", target_id=None, status_code=200)
    return EnquiryResponse(
        status=result.get("status", "unknown"),
        reason=result.get("reason"),
        replies=result.get("replies", []),
        mode="dry-run",
        industry=workspace.industry,
    )
