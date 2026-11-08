// RevUp ChatGPT app: remote MCP server (streamable HTTP at /mcp) + OAuth 2.1
// authorization server (DCR, authorization code + PKCE S256, refresh tokens)
// so a RevUp owner can connect ChatGPT to their own workspace. Read-only v1:
// today's enquiry summary, review stats, demand radar feed, upcoming bookings.
// POPIA: counts and short snippets only - no phone numbers, emails or wa_ids
// ever leave through these tools. No write tools.
import {
  esc, formData, html, json, redirect, layout, getUser, membership,
  newSession, sessionCookie, VERIFY_SQL, rateLimited, rateLimitExceeded, sha256hex,
} from "./index";

export const CHATAPP_SCOPE = "revup:read";
const CODE_TTL_MIN = 10;
const ACCESS_TTL_DAYS = 30;
const REFRESH_TTL_DAYS = 90;

export async function ensureChatAppTables(db: any): Promise<void> {
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_client(
    client_id text PRIMARY KEY,
    client_name text NOT NULL DEFAULT '',
    redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_code(
    code_hash text PRIMARY KEY,
    client_id text NOT NULL,
    redirect_uri text NOT NULL,
    code_challenge text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_token(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    access_hash text UNIQUE NOT NULL,
    refresh_hash text UNIQUE NOT NULL,
    client_id text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked boolean NOT NULL DEFAULT false)`);
}

// ---------- OAuth helpers (pure, unit-tested) ----------
export function base64url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pkceS256(verifier: string): Promise<string> {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}

export function validRedirectUri(uri: string, registered: string[]): boolean {
  return registered.includes(uri);
}

export function popiaSnippet(s: any, max = 140): string {
  // One line, length-capped. The query layer never selects contact fields at
  // all; this is the belt-and-braces trim for free text a customer typed.
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function firstName(s: any): string {
  return String(s || "").trim().split(/\s+/)[0] || "";
}

// ---------- OAuth endpoints ----------
function authMetadata(base: string) {
  return {
    issuer: base,
    authorization_response_iss_parameter_supported: true,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    token_endpoint_auth_methods_supported: ["none"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [CHATAPP_SCOPE],
  };
}

export function protectedResourceMetadata(base: string) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    scopes_supported: [CHATAPP_SCOPE],
    resource_name: "RevUp",
    resource_documentation: `${base}/privacy`,
  };
}

function consentPage(qs: string, mem: any, clientName: string, err = ""): string {
  return layout("Connect RevUp to ChatGPT", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2>Connect ${esc(mem.org_name)} to ChatGPT</h2>
<p><b>${esc(clientName || "ChatGPT")}</b> is asking for <b>read-only</b> access to this workspace:</p>
<ul>
<li>Today's enquiry summary (counts and message snippets)</li>
<li>Review stats (counts only)</li>
<li>Your demand radar feed</li>
<li>Upcoming bookings (service, time, status, first name)</li>
</ul>
<p class="mut">No write actions. No customer phone numbers, emails or addresses are shared. You can disconnect any time from ChatGPT's app settings.</p>
<form method="post" action="/oauth/authorize?${qs}">
<button name="action" value="approve">Allow read-only access</button>
<button class="link" name="action" value="deny" formnovalidate>Cancel</button>
</form></div>`);
}

function connectLoginPage(qs: string, err = ""): string {
  return layout("Log in to connect ChatGPT", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2>Log in to RevUp to connect ChatGPT</h2>
<form method="post" action="/oauth/authorize?${qs}">
<label>Email<input type="email" name="email" required autocomplete="email"></label>
<label>Password<input type="password" name="password" required autocomplete="current-password"></label>
<button>Log in and continue</button>
</form></div>`);
}

function oauthErr(redirectUri: string | null, state: string, error: string, desc: string, iss: string): Response {
  if (redirectUri) {
    const u = new URL(redirectUri);
    u.searchParams.set("error", error);
    u.searchParams.set("error_description", desc);
    if (state) u.searchParams.set("state", state);
    u.searchParams.set("iss", iss);
    return new Response(null, { status: 302, headers: { location: u.toString() } });
  }
  return json({ error, error_description: desc }, 400);
}

async function handleAuthorize(req: Request, env: any, url: URL, poolFn: (env: any) => any): Promise<Response> {
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    const p = url.searchParams;
    const base = url.origin;
    const clientId = p.get("client_id") || "";
    const redirectUri = p.get("redirect_uri") || "";
    const state = p.get("state") || "";
    const challenge = p.get("code_challenge") || "";
    const method = p.get("code_challenge_method") || "";
    if ((p.get("response_type") || "") !== "code") return oauthErr(null, state, "unsupported_response_type", "response_type must be code", base);
    const cr = await db.query(`SELECT client_id, client_name, redirect_uris FROM cf_oauth_client WHERE client_id=$1`, [clientId]);
    const client = cr.rows[0];
    if (!client) return json({ error: "invalid_client", error_description: "unknown client_id" }, 400);
    if (!validRedirectUri(redirectUri, client.redirect_uris || [])) return json({ error: "invalid_request", error_description: "redirect_uri not registered" }, 400);
    if (!challenge || method !== "S256") return oauthErr(redirectUri, state, "invalid_request", "PKCE S256 required", base);
    // Keep the original query string so POST steps land back here intact.
    const qs = url.search.replace(/^\?/, "");

    if (req.method === "POST") {
      const f = await formData(req);
      if (f.email !== undefined) {
        // login step inside the connect flow
        if (await rateLimitExceeded(db, "login", req, 20)) return html(connectLoginPage(qs, "Too many failed attempts from this network today - please try again tomorrow."), 429);
        const r = await db.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
        const row = r.rows[0];
        let ok = false;
        if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
          const v = await db.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
          ok = v.rows[0]?.ok === true;
        }
        if (!ok) { await rateLimited(db, "login", req, 20); return html(connectLoginPage(qs, "Wrong email or password."), 401); }
        const token = await newSession(db, row.id, req);
        return new Response(null, { status: 303, headers: { location: `/oauth/authorize?${qs}`, "set-cookie": sessionCookie(token) } });
      }
      if (f.action === "deny") return oauthErr(redirectUri, state, "access_denied", "The owner declined the connection.", base);
      if (f.action !== "approve") return json({ error: "invalid_request" }, 400);
    }

    const user = await getUser(req, db);
    if (!user) return html(connectLoginPage(qs));
    const mem = await membership(db, user.id, req);
    if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet.</p>`, user), 403);
    if (mem.workspace_role && !["owner", "admin"].includes(mem.workspace_role) && req.method === "POST")
      return html(consentPage(qs, mem, client.client_name, "Only a workspace owner or admin can connect apps."), 403);

    if (req.method === "POST") {
      // approved: mint a single-use authorization code (stored hashed)
      const code = base64url(crypto.getRandomValues(new Uint8Array(32)));
      await db.query(
        `INSERT INTO cf_oauth_code(code_hash,client_id,redirect_uri,code_challenge,workspace_id,scope,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,now()+interval '${CODE_TTL_MIN} minutes')`,
        [await sha256hex(code), clientId, redirectUri, challenge, mem.workspace_id, CHATAPP_SCOPE]);
      const u = new URL(redirectUri);
      u.searchParams.set("code", code);
      if (state) u.searchParams.set("state", state);
      u.searchParams.set("iss", base);
      return new Response(null, { status: 302, headers: { location: u.toString() } });
    }
    return html(consentPage(qs, mem, client.client_name));
  } finally { await db.end().catch(() => {}); }
}

async function handleRegisterReal(req: Request, env: any, poolFn: (env: any) => any): Promise<Response> {
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_client_metadata", error_description: "JSON body required" }, 400); }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u: any) => typeof u === "string" && u.startsWith("https://")) : [];
  if (!uris.length) return json({ error: "invalid_redirect_uri", error_description: "at least one https redirect_uri required" }, 400);
  const clientId = crypto.randomUUID();
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    await db.query(`INSERT INTO cf_oauth_client(client_id,client_name,redirect_uris) VALUES($1,$2,$3)`,
      [clientId, String(body.client_name || "").slice(0, 120), JSON.stringify(uris)]);
    return json({
      client_id: clientId,
      client_name: String(body.client_name || "").slice(0, 120),
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: CHATAPP_SCOPE,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }, 201);
  } finally { await db.end().catch(() => {}); }
}

function tokenJson(access: string, refresh: string) {
  return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_DAYS * 86400, refresh_token: refresh, scope: CHATAPP_SCOPE });
}

async function issueTokens(db: any, clientId: string, workspaceId: string): Promise<{ access: string; refresh: string }> {
  const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.query(
    `INSERT INTO cf_oauth_token(access_hash,refresh_hash,client_id,workspace_id,scope,expires_at)
     VALUES($1,$2,$3,$4,$5,now()+interval '${ACCESS_TTL_DAYS} days')`,
    [await sha256hex(access), await sha256hex(refresh), clientId, workspaceId, CHATAPP_SCOPE]);
  return { access, refresh };
}

async function handleToken(req: Request, env: any, poolFn: (env: any) => any): Promise<Response> {
  const f = await formData(req);
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    if (f.grant_type === "authorization_code") {
      const ch = await sha256hex(f.code || "");
      // single use: delete and only act on the row that was actually removed
      const r = await db.query(
        `DELETE FROM cf_oauth_code WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND expires_at>now()
         RETURNING code_challenge, workspace_id`, [ch, f.client_id || "", f.redirect_uri || ""]);
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant", error_description: "code unknown, expired or already used" }, 400);
      if ((await pkceS256(f.code_verifier || "")) !== row.code_challenge)
        return json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
      const t = await issueTokens(db, f.client_id || "", row.workspace_id);
      return tokenJson(t.access, t.refresh);
    }
    if (f.grant_type === "refresh_token") {
      const rh = await sha256hex(f.refresh_token || "");
      const r = await db.query(`SELECT id, client_id, workspace_id FROM cf_oauth_token WHERE refresh_hash=$1 AND NOT revoked`, [rh]);
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant" }, 400);
      const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
      // rotate both halves; the old refresh token stops working immediately
      await db.query(`UPDATE cf_oauth_token SET access_hash=$1, refresh_hash=$2, expires_at=now()+interval '${ACCESS_TTL_DAYS} days', created_at=now() WHERE id=$3`,
        [await sha256hex(access), await sha256hex(refresh), row.id]);
      return tokenJson(access, refresh);
    }
    return json({ error: "unsupported_grant_type" }, 400);
  } finally { await db.end().catch(() => {}); }
}

async function workspaceForToken(req: Request, env: any, poolFn: (env: any) => any): Promise<any | null> {
  const auth = req.headers.get("authorization") || "";
  const tok = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!tok) return null;
  const db = poolFn(env);
  try {
    const r = await db.query(
      `SELECT t.workspace_id, o.name AS org_name, w.name AS workspace_name FROM cf_oauth_token t
       JOIN workspaces_workspace w ON w.id=t.workspace_id
       JOIN organizations_organization o ON o.id=w.organization_id
       WHERE t.access_hash=$1 AND NOT t.revoked AND t.expires_at>now()`, [await sha256hex(tok)]);
    return r.rows[0] || null;
  } finally { await db.end().catch(() => {}); }
}

// ---------- MCP tools (read-only, POPIA-safe shapes) ----------
async function toolTodayEnquiries(db: any, ws: string) {
  const [today, stages, latest] = await Promise.all([
    db.query(`SELECT count(*) c FROM frontdesk_lead WHERE workspace_id=$1 AND (created_at AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date`, [ws]),
    db.query(`SELECT stage, count(*) c FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [ws]),
    db.query(`SELECT message, stage, created_at FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 3`, [ws]),
  ]);
  const data = {
    day: new Date().toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" }),
    enquiries_today: Number(today.rows[0].c),
    all_time_by_stage: Object.fromEntries(stages.rows.map((r: any) => [r.stage, Number(r.c)])),
    latest: latest.rows.map((r: any) => ({
      at: new Date(r.created_at).toLocaleTimeString("en-ZA", { hour12: false, timeZone: "Africa/Johannesburg" }),
      stage: r.stage,
      snippet: popiaSnippet(r.message),
    })),
  };
  const lines = [`${data.enquiries_today} new enquir${data.enquiries_today === 1 ? "y" : "ies"} today (${data.day}).`];
  const stageStr = Object.entries(data.all_time_by_stage).map(([k, v]) => `${k}: ${v}`).join(", ");
  if (stageStr) lines.push(`Pipeline (all time): ${stageStr}.`);
  for (const l of data.latest) lines.push(`- ${l.at} [${l.stage}] ${l.snippet}`);
  return { data, text: lines.join("\n") };
}

async function toolReviewStats(db: any, ws: string) {
  const [links, clicked, contacts, events] = await Promise.all([
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT step, status, count(*) c FROM receptionist_reviewevent WHERE workspace_id=$1 GROUP BY step, status`, [ws]),
  ]);
  const data = {
    review_links_sent: Number(links.rows[0].c),
    links_clicked: Number(clicked.rows[0].c),
    contacts_in_inbox: Number(contacts.rows[0].c),
    events: events.rows.map((r: any) => ({ step: r.step, status: r.status, count: Number(r.c) })),
  };
  const ev = data.events.map((e: any) => `${e.step}/${e.status}: ${e.count}`).join(", ");
  return {
    data,
    text: `Review links sent: ${data.review_links_sent} (${data.links_clicked} clicked). Contacts in inbox: ${data.contacts_in_inbox}.${ev ? ` Events - ${ev}.` : ""}`,
  };
}

async function toolRadarFeed(db: any, ws: string) {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [ws]);
  const feed = await db.query(
    `SELECT title, source, summary, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 10`, [ws]);
  const data = {
    industry: w.rows[0]?.industry || "general",
    items: feed.rows.map((r: any) => ({
      title: popiaSnippet(r.title, 200),
      source: popiaSnippet(r.source, 80),
      published_at: r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : null,
      snippet: popiaSnippet(r.summary),
    })),
  };
  const lines = [`Demand radar (${data.industry}): ${data.items.length} recent signal${data.items.length === 1 ? "" : "s"}.`];
  for (const i of data.items) lines.push(`- ${i.published_at || "undated"} · ${i.title}${i.source ? ` (${i.source})` : ""}`);
  return { data, text: lines.join("\n") };
}

async function toolUpcomingBookings(db: any, ws: string) {
  const r = await db.query(
    `SELECT b.service, b.scheduled_start, b.preferred_time, b.status, c.name AS contact_name
     FROM receptionist_booking b LEFT JOIN receptionist_contact c ON c.id=b.contact_id
     WHERE b.workspace_id=$1 AND b.status IN ('requested','confirmed')
     ORDER BY b.scheduled_start NULLS LAST, b.created_at LIMIT 10`, [ws]);
  const data = {
    upcoming: r.rows.map((b: any) => ({
      service: popiaSnippet(b.service, 80),
      when: b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : popiaSnippet(b.preferred_time, 60),
      status: b.status,
      customer: firstName(b.contact_name),
    })),
    requested: r.rows.filter((b: any) => b.status === "requested").length,
    confirmed: r.rows.filter((b: any) => b.status === "confirmed").length,
  };
  const lines = [`${data.upcoming.length} upcoming booking${data.upcoming.length === 1 ? "" : "s"} (${data.confirmed} confirmed, ${data.requested} awaiting confirmation).`];
  for (const b of data.upcoming) lines.push(`- ${b.when || "time to confirm"} · ${b.service || "booking"} · ${b.status}${b.customer ? ` · ${b.customer}` : ""}`);
  return { data, text: lines.join("\n") };
}

const WIDGET_URI = "ui://widget/revup-overview-v1.html";
const WIDGET_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff;color:#1d1d1f}
h2{font-size:15px;margin:0 0 8px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
.row:last-child{border:none}.mut{color:#6e6e73;font-size:12px}.n{font-weight:700;font-size:22px}
.grid{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #e5e5ea;border-radius:10px;padding:10px 14px;min-width:110px}
</style></head><body><div id="root"><p class="mut">Loading…</p></div><script>
const o=(window.openai&&window.openai.toolOutput)||{};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let h='';
if(o.enquiries_today!==undefined){h+='<h2>Today\\'s enquiries - '+esc(o.day)+'</h2><div class="grid"><div class="card"><div class="n">'+esc(o.enquiries_today)+'</div><div class="mut">today</div></div>';
for(const[k,v]of Object.entries(o.all_time_by_stage||{}))h+='<div class="card"><div class="n">'+esc(v)+'</div><div class="mut">'+esc(k)+'</div></div>';
h+='</div>';for(const l of(o.latest||[]))h+='<div class="row"><span>'+esc(l.snippet)+'</span><span class="mut">'+esc(l.at)+' · '+esc(l.stage)+'</span></div>';}
else if(o.review_links_sent!==undefined){h+='<h2>Review stats</h2><div class="grid"><div class="card"><div class="n">'+esc(o.review_links_sent)+'</div><div class="mut">links sent</div></div><div class="card"><div class="n">'+esc(o.links_clicked)+'</div><div class="mut">clicked</div></div><div class="card"><div class="n">'+esc(o.contacts_in_inbox)+'</div><div class="mut">contacts</div></div></div>';}
else if(o.items){h+='<h2>Demand radar - '+esc(o.industry)+'</h2>';for(const i of o.items)h+='<div class="row"><span>'+esc(i.title)+'</span><span class="mut">'+esc(i.published_at||'')+'</span></div>';}
else if(o.upcoming){h+='<h2>Upcoming bookings</h2>';for(const b of o.upcoming)h+='<div class="row"><span>'+esc(b.service||'booking')+(b.customer?' · '+esc(b.customer):'')+'</span><span class="mut">'+esc(b.when||'')+' · '+esc(b.status)+'</span></div>';if(!o.upcoming.length)h+='<p class="mut">No upcoming bookings.</p>';}
else h='<p class="mut">No data.</p>';
document.getElementById('root').innerHTML=h;
</script></body></html>`;

const TOOLS = [
  {
    name: "get_today_enquiry_summary",
    title: "Today's enquiry summary",
    description: "Use this when the owner asks how many website enquiries came in today, or wants the latest enquiry messages. Returns today's count, the all-time lead pipeline by stage, and short snippets of the 3 newest enquiry messages. Read-only; contains no contact details.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with today's enquiry count, pipeline stages and the newest enquiry snippets.", "openai/toolInvocation/invoking": "Checking today's enquiries", "openai/toolInvocation/invoked": "Enquiry summary ready" },
    run: toolTodayEnquiries,
  },
  {
    name: "get_review_stats",
    title: "Review stats",
    description: "Use this when the owner asks about Google review performance: how many review links were sent, how many customers clicked, inbox size, and review/reminder event counts. Read-only; counts only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with review links sent, clicked and contacts in inbox.", "openai/toolInvocation/invoking": "Pulling review stats", "openai/toolInvocation/invoked": "Review stats ready" },
    run: toolReviewStats,
  },
  {
    name: "get_radar_feed",
    title: "Demand radar feed",
    description: "Use this when the owner asks what is happening in their industry or area: the latest South African demand signals and news the radar collected for their business. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of the newest demand radar signals with source and date.", "openai/toolInvocation/invoking": "Scanning the demand radar", "openai/toolInvocation/invoked": "Radar feed ready" },
    run: toolRadarFeed,
  },
  {
    name: "get_upcoming_bookings",
    title: "Upcoming bookings",
    description: "Use this when the owner asks about today's or this week's bookings: service, time, status and customer first name for the next bookings, with requested vs confirmed counts. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of upcoming bookings with service, time and status.", "openai/toolInvocation/invoking": "Checking the diary", "openai/toolInvocation/invoked": "Bookings ready" },
    run: toolUpcomingBookings,
  },
];

function rpcResult(id: any, result: any) {
  return json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: any, code: number, message: string) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

function mcpUnauthorized(base: string): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "OAuth required" } }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
    },
  });
}

async function handleMcp(req: Request, env: any, url: URL, poolFn: (env: any) => any): Promise<Response> {
  const base = url.origin;
  if (req.method === "GET") return json({ error: "SSE not supported; POST JSON-RPC here" }, 405);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  let msg: any;
  try { msg = await req.json(); } catch { return rpcError(null, -32700, "Parse error"); }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Batches not supported");
  const id = msg.id;
  // Notifications carry no id and expect no response body.
  if (id === undefined || id === null) {
    if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled") return new Response(null, { status: 202 });
  }
  switch (msg.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: msg.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "revup", title: "RevUp", version: "1.0.0" },
        instructions: "RevUp read-only tools for the connected business workspace: today's enquiries, review stats, demand radar, upcoming bookings. All tools are read-only and POPIA-safe (counts and short snippets only, no contact details).",
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "resources/list":
      return rpcResult(id, { resources: [{ uri: WIDGET_URI, name: "RevUp overview", mimeType: "text/html+skybridge", description: "Visual summary for RevUp read-only tools." }] });
    case "resources/read":
      if (msg.params?.uri !== WIDGET_URI) return rpcError(id, -32602, "Unknown resource");
      return rpcResult(id, { contents: [{ uri: WIDGET_URI, mimeType: "text/html+skybridge", text: WIDGET_HTML }] });
    case "tools/call": {
      const ws = await workspaceForToken(req, env, poolFn);
      if (!ws) return mcpUnauthorized(base);
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return rpcError(id, -32602, "Unknown tool");
      const db = poolFn(env);
      try {
        const { data, text } = await tool.run(db, ws.workspace_id);
        return rpcResult(id, {
          content: [{ type: "text", text }],
          structuredContent: { ...data, workspace: ws.workspace_name, business: ws.org_name },
        });
      } catch (e: any) {
        return rpcResult(id, { content: [{ type: "text", text: `RevUp could not load that right now: ${String(e).slice(0, 160)}` }], isError: true });
      } finally { await db.end().catch(() => {}); }
    }
    default:
      return rpcError(id, -32601, "Method not found");
  }
}

function corsHeaders(): Record<string, string> {
  return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type,mcp-protocol-version,mcp-session-id" };
}

// ---------- privacy policy (required for the ChatGPT app listing) ----------
export function privacyPage(): string {
  return layout("Privacy policy", `
<div class="card"><h2>Privacy policy - RevUp</h2>
<p class="mut">Last updated 8 November 2026 · NahaLabs, South Africa</p>
<p>RevUp is a business tool from NahaLabs that helps South African businesses answer enquiries, collect Google reviews, follow up leads and manage bookings. This policy explains what we collect and why, in line with the Protection of Personal Information Act (POPIA).</p>
<h3>What we collect</h3>
<ul>
<li>Account details you give us: name, email, business name.</li>
<li>Customer information your customers send you through RevUp: enquiry messages, WhatsApp conversations, booking details.</li>
<li>Usage and technical data needed to run the service.</li>
</ul>
<h3>How we use it</h3>
<ul>
<li>To provide the features you switched on: replying to enquiries, requesting reviews, reminders, bookings and posts.</li>
<li>We never sell personal information and never use your customer data to advertise.</li>
</ul>
<h3>ChatGPT app connection</h3>
<p>If you connect RevUp to ChatGPT, the connection is read-only. It shares counts and short message snippets only - never customer phone numbers, email addresses or full records. You can disconnect at any time from ChatGPT's app settings, which stops all further sharing immediately.</p>
<h3>Your rights</h3>
<p>You may ask to see, correct or delete your information at any time. Customers of a business using RevUp can ask that business directly, or contact us and we will route the request.</p>
<h3>Contact</h3>
<p>Information officer: Thabiso Naha · <a href="mailto:hello@nahalabs.co.za">hello@nahalabs.co.za</a> · South Africa. Complaints may also be lodged with the Information Regulator (South Africa).</p>
</div>`);
}

// ---------- route entry ----------
// Returns null when the path belongs to the rest of the app.
export async function handleChatAppRoute(req: Request, env: any, url: URL, poolFn: (env: any) => any): Promise<Response | null> {
  const path = url.pathname;
  const base = url.origin;
  if (path === "/.well-known/oauth-protected-resource") {
    const r = json({ ...protectedResourceMetadata(base) });
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/.well-known/oauth-authorization-server") {
    const r = json(authMetadata(base));
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/oauth/register" && req.method === "POST") return handleRegisterReal(req, env, poolFn);
  if (path === "/oauth/authorize" && (req.method === "GET" || req.method === "POST")) return handleAuthorize(req, env, url, poolFn);
  if (path === "/oauth/token" && req.method === "POST") return handleToken(req, env, poolFn);
  if (path === "/mcp" || path === "/mcp/") return handleMcp(req, env, url, poolFn);
  if (path === "/privacy") return html(privacyPage());
  return null;
}
