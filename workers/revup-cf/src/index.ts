// RevUp on Cloudflare Workers — revenue path. Shares the live Neon DB with the
// Django app; passwords verify in Postgres (pgcrypto) to stay inside Workers
// Free CPU limits. No vendor names surface in any HTML.
import { Pool } from "pg";
import { LOGO_B64, landingPage } from "./landing";

interface Env {
  DATABASE_URL: string;
  PF_MERCHANT_ID: string;
  PF_MERCHANT_KEY: string;
  PF_PASSPHRASE: string;
}

// ---------- db ----------
function pool(env: Env) {
  return new Pool({ connectionString: env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 });
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
function layout(title: string, body: string, user?: any): string {
  const nav = user
    ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a href="/">Dashboard</a><a href="/posts">Posts</a><a href="/onboarding">Onboarding</a><a href="/reviews">Reviews</a><a href="/approvals">Approvals</a><a href="/billing">Billing</a><form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>`
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

async function membership(db: Pool, userId: string): Promise<any | null> {
  const r = await db.query(
    `SELECT w.id AS workspace_id, w.name AS workspace_name, w.approval_workflow_mode,
            o.id AS org_id, o.name AS org_name, o.plan, o.subscription_status, o.payment_reference,
            o.trial_started_at, o.activated_at, m.workspace_role
     FROM members_workspace_membership m
     JOIN workspaces_workspace w ON w.id=m.workspace_id
     JOIN organizations_organization o ON o.id=w.organization_id
     WHERE m.user_id=$1 AND w.is_archived=false AND o.deleted_at IS NULL
     ORDER BY m.added_at LIMIT 1`, [userId]);
  return r.rows[0] || null;
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
    ["m_payment_id", `${org.payment_reference || "RU"}-cf`],
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

// ---------- pages ----------
const signupPage = (err = "") => layout("Create your RevUp account", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/signup">
<label>Your name<input name="name" required maxlength="150"></label>
<label>Email<input name="email" type="email" required maxlength="254"></label>
<label>Password<input name="password" type="password" required minlength="8"></label>
<label>Business name<input name="business" required maxlength="200"></label>
<button>Create account</button>
<p class="mut">From R499/month. Pay from day one — your subscription starts after signup.</p>
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

async function onboardingPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const w = await db.query(`SELECT industry, website_url, timezone FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ws = w.rows[0] || {};
  return layout("Onboarding", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/onboarding">
<label>Business name<input name="business_name" value="${esc(b.business_name || mem.org_name)}" required></label>
<label>Industry<input name="industry" value="${esc(ws.industry || b.industry || "")}" placeholder="restaurant, plumbing, dental…"></label>
<label>Website<input name="website_url" value="${esc(ws.website_url || "")}" placeholder="https://…"></label>
<label>Google review link<input name="google_review_url" value="${esc(b.google_review_url || "")}" placeholder="https://g.page/r/…"></label>
<label>Timezone<input name="timezone" value="${esc(ws.timezone || "Africa/Johannesburg")}"></label>
<button>Save</button>
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
    { slug: "business-pro", name: "Business Pro", price: 1999, feat: "unlimited workspaces · priority support" },
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
        await db.end();
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
      } finally { await db.end(); }
    }

    // ITN receiver (PayFast server-to-server). Full ITN validation is pending
    // cutover work; for now we acknowledge so PayFast stops retrying.
    if (path === "/billing/payfast-itn" && req.method === "POST") return new Response("OK");

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
      } finally { await db.end(); }
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
      } finally { await db.end(); }
    }

    if (path === "/logout" && req.method === "POST") {
      const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
      const db = pool(env);
      if (m) await db.query(`DELETE FROM cf_sessions WHERE token_hash=$1`, [await sha256hex(m[1])]);
      await db.end();
      return new Response(null, { status: 303, headers: { location: "/login", "set-cookie": "cf_session=; Path=/; Max-Age=0" } });
    }

    // everything below needs auth
    const db = pool(env);
    try {
      if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      const user = await getUser(req, db);
      if (!user && path === "/") return html(landingPage());
      if (!user) return redirect("/login");
      const mem = await membership(db, user.id);
      if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);

      if (path === "/") return html(await dashboardPage(db, user, mem));
      if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });

      if (path === "/onboarding") {
        if (req.method === "POST") {
          const f = await formData(req);
          const client = await db.connect();
          try {
            await client.query("BEGIN");
            await client.query(`UPDATE workspaces_workspace SET industry=$1, website_url=$2, timezone=$3, updated_at=now() WHERE id=$4`,
              [f.industry || "", f.website_url || "", f.timezone || "Africa/Johannesburg", mem.workspace_id]);
            await client.query(
              `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
               VALUES($1,$2,$3,$4,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$5,true,true,2,'reviews',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET business_name=EXCLUDED.business_name, industry=EXCLUDED.industry,
                 google_review_url=EXCLUDED.google_review_url, updated_at=now()`,
              [crypto.randomUUID(), mem.workspace_id, f.business_name || mem.org_name, f.industry || "", f.google_review_url || ""]);
            await client.query("COMMIT");
          } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
          return html(await onboardingPage(db, user, mem, "Saved."));
        }
        return html(await onboardingPage(db, user, mem));
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
        return html(layout("New post", `
<div class="card"><form method="post" action="/posts/new">
<label>Title<input name="title" maxlength="200" placeholder="Internal title"></label>
<label>Caption<textarea name="caption" rows="5" placeholder="What should go out?"></textarea></label>
<button>Save draft</button>
<p class="mut">Creates a draft for every connected channel. Scheduling and publishing run on the current pipeline.</p>
</form></div>`, user));
      }

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


      if (path === "/reviews") return html(await reviewsPage(db, user, mem, base));

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
    } finally { await db.end(); }
  },
};
