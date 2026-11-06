// WhatsApp receptionist: inbound Zernio webhook -> AI draft -> auto-reply.
// Bounds (his standing rules): reply only to numbers that messaged first,
// never cold outbound; sandbox line answers his own numbers only; per-workspace
// hourly/daily send caps and per-plan monthly AI reply allowances.
import type { Pool } from "pg";
import { getPreset } from "./presets";

const SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c";
const SANDBOX_SEND_ALLOWLIST = new Set(["27672347593", "27612980377"]);
const OPT_OUT = new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const PLAN_ALLOWANCE: Record<string, number> = { starter: 500, growth: 1000, "business-pro": 2500 };
const MAX_SENDS_HOUR = 60, MAX_SENDS_DAY = 300, MAX_DRAFTS_DAY = 300;

const ESCALATION = [
  /\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b/i,
  /\b(complaint|sue|lawyer|attorney|refund)\b/i,
  /\b(died|death|passed away|deceased)\b/i,
  /\b(emergency|urgent|burst|flooding|no power|sparking)\b/i,
];

const RULES =
  "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); " +
  "no emojis; never mention you are an AI unless asked. " +
  "When the customer sends photos, acknowledge them by count and never describe, diagnose or " +
  "price what might be in them - a person from the team assesses photos. " +
  "IMPORTANT: the business information above is the COMPLETE list of what this business offers. " +
  "If the customer asks about a service, product, price or policy that is not listed there, " +
  "do NOT say yes and do NOT say no - say a person from the team will confirm. " +
  "If you do not know, say a person will confirm.";

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

async function groqDraft(apiKey: string, prompt: string): Promise<string> {
  let lastErr = "no response";
  for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 800, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) { lastErr = `groq ${resp.status}`; continue; }
        const data: any = await resp.json();
        const content: string = data?.choices?.[0]?.message?.content || "";
        const m = content.match(/\{.*\}/s);
        if (m) return m[0];
        lastErr = "no JSON in reply";
      } catch (e: any) { lastErr = String(e).slice(0, 120); }
    }
  }
  throw new Error(lastErr);
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
    await db.query(`UPDATE receptionist_contact SET opted_out=true, opted_out_at=now(), updated_at=now() WHERE id=$1`, [contact.id]);
    return;
  }

  // monthly plan allowance (org-wide AI replies)
  const org = await db.query(`SELECT o.plan, o.id FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [channel.workspace_id]);
  const plan = org.rows[0]?.plan || "starter";
  const allowance = PLAN_ALLOWANCE[plan] ?? 500;
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

  let draft: any = { reply: "", intake: {} };
  try {
    draft = JSON.parse(await groqDraft(env.GROQ_API_KEY, prompt));
  } catch { return; } // drafting failed: conversation stays in inbox for a human
  const reply = String(draft.reply || "").trim();
  if (!reply) return;

  const escalate = ESCALATION.some((re) => re.test(incoming));
  if (escalate) await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, reply, contact.id, channel.workspace_id]);

  // intake -> booking record for the owner
  const intake = draft.intake || {};
  const detail = String(intake.detail || "").trim(), preferred = String(intake.preferred_time || "").trim();
  if (detail || preferred) {
    try {
      await db.query(`INSERT INTO receptionist_booking(id,service,preferred_time,status,notes,created_at,contact_id,workspace_id,duration_minutes,google_event_id,value)
        VALUES($1,$2,$3,'new','',now(),$4,$5,60,'',0)`,
        [crypto.randomUUID(), detail.slice(0, 200), preferred.slice(0, 200), contact.id, channel.workspace_id]);
    } catch { /* intake is best-effort */ }
  }

  // send guard: reply-only, sandbox allowlist, send budget
  const sandbox = channel.is_sandbox || channel.zernio_account_id === SANDBOX_ACCOUNT_ID;
  if (sandbox && !SANDBOX_SEND_ALLOWLIST.has(waId)) return; // draft stays for the inbox
  const sentHour = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 hour'`, [channel.workspace_id]);
  const sentDay = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 day'`, [channel.workspace_id]);
  if (Number(sentHour.rows[0].c) >= MAX_SENDS_HOUR || Number(sentDay.rows[0].c) >= MAX_SENDS_DAY) return;
  if (!contact.zernio_conversation_id) return;

  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${contact.zernio_conversation_id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.ZERNIO_API_KEY}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: reply }),
  });
  if (!resp.ok) return; // draft stays for retry/inbox
  const data: any = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
}
