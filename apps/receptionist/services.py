"""Industry-aware reply drafting on the free Gemini route.

Replies are DRAFTED, never sent, until the workspace's channel goes live and
live sending is enabled. Escalation keywords flip the contact to needs_human
so a person takes over - the receptionist never argues with grief or pain.
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field

import httpx
from django.conf import settings

from .models import BusinessProfile, Industry

logger = logging.getLogger(__name__)

_GEMINI_TIMEOUT = 30

_ESCALATION_PATTERNS = [
    re.compile(r"\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b", re.I),
    re.compile(r"\b(complaint|sue|lawyer|attorney|refund)\b", re.I),
    re.compile(r"\b(died|death|passed away|deceased)\b", re.I),  # grief: always human for funeral care
    re.compile(r"\b(emergency|urgent|burst|flooding|no power|sparking)\b", re.I),
]

_INDUSTRY_BRIEFS: dict[str, str] = {
    Industry.FUNERAL: (
        "You are the WhatsApp receptionist for a funeral services business. "
        "Be calm, respectful and brief. Never discuss prices unprompted beyond the price list. "
        "For anything about a death, claim or policy, collect: deceased name, claimant name, "
        "policy number if they have one, and a callback number. Express condolences once, plainly."
    ),
    Industry.DENTAL: (
        "You are the WhatsApp receptionist for a dental practice. "
        "Help patients book or move appointments. Collect: patient name, reason for visit, "
        "and preferred day/time. For severe pain or trauma, flag it as urgent in your reply."
    ),
    Industry.TRADES: (
        "You are the WhatsApp receptionist for a trades business (plumbing, electrical, building). "
        "Collect: the job type, the property address or suburb, and whether it is urgent. "
        "Mention the call-out fee only when a call-out is being arranged, in rand."
    ),
    Industry.GENERAL: (
        "You are the WhatsApp receptionist for a local service business. "
        "Answer questions from the business information given, and take a name and number for anything else."
    ),
}

_RULES = (
    "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); "
    "never invent prices, dates or policies not given below; if you do not know, say a person will "
    "confirm; never mention you are an AI unless asked."
)


@dataclass
class ReplyDraft:
    body: str
    escalate: bool = False
    intake: dict = field(default_factory=dict)


def needs_human(text: str) -> bool:
    return any(p.search(text) for p in _ESCALATION_PATTERNS)


def _profile_block(profile: BusinessProfile) -> str:
    lines = [f"Business: {profile.business_name}"]
    if profile.operating_hours:
        lines.append(f"Operating hours: {json.dumps(profile.operating_hours)}")
    if profile.pricing_data:
        lines.append(f"Price list (ZAR): {json.dumps(profile.pricing_data)}")
    if profile.call_out_fee is not None:
        lines.append(f"Call-out fee: R{profile.call_out_fee}")
    if profile.payment_link_url:
        lines.append("Payments are taken by secure link; share it only when a customer is ready to pay.")
    if profile.custom_rules:
        lines.append(f"Standing rules from the owner: {profile.custom_rules}")
    return "\n".join(lines)


def draft_reply(profile: BusinessProfile, history: list[tuple[str, str]], incoming: str, *, client=None) -> ReplyDraft:
    """Draft one reply. history is (sender_type, body) oldest-first."""
    escalate = needs_human(incoming)
    transcript = "\n".join(
        f"{'Customer' if sender == 'user' else 'Receptionist'}: {body}" for sender, body in history[-12:]
    )
    prompt = (
        f"{_INDUSTRY_BRIEFS.get(profile.industry, _INDUSTRY_BRIEFS[Industry.GENERAL])}\n"
        f"{_profile_block(profile)}\n\n"
        f"Conversation so far:\n{transcript}\nCustomer: {incoming}\n\n"
        "Reply with JSON only: "
        '{"reply": "...", "intake": {"name": "", "detail": "", "preferred_time": "", "address": "", "policy_number": ""}} '
        "(fill only the intake fields the customer actually gave).\n"
        f"{_RULES}"
    )

    api_key = getattr(settings, "CONTENT_AGENT_GEMINI_API_KEY", "") or ""
    if not api_key:
        raise RuntimeError("CONTENT_AGENT_GEMINI_API_KEY is not set")
    model = getattr(settings, "CONTENT_AGENT_GEMINI_MODEL", "gemini-3.8-flash")
    http = client or httpx.Client(timeout=_GEMINI_TIMEOUT)
    resp = None
    for attempt in range(3):
        resp = http.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
        )
        if resp.status_code not in (429, 503):
            break
        time.sleep(3 * (attempt + 1))
    if resp is None:
        raise RuntimeError("no response from model")
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("no JSON object in model reply")
    data = json.loads(match.group(0))
    body = (data.get("reply") or "").strip()
    if not body:
        raise ValueError("empty reply from model")
    return ReplyDraft(body=body, escalate=escalate, intake=data.get("intake") or {})
