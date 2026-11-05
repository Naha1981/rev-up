// RevUp on Cloudflare Workers — revenue path. Shares the live Neon DB with the
// Django app; passwords verify in Postgres (pgcrypto) to stay inside Workers
// Free CPU limits. No vendor names surface in any HTML.
import { Pool } from "pg";

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
    ? `<nav><a href="/">Dashboard</a><a href="/onboarding">Onboarding</a><a href="/reviews">Reviews</a><a href="/approvals">Approvals</a><a href="/billing">Billing</a><form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></nav>`
    : `<nav><a href="/login">Log in</a><a href="/signup">Sign up</a></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · RevUp</title><style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0b1120;color:#e2e8f0;margin:0;padding:0 16px 60px}
a{color:#38bdf8;text-decoration:none}a:hover{text-decoration:underline}
nav{display:flex;gap:18px;align-items:center;padding:16px 0;border-bottom:1px solid #1e293b;margin-bottom:28px;flex-wrap:wrap}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 10px}
.card{background:#111a2e;border:1px solid #1e293b;border-radius:10px;padding:18px;margin:12px 0;max-width:760px}
input,select,textarea{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #334155;background:#0b1120;color:#e2e8f0;margin:4px 0 12px;font-size:14px}
button,.btn{background:#0ea5e9;color:#04121f;border:0;border-radius:8px;padding:10px 18px;font-weight:600;cursor:pointer;font-size:14px;display:inline-block}
button.link{background:none;color:#38bdf8;padding:0;font-weight:400}
.mut{color:#94a3b8;font-size:13px}.ok{color:#4ade80}.bad{color:#f87171}.warn{color:#fbbf24}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px 10px;border-bottom:1px solid #1e293b;text-align:left;vertical-align:top}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#1e293b}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
form.inline{display:inline}
</style></head><body>${nav}<h1>${esc(title)}</h1>${body}</body></html>`;
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
<div class="card"><h2>Posts</h2><p style="font-size:28px;margin:0">${posts.rows[0].c}</p><p class="mut">total in this workspace</p></div>
<div class="card"><h2>Awaiting approval</h2><p style="font-size:28px;margin:0">${pending.rows[0].c}</p><p class="mut"><a href="/approvals">review now →</a></p></div>
<div class="card"><h2>Review links</h2><p style="font-size:28px;margin:0">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked · <a href="/reviews">manage →</a></p></div>
<div class="card"><h2>Subscription</h2><p style="font-size:28px;margin:0">${esc(mem.plan)}</p><p class="mut"><a href="/billing">billing →</a></p></div>
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
${b.google_review_url ? `<p>Google review destination: <a href="${esc(b.google_review_url)}">${esc(b.google_review_url)}</a></p>` : `<p class="warn">No Google review link set — add it in <a href="/onboarding">Onboarding</a> first.</p>`}
<h2>New review link</h2>
<div class="card"><form method="post" action="/reviews/links">
<label>Customer name<input name="name" required maxlength="200"></label>
<label>Customer WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27…"></label>
<button>Create tracked link</button>
<p class="mut">Send the /r/… link to the customer. It redirects to your Google review page and records the click.</p>
</form></div>
<h2>Links</h2>
<div class="card">${links.rows.length ? `<table><tr><th>Customer</th><th>Link</th><th>Click</th><th>Created</th></tr>${rows}</table>` : `<p class="mut">No review links yet.</p>`}</div>`, user);
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
      const user = await getUser(req, db);
      if (!user) return redirect("/login");
      const mem = await membership(db, user.id);
      if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);

      if (path === "/") return html(await dashboardPage(db, user, mem));

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

      if (path === "/reviews") return html(await reviewsPage(db, user, mem, base));

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
