// RevUp on Cloudflare Workers — revenue path. Shares the live Neon DB with the
// Django app; passwords verify in Postgres (pgcrypto) to stay inside Workers
// Free CPU limits. No vendor names surface in any HTML.
import { Client, Pool } from "pg";
import { LOGO_B64, landingPage } from "./landing";
import { INDUSTRIES, getPreset, industryLabel } from "./presets";

interface Env {
  DATABASE_URL: string;
  PF_MERCHANT_ID: string;
  PF_MERCHANT_KEY: string;
  PF_PASSPHRASE: string;
  GROQ_API_KEY: string;
}

// ---------- db ----------
function pool(env: Env) {
  // Workers close sockets when a request ends, so pooling is per-request (a shared
  // pool hands out dead clients). idleTimeoutMillis 0 disables the reaper: a 1s
  // reaper raced mid-request checkout and hung the reconnect. end() must not
  // throw in finally or it masks the friendly 500 page with a worker exception.
  return new Pool({ connectionString: env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 0 });
}

// ---------- crypto ----------
async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// md5 via spark-md5 — PayFast signatures only; WebCrypto has no md5.
import SparkMD5 from "spark-md5";
export function md5(input: string): string { return SparkMD5.hash(input); }

// ---------- html ----------
function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
function navLinks(user: any): string {
  const g: string[] = Array.isArray(user._goals) ? user._goals : [];
  const show = (...need: string[]) => !g.length || need.some((n) => g.includes(n));
  let h = `<a href="/">Dashboard</a>`;
  if (show("social")) h += `<a href="/analytics">Analytics</a>`;
  if (show("reviews")) h += `<a href="/radar">Radar</a>`;
  if (show("social")) h += `<a href="/posts">Posts</a>`;
  h += `<a href="/onboarding">Onboarding</a>`;
  if (show("reviews")) h += `<a href="/reviews">Reviews</a>`;
  if (show("leads", "receptionist")) h += `<a href="/inbox">Inbox</a>`;
  if (show("leads")) h += `<a href="/frontdesk">Leads</a>`;
  if (show("reviews", "leads", "receptionist")) h += `<a href="/approvals">Approvals</a>`;
  h += `<a href="/billing">Billing</a>`;
  return h;
}

function layout(title: string, body: string, user?: any): string {
  const nav = user
    ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links">${navLinks(user)}${user._cur_ws ? `<a href="/switch" title="Switch business" style="border:1px solid var(--line);border-radius:8px;padding:2px 8px">${esc(user._cur_ws)}${(user._ws_count||0) > 1 ? " &#9662;" : ""}</a>` : ""}<form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>`
    : `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a class="btn btn-ghost" href="/login">Log in</a><a class="btn btn-primary" href="/signup">Get started</a></div></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · RevUp</title><style>
:root{--brand:#F97316;--brand-dark:#EA580C;--brand-soft:#FFF7ED;--ink:#1C1917;--ink2:#57534E;--ink3:#A8A29E;--line:#E7E5E4;--bg:#FAFAF9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:var(--brand-dark);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--line);margin-bottom:32px;flex-wrap:wrap;gap:10px}
.logo img{height:30px;width:auto}
.nav-links{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.nav-links a{color:var(--ink2);font-size:14.5px;font-weight:500}
.nav-links a:hover{color:var(--ink);text-decoration:none}
.btn{display:inline-block;padding:11px 22px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:background .15s;border:0;cursor:pointer}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-dark);text-decoration:none}
.btn-ghost{color:var(--ink);border:1px solid var(--line);background:#fff}
h1{font-size:24px;margin:0 0 6px;letter-spacing:-0.3px}h2{font-size:16px;margin:26px 0 10px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px;margin:12px 0}
input,select,textarea{width:100%;box-sizing:border-box;padding:11px 14px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);margin:4px 0 14px;font-size:14.5px;font-family:inherit}
input:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}
button,.btn-form{background:var(--brand);color:#fff;border:0;border-radius:999px;padding:11px 22px;font-weight:600;cursor:pointer;font-size:14.5px}
button:hover{background:var(--brand-dark)}
button.link{background:none;color:var(--ink2);padding:0;font-weight:500;font-size:14.5px}
button.link:hover{color:var(--ink)}
.mut{color:var(--ink3);font-size:13.5px}.ok{color:#16A34A}.bad{color:#DC2626}.warn{color:#B45309}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3)}
.pill{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12.5px;background:var(--brand-soft);color:var(--brand-dark);font-weight:600}
.pill.warn{background:#FEF3C7;color:#B45309}.pill.ok{background:#DCFCE7;color:#15803D}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
form.inline{display:inline}
.stat{font-size:30px;font-weight:700;letter-spacing:-0.5px;margin:2px 0}
label{font-size:13.5px;font-weight:600;color:var(--ink2)}
</style></head><body><div class="wrap">${nav}<h1>${esc(title)}</h1>${body}</div></body></html>`;
}
function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
function json(o: any, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
function redirect(to: string): Response {
  return new Response(null, { status: 303, headers: { location: to } });
}

// ---------- auth ----------
async function getUser(req: Request, db: Pool): Promise<any | null> {
  const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const th = await sha256hex(m[1]);
  const r = await db.query(
    `UPDATE cf_sessions SET last_seen_at=now() WHERE token_hash=$1 AND expires_at>now()
     RETURNING user_id`, [th]);
  if (!r.rows[0]) return null;
  const u = await db.query(`SELECT id,email,name,is_superuser FROM accounts_user WHERE id=$1 AND is_active`, [r.rows[0].user_id]);
  return u.rows[0] || null;
}
async function newSession(db: Pool, userId: string, req: Request): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const th = await sha256hex(token);
  await db.query(`INSERT INTO cf_sessions(token_hash,user_id,device_info,expires_at) VALUES($1,$2,$3,now()+interval '14 days')`,
    [th, userId, (req.headers.get("user-agent") || "").slice(0, 200)]);
  return token;
}
function sessionCookie(token: string): string {
  return `cf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${14 * 86400}`;
}
// Django BCryptSHA256: bcrypt(base64(sha256(pw))). pgcrypto crypt() only accepts
// $2a$ salts, so swap the $2b$ prefix — identical output for ASCII inputs.
const VERIFY_SQL = `SELECT crypt(encode(digest($1,'sha256'),'hex'), '$2a$' || substring($2 from 5)) = '$2a$' || substring($2 from 5) AS ok`;
const MAKE_HASH_SQL = `SELECT 'bcrypt_sha256$' || '$2b$' || substring(crypt(encode(digest($1,'sha256'),'hex'), gen_salt('bf',12)) from 5) AS hash`;

async function membership(db: Pool, userId: string, req?: Request): Promise<any | null> {
  const r = await db.query(
    `SELECT w.id AS workspace_id, w.name AS workspace_name, w.approval_workflow_mode,
            o.id AS org_id, o.name AS org_name, o.plan, o.subscription_status, o.payment_reference,
            o.trial_started_at, o.activated_at, o.goals, m.workspace_role
     FROM members_workspace_membership m
     JOIN workspaces_workspace w ON w.id=m.workspace_id
     JOIN organizations_organization o ON o.id=w.organization_id
     WHERE m.user_id=$1 AND w.is_archived=false AND o.deleted_at IS NULL
     ORDER BY m.added_at`, [userId]);
  if (!r.rows.length) return null;
  const want = req ? (/(?:^|;\s*)cf_ws=([0-9a-f-]{36})/.exec(req.headers.get("cookie") || "") || [])[1] : null;
  const cur = (want && r.rows.find((x: any) => x.workspace_id === want)) || r.rows[0];
  cur.workspaces = r.rows.map((x: any) => ({ id: x.workspace_id, name: x.workspace_name, org: x.org_name, plan: x.plan, status: x.subscription_status }));
  return cur;
}

// ---------- forms ----------
async function formData(req: Request): Promise<Record<string, string>> {
  const fd = await req.formData();
  const o: Record<string, string> = {};
  fd.forEach((v, k) => { o[k] = String(v); });
  return o;
}

// ---------- payfast ----------
function pfUrl(env: Env, base: string, plan: string, org: any): string {
  const prices: Record<string, number> = { starter: 499, growth: 999, "business-pro": 1999 };
  const amount = prices[plan];
  const params: [string, string][] = [
    ["merchant_id", env.PF_MERCHANT_ID],
    ["merchant_key", env.PF_MERCHANT_KEY],
    ["return_url", `${base}/billing?pf=return`],
    ["cancel_url", `${base}/billing?pf=cancel`],
    ["notify_url", `${base}/billing/payfast-itn`],
    ["m_payment_id", `${org.payment_reference || "RU"}-${plan}`],
    ["amount", amount.toFixed(2)],
    ["item_name", `RevUp ${plan} monthly`],
    ["subscription_type", "1"],
    ["recurring_amount", amount.toFixed(2)],
    ["frequency", "3"],
    ["cycles", "0"],
  ].filter(([, v]) => v !== "") as [string, string][];
  const enc = (v: string) => encodeURIComponent(v.trim()).replace(/%20/g, "+");
  const baseStr = params.map(([k, v]) => `${k}=${enc(v)}`).join("&");
  const sig = md5(baseStr + `&passphrase=${enc(env.PF_PASSPHRASE)}`);
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`).join("&");
  return `https://sandbox.payfast.co.za/eng/process?${qs}&signature=${sig}`;
}

// ---------- payfast ITN ----------
function pfQuotePlus(v: string): string {
  return encodeURIComponent(v).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function handlePayfastItn(db: Pool, env: Env, req: Request): Promise<Response> {
  // Django-faithful triple verification: signature (posted order, quote_plus,
  // passphrase last), PayFast validate-back, then status COMPLETE.
  const raw = await req.text();
  const pairs = raw.split("&").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)] as [string, string];
  });
  const dec = (v: string) => decodeURIComponent(v.replace(/\+/g, " "));
  const post: Record<string, string> = {};
  for (const [k, v] of pairs) post[k] = dec(v);
  const received = post["signature"] || "";
  const baseStr = pairs.filter(([k]) => k !== "signature").map(([k, v]) => `${k}=${pfQuotePlus(dec(v).trim())}`).join("&");
  const ours = md5(baseStr + `&passphrase=${pfQuotePlus(env.PF_PASSPHRASE)}`);
  if (!received || received !== ours) return new Response("bad signature", { status: 400 });
  const check = await fetch("https://sandbox.payfast.co.za/eng/query/validate", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: raw,
  });
  if ((await check.text()).trim() !== "VALID") return new Response("payfast validate-back rejected", { status: 400 });
  if (post["payment_status"] !== "COMPLETE") return new Response(`status ${post["payment_status"] || "?"}`, { status: 400 });
  const mpid = post["m_payment_id"] || "";
  const parts = mpid.split("-");
  const reference = mpid.startsWith("RU-") ? "RU-" + (parts[1] || "") : "";
  const plan = parts.slice(2).join("-");
  if (!reference || !["starter", "growth", "business-pro"].includes(plan)) return new Response("unknown reference", { status: 400 });
  const r = await db.query(
    `UPDATE organizations_organization SET plan=$1, subscription_status='active', payfast_token=$2, updated_at=now() WHERE payment_reference=$3`,
    [plan, post["token"] || "", reference]);
  if (!r.rowCount) return new Response("unknown reference", { status: 400 });
  return new Response("OK");
}

// ---------- AI drafting (Groq free tier, Django-faithful contract) ----------
const DRAFT_RULES = "Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. No 'AI' buzzwords. Plain, warm, specific language. South African English. Keep the caption under 900 characters including hashtags.";

async function draftCaption(env: Env, business: string, topic: string): Promise<{ caption: string; hashtags: string[] }> {
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const prompt = `Business: ${business}.\nWrite one social media post for this business about: ${topic}.\n${DRAFT_RULES}\nReply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
  let lastErr = "no model replied";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1500, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) { lastErr = `groq ${resp.status}`; continue; }
        const data: any = await resp.json();
        const text: string = data?.choices?.[0]?.message?.content || "";
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) { lastErr = "no JSON in reply"; continue; }
        const parsed = JSON.parse(m[0]);
        const caption = String(parsed.caption || "").trim();
        const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: any) => String(h)) : [];
        if (caption) return { caption, hashtags };
        lastErr = "empty caption";
      } catch (e: any) { lastErr = String(e?.message || e); }
    }
  }
  throw new Error(lastErr);
}

async function groqFollowup(env: Env, business: string, lead: any): Promise<string> {
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const prompt = `Business: ${business} (South Africa).
A website visitor sent an enquiry.
Name: ${lead.name}
Contact: ${lead.contact}
Enquiry: ${lead.message}
Write one short follow-up message the business can send back (max 120 words, warm and professional, plain text, no subject line, prices in ZAR if mentioned). Reply with the message text only.`;
  let lastErr = "no model replied";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, temperature: 0.3, max_tokens: 500, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) { lastErr = `groq ${resp.status}`; continue; }
        const data: any = await resp.json();
        const text: string = (data?.choices?.[0]?.message?.content || "").trim();
        if (text) return text;
        lastErr = "empty reply";
      } catch (e: any) { lastErr = String(e?.message || e); }
    }
  }
  throw new Error(lastErr);
}

const enquiryForm = (biz: string, err = "") => layout(`Enquire - ${biz}`, `
<div class="card"><h2>Send ${esc(biz)} an enquiry</h2>
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<form method="post">
<label>Your name<input name="name" required maxlength="200"></label>
<label>WhatsApp number or email<input name="contact" required maxlength="200"></label>
<label>How can they help?<textarea name="message" rows="4" required maxlength="2000"></textarea></label>
<button>Send enquiry</button></form></div>`);

// ---------- pages ----------
const signupPage = (err = "") => layout("Create your RevUp account", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/signup">
<label>Your name<input name="name" required maxlength="150"></label>
<label>Email<input name="email" type="email" required maxlength="254"></label>
<label>Password<input name="password" type="password" required minlength="8"></label>
<label>Business name<input name="business" required maxlength="200"></label>
<button>Create account</button>
<p class="mut">Free trial. Choose the plan that fits you during setup - pay only when your trial ends.</p>
</form></div>`);

const loginPage = (err = "") => layout("Log in to RevUp", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/login">
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Log in</button>
</form></div>`);

async function dashboardPage(db: Pool, user: any, mem: any): Promise<string> {
  const [pending, links, clicks, posts] = await Promise.all([
    db.query(`SELECT count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 AND pp.status='pending_review'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM composer_post WHERE workspace_id=$1`, [mem.workspace_id]),
  ]);
  return layout("Dashboard", `
<p class="mut">${esc(mem.org_name)} · ${esc(mem.workspace_name)} · <span class="pill">${esc(mem.plan)}</span> <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(mem.subscription_status)}</span></p>
<div class="grid">
<div class="card"><h2>Posts</h2><p class="stat">${posts.rows[0].c}</p><p class="mut">total in this workspace</p></div>
<div class="card"><h2>Awaiting approval</h2><p class="stat">${pending.rows[0].c}</p><p class="mut"><a href="/approvals">review now →</a></p></div>
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked · <a href="/reviews">manage →</a></p></div>
<div class="card"><h2>Subscription</h2><p class="stat">${esc(mem.plan)}</p><p class="mut"><a href="/billing">billing →</a></p></div>
</div>`, user);
}

const GOALS: [string, string][] = [
  ["receptionist", "Answer my business WhatsApp day and night"],
  ["reviews", "Turn happy customers into 5-star Google reviews"],
  ["social", "Keep my Facebook and Instagram posting"],
  ["leads", "Capture website enquiries and follow them up (FrontDesk)"],
];
const PLAN_CARDS: { slug: string; name: string; price: number; feat: string }[] = [
  { slug: "starter", name: "Starter", price: 499, feat: "WhatsApp receptionist + Google review booster" },
  { slug: "growth", name: "Growth", price: 999, feat: "Everything in Starter + social posting with approvals" },
  { slug: "business-pro", name: "Business Pro", price: 1999, feat: "Everything in Growth + FrontDesk lead pipeline and follow-ups" },
];
function recommendPlan(goals: string[]): string {
  if (goals.includes("leads")) return "business-pro";
  if (goals.includes("social")) return "growth";
  return "starter";
}

async function onboardingPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const w = await db.query(`SELECT industry, website_url, timezone FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ws = w.rows[0] || {};
  const savedGoals: string[] = Array.isArray(b.custom_rules?.goals) ? b.custom_rules.goals : [];
  const rec = recommendPlan(savedGoals);
  const cur = mem.plan || rec;
  return layout("Onboarding", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/onboarding">
<h2 style="margin-top:0">Your business</h2>
<label>Business name<input name="business_name" value="${esc(b.business_name || mem.org_name)}" required></label>
<label>Industry<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}"${(ws.industry || b.industry || "general") === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
<label>Website<input name="website_url" value="${esc(ws.website_url || "")}" placeholder="https://…"></label>
<label>Google review link<input name="google_review_url" value="${esc(b.google_review_url || "")}" placeholder="https://g.page/r/…"></label>
<label>Timezone<input name="timezone" value="${esc(ws.timezone || "Africa/Johannesburg")}"></label>
<h2>What do you want RevUp to do for you?</h2>
${GOALS.map(([v, l]) => `<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="goal_${v}"${savedGoals.includes(v) ? " checked" : ""} style="width:auto"> ${l}</label>`).join("")}
<h2>Choose your plan</h2>
${PLAN_CARDS.map((p) => `<label style="display:block;border:1px solid ${cur === p.slug ? "var(--brand)" : "var(--line)"};border-radius:12px;padding:12px 14px;margin:8px 0;cursor:pointer;font-weight:400">
<input type="radio" name="plan" value="${p.slug}"${cur === p.slug ? " checked" : ""} style="width:auto"> <b>${p.name} - R${p.price.toLocaleString("en-ZA")}/month</b>${rec === p.slug ? ` <span class="pill ok">Recommended for you</span>` : ""}<br>
<span class="mut">${p.feat}</span></label>`).join("")}
<p class="mut">Your trial starts now - no payment today. You can change plans any time on the billing page.</p>
<button>Save and continue</button>
</form></div>`, user);
}

async function reviewsPage(db: Pool, user: any, mem: any, base: string, msg = ""): Promise<string> {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const links = await db.query(
    `SELECT l.*, c.name AS contact_name FROM receptionist_reviewlink l
     JOIN receptionist_contact c ON c.id=l.contact_id
     WHERE l.workspace_id=$1 ORDER BY l.created_at DESC LIMIT 50`, [mem.workspace_id]);
  const rows = links.rows.map((l: any) => `<tr>
<td>${esc(l.contact_name)}</td>
<td><a href="${base}/r/${esc(l.short_code)}" target="_blank">/r/${esc(l.short_code)}</a></td>
<td>${l.clicked_at ? `<span class="ok">clicked ${new Date(l.clicked_at).toLocaleString("en-ZA")}</span>` : `<span class="mut">not yet</span>`}</td>
<td class="mut">${new Date(l.created_at).toLocaleDateString("en-ZA")}</td></tr>`).join("");
  return layout("Reviews", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
${b.google_review_url ? `<p>Google review destination: <a href="${esc(b.google_review_url)}">${esc(b.google_review_url)}</a></p>` : `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">First: where should reviews go?</h2><p class="mut">Paste your Google review link (from Google Business Profile → "Ask for reviews"). Every tracked link you create sends customers here.</p><form method="post" action="/reviews/destination"><input name="google_review_url" placeholder="https://g.page/r/…" required><button>Save and continue</button></form></div>`}
${b.google_review_url ? `<h2>New review link</h2>
<div class="card"><form method="post" action="/reviews/links">
<label>Customer name<input name="name" required maxlength="200"></label>
<label>Customer WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27…"></label>
<button>Create tracked link</button>
<p class="mut">Send the /r/… link to the customer. It redirects to your Google review page and records the click.</p>
</form></div>` : ""}
<h2>Links</h2>
<div class="card">${links.rows.length ? `<table><tr><th>Customer</th><th>Link</th><th>Click</th><th>Created</th></tr>${rows}</table>` : `<p class="mut">No review links yet.</p>`}</div>`, user);
}


function newPostPage(user: any, mem: any, pre: Record<string, string>, msg = ""): string {
  return layout("New post", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/posts/draft">
<label>Topic<input name="topic" maxlength="200" value="${esc(pre.topic || "")}" placeholder="e.g. teeth whitening special this month" required></label>
<button class="btn-secondary">Draft with AI</button>
</form></div>
<div class="card"><form method="post" action="/posts/new">
<label>Title<input name="title" maxlength="200" value="${esc(pre.title || "")}" placeholder="Internal title"></label>
<label>Caption<textarea name="caption" rows="6" placeholder="What should go out?">${esc(pre.caption || "")}</textarea></label>
<button>Save draft</button>
<p class="mut">Creates a draft for every connected channel. Scheduling and publishing run on the current pipeline.</p>
</form></div>`, user);
}

async function inboxPage(db: Pool, user: any, mem: any): Promise<string> {
  const r = await db.query(
    `SELECT c.id, c.name, c.wa_id, count(m.id) AS msgs, max(m.created_at) AS last_at,
            (SELECT body FROM receptionist_message m2 WHERE m2.contact_id=c.id ORDER BY m2.created_at DESC LIMIT 1) AS last_body
     FROM receptionist_contact c JOIN receptionist_message m ON m.contact_id=c.id
     WHERE c.workspace_id=$1 GROUP BY c.id ORDER BY last_at DESC NULLS LAST LIMIT 50`, [mem.workspace_id]);
  const rows = r.rows.map((c: any) => `<tr>
<td><a href="/inbox/${c.id}">${esc(c.name || c.wa_id)}</a></td>
<td class="mut">${esc((c.last_body || "").slice(0, 80))}</td>
<td class="mut">${c.last_at ? new Date(c.last_at).toLocaleString("en-ZA") : ""}</td></tr>`).join("");
  return layout("Inbox", `
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Latest</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No customer conversations yet. When customers WhatsApp the business, they appear here.</p>`}</div>`, user);
}

async function conversationPage(db: Pool, user: any, mem: any, contactId: string, env: Env): Promise<Response> {
  // Dedicated client: the shared per-request pool intermittently hangs on
  // this route's checkout in the Workers runtime (socket closed mid-request).
  const dc = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  await dc.connect();
  let c, msgs;
  try {
    c = await dc.query(`SELECT * FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, mem.workspace_id]);
    if (!c.rows[0]) { await dc.end().catch(() => {}); return html(layout("Not found", `<p class="bad">Unknown conversation.</p>`), 404); }
    msgs = await dc.query(
      `SELECT direction, sender_type, body, created_at FROM receptionist_message WHERE contact_id=$1 AND workspace_id=$2 ORDER BY created_at ASC LIMIT 200`, [contactId, mem.workspace_id]);
  } finally { await dc.end().catch(() => {}); }
  const who: Record<string, string> = { user: "Customer", ai: "Receptionist", human_agent: "You" };
  const bubbles = msgs.rows.map((m: any) => {
    const out = m.direction === "outbound";
    return `<div style="display:flex;justify-content:${out ? "flex-end" : "flex-start"};margin:6px 0">
<div style="max-width:70%;padding:8px 12px;border-radius:12px;${out ? "background:var(--brand);color:#fff" : "background:#fff;border:1px solid var(--line)"}">
<div class="mut" style="font-size:11px;${out ? "color:#ffe7d6" : ""}">${esc(who[m.sender_type] || m.sender_type)} · ${new Date(m.created_at).toLocaleString("en-ZA")}</div>
<div>${esc(m.body)}</div></div></div>`;
  }).join("");
  return html(layout(`Chat: ${esc(c.rows[0].name || c.rows[0].wa_id)}`, `
<p><a href="/inbox">&larr; all conversations</a></p>
<div class="card">${bubbles || `<p class="mut">No messages.</p>`}</div>`, user));
}

async function radarPage(db: Pool, user: any, mem: any, msg: string): Promise<string> {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ind = w.rows[0]?.industry || "general";
  const p = getPreset(ind);
  const feed = await db.query(
    `SELECT title, link, source, summary, score, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 20`, [mem.workspace_id]);
  const items = feed.rows.map((r: any) => `<tr>
<td><a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a><br><span class="mut">${esc((r.summary || "").slice(0, 120))}</span></td>
<td class="mut">${esc(r.source || "")}</td>
<td class="mut">${r.published_at ? new Date(r.published_at).toLocaleDateString("en-ZA") : ""}</td></tr>`).join("");
  return layout("Radar", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2>Your industry</h2>
<form method="post"><label>Industry<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}"${ind === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
<button>Save</button></form>
<p class="mut">Tunes your demand radar, reply tone and post ideas.</p></div>
<div class="card"><h2>Post ideas for ${esc(industryLabel(ind))}</h2>
<ul>${(p.post_themes || []).map((t: string) => `<li>${esc(t)}</li>`).join("")}</ul>
${(p.hashtags || []).length ? `<p class="mut">Default hashtags: ${esc(p.hashtags.join(" "))}</p>` : ""}
<p class="mut">Reply tone: ${esc(p.responder_tone || "warm and professional")}</p></div>
<div class="card"><h2>Demand signals</h2>
${feed.rows.length ? `<table><tr><th>Signal</th><th>Source</th><th>When</th></tr>${items}</table>` : `<p class="mut">No signals yet for this business. The radar collects South African news and demand signals for your industry; they appear here as they arrive.</p>`}</div>`, user);
}

async function analyticsPage(db: Pool, user: any, mem: any): Promise<string> {
  const [byStatus, links, clicks, contacts, msgsIn, msgsOut, clicksByDay] = await Promise.all([
    db.query(`SELECT pp.status, count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 GROUP BY pp.status ORDER BY c DESC`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='inbound'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound'`, [mem.workspace_id]),
    db.query(`SELECT date_trunc('day', clicked_at) d, count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 14`, [mem.workspace_id]),
  ]);
  const statusRows = byStatus.rows.map((r: any) => `<tr><td>${esc(r.status)}</td><td>${r.c}</td></tr>`).join("");
  const clickRows = clicksByDay.rows.map((r: any) => `<tr><td>${new Date(r.d).toLocaleDateString("en-ZA")}</td><td>${r.c}</td></tr>`).join("");
  return layout("Analytics", `
<div class="grid">
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked</p></div>
<div class="card"><h2>Customers</h2><p class="stat">${contacts.rows[0].c}</p><p class="mut">in inbox</p></div>
<div class="card"><h2>WhatsApp messages</h2><p class="stat">${msgsIn.rows[0].c} in · ${msgsOut.rows[0].c} out</p></div>
</div>
<div class="card"><h2>Posts by status</h2>${byStatus.rows.length ? `<table><tr><th>Status</th><th>Count</th></tr>${statusRows}</table>` : `<p class="mut">No posts yet.</p>`}</div>
<div class="card"><h2>Review-link clicks by day</h2>${clicksByDay.rows.length ? `<table><tr><th>Day</th><th>Clicks</th></tr>${clickRows}</table>` : `<p class="mut">No clicks yet.</p>`}</div>`, user);
}

async function postsPage(db: Pool, user: any, mem: any): Promise<string> {
  const r = await db.query(
    `SELECT p.id, p.title, p.caption, p.scheduled_at, p.published_at, p.created_at,
            string_agg(DISTINCT pp.status, ', ') AS statuses,
            string_agg(DISTINCT COALESCE(sa.platform, pp.provider), ', ') AS channels
     FROM composer_post p
     LEFT JOIN composer_platform_post pp ON pp.post_id=p.id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((x: any) => {
    const sts = (x.statuses || "").split(", ").filter(Boolean);
    const allDraft = sts.length > 0 && sts.every((st: string) => st === "draft");
    return `<tr>
<td><b>${esc(x.title || "(untitled)")}</b><br><span class="mut">${esc((x.caption || "").slice(0, 120))}</span></td>
<td>${sts.map((st: string) => `<span class="pill ${st === "approved" || st === "published" ? "ok" : ""}">${esc(st)}</span> `).join("")}</td>
<td class="mut">${esc(x.channels || "-")}</td>
<td class="mut">${x.scheduled_at ? new Date(x.scheduled_at).toLocaleString("en-ZA") : new Date(x.created_at).toLocaleDateString("en-ZA")}</td>
<td>${allDraft ? `<form class="inline" method="post" action="/posts/${x.id}/submit"><button>Submit for review</button></form>` : ""}</td></tr>`;
  }).join("");
  return layout("Posts", `
<p><a class="btn btn-primary" href="/posts/new">New post</a></p>
<div class="card">${r.rows.length ? `<table><tr><th>Post</th><th>Status</th><th>Channels</th><th>When</th><th></th></tr>${rows}</table>` : `<p class="mut">No posts yet.</p>`}</div>`, user);
}

const STATUS_LABELS: Record<string, string> = { approved: "approved", rejected: "rejected", changes_requested: "changes requested" };

async function approvalsPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const r = await db.query(
    `SELECT pp.id AS pp_id, pp.status, pp.provider, sa.platform, sa.account_name,
            p.id AS post_id, p.title, p.caption, p.scheduled_at, u.name AS author
     FROM composer_platform_post pp
     JOIN composer_post p ON p.id=pp.post_id
     LEFT JOIN accounts_user u ON u.id=p.author_id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1 AND pp.status='pending_review'
     ORDER BY p.created_at LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((x: any) => `<tr>
<td><b>${esc(x.title || "(untitled)")}</b><br><span class="mut">${esc((x.caption || "").slice(0, 140))}</span></td>
<td>${esc(x.platform || x.provider || "")}<br><span class="mut">${esc(x.account_name || "")}</span></td>
<td class="mut">${esc(x.author || "")}</td>
<td>${x.scheduled_at ? new Date(x.scheduled_at).toLocaleString("en-ZA") : '<span class="mut">unscheduled</span>'}</td>
<td><form class="inline" method="post" action="/approvals/${x.pp_id}/approve"><button>Approve</button></form>
<form class="inline" method="post" action="/approvals/${x.pp_id}/reject" onsubmit="return confirm('Reject this post?')"><button style="background:#f87171">Reject</button></form></td></tr>`).join("");
  return layout("Approvals", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card">${r.rows.length ? `<table><tr><th>Post</th><th>Channel</th><th>Author</th><th>Scheduled</th><th></th></tr>${rows}</table>` : `<p class="ok">Nothing waiting for review.</p>`}</div>`, user);
}

async function billingPage(db: Pool, user: any, mem: any, base: string, env: Env): Promise<string> {
  const plans = [
    { slug: "starter", name: "Starter", price: 499, feat: "1 workspace · core publishing" },
    { slug: "growth", name: "Growth", price: 999, feat: "3 workspaces · approvals · reviews" },
    { slug: "business-pro", name: "Business Pro", price: 1999, feat: "everything in Growth · FrontDesk lead pipeline + follow-ups · 3 channels" },
  ];
  const cards = plans.map((p) => `<div class="card"><h2>${p.name}</h2>
<p style="font-size:26px;margin:0">R${p.price.toLocaleString("en-ZA")}<span class="mut">/month</span></p>
<p class="mut">${p.feat}</p>
${p.slug === mem.plan
  ? `<p class="pill">current plan</p>`
  : `<a class="btn" href="${pfUrl(env, base, p.slug, mem)}">Subscribe with PayFast</a>`}
</div>`).join("");
  return layout("Billing", `
<p>Plan <b>${esc(mem.plan)}</b> · status <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(mem.subscription_status)}</span>
${mem.payment_reference ? ` · ref <span class="mut">${esc(mem.payment_reference)}</span>` : ""}</p>
${mem.trial_started_at ? `<p class="mut">Trial started ${new Date(mem.trial_started_at).toLocaleDateString("en-ZA")}${mem.activated_at ? ` · activated ${new Date(mem.activated_at).toLocaleDateString("en-ZA")}` : ""}</p>` : ""}
<div class="grid">${cards}</div>
<p class="mut">Payments are processed by PayFast in rand. You can cancel any time.</p>`, user);
}

// ---------- router ----------
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const base = url.origin;
    const path = url.pathname;

    if (path === "/health") {
      try {
        const db = pool(env);
        const r = await db.query("SELECT 1 AS ok");
        await db.end().catch(() => {});
        return json({ ok: true, db: r.rows[0].ok === 1, ts: new Date().toISOString() });
      } catch (e: any) {
        return json({ ok: false, error: String(e) }, 500);
      }
    }

    // Public tracked review redirect
    const rm = /^\/r\/([A-Za-z0-9_-]{6,12})$/.exec(path);
    if (rm) {
      const db = pool(env);
      try {
        const r = await db.query(
          `UPDATE receptionist_reviewlink SET clicked_at=COALESCE(clicked_at, now()) WHERE short_code=$1 RETURNING original_url`, [rm[1]]);
        if (!r.rows[0]) return html(layout("Link not found", `<p class="bad">This review link doesn't exist.</p>`), 404);
        return new Response(null, { status: 302, headers: { location: r.rows[0].original_url } });
      } finally { await db.end().catch(() => {}); }
    }

    // ITN receiver (PayFast server-to-server): triple-verified, activates the plan.
    if (path === "/billing/payfast-itn" && req.method === "POST") {
      const db = pool(env);
      try { return await handlePayfastItn(db, env, req); } finally { await db.end().catch(() => {}); }
    }

    if (path === "/signup") {
      if (req.method === "GET") return html(signupPage());
      const f = await formData(req);
      const db = pool(env);
      try {
        if (!f.email || !f.password || !f.name || !f.business) return html(signupPage("All fields are required."), 400);
        if ((f.password || "").length < 8) return html(signupPage("Password must be at least 8 characters."), 400);
        const email = f.email.trim().toLowerCase();
        const dupe = await db.query(`SELECT 1 FROM accounts_user WHERE lower(email)=$1`, [email]);
        if (dupe.rows[0]) return html(signupPage("An account with this email already exists. Log in instead."), 400);
        const h = await db.query(MAKE_HASH_SQL, [f.password]);
        const userId = crypto.randomUUID(), orgId = crypto.randomUUID(), wsId = crypto.randomUUID();
        const ref = "RU-" + orgId.replace(/-/g, "").slice(0, 8).toUpperCase();
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO accounts_user(id,password,email,name,is_superuser,is_active,is_staff,totp_enabled,totp_recovery_codes,created_at,updated_at,avatar,tos_accepted_at)
             VALUES($1,$2,$3,$4,false,true,false,false,'[]'::jsonb,now(),now(),'',now())`, [userId, h.rows[0].hash, email, f.name.trim()]);
          await client.query(
            `INSERT INTO organizations_organization(id,name,logo_url,default_timezone,plan,subscription_status,payment_reference,payfast_token,access_suspension_reason,trial_started_at,billing_email,created_at,updated_at)
             VALUES($1,$2,'','Africa/Johannesburg','starter','trial',$3,'','',now(),$4,now(),now())`, [orgId, f.business.trim(), ref, email]);
          await client.query(
            `INSERT INTO workspaces_workspace(id,name,description,organization_id,timezone,primary_color,secondary_color,default_hashtags,default_first_comment,approval_workflow_mode,is_archived,icon,industry,publish_test_mode,website_url,facebook_url,web_presence_gate_exempt,created_at,updated_at)
             VALUES($1,$2,'',$3,'Africa/Johannesburg','#0ea5e9','#0b1120','[]'::jsonb,'','required',false,'','',false,'','',false,now(),now())`, [wsId, f.business.trim(), orgId]);
          await client.query(
            `INSERT INTO members_org_membership(id,org_role,organization_id,user_id,accepted_at,invited_at) VALUES($1,'owner',$2,$3,now(),now())`,
            [crypto.randomUUID(), orgId, userId]);
          await client.query(
            `INSERT INTO members_workspace_membership(id,workspace_role,user_id,workspace_id,added_at) VALUES($1,'owner',$2,$3,now())`,
            [crypto.randomUUID(), userId, wsId]);
          await client.query("COMMIT");
        } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
        const token = await newSession(db, userId, req);
        return new Response(null, { status: 303, headers: { location: "/onboarding", "set-cookie": sessionCookie(token) } });
      } catch (e: any) {
        return html(signupPage("Signup failed: " + String(e).slice(0, 200)), 500);
      } finally { await db.end().catch(() => {}); }
    }

    if (path === "/login") {
      if (req.method === "GET") return html(loginPage());
      const f = await formData(req);
      const db = pool(env);
      try {
        const r = await db.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
        const row = r.rows[0];
        let ok = false;
        if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
          const v = await db.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
          ok = v.rows[0]?.ok === true;
        }
        if (!ok) return html(loginPage("Wrong email or password."), 401);
        const token = await newSession(db, row.id, req);
        return new Response(null, { status: 303, headers: { location: "/", "set-cookie": sessionCookie(token) } });
      } finally { await db.end().catch(() => {}); }
    }

    if (path === "/logout" && req.method === "POST") {
      const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
      const db = pool(env);
      if (m) await db.query(`DELETE FROM cf_sessions WHERE token_hash=$1`, [await sha256hex(m[1])]);
      await db.end().catch(() => {});
      return new Response(null, { status: 303, headers: { location: "/login", "set-cookie": "cf_session=; Path=/; Max-Age=0" } });
    }

    // FrontDesk public enquiry form (no login)
    const fm = /^\/f\/([0-9a-f-]{36})$/.exec(path);
    if (fm) {
      const pdb = pool(env);
      try {
        const w = await pdb.query(
          `SELECT w.id, w.name, o.plan FROM workspaces_workspace w JOIN organizations_organization o ON o.id=w.organization_id WHERE w.id=$1 AND w.is_archived=false AND o.deleted_at IS NULL`, [fm[1]]);
        const biz = w.rows[0];
        if (!biz || biz.plan !== "business-pro") return html(layout("Enquiries closed", `<div class="card"><p>This business is not taking online enquiries right now.</p></div>`), 404);
        if (req.method === "POST") {
          const f = await formData(req);
          const name = (f.name || "").trim().slice(0, 200), contact = (f.contact || "").trim().slice(0, 200), message = (f.message || "").trim().slice(0, 2000);
          if (!name || !contact || !message) return html(enquiryForm(biz.name, "Please fill in your name, contact and message."));
          const ip = req.headers.get("cf-connecting-ip") || "";
          const day = new Date().toISOString().slice(0, 10);
          const key = (await sha256hex(fm[1] + ip + day)).slice(0, 40);
          const leadId = crypto.randomUUID();
          const ins = await pdb.query(
            `INSERT INTO frontdesk_lead(id,workspace_id,name,contact,message,stage,value_cents,request_key,created_at,updated_at)
             VALUES($1,$2,$3,$4,$5,'new',0,$6,now(),now()) ON CONFLICT (workspace_id,request_key) DO NOTHING RETURNING id`, [leadId, fm[1], name, contact, message, key]);
          if (ins.rows[0]) {
            const cid = crypto.randomUUID();
            await pdb.query(
              `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
               VALUES($1,$2,$3,$4,'[]'::jsonb,true,false,'','','new','',false,'web enquiry',0,0,now(),now())`, [cid, fm[1], ("web:" + contact).slice(0, 32), name.slice(0, 120)]);
            await pdb.query(
              `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
               VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,'[]'::jsonb)`, [crypto.randomUUID(), message, "fd-" + leadId, cid, fm[1]]);
          }
          return html(layout("Thank you", `<div class="card"><h2>Thank you, ${esc(name)}</h2><p>${esc(biz.name)} has your enquiry and will get back to you shortly.</p></div>`));
        }
        return html(enquiryForm(biz.name));
      } finally { await pdb.end().catch(() => {}); }
    }

    // everything below needs auth
    const db = pool(env);
    try {
      if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      const user = await getUser(req, db);
      if (!user && path === "/") return html(landingPage());
      if (!user) return redirect("/login");
      const mem = await membership(db, user.id, req);
      if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);
      user._cur_ws = mem.workspace_name; user._ws_count = (mem.workspaces || []).length; user._goals = Array.isArray(mem.goals) ? mem.goals : [];

      if (path === "/switch") {
        if (req.method === "POST") {
          const f = await formData(req);
          const ok = (mem.workspaces || []).some((w: any) => w.id === f.workspace_id);
          if (!ok) return redirect("/switch");
          return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `cf_ws=${f.workspace_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 86400}` } });
        }
        const rows = (mem.workspaces || []).map((w: any) => `<tr>
<td><b>${esc(w.name)}</b><br><span class="mut">${esc(w.org)}</span></td>
<td>${esc(w.plan)} · ${esc(w.status)}</td>
<td>${w.id === mem.workspace_id ? `<span class="ok">Current</span>` : `<form method="post"><input type="hidden" name="workspace_id" value="${w.id}"><button>Switch</button></form>`}</td></tr>`).join("");
        return html(layout("Switch business", `
<div class="card"><table><tr><th>Business</th><th>Plan</th><th></th></tr>${rows}</table>
<p class="mut">Each business has its own posts, inbox, reviews and billing.</p></div>`, user));
      }

      if (path === "/") return html(await dashboardPage(db, user, mem));
      if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });

      if (path === "/onboarding") {
        if (req.method === "POST") {
          const f = await formData(req);
          const goals = GOALS.map(([v]) => v).filter((v) => f["goal_" + v]);
          const plan = ["starter", "growth", "business-pro"].includes(f.plan || "") ? f.plan! : recommendPlan(goals);
          const client = await db.connect();
          try {
            await client.query("BEGIN");
            await client.query(`UPDATE workspaces_workspace SET industry=$1, website_url=$2, timezone=$3, updated_at=now() WHERE id=$4`,
              [f.industry || "", f.website_url || "", f.timezone || "Africa/Johannesburg", mem.workspace_id]);
          await client.query(`UPDATE organizations_organization SET plan=$1, goals=$3::jsonb, updated_at=now() WHERE id=$2`, [plan, mem.org_id, JSON.stringify(goals)]);
            await client.query(
              `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
               VALUES($1,$2,$3,$4,$6::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$5,true,true,2,'reviews',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET business_name=EXCLUDED.business_name, industry=EXCLUDED.industry,
                 google_review_url=EXCLUDED.google_review_url, custom_rules=EXCLUDED.custom_rules, updated_at=now()`,
              [crypto.randomUUID(), mem.workspace_id, f.business_name || mem.org_name, f.industry || "", f.google_review_url || "", JSON.stringify({ goals })]);
            await client.query("COMMIT");
          } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
          const planName = PLAN_CARDS.find((p) => p.slug === plan)?.name || plan;
          return redirect("/?msg=" + encodeURIComponent(`You are on ${planName} - trial started. Add your Google review link under Reviews whenever you are ready.`));
        }
        return html(await onboardingPage(db, user, mem));
      }

      if (path === "/radar") {
        if (req.method === "POST") {
          const f = await formData(req);
          const ind = (f.industry || "general").trim();
          await db.query(`UPDATE workspaces_workspace SET industry=$1, updated_at=now() WHERE id=$2`, [ind, mem.workspace_id]);
          await db.query(`UPDATE receptionist_businessprofile SET industry=$1, updated_at=now() WHERE workspace_id=$2`, [ind, mem.workspace_id]);
          return redirect("/radar?msg=" + encodeURIComponent("Industry saved - radar, reply tone and post ideas updated."));
        }
        return html(await radarPage(db, user, mem, url.searchParams.get("msg") || ""));
      }
      if (path === "/analytics") return html(await analyticsPage(db, user, mem));

      if (path === "/frontdesk") {
        if (mem.plan !== "business-pro") return html(layout("Leads", `
<div class="card"><h2>Leads is a Business Pro feature</h2>
<p>Capture website enquiries, work a shared lead pipeline, and send considered follow-ups. <a href="/billing">Upgrade to Business Pro - R1,999/month</a>.</p></div>`, user));
        const leads = await db.query(`SELECT * FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`, [mem.workspace_id]);
        const drafts = await db.query(`SELECT * FROM frontdesk_followup_draft WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
        const totals = await db.query(`SELECT stage, count(*) c, coalesce(sum(value_cents),0) v FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [mem.workspace_id]);
        const tmap: Record<string, any> = {}; for (const t of totals.rows) tmap[t.stage] = t;
        const STAGES = ["new", "contacted", "quoted", "won", "lost"];
        const summary = STAGES.map((s) => `<div class="card"><h2 style="text-transform:capitalize">${s}</h2><p class="stat">${tmap[s]?.c || 0}</p><p class="mut">R${((tmap[s]?.v || 0) / 100).toLocaleString("en-ZA")}</p></div>`).join("");
        const byLead: Record<string, any[]> = {}; for (const d of drafts.rows) (byLead[d.lead_id] = byLead[d.lead_id] || []).push(d);
        const rows = leads.rows.map((l: any) => {
          const ds = (byLead[l.id] || []).map((d: any) => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0">
<div class="mut" style="font-size:11px">Follow-up draft · ${esc(d.status)} · ${new Date(d.created_at).toLocaleString("en-ZA")}</div>
<div style="white-space:pre-wrap">${esc(d.body)}</div>
${d.status === "draft" ? `<form method="post" action="/frontdesk/draft/${d.id}/approve" style="margin-top:6px"><button>Mark approved</button></form>` : ""}</div>`).join("");
          return `<tr>
<td><b>${esc(l.name)}</b><br><span class="mut">${esc(l.contact)}</span></td>
<td>${esc(l.message.slice(0, 100))}${ds}</td>
<td><form method="post" action="/frontdesk/${l.id}/save" style="display:flex;gap:6px;align-items:center">
<select name="stage">${STAGES.map((s) => `<option${l.stage === s ? " selected" : ""}>${s}</option>`).join("")}</select>
<input name="value" type="number" min="0" step="0.01" value="${(l.value_cents / 100).toFixed(2)}" style="width:90px" title="Value (ZAR)">
<button>Save</button></form>
<form method="post" action="/frontdesk/${l.id}/draft" style="margin-top:6px"><button>Draft follow-up</button></form></td>
<td class="mut">${new Date(l.created_at).toLocaleString("en-ZA")}</td></tr>`;
        }).join("");
        return html(layout("Leads", `
<p class="mut">Your public enquiry form: <a href="/f/${mem.workspace_id}" target="_blank" rel="noopener">/f/${mem.workspace_id.slice(0, 8)}…</a> - share it anywhere. Enquiries land here and in your inbox.</p>
<div class="grid">${summary}</div>
<div class="card">${leads.rows.length ? `<table><tr><th>Lead</th><th>Enquiry + follow-ups</th><th>Stage · value (ZAR)</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No enquiries yet. Share your enquiry form link to start capturing leads.</p>`}</div>`, user));
      }

      const fsave = /^\/frontdesk\/([0-9a-f-]{36})\/save$/.exec(path);
      if (fsave && req.method === "POST") {
        if (mem.plan !== "business-pro") return redirect("/frontdesk");
        const f = await formData(req);
        const stage = ["new", "contacted", "quoted", "won", "lost"].includes(f.stage) ? f.stage : "new";
        const cents = Math.max(0, Math.round(parseFloat(f.value || "0") * 100) || 0);
        await db.query(`UPDATE frontdesk_lead SET stage=$1, value_cents=$2, updated_at=now() WHERE id=$3 AND workspace_id=$4`, [stage, cents, fsave[1], mem.workspace_id]);
        return redirect("/frontdesk");
      }

      const fdraft = /^\/frontdesk\/([0-9a-f-]{36})\/draft$/.exec(path);
      if (fdraft && req.method === "POST") {
        if (mem.plan !== "business-pro") return redirect("/frontdesk");
        const lr = await db.query(`SELECT * FROM frontdesk_lead WHERE id=$1 AND workspace_id=$2`, [fdraft[1], mem.workspace_id]);
        if (!lr.rows[0]) return redirect("/frontdesk");
        try {
          const body = await groqFollowup(env, mem.workspace_name, lr.rows[0]);
          await db.query(`INSERT INTO frontdesk_followup_draft(id,lead_id,workspace_id,body,status,created_at,updated_at) VALUES($1,$2,$3,$4,'draft',now(),now())`,
            [crypto.randomUUID(), fdraft[1], mem.workspace_id, body]);
        } catch (e) { return redirect("/frontdesk?err=" + encodeURIComponent("Drafting failed - try again.")); }
        return redirect("/frontdesk");
      }

      const fappr = /^\/frontdesk\/draft\/([0-9a-f-]{36})\/approve$/.exec(path);
      if (fappr && req.method === "POST") {
        if (mem.plan !== "business-pro") return redirect("/frontdesk");
        await db.query(`UPDATE frontdesk_followup_draft SET status='approved', updated_at=now() WHERE id=$1 AND workspace_id=$2`, [fappr[1], mem.workspace_id]);
        return redirect("/frontdesk");
      }

      if (path === "/posts") {
        const msg = url.searchParams.get("msg") || "";
        return html((msg ? `<p class="ok">${esc(msg)}</p>` : "") + await postsPage(db, user, mem));
      }

      if (path === "/posts/new") {
        if (req.method === "POST") {
          const f = await formData(req);
          if (!(f.title || "").trim() && !(f.caption || "").trim()) return redirect("/posts/new");
          const postId = crypto.randomUUID();
          const client = await db.connect();
          try {
            await client.query("BEGIN");
            await client.query(
              `INSERT INTO composer_post(id,title,caption,first_comment,internal_notes,tags,workspace_id,author_id,created_at,updated_at)
               VALUES($1,$2,$3,'','','{}'::jsonb,$4,$5,now(),now())`,
              [postId, (f.title || "").trim(), (f.caption || "").trim(), mem.workspace_id, user.id]);
            // One draft platform post per connected account, like the Django composer.
            const accs = await client.query(
              `SELECT id, provider FROM social_accounts_social_account WHERE workspace_id=$1 AND connection_status='connected'`, [mem.workspace_id]);
            for (const a of accs.rows) {
              await client.query(
                `INSERT INTO composer_platform_post(id,platform_post_id,publish_error,retry_count,created_at,updated_at,social_account_id,post_id,platform_extra,status,first_comment_error,first_comment_id,first_comment_retry_count,first_comment_status,last_provider_error,last_provider_status,provider,provider_post_id)
                 VALUES($1,'','',0,now(),now(),$2,$3,'{}'::jsonb,'draft','','',0,'none','','',$4,'')`,
                [crypto.randomUUID(), a.id, postId, a.provider || "zernio"]);
            }
            await client.query("COMMIT");
            return redirect("/posts?msg=" + encodeURIComponent("Draft created."));
          } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
        }
        return html(newPostPage(user, mem, {}, url.searchParams.get("msg") || ""));
      }

      if (path === "/posts/draft" && req.method === "POST") {
        const f = await formData(req);
        const topic = (f.topic || "").trim();
        if (!topic) return html(newPostPage(user, mem, f, "Tell me the topic first."));
        try {
          const business = mem.org_name || "local business";
          const d = await draftCaption(env, business, topic);
          const caption = d.caption + (d.hashtags.length ? "\n\n" + d.hashtags.join(" ") : "");
          return html(newPostPage(user, mem, { ...f, caption }, "Drafted - edit anything before saving."));
        } catch (e: any) {
          return html(newPostPage(user, mem, f, "Drafting failed (" + String(e?.message || e) + ") - write it manually or try again."));
        }
      }

      if (path === "/inbox") return html(await inboxPage(db, user, mem));
      const cm = /^\/inbox\/([0-9a-f-]{36})$/.exec(path);
      if (cm) return conversationPage(db, user, mem, cm[1], env);

      const sm = /^\/posts\/([0-9a-f-]{36})\/submit$/.exec(path);
      if (sm && req.method === "POST") {
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const cur = await client.query(
            `SELECT pp.id, pp.status FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id
             WHERE pp.post_id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`, [sm[1], mem.workspace_id]);
          let moved = 0;
          for (const pp of cur.rows) {
            if (pp.status !== "draft") continue;
            await client.query(`UPDATE composer_platform_post SET status='pending_review', updated_at=now() WHERE id=$1`, [pp.id]);
            moved++;
          }
          if (moved) {
            await client.query(
              `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
               VALUES($1,$2,NULL,$3,'submitted','',now())`, [crypto.randomUUID(), sm[1], user.id]);
          }
          await client.query("COMMIT");
          return redirect(moved ? "/approvals" : "/posts?msg=" + encodeURIComponent("Nothing to submit (no draft channels)."));
        } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
      }


      if (path === "/reviews") return html(await reviewsPage(db, user, mem, base, url.searchParams.get("msg") || ""));

      if (path === "/reviews/destination" && req.method === "POST") {
        const f = await formData(req);
        if (!/^https:\/\//.test(f.google_review_url || "")) return redirect("/reviews");
        const bp = await db.query(`SELECT 1 FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
        if (bp.rows[0]) {
          await db.query(`UPDATE receptionist_businessprofile SET google_review_url=$1, updated_at=now() WHERE workspace_id=$2`, [f.google_review_url, mem.workspace_id]);
        } else {
          await db.query(
            `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
             VALUES($1,$2,$3,'','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$4,true,true,2,'reviews',now(),now())`,
            [crypto.randomUUID(), mem.workspace_id, mem.org_name, f.google_review_url]);
        }
        return redirect("/reviews");
      }

      if (path === "/reviews/links" && req.method === "POST") {
        const f = await formData(req);
        const bp = await db.query(`SELECT google_review_url FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
        const dest = bp.rows[0]?.google_review_url;
        if (!dest) return redirect("/onboarding");
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const contactId = crypto.randomUUID();
          await client.query(
            `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
             VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())`, [contactId, mem.workspace_id, f.wa_id || "", f.name || ""]);
          const code = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
          await client.query(
            `INSERT INTO receptionist_reviewlink(id,workspace_id,contact_id,short_code,original_url,created_at)
             VALUES($1,$2,$3,$4,$5,now())`, [crypto.randomUUID(), mem.workspace_id, contactId, code, dest]);
          await client.query("COMMIT");
          return redirect(`/reviews?created=${code}`);
        } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
      }

      if (path === "/approvals") {
        const created = url.searchParams.get("done");
        return html(await approvalsPage(db, user, mem, created ? `Post ${STATUS_LABELS[created] || created}.` : ""));
      }

      const am = /^\/approvals\/([0-9a-f-]{36})\/(approve|reject)$/.exec(path);
      if (am && req.method === "POST") {
        const [, ppId, action] = am;
        const target = action === "approve" ? "approved" : "rejected";
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const cur = await client.query(
            `SELECT pp.id, pp.status, pp.post_id FROM composer_platform_post pp
             JOIN composer_post p ON p.id=pp.post_id
             WHERE pp.id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`, [ppId, mem.workspace_id]);
          const pp = cur.rows[0];
          if (!pp) { await client.query("ROLLBACK"); return html(layout("Not found", `<p class="bad">Post not found.</p>`, user), 404); }
          const allowed: Record<string, string[]> = {
            pending_review: ["approved", "changes_requested", "rejected"],
            pending_client: ["approved", "changes_requested", "rejected"],
          };
          if (!(allowed[pp.status] || []).includes(target)) {
            await client.query("ROLLBACK");
            return redirect(`/approvals?done=${encodeURIComponent("already " + pp.status)}`);
          }
          await client.query(`UPDATE composer_platform_post SET status=$1, updated_at=now() WHERE id=$2`, [target, ppId]);
          await client.query(
            `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
             VALUES($1,$2,$3,$4,$5,'',now())`,
            [crypto.randomUUID(), pp.post_id, ppId, user.id, target]);
          await client.query("COMMIT");
          return redirect(`/approvals?done=${target}`);
        } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
      }

      if (path === "/billing") return html(await billingPage(db, user, mem, base, env));

      return html(layout("Not found", `<p class="bad">Nothing here yet.</p>`, user), 404);
    } catch (e: any) {
      return html(layout("Error", `<p class="bad">${esc(String(e).slice(0, 300))}</p>`), 500);
    } finally { await db.end().catch(() => {}); }
  },
};
