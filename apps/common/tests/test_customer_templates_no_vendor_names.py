"""Standing product rule (2026-10-31): never mention the tech stack on
customer-facing screens. This test scans every customer-facing template
for vendor/tool names and fails if one leaks into visible copy.

Owner-only surfaces (platform_admin, developer docs) are exempt - the
platform owner's own dashboard may name vendors.
"""

import re
from pathlib import Path

from django.conf import settings

# Vendor / stack names that must never reach a customer-facing screen,
# email, or error message. Word-boundary matched, case-insensitive.
VENDOR_NAMES = [
    "zernio",
    "django",
    "render",
    "cloudflare",
    "supabase",
    "groq",
    "openai",
    "anthropic",
    "postgres",
    "postgresql",
    "sqlite",
    "redis",
    "tailwind",
    "gunicorn",
    "heroku",
]

# Directories whose templates are never shown to customers:
# - platform_admin: the platform owner's own dashboard (may name vendors)
# - ninja / oauth2_provider: developer-facing API docs and OAuth plumbing
EXEMPT_DIR_PARTS = {"platform_admin", "ninja", "oauth2_provider"}

VENDOR_RE = re.compile(r"\b(" + "|".join(VENDOR_NAMES) + r")\b", re.IGNORECASE)

COMMENT_RE = re.compile(r"\{#.*?#\}", re.DOTALL)
COMMENT_BLOCK_RE = re.compile(r"\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}", re.DOTALL)
TAG_RE = re.compile(r"\{%.*?%\}", re.DOTALL)
VAR_RE = re.compile(r"\{\{.*?\}\}", re.DOTALL)
# Non-rendered regions: HTML comments, CSS/JS comments, script and style
# bodies. None of these reach the customer's eye.
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
CSS_COMMENT_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b.*?</\1>", re.DOTALL | re.IGNORECASE)


def _visible_text(template_source: str) -> str:
    """Strip comments, template tags, variables, script and style bodies -
    what remains is close to the literal copy a customer would see."""
    s = COMMENT_BLOCK_RE.sub(" ", template_source)
    s = COMMENT_RE.sub(" ", s)
    s = SCRIPT_STYLE_RE.sub(" ", s)
    s = HTML_COMMENT_RE.sub(" ", s)
    s = CSS_COMMENT_RE.sub(" ", s)
    s = TAG_RE.sub(" ", s)
    s = VAR_RE.sub(" ", s)
    return s


def _template_dirs():
    dirs = [Path(settings.BASE_DIR) / "templates"]
    for app in (settings.BASE_DIR / "apps").iterdir():
        tdir = app / "templates"
        if tdir.is_dir():
            dirs.append(tdir)
    return dirs


def test_customer_templates_do_not_name_vendors():
    offenders = []
    for tdir in _template_dirs():
        for path in sorted(tdir.rglob("*.html")):
            rel = path.relative_to(settings.BASE_DIR)
            if EXEMPT_DIR_PARTS & set(rel.parts):
                continue
            visible = _visible_text(path.read_text(encoding="utf-8"))
            for match in VENDOR_RE.finditer(visible):
                offenders.append(f"{rel}: '{match.group(0)}'")
    assert not offenders, (
        "Vendor/stack names visible in customer-facing templates "
        "(standing rule: never mention the tech stack to customers):\n" + "\n".join(offenders)
    )
