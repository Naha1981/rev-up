export {calendarPanel,calendarState,checkCalendarState,calendarEventId,calendarEventBody,calendarConnect,calendarSync} from "./calendar";
import {calendarPanel,calendarConfigured,calendarAuthUrl,checkCalendarState,calendarConnect,calendarSync} from "./calendar";
import { legalPage } from "./legal";
import { decryptTenantKey } from "./tenant-crypto";
import { connectFailure, saveTenantKey } from "./connect-errors";
// RevUp on Cloudflare Workers — revenue path. Shares the live Neon DB with the
// Django app; passwords verify in Postgres (pgcrypto) to stay inside Workers
// Free CPU limits. No vendor names surface in any HTML.
import { Client, Pool } from "pg";
import { APPLE_TOUCH_B64, FAVICON_16_B64, FAVICON_32_B64, FAVICON_ICO_B64, LOGO_B64, OG_B64, landingPage } from "./landing";
export { landingPage } from "./landing";
import { INDUSTRIES, getPreset, industryLabel } from "./presets";
import { handleZernioWebhook, verifyZernioSignature, validateTenantKey, tenantConnectUrl, tenantConfirmAndBind, tenantWebhookSecret } from "./receptionist";
import { startPipeline, cancelPending, runDueReviewEvents, resolveIssue, scheduleServiceReminder, runDueServiceReminders } from "./reviews";
import { ensurePageTables, fetchForMirror, mirrorStructure, generateSections, servePublic, makeSlug, pagesListBody, newPageBody, pageDetailBody, type PageRow, type PageSection } from "./pages";
import { waitlistAdd, waitlistExpire, waitlistAction, loyaltySettings, loyaltyAccount, awardForBooking, issueVoucher, redeemVoucher, expireVouchers, quoteCreate, quoteAction, segmentContacts, campaignCreate, campaignApprove, campaignCancel, runDueCampaigns, attributeBookingToCampaign, campaignStats, competitorAdd, dishAdd, promoAdd, refreshOpportunities, opportunityAction, opportunityDraftCampaign, supportHandle, autoDraftOpportunities } from "./features";

interface Env {
  DATABASE_URL: string;
  GOOGLE_CALENDAR_CLIENT_ID?: string;
  GOOGLE_CALENDAR_CLIENT_SECRET?: string;
  TENANT_FIELD_KEY?: string;
  DJANGO_SECRET_KEY?: string;
  ENCRYPTION_KEY_SALT?: string;
  PF_MERCHANT_ID: string;
  PF_MERCHANT_KEY: string;
  PF_PASSPHRASE: string;
  GROQ_API_KEY: string;
  OPENROUTER_API_KEY?: string;
  ZERNIO_API_KEY: string;
  ZERNIO_WEBHOOK_SECRET: string;
}

// ---------- db ----------
export function pool(env: Env) {
  // Workers close sockets when a request ends, so pooling is per-request (a shared
  // pool hands out dead clients). idleTimeoutMillis 0 disables the reaper: a 1s
  // reaper raced mid-request checkout and hung the reconnect. end() must not
  // throw in finally or it masks the friendly 500 page with a worker exception.
  // max: 1 - one connection per request. Postgres caps at 112 connections and the
  // Render stack + cron worker also use some; at max: 3 just ~35 concurrent users
  // could exhaust them (measured 7 Nov: 32 of 50 concurrent dashboard loads 500'd).
  // Promise.all queries simply queue on the single connection.
  return new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15000, idleTimeoutMillis: 0 });
}

// ---------- crypto ----------
export async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// md5 via spark-md5 — PayFast signatures only; WebCrypto has no md5.
import SparkMD5 from "spark-md5";
import { wifiCardPage } from "./wificard";
import { menuManagePage, ordersPage, publicMenuHtml, createOrder, loadMenu } from "./menu";
import { handleChatAppRoute } from "./chatapp";
import { freeAiGenerate, rejectInventedPrices, FACT_RULES } from "./freeai";
import { ensureSocialTeamSchema, teamPage, runResearcher, producePiece } from "./socialteam";
import { QRCODE_LIB } from "./qrcodejs";
export function md5(input: string): string { return SparkMD5.hash(input); }

// ---------- html ----------
export function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
export function navLinks(user: any): string {
  const g: string[] = Array.isArray(user._goals) ? user._goals : [];
  const show = (...need: string[]) => !g.length || need.some((n) => g.includes(n));
  // Daily work stays on the bar; everything else sits under More.
  let h = `<a href="/">Dashboard</a>`;
  if (show("leads", "receptionist")) h += `<a href="/inbox">Inbox</a>`;
  if (show("leads")) h += `<a href="/frontdesk">Leads</a>`;
  if (show("reviews", "leads", "receptionist")) h += `<a href="/approvals">Approvals</a>`;
  if (show("social")) h += `<a href="/posts">Posts</a>`;
  if (show("social")) h += `<a href="/team">Team</a>`;
  if (show("reviews")) h += `<a href="/reviews">Reviews</a>`;
  if (show("receptionist")) h += `<a href="/receptionist">Receptionist</a>`;
  let more = "";
  if (show("social")) more += `<a href="/analytics">Analytics</a>`;
  if (show("reviews")) more += `<a href="/radar">Radar</a>`;
  if (show("social")) more += `<a href="/media">Media</a>`;
  more += `<a href="/onboarding">Onboarding</a>`;
  if (show("receptionist")) more += `<a href="/assistant">Assistant</a>`;
  if (show("receptionist")) more += `<a href="/bookings">Bookings</a>`;
  if (show("receptionist")) more += `<a href="/waitlist">Waitlist</a>`;
  if (show("receptionist")) more += `<a href="/loyalty">Loyalty</a>`;
  if (show("receptionist")) more += `<a href="/quotes">Quotes</a>`;
  if (show("receptionist")) more += `<a href="/campaigns">Campaigns</a>`;
  if (show("receptionist", "social", "leads")) more += `<a href="/pages">Pages</a>`;
  if (show("receptionist")) more += `<a href="/competitors">Competitors</a>`;
  if (show("receptionist")) more += `<a href="/support">Support</a>`;
  if (show("receptionist")) more += `<a href="/wifi-card">WiFi Card</a>`;
  if (show("receptionist")) more += `<a href="/menu">Menu</a>`;
  if (show("receptionist")) more += `<a href="/orders">Orders</a>`;
  more += `<a href="/billing">Billing</a>`;
  h += `<details class="nav-more"><summary>More</summary><div class="nav-more-panel">${more}</div></details>`;
  return h;
}

export function layout(title: string, body: string, user?: any): string {
  const nav = user
    ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links">${navLinks(user)}${user._cur_ws ? `<a href="/switch" title="Switch business" style="border:1px solid var(--line);border-radius:8px;padding:2px 8px">${esc(user._cur_ws)}${(user._ws_count||0) > 1 ? " &#9662;" : ""}</a>` : ""}<form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>`
    : `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a class="btn btn-ghost" href="/login">Log in</a><a class="btn btn-primary" href="/signup">Get started</a></div></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/static/brand/favicon-32.png"><link rel="icon" type="image/png" sizes="16x16" href="/static/brand/favicon-16.png"><link rel="apple-touch-icon" href="/static/brand/apple-touch-icon.png"><title>${esc(title)} · RevUp</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap" rel="stylesheet"><style>
:root{--brand:#F97316;--brand-dark:#EA580C;--brand-soft:#FFF7ED;--ink:#1C1917;--ink2:#57534E;--ink3:#78716C;--line:#E7E5E4;--bg:#FAFAF9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Manrope,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6;font-size:17px}
a{color:var(--brand-dark);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line);margin-bottom:32px;flex-wrap:wrap;gap:12px}
.logo img{height:30px;width:auto}
.nav-links{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.nav-links a{color:var(--ink2);font-size:15px;font-weight:500}
.nav-links a:hover{color:var(--ink);text-decoration:none}
.nav-more{position:relative}
.nav-more summary{list-style:none;cursor:pointer;color:var(--ink2);font-size:15px;font-weight:500;display:flex;align-items:center;gap:4px;user-select:none}
.nav-more summary::-webkit-details-marker{display:none}
.nav-more summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.nav-more summary:hover{color:var(--ink)}
.nav-more[open] summary{color:var(--ink)}
.nav-more-panel{position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.06);z-index:50;display:grid;gap:2px}
.nav-more-panel a{display:block;padding:6px 12px;border-radius:8px;white-space:nowrap;color:var(--ink2)}
.nav-more-panel a:hover{background:var(--bg);color:var(--ink);text-decoration:none}
@media (max-width:640px){.nav-more-panel{left:0;right:auto}}
.btn{display:inline-block;padding:12px 22px;border-radius:10px;font-weight:500;font-size:16px;text-decoration:none;transition:background .15s;border:0;cursor:pointer}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-dark);text-decoration:none}
.btn-ghost{color:var(--ink);border:1px solid var(--line);background:#fff}
h1{font-size:28px;font-weight:500;margin:0 0 10px}h2{font-size:19px;font-weight:500;margin:24px 0 10px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin:12px 0;overflow-x:auto}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
@media (max-width:640px){.frow{grid-template-columns:1fr}.wrap{padding:0 16px}.card{padding:18px 16px}td,th{padding:10px 8px}h1{font-size:26px}
.rtable thead{display:none}
.rtable tr:first-child{display:none}
.rtable tr{display:block;padding:14px 0;border-bottom:1px solid var(--line)}
.rtable tr:last-child{border-bottom:0}
.rtable td{display:block;border:0;padding:3px 0}}
input,select,textarea{width:100%;box-sizing:border-box;padding:12px 16px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);margin:4px 0 16px;font-size:16px;font-family:inherit}
input[type=checkbox]{width:auto;margin:0}
input:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}
button,.btn-form{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:12px 22px;font-weight:500;cursor:pointer;font-size:16px}
button:hover{background:var(--brand-dark)}
button.link{background:none;color:var(--ink2);padding:0;font-weight:500;font-size:15px}
button.link:hover{color:var(--ink)}
.mut{color:var(--ink3);font-size:15px}.ok{color:#16A34A}.bad{color:#DC2626}.warn{color:#B45309}
table{border-collapse:collapse;width:100%;font-size:16px}td,th{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:13px;font-weight:600;color:var(--ink2);letter-spacing:.02em}
.pill{font-size:13px;color:var(--brand-dark);font-weight:600}
.pill.warn{color:#B45309}.pill.ok{color:#15803D}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(208px,1fr));gap:16px}
form.inline{display:inline-block;margin:0 14px 6px 0}
.stat{font-size:28px;font-weight:500;margin:2px 0;font-variant-numeric:tabular-nums}
.stat-t{font-size:20px;font-weight:500;margin:2px 0}
label{font-size:15px;font-weight:500;color:var(--ink2);display:block}
label input:not([type=checkbox]),label select,label textarea{display:block;width:100%;margin-top:6px}
</style></head><body><div class="wrap">${nav}<h1>${esc(title)}</h1>${body}</div></body></html>`;
}
export function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
export function json(o: any, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
export function redirect(to: string): Response {
  return new Response(null, { status: 303, headers: { location: to } });
}

// ---------- auth ----------
export async function getUser(req: Request, db: Pool): Promise<any | null> {
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
export async function newSession(db: Pool, userId: string, req: Request): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const th = await sha256hex(token);
  await db.query(`INSERT INTO cf_sessions(token_hash,user_id,device_info,expires_at) VALUES($1,$2,$3,now()+interval '14 days')`,
    [th, userId, (req.headers.get("user-agent") || "").slice(0, 200)]);
  return token;
}
export async function rateLimited(db: Pool, bucket: string, req: Request, limit: number): Promise<boolean> {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = new Date().toISOString().slice(0, 10);
  const r = await db.query(
    `INSERT INTO cf_ratelimit(key,count) VALUES($1,1) ON CONFLICT (key) DO UPDATE SET count=cf_ratelimit.count+1 RETURNING count`,
    [`${bucket}:${ip}:${day}`]);
  return Number(r.rows[0].count) > limit;
}

// Read-only rate-limit check, no increment. Login uses this so that only FAILED
// attempts burn the daily budget: successful logins must not count, or 50 staff
// on one office network would lock each other out at 20 logins a day.
export async function rateLimitExceeded(db: Pool, bucket: string, req: Request, limit: number): Promise<boolean> {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = new Date().toISOString().slice(0, 10);
  const r = await db.query(`SELECT count FROM cf_ratelimit WHERE key=$1`, [`${bucket}:${ip}:${day}`]);
  return r.rows[0] ? Number(r.rows[0].count) > limit : false;
}

export function sessionCookie(token: string): string {
  return `cf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${14 * 86400}`;
}
// Django BCryptSHA256: bcrypt(base64(sha256(pw))). pgcrypto crypt() only accepts
// $2a$ salts, so swap the $2b$ prefix — identical output for ASCII inputs.
export const VERIFY_SQL = `SELECT crypt(encode(digest($1,'sha256'),'hex'), '$2a$' || substring($2 from 5)) = '$2a$' || substring($2 from 5) AS ok`;
const MAKE_HASH_SQL = `SELECT 'bcrypt_sha256$' || '$2b$' || substring(crypt(encode(digest($1,'sha256'),'hex'), gen_salt('bf',12)) from 5) AS hash`;

export async function membership(db: Pool, userId: string, req?: Request): Promise<any | null> {
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
export async function formData(req: Request): Promise<Record<string, string>> {
  const fd = await req.formData();
  const o: Record<string, string> = {};
  fd.forEach((v, k) => { o[k] = String(v); });
  return o;
}

// ---------- payfast ----------
export const PLAN_PRICES: Record<string, number> = { starter: 499, growth: 999, "business-pro": 1999 };

// ITN defence-in-depth: the reported gross must match the plan's price.
// (m_payment_id is already inside the passphrase signature; this catches
// amount drift on token/recurring charges.)
export function itnAmountOk(plan: string, gross: string | undefined): boolean {
  const expected = PLAN_PRICES[plan];
  const actual = parseFloat(gross || "NaN");
  return expected !== undefined && Number.isFinite(actual) && Math.abs(actual - expected) < 0.01;
}

export function pfUrl(env: Env, base: string, plan: string, org: any): string {
  const amount = PLAN_PRICES[plan];
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

// PayFast's published ITN source networks (developers.payfast.co.za/docs,
// "Ports and IP addresses"). Stored as [network, mask] 32-bit ints.
const ITN_ALLOWED_NETS: Array<[number, number]> = [
  ["197.97.145.144", 28],
  ["41.74.179.192", 27],
  ["102.216.36.0", 28],
  ["102.216.36.128", 28],
  ["144.126.193.139", 32],
].map(([base, bits]) => {
  const mask = bits === 0 ? 0 : (~0 << (32 - (bits as number))) >>> 0;
  return [(ipToInt(base as string) as number) & mask, mask];
});

function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

// True when the ITN source IP is in PayFast's published ranges. On the worker
// the source IP comes from CF-Connecting-IP, set by Cloudflare at the edge -
// client-supplied X-Forwarded-For is never trusted here.
export function itnSourceAllowed(ip: string): boolean {
  const n = ipToInt(ip);
  if (n === null) return false;
  return ITN_ALLOWED_NETS.some(([net, mask]) => (n & mask) === net);
}

async function handlePayfastItn(db: Pool, env: Env, req: Request): Promise<Response> {
  // Django-faithful triple verification: signature (posted order, quote_plus,
  // passphrase last), PayFast validate-back, then status COMPLETE.
  const srcIp = req.headers.get("cf-connecting-ip") || "";
  if (!itnSourceAllowed(srcIp)) return new Response("source ip not allowed", { status: 400 });
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
  if (!received || !timingSafeEq(received, ours)) return new Response("bad signature", { status: 400 });
  const check = await fetch("https://sandbox.payfast.co.za/eng/query/validate", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: raw,
  });
  if ((await check.text()).trim() !== "VALID") return new Response("payfast validate-back rejected", { status: 400 });
  const mpid = post["m_payment_id"] || "";
  const parts = mpid.split("-");
  const reference = mpid.startsWith("RU-") ? "RU-" + (parts[1] || "") : "";
  const plan = parts.slice(2).join("-");
  if (!reference || !["starter", "growth", "business-pro"].includes(plan)) return new Response("unknown reference", { status: 400 });
  const status = post["payment_status"] || "";
  if (status !== "COMPLETE" && status !== "CANCELLED") return new Response(`status ${status || "?"}`, { status: 400 });
  // Amount is verified for activations; a cancellation ITN may carry the
  // recurring amount or none, and lapsing never depends on it.
  if (status === "COMPLETE" && !itnAmountOk(plan, post["amount_gross"])) return new Response("amount mismatch", { status: 400 });
  const pfId = post["pf_payment_id"] || "";
  if (pfId) {
    const seen = await db.query(`SELECT 1 FROM organizations_organizationpayment WHERE pf_payment_id=$1`, [pfId]);
    if (seen.rowCount) return new Response("OK"); // ITN replay: already applied
  }
  if (status === "CANCELLED") {
    await db.query(
      `UPDATE organizations_organization SET subscription_status='expired', payfast_token='', updated_at=now() WHERE payment_reference=$1 AND subscription_status='active'`,
      [reference]);
  } else {
    const r = await db.query(
      `UPDATE organizations_organization SET plan=$1, subscription_status='active', payfast_token=$2, activated_at=COALESCE(activated_at, now()), updated_at=now() WHERE payment_reference=$3`,
      [plan, post["token"] || "", reference]);
    if (!r.rowCount) return new Response("unknown reference", { status: 400 });
  }
  if (pfId) {
    await db.query(
      `INSERT INTO organizations_organizationpayment(organization_id, pf_payment_id, plan, amount_gross, status, created_at)
       SELECT id, $1, $2, $3, $4, now() FROM organizations_organization WHERE payment_reference=$5 ON CONFLICT (pf_payment_id) DO NOTHING`,
      [pfId, plan, post["amount_gross"] || "0", status, reference]);
  }
  return new Response("OK");
}

// Constant-time string compare (PayFast signatures): no early exit on mismatch.
export function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- AI drafting (Groq free tier, Django-faithful contract) ----------
export const DRAFT_RULES = "Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. South African English. Keep the caption under 900 characters including hashtags. " + FACT_RULES;

async function draftCaption(env: Env, business: string, topic: string): Promise<{ caption: string; hashtags: string[] }> {
  const prompt = `Business: ${business}.\nWrite one social media post for this business about: ${topic}.\n${DRAFT_RULES}\nReply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1500, temperature: 0.2 }, rejectInventedPrices(prompt, (text) => {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0]);
      const caption = String(parsed.caption || "").trim();
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: any) => String(h)) : [];
      return caption ? { caption, hashtags } : null;
    } catch { return null; }
  }));
  if (!r) throw new Error("the writing assistant is busy right now");
  return r.value;
}

async function groqFollowup(env: Env, db: Pool, ws: string, business: string, lead: any): Promise<string> {
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const pq = await db.query(`SELECT pricing_data FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [ws]);
  const pricing = JSON.stringify(pq.rows[0]?.pricing_data || {});
  const prompt = `Business: ${business} (South Africa).
A website visitor sent an enquiry.
Name: ${lead.name}
Contact: ${lead.contact}
Enquiry: ${lead.message}
Known prices for this business (JSON, may be empty): ${pricing}
Write one short follow-up message the business can send back (max 120 words, warm and professional, plain text, no subject line).
${FACT_RULES}
The visitor's own contact detail above is NOT the business's - never quote it back as a way to reach the business. If pricing is asked and not in the known prices, say the business will confirm the exact price directly. Sign off as the business name only. Reply with the message text only.`;
  const r = await freeAiGenerate(env, prompt, { maxTokens: 500, temperature: 0.3 }, rejectInventedPrices(prompt, (text) => {
    const v = text.trim();
    return v || null;
  }));
  if (!r) throw new Error("the writing assistant is busy right now");
  return r.value;
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
export const signupPage = (err = "") => layout("Create your RevUp account", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/signup">
<label>Your name<input name="name" required maxlength="150"></label>
<label>Email<input name="email" type="email" required maxlength="254"></label>
<label>Password<input name="password" type="password" autocomplete="new-password" required minlength="8" aria-describedby="password-help"></label>
<p id="password-help" class="mut">Use at least 8 characters.</p>
<label>Business name<input name="business" required maxlength="200"></label>
<p class="mut">By creating an account, you agree to the <a style="color:var(--ink2);text-decoration:underline" href="/legal/terms/">Terms of Service</a> and acknowledge the <a style="color:var(--ink2);text-decoration:underline" href="/legal/privacy/">Privacy Policy</a>.</p>
<button>Create account</button>
<p class="mut">One monthly price from day one - no setup fee. Choose your plan during setup and activate it with your first payment.</p>
</form></div>`);

export const loginPage = (err = "") => layout("Log in to RevUp", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/login">
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Log in</button>
<p style="margin-top:16px"><a style="color:var(--ink2);text-decoration:underline" href="/forgot-password">Forgot your password?</a></p>
</form></div>`);

function statusLabel(s: string): string { return s === "active" ? "active" : "activation pending"; }
export async function dashboardPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const [pending, links, clicks, posts] = await Promise.all([
    db.query(`SELECT count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 AND pp.status='pending_review'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM composer_post WHERE workspace_id=$1`, [mem.workspace_id]),
  ]);
  return layout("Dashboard", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<p class="mut">${esc(mem.org_name)}${mem.workspace_name && mem.workspace_name !== mem.org_name ? ` · ${esc(mem.workspace_name)}` : ""} · <span class="pill">${esc(mem.plan)}</span> <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(statusLabel(mem.subscription_status))}</span></p>
<div class="grid">
<div class="card"><h2>Posts</h2><p class="stat">${posts.rows[0].c}</p><p class="mut">total in this workspace</p></div>
<div class="card"><h2>Awaiting approval</h2><p class="stat">${pending.rows[0].c}</p><p class="mut"><a href="/approvals">review now →</a></p></div>
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked · <a href="/reviews">manage →</a></p></div>
<div class="card"><h2>Subscription</h2><p class="stat-t">${esc(mem.plan)}</p><p class="mut"><a href="/billing">billing →</a></p></div>
</div>`, user);
}

const GOALS: [string, string][] = [
  ["receptionist", "Answer my business WhatsApp day and night"],
  ["reviews", "Turn happy customers into 5-star Google reviews"],
  ["social", "Keep my Facebook and Instagram posting"],
  ["leads", "Capture website enquiries and follow them up"],
];
// PRICING LOCKED by the owner 6 Nov 2026 - see PRICING.md. Changes need the owner's explicit approval.
const PLAN_CARDS: { slug: string; name: string; price: number; feat: string }[] = [
  { slug: "starter", name: "Starter", price: 499, feat: "Google review booster + enquiry inbox" },
  { slug: "growth", name: "Growth", price: 999, feat: "Everything in Starter + social posting with approvals" },
  { slug: "business-pro", name: "Business Pro", price: 1999, feat: "Everything in Growth + hands-free auto-posting, lead pipeline and follow-ups" },
];
export function recommendPlan(goals: string[]): string {
  if (goals.includes("leads")) return "business-pro";
  if (goals.includes("social")) return "growth";
  return "starter";
}

export async function onboardingPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
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
<input type="radio" name="plan" value="${p.slug}"${cur === p.slug ? " checked" : ""} style="width:auto"> <b>${p.name} - R${p.price.toLocaleString("en-ZA")}/month</b>${rec === p.slug ? ` <span class="pill ok recpill" style="margin-left:8px">Recommended</span>` : ""}<br>
<span class="mut">${p.feat}</span></label>`).join("")}
<script>
(function(){
  var boxes=document.querySelectorAll('input[name^="goal_"]');
  function recalc(){
    var g=[];boxes.forEach(function(b){if(b.checked)g.push(b.name.slice(5));});
    var r=g.indexOf('leads')>=0?'business-pro':(g.indexOf('social')>=0?'growth':'starter');
    document.querySelectorAll('input[name="plan"]').forEach(function(p){
      var card=p.closest('label');
      var old=card.querySelector('.recpill');if(old)old.remove();
      if(p.value===r){var sp=document.createElement('span');sp.className='pill ok recpill';sp.style.marginLeft='8px';sp.textContent='Recommended';card.querySelector('b').after(sp);}
      if(!p.dataset.touched)p.checked=(p.value===r);
      card.style.borderColor=p.checked?'var(--brand)':'var(--line)';
    });
  }
  document.querySelectorAll('input[name="plan"]').forEach(function(p){p.addEventListener('change',function(){p.dataset.touched='1';document.querySelectorAll('input[name="plan"]').forEach(function(q){q.closest('label').style.borderColor=q.checked?'var(--brand)':'var(--line)';});});});
  boxes.forEach(function(b){b.addEventListener('change',recalc);});
  recalc();
})();
</script>
<p class="mut">Plans are billed monthly from day one - no setup fee. You can change plans any time on the billing page.</p>
<button>Save and continue</button>
</form></div>`, user);
}


async function waitlistPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  await waitlistExpire(db, mem.workspace_id);
  const r = await db.query(
    `SELECT w.*, c.name AS contact_name, c.wa_id FROM receptionist_waitlistentry w
     JOIN receptionist_contact c ON c.id=w.contact_id
     WHERE w.workspace_id=$1 ORDER BY CASE WHEN w.status IN ('waiting','offered') THEN 0 ELSE 1 END, w.created_at LIMIT 40`, [mem.workspace_id]);
  const badge: any = { waiting: "<b>waiting</b>", offered: '<span class="pill warn">offered</span>', accepted: '<span class="ok">accepted</span>', cancelled: '<span class="mut">cancelled</span>', expired: '<span class="mut">expired</span>' };
  const rows = r.rows.map((w: any) => `<tr>
<td><b>${esc(w.contact_name || w.wa_id)}</b><br><span class="mut">party of ${w.party_size}${w.wanted_time ? " · " + esc(w.wanted_time) : ""}</span></td>
<td>${badge[w.status] || esc(w.status)}${w.status === "offered" ? `<br><span class="mut">${w.offer_minutes} min to answer</span>` : ""}</td>
<td>${w.status === "waiting" ? `<form class="inline" method="post" action="/waitlist/${w.id}/offer"><button>Offer a table</button></form>` : ""}
${w.status === "offered" ? `<form class="inline" method="post" action="/waitlist/${w.id}/accept"><button>They accepted</button></form>` : ""}
${["waiting", "offered"].includes(w.status) ? `<form class="inline" method="post" action="/waitlist/${w.id}/cancel"><button class="link">Remove</button></form>` : ""}</td></tr>`).join("");
  return layout("Waitlist", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Add a waiting party</h2>
<form method="post" action="/waitlist">
<label>Name<input name="name" maxlength="120"></label>
<label>WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27…"></label>
<label>Party size<input name="party_size" type="number" min="1" max="30" value="2" style="width:90px"></label>
<label>They hoped for<input name="wanted_time" maxlength="200" placeholder="tonight around 7"></label>
<button>Add to the waitlist</button></form></div>
<div class="card">${r.rows.length ? `<table><tr><th>Party</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">Nobody waiting. When the restaurant is full, add parties here and offer tables as they open up.</p>`}</div>`, user);
}

async function loyaltyPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const s = await loyaltySettings(db, mem.workspace_id);
  const accounts = await db.query(
    `SELECT a.*, c.name AS contact_name, c.wa_id FROM receptionist_loyaltyaccount a
     JOIN receptionist_contact c ON c.id=a.contact_id WHERE a.workspace_id=$1 ORDER BY a.balance DESC LIMIT 50`, [mem.workspace_id]);
  const vouchers = await db.query(
    `SELECT v.*, c.name AS contact_name FROM receptionist_voucher v
     JOIN receptionist_contact c ON c.id=v.contact_id WHERE v.workspace_id=$1 ORDER BY v.created_at DESC LIMIT 30`, [mem.workspace_id]);
  const aRows = accounts.rows.map((a: any) => `<tr><td><b>${esc(a.contact_name || a.wa_id)}</b></td><td>${a.balance} pts</td><td class="mut">${a.lifetime_points} lifetime</td>
<td>${a.balance >= s.points_for_voucher ? `<form class="inline" method="post" action="/loyalty/vouchers/new"><input type="hidden" name="contact_id" value="${a.contact_id}"><button>Issue R${s.voucher_value_rand} voucher</button></form>` : `<span class="mut">${s.points_for_voucher - a.balance} to go</span>`}</td></tr>`).join("");
  const vRows = vouchers.rows.map((v: any) => `<tr><td><b>${esc(v.code)}</b></td><td>${esc(v.contact_name)}</td><td>R${v.amount_rand}</td>
<td>${v.status === "active" ? '<span class="ok">active</span>' : esc(v.status)}</td>
<td class="mut">to ${new Date(v.expires_at).toLocaleDateString("en-ZA")}</td>
<td>${v.status === "active" ? `<form class="inline" method="post" action="/loyalty/vouchers/${v.id}/redeem"><button class="link">Redeem</button></form>` : ""}</td></tr>`).join("");
  return layout("Loyalty", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Rules</h2>
<form method="post" action="/loyalty/settings">
<label>Programme <select name="enabled"><option value="on" ${s.enabled ? "selected" : ""}>on</option><option value="off" ${!s.enabled ? "selected" : ""}>off</option></select></label>
<label>Points per visit<input name="points_per_visit" type="number" min="0" value="${s.points_per_visit}" style="width:100px"></label>
<label>Welcome bonus<input name="welcome_bonus" type="number" min="0" value="${s.welcome_bonus}" style="width:100px"></label>
<label>Points for a voucher<input name="points_for_voucher" type="number" min="1" value="${s.points_for_voucher}" style="width:100px"></label>
<label>Voucher value (R)<input name="voucher_value_rand" type="number" min="1" value="${s.voucher_value_rand}" style="width:100px"></label>
<label>Valid days<input name="voucher_valid_days" type="number" min="1" value="${s.voucher_valid_days}" style="width:100px"></label>
<button>Save rules</button></form>
<p class="mut">Customers earn points automatically when you mark a booking done. First visit earns the welcome bonus.</p></div>
<h2>Customers</h2>
<div class="card">${accounts.rows.length ? `<table><tr><th>Customer</th><th>Balance</th><th>Lifetime</th><th></th></tr>${aRows}</table>` : `<p class="mut">No points yet. Mark a booking done and the customer starts earning.</p>`}</div>
<h2>Vouchers</h2>
<div class="card">${vouchers.rows.length ? `<table><tr><th>Code</th><th>Customer</th><th>Value</th><th>Status</th><th>Valid</th><th></th></tr>${vRows}</table>` : `<p class="mut">No vouchers issued yet.</p>`}</div>`, user);
}




async function supportPage(db: Pool, user: any, mem: any): Promise<string> {
  const r = await db.query(`SELECT * FROM receptionist_supportmessage WHERE workspace_id=$1 ORDER BY created_at LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((m: any) => {
    const src = Array.isArray(m.sources) && m.sources.length ? `<br><span class="mut">Grounded in: ${m.sources.map((x: string) => esc(x)).join(" · ")}</span>` : "";
    const conf = m.role === "assistant" ? `<br><span class="mut">Confidence ${m.confidence}%${m.escalated ? " · flagged for a human" : ""}</span>` : "";
    return m.role === "owner"
      ? `<div class="card" style="background:var(--brand-soft)"><b>You:</b> ${esc(m.text)}</div>`
      : `<div class="card"><b>Support:</b> ${esc(m.text)}${src}${conf}</div>`;
  }).join("");
  return layout("Support", `
<div class="card"><h2 style="margin-top:0">Ask about your numbers</h2>
<form method="post" action="/support">
<label>Question<textarea name="question" required placeholder="How many bookings do we have today?"></textarea></label>
<button>Ask</button></form>
<p class="mut">Answers come only from your own data, with confidence and sources shown. Anything it cannot ground gets flagged for a human - it never invents figures.</p></div>
${rows || `<div class="card"><p class="mut">No questions yet.</p></div>`}`, user);
}

async function competitorsPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  await refreshOpportunities(db, mem.workspace_id);
  const rmq = await db.query(`SELECT revenue_mode FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const revMode = rmq.rows[0]?.revenue_mode || "suggest";
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [mem.workspace_id]);
  const menu = await db.query(`SELECT id, name, price FROM menus_item WHERE workspace_id=$1 ORDER BY position LIMIT 100`, [mem.workspace_id]);
  const opps = await db.query(
    `SELECT o.*, c.name AS competitor_name FROM receptionist_marketopportunity o
     LEFT JOIN receptionist_competitor c ON c.id=o.competitor_id
     WHERE o.workspace_id=$1 ORDER BY CASE o.status WHEN 'new' THEN 0 WHEN 'acted' THEN 1 ELSE 2 END, o.confidence DESC, o.updated_at DESC LIMIT 30`, [mem.workspace_id]);
  const kindLabel: any = { price_gap: "Price gap", price_advantage: "Price advantage", rating_gap: "Rating gap", promo: "Competitor promotion", demand: "Demand" };
  const compCards: string[] = [];
  for (const c of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`, [c.id]);
    const promos = await db.query(`SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 ORDER BY created_at DESC LIMIT 5`, [c.id]);
    const dishRows = dishes.rows.map((d: any) => `<tr><td>${esc(d.name)}</td><td>R${Number(d.price).toFixed(2)}</td>
<td>${d.own_name ? `${esc(d.own_name)} (yours R${Number(d.own_price).toFixed(2)})` : '<span class="mut">not mapped</span>'}</td></tr>`).join("");
    const promoRows = promos.rows.map((p: any) => `<li>${esc(p.text)}${p.valid_until ? ` <span class="mut">to ${new Date(p.valid_until).toLocaleDateString("en-ZA")}</span>` : ""}</li>`).join("");
    const menuOpts = ['<option value="">(map to your menu)</option>', ...menu.rows.map((m: any) => `<option value="${m.id}">${esc(m.name)} R${Number(m.price).toFixed(2)}</option>`)].join("");
    compCards.push(`<div class="card"><h3 style="margin-top:0">${esc(c.name)} <span class="mut">${esc(c.area || "")}${c.rating !== null ? ` · their Google ${c.rating}` : ""}</span></h3>
${dishes.rows.length ? `<table><tr><th>Their dish</th><th>Price</th><th>Mapped to</th></tr>${dishRows}</table>` : `<p class="mut">No dishes logged yet.</p>`}
<form method="post" action="/competitors/${c.id}/dishes" style="margin-top:10px">
<input name="name" required maxlength="120" placeholder="Their dish" style="width:180px">
<input name="price" type="number" min="0" step="0.01" required placeholder="R" style="width:90px">
<select name="own_item_id">${menuOpts}</select>
<button>Add dish</button></form>
${promos.rows.length ? `<ul>${promoRows}</ul>` : ""}
<form class="inline" method="post" action="/competitors/${c.id}/promos">
<input name="text" required maxlength="200" placeholder="Promotion they are running" style="width:280px">
<input name="valid_until" type="date">
<button>Log promo</button></form></div>`);
  }
  const oppRows = opps.rows.map((o: any) => {
    const ev = Array.isArray(o.evidence) ? o.evidence : [];
    return `<tr>
<td><b>${esc(o.title)}</b><br><span class="mut">${kindLabel[o.kind] || esc(o.kind)}${o.competitor_name ? " · " + esc(o.competitor_name) : ""} · confidence ${o.confidence}%${o.impact_rand !== null ? ` · about R${Number(o.impact_rand).toLocaleString("en-ZA")}/month` : ""}</span><br>
${esc(o.detail)}${ev.length ? `<br><span class="mut">${ev.map((e: string) => esc(e)).join("<br>")}</span>` : ""}</td>
<td>${o.status === "new" ? "<b>new</b>" : o.status === "acted" ? '<span class="ok">acted on</span>' : '<span class="mut">dismissed</span>'}</td>
<td>${o.status === "new" ? `<form class="inline" method="post" action="/opportunities/${o.id}/draft"><button>Draft a campaign</button></form>
<form class="inline" method="post" action="/opportunities/${o.id}/acted"><button class="link">Acted on</button></form>
<form class="inline" method="post" action="/opportunities/${o.id}/dismissed"><button class="link">Dismiss</button></form>` : o.campaign_id ? `<a href="/campaigns">campaign</a>` : ""}</td></tr>`;
  }).join("");
  return layout("Competitors", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<h2>Opportunities</h2>
<div class="card">${opps.rows.length ? `<table><tr><th>Opportunity</th><th>Status</th><th></th></tr>${oppRows}</table>` : `<p class="mut">No opportunities right now. Log competitors, their dishes and their promos below and the board fills itself.</p>`}</div>
<h2>Competitors</h2>
<div class="card"><form method="post" action="/competitors">
<input name="name" required maxlength="120" placeholder="Competitor name" style="width:180px">
<input name="area" maxlength="120" placeholder="Area" style="width:140px">
<input name="rating" type="number" min="0" max="5" step="0.1" placeholder="Google rating" style="width:110px">
<input name="website" maxlength="200" placeholder="Website" style="width:180px">
<button>Track competitor</button></form>
<p class="mut">Adding the same name again updates it.</p></div>
${compCards.join("")}
<h2>Revenue Employee</h2>
<div class="card"><form method="post" action="/revenue-mode">
<label>Mode <select name="mode">
<option value="suggest" ${revMode === "suggest" ? "selected" : ""}>Suggest only - opportunities appear on this board</option>
<option value="draft" ${revMode === "draft" ? "selected" : ""}>Prepare drafts - strong opportunities also become campaign drafts</option>
</select></label>
<button>Save mode</button></form>
<p class="mut">You approve every send yourself, in every mode. Nothing ever sends itself.</p></div>`, user);
}

async function campaignsPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const r = await db.query(`SELECT * FROM receptionist_campaign WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 30`, [mem.workspace_id]);
  const rows: string[] = [];
  for (const c of r.rows) {
    const st = await campaignStats(db, c.id);
    const segLabel: any = { all: "every customer", dormant: "dormant 30+ days", vip: "VIPs" };
    const fmt = (v: any) => v ? `${v.sent}/${v.total} sent${Number(v.failed) ? `, ${v.failed} failed` : ""}${Number(v.skipped) ? `, ${v.skipped} skipped` : ""} · ${v.bookings} bookings · R${Number(v.revenue).toLocaleString("en-ZA")}` : "";
    const variantB = c.body_b ? `<br><span class="mut">B: ${fmt(st.b)}</span>` : "";
    rows.push(`<tr>
<td><b>${esc(c.name)}</b><br><span class="mut">${segLabel[c.segment] || esc(c.segment)}${c.scheduled_at ? " · " + new Date(c.scheduled_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : ""}</span></td>
<td>${c.status === "sent" ? '<span class="ok">sent</span>' : c.status === "draft" ? "<b>draft</b>" : c.status === "cancelled" ? '<span class="mut">cancelled</span>' : `<span class="pill warn">${esc(c.status)}</span>`}</td>
<td>${fmt(st.a)}${variantB}</td>
<td>${c.status === "draft" ? `<form class="inline" method="post" action="/campaigns/${c.id}/approve"><input type="datetime-local" name="when" style="width:auto"><button>Approve & send</button></form>` : ""}
${["draft", "scheduled"].includes(c.status) ? `<form class="inline" method="post" action="/campaigns/${c.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`);
  }
  const nAll = (await segmentContacts(db, mem.workspace_id, "all")).length;
  const nDormant = (await segmentContacts(db, mem.workspace_id, "dormant")).length;
  const nVip = (await segmentContacts(db, mem.workspace_id, "vip")).length;
  return layout("Campaigns", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">New campaign</h2>
<form method="post" action="/campaigns">
<label>Name<input name="name" required maxlength="120" placeholder="November win-back"></label>
<label>Segment<select name="segment">
<option value="all">Every customer (${nAll})</option>
<option value="dormant">Dormant - no visit in 30+ days (${nDormant})</option>
<option value="vip">VIP customers (${nVip})</option>
</select></label>
<label>Message<textarea name="body_a" required placeholder="Hi {first name}, ..."></textarea></label>
<label>B version (optional - half get each)<textarea name="body_b"></textarea></label>
<button>Save draft</button></form>
<p class="mut">Use {first name} for the customer's first name. Sends start after you approve; customers who never messaged you or opted out are skipped automatically. Nothing sends itself.</p></div>
<div class="card">${r.rows.length ? `<table><tr><th>Campaign</th><th>Status</th><th>Delivery</th><th></th></tr>${rows.join("")}</table>` : `<p class="mut">No campaigns yet.</p>`}</div>`, user);
}

async function quotesPage(db: Pool, user: any, mem: any, msg = ""): Promise<string> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const r = await db.query(
    `SELECT q.*, c.name AS contact_name FROM receptionist_quote q
     LEFT JOIN receptionist_contact c ON c.id=q.contact_id
     WHERE q.workspace_id=$1 ORDER BY CASE q.status WHEN 'draft' THEN 0 WHEN 'sent' THEN 1 WHEN 'won' THEN 2 ELSE 3 END, q.follow_up_on NULLS LAST, q.created_at DESC LIMIT 50`, [mem.workspace_id]);
  const contacts = await db.query(`SELECT id, name, wa_id FROM receptionist_contact WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT 100`, [mem.workspace_id]);
  const opts = ['<option value="">(no linked customer)</option>', ...contacts.rows.map((c: any) => `<option value="${c.id}">${esc(c.name || c.wa_id)}</option>`)].join("");
  const rows = r.rows.map((q: any) => {
    const chase = q.status === "sent" && q.follow_up_on && new Date(q.follow_up_on) <= new Date(today + "T00:00:00");
    return `<tr${chase ? ' style="background:#fff7ed"' : ""}>
<td><b>${esc(q.customer_name)}</b><br><span class="mut">${esc(q.title || "Quote")}</span></td>
<td>R${(q.amount_cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
<td>${q.status === "sent" ? '<span class="pill warn">sent</span>' : q.status === "won" ? '<span class="ok">won</span>' : q.status === "lost" ? '<span class="mut">lost</span>' : "<b>draft</b>"}
${chase ? `<br><span class="bad">chase today</span>` : q.follow_up_on ? `<br><span class="mut">chase ${new Date(q.follow_up_on).toLocaleDateString("en-ZA")}</span>` : ""}</td>
<td>${q.status === "draft" ? `<form class="inline" method="post" action="/quotes/${q.id}/sent"><button>Mark sent</button></form>` : ""}
${["draft", "sent"].includes(q.status) ? `<form class="inline" method="post" action="/quotes/${q.id}/won"><button class="link">Won</button></form> <form class="inline" method="post" action="/quotes/${q.id}/lost"><button class="link">Lost</button></form>` : ""}</td></tr>`;
  }).join("");
  const won = r.rows.filter((q: any) => q.status === "won").reduce((t: number, q: any) => t + q.amount_cents, 0) / 100;
  return layout("Quotes", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">New quote</h2>
<form method="post" action="/quotes">
<label>Customer name<input name="customer_name" required maxlength="200"></label>
<label>Link a customer (for WhatsApp send)<select name="contact_id">${opts}</select></label>
<label>What is it for<input name="title" maxlength="200" placeholder="Geyser replacement"></label>
<label>Amount (R)<input name="amount" type="number" min="0" step="0.01" required style="width:140px"></label>
<label>Chase on<input name="follow_up_on" type="date"></label>
<button>Save quote</button></form>
<p class="mut">Mark it sent when it goes out - a linked customer gets it on WhatsApp too. Chase rows highlight when the follow-up day arrives.</p></div>
<p class="mut">Won so far: <b>R${won.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</b></p>
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Amount</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No quotes yet.</p>`}</div>`, user);
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
  const contacts = await db.query(
    `SELECT id, name, wa_id, review_status, issue_note, opted_out FROM receptionist_contact
     WHERE workspace_id=$1 AND wa_id <> '' ORDER BY updated_at DESC LIMIT 50`, [mem.workspace_id]);
  const events = await db.query(
    `SELECT e.*, c.name AS contact_name FROM receptionist_reviewevent e
     JOIN receptionist_contact c ON c.id=e.contact_id
     WHERE e.workspace_id=$1 ORDER BY e.created_at DESC LIMIT 20`, [mem.workspace_id]);
  const contactOpts = contacts.rows.filter((c: any) => !c.opted_out).map((c: any) => `<option value="${c.id}">${esc(c.name || c.wa_id)}</option>`).join("");
  const evRows = events.rows.map((e: any) => `<tr>
<td>${esc(e.contact_name)}</td><td>${esc(e.step.replace("_", " "))}</td>
<td>${e.status === "sent" ? `<span class="ok">sent</span>` : e.status === "failed" ? `<span class="bad">failed</span>` : esc(e.status)}</td>
<td class="mut">${new Date(e.scheduled_for).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
<td class="mut">${e.error ? esc(e.error) : ""}</td></tr>`).join("");
  const issues = contacts.rows.filter((c: any) => c.review_status === "issue_flagged");
  const statusLabel: any = { new: "new", check_in_sent: "check-in sent", review_requested: "review asked", clicked: "clicked", unsubscribed: "opted out", issue_flagged: "issue" };
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
<div class="card">${links.rows.length ? `<table><tr><th>Customer</th><th>Link</th><th>Click</th><th>Created</th></tr>${rows}</table>` : `<p class="mut">No review links yet.</p>`}</div>

<h2>Review requests on WhatsApp</h2>
<div class="card">
<p>Automatic pipeline per finished visit: a friendly check-in 15 minutes after the job, the review request with a tracked link 2 hours later, and one reminder after 48 hours if the link was never clicked. Customers can reply STOP at any time. A negative reply to the check-in flags the customer here for a personal call first.</p>
<p><b>Status: ${b.review_requests_enabled ? '<span class="ok">ON</span>' : '<span class="bad">OFF</span>'}</b>
<form method="post" action="/reviews/toggle" style="display:inline"><button class="btn-secondary">${b.review_requests_enabled ? "Switch off" : "Switch on"}</button></form></p>
${b.review_requests_enabled && contacts.rows.length ? `<form method="post" action="/reviews/pipeline"><label>Mark a visit done<select name="contact_id">${contactOpts}</select></label><button>Start the pipeline</button></form>` : ""}
</div>

${issues.length ? `<h2>Needs a personal call</h2>
<div class="card">${issues.map((c: any) => `<p><b>${esc(c.name || c.wa_id)}</b>: ${esc(c.issue_note || "negative reply")} <form method="post" action="/reviews/resolve" style="display:inline"><input type="hidden" name="contact_id" value="${c.id}"><button class="link">Resolved</button></form></p>`).join("")}</div>` : ""}

<h2>Pipeline activity</h2>
<div class="card">${events.rows.length ? `<table><tr><th>Customer</th><th>Step</th><th>Status</th><th>When</th><th>Note</th></tr>${evRows}</table>` : `<p class="mut">Nothing yet. Mark a visit done above to start the flow.</p>`}</div>

<h2>Customers</h2>
<div class="card">${contacts.rows.length ? `<table><tr><th>Name</th><th>Phone</th><th>Review status</th></tr>${contacts.rows.map((c: any) => `<tr><td>${esc(c.name || "-")}</td><td class="mut">${esc(c.wa_id)}</td><td>${c.opted_out ? '<span class="bad">opted out</span>' : esc(statusLabel[c.review_status] || c.review_status || "new")}</td></tr>`).join("")}</table>` : `<p class="mut">No customers yet.</p>`}</div>`, user);
}


export function newPostPage(user: any, mem: any, pre: Record<string, string>, msg = ""): string {
  return layout("New post", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/posts/draft">
${pre.media ? `<input type="hidden" name="media" value="${esc(pre.media)}">` : ""}
<label>Topic<input name="topic" maxlength="200" value="${esc(pre.topic || "")}" placeholder="e.g. teeth whitening special this month" required></label>
<button class="btn-secondary">Write a draft</button>
</form></div>
${pre.media ? `<div class="card"><h2 style="margin-top:0">Attached image</h2><img src="/media/${esc(pre.media)}/raw" style="max-width:280px;border-radius:8px"></div>` : ""}
<div class="card"><form method="post" action="/posts/new">
${pre.media ? `<input type="hidden" name="media_id" value="${esc(pre.media)}">` : ""}
<label>Title<input name="title" maxlength="200" value="${esc(pre.title || "")}" placeholder="Internal title"></label>
<label>Caption<textarea name="caption" rows="6" placeholder="What should go out?">${esc(pre.caption || "")}</textarea></label>
<button>Save draft</button>
<p class="mut">Creates a draft for every connected channel. Scheduling and publishing run on the current pipeline.</p>
</form></div>`, user);
}

async function intakeBoards(db: Pool, mem: any): Promise<string> {
  const bp = await db.query(`SELECT industry FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const industry = bp.rows[0]?.industry || "";
  const board = async (table: string, title: string, cols: (t: any) => string) => {
    const r = await db.query(
      `SELECT t.*, c.name AS contact_name, c.wa_id FROM ${table} t JOIN receptionist_contact c ON c.id=t.contact_id
       WHERE t.workspace_id=$1 ORDER BY t.created_at DESC LIMIT 20`, [mem.workspace_id]);
    if (!r.rows.length) return "";
    const rows = r.rows.map((t: any) => `<tr><td><b>${esc(t.contact_name || t.wa_id)}</b></td><td>${cols(t)}</td>
<td>${t.status === "resolved" ? '<span class="ok">resolved</span>' : esc(t.status)}</td>
<td>${t.status !== "resolved" ? `<form class="inline" method="post" action="/inbox/intake/${table}/${t.id}/resolve"><button class="link">Resolve</button></form>` : ""}</td></tr>`).join("");
    return `<h2>${title}</h2><div class="card"><table><tr><th>Customer</th><th>Details</th><th>Status</th><th></th></tr>${rows}</table></div>`;
  };
  let h = "";
  if (industry === "funeral") h += await board("receptionist_funeralclaim", "Funeral claims", (t: any) => esc([t.deceased_name, t.claimant_name && `claimant: ${t.claimant_name}`, t.policy_number && `policy: ${t.policy_number}`].filter(Boolean).join(" · ")));
  if (industry === "dental") h += await board("receptionist_dentalappointment", "Appointment requests", (t: any) => esc([t.patient_name, t.reason].filter(Boolean).join(" · ")));
  if (industry === "trades") h += await board("receptionist_tradedispatch", "Job dispatch", (t: any) => esc([t.job_type, t.address].filter(Boolean).join(" · ")));
  return h;
}

export async function leadPipelinePage(db: Pool,user: any,mem: any): Promise<string> {
        const leads = await db.query(`SELECT * FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`, [mem.workspace_id]);
        const drafts = await db.query(`SELECT * FROM frontdesk_followup_draft WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
        const totals = await db.query(`SELECT stage, count(*) c, coalesce(sum(value_cents),0) v FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [mem.workspace_id]);
        const tmap: Record<string, any> = {}; for (const t of totals.rows) tmap[t.stage] = t;
        const STAGES = ["new", "contacted", "quoted", "won", "lost"];
        const summary = STAGES.map((s) => `<div class="card"><h2 style="text-transform:capitalize">${s}</h2><p class="stat">${tmap[s]?.c || 0}</p><p class="mut">R${((tmap[s]?.v || 0) / 100).toLocaleString("en-ZA")}</p></div>`).join("");
        const byLead: Record<string, any[]> = {}; for (const d of drafts.rows) (byLead[d.lead_id] = byLead[d.lead_id] || []).push(d);
        const rows = leads.rows.map((l: any) => {
          const ds = (byLead[l.id] || []).map((d: any) => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0">
<div class="mut" style="font-size:13px">Follow-up draft · ${esc(d.status)} · ${new Date(d.created_at).toLocaleString("en-ZA")}</div>
<div style="white-space:pre-wrap">${esc(d.body)}</div>
${d.status === "draft" ? `<form method="post" action="/frontdesk/draft/${d.id}/approve" style="margin-top:6px"><button>Mark approved</button></form>` : ""}</div>`).join("");
          return `<tr>
<td data-label="Lead"><b>${esc(l.name)}</b><br><span class="mut">${esc(l.contact)}</span></td>
<td data-label="Enquiry + follow-ups">${esc(l.message.slice(0, 100))}${ds}</td>
<td data-label="Stage and value"><form method="post" action="/frontdesk/${l.id}/save" class="lead-stage-form">
<select name="stage">${STAGES.map((s) => `<option${l.stage === s ? " selected" : ""}>${s}</option>`).join("")}</select>
<input name="value" type="number" min="0" step="0.01" value="${(l.value_cents / 100).toFixed(2)}" style="width:90px" title="Value (ZAR)">
<button>Save</button></form>
<form method="post" action="/frontdesk/${l.id}/draft" style="margin-top:6px"><button>Draft follow-up</button></form></td>
<td class="mut" data-label="Received">${new Date(l.created_at).toLocaleString("en-ZA")}</td></tr>`;
        }).join("");
        return layout("Leads", `
<style>
.lead-stage-form{display:flex;gap:6px;align-items:center}
@media(max-width:640px){.lead-pipeline{table-layout:fixed}.lead-pipeline td{overflow-wrap:anywhere}.lead-pipeline td::before{content:attr(data-label);display:block;font-size:12px;font-weight:600;color:var(--ink3);margin-top:8px}.lead-stage-form{flex-wrap:wrap}.lead-stage-form select{width:100%;min-width:0}.lead-stage-form input{max-width:calc(100% - 95px)}.lead-pipeline form button{max-width:100%}}
</style>
<p class="mut">Your public enquiry form: <a href="/f/${mem.workspace_id}" target="_blank" rel="noopener">/f/${mem.workspace_id.slice(0, 8)}…</a> - share it anywhere. Enquiries land here and in your inbox.</p>
<div class="grid">${summary}</div>
<div class="card">${leads.rows.length ? `<table class="rtable lead-pipeline"><tr><th>Lead</th><th>Enquiry + follow-ups</th><th>Stage · value (ZAR)</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No enquiries yet. Share your enquiry form link to start capturing leads.</p>`}</div>`, user);
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
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Latest</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No customer conversations yet. When customers WhatsApp the business, they appear here.</p>`}</div>
${await intakeBoards(db, mem)}`, user);
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
<div class="mut" style="font-size:13px;${out ? "color:#ffe7d6" : ""}">${esc(who[m.sender_type] || m.sender_type)} · ${new Date(m.created_at).toLocaleString("en-ZA")}</div>
<div>${esc(m.body)}</div></div></div>`;
  }).join("");
  return html(layout(`Chat: ${esc(c.rows[0].name || c.rows[0].wa_id)}`, `
<p><a href="/inbox">&larr; all conversations</a></p>
<div class="card"><h2 style="margin-top:0">Customer card</h2>
<form method="post" action="/inbox/${c.rows[0].id}/card">
<label>Name<input name="name" maxlength="120" value="${esc(c.rows[0].name || "")}"></label>
<label>Birthday<input name="birthday" type="date" value="${c.rows[0].birthday ? new Date(c.rows[0].birthday).toISOString().slice(0, 10) : ""}"></label>
<label>Dietary / preferences<input name="dietary_notes" maxlength="200" value="${esc(c.rows[0].dietary_notes || "")}"></label>
<label>Lifetime spend (R)<input name="total_spend" inputmode="decimal" value="${esc(String(c.rows[0].total_spend ?? "0"))}" style="width:140px"></label>
<label><input type="checkbox" name="is_vip" ${c.rows[0].is_vip ? "checked" : ""} style="width:auto"> VIP</label>
<label>Private notes<textarea name="notes">${esc(c.rows[0].notes || "")}</textarea></label>
<button>Save card</button></form>
<p class="mut">${c.rows[0].visit_count || 0} visits${c.rows[0].opted_out ? " · opted out of automated messages" : ""}</p></div>
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

export async function billingPage(db: Pool, user: any, mem: any, base: string, env: Env): Promise<string> {
  // One payment link per plan. Each tap is a single card payment for one
  // month - no stored card, no automatic charge. Activation happens when
  // the payment lands (confirmed against the payment dashboard).
  const YOCO_LINKS: Record<string, string> = {
    starter: "https://pay.yoco.com/r/3aokXR",
    growth: "https://pay.yoco.com/r/YPK6qk",
    "business-pro": "https://pay.yoco.com/r/RM1dbq",
  };
  const plans = [
    { slug: "starter", name: "Starter", price: 499, feat: "1 workspace · core publishing" },
    { slug: "growth", name: "Growth", price: 999, feat: "3 workspaces · approvals · reviews" },
    { slug: "business-pro", name: "Business Pro", price: 1999, feat: "everything in Growth · lead pipeline + follow-ups · 3 channels" },
  ];
  const cards = plans.map((p) => `<div class="card"><h2>${p.name}</h2>
<p style="font-size:26px;margin:0">R${p.price.toLocaleString("en-ZA")}<span class="mut">/month</span></p>
<p class="mut">${p.feat}</p>
${p.slug === mem.plan
  ? (mem.subscription_status === "active" ? `<p class="pill">current plan</p>` : `<a class="btn btn-primary" href="${YOCO_LINKS[p.slug]}" target="_blank" rel="noopener">Activate - pay R${p.price.toLocaleString("en-ZA")}</a>`)
  : `<a class="btn btn-primary" href="${YOCO_LINKS[p.slug]}" target="_blank" rel="noopener">Pay R${p.price.toLocaleString("en-ZA")}</a>`}
</div>`).join("");
  return layout("Billing", `
<p>Plan <b>${esc(mem.plan)}</b> · status <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(statusLabel(mem.subscription_status))}</span>
${mem.payment_reference ? ` · ref <span class="mut">${esc(mem.payment_reference)}</span>` : ""}</p>
${mem.activated_at ? `<p class="mut">Active since ${new Date(mem.activated_at).toLocaleDateString("en-ZA")}</p>` : ""}
<div class="grid">${cards}</div>
<p class="mut">Tap your plan to pay securely by card, in rand. Each month is a fresh payment - we never charge your card automatically. Your plan activates when your payment lands, usually within a few hours on business days. You can cancel any time.</p>`, user);
}

// ---------- router ----------
function withSecurity(res: Response, path: string): Response {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // /f/<ws> is the public enquiry form customers embed on their own sites.
  if (!path.startsWith("/f/")) h.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export async function bookingsPage(db:Pool,user:any,mem:any,env:any,url:URL):Promise<Response>{
        const bk = await db.query(
          `SELECT b.*, c.name AS contact_name, c.wa_id FROM receptionist_booking b
           JOIN receptionist_contact c ON c.id=b.contact_id
           WHERE b.workspace_id=$1 ORDER BY b.created_at DESC LIMIT 50`, [mem.workspace_id]);
        const msg = url.searchParams.get("msg") || "";
        const calendar=(await db.query("SELECT google_email,calendar_id FROM receptionist_calendarconnection WHERE workspace_id=$1",[mem.workspace_id])).rows[0];

        const rows = bk.rows.map((b: any) => `<tr>
<td data-label="Customer"><b>${esc(b.contact_name || b.wa_id)}</b><br><span class="mut">${esc(b.service || "booking")}</span></td>
<td data-label="Time" class="mut">${b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : esc(b.preferred_time || "to confirm")}${b.table_label ? `<br><span class="pill pill-live">${esc(b.table_label)}</span>` : ""}</td>
<td data-label="Status">${b.status === "confirmed" ? '<span class="ok">confirmed</span>' : b.status === "done" ? "done" : b.status === "cancelled" ? '<span class="mut">cancelled</span>' : "<b>requested</b>"}</td>
<td data-label="Actions">${b.status === "requested" ? `<form class="inline" method="post" action="/bookings/${b.id}/confirm"><input type="datetime-local" aria-label="Confirm booking time" name="when" required style="width:auto"><input name="table_label" maxlength="40" placeholder="Table (optional)" style="width:110px"><button>Confirm</button></form>` : ""}
${b.status === "confirmed" ? `<form class="inline" method="post" action="/bookings/${b.id}/move"><label>Move to<input type="datetime-local" name="when" required value="${b.scheduled_start?new Date(new Date(b.scheduled_start).getTime()+7200000).toISOString().slice(0,16):''}"></label><input name="table_label" maxlength="40" value="${esc(b.table_label||'')}" placeholder="Table (optional)"><button>Move booking</button></form><form class="inline" method="post" action="/bookings/${b.id}/done"><button>Mark done</button></form>` : ""}
${["requested", "confirmed"].includes(b.status) ? `<form class="inline" method="post" action="/bookings/${b.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`).join("");
        return html(layout("Bookings", `
${msg ? `<p class="booking-notice ${/^(Booking confirmed|Booking cancelled|Google Calendar connected|Google Calendar disconnected)/.test(msg)?"ok":"bad"}" role="status">${esc(msg)}</p>` : ""}
<style>
.booking-notice.bad{color:#a32222}.booking-table td{overflow-wrap:anywhere}.booking-table form{max-width:100%}
@media(max-width:600px){.booking-table,.booking-table tbody,.booking-table tr,.booking-table td{display:block;width:100%;box-sizing:border-box}.booking-table tr:first-child{display:none}.booking-table tr{padding:10px 0 18px;border-bottom:1px solid #ddd}.booking-table td{padding:8px 0;border:0}.booking-table td:before{content:attr(data-label);display:block;font-size:12px;font-weight:700;color:#5f5b56;margin-bottom:4px}.booking-table form.inline{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0;width:100%}.booking-table label{display:block;max-width:100%;width:100%}.booking-table input{box-sizing:border-box;min-width:0!important;max-width:100%!important;width:100%!important}.booking-table button{max-width:100%}}
</style>
${calendarPanel(calendar,calendarConfigured(env))}
<p class="mut">Booking requests land here from your WhatsApp receptionist. Confirm a time, and when the job is finished mark it done - that starts the review request flow automatically.</p>
<div class="card">${bk.rows.length ? `<table class="booking-table"><tr><th>Customer</th><th>Time</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No bookings yet. When a customer books on WhatsApp, it shows up here.</p>`}</div>`, user));
      
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const res = await handle(req, env);
    return withSecurity(res, new URL(req.url).pathname);
  },
  async scheduled(_event: any, env: Env, ctx: any): Promise<void> {
    const db = pool(env);
    try {
      ctx.waitUntil((async () => {
        await runDueReviewEvents(db, env, "https://revup.nahalabs.co.za");
        await runDueServiceReminders(db, env);
        await expireVouchers(db);
        await runDueCampaigns(db, env);
        await autoDraftOpportunities(db);
        await db.end().catch(() => {});
      })());
    } catch { await db.end().catch(() => {}); }
  },
};

async function handle(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const base = url.origin;
    const path = url.pathname;

    if (path.startsWith("/t/")) {
      const slug = path.slice(3).replace(/[^a-z0-9]/gi, "").slice(0, 24);
      const db = pool(env);
      try {
        const r = await db.query(`UPDATE cf_prospect_link SET click_count=click_count+1, first_clicked_at=COALESCE(first_clicked_at,now()), last_clicked_at=now() WHERE lower(slug)=lower($1) RETURNING target_url`, [slug]);
        await db.end().catch(() => {});
        const dest = r.rows[0]?.target_url || "https://revup.nahalabs.co.za/?ref=" + slug;
        return new Response(null, { status: 302, headers: { location: dest } });
      } catch { await db.end().catch(() => {}); return redirect("/"); }
    }

    if ((path === "/webhooks/zernio" || path === "/webhooks/zernio/") && req.method === "POST") {
      const raw = await req.text();
      const sig = req.headers.get("x-zernio-signature") || req.headers.get("x-late-signature") || "";
      let payload: any = {};
      try { payload = JSON.parse(raw); } catch { return json({ ok: false }, 400); }
      if (!(await verifyZernioSignature(env.ZERNIO_WEBHOOK_SECRET || "", raw, sig.toLowerCase()))) {
        // maybe a tenant's own connection, signed with their per-tenant secret
        const tdb = pool(env);
        let tenantSecret = "";
        try { tenantSecret = await tenantWebhookSecret(tdb, payload); } finally { await tdb.end().catch(() => {}); }
        if (!tenantSecret || !(await verifyZernioSignature(tenantSecret, raw, sig.toLowerCase())))
          return json({ ok: false }, 403);
      }
      const eventId = String(payload.id || req.headers.get("x-zernio-event-id") || "");
      const db = pool(env);
      try {
        if (eventId) {
          const ins = await db.query(`INSERT INTO cf_webhook_event(id,event,received_at) VALUES($1,$2,now()) ON CONFLICT (id) DO NOTHING RETURNING id`, [eventId, String(payload.event || "")]);
          if (!ins.rows[0]) { await db.end().catch(() => {}); return json({ ok: true, deduped: true }); }
        }
        await handleZernioWebhook(db, env, payload);
        await db.end().catch(() => {});
        return json({ ok: true });
      } catch (e: any) {
        await db.end().catch(() => {});
        return json({ ok: false, error: String(e).slice(0, 200) }, 500);
      }
    }

    // ChatGPT app: OAuth 2.1 + read-only MCP server + privacy page (all public endpoints).
    const chatAppRes = await handleChatAppRoute(req, env, url, pool);
    if (chatAppRes) return chatAppRes;

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
          `UPDATE receptionist_reviewlink SET clicked_at=COALESCE(clicked_at, now()) WHERE short_code=$1 RETURNING original_url, contact_id, clicked_at`, [rm[1]]);
        if (!r.rows[0]) return html(layout("Link not found", `<p class="bad">This review link doesn't exist.</p>`), 404);
        await cancelPending(db, r.rows[0].contact_id, "reminder");
        await db.query(`UPDATE receptionist_contact SET review_status='clicked', updated_at=now() WHERE id=$1 AND review_status NOT IN ('unsubscribed','issue_flagged') AND NOT opted_out`, [r.rows[0].contact_id]);
        return new Response(null, { status: 302, headers: { location: r.rows[0].original_url } });
      } finally { await db.end().catch(() => {}); }
    }

    // Owner assistant vault (Business Pro): one-time collection link page.
    // Token-gated, write-only; the secret is stored AES-256-GCM encrypted and
    // no route ever returns a stored value.
    if (path.startsWith("/vault/c/") && req.method === "GET") {
      const token = path.split("/").pop() || "";
      if (!/^[A-Za-z0-9-]{20,80}$/.test(token)) return new Response("not found", { status: 404 });
      const { collectPage } = await import("./assistant");
      return new Response(collectPage(token), { headers: { "content-type": "text/html" } });
    }
    if (path === "/vault/save" && req.method === "POST") {
      const f = await formData(req);
      const token = String(f.token || ""), name = String(f.name || "").slice(0, 120), secret = String(f.secret || "");
      if (!token || !name || !secret) return new Response("missing fields", { status: 400 });
      const db = pool(env);
      try {
        const { consumeVaultLink, storeSecret } = await import("./assistant");
        const ws = await consumeVaultLink(db, token);
        if (!ws) return new Response("link used or unknown", { status: 403 });
        await storeSecret(db, env, ws, name, secret);
        return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;max-width:26rem;margin:3rem auto">Saved. It is write-only from here: nobody can read it back, not even you. Close this tab.</body>', { headers: { "content-type": "text/html" } });
      } finally { await db.end().catch(() => {}); }
    }

    // ITN receiver (PayFast server-to-server): triple-verified, activates the plan.
    if (path === "/billing/payfast-itn" && req.method === "POST") {
      const db = pool(env);
      try { return await handlePayfastItn(db, env, req); } finally { await db.end().catch(() => {}); }
    }

    // Reuse the existing shared-database recovery flow, including its email,
    // expiring tokens and single-use checks. Do not invent a second reset system.
    if (path === "/forgot-password" && req.method === "GET") return redirect("https://revup-8g3m.onrender.com/accounts/password/reset/");
    if ((path === "/legal/terms/" || path === "/legal/privacy/") && req.method === "GET") {
      const kind = path.includes("terms") ? "terms" : "privacy";
      return html(layout(kind === "terms" ? "Terms of Service" : "Privacy Policy", legalPage(kind)));
    }

    if (path === "/signup") {
      if (req.method === "GET") return html(signupPage());
      {
        const rl = pool(env);
        try { if (await rateLimited(rl, "signup", req, 10)) { await rl.end().catch(() => {}); return html(signupPage("Too many signups from this network today - please try again tomorrow."), 429); } await rl.end().catch(() => {}); }
        catch { await rl.end().catch(() => {}); }
      }
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
             VALUES($1,$2,'','Africa/Johannesburg','starter','pending_activation',$3,'','',NULL,$4,now(),now())`, [orgId, f.business.trim(), ref, email]);
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
        // Block networks already over the failed-attempt budget BEFORE running
        // bcrypt (cheap check first), then count only failures.
        if (await rateLimitExceeded(db, "login", req, 20)) return html(loginPage("Too many failed attempts from this network today - please try again tomorrow."), 429);
        const r = await db.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
        const row = r.rows[0];
        let ok = false;
        if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
          const v = await db.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
          ok = v.rows[0]?.ok === true;
        }
        if (!ok) { await rateLimited(db, "login", req, 20); return html(loginPage("Wrong email or password."), 401); }
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
          `SELECT w.id, w.name, o.plan, o.subscription_status FROM workspaces_workspace w JOIN organizations_organization o ON o.id=w.organization_id WHERE w.id=$1 AND w.is_archived=false AND o.deleted_at IS NULL`, [fm[1]]);
        const biz = w.rows[0];
        if (!biz || biz.plan !== "business-pro" || biz.subscription_status !== "active") return html(layout("Enquiries closed", `<div class="card"><p>This business is not taking online enquiries right now.</p></div>`), 404);
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

    // Public menu + order capture (no login). Renders for any live workspace
    // with at least one visible dish; orders are idempotent per day+basket.
    const mm = /^\/m\/([0-9a-f-]{36})(\/order)?$/.exec(path);
    if (mm) {
      const mdb = pool(env);
      try {
        const w = await mdb.query(
          `SELECT w.id, w.name, bp.business_name FROM workspaces_workspace w
           LEFT JOIN receptionist_businessprofile bp ON bp.workspace_id=w.id AND bp.is_active
           JOIN organizations_organization o ON o.id=w.organization_id
           WHERE w.id=$1 AND w.is_archived=false AND o.deleted_at IS NULL`, [mm[1]]);
        const biz = w.rows[0];
        if (!biz) return new Response("not found", { status: 404 });
        const items = (await loadMenu(mdb, mm[1])).filter((i: any) => i.is_available);
        const bizName = biz.business_name || biz.name;
        if (mm[2] && req.method === "POST") {
          const f = await formData(req);
          const ip = req.headers.get("cf-connecting-ip") || "";
          const r = await createOrder(mdb, mm[1], f, ip);
          return html(publicMenuHtml(bizName, items, mm[1], r.ok, r.err));
        }
        return html(publicMenuHtml(bizName, items, mm[1], false, ""));
      } finally { await mdb.end().catch(() => {}); }
    }

    // RevUp Pages - public landing pages (no login)
    const pm = /^\/p\/([a-z0-9-]{4,64})(\/go)?$/.exec(path);
    if (pm) {
      const pgdb = pool(env);
      try { return await servePublic(pgdb, pm[1], !!pm[2], req); }
      finally { await pgdb.end().catch(() => {}); }
    }

    // Public WiFi card sample (no login, demo data only): prospects can preview
    // the waiting-room card before signing up. Enquiry QR points at the Demo
    // Dental QA workspace form so the full scan loop can be tried live.
    if (path === "/wifi-card/sample") {
      return html(layout("Sample WiFi Card", wifiCardPage({ businessName: "Sample Dental Studio", enquiryUrl: `${base}/f/c72ce206-854d-48bc-bd56-726f53f23293`, prefill: { ssid: "SampleDental-Guest", pass: "Smile2026Guest" }, sample: true })));
    }

    // everything below needs auth
    const db = pool(env);
    try {
      if (path === "/favicon.ico") return new Response(Uint8Array.from(atob(FAVICON_ICO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/x-icon", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/favicon-32.png") return new Response(Uint8Array.from(atob(FAVICON_32_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/favicon-16.png") return new Response(Uint8Array.from(atob(FAVICON_16_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/apple-touch-icon.png" || path === "/apple-touch-icon.png") return new Response(Uint8Array.from(atob(APPLE_TOUCH_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/revup-og.png" || path === "/static/brand/revup-og-v2.png") return new Response(Uint8Array.from(atob(OG_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/qrcode.js") return new Response(QRCODE_LIB, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=86400" } });
      const user = await getUser(req, db);
      if (!user && path === "/") return html(landingPage());
      if (!user) return redirect("/login");
      const mem = await membership(db, user.id, req);
      if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);
      user._cur_ws = mem.workspace_name; user._ws_count = (mem.workspaces || []).length; user._goals = Array.isArray(mem.goals) ? mem.goals : [];

      if (path === "/pages") {
        await ensurePageTables(db);
        const msg = url.searchParams.get("msg") || "";
        return html(layout("Landing pages", await pagesListBody(db, mem, base, msg), user));
      }

      if (path === "/pages/new") {
        await ensurePageTables(db);
        if (req.method === "GET") return html(layout("New landing page", newPageBody(), user));
        const f = await formData(req);
        if (!(f.angle || "").trim()) return html(layout("New landing page", newPageBody("Tell us the one customer pain this page answers."), user), 400);
        if (await rateLimited(db, "pages", req, 40)) return html(layout("New landing page", newPageBody("Too many pages built today - please try again tomorrow."), user), 429);
        let skeleton = [{ type: "hero", words: 90 }, { type: "pains", words: 120 }, { type: "benefits", words: 160 }, { type: "how", words: 120 }, { type: "proof", words: 100 }, { type: "faq", words: 120 }, { type: "cta", words: 60 }];
        let sourceUrl = "";
        const mirrorUrl = (f.mirror_url || "").trim();
        if (mirrorUrl) {
          try {
            const src = await fetchForMirror(mirrorUrl);
            skeleton = mirrorStructure(src);
            sourceUrl = mirrorUrl.slice(0, 500);
          } catch (e: any) {
            return html(layout("New landing page", newPageBody("Could not read that page: " + String(e?.message || e).slice(0, 150)), user), 400);
          }
        }
        const brief = {
          business: (f.business || mem.workspace_name || "").trim().slice(0, 200),
          industry: (f.industry || "general").trim().slice(0, 40),
          angle: (f.angle || "").trim().slice(0, 200),
          offer: (f.offer || "").trim().slice(0, 300),
          area: (f.area || "").trim().slice(0, 120),
          whatsapp: (f.whatsapp || "").trim().slice(0, 20),
          cta_label: (f.cta_label || "WhatsApp us").trim().slice(0, 40),
        };
        let gen;
        try { gen = await generateSections(env, brief, skeleton); }
        catch { return html(layout("New landing page", newPageBody("The copywriter is busy right now - please try again in a minute."), user), 502); }
        const pageId = crypto.randomUUID();
        const slug = makeSlug(brief.business || "page");
        const title = (gen.seo_title || `${brief.business} - ${brief.angle}`).slice(0, 200);
        const brand = { business: brief.business, whatsapp: brief.whatsapp, cta_label: brief.cta_label, color: (f.color || "#F97316").slice(0, 7), area: brief.area, offer: brief.offer, link: "" };
        await db.query(
          `INSERT INTO cf_page(id,workspace_id,title,slug,angle,industry,status,brand,sections,source_url) VALUES($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9)`,
          [pageId, mem.workspace_id, title, slug, brief.angle, brief.industry, JSON.stringify(brand), JSON.stringify(gen.sections), sourceUrl]);
        return redirect("/pages/" + pageId);
      }

      const pam = /^\/pages\/([0-9a-f-]{36})(?:\/(publish|unpublish|delete))?$/.exec(path);
      if (pam) {
        await ensurePageTables(db);
        const pr = await db.query(`SELECT * FROM cf_page WHERE id=$1 AND workspace_id=$2`, [pam[1], mem.workspace_id]);
        const page: PageRow | undefined = pr.rows[0];
        if (!page) return html(layout("Page not found", `<p class="bad">That page does not exist.</p>`, user), 404);
        const action = pam[2] || "";
        if (req.method === "POST" && action === "publish") {
          await db.query(`UPDATE cf_page SET status='published', published_at=COALESCE(published_at,now()), updated_at=now() WHERE id=$1`, [page.id]);
          return redirect("/pages/" + page.id);
        }
        if (req.method === "POST" && action === "unpublish") {
          await db.query(`UPDATE cf_page SET status='draft', updated_at=now() WHERE id=$1`, [page.id]);
          return redirect("/pages/" + page.id);
        }
        if (req.method === "POST" && action === "delete") {
          await db.query(`UPDATE cf_page SET status='archived', updated_at=now() WHERE id=$1`, [page.id]);
          return redirect("/pages?msg=Page deleted");
        }
        if (req.method === "POST") {
          const f = await formData(req);
          const sections: PageSection[] = (page.sections || []).map((s, i) => ({
            type: s.type,
            heading: (f["h_" + i] ?? s.heading).slice(0, 140),
            body: (f["b_" + i] ?? s.body).slice(0, 800),
            items: String(f["i_" + i] ?? (s.items || []).join("\n")).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 140)),
          }));
          const brand = Object.assign({}, page.brand || {}, {
            cta_label: (f.cta_label || "WhatsApp us").slice(0, 40),
            whatsapp: (f.whatsapp || "").slice(0, 20),
            link: (f.link || "").slice(0, 500),
            color: (f.color || "#F97316").slice(0, 7),
          });
          await db.query(`UPDATE cf_page SET sections=$1, brand=$2, updated_at=now() WHERE id=$3`, [JSON.stringify(sections), JSON.stringify(brand), page.id]);
          return redirect("/pages/" + page.id);
        }
        return html(layout(page.title, await pageDetailBody(db, page, base, url.searchParams.get("msg") || ""), user));
      }

      if (path === "/switch") {
        if (req.method === "POST") {
          const f = await formData(req);
          const ok = (mem.workspaces || []).some((w: any) => w.id === f.workspace_id);
          if (!ok) return redirect("/switch");
          return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `cf_ws=${f.workspace_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 86400}` } });
        }
        const rows = (mem.workspaces || []).map((w: any) => `<tr>
<td><b>${esc(w.name)}</b><br><span class="mut">${esc(w.org)}</span></td>
<td>${esc(w.plan)} · ${esc(statusLabel(w.status))}</td>
<td>${w.id === mem.workspace_id ? `<span class="ok">Current</span>` : `<form method="post"><input type="hidden" name="workspace_id" value="${w.id}"><button>Switch</button></form>`}</td></tr>`).join("");
        return html(layout("Switch business", `
<div class="card"><table><tr><th>Business</th><th>Plan</th><th></th></tr>${rows}</table>
<p class="mut">Each business has its own posts, inbox, reviews and billing.</p></div>`, user));
      }

      if (path === "/prospects") {
        if (req.method === "POST") {
          const f = await formData(req);
          const name = (f.prospect || "").trim().slice(0, 200);
          const target = (f.target_url || "").trim().slice(0, 500);
          if (name) {
            const slug = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(36).padStart(2, "0")).join("").replace(/[^a-z0-9]/gi, "").slice(0, 10) || Math.random().toString(36).slice(2, 12);
            await db.query(`INSERT INTO cf_prospect_link(id,workspace_id,slug,prospect_name,target_url) VALUES($1,$2,$3,$4,$5)`,
              [crypto.randomUUID(), mem.workspace_id, slug, name, target || ("https://revup.nahalabs.co.za/?ref=" + slug)]);
          }
          return redirect("/prospects");
        }
        const links = await db.query(`SELECT * FROM cf_prospect_link WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
        const rows = links.rows.map((l: any) => `<tr>
<td><b>${esc(l.prospect_name)}</b></td>
<td><a href="${base}/t/${esc(l.slug)}" target="_blank" rel="noopener">/t/${esc(l.slug)}</a></td>
<td>${l.click_count > 0 ? `<span class="ok">${l.click_count} click${l.click_count === 1 ? "" : "s"}</span> <span class="mut">${l.last_clicked_at ? "last " + new Date(l.last_clicked_at).toLocaleString("en-ZA") : ""}</span>` : `<span class="mut">no clicks yet</span>`}</td></tr>`).join("");
        return html(layout("Prospect links", `
<div class="card"><h2 style="margin-top:0">New tracked link</h2>
<p class="mut">One unique link per prospect. When they open it, the click is recorded here and they land on your page.</p>
<form method="post"><label>Prospect name<input name="prospect" required maxlength="200" placeholder="e.g. Sipho's Plumbing"></label>
<label>Send them to (optional)<input name="target_url" maxlength="500" placeholder="https://revup.nahalabs.co.za/"></label>
<button>Create link</button></form></div>
<div class="card"><table><tr><th>Prospect</th><th>Link</th><th>Clicks</th></tr>${rows || '<tr><td colspan="3" class="mut">No links yet.</td></tr>'}</table></div>`, user));
      }

      if (path === "/receptionist/connect") {
        const connQ = await db.query(`SELECT * FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
        const conn = connQ.rows[0];
        const msg = url.searchParams.get("msg") || "", err = url.searchParams.get("err") || "";
        if (req.method === "POST") {
          const f = await formData(req);
          if (f.action === "save_key") {
            const key = (f.api_key || "").trim();
            if (!key) return redirect("/receptionist/connect?err=" + encodeURIComponent("Paste the key from your messaging account first."));
            const v = await validateTenantKey(key, mem.workspace_id, mem.workspace_name);
            if (v.error) return redirect("/receptionist/connect?err=" + encodeURIComponent(v.error));
            await saveTenantKey(db, crypto.randomUUID(), mem.workspace_id, key, v.profileId, env);
            return redirect("/receptionist/connect?msg=" + encodeURIComponent("Key saved. Now connect your WhatsApp."));
          }
          if (f.action === "start") {
            if (!conn || !conn.profile_id || conn.status === "needs_attention") return redirect("/receptionist/connect?err=" + encodeURIComponent("Save your API key first."));
            const cb = `${base}/receptionist/connect/callback?ws=${mem.workspace_id}&u=${user.id}&p=${conn.profile_id}`;
            let authUrl = "";
            try { authUrl = await tenantConnectUrl(await decryptTenantKey(conn.api_key, env), conn.profile_id, cb); }
            catch (e: any) { return redirect("/receptionist/connect?err=" + encodeURIComponent(await connectFailure(db, mem.workspace_id, e?.status))); }
            await db.query(`UPDATE receptionist_tenantmessagingconnection SET status='connecting', updated_at=now() WHERE workspace_id=$1`, [mem.workspace_id]);
            return new Response(null, { status: 303, headers: { location: authUrl } });
          }
          return redirect("/receptionist/connect");
        }
        const step = conn ? (conn.status === "connected" ? 3 : 2) : 1;
        return html(layout("Connect WhatsApp", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}${err ? `<p class="bad">${esc(err)}</p>` : ""}
${!err && conn?.status === "needs_attention" ? `<p class="bad">${esc(conn.last_error || "Paste a fresh messaging key to reconnect.")}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Connect your own WhatsApp number</h2>
<p class="mut">Three one-time steps. Your customers then chat with YOUR number, and the receptionist answers them with your business details.</p>
<h3>1. Create your messaging account ${step > 1 ? '<span class="ok">&#10003;</span>' : ""}</h3>
<p class="mut">Open a free account with our messaging partner, then copy your API key from its settings.</p>
<h3>2. Paste your API key ${step > 2 ? '<span class="ok">&#10003;</span>' : ""}</h3>
${conn && conn.status === "connected" ? `<p class="ok">Number connected: +${esc(conn.phone_number || "")}</p>` : `<form method="post"><input type="hidden" name="action" value="save_key"><label>API key<input name="api_key" required maxlength="200" autocomplete="off"></label><button>Save key</button></form>`}
${conn && conn.status !== "connected" && conn.status !== "needs_attention" ? `<h3>3. Connect WhatsApp</h3><form method="post"><input type="hidden" name="action" value="start"><button class="btn btn-primary">Connect WhatsApp</button><p class="mut">You will scan a QR code with the WhatsApp app on your phone - the same way WhatsApp Web pairs.</p></form>` : ""}
${conn && conn.status === "connected" && conn.last_error ? `<p class="warn">${esc(conn.last_error)}</p>` : ""}
</div>`, user));
      }

      if (path === "/receptionist/connect/callback") {
        const ws = url.searchParams.get("ws") || "", u = url.searchParams.get("u") || "", p = url.searchParams.get("p") || "";
        if (ws !== mem.workspace_id || u !== user.id) return html(layout("Connect WhatsApp", `<p class="bad">The connection did not match this business. Please try again.</p>`), 400);
        const connQ = await db.query(`SELECT * FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [ws]);
        const conn = connQ.rows[0];
        if (!conn || p !== conn.profile_id) return redirect("/receptionist/connect?err=" + encodeURIComponent("Your connection session expired. Please try again."));
        const error = url.searchParams.get("error") || "";
        if (error) {
          await db.query(`UPDATE receptionist_tenantmessagingconnection SET status='key_valid', updated_at=now() WHERE workspace_id=$1`, [ws]);
          const msg = /already/i.test(error) ? "This number is connected somewhere else. Disconnect it there first, then try again." : "The connection was cancelled before it finished. Nothing was connected.";
          return redirect("/receptionist/connect?err=" + encodeURIComponent(msg));
        }
        const connected = url.searchParams.get("connected") || "", profileId = url.searchParams.get("profileId") || "", accountId = url.searchParams.get("accountId") || "";
        if (connected !== "whatsapp" || !profileId || !accountId || profileId !== conn.profile_id)
          return redirect("/receptionist/connect?err=" + encodeURIComponent("The connection came back incomplete. Please try again."));
        try {
          const r = await tenantConfirmAndBind(db, conn, profileId, accountId, `${base}/webhooks/zernio`, env);
          return redirect("/receptionist/connect?" + (r.ok ? "msg" : "err") + "=" + encodeURIComponent(r.msg));
        } catch (e: any) {
          return redirect("/receptionist/connect?err=" + encodeURIComponent("Your number connected, but we could not confirm it yet. Refresh in a moment."));
        }
      }

      if (path === "/receptionist/calendar/connect" && req.method === "POST") {
        if(req.headers.get("origin")!==base)return html("Calendar request did not come from this site.",403);
        try { return redirect(await calendarAuthUrl(env,base,mem.workspace_id,user.id)); }
        catch { return redirect("/bookings?msg="+encodeURIComponent("Google Calendar connection is not configured. Contact NahaLabs.")); }
      }
      if (path === "/receptionist/calendar/disconnect" && req.method === "POST") {
        if(req.headers.get("origin")!==base)return html("Calendar request did not come from this site.",403);
        await db.query("DELETE FROM receptionist_calendarconnection WHERE workspace_id=$1",[mem.workspace_id]);
        return redirect("/bookings?msg="+encodeURIComponent("Google Calendar disconnected. Existing calendar events were kept."));
      }
      if (path === "/receptionist/google-calendar/callback/") {
        if(!await checkCalendarState(env,url.searchParams.get("state")||"",mem.workspace_id,user.id)) return html(layout("Calendar connection",'<p class="bad">Calendar connection expired or belongs to another business. Start again from Bookings.</p>',user),403);
        try {const code=url.searchParams.get("code");if(!code)throw Error();await calendarConnect(db,env,mem.workspace_id,code,base);return redirect("/bookings?msg="+encodeURIComponent("Google Calendar connected. Confirmed bookings will sync to your primary calendar."));}
        catch {return redirect("/bookings?msg="+encodeURIComponent("Calendar connection did not complete. Start again from Bookings."));}
      }
      if (path === "/receptionist") {
        const [ch, prof, usedM, planRow] = await Promise.all([
          db.query(`SELECT phone_number, label, is_sandbox, connected_at FROM receptionist_zerniochannel WHERE workspace_id=$1`, [mem.workspace_id]),
          db.query(`SELECT business_name, industry, is_active FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]),
          db.query(`SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`, [mem.org_id]),
          db.query(`SELECT plan FROM organizations_organization WHERE id=$1`, [mem.org_id]),
        ]);
        const allowance: Record<string, number> = { starter: 500, growth: 1000, "business-pro": 2500 };
        const pl = planRow.rows[0]?.plan || "starter";
        const lim = allowance[pl] ?? 500;
        const chan = ch.rows.map((c: any) => `<tr><td>+${esc(c.phone_number || "")}</td><td>${esc(c.label || "")}</td><td>${c.is_sandbox ? "demo line" : "live"}</td></tr>`).join("");
        const p = prof.rows[0];
        return html(layout("Receptionist", `
${!ch.rows.length ? `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">Connect your WhatsApp</h2><p>Your receptionist answers customers on your own business WhatsApp number. <a href="/receptionist/connect">Connect it yourself in three steps</a> - it takes a few minutes.</p></div>` : ""}
<div class="card"><h2 style="margin-top:0">Your receptionist</h2>
<p>${p ? `${esc(p.business_name || mem.org_name)} · ${esc(p.industry || "general")} · ${p.is_active ? '<span class="ok">answering</span>' : '<span class="warn">paused</span>'}` : "Tell RevUp about your business in onboarding so the receptionist knows what to say."}</p>
<p class="mut">Business details, hours and prices come from <a href="/onboarding">onboarding</a>. Conversations live in your <a href="/inbox">inbox</a> - step in any time.</p></div>
<div class="grid">
<div class="card"><h2>WhatsApp replies this month</h2><p class="stat">${usedM.rows[0].c} / ${lim}</p><p class="mut">on the ${esc(pl)} plan</p></div>
<div class="card"><h2>Connected numbers</h2>${ch.rows.length ? `<table><tr><th>Number</th><th>Label</th><th>Type</th></tr>${chan}</table>` : `<p class="mut">None yet.</p>`}</div>
</div>`, user));
      }

      if (path === "/assistant") {
        const { getSettings, upsertSettings, assistantCounts } = await import("./assistant");
        if (mem.plan !== "business-pro" || mem.subscription_status !== "active") {
          return html(layout("Assistant", `<div class="card"><h2 style="margin-top:0">Your own assistant</h2>
<p>Chat with your own assistant on your business WhatsApp: it remembers your rules and decisions, keeps a task log, parks anything that sends, spends or deploys for your Go + Sure, and holds a write-only vault for your secrets.</p>
<p class="mut">The assistant is part of the Business Pro plan. <a href="/billing">Upgrade in billing -</a></p></div>`, user));
        }
        if (req.method === "POST") {
          const f = await formData(req);
          const phone = String(f.owner_phone || "").replace(/\D/g, "").slice(0, 32);
          if (!phone || phone.length < 9) return redirect("/assistant?msg=" + encodeURIComponent("Enter your WhatsApp number with country code, e.g. 27612345678."));
          await upsertSettings(db, mem.workspace_id, phone, f.enabled === "on");
          return redirect("/assistant?msg=" + encodeURIComponent("Assistant settings saved."));
        }
        const [settings, counts] = await Promise.all([getSettings(db, mem.workspace_id), assistantCounts(db, mem.workspace_id)]);
        const msg = url.searchParams.get("msg") || "";
        return html(layout("Assistant", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Your own assistant</h2>
<p>Message your business WhatsApp number from your own phone. The assistant answers only you: it remembers your rules and decisions, keeps a task log, parks anything that sends, spends or deploys until you reply <b>Go + Sure</b>, and holds a write-only vault for your secrets.</p>
<form method="post" action="/assistant">
<label>Your WhatsApp number (country code, e.g. 27612345678)<input name="owner_phone" value="${esc(settings?.owner_phone || "")}" maxlength="32" placeholder="27…"></label>
<label><input type="checkbox" name="enabled" ${!settings || settings.enabled ? "checked" : ""}> Assistant answering</label>
<button class="btn btn-primary" type="submit">Save</button></form></div>
<div class="grid">
<div class="card"><h2>Memories kept</h2><p class="stat">${counts.memories}</p></div>
<div class="card"><h2>Waiting on Go + Sure</h2><p class="stat">${counts.pending}</p></div>
<div class="card"><h2>Tasks running</h2><p class="stat">${counts.running}</p></div>
</div>`, user));
      }

      if (path === "/") return html(await dashboardPage(db, user, mem, url.searchParams.get("msg") || ""));
      if (path === "/favicon.ico") return new Response(Uint8Array.from(atob(FAVICON_ICO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/x-icon", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/favicon-32.png") return new Response(Uint8Array.from(atob(FAVICON_32_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/favicon-16.png") return new Response(Uint8Array.from(atob(FAVICON_16_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/apple-touch-icon.png" || path === "/apple-touch-icon.png") return new Response(Uint8Array.from(atob(APPLE_TOUCH_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
      if (path === "/static/brand/revup-og.png" || path === "/static/brand/revup-og-v2.png") return new Response(Uint8Array.from(atob(OG_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
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
          return redirect("/?msg=" + encodeURIComponent(`${planName} chosen - activate it with your first monthly payment on the billing page. Add your Google review link under Reviews whenever you are ready.`));
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
        if (mem.plan !== "business-pro" || mem.subscription_status !== "active") return html(layout("Leads", `
<div class="card"><h2>Leads is a Business Pro feature</h2>
<p>Capture website enquiries, work a shared lead pipeline, and send considered follow-ups. <a href="/billing">Upgrade to Business Pro - R1,999/month</a>.</p></div>`, user));
        return html(await leadPipelinePage(db,user,mem));
      }

      const fsave = /^\/frontdesk\/([0-9a-f-]{36})\/save$/.exec(path);
      if (fsave && req.method === "POST") {
        if (mem.plan !== "business-pro" || mem.subscription_status !== "active") return redirect("/frontdesk");
        const f = await formData(req);
        const stage = ["new", "contacted", "quoted", "won", "lost"].includes(f.stage) ? f.stage : "new";
        const cents = Math.max(0, Math.round(parseFloat(f.value || "0") * 100) || 0);
        await db.query(`UPDATE frontdesk_lead SET stage=$1, value_cents=$2, updated_at=now() WHERE id=$3 AND workspace_id=$4`, [stage, cents, fsave[1], mem.workspace_id]);
        return redirect("/frontdesk");
      }

      const fdraft = /^\/frontdesk\/([0-9a-f-]{36})\/draft$/.exec(path);
      if (fdraft && req.method === "POST") {
        if (mem.plan !== "business-pro" || mem.subscription_status !== "active") return redirect("/frontdesk");
        const lr = await db.query(`SELECT * FROM frontdesk_lead WHERE id=$1 AND workspace_id=$2`, [fdraft[1], mem.workspace_id]);
        if (!lr.rows[0]) return redirect("/frontdesk");
        try {
          const body = await groqFollowup(env, db, mem.workspace_id, mem.workspace_name, lr.rows[0]);
          await db.query(`INSERT INTO frontdesk_followup_draft(id,lead_id,workspace_id,body,status,created_at,updated_at) VALUES($1,$2,$3,$4,'draft',now(),now())`,
            [crypto.randomUUID(), fdraft[1], mem.workspace_id, body]);
        } catch (e) { return redirect("/frontdesk?err=" + encodeURIComponent("Drafting failed - try again.")); }
        return redirect("/frontdesk");
      }

      const fappr = /^\/frontdesk\/draft\/([0-9a-f-]{36})\/approve$/.exec(path);
      if (fappr && req.method === "POST") {
        if (mem.plan !== "business-pro" || mem.subscription_status !== "active") return redirect("/frontdesk");
        await db.query(`UPDATE frontdesk_followup_draft SET status='approved', updated_at=now() WHERE id=$1 AND workspace_id=$2`, [fappr[1], mem.workspace_id]);
        return redirect("/frontdesk");
      }

      if (path === "/media") {
        if (req.method === "POST") {
          const fd = await req.formData();
          const file = fd.get("file");
          if (!(file instanceof File) || !file.size) return redirect("/media?err=" + encodeURIComponent("Choose an image first."));
          if (!(file.type || "").startsWith("image/")) return redirect("/media?err=" + encodeURIComponent("Images only (jpg, png, webp, gif)."));
          if (file.size > 2 * 1024 * 1024) return redirect("/media?err=" + encodeURIComponent("That image is over 2 MB - please use a smaller one."));
          const caps = await db.query(`SELECT count(*) c, COALESCE(sum(size),0) b FROM cf_media WHERE workspace_id=$1`, [mem.workspace_id]);
          if (Number(caps.rows[0].c) >= 25) return redirect("/media?err=" + encodeURIComponent("Library full (25 images on the free library) - delete one first."));
          if (Number(caps.rows[0].b) + file.size > 50 * 1024 * 1024) return redirect("/media?err=" + encodeURIComponent("Library storage limit reached (50 MB) - delete something first."));
          const buf = Buffer.from(await file.arrayBuffer());
          await db.query(`INSERT INTO cf_media(id,workspace_id,filename,mime,size,data) VALUES($1,$2,$3,$4,$5,$6)`,
            [crypto.randomUUID(), mem.workspace_id, (file.name || "image").slice(0, 200), file.type, file.size, buf]);
          return redirect("/media?msg=" + encodeURIComponent("Image added to your library."));
        }
        const items = await db.query(`SELECT id, filename, mime, size, created_at FROM cf_media WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 60`, [mem.workspace_id]);
        const msg = url.searchParams.get("msg") || "", err = url.searchParams.get("err") || "";
        const cards = items.rows.map((m: any) => `<div class="card" style="padding:10px">
<img src="/media/${m.id}/raw" alt="${esc(m.filename)}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:var(--line)">
<p style="margin:6px 0 2px"><b>${esc(m.filename)}</b><br><span class="mut">${Math.round(m.size / 1024)} KB · ${new Date(m.created_at).toLocaleDateString("en-ZA")}</span></p>
<p style="margin:4px 0"><a href="/posts/new?media=${m.id}">Use in a post</a></p>
<form method="post" action="/media/${m.id}/delete" onsubmit="return confirm('Delete this image?')"><button class="link" style="color:var(--bad)">Delete</button></form>
</div>`).join("");
        return html(layout("Media library", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Add an image</h2>
<form method="post" enctype="multipart/form-data"><input type="file" name="file" accept="image/*" required><button>Upload</button></form>
<p class="mut">Images up to 2 MB. Your library holds 25 images (50 MB) - plenty for a month of posts.</p></div>
<div class="grid">${cards || '<div class="card"><p class="mut">No images yet. Your first upload lands here.</p></div>'}</div>`, user));
      }

      const mraw = /^\/media\/([0-9a-f-]{36})\/raw$/.exec(path);
      if (mraw) {
        const r = await db.query(`SELECT mime, data FROM cf_media WHERE id=$1 AND workspace_id=$2`, [mraw[1], mem.workspace_id]);
        if (!r.rows[0]) return new Response("not found", { status: 404 });
        return new Response(new Uint8Array(r.rows[0].data), { headers: { "content-type": r.rows[0].mime, "cache-control": "private, max-age=3600" } });
      }

      const mdel = /^\/media\/([0-9a-f-]{36})\/delete$/.exec(path);
      if (mdel && req.method === "POST") {
        await db.query(`DELETE FROM cf_media WHERE id=$1 AND workspace_id=$2`, [mdel[1], mem.workspace_id]);
        return redirect("/media?msg=" + encodeURIComponent("Image deleted."));
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
              `INSERT INTO composer_post(id,title,caption,first_comment,internal_notes,tags,workspace_id,author_id,media_id,created_at,updated_at)
               VALUES($1,$2,$3,'','','{}'::jsonb,$4,$5,$6,now(),now())`,
              [postId, (f.title || "").trim(), (f.caption || "").trim(), mem.workspace_id, user.id, /^[0-9a-f-]{36}$/.test(f.media_id || "") ? f.media_id : null]);
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
        return html(newPostPage(user, mem, { media: url.searchParams.get("media") || "" }, url.searchParams.get("msg") || ""));
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

      if (path === "/team") {
        await ensureSocialTeamSchema(db);
        return html(layout("Your social media team", await teamPage(db, mem.workspace_id, url.searchParams.get("msg") || ""), user));
      }

      if (path === "/team/research" && req.method === "POST") {
        await ensureSocialTeamSchema(db);
        try {
          const bp = await db.query(`SELECT business_name, industry FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
          const business = bp.rows[0]?.business_name || mem.org_name || "local business";
          const industry = bp.rows[0]?.industry || "";
          const existing = await db.query(`SELECT title FROM socialteam_idea WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 40`, [mem.workspace_id]);
          const ideas = await runResearcher(env, business, industry, existing.rows.map((r: any) => r.title));
          for (const i of ideas.slice(0, 3)) {
            await db.query(`INSERT INTO socialteam_idea(id, workspace_id, title, angle, rationale) VALUES($1,$2,$3,$4,$5)`,
              [crypto.randomUUID(), mem.workspace_id, i.title, i.angle, i.rationale]);
          }
          return redirect("/team?msg=" + encodeURIComponent("Your Researcher brought " + ideas.length + " fresh ideas."));
        } catch (e: any) {
          return redirect("/team?msg=" + encodeURIComponent("Research failed (" + String(e?.message || e) + ") - try again shortly."));
        }
      }

      const ideaWrite = /^\/team\/idea\/([0-9a-f-]{36})\/write$/.exec(path);
      if (ideaWrite && req.method === "POST") {
        await ensureSocialTeamSchema(db);
        const ir = await db.query(`SELECT id, title, angle, rationale, status FROM socialteam_idea WHERE id=$1 AND workspace_id=$2`, [ideaWrite[1], mem.workspace_id]);
        const idea = ir.rows[0];
        if (!idea || idea.status !== "fresh") return redirect("/team");
        try {
          const bp = await db.query(`SELECT business_name FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
          const business = bp.rows[0]?.business_name || mem.org_name || "local business";
          const pieceId = crypto.randomUUID();
          await db.query(`INSERT INTO socialteam_piece(id, workspace_id, idea_id) VALUES($1,$2,$3)`, [pieceId, mem.workspace_id, idea.id]);
          await producePiece(env, db, mem.workspace_id, pieceId, business, idea);
          await db.query(`UPDATE socialteam_idea SET status='used', updated_at=now() WHERE id=$1`, [idea.id]);
          return redirect("/team?msg=" + encodeURIComponent("Written and checked - ready for your eye below."));
        } catch (e: any) {
          return redirect("/team?msg=" + encodeURIComponent("Writing failed (" + String(e?.message || e) + ") - try again shortly."));
        }
      }

      const ideaPark = /^\/team\/idea\/([0-9a-f-]{36})\/park$/.exec(path);
      if (ideaPark && req.method === "POST") {
        await db.query(`UPDATE socialteam_idea SET status='parked', updated_at=now() WHERE id=$1 AND workspace_id=$2`, [ideaPark[1], mem.workspace_id]);
        return redirect("/team");
      }

      const pieceSend = /^\/team\/piece\/([0-9a-f-]{36})\/send$/.exec(path);
      if (pieceSend && req.method === "POST") {
        // Hands the checked post to the composer and straight into the owner's
        // approvals queue - the owner makes the final decision there.
        const pr = await db.query(`SELECT id, caption, hashtags, status FROM socialteam_piece WHERE id=$1 AND workspace_id=$2`, [pieceSend[1], mem.workspace_id]);
        const piece = pr.rows[0];
        if (!piece || (piece.status !== "ready" && piece.status !== "returned")) return redirect("/team");
        const tags = Array.isArray(piece.hashtags) ? piece.hashtags.join(" ") : "";
        const caption = piece.caption + (tags ? "\n\n" + tags : "");
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const postId = crypto.randomUUID();
          await client.query(
            `INSERT INTO composer_post(id,title,caption,first_comment,internal_notes,tags,workspace_id,author_id,media_id,created_at,updated_at)
             VALUES($1,$2,$3,'','','{}'::jsonb,$4,$5,NULL,now(),now())`,
            [postId, "From your social media team", caption, mem.workspace_id, user.id]);
          const accs = await client.query(
            `SELECT id, provider FROM social_accounts_social_account WHERE workspace_id=$1 AND connection_status='connected'`, [mem.workspace_id]);
          let moved = 0;
          for (const a of accs.rows) {
            await client.query(
              `INSERT INTO composer_platform_post(id,platform_post_id,publish_error,retry_count,created_at,updated_at,social_account_id,post_id,platform_extra,status,first_comment_error,first_comment_id,first_comment_retry_count,first_comment_status,last_provider_error,last_provider_status,provider,provider_post_id)
               VALUES($1,'','',0,now(),now(),$2,$3,'{}'::jsonb,'pending_review','','',0,'none','','',$4,'')`,
              [crypto.randomUUID(), a.id, postId, a.provider || "zernio"]);
            moved++;
          }
          await client.query(
            `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
             VALUES($1,$2,NULL,$3,'submitted','from the social media team',now())`, [crypto.randomUUID(), postId, user.id]);
          await client.query(`UPDATE socialteam_piece SET status='sent_for_approval', updated_at=now() WHERE id=$1`, [piece.id]);
          await client.query("COMMIT");
          return redirect(moved ? "/approvals" : "/team?msg=" + encodeURIComponent("Saved as a post draft - connect a social account to send it for approval."));
        } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
      }

      if (path === "/inbox") return html(await inboxPage(db, user, mem));

      const cardPost = /^\/inbox\/([0-9a-f-]{36})\/card$/.exec(path);
      if (cardPost && req.method === "POST") {
        const f = await formData(req);
        const spend = Number(String(f.total_spend || "0").replace(",", "."));
        if (isNaN(spend) || spend < 0 || spend > 100000000) return redirect("/inbox/" + cardPost[1]);
        const bday = /^\d{4}-\d{2}-\d{2}$/.test(f.birthday || "") ? f.birthday : null;
        await db.query(
          `UPDATE receptionist_contact SET name=$1, birthday=$2, dietary_notes=$3, notes=$4, total_spend=$5, is_vip=$6, updated_at=now()
           WHERE id=$7 AND workspace_id=$8`,
          [String(f.name || "").trim().slice(0, 120), bday, String(f.dietary_notes || "").trim().slice(0, 200), String(f.notes || "").trim(), spend, f.is_vip === "on", cardPost[1], mem.workspace_id]);
        return redirect("/inbox/" + cardPost[1]);
      }

      const ires = /^\/inbox\/intake\/(receptionist_funeralclaim|receptionist_dentalappointment|receptionist_tradedispatch)\/([0-9a-f-]{36})\/resolve$/.exec(path);
      if (ires && req.method === "POST") {
        await db.query(`UPDATE ${ires[1]} SET status='resolved' WHERE id=$1 AND workspace_id=$2`, [ires[2], mem.workspace_id]);
        return redirect("/inbox");
      }
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


      if (path === "/bookings") return bookingsPage(db,user,mem,env,url);

      const bact = /^\/bookings\/([0-9a-f-]{36})\/(confirm|move|done|cancel)$/.exec(path);
      if (bact && req.method === "POST") {
        if(req.headers.get("origin")!==base)return html("Booking request did not come from this site.",403);
        // Serialise booking effects for this workspace, including provider sync.
        const runBooking=async(db:Pool):Promise<Response>=>{
        const own = await db.query(`SELECT b.*,c.name AS contact_name FROM receptionist_booking b JOIN receptionist_contact c ON c.id=b.contact_id WHERE b.id=$1 AND b.workspace_id=$2`, [bact[1], mem.workspace_id]);
        const b = own.rows[0];
        if (!b) return redirect("/bookings");
        if ((bact[2] === "confirm" && b.status === "requested") || (bact[2] === "move" && b.status === "confirmed")) {
          const f = await formData(req);
          const when = String(f.when || "").trim();
          if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) return redirect("/bookings");
          const start=new Date(when.slice(0,16)+":00+02:00");
          if(!Number.isFinite(start.getTime()))return redirect("/bookings?msg="+encodeURIComponent("Choose a valid booking date and time."));
          const clashes=await db.query(`SELECT id FROM receptionist_booking WHERE workspace_id=$1 AND id<>$2 AND status='confirmed' AND scheduled_start < $3::timestamptz + ($4 || ' minutes')::interval AND scheduled_start + (duration_minutes || ' minutes')::interval > $3::timestamptz LIMIT 1`,[mem.workspace_id,b.id,start.toISOString(),String(b.duration_minutes||60)]);
          if(clashes.rows.length)return redirect("/bookings?msg="+encodeURIComponent("That time overlaps another confirmed booking. Choose another time."));
          try {await calendarSync(db,env,mem.workspace_id,{...b,scheduled_start:start.toISOString()});}
          catch {return redirect("/bookings?msg="+encodeURIComponent("Calendar sync did not complete. Booking time has not changed; try again."));}
          await db.query(`UPDATE receptionist_booking SET status='confirmed', scheduled_start=($1 || ':00+02')::timestamptz, table_label=$3 WHERE id=$2`, [when.slice(0, 16), b.id, String(f.table_label || "").trim().slice(0, 40)]);
          return redirect("/bookings?msg=" + encodeURIComponent("Booking confirmed."));
        }
        if (bact[2] === "done" && b.status === "confirmed") {
          await db.query(`UPDATE receptionist_booking SET status='done' WHERE id=$1`, [b.id]);
          await db.query(`UPDATE receptionist_contact SET visit_count=visit_count+1, last_visit_at=now(), is_vip=(visit_count+1>=5 OR is_vip), updated_at=now() WHERE id=$1`, [b.contact_id]);
          await attributeBookingToCampaign(db, mem.workspace_id, b);
          const lacc = await awardForBooking(db, mem.workspace_id, b.id, b.contact_id);
          const loyaltyNote = lacc ? ` ${lacc.balance} loyalty points on their card.` : "";
          const evId = await startPipeline(db, mem.workspace_id, b.contact_id, b.id);
          const svc = await db.query(`SELECT service FROM receptionist_booking WHERE id=$1`, [b.id]);
          const remId = await scheduleServiceReminder(db, mem.workspace_id, b.id, b.contact_id, svc.rows[0]?.service || "");
          const extra = remId ? " A service reminder is scheduled too." : "";
          return redirect("/bookings?msg=" + encodeURIComponent((evId ? "Marked done - the review check-in goes out in 15 minutes." : "Marked done. (This customer opted out of messages.)") + extra + loyaltyNote));
        }
        if (bact[2] === "cancel" && ["requested", "confirmed"].includes(b.status)) {
          try {await calendarSync(db,env,mem.workspace_id,b,true);}
          catch {return redirect("/bookings?msg="+encodeURIComponent("Calendar removal did not complete. Booking has not been cancelled."));}
          await db.query(`UPDATE receptionist_booking SET status='cancelled' WHERE id=$1`, [b.id]);
          return redirect("/bookings?msg=" + encodeURIComponent("Booking cancelled."));
        }
        return redirect("/bookings");
        };
        const client=await db.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[mem.workspace_id]);
          const response=await runBooking(client as unknown as Pool);
          await client.query('COMMIT');
          return response;
        } catch(e) {await client.query('ROLLBACK');throw e;}
        finally {client.release();}
      }

      if (path === "/waitlist") {
        if (req.method === "POST") {
          const f = await formData(req);
          const wa = String(f.wa_id || "").replace(/\D/g, "");
          if (!wa) return redirect("/waitlist");
          await waitlistAdd(db, mem.workspace_id, wa, String(f.name || "").trim(), Number(f.party_size) || 2, String(f.wanted_time || "").trim());
          return redirect("/waitlist?msg=" + encodeURIComponent("Added to the waitlist."));
        }
        return html(await waitlistPage(db, user, mem, url.searchParams.get("msg") || ""));
      }
      const wact = /^\/waitlist\/([0-9a-f-]{36})\/(offer|accept|cancel)$/.exec(path);
      if (wact && req.method === "POST") {
        const okd = await waitlistAction(db, mem.workspace_id, wact[1], wact[2]);
        return redirect("/waitlist?msg=" + encodeURIComponent(okd ? "Done." : "That change does not apply to this entry."));
      }

      if (path === "/loyalty") return html(await loyaltyPage(db, user, mem, url.searchParams.get("msg") || ""));
      if (path === "/loyalty/settings" && req.method === "POST") {
        const f = await formData(req);
        await loyaltySettings(db, mem.workspace_id);
        await db.query(
          `UPDATE receptionist_loyaltysettings SET enabled=$1, points_per_visit=$2, welcome_bonus=$3, points_for_voucher=$4, voucher_value_rand=$5, voucher_valid_days=$6 WHERE workspace_id=$7`,
          [f.enabled === "on", Math.max(0, Number(f.points_per_visit) || 0), Math.max(0, Number(f.welcome_bonus) || 0), Math.max(1, Number(f.points_for_voucher) || 100), Math.max(1, Number(f.voucher_value_rand) || 50), Math.max(1, Number(f.voucher_valid_days) || 90), mem.workspace_id]);
        return redirect("/loyalty?msg=" + encodeURIComponent("Rules saved."));
      }
      if (path === "/loyalty/vouchers/new" && req.method === "POST") {
        const f = await formData(req);
        try {
          const v = await issueVoucher(db, mem.workspace_id, String(f.contact_id || ""));
          return redirect("/loyalty?msg=" + encodeURIComponent(`Voucher ${v.code} issued - R${v.amount_rand}.`));
        } catch (e: any) { return redirect("/loyalty?msg=" + encodeURIComponent(String(e?.message || e))); }
      }
      const vred = /^\/loyalty\/vouchers\/([0-9a-f-]{36})\/redeem$/.exec(path);
      if (vred && req.method === "POST") {
        const okd = await redeemVoucher(db, mem.workspace_id, vred[1]);
        return redirect("/loyalty?msg=" + encodeURIComponent(okd ? "Voucher redeemed." : "That voucher is not usable."));
      }

      // Restaurant core: menu management, dish-sales logging, specials, orders
      if (path === "/menu") return html(layout("Menu", await menuManagePage(db, mem, base, url.searchParams.get("msg") || ""), user));
      if (path === "/menu/categories" && req.method === "POST") {
        const f = await formData(req);
        const name = String(f.name || "").trim().slice(0, 80);
        if (name) await db.query(`INSERT INTO menus_category(id,workspace_id,name,position) VALUES($1,$2,$3,COALESCE((SELECT max(position)+1 FROM menus_category WHERE workspace_id=$2),0)) ON CONFLICT ON CONSTRAINT menus_category_unique_name DO NOTHING`, [crypto.randomUUID(), mem.workspace_id, name]);
        return redirect("/menu?msg=" + encodeURIComponent(name ? "Section added." : "Nothing added."));
      }
      if (path === "/menu/items" && req.method === "POST") {
        const f = await formData(req);
        const name = String(f.name || "").trim().slice(0, 120);
        const price = Number(f.price);
        if (!name || !(price >= 0)) return redirect("/menu?msg=" + encodeURIComponent("A dish needs a name and a price."));
        const catId = /^[0-9a-f-]{36}$/.test(String(f.category_id || "")) ? String(f.category_id) : null;
        if (catId) {
          const own = await db.query(`SELECT 1 FROM menus_category WHERE id=$1 AND workspace_id=$2`, [catId, mem.workspace_id]);
          if (!own.rows[0]) return redirect("/menu");
        }
        const cost = f.food_cost !== undefined && String(f.food_cost).trim() !== "" && Number(f.food_cost) >= 0 ? Number(f.food_cost) : null;
        await db.query(
          `INSERT INTO menus_item(id,workspace_id,category_id,name,description,price,food_cost,dietary,is_available,is_special,position,created_at,updated_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,'[]'::jsonb,true,$8,COALESCE((SELECT max(position)+1 FROM menus_item WHERE workspace_id=$2),0),now(),now())`,
          [crypto.randomUUID(), mem.workspace_id, catId, name, String(f.description || "").trim().slice(0, 300), price, cost, f.is_special === "1"]);
        return redirect("/menu?msg=" + encodeURIComponent("Dish added - it is on your public menu now."));
      }
      const mact = /^\/menu\/items\/([0-9a-f-]{36})\/(toggle|special)$/.exec(path);
      if (mact && req.method === "POST") {
        const col = mact[2] === "toggle" ? "is_available" : "is_special";
        await db.query(`UPDATE menus_item SET ${col}=NOT ${col}, updated_at=now() WHERE id=$1 AND workspace_id=$2`, [mact[1], mem.workspace_id]);
        return redirect("/menu");
      }
      if (path === "/menu/sales" && req.method === "POST") {
        const f = await formData(req);
        const qty = Math.max(0, Math.min(10000, parseInt(String(f.quantity || ""), 10) || 0));
        const day = String(f.sold_on || "").trim();
        const own = await db.query(`SELECT 1 FROM menus_item WHERE id=$1 AND workspace_id=$2`, [String(f.item_id || ""), mem.workspace_id]);
        if (own.rows[0] && /^\d{4}-\d{2}-\d{2}$/.test(day))
          await db.query(`INSERT INTO menus_dishsale(id,workspace_id,item_id,sold_on,quantity) VALUES($1,$2,$3,$4,$5)`, [crypto.randomUUID(), mem.workspace_id, String(f.item_id), day, qty]);
        return redirect("/menu?msg=" + encodeURIComponent("Sales logged."));
      }
      if (path === "/orders") return html(layout("Orders", await ordersPage(db, mem, url.searchParams.get("msg") || ""), user));
      const oact = /^\/orders\/([0-9a-f-]{36})\/(confirm|ready|done|cancel)$/.exec(path);
      if (oact && req.method === "POST") {
        const next: any = { confirm: "confirmed", ready: "ready", done: "done", cancel: "cancelled" };
        const flows: any = { confirmed: ["new"], ready: ["confirmed"], done: ["ready"], cancelled: ["new", "confirmed"] };
        const ns = next[oact[2]];
        await db.query(`UPDATE menus_order SET status=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3 AND status = ANY($4)`, [ns, oact[1], mem.workspace_id, flows[ns]]);
        return redirect("/orders");
      }

      if (path === "/quotes") {
        if (req.method === "POST") {
          const f = await formData(req);
          if (!String(f.customer_name || "").trim()) return redirect("/quotes");
          await quoteCreate(db, mem.workspace_id, String(f.customer_name).trim(), /^[0-9a-f-]{36}$/.test(f.contact_id || "") ? f.contact_id : null, String(f.title || "").trim(), Number(f.amount) || 0, String(f.follow_up_on || ""));
          return redirect("/quotes?msg=" + encodeURIComponent("Quote saved."));
        }
        return html(await quotesPage(db, user, mem, url.searchParams.get("msg") || ""));
      }
      const qact = /^\/quotes\/([0-9a-f-]{36})\/(sent|won|lost)$/.exec(path);
      if (qact && req.method === "POST") {
        const out = await quoteAction(db, env, mem.workspace_id, qact[1], qact[2]);
        return redirect("/quotes?msg=" + encodeURIComponent(out === "marked sent" ? "Marked sent (WhatsApp too, when the customer is linked and reachable)." : out === "no change" ? "That change does not apply to this quote." : `Quote ${out}.`));
      }

      if (path === "/campaigns") {
        if (req.method === "POST") {
          const f = await formData(req);
          try {
            await campaignCreate(db, mem.workspace_id, String(f.name || ""), String(f.segment || ""), String(f.body_a || ""), String(f.body_b || ""));
            return redirect("/campaigns?msg=" + encodeURIComponent("Draft saved. Approve it when you are ready to send."));
          } catch (e: any) { return redirect("/campaigns?msg=" + encodeURIComponent(String(e?.message || e))); }
        }
        return html(await campaignsPage(db, user, mem, url.searchParams.get("msg") || ""));
      }
      const capp = /^\/campaigns\/([0-9a-f-]{36})\/approve$/.exec(path);
      if (capp && req.method === "POST") {
        const f = await formData(req);
        try {
          await campaignApprove(db, mem.workspace_id, capp[1], String(f.when || ""));
          return redirect("/campaigns?msg=" + encodeURIComponent("Approved. The send starts within 15 minutes."));
        } catch (e: any) { return redirect("/campaigns?msg=" + encodeURIComponent(String(e?.message || e))); }
      }
      const ccan = /^\/campaigns\/([0-9a-f-]{36})\/cancel$/.exec(path);
      if (ccan && req.method === "POST") {
        await campaignCancel(db, mem.workspace_id, ccan[1]);
        return redirect("/campaigns?msg=" + encodeURIComponent("Cancelled."));
      }

      if (path === "/competitors") {
        if (req.method === "POST") {
          const f = await formData(req);
          try {
            await competitorAdd(db, mem.workspace_id, String(f.name || ""), String(f.area || ""), String(f.website || ""), String(f.rating || ""), "");
            return redirect("/competitors?msg=" + encodeURIComponent("Competitor saved."));
          } catch (e: any) { return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e))); }
        }
        return html(await competitorsPage(db, user, mem, url.searchParams.get("msg") || ""));
      }
      const cdish = /^\/competitors\/([0-9a-f-]{36})\/dishes$/.exec(path);
      if (cdish && req.method === "POST") {
        const f = await formData(req);
        try {
          await dishAdd(db, mem.workspace_id, cdish[1], String(f.name || ""), Number(f.price), String(f.own_item_id || ""));
          return redirect("/competitors?msg=" + encodeURIComponent("Dish logged."));
        } catch (e: any) { return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e))); }
      }
      const cpromo = /^\/competitors\/([0-9a-f-]{36})\/promos$/.exec(path);
      if (cpromo && req.method === "POST") {
        const f = await formData(req);
        try {
          await promoAdd(db, mem.workspace_id, cpromo[1], String(f.text || ""), String(f.valid_until || ""));
          return redirect("/competitors?msg=" + encodeURIComponent("Promotion logged."));
        } catch (e: any) { return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e))); }
      }
      const oppact = /^\/opportunities\/([0-9a-f-]{36})\/(acted|dismissed|draft)$/.exec(path);
      if (oppact && req.method === "POST") {
        try {
          if (oppact[2] === "draft") {
            await opportunityDraftCampaign(db, mem.workspace_id, oppact[1]);
            return redirect("/campaigns?msg=" + encodeURIComponent("Draft campaign ready - approve it when you are ready to send."));
          }
          await opportunityAction(db, mem.workspace_id, oppact[1], oppact[2]);
          return redirect("/competitors?msg=" + encodeURIComponent("Marked."));
        } catch (e: any) { return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e))); }
      }

      if (path === "/support") {
        if (req.method === "POST") {
          const f = await formData(req);
          const q = String(f.question || "").trim();
          if (q) await supportHandle(db, mem.workspace_id, q.slice(0, 1000));
          return redirect("/support");
        }
        return html(await supportPage(db, user, mem));
      }
      if (path === "/wifi-card") {
        const bp = await db.query(`SELECT business_name FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
        return html(layout("WiFi Card", wifiCardPage({ businessName: bp.rows[0]?.business_name || user._cur_ws || "", enquiryUrl: `${base}/f/${mem.workspace_id}` }), user));
      }
      if (path === "/revenue-mode" && req.method === "POST") {
        const f = await formData(req);
        const mode = f.mode === "draft" ? "draft" : "suggest";
        await db.query(`UPDATE receptionist_businessprofile SET revenue_mode=$1, updated_at=now() WHERE workspace_id=$2`, [mode, mem.workspace_id]);
        return redirect("/competitors?msg=" + encodeURIComponent(mode === "draft" ? "Revenue Employee will prepare campaign drafts for strong opportunities. You still approve every send." : "Revenue Employee will suggest opportunities only."));
      }

      if (path === "/reviews") return html(await reviewsPage(db, user, mem, base, url.searchParams.get("msg") || ""));

      if (path === "/reviews/toggle" && req.method === "POST") {
        const cur = await db.query(`SELECT review_requests_enabled FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
        if (!cur.rows[0]) return redirect("/reviews");
        await db.query(`UPDATE receptionist_businessprofile SET review_requests_enabled=$1, updated_at=now() WHERE workspace_id=$2`, [!cur.rows[0].review_requests_enabled, mem.workspace_id]);
        return redirect("/reviews?msg=" + encodeURIComponent(!cur.rows[0].review_requests_enabled ? "Review requests are ON." : "Review requests are OFF."));
      }

      if (path === "/reviews/pipeline" && req.method === "POST") {
        const f = await formData(req);
        const id = await startPipeline(db, mem.workspace_id, f.contact_id || "", null);
        return redirect("/reviews?msg=" + encodeURIComponent(id ? "Visit marked done - check-in goes out in 15 minutes." : "That customer has opted out, so nothing was scheduled."));
      }

      if (path === "/reviews/resolve" && req.method === "POST") {
        const f = await formData(req);
        const c = await db.query(`SELECT id FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [f.contact_id || "", mem.workspace_id]);
        if (c.rows[0]) await resolveIssue(db, c.rows[0].id);
        return redirect("/reviews?msg=" + encodeURIComponent("Issue marked resolved - the customer is back in the normal flow."));
      }

      if (path === "/reviews/run-due" && req.method === "POST") {
        const out = await runDueReviewEvents(db, env, base, mem.workspace_id);
        return redirect("/reviews?msg=" + encodeURIComponent(`Ran ${out.due} due step(s): ` + Object.entries(out.results).map(([k, v]) => `${k} ${v}`).join(", ")));
      }

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
          const cUp = await client.query(
            `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
             VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())
             ON CONFLICT (workspace_id, wa_id) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
             RETURNING id`, [crypto.randomUUID(), mem.workspace_id, (f.wa_id || "").trim(), (f.name || "").trim()]);
          const contactId = cUp.rows[0].id;
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
}
