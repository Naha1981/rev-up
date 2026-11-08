// Review-request pipeline, ported from the tested old-stack reviews.py.
// Flow per completed visit: +15 min check-in, +2 h review request with a
// tracked /r/<code> link, +48 h reminder. The reminder is cancelled when the
// link is clicked or the customer opts out. Google policy: a negative
// check-in reply flags the customer for personal follow-up but does NOT
// suppress the review request. Only STOP stops it.
import type { Pool } from "pg";

export const CHECK_IN_DELAY_MIN = 15;
export const REVIEW_REQUEST_DELAY_H = 2;
export const REMINDER_DELAY_H = 48;

const REVIEW_PLANS = new Set(["starter", "growth", "business-pro"]);
export const OPT_OUT_FOOTER = "\nReply STOP to opt out.";

const NEGATIVE_KEYWORDS = [
  "not happy", "unhappy", "not satisfied", "terrible", "awful", "horrible",
  "worst", "bad service", "poor service", "disappointed", "complaint",
  "problem", "broken", "not fixed", "still leaking", "refund", "useless",
  "angry", "not impressed", "still not working", "still not fixed",
  "came back", "waste of money", "rip off", "ripped off", "disgusted",
];

export function looksNegative(body: string): boolean {
  const t = (body || "").toLowerCase();
  return NEGATIVE_KEYWORDS.some((w) => t.includes(w));
}

const firstName = (c: any) => ((c.name || "").trim().split(" ")[0]) || "there";
const businessName = (p: any, ws: string) => (p?.business_name || "") || ws;

export function checkInMessage(profile: any, wsName: string, contact: any): string {
  return `Hey ${firstName(contact)}, this is ${businessName(profile, wsName)}. Just checking in to make sure everything looks good with the work we did today.`;
}
export function reviewRequestMessage(profile: any, wsName: string, contact: any, link: string): string {
  return `Hi ${firstName(contact)}, ${businessName(profile, wsName)} here. Just wanted to say thanks again for the opportunity. If you have 30 seconds, would you mind sharing your experience in a quick Google review? It helps other customers know they can trust us: ${link}`;
}
export function reminderMessage(link: string): string {
  return `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review: ${link}`;
}

export async function startPipeline(db: Pool, workspaceId: string, contactId: string, bookingId: string | null = null): Promise<string | null> {
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, workspaceId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,'check_in','scheduled',now() + ($2 || ' minutes')::interval,'',now(),$3,$4,$5)`,
    [id, String(CHECK_IN_DELAY_MIN), bookingId, contactId, workspaceId]);
  return id;
}

async function ensureLink(db: Pool, workspaceId: string, contactId: string): Promise<any> {
  const ex = await db.query(`SELECT * FROM receptionist_reviewlink WHERE contact_id=$1 LIMIT 1`, [contactId]);
  if (ex.rows[0]) return ex.rows[0];
  const bp = await db.query(`SELECT google_review_url FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  const url = bp.rows[0]?.google_review_url || "";
  if (!url) throw new Error("No Google review link set on the Reviews page.");
  for (let i = 0; i < 5; i++) {
    const code = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const dup = await db.query(`SELECT 1 FROM receptionist_reviewlink WHERE short_code=$1`, [code]);
    if (!dup.rows[0]) {
      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO receptionist_reviewlink(id,workspace_id,contact_id,short_code,original_url,created_at)
         VALUES($1,$2,$3,$4,$5,now())`, [id, workspaceId, contactId, code, url]);
      return (await db.query(`SELECT * FROM receptionist_reviewlink WHERE id=$1`, [id])).rows[0];
    }
  }
  throw new Error("Could not allocate a short link code.");
}

export async function cancelPending(db: Pool, contactId: string, step?: string): Promise<void> {
  if (step) await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled' AND step=$2`, [contactId, step]);
  else await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled'`, [contactId]);
}

export async function unsubscribeContact(db: Pool, contactId: string): Promise<void> {
  await db.query(`UPDATE receptionist_contact SET opted_out=true, opted_out_at=now(), review_status='unsubscribed', updated_at=now() WHERE id=$1`, [contactId]);
  await cancelPending(db, contactId);
}

export async function flagIssue(db: Pool, workspaceId: string, contactId: string, note: string): Promise<void> {
  await db.query(`UPDATE receptionist_contact SET review_status='issue_flagged', issue_note=$1, needs_human=true, updated_at=now() WHERE id=$2`, [note.slice(0, 500), contactId]);
  try {
    await db.query(
      `INSERT INTO receptionist_complaint(id,text,source,status,apology_text,resolution_note,created_at,contact_id,workspace_id)
       VALUES($1,$2,'check_in','new','','',now(),$3,$4)`, [crypto.randomUUID(), note.slice(0, 2000), contactId, workspaceId]);
  } catch { /* complaint record is best-effort */ }
}

export async function resolveIssue(db: Pool, contactId: string): Promise<boolean> {
  const r = await db.query(
    `UPDATE receptionist_contact SET review_status='check_in_sent', issue_note='', updated_at=now() WHERE id=$1 AND review_status='issue_flagged'`, [contactId]);
  return (r.rowCount || 0) > 0;
}

async function reviewGate(db: Pool, workspaceId: string): Promise<string> {
  const p = await db.query(`SELECT review_requests_enabled FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  if (!p.rows[0] || !p.rows[0].review_requests_enabled) return "review requests are off for this workspace";
  const org = await db.query(`SELECT o.plan FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [workspaceId]);
  const plan = org.rows[0]?.plan || "starter";
  if (!REVIEW_PLANS.has(plan)) return `plan ${plan} does not include review requests`;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  if (!ch.rows[0]) return "no connected WhatsApp number";
  return "";
}

// Same guarded send path as receptionist replies: draft row first, then the
// send attempt; failure leaves the draft in the inbox.
export async function deliver(db: Pool, env: any, workspaceId: string, contact: any, body: string): Promise<string> {
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  const channel = ch.rows[0];
  if (!channel) throw new Error("No connected WhatsApp number.");
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`, [outId, body, contact.id, workspaceId]);

  const sandbox = channel.is_sandbox || channel.zernio_account_id === "6a180a034c7f364ffded3c9c";
  const ALLOW = new Set(String(env.SANDBOX_ALLOWLIST || "").split(",").map((s: string) => s.trim()).filter(Boolean));
  if (sandbox && !ALLOW.has(contact.wa_id)) throw new Error("sandbox line may only message allowlisted test numbers");
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`, [workspaceId]);
  if (Number(budget.rows[0].h) >= 20 || Number(budget.rows[0].d) >= 100) throw new Error("send budget reached");
  if (!contact.zernio_conversation_id) throw new Error("customer has no active WhatsApp conversation yet");

  const connQ = await db.query(`SELECT api_key, status FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  const conn = connQ.rows[0];
  if (conn && conn.status === "needs_attention") throw new Error("messaging account needs reconnection");
  const sendKey = conn && conn.status === "connected" && conn.api_key ? conn.api_key : env.ZERNIO_API_KEY;
  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${contact.zernio_conversation_id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sendKey}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: body }),
  });
  if (!resp.ok) throw new Error(`messaging send failed (${resp.status})`);
  const data: any = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
  return outId;
}

export async function sendEvent(db: Pool, env: any, appUrl: string, event: any): Promise<string> {
  const claim = await db.query(
    `UPDATE receptionist_reviewevent SET status='sending' WHERE id=$1 AND status='scheduled'`, [event.id]);
  if (!claim.rowCount) return "cancelled";
  const cq = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [event.contact_id]);
  const contact = cq.rows[0];
  const wq = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [event.workspace_id]);
  const wsName = wq.rows[0]?.name || "the business";
  const pq = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [event.workspace_id]);
  const profile = pq.rows[0];

  if (!contact || contact.opted_out) {
    await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE id=$1`, [event.id]);
    await cancelPending(db, event.contact_id);
    return "cancelled";
  }
  const holdReason = await reviewGate(db, event.workspace_id);
  if (holdReason) {
    await db.query(`UPDATE receptionist_reviewevent SET status='scheduled', scheduled_for=now() + interval '15 minutes' WHERE id=$1`, [event.id]);
    return "held";
  }
  const base = appUrl.replace(/\/$/, "");
  try {
    if (event.step === "check_in") {
      await deliver(db, env, event.workspace_id, contact, checkInMessage(profile, wsName, contact) + OPT_OUT_FOOTER);
      if (contact.review_status !== "issue_flagged")
        await db.query(`UPDATE receptionist_contact SET review_status='check_in_sent', updated_at=now() WHERE id=$1`, [contact.id]);
      await db.query(
        `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
         VALUES($1,'review_request','scheduled',now() + ($2 || ' hours')::interval,'',now(),$3,$4,$5)`,
        [crypto.randomUUID(), String(REVIEW_REQUEST_DELAY_H), event.booking_id, contact.id, event.workspace_id]);
    } else if (event.step === "review_request") {
      const link = await ensureLink(db, event.workspace_id, contact.id);
      await deliver(db, env, event.workspace_id, contact, reviewRequestMessage(profile, wsName, contact, `${base}/r/${link.short_code}`) + OPT_OUT_FOOTER);
      if (contact.review_status !== "issue_flagged")
        await db.query(`UPDATE receptionist_contact SET review_status='review_requested', updated_at=now() WHERE id=$1`, [contact.id]);
      await db.query(
        `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
         VALUES($1,'reminder','scheduled',now() + ($2 || ' hours')::interval,'',now(),$3,$4,$5)`,
        [crypto.randomUUID(), String(REMINDER_DELAY_H), event.booking_id, contact.id, event.workspace_id]);
    } else {
      const found = await db.query(`SELECT * FROM receptionist_reviewlink WHERE contact_id=$1 LIMIT 1`, [contact.id]);
      if (found.rows[0]?.clicked_at) {
        await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE id=$1`, [event.id]);
        return "cancelled";
      }
      if (!found.rows[0]) throw new Error("No tracked link exists for this contact.");
      await deliver(db, env, event.workspace_id, contact, reminderMessage(`${base}/r/${found.rows[0].short_code}`) + OPT_OUT_FOOTER);
    }
  } catch (e: any) {
    await db.query(`UPDATE receptionist_reviewevent SET status='failed', error=$1 WHERE id=$2`, [String(e?.message || e).slice(0, 500), event.id]);
    return "failed";
  }
  await db.query(`UPDATE receptionist_reviewevent SET status='sent', sent_at=now() WHERE id=$1`, [event.id]);
  return "sent";
}

export async function runDueReviewEvents(db: Pool, env: any, appUrl: string, workspaceId?: string): Promise<any> {
  const due = workspaceId
    ? await db.query(
        `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() AND workspace_id=$1 ORDER BY scheduled_for LIMIT 10`, [workspaceId])
    : await db.query(
        `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() ORDER BY scheduled_for LIMIT 10`);
  const results: any = {};
  for (const ev of due.rows) {
    const r = await sendEvent(db, env, appUrl, ev);
    results[r] = (results[r] || 0) + 1;
  }
  return { due: due.rows.length, results };
}

// ---------- service reminders (retention engine, ported from reminders.py) ----------

export function serviceReminderMessage(profile: any, wsName: string, contact: any, service: string): string {
  const what = service || "your vehicle";
  const biz = (profile?.business_name || "") || wsName;
  const name = ((contact.name || "").trim().split(" ")[0]) || "there";
  return `Hi ${name}, ${biz} here. It's time to book ${what} in for its next service. Reply to this message and we will find you a slot.`;
}

export async function scheduleServiceReminder(db: Pool, workspaceId: string, bookingId: string, contactId: string, service: string): Promise<string | null> {
  const p = await db.query(`SELECT service_reminder_days FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  const days = Number(p.rows[0]?.service_reminder_days || 0);
  if (days <= 0) return null;
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1`, [contactId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_servicereminder(id,service,due_on,status,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,$2,(now() AT TIME ZONE 'Africa/Johannesburg')::date + ($3)::int,'scheduled','',now(),$4,$5,$6)`,
    [id, (service || "").slice(0, 200), days, bookingId, contactId, workspaceId]);
  return id;
}

export async function runDueServiceReminders(db: Pool, env: any, workspaceId?: string): Promise<any> {
  const due = workspaceId
    ? await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date AND workspace_id=$1 ORDER BY due_on LIMIT 10`, [workspaceId])
    : await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date ORDER BY due_on LIMIT 10`);
  const results: any = {};
  for (const rem of due.rows) {
    const claim = await db.query(`UPDATE receptionist_servicereminder SET status='sending' WHERE id=$1 AND status='scheduled'`, [rem.id]);
    if (!claim.rowCount) { results.cancelled = (results.cancelled || 0) + 1; continue; }
    const cq = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [rem.contact_id]);
    const contact = cq.rows[0];
    if (!contact || contact.opted_out) {
      await db.query(`UPDATE receptionist_servicereminder SET status='cancelled' WHERE id=$1`, [rem.id]);
      results.cancelled = (results.cancelled || 0) + 1; continue;
    }
    const wq = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [rem.workspace_id]);
    const pq = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [rem.workspace_id]);
    try {
      await deliver(db, env, rem.workspace_id, contact, serviceReminderMessage(pq.rows[0], wq.rows[0]?.name || "the business", contact, rem.service) + OPT_OUT_FOOTER);
    } catch (e: any) {
      // Missing channel or send-guard refusal: keep it scheduled for the next drain.
      await db.query(`UPDATE receptionist_servicereminder SET status='scheduled' WHERE id=$1`, [rem.id]);
      results.held = (results.held || 0) + 1; continue;
    }
    await db.query(`UPDATE receptionist_servicereminder SET status='sent', sent_at=now() WHERE id=$1`, [rem.id]);
    results.sent = (results.sent || 0) + 1;
  }
  return { due: due.rows.length, results };
}
