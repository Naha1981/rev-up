// RevUp Pages - one-pain-per-page landing pages.
// Strategy: each ad/campaign speaks to ONE customer pain and links to a page
// built ONLY around that pain (the Aurivita multi-angle play). Mirror copies
// STRUCTURE ONLY (section types, order, rough sizes) - never competitor copy
// or images. Groq writes original SA copy for the tenant's own business.
import type { Pool } from "pg";
import { getPreset, industryLabel } from "./presets";

// ---------- types ----------
export interface PageSection { type: string; heading: string; body: string; items: string[]; }
interface SkeletonSection { type: string; words: number; }
export interface PageRow {
  id: string; workspace_id: string; title: string; slug: string; angle: string;
  industry: string; status: string; brand: any; sections: PageSection[];
  source_url: string; created_at: string; published_at: string | null;
}

// ---------- table bootstrap (idempotent, additive only) ----------
let ensured: Promise<void> | null = null;
export function ensurePageTables(db: Pool): Promise<void> {
  if (!ensured) ensured = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS cf_page(
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL,
      title text NOT NULL, slug text NOT NULL,
      angle text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft',
      brand jsonb NOT NULL DEFAULT '{}'::jsonb,
      sections jsonb NOT NULL DEFAULT '[]'::jsonb,
      source_url text NOT NULL DEFAULT '',
      views integer NOT NULL DEFAULT 0, cta_clicks integer NOT NULL DEFAULT 0,
      last_viewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      UNIQUE(workspace_id, slug))`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS cf_page_slug ON cf_page(slug)`);
    await db.query(`CREATE TABLE IF NOT EXISTS cf_page_event(
      id bigserial PRIMARY KEY, page_id uuid NOT NULL,
      kind text NOT NULL, meta text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now())`);
    await db.query(`CREATE INDEX IF NOT EXISTS cf_page_event_page ON cf_page_event(page_id, kind)`);
  })().catch((e) => { ensured = null; throw e; });
  return ensured;
}

// ---------- mirror: structure only ----------
const SECTION_PATTERNS: [RegExp, string][] = [
  [/price|pricing|cost|plan|package/i, "offer"],
  [/faq|question|ask/i, "faq"],
  [/review|testimonial|customer|client|stories|proof|patient|guest|say|feedback/i, "proof"],
  [/how it works|how we|process|step/i, "how"],
  [/feature|benefit|why|what you get|service/i, "benefits"],
  [/contact|sign up|get started|start|book|buy|order|shop/i, "cta"],
  [/problem|pain|struggle|tired|stop/i, "pains"],
];
export function mirrorStructure(src: string): SkeletonSection[] {
  let h = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gis, " ");
  const out: SkeletonSection[] = [];
  const tagRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null, last = 0, first = true;
  const wordCount = (t: string) => t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  while ((m = tagRe.exec(h))) {
    const chunk = h.slice(last, tagRe.lastIndex);
    const words = wordCount(chunk);
    const headingText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let type = "benefits";
    if (first && m[1] === "1") type = "hero";
    else {
      for (const [re, t] of SECTION_PATTERNS) if (re.test(headingText)) { type = t; break; }
    }
    out.push({ type, words: Math.min(words, 400) });
    first = false; last = tagRe.lastIndex;
    if (out.length >= 14) break;
  }
  if (!out.length || out[0].type !== "hero") out.unshift({ type: "hero", words: 80 });
  if (!out.some((s) => s.type === "cta")) out.push({ type: "cta", words: 60 });
  return out.slice(0, 14);
}

export async function fetchForMirror(url: string): Promise<string> {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) pages can be mirrored");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const resp = await fetch(u.toString(), {
      signal: ctl.signal, redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; RevUpPages/1.0)", accept: "text/html" },
    });
    if (!resp.ok) throw new Error(`That page answered ${resp.status} - try another URL`);
    const text = await resp.text();
    return text.slice(0, 1_500_000);
  } finally { clearTimeout(t); }
}

// ---------- generation (Groq, free tier) ----------
const COPY_RULES = `You write landing page copy for South African small businesses.
Rules: plain warm SA English, short sentences, no hype words (no "revolutionary", "game-changing", "unlock"), prices in rand (R) if any, mobile-first so keep headings under 9 words, body text under 60 words per section, bullets under 12 words each.
The page speaks to ONE customer pain only - every section must tie back to that pain.
NEVER invent facts: no phone numbers, no prices, no guarantees, no qualifications, no years of experience, no claims the business did not state. Only use details given in this brief. For contact, always point to the button (e.g. "tap the button below"), never write a phone number or email in the copy.
If the brief gives no testimonials, do NOT write fake quotes or claims about what customers say. In a proof section, state plainly how the product works and what the business itself commits to.`;

export async function generateSections(env: any, brief: {
  business: string; industry: string; angle: string; offer: string; area: string;
  whatsapp: string; cta_label: string;
}, skeleton: SkeletonSection[]): Promise<{ seo_title: string; sections: PageSection[] }> {
  const preset = getPreset(brief.industry);
  const skel = skeleton.map((s, i) => `${i + 1}. ${s.type}`).join(", ");
  const prompt = `${COPY_RULES}
Business: ${brief.business} (${industryLabel(brief.industry)})${brief.area ? ` in ${brief.area}` : ""}.
Customer pain this page answers: ${brief.angle}.
What the business offers: ${brief.offer || "their services"}.
Tone: ${preset.responder_tone || "warm and professional"}.
Common customer questions to weave into a faq section if present: ${(preset.responder_faqs || []).join(" | ") || "n/a"}.
Write copy for a landing page with these sections in this order: ${skel}.
Reply with JSON only:
{"seo_title":"...","sections":[{"type":"hero","heading":"...","body":"...","items":["...","..."]},...]}
Every section in the list must appear, same order, same type. items may be [] for hero/cta.`;
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastErr = "no model replied";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, temperature: 0.4, max_tokens: 3000, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) { lastErr = `groq ${resp.status}`; continue; }
        const data: any = await resp.json();
        const text: string = data?.choices?.[0]?.message?.content || "";
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) { lastErr = "no JSON in reply"; continue; }
        const parsed = JSON.parse(m[0]);
        const raw: any[] = Array.isArray(parsed.sections) ? parsed.sections : [];
        const sections: PageSection[] = raw.slice(0, 14).map((s: any) => ({
          type: String(s.type || "benefits").slice(0, 20),
          heading: String(s.heading || "").slice(0, 140),
          body: String(s.body || "").slice(0, 800),
          items: Array.isArray(s.items) ? s.items.slice(0, 8).map((x: any) => String(x).slice(0, 140)) : [],
        })).filter((s: PageSection) => s.heading || s.body);
        if (!sections.length) { lastErr = "empty sections"; continue; }
        if (!sections.some((s) => s.type === "cta")) sections.push({ type: "cta", heading: "Ready when you are", body: "Send a message now and get a straight answer.", items: [] });
        return { seo_title: String(parsed.seo_title || brief.business).slice(0, 120), sections };
      } catch (e: any) { lastErr = String(e?.message || e); }
    }
  }
  throw new Error(lastErr);
}

// ---------- public render ----------
function pesc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function renderPublicPage(page: PageRow, base: string): string {
  const brand = page.brand || {};
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || "") ? brand.color : "#F97316";
  const biz = pesc(brand.business || page.title);
  const ctaLabel = pesc(brand.cta_label || "WhatsApp us");
  const goUrl = `${base}/p/${pesc(page.slug)}/go`;
  const blocks = (page.sections || []).map((s) => {
    const items = (s.items || []).filter(Boolean);
    const list = items.length ? `<ul>${items.map((i) => `<li>${pesc(i)}</li>`).join("")}</ul>` : "";
    if (s.type === "hero") return `<section class="hero"><h1>${pesc(s.heading)}</h1><p class="lede">${pesc(s.body)}</p>${list}<p><a class="btn" href="${goUrl}">${ctaLabel}</a></p></section>`;
    if (s.type === "cta") return `<section class="cta"><h2>${pesc(s.heading)}</h2><p>${pesc(s.body)}</p><p><a class="btn" href="${goUrl}">${ctaLabel}</a></p></section>`;
    if (s.type === "faq") return `<section><h2>${pesc(s.heading)}</h2>${items.map((i) => `<details><summary>${pesc(i)}</summary></details>`).join("")}${s.body ? `<p>${pesc(s.body)}</p>` : ""}</section>`;
    if (s.type === "proof") return `<section class="proof"><h2>${pesc(s.heading)}</h2>${items.map((i) => `<blockquote>${pesc(i)}</blockquote>`).join("")}${s.body ? `<p>${pesc(s.body)}</p>` : ""}</section>`;
    return `<section><h2>${pesc(s.heading)}</h2>${s.body ? `<p>${pesc(s.body)}</p>` : ""}${list}</section>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pesc(page.title)}</title><meta name="description" content="${pesc((page.sections[0]?.body || page.title).slice(0, 155))}">
<style>
:root{--b:${color}}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1C1917;background:#FAFAF9;line-height:1.65}
.wrap{max-width:680px;margin:0 auto;padding:0 20px 96px}
header{padding:22px 20px;font-weight:700;font-size:1.05rem;max-width:680px;margin:0 auto}
.hero{padding:56px 0 32px}
.hero h1{font-size:2rem;line-height:1.2;letter-spacing:-0.02em;margin-bottom:14px}
.lede{font-size:1.1rem;color:#44403C;margin-bottom:22px}
/* CTA button adapted from Uiverse.io by Gautammsharma (https://uiverse.io/Gautammsharma/wicked-cobra-3) - MIT License, (c) 2023 Uiverse.io */
.btn{display:inline-block;background:var(--b);color:#fff;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:1.05rem;border:2px solid #1C1917;box-shadow:5px 5px 0 #1C1917;transition:all .2s ease}
.btn:hover{background:#fff;color:var(--b);border-color:var(--b);box-shadow:5px 5px 0 var(--b);text-decoration:none}
.btn:active{box-shadow:none;transform:translateY(4px)}
section{margin:34px 0}
h2{font-size:1.35rem;letter-spacing:-0.01em;margin-bottom:10px}
ul{margin:10px 0 0 0;list-style:none}
li{padding:7px 0 7px 26px;position:relative}
li:before{content:"\\2713";position:absolute;left:0;color:var(--b);font-weight:700}
blockquote{border-left:3px solid var(--b);padding:6px 14px;margin:10px 0;color:#44403C;font-style:italic}
details{border:1px solid #E7E5E4;border-radius:10px;padding:10px 14px;margin:8px 0}
summary{font-weight:600;cursor:pointer}
.cta{background:var(--b);color:#fff;border-radius:16px;padding:30px 22px;text-align:center}
.cta .btn{background:#fff;color:var(--b);border-color:#1C1917;box-shadow:5px 5px 0 #1C1917}
.cta .btn:hover{background:#1C1917;color:#fff;border-color:#1C1917;box-shadow:5px 5px 0 rgba(0,0,0,.35)}
footer{margin-top:44px;padding-top:18px;border-top:1px solid #E7E5E4;font-size:.82rem;color:#A8A29E}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #E7E5E4;padding:10px 20px;display:flex;justify-content:center}
.bar .btn{width:100%;max-width:640px;text-align:center;padding:13px}
@media(min-width:700px){.bar{display:none}}
</style></head><body>
<header>${biz}</header>
<div class="wrap">
${blocks}
<footer>${biz}${brand.area ? ` · ${pesc(brand.area)}` : ""}<br>Page by <a href="https://revup.nahalabs.co.za/signup" rel="noopener">RevUp</a> - one page per customer problem.</footer>
</div>
<div class="bar"><a class="btn" href="${goUrl}">${ctaLabel}</a></div>
</body></html>`;
}

export function ctaTarget(page: PageRow): string {
  const b = page.brand || {};
  if (b.whatsapp && /^[+0-9][0-9 ]{7,18}$/.test(b.whatsapp)) {
    const num = b.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "27");
    const msg = encodeURIComponent(`Hi ${b.business || ""}, I saw your page about ${page.angle || "your services"}.`);
    return `https://wa.me/${num}?text=${msg}`;
  }
  if (b.link && /^https?:\/\//.test(b.link)) return b.link;
  return "https://revup.nahalabs.co.za/signup";
}

// ---------- public routes ----------
export async function servePublic(db: Pool, slug: string, isGo: boolean, req: Request): Promise<Response> {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE slug=$1 AND status='published'`, [slug]);
  const page: PageRow | undefined = r.rows[0];
  if (!page) return new Response(notFoundPage(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const base = new URL(req.url).origin;
  if (isGo) {
    await db.query(`UPDATE cf_page SET cta_clicks=cta_clicks+1 WHERE id=$1`, [page.id]);
    await db.query(`INSERT INTO cf_page_event(page_id,kind,meta) VALUES($1,'cta','')`, [page.id]);
    return new Response(null, { status: 302, headers: { location: ctaTarget(page) } });
  }
  await db.query(`UPDATE cf_page SET views=views+1, last_viewed_at=now() WHERE id=$1`, [page.id]);
  await db.query(`INSERT INTO cf_page_event(page_id,kind,meta) VALUES($1,'view',$2)`, [page.id, (req.headers.get("user-agent") || "").slice(0, 120)]);
  return new Response(renderPublicPage(page, base), { headers: { "content-type": "text/html; charset=utf-8" } });
}

function notFoundPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px"><h1>This page isn't available</h1><p>The link may be old, or the page was unpublished.</p></body></html>`;
}

// ---------- slug ----------
export function makeSlug(title: string): string {
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "page";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(36).padStart(2, "0")).join("").replace(/[^a-z0-9]/g, "").slice(0, 4);
  return `${baseSlug}-${rand || "0000"}`;
}


// ---------- tenant admin UI kit (additive; adapted from Uiverse.io elements, MIT License, (c) 2023 Uiverse.io) ----------
export function pagesAdminAssets(): string {
  return `<style>
/* Search input adapted from Uiverse.io by ErzenXz (https://uiverse.io/ErzenXz/horrible-rattlesnake-14) - MIT */
.uipill{width:100%;max-width:260px;height:45px;padding:12px;border-radius:12px;border:1.5px solid #D6D3D1;outline:none;transition:all .3s cubic-bezier(.19,1,.22,1);box-shadow:0 0 20px -18px;font-size:.95rem}
.uipill:hover{border:2px solid #D6D3D1}
.uipill:focus{border:2px solid #78716C}
/* Tooltip adapted from Uiverse.io by sahilxkhadka (https://uiverse.io/sahilxkhadka/modern-snail-66) - MIT */
.uitip{position:relative;display:inline-block;cursor:help;border-bottom:1px dotted #A8A29E}
.uitip .uitip-b{visibility:hidden;opacity:0;position:absolute;bottom:130%;left:50%;transform:translateX(-50%);background:#1C1917;color:#FAFAF9;font-size:.78rem;font-weight:400;padding:6px 10px;border-radius:6px;white-space:nowrap;transition:opacity .15s;z-index:50;pointer-events:none}
.uitip .uitip-b:after{content:"";position:absolute;top:100%;left:50%;margin-left:-6px;border:6px solid transparent;border-top-color:#1C1917}
.uitip:hover .uitip-b{visibility:visible;opacity:1}
/* Toggle switch adapted from Uiverse.io by gharsh11032000 (https://uiverse.io/gharsh11032000/brave-pug-20) - MIT */
.ruiswitch{font-size:15px;position:relative;display:inline-block;width:3.5em;height:2em;vertical-align:middle}
.ruiswitch input{opacity:0;width:0;height:0}
.ruiswitch .slider{position:absolute;cursor:pointer;inset:0;border:2px solid #414141;border-radius:50px;transition:all .4s cubic-bezier(.175,.885,.32,1.275)}
.ruiswitch .slider:before{position:absolute;content:"";height:1.4em;width:1.4em;left:.2em;bottom:.14em;background-color:#fff;border-radius:inherit;transition:all .4s cubic-bezier(.23,1,.320,1)}
.ruiswitch input:checked + .slider{box-shadow:0 0 20px rgba(249,115,22,.55);border:2px solid #F97316;background:#F97316}
.ruiswitch input:checked + .slider:before{transform:translateX(1.5em)}
.ruiswitch input:disabled + .slider{opacity:.5;cursor:wait}
/* Stat card adapted from Uiverse.io by jubayer-10 (https://uiverse.io/jubayer-10/white-catfish-8) - MIT */
.uicard{width:150px;background:#fff;box-shadow:0 0 15px rgba(0,0,0,.09);border-radius:12px;padding:22px 18px;position:relative;overflow:hidden;display:inline-block;margin:4px 12px 4px 0;vertical-align:top}
.uicard .n{position:absolute;right:-16px;top:-20px;width:64px;height:64px;background:#F97316;border-radius:50%}
.uicard .n span{position:absolute;bottom:16px;left:20px;color:#fff;font-size:1.05rem;font-weight:700}
.uicard h4{margin:0 0 4px;font-size:.85rem;color:#78716C;font-weight:600}
.uicard p{margin:0;font-size:1.35rem;font-weight:700}
/* Gauge loader adapted from Uiverse.io by Nawsome (https://uiverse.io/Nawsome/ancient-yak-42) - MIT */
.uiload-overlay{position:fixed;inset:0;background:rgba(250,250,249,.92);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:100;text-align:center}
.uiload-overlay.on{display:flex}
.uiload-overlay p{font-weight:600;color:#44403C;margin-top:14px}
.uigauge{display:block;width:9.375em;height:9.375em;font-size:14px}
.uigauge .ring-rotate{animation:uirr 2s linear infinite;transform-origin:80px 80px}
.uigauge .ring-stroke{animation:uirs 2s cubic-bezier(.65,0,.35,1) infinite;transform-origin:80px 80px}
.uigauge .tick{animation:uitk 2s cubic-bezier(.32,2,.5,1) infinite}
@keyframes uirr{to{transform:rotate(360deg)}}
@keyframes uirs{0%{stroke-dashoffset:452}50%{stroke-dashoffset:113}100%{stroke-dashoffset:452}}
@keyframes uitk{0%,10%{stroke-dashoffset:12}45%{stroke-dashoffset:0}60%,100%{stroke-dashoffset:-12}}
</style>
<div class="uiload-overlay" id="uiload">
<svg class="uigauge" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
<g class="ring-rotate"><circle class="ring-stroke" cx="80" cy="80" r="72" fill="none" stroke="#F97316" stroke-width="16" stroke-dasharray="452.39 452.39" stroke-dashoffset="452" stroke-linecap="round" transform="rotate(-45,80,80)"/></g>
<g stroke-width="4" stroke-dasharray="12 12" stroke-dashoffset="12" stroke-linecap="round" transform="translate(80,80)">
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)"/>
</g></svg>
<p id="uiload-msg">Working...</p></div>
<script>
function uiloadShow(msg){var o=document.getElementById('uiload');if(msg)document.getElementById('uiload-msg').textContent=msg;o.classList.add('on')}
</script>`;
}

// ---------- tenant admin (returns body HTML; index.ts wraps in layout) ----------
export async function pagesListBody(db: Pool, mem: any, base: string, msg = ""): Promise<string> {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE workspace_id=$1 AND status!='archived' ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((p: PageRow) => `<tr class="pg-row">
<td><b>${pesc(p.title)}</b><br><span class="mut">${pesc(p.angle || p.industry)}</span></td>
<td>${p.status === "published" ? `<span class="ok">Live</span> <a href="${base}/p/${pesc(p.slug)}" target="_blank" rel="noopener">/p/${pesc(p.slug)}</a>` : `<span class="mut">${pesc(p.status)}</span>`}</td>
<td>${p.views} view${p.views === 1 ? "" : "s"} · ${p.cta_clicks} tap${p.cta_clicks === 1 ? "" : "s"}</td>
<td><a href="/pages/${p.id}">Open</a></td></tr>`).join("");
  return `${pagesAdminAssets()}${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Landing pages <a class="btn btn-primary" style="float:right" href="/pages/new">New page</a></h2>
<p class="mut">One page per customer problem. Send each advert or campaign to the page that speaks to that exact problem - it converts far better than one general page.</p>
<p><input class="uipill" id="pageFilter" placeholder="Search pages..." oninput="(function(v){document.querySelectorAll('#pageTable tr.pg-row').forEach(function(tr){tr.style.display=tr.textContent.toLowerCase().indexOf(v.toLowerCase())===-1?'none':''})})(this.value)"></p>
<table id="pageTable"><tr><th>Page</th><th>Status &amp; link</th><th><span class="uitip">Results<span class="uitip-b">Views = page opens · Taps = button taps to your WhatsApp</span></span></th><th></th></tr>${rows || '<tr><td colspan="4" class="mut">No pages yet. Create your first one.</td></tr>'}</table></div>`;
}

export function newPageBody(err = ""): string {
  return `${pagesAdminAssets()}<div class="card"><h2 style="margin-top:0">New landing page</h2>
${err ? `<p class="bad">${pesc(err)}</p>` : ""}
<form method="post" action="/pages/new" onsubmit="uiloadShow('Building your page - about 30 seconds...')">
<label>Page is for (business name)<input name="business" maxlength="200" placeholder="Your business name as customers know it"></label>
<label>Industry
<select name="industry">
<option value="general">General local service</option>
<option value="restaurant">Restaurant / cafe / takeaway</option>
<option value="dental">Dental practice</option>
<option value="funeral">Funeral services</option>
<option value="panel-beater">Panel beater / body shop</option>
<option value="auto-workshop">Auto workshop</option>
<option value="real-estate">Real estate</option>
<option value="plumber">Plumbing</option>
<option value="electrician">Electrical</option>
<option value="solar">Solar / inverters</option>
<option value="security">Security</option>
<option value="aesthetics">Aesthetics / cosmetic clinic</option>
<option value="legal">Law firm</option>
<option value="financial-broker">Financial / insurance broker</option>
<option value="towing">Towing / roadside</option>
<option value="hvac">Aircon / refrigeration</option>
<option value="roofing">Roofing / waterproofing</option>
<option value="pest-control">Pest control</option>
<option value="pool">Pool services</option>
<option value="catering">Catering / food truck</option>
<option value="trades">Trades (general)</option>
</select></label>
<label>The ONE customer pain this page answers<input name="angle" required maxlength="200" placeholder="e.g. Car dented and insurance is dragging their feet"></label>
<label>What you offer that fixes it<input name="offer" maxlength="300" placeholder="e.g. Fast approved repairs, we handle the claim, free courtesy car"></label>
<label>Area (optional)<input name="area" maxlength="120" placeholder="e.g. Sandton"></label>
<label>WhatsApp number for enquiries (optional)<input name="whatsapp" maxlength="20" placeholder="e.g. 082 555 1234"></label>
<label>Button text<input name="cta_label" maxlength="40" placeholder="WhatsApp us" value="WhatsApp us"></label>
<label>Brand colour<input name="color" type="color" value="#F97316" style="width:60px;height:34px;padding:2px"></label>
<label>Like a page's layout? Paste its URL - we copy the structure only, never its words or pictures<input name="mirror_url" maxlength="500" placeholder="https://..."></label>
<button>Build my page</button>
<p class="mut">Takes about 30 seconds. You review everything before it goes live.</p></form></div>`;
}

export async function pageDetailBody(db: Pool, page: PageRow, base: string, msg = ""): Promise<string> {
  const brand = page.brand || {};
  const sectionForms = (page.sections || []).map((s, i) => `
<div class="card"><h3 style="margin-top:0">${pesc(s.type)}</h3>
<label>Heading<input name="h_${i}" value="${pesc(s.heading)}" maxlength="140"></label>
<label>Text<textarea name="b_${i}" rows="3" maxlength="800">${pesc(s.body)}</textarea></label>
<label>Bullets (one per line)<textarea name="i_${i}" rows="3">${pesc((s.items || []).join("\n"))}</textarea></label>
</div>`).join("");
  const published = page.status === "published";
  return `${pagesAdminAssets()}${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">${pesc(page.title)}</h2>
<p class="mut">Pain: ${pesc(page.angle)} · Status: ${pesc(page.status)}${published ? ` · Live at <a href="${base}/p/${pesc(page.slug)}" target="_blank" rel="noopener">${base}/p/${pesc(page.slug)}</a>` : ""}${page.source_url ? ` · Structure mirrored from ${pesc(page.source_url)}` : ""}</p>
<div>
<span class="uicard"><span class="n"><span>&#128065;</span></span><h4><span class="uitip">Views<span class="uitip-b">How many times the public page was opened</span></span></h4><p>${page.views}</p></span>
<span class="uicard"><span class="n"><span>&#10148;</span></span><h4><span class="uitip">Taps<span class="uitip-b">Button taps through to your WhatsApp</span></span></h4><p>${page.cta_clicks}</p></span>
</div>
<p><label class="ruiswitch"><input type="checkbox" id="pubToggle"${published ? " checked" : ""}><span class="slider"></span></label> <b id="pubLabel">${published ? "Live" : "Offline"}</b> <span class="mut">- flip to ${published ? "unpublish" : "publish"}</span></p>
<noscript><form method="post" action="/pages/${page.id}/${published ? "unpublish" : "publish"}" style="display:inline"><button>${published ? "Unpublish" : "Publish"}</button></form></noscript>
<form method="post" action="/pages/${page.id}/delete" style="display:inline" onsubmit="return confirm('Delete this page?')"><button class="link" style="color:#B91C1C">Delete</button></form>
</div>
<script>
(function(){var t=document.getElementById('pubToggle');if(!t)return;t.onchange=async function(){t.disabled=true;uiloadShow(t.checked?'Publishing...':'Unpublishing...');try{var r=await fetch('/pages/${page.id}/'+(t.checked?'publish':'unpublish'),{method:'POST'});if(!r.ok)throw 0;location.reload()}catch(e){document.getElementById('uiload').classList.remove('on');t.checked=!t.checked;t.disabled=false;alert('Could not change status - please try again.')}}})();
</script>
<form method="post" action="/pages/${page.id}" onsubmit="uiloadShow('Saving changes...')">
${sectionForms}
<div class="card"><h3 style="margin-top:0">Settings</h3>
<label>Button text<input name="cta_label" value="${pesc(brand.cta_label || "WhatsApp us")}" maxlength="40"></label>
<label>WhatsApp number<input name="whatsapp" value="${pesc(brand.whatsapp || "")}" maxlength="20"></label>
<label>Or link the button to a website instead<input name="link" value="${pesc(brand.link || "")}" maxlength="500" placeholder="https://..."></label>
<label>Brand colour<input name="color" type="color" value="${pesc(brand.color || "#F97316")}" style="width:60px;height:34px;padding:2px"></label>
</div>
<button>Save changes</button></form>
<p class="mut"><a href="/pages">&#8592; All pages</a></p>`;
}
