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

_GROQ_TIMEOUT = 20

_ESCALATION_PATTERNS = [
    re.compile(r"\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b", re.I),
    re.compile(r"\b(complaint|sue|lawyer|attorney|refund)\b", re.I),
    re.compile(r"\b(died|death|passed away|deceased)\b", re.I),  # grief: always human for funeral care
    re.compile(r"\b(emergency|urgent|burst|flooding|no power|sparking)\b", re.I),
]

_INDUSTRY_BRIEFS: dict[str, str] = {
    Industry.FUNERAL: (
        "You are the WhatsApp receptionist for a funeral services business. "
        "Be calm, compassionate and unhurried, and keep messages short. "
        "Guide every conversation with these options, offered as a short numbered list: "
        "1) arrangements needed now (a death or immediate funeral arrangements), "
        "2) cover plans and prices, 3) paying a policy, 4) claims, 5) general questions, "
        "6) speaking to a consultant, 7) raising a concern or complaint. "
        "For a death, claim or policy, express condolences once, plainly, then collect: "
        "deceased name, claimant name, policy number if they have one, and a callback number. "
        "For payment or claims, ask for the policy number first; if they do not have it, "
        "take their name and callback number instead. When someone asks for a consultant or "
        "raises a complaint, ask briefly what it is about, then confirm the team will call them back. "
        "Answer cover-plan and payment questions only from the price list, in rand. Never invent "
        "prices, benefits or policy terms. After helping, offer the options again."
    ),
    Industry.DENTAL: (
        "You are the WhatsApp receptionist for a dental practice. "
        "Help patients book or move appointments. Collect: patient name, reason for visit, "
        "and preferred day/time. For severe pain or trauma, flag it as urgent in your reply."
    ),
    Industry.RESTAURANT: (
        "You are the WhatsApp receptionist for a restaurant. "
        "Help guests book a table and answer menu and hours questions. Collect: guest name, "
        "party size, and preferred day/time. Never invent dishes, specials or prices beyond the price list."
    ),
    Industry.CATERING: (
        "You are the WhatsApp receptionist for a catering or food-truck business. "
        "Collect: the event date, location or suburb, number of guests, and the kind of food they need. "
        "Never invent menus or prices beyond the price list."
    ),
    Industry.TRADES: (
        "You are the WhatsApp receptionist for a trades business (plumbing, electrical, building). "
        "Collect: the job type, the property address or suburb, and whether it is urgent. "
        "Mention the call-out fee only when a call-out is being arranged, in rand."
    ),
    Industry.PLUMBER: (
        "You are the WhatsApp receptionist for a plumbing business. "
        "They handle emergency plumbing, geyser repairs, leak detection, blocked drains and "
        "bathroom/kitchen plumbing. Collect: the plumbing problem, the suburb, and how urgent it is "
        "(now, today or later). Burst pipes, flooding, no water or a burst geyser are urgent - flag it."
    ),
    Industry.ELECTRICIAN: (
        "You are the WhatsApp receptionist for an electrical business. "
        "They handle fault finding, DB board repairs and upgrades, installations, COCs and "
        "solar/inverter electrical work. Collect: the electrical issue, the suburb, and whether there "
        "is immediate danger or a power outage. Sparking, smoke or a burning smell is urgent - flag it."
    ),
    Industry.SECURITY: (
        "You are the WhatsApp receptionist for a security business. "
        "They handle CCTV, alarms, electric fencing, access control, armed response and guarding. "
        "Collect: property type (home, estate or business), the suburb, and what security they need. "
        "A break-in in progress or an intruder is urgent - flag it."
    ),
    Industry.SOLAR: (
        "You are the WhatsApp receptionist for a solar and inverter business. "
        "They handle solar PV, inverters, battery backup and load-shedding solutions. "
        "Collect: property type, the suburb, what they need to keep powered, and whether they already "
        "have solar, an inverter or batteries."
    ),
    Industry.AUTO_WORKSHOP: (
        "You are the WhatsApp receptionist for a vehicle workshop. "
        "They handle diagnostics, servicing, brakes, engine repairs and pre-purchase inspections. "
        "Collect: vehicle make, model and year, the problem, and whether it can still drive. "
        "A breakdown or a vehicle that will not start is urgent - flag it."
    ),
    Industry.MOBILE_MECHANIC: (
        "You are the WhatsApp receptionist for a mobile mechanic. "
        "They handle breakdown assistance, diagnostics, batteries, brakes and mobile servicing. "
        "Collect: vehicle make, model and year, where the vehicle is now, and what happened. "
        "A stranded driver is urgent - flag it."
    ),
    Industry.TOWING: (
        "You are the WhatsApp receptionist for a towing and roadside business. "
        "They handle towing, breakdown and accident recovery, and battery assistance. "
        "Collect: where the vehicle is now, what vehicle it is, what happened, and where it must go. "
        "Accidents and stranded drivers are urgent - flag it."
    ),
    Industry.HVAC: (
        "You are the WhatsApp receptionist for an aircon and refrigeration business. "
        "They handle aircon repairs and installation, maintenance, commercial HVAC and refrigeration. "
        "Collect: repair, installation or maintenance; the suburb or site; what equipment or room is "
        "affected; and whether the unit is completely down. A dead cold room or fridge is urgent."
    ),
    Industry.ROOFING: (
        "You are the WhatsApp receptionist for a roofing and waterproofing business. "
        "They handle roof repairs, waterproofing, leak detection and roof replacement. "
        "Collect: what is happening with the roof, the suburb, and whether water is coming in now. "
        "An active leak in rain is urgent - flag it."
    ),
    Industry.GATES_ACCESS: (
        "You are the WhatsApp receptionist for a gate, electric fencing and access-control business. "
        "They handle gate motors, electric fencing, intercoms, access control and repairs. "
        "Collect: the problem, the suburb, whether there is an existing motor or fence, and whether "
        "it is a repair or a new installation. A gate stuck open or a fence down is a security risk - "
        "flag it as urgent."
    ),
    Industry.PEST_CONTROL: (
        "You are the WhatsApp receptionist for a pest control business. "
        "They handle cockroach, rodent and termite treatment, fumigation and recurring pest management. "
        "Collect: the pest, the suburb, the property type, and how widespread the problem is. "
        "An infestation at a restaurant or food premises is urgent - flag it."
    ),
    Industry.PROPERTY_MAINTENANCE: (
        "You are the WhatsApp receptionist for a property maintenance business. "
        "They handle general repairs, inspections, make-ready work and recurring maintenance. "
        "Collect: what needs repair, which property, how urgent it is, and who gives access. "
        "Water leaks and no power are urgent - flag it."
    ),
    Industry.CONTAINER_TRANSPORT: (
        "You are the WhatsApp receptionist for a container transport business. "
        "They move loaded and empty 6m and 12m containers, site to site. "
        "Collect: container size, loaded or empty with a rough weight, where it is and where it must "
        "go, and whether a truck can park right beside it at both sites."
    ),
    Industry.POOL: (
        "You are the WhatsApp receptionist for a pool business. "
        "They handle pool maintenance, pump and filter repairs, renovations and new pools. "
        "Collect: what is happening with the pool, the suburb, and whether it is maintenance, "
        "a repair or a renovation."
    ),
    Industry.AESTHETICS: (
        "You are the WhatsApp receptionist for an aesthetics clinic. "
        "They handle injectables, skin treatments, laser, hair restoration and body treatments. "
        "Be warm and discreet. Collect: the treatment they are interested in, whether it is a first "
        "visit, and when they would like to come in. Never give medical advice - treatment questions "
        "go to the practitioner."
    ),
    Industry.REAL_ESTATE: (
        "You are the WhatsApp receptionist for a real estate business. "
        "They handle property sales, rentals, viewings and commercial property. "
        "Collect: which property or area, buying or renting, an approximate budget, and when they "
        "would like to view."
    ),
    Industry.PROPERTY_MANAGEMENT: (
        "You are the WhatsApp receptionist for a property management business. "
        "They handle residential and commercial management, tenant support and leasing. "
        "Collect: whether they are a tenant, landlord or looking; which property; the request; and "
        "how urgent it is. Lockouts, water leaks and no power are urgent - flag it."
    ),
    Industry.LEGAL: (
        "You are the WhatsApp receptionist for a law firm. "
        "They handle personal injury, family, labour, property and commercial matters. "
        "Be professional and discreet, and never give legal advice. "
        "Collect: the type of matter, the area or province it relates to, and any deadline or court "
        "date. Court dates, summonses and eviction notices are urgent - flag it."
    ),
    Industry.FINANCIAL_BROKER: (
        "You are the WhatsApp receptionist for a financial and insurance brokerage. "
        "They handle insurance, life cover, business cover, home finance and financial planning. "
        "Collect: what they need (insurance, finance or advice), personal or business, and when they "
        "would like to speak to an adviser. Never give financial advice - product questions go to "
        "the adviser."
    ),
    Industry.GENERAL: (
        "You are the WhatsApp receptionist for a local service business. "
        "Answer questions from the business information given, and take a name and number for anything else."
    ),
}

_RULES = (
    "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); "
    "no emojis; never mention you are an AI unless asked. "
    "IMPORTANT: the business information above is the COMPLETE list of what this business offers. "
    "If the customer asks about a service, product, price or policy that is not listed there, "
    "do NOT say yes and do NOT say no - say a person from the team will confirm. "
    "If you do not know, say a person will confirm."
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
    from django.utils import timezone

    now = timezone.localtime()
    prompt = (
        f"Today is {now:%A} {now:%d %B %Y}, South Africa time.\n"
        f"{_INDUSTRY_BRIEFS.get(profile.industry, _INDUSTRY_BRIEFS[Industry.GENERAL])}\n"
        f"{_profile_block(profile)}\n\n"
        f"Conversation so far:\n{transcript}\nCustomer: {incoming}\n\n"
        "Reply with JSON only: "
        '{"reply": "...", "intake": {"name": "", "detail": "", "preferred_time": "", "address": "", "policy_number": ""}} '
        "(fill only the intake fields the customer actually gave; make detail a short description "
        "of what they want - for a restaurant booking use 'Table for N', never a bare number).\n"
        f"{_RULES}"
    )

    api_key = getattr(settings, "GROQ_API_KEY", "") or ""
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    primary = getattr(settings, "RECEPTIONIST_GROQ_MODEL", "openai/gpt-oss-120b")
    fallbacks = [
        m.strip()
        for m in getattr(settings, "RECEPTIONIST_GROQ_FALLBACK_MODELS", "openai/gpt-oss-20b").split(",")
        if m.strip()
    ]
    models = [primary] + [m for m in fallbacks if m != primary]
    http = client or httpx.Client(timeout=_GROQ_TIMEOUT)
    text = ""
    last_error: Exception | None = None
    for model in models:
        for attempt in range(2):
            payload: dict = {
                "model": model,
                "temperature": 0.2,
                # gpt-oss spends part of the budget on hidden reasoning; 800
                # leaves room for the actual reply.
                "max_tokens": 800,
                "messages": [{"role": "user", "content": prompt}],
            }
            if model.startswith("openai/gpt-oss"):
                payload["reasoning_effort"] = "low"
            try:
                resp = http.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json=payload,
                )
            except Exception as exc:
                last_error = exc
                time.sleep(2 * (attempt + 1))
                continue
            if resp.status_code == 429:
                last_error = RuntimeError(f"{model} rate-limited")
                retry_after = min(int(resp.headers.get("retry-after", "5") or 5), 15)
                time.sleep(retry_after)
                continue
            if resp.status_code >= 500:
                last_error = RuntimeError(f"{model} HTTP {resp.status_code}")
                time.sleep(2 * (attempt + 1))
                continue
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"].get("content") or ""
            if re.search(r"\{.*\}", content, re.S):
                text = content
                break
            # The model spent the whole budget on reasoning and returned no
            # reply text - retry, then fall to the next model.
            last_error = ValueError(f"no JSON object in {model} reply")
        if text:
            break
    if not text:
        raise last_error or RuntimeError("no response from model")
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("no JSON object in model reply")
    data = json.loads(match.group(0))
    body = (data.get("reply") or "").strip()
    if not body:
        raise ValueError("empty reply from model")
    return ReplyDraft(body=body, escalate=escalate, intake=data.get("intake") or {})
