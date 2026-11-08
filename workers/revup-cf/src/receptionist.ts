import { freeAiGenerate, rejectInventedPrices, FACT_RULES } from "./freeai";
// WhatsApp receptionist: inbound messaging-partner webhook -> AI draft -> auto-reply.
// Bounds (his standing rules): reply only to numbers that messaged first,
// never cold outbound; sandbox line answers his own numbers only; per-workspace
// hourly/daily send caps and per-plan monthly AI reply allowances.
import type { Pool } from "pg";
import { getPreset } from "./presets";

const SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c";
// Opted-in sandbox test numbers come from env (secret), never from the repo.
const sandboxAllow = (env: any) => new Set(String(env.SANDBOX_ALLOWLIST || "").split(",").map((s: string) => s.trim()).filter(Boolean));
const OPT_OUT = new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const PLAN_ALLOWANCE: Record<string, number> = { starter: 500, growth: 1000, "business-pro": 2500 };
const MAX_SENDS_HOUR = 60, MAX_SENDS_DAY = 300, MAX_DRAFTS_DAY = 300, MAX_AI_ATTEMPTS_DAY = 100;

const ESCALATION = [
  /\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b/i,
  /\b(complaint|sue|lawyer|attorney|refund)\b/i,
  /\b(died|death|passed away|deceased)\b/i,
  /\b(emergency|urgent|burst|flooding|no power|sparking)\b/i,
];

export const RULES =
  "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); no emojis. " +
  "When the customer sends photos, acknowledge them by count and never describe, diagnose or " +
  "price what might be in them - a person from the team assesses photos. " +
  "IMPORTANT: the business information above is the COMPLETE list of what this business offers. " +
  "If the customer asks about a service, product, price or policy that is not listed there, " +
  "do NOT say yes and do NOT say no - say a person from the team will confirm. " +
  "If you do not know, say a person will confirm. " + FACT_RULES;

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyZernioSignature(secret: string, body: string, signature: string): Promise<boolean> {
  if (!secret || !signature) return false;
  const expected = await hmacHex(secret, body);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function industryBrief(industry: string): string {
  const p: any = getPreset(industry || "general");
  const label = p.label || "local service";
  let s = `You are the WhatsApp receptionist for a ${label} business in South Africa. Tone: ${p.responder_tone || "warm and professional"}.`;
  const qs: string[] = p.responder_questions || [];
  if (qs.length) s += ` When the customer wants to book or buy, gather: ${qs.join(" ")}`;
  const faqs: string[] = p.responder_faqs || [];
  if (faqs.length) s += ` Common customer questions: ${faqs.join(" ")}`;
  return s;
}

export function profileBlock(p: any): string {
  const lines = [`Business: ${p.business_name || ""}`];
  if (p.operating_hours && Object.keys(p.operating_hours).length) lines.push(`Operating hours: ${JSON.stringify(p.operating_hours)}`);
  if (p.pricing_data && Object.keys(p.pricing_data).length) lines.push(`Price list (ZAR): ${JSON.stringify(p.pricing_data)}`);
  if (p.call_out_fee != null) lines.push(`Call-out fee: R${p.call_out_fee}`);
  if (p.payment_link_url) lines.push("Payments are taken by secure link; share it only when a customer is ready to pay.");
  if (p.custom_rules && Object.keys(p.custom_rules).length) lines.push(`Standing rules from the owner: ${JSON.stringify(p.custom_rules)}`);
  return lines.join("\n");
}

export function customerBlock(c: any): string {
  if (!c) return "";
  const lines: string[] = [];
  if (c.name) lines.push(`Customer name: ${c.name}`);
  if (c.is_vip) lines.push("This customer is a VIP - treat them especially well.");
  if (c.visit_count) lines.push(`They have visited ${c.visit_count} time${c.visit_count === 1 ? "" : "s"} before.`);
  if (c.dietary_notes) lines.push(`Dietary needs: ${c.dietary_notes}`);
  return lines.join("\n");
}

export async function handleZernioWebhook(db: Pool, env: any, payload: any): Promise<void> {
  if ((payload.event || "") !== "message.received") return;
  const message = payload.message || {};
  const account = message.account || payload.account || {};
  const accountId = account.accountId || account._id || "";
  if (!accountId) return;
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE zernio_account_id=$1 LIMIT 1`, [accountId]);
  const channel = ch.rows[0];
  if (!channel) return; // unmapped account: drop, never guess a tenant
  const pr = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [channel.workspace_id]);
  const profile = pr.rows[0];
  if (!profile) return;

  const direction = message.direction || (message.fromMe ? "outbound" : "inbound");
  if (!["inbound", "incoming"].includes(direction)) return;
  let sender: any = message.sender || {};
  if (typeof sender === "string") sender = { id: sender };
  const waId = String(sender.phoneNumber || "").replace(/^\+/, "") || String(sender.id || "").split("@")[0].replace(/^\+/, "");
  let body = String(message.text || message.body || "").trim();
  const media: string[] = (message.attachments || []).map((a: any) => (typeof a === "string" ? a : a.url || a.mediaUrl || a.link || a.src || "")).filter(Boolean).slice(0, 10);
  if (!waId || (!body && !media.length)) return;
  if (!body && media.length) body = `[${media.length} photo${media.length === 1 ? "" : "s"} received]`;
  const conv = payload.conversation || {};
  const convId = String(conv.id || conv.conversationId || "");
  const senderName = sender.name || conv.participantName || "";
  const zid = String(message._id || message.id || "");

  // contact upsert
  let contact: any;
  const cr = await db.query(`SELECT * FROM receptionist_contact WHERE workspace_id=$1 AND wa_id=$2 LIMIT 1`, [channel.workspace_id, waId]);
  if (cr.rows[0]) {
    contact = cr.rows[0];
    if (convId && contact.zernio_conversation_id !== convId)
      await db.query(`UPDATE receptionist_contact SET zernio_conversation_id=$1, updated_at=now() WHERE id=$2`, [convId, contact.id]);
  } else {
    const id = crypto.randomUUID();
    const ins = await db.query(
      `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
       VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,$5,'','new','',false,'',0,0,now(),now()) RETURNING *`,
      [id, channel.workspace_id, waId.slice(0, 32), String(senderName).slice(0, 120), convId]);
    contact = ins.rows[0];
  }
  if (zid) {
    const dup = await db.query(`SELECT 1 FROM receptionist_message WHERE workspace_id=$1 AND zernio_message_id=$2 LIMIT 1`, [channel.workspace_id, zid]);
    if (dup.rows[0]) return;
  }
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,$6::jsonb)`,
    [crypto.randomUUID(), body, zid, contact.id, channel.workspace_id, JSON.stringify(media)]);

  if (OPT_OUT.has(body.trim().toUpperCase())) {
    const { unsubscribeContact } = await import("./reviews");
    await unsubscribeContact(db, contact.id);
    return;
  }

  // Owner assistant (Business Pro): the owner's own number talks to the
  // assistant, not the customer receptionist. Fully handled there when it matches.
  {
    const { maybeHandleAssistant } = await import("./assistant");
    if (await maybeHandleAssistant(db, env, {
      workspaceId: channel.workspace_id, waId, body, contactId: contact.id,
      zernioMessageId: zid, channel, businessName: String(profile.business_name || ""),
    })) return;
  }

  // A negative reply right after a check-in or review ask flags the customer
  // for personal follow-up (Google policy: never suppress the ask itself).
  if (["check_in_sent", "review_requested"].includes(contact.review_status || "")) {
    const { looksNegative, flagIssue } = await import("./reviews");
    if (looksNegative(body)) {
      await flagIssue(db, channel.workspace_id, contact.id, body);
      return; // a person takes it from the inbox
    }
  }

  // monthly plan allowance (org-wide AI replies); unpaid orgs get starter level
  const org = await db.query(`SELECT o.plan, o.id, o.subscription_status FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [channel.workspace_id]);
  const plan = org.rows[0]?.plan || "starter";
  const allowance = org.rows[0]?.subscription_status === "active" ? (PLAN_ALLOWANCE[plan] ?? 500) : 500;
  const used = await db.query(
    `SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id
     WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`,
    [org.rows[0]?.id]);
  if (Number(used.rows[0].c) >= allowance) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const todayDrafts = await db.query(
    `SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND sender_type='ai' AND created_at >= now() - interval '1 day'`,
    [channel.workspace_id]);
  if (Number(todayDrafts.rows[0].c) >= MAX_DRAFTS_DAY) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }

  // history oldest-first, last 12
  const hist = await db.query(`SELECT sender_type, body FROM receptionist_message WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 12`, [contact.id]);
  const transcript = hist.rows.reverse().map((m: any) => `${m.sender_type === "user" ? "Customer" : "Receptionist"}: ${m.body}`).join("\n");
  const now = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const incoming = media.length ? `[Customer sent ${media.length} photo${media.length === 1 ? "" : "s"}] ${body}`.trim() : body;
  const prompt =
    `Today is ${now}, South Africa time.\n${industryBrief(profile.industry || "general")}\n${profileBlock(profile)}\n` +
    (customerBlock(contact) ? customerBlock(contact) + "\n" : "") + "\n" +
    `Conversation so far:\n${transcript}\n\n` +
    `Reply with JSON only: {"reply": "...", "intake": {"name": "", "detail": "", "preferred_time": "", "address": "", "policy_number": ""}} ` +
    `(fill only the intake fields the customer actually gave; make detail a short description of what they want - for a restaurant booking use 'Table for N', never a bare number).\n${RULES}`;

  // persistent per-business daily AI-attempt cap (his mandate: enquiry-text backup
  // stays bounded even on free providers). One enquiry = one AI attempt; the count
  // lives in Postgres so it survives worker restarts. Cap hit: flag for a human, no draft.
  await db.query(`CREATE TABLE IF NOT EXISTS cf_ai_usage(workspace_id uuid, day date, attempts int NOT NULL DEFAULT 0, PRIMARY KEY(workspace_id, day))`);
  const usage = await db.query(
    `INSERT INTO cf_ai_usage(workspace_id, day, attempts) VALUES($1, CURRENT_DATE, 1)
     ON CONFLICT (workspace_id, day) DO UPDATE SET attempts = cf_ai_usage.attempts + 1
     RETURNING attempts`, [channel.workspace_id]);
  if (Number(usage.rows[0].attempts) > MAX_AI_ATTEMPTS_DAY) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const aiResult = await freeAiGenerate<any>(env, prompt, { maxTokens: 800, temperature: 0.2, requireBackupConsent: true }, rejectInventedPrices(prompt, (text) => {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const d = JSON.parse(m[0]);
      return d && typeof d === "object" ? d : null;
    } catch { return null; }
  }));
  if (!aiResult) return; // all providers unavailable: conversation stays in inbox for a human
  const draft: any = aiResult.value;
  const reply = String(draft.reply || "").trim();
  if (!reply) return;

  const escalate = ESCALATION.some((re) => re.test(incoming));
  if (escalate) await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, reply, contact.id, channel.workspace_id]);

  // intake -> booking record for the owner + industry board record
  const intake = draft.intake || {};
  let detail = String(intake.detail || "").trim();
  const preferred = String(intake.preferred_time || "").trim();
  const industry = String(profile.industry || "general");
  if (industry === "restaurant" && /^\d+$/.test(detail)) detail = `Table for ${detail}`;
  if (detail || preferred) {
    try {
      await db.query(`INSERT INTO receptionist_booking(id,service,preferred_time,status,notes,created_at,contact_id,workspace_id,duration_minutes,google_event_id,value)
        VALUES($1,$2,$3,'requested','',now(),$4,$5,60,'',0)`,
        [crypto.randomUUID(), detail.slice(0, 200), preferred.slice(0, 200), contact.id, channel.workspace_id]);
    } catch { /* intake is best-effort */ }
  }
  const inName = String(intake.name || "").trim();
  const inAddress = String(intake.address || "").trim();
  const inPolicy = String(intake.policy_number || "").trim();
  try {
    if (industry === "funeral" && (inName || detail || inPolicy)) {
      await db.query(`INSERT INTO receptionist_funeralclaim(id,deceased_name,claimant_name,policy_number,status,notes,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,$4,'new','',now(),$5,$6)`, [crypto.randomUUID(), detail.slice(0, 200), inName.slice(0, 200), inPolicy.slice(0, 64), contact.id, channel.workspace_id]);
    } else if (industry === "dental" && (inName || detail)) {
      await db.query(`INSERT INTO receptionist_dentalappointment(id,patient_name,reason,status,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,'new',now(),$4,$5)`, [crypto.randomUUID(), inName.slice(0, 200), detail.slice(0, 300), contact.id, channel.workspace_id]);
    } else if (industry === "trades" && (detail || inAddress)) {
      await db.query(`INSERT INTO receptionist_tradedispatch(id,job_type,address,urgent,status,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,false,'new',now(),$4,$5)`, [crypto.randomUUID(), detail.slice(0, 120), inAddress.slice(0, 300), contact.id, channel.workspace_id]);
    }
  } catch { /* industry board record is best-effort */ }

  const sent = await sendChannelMessage(db, env, channel, contact.id, waId, reply);
  if (!sent.ok) return; // draft stays for retry/inbox
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sent.messageId, outId]);
}

// Shared WhatsApp send: reply-only guards, sandbox allowlist, per-workspace
// send budget, tenant key first (a workspace with its own messaging account
// sends on ITS key and plan). Used by the receptionist and the owner assistant.
export async function sendChannelMessage(db: Pool, env: any, channel: any, contactId: string, waId: string, text: string): Promise<{ ok: boolean; messageId: string }> {
  const sandbox = channel.is_sandbox || channel.zernio_account_id === SANDBOX_ACCOUNT_ID;
  if (sandbox && !sandboxAllow(env).has(waId)) return { ok: false, messageId: "" };
  const sentHour = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 hour'`, [channel.workspace_id]);
  const sentDay = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 day'`, [channel.workspace_id]);
  if (Number(sentHour.rows[0].c) >= MAX_SENDS_HOUR || Number(sentDay.rows[0].c) >= MAX_SENDS_DAY) return { ok: false, messageId: "" };
  const cq = await db.query(`SELECT zernio_conversation_id FROM receptionist_contact WHERE id=$1`, [contactId]);
  const convId = cq.rows[0]?.zernio_conversation_id;
  if (!convId) return { ok: false, messageId: "" };

  // a workspace with its own messaging account sends on ITS key and plan
  const connQ = await db.query(`SELECT api_key, status FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [channel.workspace_id]);
  const conn = connQ.rows[0];
  if (conn && conn.status === "needs_attention") return { ok: false, messageId: "" }; // hold drafts until they reconnect
  const sendKey = conn && conn.status === "connected" && conn.api_key ? conn.api_key : env.ZERNIO_API_KEY;

  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sendKey}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: text }),
  });
  if (!resp.ok) return { ok: false, messageId: "" }; // draft stays for retry/inbox
  const data: any = await resp.json().catch(() => ({}));
  return { ok: true, messageId: String(data?.message?.id || data?.messageId || data?.id || "") };
}

// ---------- tenant self-serve WhatsApp connect (their own messaging account) ----------

const ZBASE = "https://zernio.com/api/v1";

async function zget(apiKey: string, path: string): Promise<any> {
  const resp = await fetch(ZBASE + path, { headers: { authorization: `Bearer ${apiKey}` } });
  if (!resp.ok) { const e: any = new Error("zernio " + resp.status); e.status = resp.status; throw e; }
  return resp.json();
}
async function zpost(apiKey: string, path: string, body: any): Promise<any> {
  const resp = await fetch(ZBASE + path, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) { const e: any = new Error("zernio " + resp.status); e.status = resp.status; throw e; }
  return resp.json();
}

export async function validateTenantKey(apiKey: string, workspaceId: string, workspaceName: string): Promise<{ profileId: string; error: string }> {
  try {
    await zget(apiKey, "/accounts");
    const byExt = await zget(apiKey, `/profiles?externalId=${encodeURIComponent(workspaceId)}`).catch(() => ({}));
    let profile = (byExt.profiles || [])[0] || byExt.profile;
    if (!profile) {
      const all = await zget(apiKey, "/profiles");
      const profiles = all.profiles || [];
      if (profiles.length === 1) profile = profiles[0];
    }
    if (!profile) {
      const made = await zpost(apiKey, "/profiles", { name: workspaceName.slice(0, 80), externalId: workspaceId });
      profile = made.profile;
    }
    return { profileId: String(profile?._id || profile?.id || ""), error: "" };
  } catch (e: any) {
    if (e.status === 401 || e.status === 403) return { profileId: "", error: "That key was not accepted. Copy the full key from your messaging account and paste it again." };
    if (e.status === 402) return { profileId: "", error: "Your messaging plan covers 2 numbers. Add a card in your messaging account to connect more." };
    return { profileId: "", error: "Could not reach the messaging service. Please try again." };
  }
}

export async function tenantConnectUrl(apiKey: string, profileId: string, redirectUrl: string): Promise<string> {
  const data = await zget(apiKey, `/connect/whatsapp?profileId=${encodeURIComponent(profileId)}&redirect_url=${encodeURIComponent(redirectUrl)}`);
  const url = data.authUrl || data.data?.authUrl;
  if (!url) throw new Error("no authUrl");
  return url;
}

export async function tenantConfirmAndBind(db: any, conn: any, profileId: string, accountId: string, webhookUrl: string): Promise<{ ok: boolean; msg: string }> {
  const accounts = await zget(conn.api_key, `/accounts?profileId=${encodeURIComponent(profileId)}&platform=whatsapp`);
  const list = accounts.accounts || [];
  const match = list.find((a: any) => String(a._id || a.id) === accountId);
  if (!match) return { ok: false, msg: "That number was not found on your messaging account. Please try again." };
  const secret = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  let webhookId = "", webhookOk = false;
  try {
    const hook = await zpost(conn.api_key, "/webhooks/settings", {
      name: "revup-" + conn.workspace_id, url: webhookUrl, secret,
      events: ["message.received", "message.delivered", "message.read", "account.disconnected"], profileIds: [profileId],
    });
    webhookId = String(hook.webhook?._id || hook.webhook?.id || "");
    if (webhookId) { const t = await zpost(conn.api_key, "/webhooks/test", { webhookId }); webhookOk = !!t.success; }
  } catch { /* registration failed: still bind, note in last_error */ }
  const phone = String(match.username || match.phoneNumber || "").replace(/^\+/, "");
  await db.query(
    `UPDATE receptionist_tenantmessagingconnection SET account_id=$1, phone_number=$2, webhook_id=$3, webhook_secret=$4, status='connected', last_error=$5, updated_at=now() WHERE workspace_id=$6`,
    [accountId, phone, webhookId, webhookId ? secret : "", webhookOk ? "" : "Webhook check did not pass yet - replies may be delayed.", conn.workspace_id]);
  const ex = await db.query(`SELECT id FROM receptionist_zerniochannel WHERE workspace_id=$1`, [conn.workspace_id]);
  if (ex.rows[0]) {
    await db.query(`UPDATE receptionist_zerniochannel SET zernio_account_id=$1, zernio_profile_id=$2, phone_number=$3, label=$4, is_sandbox=false WHERE workspace_id=$5`,
      [accountId, profileId, phone, match.name || "WhatsApp", conn.workspace_id]);
  } else {
    await db.query(
      `INSERT INTO receptionist_zerniochannel(id,workspace_id,zernio_account_id,zernio_profile_id,phone_number,label,is_sandbox,connected_at)
       VALUES($1,$2,$3,$4,$5,$6,false,now())`,
      [crypto.randomUUID(), conn.workspace_id, accountId, profileId, phone, match.name || "WhatsApp"]);
  }
  return { ok: true, msg: webhookOk ? "WhatsApp connected. Your receptionist is live on your number." : "Connected, but the delivery check did not pass yet - replies may be delayed." };
}

export async function tenantWebhookSecret(db: any, payload: any): Promise<string> {
  const account = payload?.message?.account || payload?.account || {};
  const accountId = account.accountId || account._id || payload?.accountId || "";
  const profileId = account.profileId || payload?.profileId || "";
  if (accountId) {
    const r = await db.query(`SELECT webhook_secret FROM receptionist_tenantmessagingconnection WHERE account_id=$1 AND webhook_secret<>'' LIMIT 1`, [accountId]);
    if (r.rows[0]) return r.rows[0].webhook_secret;
  }
  if (profileId) {
    const r = await db.query(`SELECT webhook_secret FROM receptionist_tenantmessagingconnection WHERE profile_id=$1 AND webhook_secret<>'' LIMIT 1`, [profileId]);
    if (r.rows[0]) return r.rows[0].webhook_secret;
  }
  return "";
}
