var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/reviews.ts
var reviews_exports = {};
__export(reviews_exports, {
  CHECK_IN_DELAY_MIN: () => CHECK_IN_DELAY_MIN,
  OPT_OUT_FOOTER: () => OPT_OUT_FOOTER,
  REMINDER_DELAY_H: () => REMINDER_DELAY_H,
  REVIEW_REQUEST_DELAY_H: () => REVIEW_REQUEST_DELAY_H,
  cancelPending: () => cancelPending,
  checkInMessage: () => checkInMessage,
  deliver: () => deliver,
  flagIssue: () => flagIssue,
  looksNegative: () => looksNegative,
  reminderMessage: () => reminderMessage,
  resolveIssue: () => resolveIssue,
  reviewRequestMessage: () => reviewRequestMessage,
  runDueReviewEvents: () => runDueReviewEvents,
  runDueServiceReminders: () => runDueServiceReminders,
  scheduleServiceReminder: () => scheduleServiceReminder,
  sendEvent: () => sendEvent,
  serviceReminderMessage: () => serviceReminderMessage,
  startPipeline: () => startPipeline,
  unsubscribeContact: () => unsubscribeContact
});
function looksNegative(body) {
  const t = (body || "").toLowerCase();
  return NEGATIVE_KEYWORDS.some((w) => t.includes(w));
}
function checkInMessage(profile, wsName, contact) {
  return `Hey ${firstName(contact)}, this is ${businessName(profile, wsName)}. Just checking in to make sure everything looks good with the work we did today.`;
}
function reviewRequestMessage(profile, wsName, contact, link) {
  return `Hi ${firstName(contact)}, ${businessName(profile, wsName)} here. Just wanted to say thanks again for the opportunity. If you have 30 seconds, would you mind sharing your experience in a quick Google review? It helps other customers know they can trust us: ${link}`;
}
function reminderMessage(link) {
  return `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review: ${link}`;
}
async function startPipeline(db, workspaceId, contactId, bookingId = null) {
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, workspaceId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,'check_in','scheduled',now() + ($2 || ' minutes')::interval,'',now(),$3,$4,$5)`,
    [id, String(CHECK_IN_DELAY_MIN), bookingId, contactId, workspaceId]
  );
  return id;
}
async function ensureLink(db, workspaceId, contactId) {
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
         VALUES($1,$2,$3,$4,$5,now())`,
        [id, workspaceId, contactId, code, url]
      );
      return (await db.query(`SELECT * FROM receptionist_reviewlink WHERE id=$1`, [id])).rows[0];
    }
  }
  throw new Error("Could not allocate a short link code.");
}
async function cancelPending(db, contactId, step) {
  if (step) await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled' AND step=$2`, [contactId, step]);
  else await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled'`, [contactId]);
}
async function unsubscribeContact(db, contactId) {
  await db.query(`UPDATE receptionist_contact SET opted_out=true, opted_out_at=now(), review_status='unsubscribed', updated_at=now() WHERE id=$1`, [contactId]);
  await cancelPending(db, contactId);
}
async function flagIssue(db, workspaceId, contactId, note) {
  await db.query(`UPDATE receptionist_contact SET review_status='issue_flagged', issue_note=$1, needs_human=true, updated_at=now() WHERE id=$2`, [note.slice(0, 500), contactId]);
  try {
    await db.query(
      `INSERT INTO receptionist_complaint(id,text,source,status,apology_text,resolution_note,created_at,contact_id,workspace_id)
       VALUES($1,$2,'check_in','new','','',now(),$3,$4)`,
      [crypto.randomUUID(), note.slice(0, 2e3), contactId, workspaceId]
    );
  } catch {
  }
}
async function resolveIssue(db, contactId) {
  const r = await db.query(
    `UPDATE receptionist_contact SET review_status='check_in_sent', issue_note='', updated_at=now() WHERE id=$1 AND review_status='issue_flagged'`,
    [contactId]
  );
  return (r.rowCount || 0) > 0;
}
async function reviewGate(db, workspaceId) {
  const p = await db.query(`SELECT review_requests_enabled FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  if (!p.rows[0] || !p.rows[0].review_requests_enabled) return "review requests are off for this workspace";
  const org = await db.query(`SELECT o.plan FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [workspaceId]);
  const plan = org.rows[0]?.plan || "starter";
  if (!REVIEW_PLANS.has(plan)) return `plan ${plan} does not include review requests`;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  if (!ch.rows[0]) return "no connected WhatsApp number";
  return "";
}
async function deliver(db, env, workspaceId, contact, body) {
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  const channel = ch.rows[0];
  if (!channel) throw new Error("No connected WhatsApp number.");
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, body, contact.id, workspaceId]
  );
  const sandbox = channel.is_sandbox || channel.zernio_account_id === "6a180a034c7f364ffded3c9c";
  const ALLOW = /* @__PURE__ */ new Set(["27672347593", "27612980377"]);
  if (sandbox && !ALLOW.has(contact.wa_id)) throw new Error("sandbox line may only message allowlisted test numbers");
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`,
    [workspaceId]
  );
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
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: body })
  });
  if (!resp.ok) throw new Error(`messaging send failed (${resp.status})`);
  const data = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
  return outId;
}
async function sendEvent(db, env, appUrl, event) {
  const claim = await db.query(
    `UPDATE receptionist_reviewevent SET status='sending' WHERE id=$1 AND status='scheduled'`,
    [event.id]
  );
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
        [crypto.randomUUID(), String(REVIEW_REQUEST_DELAY_H), event.booking_id, contact.id, event.workspace_id]
      );
    } else if (event.step === "review_request") {
      const link = await ensureLink(db, event.workspace_id, contact.id);
      await deliver(db, env, event.workspace_id, contact, reviewRequestMessage(profile, wsName, contact, `${base}/r/${link.short_code}`) + OPT_OUT_FOOTER);
      if (contact.review_status !== "issue_flagged")
        await db.query(`UPDATE receptionist_contact SET review_status='review_requested', updated_at=now() WHERE id=$1`, [contact.id]);
      await db.query(
        `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
         VALUES($1,'reminder','scheduled',now() + ($2 || ' hours')::interval,'',now(),$3,$4,$5)`,
        [crypto.randomUUID(), String(REMINDER_DELAY_H), event.booking_id, contact.id, event.workspace_id]
      );
    } else {
      const found = await db.query(`SELECT * FROM receptionist_reviewlink WHERE contact_id=$1 LIMIT 1`, [contact.id]);
      if (found.rows[0]?.clicked_at) {
        await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE id=$1`, [event.id]);
        return "cancelled";
      }
      if (!found.rows[0]) throw new Error("No tracked link exists for this contact.");
      await deliver(db, env, event.workspace_id, contact, reminderMessage(`${base}/r/${found.rows[0].short_code}`) + OPT_OUT_FOOTER);
    }
  } catch (e) {
    await db.query(`UPDATE receptionist_reviewevent SET status='failed', error=$1 WHERE id=$2`, [String(e?.message || e).slice(0, 500), event.id]);
    return "failed";
  }
  await db.query(`UPDATE receptionist_reviewevent SET status='sent', sent_at=now() WHERE id=$1`, [event.id]);
  return "sent";
}
async function runDueReviewEvents(db, env, appUrl, workspaceId) {
  const due = workspaceId ? await db.query(
    `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() AND workspace_id=$1 ORDER BY scheduled_for LIMIT 10`,
    [workspaceId]
  ) : await db.query(
    `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() ORDER BY scheduled_for LIMIT 10`
  );
  const results = {};
  for (const ev of due.rows) {
    const r = await sendEvent(db, env, appUrl, ev);
    results[r] = (results[r] || 0) + 1;
  }
  return { due: due.rows.length, results };
}
function serviceReminderMessage(profile, wsName, contact, service) {
  const what = service || "your vehicle";
  const biz = profile?.business_name || "" || wsName;
  const name = (contact.name || "").trim().split(" ")[0] || "there";
  return `Hi ${name}, ${biz} here. It's time to book ${what} in for its next service. Reply to this message and we will find you a slot.`;
}
async function scheduleServiceReminder(db, workspaceId, bookingId, contactId, service) {
  const p = await db.query(`SELECT service_reminder_days FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  const days = Number(p.rows[0]?.service_reminder_days || 0);
  if (days <= 0) return null;
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1`, [contactId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_servicereminder(id,service,due_on,status,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,$2,(now() AT TIME ZONE 'Africa/Johannesburg')::date + ($3)::int,'scheduled','',now(),$4,$5,$6)`,
    [id, (service || "").slice(0, 200), days, bookingId, contactId, workspaceId]
  );
  return id;
}
async function runDueServiceReminders(db, env, workspaceId) {
  const due = workspaceId ? await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date AND workspace_id=$1 ORDER BY due_on LIMIT 10`, [workspaceId]) : await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date ORDER BY due_on LIMIT 10`);
  const results = {};
  for (const rem of due.rows) {
    const claim = await db.query(`UPDATE receptionist_servicereminder SET status='sending' WHERE id=$1 AND status='scheduled'`, [rem.id]);
    if (!claim.rowCount) {
      results.cancelled = (results.cancelled || 0) + 1;
      continue;
    }
    const cq = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [rem.contact_id]);
    const contact = cq.rows[0];
    if (!contact || contact.opted_out) {
      await db.query(`UPDATE receptionist_servicereminder SET status='cancelled' WHERE id=$1`, [rem.id]);
      results.cancelled = (results.cancelled || 0) + 1;
      continue;
    }
    const wq = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [rem.workspace_id]);
    const pq = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [rem.workspace_id]);
    try {
      await deliver(db, env, rem.workspace_id, contact, serviceReminderMessage(pq.rows[0], wq.rows[0]?.name || "the business", contact, rem.service) + OPT_OUT_FOOTER);
    } catch (e) {
      await db.query(`UPDATE receptionist_servicereminder SET status='scheduled' WHERE id=$1`, [rem.id]);
      results.held = (results.held || 0) + 1;
      continue;
    }
    await db.query(`UPDATE receptionist_servicereminder SET status='sent', sent_at=now() WHERE id=$1`, [rem.id]);
    results.sent = (results.sent || 0) + 1;
  }
  return { due: due.rows.length, results };
}
var CHECK_IN_DELAY_MIN, REVIEW_REQUEST_DELAY_H, REMINDER_DELAY_H, REVIEW_PLANS, OPT_OUT_FOOTER, NEGATIVE_KEYWORDS, firstName, businessName;
var init_reviews = __esm({
  "src/reviews.ts"() {
    CHECK_IN_DELAY_MIN = 15;
    REVIEW_REQUEST_DELAY_H = 2;
    REMINDER_DELAY_H = 48;
    REVIEW_PLANS = /* @__PURE__ */ new Set(["starter", "growth", "business-pro"]);
    OPT_OUT_FOOTER = "\nReply STOP to opt out.";
    NEGATIVE_KEYWORDS = [
      "not happy",
      "unhappy",
      "not satisfied",
      "terrible",
      "awful",
      "horrible",
      "worst",
      "bad service",
      "poor service",
      "disappointed",
      "complaint",
      "problem",
      "broken",
      "not fixed",
      "still leaking",
      "refund",
      "useless",
      "angry",
      "not impressed",
      "still not working",
      "still not fixed",
      "came back",
      "waste of money",
      "rip off",
      "ripped off",
      "disgusted"
    ];
    firstName = (c) => (c.name || "").trim().split(" ")[0] || "there";
    businessName = (p, ws) => p?.business_name || "" || ws;
  }
});

// node_modules/spark-md5/spark-md5.js
var require_spark_md5 = __commonJS({
  "node_modules/spark-md5/spark-md5.js"(exports, module) {
    (function(factory) {
      if (typeof exports === "object") {
        module.exports = factory();
      } else if (typeof define === "function" && define.amd) {
        define(factory);
      } else {
        var glob;
        try {
          glob = window;
        } catch (e) {
          glob = self;
        }
        glob.SparkMD5 = factory();
      }
    })(function(undefined2) {
      "use strict";
      var add32 = function(a, b) {
        return a + b & 4294967295;
      }, hex_chr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
      function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32(a << s | a >>> 32 - s, b);
      }
      function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];
        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
      }
      function md5blk(s) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
      }
      function md5blk_array(a) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
      }
      function md51(s) {
        var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function md51_array(a) {
        var n = a.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }
        a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= a[i] << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function rhex(n) {
        var s = "", j;
        for (j = 0; j < 4; j += 1) {
          s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
        }
        return s;
      }
      function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
          x[i] = rhex(x[i]);
        }
        return x.join("");
      }
      if (hex(md51("hello")) !== "5d41402abc4b2a76b9719d911017c592") {
        add32 = function(x, y) {
          var lsw = (x & 65535) + (y & 65535), msw = (x >> 16) + (y >> 16) + (lsw >> 16);
          return msw << 16 | lsw & 65535;
        };
      }
      if (typeof ArrayBuffer !== "undefined" && !ArrayBuffer.prototype.slice) {
        (function() {
          function clamp(val, length) {
            val = val | 0 || 0;
            if (val < 0) {
              return Math.max(val + length, 0);
            }
            return Math.min(val, length);
          }
          ArrayBuffer.prototype.slice = function(from, to) {
            var length = this.byteLength, begin = clamp(from, length), end = length, num, target, targetArray, sourceArray;
            if (to !== undefined2) {
              end = clamp(to, length);
            }
            if (begin > end) {
              return new ArrayBuffer(0);
            }
            num = end - begin;
            target = new ArrayBuffer(num);
            targetArray = new Uint8Array(target);
            sourceArray = new Uint8Array(this, begin, num);
            targetArray.set(sourceArray);
            return target;
          };
        })();
      }
      function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
          str = unescape(encodeURIComponent(str));
        }
        return str;
      }
      function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length, buff = new ArrayBuffer(length), arr = new Uint8Array(buff), i;
        for (i = 0; i < length; i += 1) {
          arr[i] = str.charCodeAt(i);
        }
        return returnUInt8Array ? arr : buff;
      }
      function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
      }
      function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);
        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);
        return returnUInt8Array ? result : result.buffer;
      }
      function hexToBinaryString(hex2) {
        var bytes = [], length = hex2.length, x;
        for (x = 0; x < length - 1; x += 2) {
          bytes.push(parseInt(hex2.substr(x, 2), 16));
        }
        return String.fromCharCode.apply(String, bytes);
      }
      function SparkMD52() {
        this.reset();
      }
      SparkMD52.prototype.append = function(str) {
        this.appendBinary(toUtf8(str));
        return this;
      };
      SparkMD52.prototype.appendBinary = function(contents) {
        this._buff += contents;
        this._length += contents.length;
        var length = this._buff.length, i;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }
        this._buff = this._buff.substring(i - 64);
        return this;
      };
      SparkMD52.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, i, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.prototype.reset = function() {
        this._buff = "";
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.prototype.getState = function() {
        return {
          buff: this._buff,
          length: this._length,
          hash: this._hash.slice()
        };
      };
      SparkMD52.prototype.setState = function(state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;
        return this;
      };
      SparkMD52.prototype.destroy = function() {
        delete this._hash;
        delete this._buff;
        delete this._length;
      };
      SparkMD52.prototype._finish = function(tail, length) {
        var i = length, tmp, lo, hi;
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(this._hash, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
      };
      SparkMD52.hash = function(str, raw) {
        return SparkMD52.hashBinary(toUtf8(str), raw);
      };
      SparkMD52.hashBinary = function(content, raw) {
        var hash = md51(content), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      SparkMD52.ArrayBuffer = function() {
        this.reset();
      };
      SparkMD52.ArrayBuffer.prototype.append = function(arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true), length = buff.length, i;
        this._length += arr.byteLength;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }
        this._buff = i - 64 < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], i, ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff[i] << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.ArrayBuffer.prototype.reset = function() {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.getState = function() {
        var state = SparkMD52.prototype.getState.call(this);
        state.buff = arrayBuffer2Utf8Str(state.buff);
        return state;
      };
      SparkMD52.ArrayBuffer.prototype.setState = function(state) {
        state.buff = utf8Str2ArrayBuffer(state.buff, true);
        return SparkMD52.prototype.setState.call(this, state);
      };
      SparkMD52.ArrayBuffer.prototype.destroy = SparkMD52.prototype.destroy;
      SparkMD52.ArrayBuffer.prototype._finish = SparkMD52.prototype._finish;
      SparkMD52.ArrayBuffer.hash = function(arr, raw) {
        var hash = md51_array(new Uint8Array(arr)), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      return SparkMD52;
    });
  }
});

// src/index.ts
import { Client, Pool } from "pg";

// src/landing.ts
var LOGO_B64 = "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";
var LANDING_STYLE = `
:root{
  --brand:#F97316; --brand-dark:#EA580C; --brand-soft:#FFF7ED;
  --ink:#1C1917; --ink2:#57534E; --ink3:#A8A29E; --line:#E7E5E4; --bg:#FAFAF9;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:#fff;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.logo{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:700;color:var(--ink);text-decoration:none}
.logo-mark{width:34px;height:34px;border-radius:10px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
.nav-links{display:flex;gap:14px;align-items:center}
.btn{display:inline-block;padding:11px 22px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:background .15s}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-dark)}
.btn-ghost{color:var(--ink);border:1px solid var(--line)}
.btn-ghost:hover{background:var(--bg)}
.hero{text-align:center;padding:84px 0 64px}
.eyebrow{display:inline-block;background:var(--brand-soft);color:var(--brand-dark);font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;margin-bottom:22px}
h1{font-size:clamp(34px,5.4vw,56px);line-height:1.12;font-weight:700;letter-spacing:-0.5px;max-width:760px;margin:0 auto 20px}
.hero p.sub{font-size:18px;color:var(--ink2);max-width:620px;margin:0 auto 34px}
.hero-cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.trust{margin-top:18px;font-size:13px;color:var(--ink3)}
section{padding:64px 0}
.section-title{font-size:clamp(26px,3.4vw,36px);text-align:center;margin-bottom:12px;letter-spacing:-0.3px}
.section-sub{text-align:center;color:var(--ink2);max-width:560px;margin:0 auto 44px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.card{border:1px solid var(--line);border-radius:16px;padding:26px;background:#fff}
.card h3{font-size:17px;margin:14px 0 8px}
.card p{font-size:14.5px;color:var(--ink2)}
.plan-price{font-size:30px;font-weight:700;letter-spacing:-.5px;margin:4px 0 10px;color:var(--ink)}
.plan-price span{font-size:14px;font-weight:500;color:var(--ink3)}
.icon{width:40px;height:40px;border-radius:12px;background:var(--brand-soft);display:flex;align-items:center;justify-content:center;font-size:20px}
.steps{counter-reset:step;max-width:720px;margin:0 auto}
.step{display:flex;gap:18px;padding:20px 0;border-bottom:1px solid var(--line)}
.step:last-child{border-bottom:none}
.step-num{counter-increment:step;flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--brand);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:15px}
.step-num::before{content:counter(step)}
.step h3{font-size:16px;margin-bottom:4px}
.step p{font-size:14.5px;color:var(--ink2)}
.cta-band{background:var(--ink);color:#fff;text-align:center;border-radius:24px;padding:56px 32px;margin:20px 0}
.cta-band h2{font-size:clamp(24px,3vw,34px);margin-bottom:12px;letter-spacing:-0.3px}
.cta-band p{color:#D6D3D1;margin-bottom:26px}
footer{border-top:1px solid var(--line);padding:34px 0 44px;font-size:13.5px;color:var(--ink3)}
.foot-grid{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:flex-start}
footer a{color:var(--ink2);text-decoration:none}
footer a:hover{color:var(--brand)}
.foot-links{display:flex;gap:20px;flex-wrap:wrap}
.alt{background:var(--bg)}
.badge-soon{display:inline-block;background:var(--brand-soft);color:var(--brand-dark);font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;vertical-align:middle;margin-left:6px;text-transform:uppercase;letter-spacing:.4px}
@media(max-width:640px){
  .hero{padding:56px 0 44px}
  nav{padding:16px 0}
  .btn{padding:10px 18px;font-size:14px}
}
.alt{background:var(--bg)}`;
var LANDING_BODY = `
<div class="wrap">
  <nav>
    <a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp" style="height:34px;width:auto"></a>
    <div class="nav-links">
      <a class="btn btn-ghost" href="/login">Log in</a>
      <a class="btn btn-primary" href="/signup">Get started</a>
    </div>
  </nav>

  <header class="hero">
    <span class="eyebrow">Built for South African small businesses</span>
    <h1>RevUp by NahaLabs</h1>
    <p class="sub">RevUp turns your happy customers into 5-star Google reviews, keeps your social pages posting, and captures every website enquiry into one pipeline. You stay in control of every word.</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/signup">Get started</a>
      <a class="btn btn-ghost" href="/login">Log in</a>
    </div>
    <p class="trust">Set up in minutes. No technical skills needed. From R499 a month, no contract, cancel anytime.</p>
  </header>
</div>

<div class="alt">
<section class="wrap">
  <h2 class="section-title">What RevUp does for you</h2>
  <p class="section-sub">No agency, no retainer, no waiting on anyone.</p>
  <div class="grid">
    <div class="card"><div class="icon">\u2B50</div><h3>Google review booster</h3><p>Spots your happiest customers and asks for a Google review at the right moment. More 5-star reviews, without the awkward asking.</p></div>
    <div class="card"><div class="icon">\u{1F5C2}\uFE0F</div><h3>FrontDesk lead capture</h3><p>A simple enquiry form for your website. Every enquiry lands in one pipeline, with a considered follow-up drafted for your approval.</p></div>
    <div class="card"><div class="icon">\u{1F4C8}</div><h3>Your numbers, in plain language</h3><p>See reviews requested, links clicked, posts drafted and enquiries captured. No spreadsheets, no jargon.</p></div>
    <div class="card"><div class="icon">\u270D\uFE0F</div><h3>Social posting</h3><p>Posts in your voice, tuned to your trade and your town, drafted and scheduled to your social pages. You approve every word before anything goes out.</p></div>
  </div>
</section>
</div>



<section class="wrap" id="pricing">
  <h2 class="section-title">Simple monthly pricing</h2>
  <p class="section-sub" style="margin-bottom:34px">No contract, cancel anytime. Pick the plan that fits.</p>
  <div class="grid">
    <div class="card"><h3 style="margin-top:0">Starter</h3><p class="plan-price">R499 <span>a month</span></p><p>The Google review booster, social posting with your approval on every word, and your enquiry inbox. Up to 500 AI-drafted replies a month, 1 connected channel.</p></div>
    <div class="card" style="border-color:var(--brand);box-shadow:0 8px 24px rgba(249,115,22,.12)"><h3 style="margin-top:0">Growth</h3><p class="plan-price">R999 <span>a month</span></p><p>Everything in Starter, with room to grow: more social posting, up to 1,000 AI-drafted replies a month and 2 connected channels.</p></div>
    <div class="card"><h3 style="margin-top:0">Business Pro</h3><p class="plan-price">R1,999 <span>a month</span></p><p>Everything in Growth, plus FrontDesk: a public enquiry form for your website, a shared lead pipeline and AI-drafted follow-ups you approve. Up to 2,500 AI-drafted replies a month and 3 connected channels.</p></div>
  </div>
  <p class="section-sub" style="font-size:14px;opacity:.7;margin-top:26px;margin-bottom:0">Plans include a monthly AI reply volume. Additional usage may carry charges; any extra usage and its rates are agreed with you before it is activated.</p>
  <div style="text-align:center;margin-top:30px"><a class="btn btn-primary" href="/signup">Get started</a></div>
</section>

<section class="wrap">
  <h2 class="section-title">Up and running in three steps</h2>
  <p class="section-sub">From R499 a month, cancel anytime.</p>
  <div class="steps">
    <div class="step"><div class="step-num"></div><div><h3>Create your account</h3><p>Sign up with your email and choose your plan.</p></div></div>
    <div class="step"><div class="step-num"></div><div><h3>Set up in minutes</h3><p>Tell RevUp about your business and paste your Google review link. That is all it needs.</p></div></div>
    <div class="step"><div class="step-num"></div><div><h3>Stay in control</h3><p>Watch every enquiry and draft as it happens. Step in whenever you like - nothing goes out without your approval.</p></div></div>
  </div>
</section>

<div class="wrap">
  <div class="cta-band">
    <h2>Your next customer is looking for you right now.</h2>
    <p>Get started and never miss another enquiry.</p>
    <a class="btn btn-primary" href="/signup">Get started</a>
  </div>
</div>

<footer>
  <div class="wrap foot-grid">
    <div>
      <a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp" style="height:26px;width:auto"></a>
    </div>
    <div class="foot-links">
      <a href="/signup">Sign up</a>
      <a href="/login">Log in</a>
      <a href="/legal/terms/">Terms of Service</a>
      <a href="/legal/privacy/">Privacy Policy</a>
    </div>
  </div>
</footer>
`;
function landingPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RevUp by NahaLabs</title><style>${LANDING_STYLE}</style></head><body>${LANDING_BODY}</body></html>`;
}

// src/presets.ts
var INDUSTRIES = [["plumber", "Plumbing"], ["electrician", "Electrical"], ["security", "Security"], ["solar", "Solar / inverters"], ["auto-workshop", "Auto workshop"], ["panel-beater", "Panel beater / body shop"], ["auto-electrician", "Auto electrician"], ["mobile-mechanic", "Mobile mechanic"], ["towing", "Towing / roadside"], ["hvac", "Aircon / refrigeration"], ["roofing", "Roofing / waterproofing"], ["gates-access", "Gates / fencing / access control"], ["pest-control", "Pest control"], ["property-maintenance", "Property maintenance"], ["container-transport", "Container transport"], ["pool", "Pool services"], ["aesthetics", "Aesthetics / cosmetic clinic"], ["real-estate", "Real estate"], ["property-management", "Property management"], ["legal", "Law firm"], ["financial-broker", "Financial / insurance broker"], ["funeral", "Funeral services"], ["dental", "Dental practice"], ["restaurant", "Restaurant / cafe / takeaway"], ["catering", "Catering / food truck"], ["trades", "Trades (general building & repairs)"], ["general", "General local service"]];
var PRESETS = {
  "general": { "label": "General / other", "radar_keywords": [], "post_themes": ["Industry news with a local angle", "Customer questions answered", "Behind-the-scenes"], "hashtags": [], "responder_tone": "warm and professional", "responder_questions": [], "responder_faqs": [] },
  "restaurant": { "label": "Restaurants & Food", "radar_keywords": ["restaurant", "food", "menu", "chef", "eatery", "takeaway", "braai", "cuisine", "dining", "coffee", "bakery", "catering", "halaal", "vegan"], "post_themes": ["Today's specials and limited-time dishes", "Behind the pass: meet the kitchen", "Customer favourites and reviews", "Weekend and payday promos", "Local food culture and events"], "hashtags": ["#JoburgEats", "#SAFoodie"], "responder_tone": "warm and welcoming", "responder_questions": ["Would you like a table, and for how many people?", "Is this for today or another day - and what time suits you?", "Any dietary needs we should know about (halaal, vegetarian, allergies)?"], "responder_faqs": ["Do I need to book, or can I walk in?", "What's on the menu today?", "Do you deliver or offer collection?"] },
  "real_estate": { "label": "Real Estate", "radar_keywords": ["property", "housing", "bond", "mortgage", "transfer", "estate", "rental", "conveyancing", "suburb"], "post_themes": ["Rate moves and what they mean for buyers", "Suburb spotlight", "Listing marketing tips", "First-time buyer guidance"], "hashtags": ["#PropertySA", "#RealEstateSA"], "responder_tone": "warm and professional", "responder_questions": ["What price range are you working with?", "Are you pre-approved for a bond, or buying cash?", "Would a weekday late afternoon or a Saturday morning suit you better?"], "responder_faqs": ["Is the property still available?", "Can I book a viewing?", "What are the transfer costs?"] },
  "dental": { "label": "Dentists & Clinics", "radar_keywords": ["dental", "dentist", "clinic", "healthcare", "medical aid", "teeth", "oral", "health"], "post_themes": ["Oral health tips patients actually read", "Medical aid and payment options", "New treatment announcements", "School-holiday checkup reminders"], "hashtags": ["#DentalCareSA", "#HealthySmile"], "responder_tone": "caring and reassuring", "responder_questions": ["Is this for a check-up, or is something bothering you?", "Do you have medical aid, and if so which one?", "Would a morning or afternoon appointment suit you better?"], "responder_faqs": ["Do you accept my medical aid?", "How do I book an appointment?", "Do you see children?"] },
  "auto": { "label": "Car Dealers", "radar_keywords": ["car", "vehicle", "auto", "dealership", "bakkie", "sedan", "suv", "fuel", "petrol", "diesel"], "post_themes": ["Fuel price moves and what they mean for buyers", "New stock announcements", "Finance and trade-in explainers", "Weekend test-drive invites"], "hashtags": ["#CarsSA", "#AutoDealer"], "responder_tone": "helpful and energetic", "responder_questions": ["What's your budget range?", "Are you trading in, and do you need finance?", "When suits you for a test drive - weekday or Saturday?"], "responder_faqs": ["Is this vehicle still in stock?", "Can I book a test drive?", "Do you take trade-ins?"] },
  "panel_beater": { "label": "Panel Beaters & Body Shops", "radar_keywords": ["panel beater", "panel beating", "body shop", "spray paint", "dent repair", "scratch repair", "accident repair", "bumper", "hail damage", "insurance claim"], "post_themes": ["Before-and-after repair transformations", "How the insurance claim process works", "Hail and dent season readiness", "What a proper respray involves"], "hashtags": ["#PanelBeaterSA", "#AutoBodySA"], "responder_tone": "reassuring and practical", "responder_questions": ["Can you send photos of the damage?", "What is the make, model and year of the vehicle?", "Is this going through insurance, or is it a private repair?"], "responder_faqs": ["How do I get a quote for the damage?", "Do you work with my insurance?", "How long will the repair take?"] },
  "auto_electrician": { "label": "Auto Electricians", "radar_keywords": ["auto electrician", "auto electrical", "car battery", "alternator", "starter motor", "wiring", "ecu", "immobiliser", "car alarm", "central locking"], "post_themes": ["Warning lights and what they mean", "Battery care in winter and summer", "Common electrical faults by make", "When a rewire beats another patch"], "hashtags": ["#AutoElectricianSA", "#CarElectrical"], "responder_tone": "clear and methodical", "responder_questions": ["What is the make, model and year of the vehicle?", "What is it doing - any warning lights, or does it fail to start?", "Is the vehicle with you, or stranded somewhere?"], "responder_faqs": ["Can you diagnose a warning light?", "Do you replace batteries and alternators?", "Can you come to the vehicle?"] },
  "funeral": { "label": "Funeral Services", "radar_keywords": ["funeral", "memorial", "burial", "cremation", "tombstone", "hearse", "mourning", "condolences", "funeral cover", "undertaker"], "post_themes": ["What to do first when a death occurs", "Planning ahead: what families should know", "Cover plans explained in plain language", "Honouring a loved one: memorial ideas", "Supporting grieving families in our community"], "hashtags": ["#FuneralServicesSA", "#GriefSupport"], "responder_tone": "compassionate and unhurried", "responder_questions": ["Is this about arrangements needed now, or planning ahead?", "Do you have a policy or cover plan with us - and the policy number, if so?", "What is the best number to call you back on?"], "responder_faqs": ["What cover plans do you offer, and what do they cost per month?", "What do we do first when a death occurs?", "How do we claim on a policy?"] },
  "plumber": { "label": "Plumbing", "radar_keywords": ["plumber", "geyser", "burst pipe", "drain", "leak", "blocked", "tap", "sewer"], "post_themes": ["Geyser failures before winter - what to check", "Burst pipe? What to do in the first 10 minutes", "Water-saving fixes that cut your bill", "Emergency call-out vs booked job - what costs what"], "hashtags": ["#PlumberSA", "#GeyserHelp"], "responder_tone": "calm and practical", "responder_questions": ["Where is the problem - and is water still running?", "Is this an emergency or can it wait for a booked slot?", "Which suburb are you in?"], "responder_faqs": ["Do you charge a call-out fee?", "How much to replace a geyser?", "Are you available after hours?"] },
  "electrician": { "label": "Electrical", "radar_keywords": ["electrician", "electrical", "power trip", "db board", "coc", "compliance certificate", "wiring", "lights"], "post_themes": ["Load-shedding prep: what a healthy DB board looks like", "Why your power keeps tripping", "Compliance certificates when selling your home", "Safe generator and inverter connections"], "hashtags": ["#ElectricianSA", "#PowerTrip"], "responder_tone": "reassuring and safety-first", "responder_questions": ["Is there any burning smell or exposed wiring? If yes, switch off at the main breaker.", "Which area are you in?", "Is the whole house out or one circuit?"], "responder_faqs": ["Do you issue COC certificates?", "How much is a call-out?", "Can you connect an inverter?"] },
  "security": { "label": "Security", "radar_keywords": ["security", "alarm", "cctv", "armed response", "access control", "electric fence", "beams", "guarding"], "post_themes": ["Holiday security checklist for your home", "Alarm systems vs CCTV - what actually deters", "How armed response times really work", "Gate motor and beam maintenance"], "hashtags": ["#SecuritySA", "#HomeSafety"], "responder_tone": "alert and trustworthy", "responder_questions": ["Is this for a home or business?", "Do you need a new install or a repair/upgrade?", "Which suburb or complex?"], "responder_faqs": ["Do you do free assessments?", "What does armed response cost monthly?", "Can you take over an existing alarm?"] },
  "solar": { "label": "Solar / inverters", "radar_keywords": ["solar", "inverter", "battery", "panels", "load shedding", "eskom", "backup power", "pv"], "post_themes": ["What size inverter does your home actually need", "Solar payback periods in SA right now", "Battery care through load-shedding cycles", "Eskom tariff hikes vs going solar"], "hashtags": ["#SolarSA", "#LoadShedding"], "responder_tone": "knowledgeable and straight-talking", "responder_questions": ["What is your average monthly electricity bill?", "Do you want backup only or full solar?", "House or business premises?"], "responder_faqs": ["How much does a basic backup system cost?", "How long does installation take?", "Do you offer finance?"] },
  "mobile-mechanic": { "label": "Mobile mechanic", "radar_keywords": ["mobile mechanic", "car service", "breakdown", "battery", "brakes", "car won't start", "roadside"], "post_themes": ["Your car won't start - the 3 most common causes", "Why mobile servicing beats sitting in a workshop queue", "Brake warning signs you should never ignore", "Pre-holiday vehicle checks"], "hashtags": ["#MobileMechanic", "#CarServiceSA"], "responder_tone": "helpful and down-to-earth", "responder_questions": ["What make, model and year is the vehicle?", "Where is the vehicle parked right now?", "Does it start, or is it completely dead?"], "responder_faqs": ["Do you come to my home or work?", "What does a basic service cost?", "Do you charge for diagnostics?"] },
  "towing": { "label": "Towing / roadside", "radar_keywords": ["towing", "tow truck", "breakdown", "accident", "roadside assist", "flat tyre", "recovery"], "post_themes": ["What to do right after a breakdown on the N1", "Flat tyre on the highway - stay safe first", "How towing fees work and what insurance covers", "Why response time matters more than price"], "hashtags": ["#TowingSA", "#RoadsideAssist"], "responder_tone": "fast, calm and reassuring", "responder_questions": ["Where exactly is the vehicle - nearest landmark or pin?", "Is anyone injured or in danger?", "What vehicle is it and can it roll?"], "responder_faqs": ["How much to tow within town?", "Do you work with my insurance?", "How long until a truck reaches me?"] },
  "hvac": { "label": "Aircon / refrigeration", "radar_keywords": ["aircon", "air conditioning", "hvac", "refrigeration", "cold room", "regas", "split unit"], "post_themes": ["Summer is coming - book your aircon service now", "Why your aircon is blowing warm air", "Cold room care for restaurants and butcheries", "Inverter aircons vs older units on your bill"], "hashtags": ["#AirconSA", "#HVac"], "responder_tone": "efficient and friendly", "responder_questions": ["Service, repair or new installation?", "What type of unit and roughly how old?", "Home or business?"], "responder_faqs": ["How much is an aircon service?", "Do you regas units?", "Can you supply and install?"] },
  "roofing": { "label": "Roofing / waterproofing", "radar_keywords": ["roof", "roofing", "waterproofing", "leak", "gutters", "thatch", "ibr", "torch-on"], "post_themes": ["Rain season checklist: find leaks before they find you", "Waterproofing flat roofs - what lasts and what fails", "Gutter cleaning before the storms", "IBr vs tile vs thatch - honest pros and cons"], "hashtags": ["#RoofingSA", "#Waterproofing"], "responder_tone": "solid and dependable", "responder_questions": ["Where is the leak or problem area?", "What type of roof do you have?", "Can you share a photo?"], "responder_faqs": ["Do you guarantee waterproofing work?", "How much per square metre?", "Do you do free quotes?"] },
  "gates-access": { "label": "Gates / fencing / access control", "radar_keywords": ["gate motor", "electric gate", "fencing", "access control", "intercom", "palisade", "centurion"], "post_themes": ["Gate motor battery care during load shedding", "Palisade vs clear-view fencing for your property", "Access control for complexes and offices", "Why gates fail after power surges"], "hashtags": ["#GateMotors", "#FencingSA"], "responder_tone": "prompt and security-minded", "responder_questions": ["Is the gate stuck open or closed right now?", "What motor brand do you have?", "Home, complex or business?"], "responder_faqs": ["Do you repair Centurion motors?", "How much is a new gate motor installed?", "Do you do intercoms?"] },
  "pest-control": { "label": "Pest control", "radar_keywords": ["pest control", "termites", "cockroaches", "rats", "fumigation", "ants", "bed bugs"], "post_themes": ["Termite season in SA - early signs in your home", "Why cockroaches come back after shop sprays", "Bed bugs: what actually gets rid of them", "Rodent proofing before winter"], "hashtags": ["#PestControlSA", "#Fumigation"], "responder_tone": "discreet and thorough", "responder_questions": ["What pest are you seeing and where?", "How big is the property?", "Any kids or pets we should plan around?"], "responder_faqs": ["Is treatment safe for children and pets?", "How much for a once-off treatment?", "Do you guarantee the work?"] },
  "property-maintenance": { "label": "Property maintenance", "radar_keywords": ["maintenance", "handyman", "repairs", "painting", "complex maintenance", "facilities"], "post_themes": ["The maintenance schedule every complex needs", "Small repairs that stop big insurance claims", "Painting season: prep work that makes it last", "One call, whole-list handyman days"], "hashtags": ["#PropertyMaintenance", "#HandymanSA"], "responder_tone": "reliable and organised", "responder_questions": ["What is on the repair list?", "Is this a once-off or ongoing maintenance?", "Home, complex or office park?"], "responder_faqs": ["Do you charge per job or per day?", "Do you do complex contracts?", "Can I send photos for a quote?"] },
  "container-transport": { "label": "Container transport", "radar_keywords": ["container", "transport", "logistics", "freight", "shipping container", "haulage", "delivery"], "post_themes": ["Container transport rates - what drives the price", "Port delays and how to plan around them", "Buying vs hiring containers for storage", "Cross-border freight basics for small importers"], "hashtags": ["#LogisticsSA", "#ContainerTransport"], "responder_tone": "direct and dependable", "responder_questions": ["What size container and what route?", "One trip or regular loads?", "Any crane or side-loader needs on site?"], "responder_faqs": ["What does a 6m container move cost?", "Do you do cross-border?", "How far ahead must I book?"] },
  "pool": { "label": "Pool services", "radar_keywords": ["pool", "pool pump", "green pool", "pool cleaning", "marbelite", "pool repairs"], "post_themes": ["Green pool rescue - the 5-day turnaround", "Winter pool care that saves you money", "Pump and filter basics every owner should know", "Heating options to stretch your swim season"], "hashtags": ["#PoolServicesSA", "#PoolCare"], "responder_tone": "friendly and knowledgeable", "responder_questions": ["Weekly service or a once-off cleanup?", "Roughly what size is the pool?", "Is the water green right now?"], "responder_faqs": ["How much is a weekly pool service?", "Do you repair pumps?", "Can you fix a green pool?"] },
  "aesthetics": { "label": "Aesthetics / cosmetic clinic", "radar_keywords": ["aesthetics", "botox", "fillers", "skin clinic", "laser", "facial", "anti-ageing"], "post_themes": ["What a first consultation actually involves", "Skincare routines that work in the SA climate", "Laser vs peels - honest guidance", "Safe treatments only: questions to ask any clinic"], "hashtags": ["#AestheticsSA", "#SkinClinic"], "responder_tone": "warm, discreet and professional", "responder_questions": ["Which treatment are you interested in?", "Is this your first visit to an aesthetics clinic?", "Would you like a consultation first?"], "responder_faqs": ["How much is a consultation?", "Are treatments done by a doctor?", "Do you have before-and-after photos?"] },
  "property-management": { "label": "Property management", "radar_keywords": ["property management", "rental", "levy", "body corporate", "tenant", "sectional title", "landlord"], "post_themes": ["Levy increases explained plainly", "How good management protects your property value", "Tenant vetting that prevents problems", "AGM season: what owners should ask"], "hashtags": ["#PropertyManagement", "#RentalsSA"], "responder_tone": "professional and organised", "responder_questions": ["Complex, single rental or portfolio?", "How many units?", "Are you an owner, trustee or landlord?"], "responder_faqs": ["What do your management fees cover?", "Do you handle maintenance?", "How do you screen tenants?"] },
  "legal": { "label": "Law firm", "radar_keywords": ["lawyer", "attorney", "legal", "contract", "estate", "conveyancing", "litigation", "deceased estate"], "post_themes": ["Why every adult needs a will - plainly explained", "Buying a house? What conveyancing actually covers", "Contracts: the clauses that cost people money", "What to bring to a first legal consultation"], "hashtags": ["#AttorneysSA", "#LegalAdvice"], "responder_tone": "measured and trustworthy", "responder_questions": ["What area of law does this involve?", "Is the matter urgent?", "Have you worked with an attorney before?"], "responder_faqs": ["What does a consultation cost?", "Do you do free first meetings?", "Which areas of law do you cover?"] },
  "financial-broker": { "label": "Financial / insurance broker", "radar_keywords": ["insurance", "broker", "medical aid", "life cover", "short-term", "funeral cover", "investment"], "post_themes": ["Insurance reviews: why January matters", "Medical aid vs hospital plan - the real difference", "Life cover milestones: marriage, kids, bond", "Short-term insurance: what your premium actually buys"], "hashtags": ["#InsuranceSA", "#FinancialAdvice"], "responder_tone": "clear and trustworthy", "responder_questions": ["What cover are you looking at - life, medical, car, home?", "Are you reviewing existing cover or starting fresh?", "When did you last compare your policies?"], "responder_faqs": ["Do you charge for advice?", "Which providers do you work with?", "Can you beat my current premium?"] },
  "catering": { "label": "Catering / food truck", "radar_keywords": ["catering", "food truck", "events catering", "platters", "wedding catering", "spit braai"], "post_themes": ["Wedding catering: what to book first", "Spit braai season is here", "Corporate platters that actually impress", "Food truck Fridays - where to find us"], "hashtags": ["#CateringSA", "#SpitBraai"], "responder_tone": "warm and appetising", "responder_questions": ["What event and how many guests?", "What date and venue?", "Any dietary requirements?"], "responder_faqs": ["How much per person?", "Do you cater for halaal or vegetarian guests?", "How far ahead must we book?"] },
  "trades": { "label": "Trades (general building & repairs)", "radar_keywords": ["builder", "renovation", "building", "repairs", "construction", "alterations", "paving"], "post_themes": ["Renovations: the order of work that saves money", "NHBRC and why it matters for your build", "Small jobs welcome - why that matters", "Planning permission basics for additions"], "hashtags": ["#BuildersSA", "#Renovations"], "responder_tone": "straightforward and capable", "responder_questions": ["What work do you need done?", "Do you have plans or need them drawn?", "What is your rough budget range?"], "responder_faqs": ["Do you do small jobs?", "Are you NHBRC registered?", "How do your quotes work?"] }
};
var ALIAS = { "auto-workshop": "auto", "real-estate": "real_estate" };
function getPreset(industry) {
  const k = (industry || "general").trim();
  return PRESETS[k] || PRESETS[ALIAS[k]] || PRESETS[k.replace(/-/g, "_")] || PRESETS.general;
}
function industryLabel(k) {
  const f = INDUSTRIES.find(([v]) => v === k);
  return f ? f[1] : PRESETS[k]?.label || k || "General local service";
}

// src/receptionist.ts
var SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c";
var SANDBOX_SEND_ALLOWLIST = /* @__PURE__ */ new Set(["27672347593", "27612980377"]);
var OPT_OUT = /* @__PURE__ */ new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
var PLAN_ALLOWANCE = { starter: 500, growth: 1e3, "business-pro": 2500 };
var MAX_SENDS_HOUR = 60;
var MAX_SENDS_DAY = 300;
var MAX_DRAFTS_DAY = 300;
var ESCALATION = [
  /\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b/i,
  /\b(complaint|sue|lawyer|attorney|refund)\b/i,
  /\b(died|death|passed away|deceased)\b/i,
  /\b(emergency|urgent|burst|flooding|no power|sparking)\b/i
];
var RULES = "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); no emojis; never mention you are an AI unless asked. When the customer sends photos, acknowledge them by count and never describe, diagnose or price what might be in them - a person from the team assesses photos. IMPORTANT: the business information above is the COMPLETE list of what this business offers. If the customer asks about a service, product, price or policy that is not listed there, do NOT say yes and do NOT say no - say a person from the team will confirm. If you do not know, say a person will confirm.";
async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyZernioSignature(secret, body, signature) {
  if (!secret || !signature) return false;
  const expected = await hmacHex(secret, body);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
function industryBrief(industry) {
  const p = getPreset(industry || "general");
  const label = p.label || "local service";
  let s = `You are the WhatsApp receptionist for a ${label} business in South Africa. Tone: ${p.responder_tone || "warm and professional"}.`;
  const qs = p.responder_questions || [];
  if (qs.length) s += ` When the customer wants to book or buy, gather: ${qs.join(" ")}`;
  const faqs = p.responder_faqs || [];
  if (faqs.length) s += ` Common customer questions: ${faqs.join(" ")}`;
  return s;
}
function profileBlock(p) {
  const lines = [`Business: ${p.business_name || ""}`];
  if (p.operating_hours && Object.keys(p.operating_hours).length) lines.push(`Operating hours: ${JSON.stringify(p.operating_hours)}`);
  if (p.pricing_data && Object.keys(p.pricing_data).length) lines.push(`Price list (ZAR): ${JSON.stringify(p.pricing_data)}`);
  if (p.call_out_fee != null) lines.push(`Call-out fee: R${p.call_out_fee}`);
  if (p.payment_link_url) lines.push("Payments are taken by secure link; share it only when a customer is ready to pay.");
  if (p.custom_rules && Object.keys(p.custom_rules).length) lines.push(`Standing rules from the owner: ${JSON.stringify(p.custom_rules)}`);
  return lines.join("\n");
}
function customerBlock(c) {
  if (!c) return "";
  const lines = [];
  if (c.name) lines.push(`Customer name: ${c.name}`);
  if (c.is_vip) lines.push("This customer is a VIP - treat them especially well.");
  if (c.visit_count) lines.push(`They have visited ${c.visit_count} time${c.visit_count === 1 ? "" : "s"} before.`);
  if (c.dietary_notes) lines.push(`Dietary needs: ${c.dietary_notes}`);
  return lines.join("\n");
}
async function groqDraft(apiKey, prompt) {
  let lastErr = "no response";
  for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 800, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const m = content.match(/\{.*\}/s);
        if (m) return m[0];
        lastErr = "no JSON in reply";
      } catch (e) {
        lastErr = String(e).slice(0, 120);
      }
    }
  }
  throw new Error(lastErr);
}
async function handleZernioWebhook(db, env, payload) {
  if ((payload.event || "") !== "message.received") return;
  const message = payload.message || {};
  const account = message.account || payload.account || {};
  const accountId = account.accountId || account._id || "";
  if (!accountId) return;
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE zernio_account_id=$1 LIMIT 1`, [accountId]);
  const channel = ch.rows[0];
  if (!channel) return;
  const pr = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [channel.workspace_id]);
  const profile = pr.rows[0];
  if (!profile) return;
  const direction = message.direction || (message.fromMe ? "outbound" : "inbound");
  if (!["inbound", "incoming"].includes(direction)) return;
  let sender = message.sender || {};
  if (typeof sender === "string") sender = { id: sender };
  const waId = String(sender.phoneNumber || "").replace(/^\+/, "") || String(sender.id || "").split("@")[0].replace(/^\+/, "");
  let body = String(message.text || message.body || "").trim();
  const media = (message.attachments || []).map((a) => typeof a === "string" ? a : a.url || a.mediaUrl || a.link || a.src || "").filter(Boolean).slice(0, 10);
  if (!waId || !body && !media.length) return;
  if (!body && media.length) body = `[${media.length} photo${media.length === 1 ? "" : "s"} received]`;
  const conv = payload.conversation || {};
  const convId = String(conv.id || conv.conversationId || "");
  const senderName = sender.name || conv.participantName || "";
  const zid = String(message._id || message.id || "");
  let contact;
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
      [id, channel.workspace_id, waId.slice(0, 32), String(senderName).slice(0, 120), convId]
    );
    contact = ins.rows[0];
  }
  if (zid) {
    const dup = await db.query(`SELECT 1 FROM receptionist_message WHERE workspace_id=$1 AND zernio_message_id=$2 LIMIT 1`, [channel.workspace_id, zid]);
    if (dup.rows[0]) return;
  }
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,$6::jsonb)`,
    [crypto.randomUUID(), body, zid, contact.id, channel.workspace_id, JSON.stringify(media)]
  );
  if (OPT_OUT.has(body.trim().toUpperCase())) {
    const { unsubscribeContact: unsubscribeContact2 } = await Promise.resolve().then(() => (init_reviews(), reviews_exports));
    await unsubscribeContact2(db, contact.id);
    return;
  }
  if (["check_in_sent", "review_requested"].includes(contact.review_status || "")) {
    const { looksNegative: looksNegative2, flagIssue: flagIssue2 } = await Promise.resolve().then(() => (init_reviews(), reviews_exports));
    if (looksNegative2(body)) {
      await flagIssue2(db, channel.workspace_id, contact.id, body);
      return;
    }
  }
  const org = await db.query(`SELECT o.plan, o.id FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [channel.workspace_id]);
  const plan = org.rows[0]?.plan || "starter";
  const allowance = PLAN_ALLOWANCE[plan] ?? 500;
  const used = await db.query(
    `SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id
     WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`,
    [org.rows[0]?.id]
  );
  if (Number(used.rows[0].c) >= allowance) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const todayDrafts = await db.query(
    `SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND sender_type='ai' AND created_at >= now() - interval '1 day'`,
    [channel.workspace_id]
  );
  if (Number(todayDrafts.rows[0].c) >= MAX_DRAFTS_DAY) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const hist = await db.query(`SELECT sender_type, body FROM receptionist_message WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 12`, [contact.id]);
  const transcript = hist.rows.reverse().map((m) => `${m.sender_type === "user" ? "Customer" : "Receptionist"}: ${m.body}`).join("\n");
  const now = (/* @__PURE__ */ new Date()).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const incoming = media.length ? `[Customer sent ${media.length} photo${media.length === 1 ? "" : "s"}] ${body}`.trim() : body;
  const prompt = `Today is ${now}, South Africa time.
${industryBrief(profile.industry || "general")}
${profileBlock(profile)}
` + (customerBlock(contact) ? customerBlock(contact) + "\n" : "") + `
Conversation so far:
${transcript}

Reply with JSON only: {"reply": "...", "intake": {"name": "", "detail": "", "preferred_time": "", "address": "", "policy_number": ""}} (fill only the intake fields the customer actually gave; make detail a short description of what they want - for a restaurant booking use 'Table for N', never a bare number).
${RULES}`;
  let draft = { reply: "", intake: {} };
  try {
    draft = JSON.parse(await groqDraft(env.GROQ_API_KEY, prompt));
  } catch {
    return;
  }
  const reply = String(draft.reply || "").trim();
  if (!reply) return;
  const escalate = ESCALATION.some((re) => re.test(incoming));
  if (escalate) await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, reply, contact.id, channel.workspace_id]
  );
  const intake = draft.intake || {};
  let detail = String(intake.detail || "").trim();
  const preferred = String(intake.preferred_time || "").trim();
  const industry = String(profile.industry || "general");
  if (industry === "restaurant" && /^\d+$/.test(detail)) detail = `Table for ${detail}`;
  if (detail || preferred) {
    try {
      await db.query(
        `INSERT INTO receptionist_booking(id,service,preferred_time,status,notes,created_at,contact_id,workspace_id,duration_minutes,google_event_id,value)
        VALUES($1,$2,$3,'requested','',now(),$4,$5,60,'',0)`,
        [crypto.randomUUID(), detail.slice(0, 200), preferred.slice(0, 200), contact.id, channel.workspace_id]
      );
    } catch {
    }
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
  } catch {
  }
  const sandbox = channel.is_sandbox || channel.zernio_account_id === SANDBOX_ACCOUNT_ID;
  if (sandbox && !SANDBOX_SEND_ALLOWLIST.has(waId)) return;
  const sentHour = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 hour'`, [channel.workspace_id]);
  const sentDay = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 day'`, [channel.workspace_id]);
  if (Number(sentHour.rows[0].c) >= MAX_SENDS_HOUR || Number(sentDay.rows[0].c) >= MAX_SENDS_DAY) return;
  if (!contact.zernio_conversation_id) return;
  const connQ = await db.query(`SELECT api_key, status FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [channel.workspace_id]);
  const conn = connQ.rows[0];
  if (conn && conn.status === "needs_attention") return;
  const sendKey = conn && conn.status === "connected" && conn.api_key ? conn.api_key : env.ZERNIO_API_KEY;
  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${contact.zernio_conversation_id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sendKey}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: reply })
  });
  if (!resp.ok) return;
  const data = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
}
var ZBASE = "https://zernio.com/api/v1";
async function zget(apiKey, path) {
  const resp = await fetch(ZBASE + path, { headers: { authorization: `Bearer ${apiKey}` } });
  if (!resp.ok) {
    const e = new Error("zernio " + resp.status);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}
async function zpost(apiKey, path, body) {
  const resp = await fetch(ZBASE + path, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const e = new Error("zernio " + resp.status);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}
async function validateTenantKey(apiKey, workspaceId, workspaceName) {
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
  } catch (e) {
    if (e.status === 401 || e.status === 403) return { profileId: "", error: "That key was not accepted. Copy the full key from your messaging account and paste it again." };
    if (e.status === 402) return { profileId: "", error: "Your messaging plan covers 2 numbers. Add a card in your messaging account to connect more." };
    return { profileId: "", error: "Could not reach the messaging service. Please try again." };
  }
}
async function tenantConnectUrl(apiKey, profileId, redirectUrl) {
  const data = await zget(apiKey, `/connect/whatsapp?profileId=${encodeURIComponent(profileId)}&redirect_url=${encodeURIComponent(redirectUrl)}`);
  const url = data.authUrl || data.data?.authUrl;
  if (!url) throw new Error("no authUrl");
  return url;
}
async function tenantConfirmAndBind(db, conn, profileId, accountId, webhookUrl) {
  const accounts = await zget(conn.api_key, `/accounts?profileId=${encodeURIComponent(profileId)}&platform=whatsapp`);
  const list = accounts.accounts || [];
  const match = list.find((a) => String(a._id || a.id) === accountId);
  if (!match) return { ok: false, msg: "That number was not found on your messaging account. Please try again." };
  const secret = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  let webhookId = "", webhookOk = false;
  try {
    const hook = await zpost(conn.api_key, "/webhooks/settings", {
      name: "revup-" + conn.workspace_id,
      url: webhookUrl,
      secret,
      events: ["message.received", "message.delivered", "message.read", "account.disconnected"],
      profileIds: [profileId]
    });
    webhookId = String(hook.webhook?._id || hook.webhook?.id || "");
    if (webhookId) {
      const t = await zpost(conn.api_key, "/webhooks/test", { webhookId });
      webhookOk = !!t.success;
    }
  } catch {
  }
  const phone = String(match.username || match.phoneNumber || "").replace(/^\+/, "");
  await db.query(
    `UPDATE receptionist_tenantmessagingconnection SET account_id=$1, phone_number=$2, webhook_id=$3, webhook_secret=$4, status='connected', last_error=$5, updated_at=now() WHERE workspace_id=$6`,
    [accountId, phone, webhookId, webhookId ? secret : "", webhookOk ? "" : "Webhook check did not pass yet - replies may be delayed.", conn.workspace_id]
  );
  const ex = await db.query(`SELECT id FROM receptionist_zerniochannel WHERE workspace_id=$1`, [conn.workspace_id]);
  if (ex.rows[0]) {
    await db.query(
      `UPDATE receptionist_zerniochannel SET zernio_account_id=$1, zernio_profile_id=$2, phone_number=$3, label=$4, is_sandbox=false WHERE workspace_id=$5`,
      [accountId, profileId, phone, match.name || "WhatsApp", conn.workspace_id]
    );
  } else {
    await db.query(
      `INSERT INTO receptionist_zerniochannel(id,workspace_id,zernio_account_id,zernio_profile_id,phone_number,label,is_sandbox,connected_at)
       VALUES($1,$2,$3,$4,$5,$6,false,now())`,
      [crypto.randomUUID(), conn.workspace_id, accountId, profileId, phone, match.name || "WhatsApp"]
    );
  }
  return { ok: true, msg: webhookOk ? "WhatsApp connected. Your receptionist is live on your number." : "Connected, but the delivery check did not pass yet - replies may be delayed." };
}
async function tenantWebhookSecret(db, payload) {
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

// src/index.ts
init_reviews();

// src/pages.ts
var ensured = null;
function ensurePageTables(db) {
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
  })().catch((e) => {
    ensured = null;
    throw e;
  });
  return ensured;
}
var SECTION_PATTERNS = [
  [/price|pricing|cost|plan|package/i, "offer"],
  [/faq|question|ask/i, "faq"],
  [/review|testimonial|customer|client|stories|proof|patient|guest|say|feedback/i, "proof"],
  [/how it works|how we|process|step/i, "how"],
  [/feature|benefit|why|what you get|service/i, "benefits"],
  [/contact|sign up|get started|start|book|buy|order|shop/i, "cta"],
  [/problem|pain|struggle|tired|stop/i, "pains"]
];
function mirrorStructure(src) {
  let h = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gis, " ");
  const out = [];
  const tagRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m, last = 0, first = true;
  const wordCount = (t) => t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  while (m = tagRe.exec(h)) {
    const chunk = h.slice(last, tagRe.lastIndex);
    const words = wordCount(chunk);
    const headingText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let type = "benefits";
    if (first && m[1] === "1") type = "hero";
    else {
      for (const [re, t] of SECTION_PATTERNS) if (re.test(headingText)) {
        type = t;
        break;
      }
    }
    out.push({ type, words: Math.min(words, 400) });
    first = false;
    last = tagRe.lastIndex;
    if (out.length >= 14) break;
  }
  if (!out.length || out[0].type !== "hero") out.unshift({ type: "hero", words: 80 });
  if (!out.some((s) => s.type === "cta")) out.push({ type: "cta", words: 60 });
  return out.slice(0, 14);
}
async function fetchForMirror(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) pages can be mirrored");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12e3);
  try {
    const resp = await fetch(u.toString(), {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; RevUpPages/1.0)", accept: "text/html" }
    });
    if (!resp.ok) throw new Error(`That page answered ${resp.status} - try another URL`);
    const text = await resp.text();
    return text.slice(0, 15e5);
  } finally {
    clearTimeout(t);
  }
}
var COPY_RULES = `You write landing page copy for South African small businesses.
Rules: plain warm SA English, short sentences, no hype words (no "revolutionary", "game-changing", "unlock"), prices in rand (R) if any, mobile-first so keep headings under 9 words, body text under 60 words per section, bullets under 12 words each.
The page speaks to ONE customer pain only - every section must tie back to that pain.
NEVER invent facts: no phone numbers, no prices, no guarantees, no qualifications, no years of experience, no claims the business did not state. Only use details given in this brief. For contact, always point to the button (e.g. "tap the button below"), never write a phone number or email in the copy.
If the brief gives no testimonials, do NOT write fake quotes or claims about what customers say. In a proof section, state plainly how the product works and what the business itself commits to.`;
async function generateSections(env, brief, skeleton) {
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
          body: JSON.stringify({ model, temperature: 0.4, max_tokens: 3e3, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) {
          lastErr = "no JSON in reply";
          continue;
        }
        const parsed = JSON.parse(m[0]);
        const raw = Array.isArray(parsed.sections) ? parsed.sections : [];
        const sections = raw.slice(0, 14).map((s) => ({
          type: String(s.type || "benefits").slice(0, 20),
          heading: String(s.heading || "").slice(0, 140),
          body: String(s.body || "").slice(0, 800),
          items: Array.isArray(s.items) ? s.items.slice(0, 8).map((x) => String(x).slice(0, 140)) : []
        })).filter((s) => s.heading || s.body);
        if (!sections.length) {
          lastErr = "empty sections";
          continue;
        }
        if (!sections.some((s) => s.type === "cta")) sections.push({ type: "cta", heading: "Ready when you are", body: "Send a message now and get a straight answer.", items: [] });
        return { seo_title: String(parsed.seo_title || brief.business).slice(0, 120), sections };
      } catch (e) {
        lastErr = String(e?.message || e);
      }
    }
  }
  throw new Error(lastErr);
}
function pesc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function renderPublicPage(page, base) {
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
.btn{display:inline-block;background:var(--b);color:#fff;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:1.05rem}
.btn:hover{filter:brightness(0.92);text-decoration:none}
section{margin:34px 0}
h2{font-size:1.35rem;letter-spacing:-0.01em;margin-bottom:10px}
ul{margin:10px 0 0 0;list-style:none}
li{padding:7px 0 7px 26px;position:relative}
li:before{content:"\\2713";position:absolute;left:0;color:var(--b);font-weight:700}
blockquote{border-left:3px solid var(--b);padding:6px 14px;margin:10px 0;color:#44403C;font-style:italic}
details{border:1px solid #E7E5E4;border-radius:10px;padding:10px 14px;margin:8px 0}
summary{font-weight:600;cursor:pointer}
.cta{background:var(--b);color:#fff;border-radius:16px;padding:30px 22px;text-align:center}
.cta .btn{background:#fff;color:var(--b)}
footer{margin-top:44px;padding-top:18px;border-top:1px solid #E7E5E4;font-size:.82rem;color:#A8A29E}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #E7E5E4;padding:10px 20px;display:flex;justify-content:center}
.bar .btn{width:100%;max-width:640px;text-align:center;padding:13px}
@media(min-width:700px){.bar{display:none}}
</style></head><body>
<header>${biz}</header>
<div class="wrap">
${blocks}
<footer>${biz}${brand.area ? ` \xB7 ${pesc(brand.area)}` : ""}<br>Page by <a href="https://revup.nahalabs.co.za/signup" rel="noopener">RevUp</a> - one page per customer problem.</footer>
</div>
<div class="bar"><a class="btn" href="${goUrl}">${ctaLabel}</a></div>
</body></html>`;
}
function ctaTarget(page) {
  const b = page.brand || {};
  if (b.whatsapp && /^[+0-9][0-9 ]{7,18}$/.test(b.whatsapp)) {
    const num = b.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "27");
    const msg = encodeURIComponent(`Hi ${b.business || ""}, I saw your page about ${page.angle || "your services"}.`);
    return `https://wa.me/${num}?text=${msg}`;
  }
  if (b.link && /^https?:\/\//.test(b.link)) return b.link;
  return "https://revup.nahalabs.co.za/signup";
}
async function servePublic(db, slug, isGo, req) {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE slug=$1 AND status='published'`, [slug]);
  const page = r.rows[0];
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
function notFoundPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px"><h1>This page isn't available</h1><p>The link may be old, or the page was unpublished.</p></body></html>`;
}
function makeSlug(title) {
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "page";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(36).padStart(2, "0")).join("").replace(/[^a-z0-9]/g, "").slice(0, 4);
  return `${baseSlug}-${rand || "0000"}`;
}
async function pagesListBody(db, mem, base, msg = "") {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE workspace_id=$1 AND status!='archived' ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((p) => `<tr>
<td><b>${pesc(p.title)}</b><br><span class="mut">${pesc(p.angle || p.industry)}</span></td>
<td>${p.status === "published" ? `<span class="ok">Live</span> <a href="${base}/p/${pesc(p.slug)}" target="_blank" rel="noopener">/p/${pesc(p.slug)}</a>` : `<span class="mut">${pesc(p.status)}</span>`}</td>
<td>${p.views} view${p.views === 1 ? "" : "s"} \xB7 ${p.cta_clicks} tap${p.cta_clicks === 1 ? "" : "s"}</td>
<td><a href="/pages/${p.id}">Open</a></td></tr>`).join("");
  return `${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Landing pages <a class="btn btn-primary" style="float:right" href="/pages/new">New page</a></h2>
<p class="mut">One page per customer problem. Send each advert or campaign to the page that speaks to that exact problem - it converts far better than one general page.</p>
<table><tr><th>Page</th><th>Status &amp; link</th><th>Results</th><th></th></tr>${rows || '<tr><td colspan="4" class="mut">No pages yet. Create your first one.</td></tr>'}</table></div>`;
}
function newPageBody(err = "") {
  return `<div class="card"><h2 style="margin-top:0">New landing page</h2>
${err ? `<p class="bad">${pesc(err)}</p>` : ""}
<form method="post" action="/pages/new">
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
async function pageDetailBody(db, page, base, msg = "") {
  const brand = page.brand || {};
  const sectionForms = (page.sections || []).map((s, i) => `
<div class="card"><h3 style="margin-top:0">${pesc(s.type)}</h3>
<label>Heading<input name="h_${i}" value="${pesc(s.heading)}" maxlength="140"></label>
<label>Text<textarea name="b_${i}" rows="3" maxlength="800">${pesc(s.body)}</textarea></label>
<label>Bullets (one per line)<textarea name="i_${i}" rows="3">${pesc((s.items || []).join("\n"))}</textarea></label>
</div>`).join("");
  return `${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">${pesc(page.title)}</h2>
<p class="mut">Pain: ${pesc(page.angle)} \xB7 Status: ${pesc(page.status)}${page.status === "published" ? ` \xB7 Live at <a href="${base}/p/${pesc(page.slug)}" target="_blank" rel="noopener">${base}/p/${pesc(page.slug)}</a>` : ""}${page.source_url ? ` \xB7 Structure mirrored from ${pesc(page.source_url)}` : ""}</p>
<p>${page.views} views \xB7 ${page.cta_clicks} button taps</p>
<form method="post" action="/pages/${page.id}/publish" style="display:inline">${page.status === "published" ? "" : "<button>Publish</button>"}</form>
<form method="post" action="/pages/${page.id}/unpublish" style="display:inline">${page.status === "published" ? '<button class="link">Unpublish</button>' : ""}</form>
<form method="post" action="/pages/${page.id}/delete" style="display:inline" onsubmit="return confirm('Delete this page?')"><button class="link" style="color:#B91C1C">Delete</button></form>
</div>
<form method="post" action="/pages/${page.id}">
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

// src/features.ts
init_reviews();
async function waitlistAdd(db, ws, waId, name, partySize, wantedTime) {
  const c = await db.query(
    `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
     VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())
     ON CONFLICT (workspace_id, wa_id) DO UPDATE SET name=COALESCE(NULLIF(EXCLUDED.name,''), receptionist_contact.name), updated_at=now()
     RETURNING id`,
    [crypto.randomUUID(), ws, waId, name]
  );
  await db.query(
    `INSERT INTO receptionist_waitlistentry(id,workspace_id,contact_id,party_size,wanted_time,status,offer_minutes,notes,created_at)
     VALUES($1,$2,$3,$4,$5,'waiting',15,'',now())`,
    [crypto.randomUUID(), ws, c.rows[0].id, partySize || 2, wantedTime.slice(0, 200)]
  );
}
async function waitlistExpire(db, ws) {
  await db.query(
    `UPDATE receptionist_waitlistentry SET status='expired'
     WHERE workspace_id=$1 AND status='offered' AND offered_at < now() - (offer_minutes || ' minutes')::interval`,
    [ws]
  );
}
async function waitlistAction(db, ws, id, action) {
  if (action === "offer")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='offered', offered_at=now() WHERE id=$1 AND workspace_id=$2 AND status='waiting'`, [id, ws])).rowCount;
  if (action === "accept")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='accepted' WHERE id=$1 AND workspace_id=$2 AND status='offered'`, [id, ws])).rowCount;
  if (action === "cancel")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('waiting','offered')`, [id, ws])).rowCount;
  return false;
}
async function loyaltySettings(db, ws) {
  const ex = await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE workspace_id=$1`, [ws]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltysettings(id,workspace_id,enabled,points_per_visit,welcome_bonus,points_for_voucher,voucher_value_rand,voucher_valid_days)
     VALUES($1,$2,true,10,25,100,50,90)`,
    [id, ws]
  );
  return (await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE id=$1`, [id])).rows[0];
}
async function loyaltyApply(db, accountId, kind, points, note, bookingId = null) {
  await db.query(
    `INSERT INTO receptionist_loyaltytransaction(id,account_id,kind,points,note,booking_id,created_at)
     VALUES($1,$2,$3,$4,$5,$6,now())`,
    [crypto.randomUUID(), accountId, kind, points, note.slice(0, 200), bookingId]
  );
  await db.query(
    `UPDATE receptionist_loyaltyaccount SET balance=GREATEST(0,balance+$2), lifetime_points=lifetime_points+GREATEST(0,$2),
       welcomed=welcomed OR $3='welcome', updated_at=now() WHERE id=$1`,
    [accountId, points, kind]
  );
}
async function loyaltyAccount(db, ws, contactId) {
  const s = await loyaltySettings(db, ws);
  const ex = await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE workspace_id=$1 AND contact_id=$2`, [ws, contactId]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltyaccount(id,workspace_id,contact_id,balance,lifetime_points,welcomed,created_at,updated_at)
     VALUES($1,$2,$3,0,0,false,now(),now())`,
    [id, ws, contactId]
  );
  if (s.welcome_bonus > 0) await loyaltyApply(db, id, "welcome", s.welcome_bonus, "Welcome bonus");
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [id])).rows[0];
}
async function awardForBooking(db, ws, bookingId, contactId) {
  const s = await loyaltySettings(db, ws);
  if (!s.enabled) return null;
  const account = await loyaltyAccount(db, ws, contactId);
  const already = await db.query(`SELECT 1 FROM receptionist_loyaltytransaction WHERE account_id=$1 AND kind='earn' AND booking_id=$2`, [account.id, bookingId]);
  if (already.rows[0]) return account;
  const vc = await db.query(`SELECT visit_count FROM receptionist_contact WHERE id=$1`, [contactId]);
  await loyaltyApply(db, account.id, "earn", s.points_per_visit, `Visit #${vc.rows[0]?.visit_count || 1}`, bookingId);
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [account.id])).rows[0];
}
async function issueVoucher(db, ws, contactId, kind = "loyalty", note = "") {
  const s = await loyaltySettings(db, ws);
  if (kind === "loyalty") {
    const account = await loyaltyAccount(db, ws, contactId);
    if (account.balance < s.points_for_voucher) throw new Error(`${account.balance} points - ${s.points_for_voucher} needed for a voucher.`);
    await loyaltyApply(db, account.id, "redeem", -s.points_for_voucher, "Reward voucher issued");
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    code = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const dup = await db.query(`SELECT 1 FROM receptionist_voucher WHERE code=$1`, [code]);
    if (!dup.rows[0]) break;
  }
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_voucher(id,workspace_id,contact_id,kind,code,amount_rand,status,note,expires_at,created_at)
     VALUES($1,$2,$3,$4,$5,$6,'active',$7,now() + ($8 || ' days')::interval,now())`,
    [id, ws, contactId, kind, code, s.voucher_value_rand, note.slice(0, 200), String(s.voucher_valid_days)]
  );
  return (await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1`, [id])).rows[0];
}
async function redeemVoucher(db, ws, id) {
  const v = await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  if (!v.rows[0]) return false;
  if (v.rows[0].status === "active" && new Date(v.rows[0].expires_at) < /* @__PURE__ */ new Date()) {
    await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE id=$1`, [id]);
    return false;
  }
  if (v.rows[0].status !== "active") return false;
  await db.query(`UPDATE receptionist_voucher SET status='redeemed', redeemed_at=now() WHERE id=$1`, [id]);
  return true;
}
async function expireVouchers(db) {
  const r = await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE status='active' AND expires_at < now()`);
  return r.rowCount || 0;
}
async function quoteCreate(db, ws, customerName, contactId, title, amountRand, followUpOn) {
  await db.query(
    `INSERT INTO receptionist_quote(id,workspace_id,contact_id,customer_name,title,amount_cents,status,created_at,follow_up_on)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now(),$7)`,
    [crypto.randomUUID(), ws, contactId, customerName.slice(0, 200), title.slice(0, 200), Math.round(amountRand * 100), followUpOn || null]
  );
}
async function quoteAction(db, env, ws, id, action) {
  const q = await db.query(`SELECT * FROM receptionist_quote WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  if (!q.rows[0]) return "not found";
  const quote = q.rows[0];
  if (action === "sent" && quote.status === "draft") {
    await db.query(`UPDATE receptionist_quote SET status='sent', sent_on=(now() AT TIME ZONE 'Africa/Johannesburg')::date WHERE id=$1`, [id]);
    if (quote.contact_id) {
      const c = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [quote.contact_id]);
      if (c.rows[0] && !c.rows[0].opted_out && c.rows[0].zernio_conversation_id) {
        const wname = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [ws]);
        try {
          await deliver(
            db,
            env,
            ws,
            c.rows[0],
            `Hi ${(c.rows[0].name || "").trim().split(" ")[0] || "there"}, ${wname.rows[0]?.name || "we"} here with your quote${quote.title ? ` for ${quote.title}` : ""}: R${(quote.amount_cents / 100).toFixed(2)}. Any questions, just reply here.`
          );
        } catch {
        }
      }
    }
    return "marked sent";
  }
  if (action === "won" && ["draft", "sent"].includes(quote.status)) {
    await db.query(`UPDATE receptionist_quote SET status='won' WHERE id=$1`, [id]);
    return "won";
  }
  if (action === "lost" && ["draft", "sent"].includes(quote.status)) {
    await db.query(`UPDATE receptionist_quote SET status='lost' WHERE id=$1`, [id]);
    return "lost";
  }
  return "no change";
}
async function segmentContacts(db, ws, segment) {
  let q = `SELECT * FROM receptionist_contact WHERE workspace_id=$1 AND opted_out=false`;
  if (segment === "dormant") q += ` AND (last_visit_at IS NULL OR last_visit_at < now() - interval '30 days')`;
  else if (segment === "vip") q += ` AND is_vip=true`;
  return (await db.query(q + ` ORDER BY created_at`, [ws])).rows;
}
async function campaignCreate(db, ws, name, segment, bodyA, bodyB) {
  if (!name.trim()) throw new Error("Give the campaign a name.");
  if (!["all", "dormant", "vip"].includes(segment)) throw new Error("Unknown segment.");
  if (!bodyA.trim()) throw new Error("Write the message first.");
  await db.query(
    `INSERT INTO receptionist_campaign(id,workspace_id,name,segment,body_a,body_b,status,created_at)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now())`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), segment, bodyA.trim(), bodyB.trim()]
  );
}
async function campaignApprove(db, ws, id, when) {
  const c = await db.query(`SELECT * FROM receptionist_campaign WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  const camp = c.rows[0];
  if (!camp || camp.status !== "draft") throw new Error("Only a draft can be approved.");
  const contacts = await segmentContacts(db, ws, camp.segment);
  if (!contacts.length) throw new Error("No customers in this segment yet.");
  const useB = !!camp.body_b;
  for (let i = 0; i < contacts.length; i++) {
    await db.query(
      `INSERT INTO receptionist_campaignrecipient(id,campaign_id,contact_id,variant,status,error,attributed_amount)
       VALUES($1,$2,$3,$4,'pending','',0) ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [crypto.randomUUID(), id, contacts[i].id, useB && i % 2 ? "b" : "a"]
    );
  }
  const whenTs = when ? new Date(when) : /* @__PURE__ */ new Date();
  const sched = isNaN(whenTs.getTime()) ? /* @__PURE__ */ new Date() : whenTs;
  await db.query(
    `UPDATE receptionist_campaign SET approved_at=now(), scheduled_at=$1, status=$2 WHERE id=$3`,
    [sched, sched > /* @__PURE__ */ new Date() ? "scheduled" : "sending", id]
  );
}
async function campaignCancel(db, ws, id) {
  return !!(await db.query(
    `UPDATE receptionist_campaign SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('draft','scheduled')`,
    [id, ws]
  )).rowCount;
}
async function runDueCampaigns(db, env) {
  const due = await db.query(
    `SELECT * FROM receptionist_campaign WHERE status IN ('scheduled','sending') AND (scheduled_at IS NULL OR scheduled_at <= now()) ORDER BY scheduled_at NULLS FIRST LIMIT 3`
  );
  for (const camp of due.rows) await sendCampaign(db, env, camp);
}
async function sendCampaign(db, env, camp) {
  const claim = await db.query(
    `UPDATE receptionist_campaign SET status='sending' WHERE id=$1 AND status IN ('scheduled','sending')`,
    [camp.id]
  );
  if (!claim.rowCount) return;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [camp.workspace_id]);
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`,
    [camp.workspace_id]
  );
  if (!ch.rows.length || Number(budget.rows[0].h) >= 20 || Number(budget.rows[0].d) >= 100) {
    await db.query(`UPDATE receptionist_campaign SET status='scheduled', scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
    return;
  }
  const pend = await db.query(
    `SELECT r.*, c.name, c.opted_out, c.zernio_conversation_id, c.wa_id
     FROM receptionist_campaignrecipient r JOIN receptionist_contact c ON c.id=r.contact_id
     WHERE r.campaign_id=$1 AND r.status='pending' ORDER BY c.created_at LIMIT 50`,
    [camp.id]
  );
  for (const r of pend.rows) {
    if (r.opted_out) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='opted out' WHERE id=$1`, [r.id]);
      continue;
    }
    if (!r.zernio_conversation_id) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='no active WhatsApp conversation' WHERE id=$1`, [r.id]);
      continue;
    }
    const first = (r.name || "").trim().split(" ")[0] || "there";
    const body = (r.variant === "b" ? camp.body_b : camp.body_a).replace("{first name}", first) + OPT_OUT_FOOTER;
    try {
      const contact = { id: r.contact_id, name: r.name, wa_id: r.wa_id, zernio_conversation_id: r.zernio_conversation_id };
      const msgId = await deliver(db, env, camp.workspace_id, contact, body);
      await db.query(`UPDATE receptionist_campaignrecipient SET status='sent', sent_at=now(), message_id=$1 WHERE id=$2`, [msgId, r.id]);
    } catch (e) {
      const msg = String(e?.message || e);
      const skip = msg.includes("no active WhatsApp conversation") || msg.includes("allowlisted");
      await db.query(
        `UPDATE receptionist_campaignrecipient SET status=$1, error=$2 WHERE id=$3`,
        [skip ? "skipped" : "failed", msg.slice(0, 300), r.id]
      );
    }
  }
  const left = await db.query(`SELECT 1 FROM receptionist_campaignrecipient WHERE campaign_id=$1 AND status='pending' LIMIT 1`, [camp.id]);
  await db.query(`UPDATE receptionist_campaign SET status=$1 WHERE id=$2`, [left.rows.length ? "scheduled" : "sent", camp.id]);
  if (left.rows.length) await db.query(`UPDATE receptionist_campaign SET scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
}
async function attributeBookingToCampaign(db, ws, booking) {
  const r = await db.query(
    `SELECT r.id FROM receptionist_campaignrecipient r JOIN receptionist_campaign c ON c.id=r.campaign_id
     WHERE c.workspace_id=$1 AND r.contact_id=$2 AND r.status='sent' AND r.sent_at >= now() - interval '30 days' AND r.attributed_booking_id IS NULL
     ORDER BY r.sent_at DESC LIMIT 1`,
    [ws, booking.contact_id]
  );
  if (!r.rows[0]) return;
  await db.query(
    `UPDATE receptionist_campaignrecipient SET attributed_booking_id=$1, attributed_amount=$2 WHERE id=$3`,
    [booking.id, Number(booking.value) || 0, r.rows[0].id]
  );
}
async function campaignStats(db, campaignId) {
  const r = await db.query(
    `SELECT variant,
            count(*) total,
            count(*) FILTER (WHERE status='sent') sent,
            count(*) FILTER (WHERE status='failed') failed,
            count(*) FILTER (WHERE status='skipped') skipped,
            count(*) FILTER (WHERE attributed_booking_id IS NOT NULL) bookings,
            COALESCE(sum(attributed_amount),0) revenue
     FROM receptionist_campaignrecipient WHERE campaign_id=$1 GROUP BY variant`,
    [campaignId]
  );
  const out = {};
  for (const row of r.rows) out[row.variant] = row;
  return out;
}
var PRICE_GAP_RAND = 10;
var DRAFT_BODIES = {
  price_gap: "Hi {first name}, this week only: come in for your favourite and mention this message - we will make it worth your while. Book on WhatsApp.",
  price_advantage: "Hi {first name}, did you know our best dish also beats the neighbours on price? Come taste it this week - book on WhatsApp.",
  rating_gap: "Hi {first name}, thank you for rating us the area's favourite! Bring a friend this week and show them why - book on WhatsApp.",
  promo: "Hi {first name}, we would rather spoil YOU than watch you try the neighbour's special. This week, your usual comes with something extra - book on WhatsApp.",
  demand: "Hi {first name}, weekends are filling up fast. Book a midweek table this week and skip the wait entirely - reply here and we will sort it."
};
async function competitorAdd(db, ws, name, area, website, rating, notes) {
  if (!name.trim()) throw new Error("Give the competitor a name.");
  const r = rating ? Number(rating) : null;
  if (r !== null && (isNaN(r) || r < 0 || r > 5)) throw new Error("Rating is 0 to 5.");
  await db.query(
    `INSERT INTO receptionist_competitor(id,workspace_id,name,area,website,rating,notes,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (workspace_id, name) DO UPDATE SET area=$4, website=$5, rating=$6, notes=$7`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), area.trim().slice(0, 120), website.trim().slice(0, 200), r, notes.trim()]
  );
}
async function dishAdd(db, ws, competitorId, name, price, ownItemId) {
  const own = await db.query(`SELECT 1 FROM receptionist_competitor WHERE id=$1 AND workspace_id=$2`, [competitorId, ws]);
  if (!own.rows.length) throw new Error("Competitor not found.");
  if (!name.trim() || !(price >= 0)) throw new Error("Dish needs a name and a price.");
  const ownId = /^[0-9a-f-]{36}$/.test(ownItemId) ? ownItemId : null;
  if (ownId) {
    const ok = await db.query(`SELECT 1 FROM menus_item WHERE id=$1 AND workspace_id=$2`, [ownId, ws]);
    if (!ok.rows.length) throw new Error("That menu item is not yours.");
  }
  await db.query(
    `INSERT INTO receptionist_competitordish(id,competitor_id,name,price,own_item_id,created_at) VALUES($1,$2,$3,$4,$5,now())`,
    [crypto.randomUUID(), competitorId, name.trim().slice(0, 120), price, ownId]
  );
}
async function promoAdd(db, ws, competitorId, text, validUntil) {
  const own = await db.query(`SELECT 1 FROM receptionist_competitor WHERE id=$1 AND workspace_id=$2`, [competitorId, ws]);
  if (!own.rows.length) throw new Error("Competitor not found.");
  if (!text.trim()) throw new Error("Say what the promotion is.");
  await db.query(
    `INSERT INTO receptionist_competitorpromo(id,competitor_id,text,valid_until,created_at) VALUES($1,$2,$3,$4,now())`,
    [crypto.randomUUID(), competitorId, text.trim().slice(0, 200), /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null]
  );
}
async function oppUpsert(db, ws, key, kind, title, detail, competitorId, confidence, impact, evidence) {
  await db.query(
    `INSERT INTO receptionist_marketopportunity(id,workspace_id,competitor_id,kind,title,detail,status,dedupe_key,confidence,impact_rand,evidence,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,'new',$7,$8,$9,$10::jsonb,now(),now())
     ON CONFLICT (workspace_id, dedupe_key) DO UPDATE SET kind=$4, title=$5, detail=$6, competitor_id=$3, confidence=$8, impact_rand=$9, evidence=$10::jsonb, updated_at=now()`,
    [crypto.randomUUID(), ws, competitorId, kind, title.slice(0, 160), detail, key.slice(0, 120), confidence, impact, JSON.stringify(evidence)]
  );
}
async function refreshOpportunities(db, ws) {
  const bp = await db.query(`SELECT google_rating FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [ws]);
  const ownRating = bp.rows[0]?.google_rating !== null && bp.rows[0]?.google_rating !== void 0 ? Number(bp.rows[0].google_rating) : null;
  const seen = [];
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [ws]);
  for (const comp of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`,
      [comp.id]
    );
    for (const dish of dishes.rows) {
      if (!dish.own_item_id || dish.own_price === null) continue;
      const gap = Number(dish.own_price) - Number(dish.price);
      const u = await db.query(
        `SELECT COALESCE(sum(quantity),0) q FROM menus_dishsale WHERE workspace_id=$1 AND item_id=$2 AND sold_on >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 30`,
        [ws, dish.own_item_id]
      );
      const units = Number(u.rows[0].q) || 0;
      const impact = units ? Math.abs(gap) * units : null;
      if (gap > PRICE_GAP_RAND) {
        const key = `price_gap:${dish.id}`;
        seen.push(key);
        await oppUpsert(
          db,
          ws,
          key,
          "price_gap",
          `${comp.name} undercuts your ${dish.own_name}`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${gap.toFixed(2)} more. Match it, beat it on portion or quality, or let the dish compete on something else.`,
          comp.id,
          90,
          impact,
          [
            `Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
            `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`,
            units ? `Your sales: ${units} sold in the last 30 days` : "No sales logged yet, so no rand impact estimate"
          ]
        );
      } else if (gap < -PRICE_GAP_RAND) {
        const key = `price_advantage:${dish.id}`;
        seen.push(key);
        await oppUpsert(
          db,
          ws,
          key,
          "price_advantage",
          `Your ${dish.own_name} beats ${comp.name} on price`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${(-gap).toFixed(2)} less. Worth saying out loud: feature it on the public menu and in campaigns.`,
          comp.id,
          80,
          impact,
          [
            `Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
            `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`
          ]
        );
      }
    }
    if (comp.rating !== null && ownRating !== null && ownRating > Number(comp.rating)) {
      const key = `rating:${comp.id}`;
      seen.push(key);
      await oppUpsert(
        db,
        ws,
        key,
        "rating_gap",
        `You outrate ${comp.name}`,
        `Google: you ${ownRating}, them ${comp.rating}. Ask happy customers for reviews while the gap is in your favour.`,
        comp.id,
        70,
        null,
        [`Your Google rating: ${ownRating} (Competitors screen)`, `Their Google rating: ${comp.rating} (Competitors screen)`]
      );
    }
    const promo = await db.query(
      `SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 AND created_at >= now() - interval '7 days' ORDER BY created_at DESC LIMIT 1`,
      [comp.id]
    );
    if (promo.rows[0]) {
      const p = promo.rows[0];
      const key = `promo:${p.id}`;
      seen.push(key);
      await oppUpsert(
        db,
        ws,
        key,
        "promo",
        `${comp.name} is running a promotion`,
        `Spotted: "${p.text}". Answer with your own campaign to regulars before they drift - the Campaigns screen drafts it in minutes.`,
        comp.id,
        60,
        null,
        [`Promotion logged: "${p.text}" (Competitors screen)`]
      );
    }
  }
  const wl = await db.query(
    `SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND created_at >= now() - interval '7 days'`,
    [ws]
  );
  const recent = Number(wl.rows[0].c);
  if (recent >= 5) {
    const key = "demand:waitlist";
    seen.push(key);
    const avg = await db.query(
      `SELECT avg(value) v FROM (SELECT value FROM receptionist_booking WHERE workspace_id=$1 AND status='done' AND value IS NOT NULL LIMIT 50) t`,
      [ws]
    );
    const avgValue = avg.rows[0].v !== null ? Number(avg.rows[0].v) : null;
    await oppUpsert(
      db,
      ws,
      key,
      "demand",
      "Demand is outgrowing your tables",
      `${recent} parties joined the waitlist in the last 7 days. Consider longer hours on the busy nights or an off-peak campaign to spread the load.`,
      null,
      65,
      avgValue ? avgValue * recent : null,
      [
        `${recent} waitlist entries in the last 7 days (Waitlist screen)`,
        avgValue ? `Average booking value: R${avgValue.toFixed(2)}` : "No booking values captured yet"
      ]
    );
  }
  if (seen.length) {
    await db.query(
      `DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND NOT (dedupe_key = ANY($2))`,
      [ws, seen]
    );
  } else {
    await db.query(`DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new'`, [ws]);
  }
}
async function opportunityAction(db, ws, id, action) {
  if (!["acted", "dismissed"].includes(action)) return false;
  return !!(await db.query(
    `UPDATE receptionist_marketopportunity SET status=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3 AND status='new'`,
    [action, id, ws]
  )).rowCount;
}
async function opportunityDraftCampaign(db, ws, id) {
  const o = await db.query(`SELECT * FROM receptionist_marketopportunity WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  const opp = o.rows[0];
  if (!opp) throw new Error("Opportunity not found.");
  if (opp.campaign_id) throw new Error("A draft already exists for this one.");
  const body = DRAFT_BODIES[opp.kind];
  if (!body) throw new Error("No draft available for this opportunity.");
  const segment = ["promo", "demand"].includes(opp.kind) ? "dormant" : "all";
  const campId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_campaign(id,workspace_id,name,segment,body_a,body_b,status,created_at)
     VALUES($1,$2,$3,$4,$5,'','draft',now())`,
    [campId, ws, `Revenue: ${opp.title}`.slice(0, 120), segment, body]
  );
  await db.query(
    `UPDATE receptionist_marketopportunity SET campaign_id=$1, status='acted', updated_at=now() WHERE id=$2`,
    [campId, id]
  );
}
async function supportAnswer(db, ws, question) {
  const q = question.toLowerCase();
  if (["booking", "table", "reservation", "tonight", "today"].some((w) => q.includes(w))) {
    const today = await db.query(
      `SELECT status, count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date
       GROUP BY status`,
      [ws]
    );
    const week = await db.query(
      `SELECT count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 7`,
      [ws]
    );
    const confirmed = Number(today.rows.find((r) => r.status === "confirmed")?.c || 0);
    const done = Number(today.rows.find((r) => r.status === "done")?.c || 0);
    const wk = Number(week.rows[0].c);
    if (!today.rows.length && !wk)
      return { text: "You have no bookings logged yet. Once bookings come in I can answer questions about them.", confidence: 40, sources: ["0 bookings in the last 7 days"], escalate: false };
    return {
      text: `Today: ${confirmed} confirmed booking${confirmed === 1 ? "" : "s"}${done ? `, ${done} already done` : ""}. This week so far: ${wk} bookings. Open the Bookings screen for the full board.`,
      confidence: 95,
      sources: [`${confirmed} confirmed bookings today`, `${wk} bookings in the last 7 days`],
      escalate: false
    };
  }
  if (["waitlist", "waiting", "queue"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND status='waiting'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: n ? `${n} partie${n === 1 ? " is" : "s are"} on the waitlist right now. Manage them on the Waitlist screen.` : "The waitlist is empty right now.",
      confidence: 95,
      sources: [`${n} waiting on the waitlist`],
      escalate: false
    };
  }
  if (["complaint", "unhappy", "angry", "review", "reputation"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_complaint WHERE workspace_id=$1 AND status='open'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: `You have ${n} open complaint${n === 1 ? "" : "s"}.` + (n ? " Answer them from the Inbox - quick replies protect your rating." : " Nothing needs attention."),
      confidence: 95,
      sources: [`${n} open complaints`],
      escalate: false
    };
  }
  if (["campaign", "revenue", "sales", "money", "attribut", "marketing"].some((w) => q.includes(w))) {
    const running = await db.query(`SELECT count(*) c FROM receptionist_campaign WHERE workspace_id=$1 AND status IN ('scheduled','sending')`, [ws]);
    const attr = await db.query(
      `SELECT count(*) c, COALESCE(sum(r.attributed_amount),0) t
       FROM receptionist_campaignrecipient r
       JOIN receptionist_campaign c ON c.id=r.campaign_id
       JOIN receptionist_booking b ON b.id=r.attributed_booking_id
       WHERE c.workspace_id=$1 AND b.created_at >= date_trunc('month', now())`,
      [ws]
    );
    const total = Number(attr.rows[0].t), n = Number(attr.rows[0].c), run = Number(running.rows[0].c);
    return {
      text: `This month your campaigns are linked to R${total.toLocaleString("en-ZA")} across ${n} attributed booking${n === 1 ? "" : "s"}. ${run} campaign${run === 1 ? " is" : "s are"} running. The Campaigns screen has the full picture.`,
      confidence: 90,
      sources: [`R${total} attributed this month`, `${n} attributed bookings`],
      escalate: false
    };
  }
  if (["competitor", "rival", "opportunit", "market"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT title FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' ORDER BY confidence DESC`, [ws]);
    if (r.rows.length)
      return {
        text: `${r.rows.length} open opportunit${r.rows.length === 1 ? "y" : "ies"}. Top one: ${r.rows[0].title}. See them all on the Competitors screen.`,
        confidence: 90,
        sources: [`${r.rows.length} open opportunities`],
        escalate: false
      };
    return { text: "No open opportunities right now - the Competitors screen is where new ones appear.", confidence: 85, sources: ["0 open opportunities"], escalate: false };
  }
  if (["menu", "dish", "food", "sell", "popular", "star"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(DISTINCT item_id) c FROM menus_dishsale WHERE workspace_id=$1 AND sold_on >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 30`, [ws]);
    const n = Number(r.rows[0].c);
    if (n)
      return { text: `${n} dishes have sales logged in the last 30 days. Those sales feed the rand-impact estimates on the Competitors screen.`, confidence: 70, sources: [`${n} dishes with sales logged in 30 days`], escalate: false };
    return { text: "No dish sales logged yet. Once sales are logged I can talk about what is working.", confidence: 50, sources: ["0 dishes with sales logged in 30 days"], escalate: false };
  }
  if (["human", "person", "help me", "someone", "call me", "escalat"].some((w) => q.includes(w)))
    return { text: "Understood - I have flagged this for a human to follow up. Anything else I can answer from your numbers in the meantime?", confidence: 100, sources: ["Owner asked for a human"], escalate: true };
  return {
    text: "I do not have enough in your data to answer that confidently. I can answer about bookings, the waitlist, complaints, campaigns and attributed revenue, competitors and your menu. Want me to flag this for a human?",
    confidence: 20,
    sources: [],
    escalate: true
  };
}
async function supportHandle(db, ws, question) {
  await db.query(
    `INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,sources,escalated,created_at) VALUES($1,$2,'owner',$3,'[]'::jsonb,false,now())`,
    [crypto.randomUUID(), ws, question]
  );
  const a = await supportAnswer(db, ws, question);
  await db.query(
    `INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,confidence,sources,escalated,created_at) VALUES($1,$2,'assistant',$3,$4,$5::jsonb,$6,now())`,
    [crypto.randomUUID(), ws, a.text, a.confidence, JSON.stringify(a.sources), a.escalate]
  );
}
async function autoDraftOpportunities(db) {
  const wss = await db.query(`SELECT workspace_id FROM receptionist_businessprofile WHERE revenue_mode='draft' AND is_active`);
  let made = 0;
  for (const w of wss.rows) {
    const opps = await db.query(
      `SELECT id FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND campaign_id IS NULL AND confidence >= 75`,
      [w.workspace_id]
    );
    for (const o of opps.rows) {
      try {
        await opportunityDraftCampaign(db, w.workspace_id, o.id);
        made++;
      } catch {
      }
    }
  }
  return made;
}

// src/index.ts
var import_spark_md5 = __toESM(require_spark_md5(), 1);
function pool(env) {
  return new Pool({ connectionString: env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15e3, idleTimeoutMillis: 0 });
}
async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function md5(input) {
  return import_spark_md5.default.hash(input);
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function navLinks(user) {
  const g = Array.isArray(user._goals) ? user._goals : [];
  const show = (...need) => !g.length || need.some((n) => g.includes(n));
  let h = `<a href="/">Dashboard</a>`;
  if (show("social")) h += `<a href="/analytics">Analytics</a>`;
  if (show("reviews")) h += `<a href="/radar">Radar</a>`;
  if (show("social")) h += `<a href="/posts">Posts</a>`;
  if (show("social")) h += `<a href="/media">Media</a>`;
  h += `<a href="/onboarding">Onboarding</a>`;
  if (show("reviews")) h += `<a href="/reviews">Reviews</a>`;
  if (show("receptionist")) h += `<a href="/receptionist">Receptionist</a>`;
  if (show("receptionist")) h += `<a href="/bookings">Bookings</a>`;
  if (show("receptionist")) h += `<a href="/waitlist">Waitlist</a>`;
  if (show("receptionist")) h += `<a href="/loyalty">Loyalty</a>`;
  if (show("receptionist")) h += `<a href="/quotes">Quotes</a>`;
  if (show("receptionist")) h += `<a href="/campaigns">Campaigns</a>`;
  if (show("receptionist", "social", "leads")) h += `<a href="/pages">Pages</a>`;
  if (show("receptionist")) h += `<a href="/competitors">Competitors</a>`;
  if (show("receptionist")) h += `<a href="/support">Support</a>`;
  if (show("leads", "receptionist")) h += `<a href="/inbox">Inbox</a>`;
  if (show("leads")) h += `<a href="/frontdesk">Leads</a>`;
  if (show("reviews", "leads", "receptionist")) h += `<a href="/approvals">Approvals</a>`;
  h += `<a href="/billing">Billing</a>`;
  return h;
}
function layout(title, body, user) {
  const nav = user ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links">${navLinks(user)}${user._cur_ws ? `<a href="/switch" title="Switch business" style="border:1px solid var(--line);border-radius:8px;padding:2px 8px">${esc(user._cur_ws)}${(user._ws_count || 0) > 1 ? " &#9662;" : ""}</a>` : ""}<form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>` : `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a class="btn btn-ghost" href="/login">Log in</a><a class="btn btn-primary" href="/signup">Get started</a></div></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} \xB7 RevUp</title><style>
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
function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
function redirect(to) {
  return new Response(null, { status: 303, headers: { location: to } });
}
async function getUser(req, db) {
  const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const th = await sha256hex(m[1]);
  const r = await db.query(
    `UPDATE cf_sessions SET last_seen_at=now() WHERE token_hash=$1 AND expires_at>now()
     RETURNING user_id`,
    [th]
  );
  if (!r.rows[0]) return null;
  const u = await db.query(`SELECT id,email,name,is_superuser FROM accounts_user WHERE id=$1 AND is_active`, [r.rows[0].user_id]);
  return u.rows[0] || null;
}
async function newSession(db, userId, req) {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const th = await sha256hex(token);
  await db.query(
    `INSERT INTO cf_sessions(token_hash,user_id,device_info,expires_at) VALUES($1,$2,$3,now()+interval '14 days')`,
    [th, userId, (req.headers.get("user-agent") || "").slice(0, 200)]
  );
  return token;
}
async function rateLimited(db, bucket, req, limit) {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await db.query(
    `INSERT INTO cf_ratelimit(key,count) VALUES($1,1) ON CONFLICT (key) DO UPDATE SET count=cf_ratelimit.count+1 RETURNING count`,
    [`${bucket}:${ip}:${day}`]
  );
  return Number(r.rows[0].count) > limit;
}
function sessionCookie(token) {
  return `cf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${14 * 86400}`;
}
var VERIFY_SQL = `SELECT crypt(encode(digest($1,'sha256'),'hex'), '$2a$' || substring($2 from 5)) = '$2a$' || substring($2 from 5) AS ok`;
var MAKE_HASH_SQL = `SELECT 'bcrypt_sha256$' || '$2b$' || substring(crypt(encode(digest($1,'sha256'),'hex'), gen_salt('bf',12)) from 5) AS hash`;
async function membership(db, userId, req) {
  const r = await db.query(
    `SELECT w.id AS workspace_id, w.name AS workspace_name, w.approval_workflow_mode,
            o.id AS org_id, o.name AS org_name, o.plan, o.subscription_status, o.payment_reference,
            o.trial_started_at, o.activated_at, o.goals, m.workspace_role
     FROM members_workspace_membership m
     JOIN workspaces_workspace w ON w.id=m.workspace_id
     JOIN organizations_organization o ON o.id=w.organization_id
     WHERE m.user_id=$1 AND w.is_archived=false AND o.deleted_at IS NULL
     ORDER BY m.added_at`,
    [userId]
  );
  if (!r.rows.length) return null;
  const want = req ? (/(?:^|;\s*)cf_ws=([0-9a-f-]{36})/.exec(req.headers.get("cookie") || "") || [])[1] : null;
  const cur = want && r.rows.find((x) => x.workspace_id === want) || r.rows[0];
  cur.workspaces = r.rows.map((x) => ({ id: x.workspace_id, name: x.workspace_name, org: x.org_name, plan: x.plan, status: x.subscription_status }));
  return cur;
}
async function formData(req) {
  const fd = await req.formData();
  const o = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}
function pfUrl(env, base, plan, org) {
  const prices = { starter: 499, growth: 999, "business-pro": 1999 };
  const amount = prices[plan];
  const params = [
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
    ["cycles", "0"]
  ].filter(([, v]) => v !== "");
  const enc = (v) => encodeURIComponent(v.trim()).replace(/%20/g, "+");
  const baseStr = params.map(([k, v]) => `${k}=${enc(v)}`).join("&");
  const sig = md5(baseStr + `&passphrase=${enc(env.PF_PASSPHRASE)}`);
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`).join("&");
  return `https://sandbox.payfast.co.za/eng/process?${qs}&signature=${sig}`;
}
function pfQuotePlus(v) {
  return encodeURIComponent(v).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
async function handlePayfastItn(db, env, req) {
  const raw = await req.text();
  const pairs = raw.split("&").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)];
  });
  const dec = (v) => decodeURIComponent(v.replace(/\+/g, " "));
  const post = {};
  for (const [k, v] of pairs) post[k] = dec(v);
  const received = post["signature"] || "";
  const baseStr = pairs.filter(([k]) => k !== "signature").map(([k, v]) => `${k}=${pfQuotePlus(dec(v).trim())}`).join("&");
  const ours = md5(baseStr + `&passphrase=${pfQuotePlus(env.PF_PASSPHRASE)}`);
  if (!received || received !== ours) return new Response("bad signature", { status: 400 });
  const check = await fetch("https://sandbox.payfast.co.za/eng/query/validate", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: raw
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
    [plan, post["token"] || "", reference]
  );
  if (!r.rowCount) return new Response("unknown reference", { status: 400 });
  return new Response("OK");
}
var DRAFT_RULES = "Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. No 'AI' buzzwords. Plain, warm, specific language. South African English. Keep the caption under 900 characters including hashtags.";
async function draftCaption(env, business, topic) {
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const prompt = `Business: ${business}.
Write one social media post for this business about: ${topic}.
${DRAFT_RULES}
Reply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
  let lastErr = "no model replied";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1500, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) {
          lastErr = "no JSON in reply";
          continue;
        }
        const parsed = JSON.parse(m[0]);
        const caption = String(parsed.caption || "").trim();
        const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h) => String(h)) : [];
        if (caption) return { caption, hashtags };
        lastErr = "empty caption";
      } catch (e) {
        lastErr = String(e?.message || e);
      }
    }
  }
  throw new Error(lastErr);
}
async function groqFollowup(env, business, lead) {
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
          body: JSON.stringify({ model, temperature: 0.3, max_tokens: 500, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const text = (data?.choices?.[0]?.message?.content || "").trim();
        if (text) return text;
        lastErr = "empty reply";
      } catch (e) {
        lastErr = String(e?.message || e);
      }
    }
  }
  throw new Error(lastErr);
}
var enquiryForm = (biz, err = "") => layout(`Enquire - ${biz}`, `
<div class="card"><h2>Send ${esc(biz)} an enquiry</h2>
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<form method="post">
<label>Your name<input name="name" required maxlength="200"></label>
<label>WhatsApp number or email<input name="contact" required maxlength="200"></label>
<label>How can they help?<textarea name="message" rows="4" required maxlength="2000"></textarea></label>
<button>Send enquiry</button></form></div>`);
var signupPage = (err = "") => layout("Create your RevUp account", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/signup">
<label>Your name<input name="name" required maxlength="150"></label>
<label>Email<input name="email" type="email" required maxlength="254"></label>
<label>Password<input name="password" type="password" required minlength="8"></label>
<label>Business name<input name="business" required maxlength="200"></label>
<button>Create account</button>
<p class="mut">Free trial. Choose the plan that fits you during setup - pay only when your trial ends.</p>
</form></div>`);
var loginPage = (err = "") => layout("Log in to RevUp", `
${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><form method="post" action="/login">
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Log in</button>
</form></div>`);
async function dashboardPage(db, user, mem, msg = "") {
  const [pending, links, clicks, posts] = await Promise.all([
    db.query(`SELECT count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 AND pp.status='pending_review'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM composer_post WHERE workspace_id=$1`, [mem.workspace_id])
  ]);
  return layout("Dashboard", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<p class="mut">${esc(mem.org_name)} \xB7 ${esc(mem.workspace_name)} \xB7 <span class="pill">${esc(mem.plan)}</span> <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(mem.subscription_status)}</span></p>
<div class="grid">
<div class="card"><h2>Posts</h2><p class="stat">${posts.rows[0].c}</p><p class="mut">total in this workspace</p></div>
<div class="card"><h2>Awaiting approval</h2><p class="stat">${pending.rows[0].c}</p><p class="mut"><a href="/approvals">review now \u2192</a></p></div>
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked \xB7 <a href="/reviews">manage \u2192</a></p></div>
<div class="card"><h2>Subscription</h2><p class="stat">${esc(mem.plan)}</p><p class="mut"><a href="/billing">billing \u2192</a></p></div>
</div>`, user);
}
var GOALS = [
  ["receptionist", "Answer my business WhatsApp day and night"],
  ["reviews", "Turn happy customers into 5-star Google reviews"],
  ["social", "Keep my Facebook and Instagram posting"],
  ["leads", "Capture website enquiries and follow them up (FrontDesk)"]
];
var PLAN_CARDS = [
  { slug: "starter", name: "Starter", price: 499, feat: "Google review booster + enquiry inbox" },
  { slug: "growth", name: "Growth", price: 999, feat: "Everything in Starter + social posting with approvals" },
  { slug: "business-pro", name: "Business Pro", price: 1999, feat: "Everything in Growth + FrontDesk lead pipeline and follow-ups" }
];
function recommendPlan(goals) {
  if (goals.includes("leads")) return "business-pro";
  if (goals.includes("social")) return "growth";
  return "starter";
}
async function onboardingPage(db, user, mem, msg = "") {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const w = await db.query(`SELECT industry, website_url, timezone FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ws = w.rows[0] || {};
  const savedGoals = Array.isArray(b.custom_rules?.goals) ? b.custom_rules.goals : [];
  const rec = recommendPlan(savedGoals);
  const cur = mem.plan || rec;
  return layout("Onboarding", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/onboarding">
<h2 style="margin-top:0">Your business</h2>
<label>Business name<input name="business_name" value="${esc(b.business_name || mem.org_name)}" required></label>
<label>Industry<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}"${(ws.industry || b.industry || "general") === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
<label>Website<input name="website_url" value="${esc(ws.website_url || "")}" placeholder="https://\u2026"></label>
<label>Google review link<input name="google_review_url" value="${esc(b.google_review_url || "")}" placeholder="https://g.page/r/\u2026"></label>
<label>Timezone<input name="timezone" value="${esc(ws.timezone || "Africa/Johannesburg")}"></label>
<h2>What do you want RevUp to do for you?</h2>
${GOALS.map(([v, l]) => `<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="goal_${v}"${savedGoals.includes(v) ? " checked" : ""} style="width:auto"> ${l}</label>`).join("")}
<h2>Choose your plan</h2>
${PLAN_CARDS.map((p) => `<label style="display:block;border:1px solid ${cur === p.slug ? "var(--brand)" : "var(--line)"};border-radius:12px;padding:12px 14px;margin:8px 0;cursor:pointer;font-weight:400">
<input type="radio" name="plan" value="${p.slug}"${cur === p.slug ? " checked" : ""} style="width:auto"> <b>${p.name} - R${p.price.toLocaleString("en-ZA")}/month</b>${rec === p.slug ? ` <span class="pill ok recpill">Recommended for you</span>` : ""}<br>
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
      if(p.value===r){var sp=document.createElement('span');sp.className='pill ok recpill';sp.textContent='Recommended for you';card.querySelector('b').after(sp);}
      if(!p.dataset.touched)p.checked=(p.value===r);
      card.style.borderColor=p.checked?'var(--brand)':'var(--line)';
    });
  }
  document.querySelectorAll('input[name="plan"]').forEach(function(p){p.addEventListener('change',function(){p.dataset.touched='1';document.querySelectorAll('input[name="plan"]').forEach(function(q){q.closest('label').style.borderColor=q.checked?'var(--brand)':'var(--line)';});});});
  boxes.forEach(function(b){b.addEventListener('change',recalc);});
  recalc();
})();
</script>
<p class="mut">Your trial starts now - no payment today. You can change plans any time on the billing page.</p>
<button>Save and continue</button>
</form></div>`, user);
}
async function waitlistPage(db, user, mem, msg = "") {
  await waitlistExpire(db, mem.workspace_id);
  const r = await db.query(
    `SELECT w.*, c.name AS contact_name, c.wa_id FROM receptionist_waitlistentry w
     JOIN receptionist_contact c ON c.id=w.contact_id
     WHERE w.workspace_id=$1 ORDER BY CASE WHEN w.status IN ('waiting','offered') THEN 0 ELSE 1 END, w.created_at LIMIT 40`,
    [mem.workspace_id]
  );
  const badge = { waiting: "<b>waiting</b>", offered: '<span class="pill warn">offered</span>', accepted: '<span class="ok">accepted</span>', cancelled: '<span class="mut">cancelled</span>', expired: '<span class="mut">expired</span>' };
  const rows = r.rows.map((w) => `<tr>
<td><b>${esc(w.contact_name || w.wa_id)}</b><br><span class="mut">party of ${w.party_size}${w.wanted_time ? " \xB7 " + esc(w.wanted_time) : ""}</span></td>
<td>${badge[w.status] || esc(w.status)}${w.status === "offered" ? `<br><span class="mut">${w.offer_minutes} min to answer</span>` : ""}</td>
<td>${w.status === "waiting" ? `<form class="inline" method="post" action="/waitlist/${w.id}/offer"><button>Offer a table</button></form>` : ""}
${w.status === "offered" ? `<form class="inline" method="post" action="/waitlist/${w.id}/accept"><button>They accepted</button></form>` : ""}
${["waiting", "offered"].includes(w.status) ? `<form class="inline" method="post" action="/waitlist/${w.id}/cancel"><button class="link">Remove</button></form>` : ""}</td></tr>`).join("");
  return layout("Waitlist", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Add a waiting party</h2>
<form method="post" action="/waitlist">
<label>Name<input name="name" maxlength="120"></label>
<label>WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27\u2026"></label>
<label>Party size<input name="party_size" type="number" min="1" max="30" value="2" style="width:90px"></label>
<label>They hoped for<input name="wanted_time" maxlength="200" placeholder="tonight around 7"></label>
<button>Add to the waitlist</button></form></div>
<div class="card">${r.rows.length ? `<table><tr><th>Party</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">Nobody waiting. When the restaurant is full, add parties here and offer tables as they open up.</p>`}</div>`, user);
}
async function loyaltyPage(db, user, mem, msg = "") {
  const s = await loyaltySettings(db, mem.workspace_id);
  const accounts = await db.query(
    `SELECT a.*, c.name AS contact_name, c.wa_id FROM receptionist_loyaltyaccount a
     JOIN receptionist_contact c ON c.id=a.contact_id WHERE a.workspace_id=$1 ORDER BY a.balance DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const vouchers = await db.query(
    `SELECT v.*, c.name AS contact_name FROM receptionist_voucher v
     JOIN receptionist_contact c ON c.id=v.contact_id WHERE v.workspace_id=$1 ORDER BY v.created_at DESC LIMIT 30`,
    [mem.workspace_id]
  );
  const aRows = accounts.rows.map((a) => `<tr><td><b>${esc(a.contact_name || a.wa_id)}</b></td><td>${a.balance} pts</td><td class="mut">${a.lifetime_points} lifetime</td>
<td>${a.balance >= s.points_for_voucher ? `<form class="inline" method="post" action="/loyalty/vouchers/new"><input type="hidden" name="contact_id" value="${a.contact_id}"><button>Issue R${s.voucher_value_rand} voucher</button></form>` : `<span class="mut">${s.points_for_voucher - a.balance} to go</span>`}</td></tr>`).join("");
  const vRows = vouchers.rows.map((v) => `<tr><td><b>${esc(v.code)}</b></td><td>${esc(v.contact_name)}</td><td>R${v.amount_rand}</td>
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
async function supportPage(db, user, mem) {
  const r = await db.query(`SELECT * FROM receptionist_supportmessage WHERE workspace_id=$1 ORDER BY created_at LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((m) => {
    const src = Array.isArray(m.sources) && m.sources.length ? `<br><span class="mut">Grounded in: ${m.sources.map((x) => esc(x)).join(" \xB7 ")}</span>` : "";
    const conf = m.role === "assistant" ? `<br><span class="mut">Confidence ${m.confidence}%${m.escalated ? " \xB7 flagged for a human" : ""}</span>` : "";
    return m.role === "owner" ? `<div class="card" style="background:var(--brand-soft)"><b>You:</b> ${esc(m.text)}</div>` : `<div class="card"><b>Support:</b> ${esc(m.text)}${src}${conf}</div>`;
  }).join("");
  return layout("Support", `
<div class="card"><h2 style="margin-top:0">Ask about your numbers</h2>
<form method="post" action="/support">
<label>Question<textarea name="question" required placeholder="How many bookings do we have today?"></textarea></label>
<button>Ask</button></form>
<p class="mut">Answers come only from your own data, with confidence and sources shown. Anything it cannot ground gets flagged for a human - it never invents figures.</p></div>
${rows || `<div class="card"><p class="mut">No questions yet.</p></div>`}`, user);
}
async function competitorsPage(db, user, mem, msg = "") {
  await refreshOpportunities(db, mem.workspace_id);
  const rmq = await db.query(`SELECT revenue_mode FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const revMode = rmq.rows[0]?.revenue_mode || "suggest";
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [mem.workspace_id]);
  const menu = await db.query(`SELECT id, name, price FROM menus_item WHERE workspace_id=$1 ORDER BY position LIMIT 100`, [mem.workspace_id]);
  const opps = await db.query(
    `SELECT o.*, c.name AS competitor_name FROM receptionist_marketopportunity o
     LEFT JOIN receptionist_competitor c ON c.id=o.competitor_id
     WHERE o.workspace_id=$1 ORDER BY CASE o.status WHEN 'new' THEN 0 WHEN 'acted' THEN 1 ELSE 2 END, o.confidence DESC, o.updated_at DESC LIMIT 30`,
    [mem.workspace_id]
  );
  const kindLabel = { price_gap: "Price gap", price_advantage: "Price advantage", rating_gap: "Rating gap", promo: "Competitor promotion", demand: "Demand" };
  const compCards = [];
  for (const c of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`,
      [c.id]
    );
    const promos = await db.query(`SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 ORDER BY created_at DESC LIMIT 5`, [c.id]);
    const dishRows = dishes.rows.map((d) => `<tr><td>${esc(d.name)}</td><td>R${Number(d.price).toFixed(2)}</td>
<td>${d.own_name ? `${esc(d.own_name)} (yours R${Number(d.own_price).toFixed(2)})` : '<span class="mut">not mapped</span>'}</td></tr>`).join("");
    const promoRows = promos.rows.map((p) => `<li>${esc(p.text)}${p.valid_until ? ` <span class="mut">to ${new Date(p.valid_until).toLocaleDateString("en-ZA")}</span>` : ""}</li>`).join("");
    const menuOpts = ['<option value="">(map to your menu)</option>', ...menu.rows.map((m) => `<option value="${m.id}">${esc(m.name)} R${Number(m.price).toFixed(2)}</option>`)].join("");
    compCards.push(`<div class="card"><h3 style="margin-top:0">${esc(c.name)} <span class="mut">${esc(c.area || "")}${c.rating !== null ? ` \xB7 their Google ${c.rating}` : ""}</span></h3>
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
  const oppRows = opps.rows.map((o) => {
    const ev = Array.isArray(o.evidence) ? o.evidence : [];
    return `<tr>
<td><b>${esc(o.title)}</b><br><span class="mut">${kindLabel[o.kind] || esc(o.kind)}${o.competitor_name ? " \xB7 " + esc(o.competitor_name) : ""} \xB7 confidence ${o.confidence}%${o.impact_rand !== null ? ` \xB7 about R${Number(o.impact_rand).toLocaleString("en-ZA")}/month` : ""}</span><br>
${esc(o.detail)}${ev.length ? `<br><span class="mut">${ev.map((e) => esc(e)).join("<br>")}</span>` : ""}</td>
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
async function campaignsPage(db, user, mem, msg = "") {
  const r = await db.query(`SELECT * FROM receptionist_campaign WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 30`, [mem.workspace_id]);
  const rows = [];
  for (const c of r.rows) {
    const st = await campaignStats(db, c.id);
    const segLabel = { all: "every customer", dormant: "dormant 30+ days", vip: "VIPs" };
    const fmt = (v) => v ? `${v.sent}/${v.total} sent${Number(v.failed) ? `, ${v.failed} failed` : ""}${Number(v.skipped) ? `, ${v.skipped} skipped` : ""} \xB7 ${v.bookings} bookings \xB7 R${Number(v.revenue).toLocaleString("en-ZA")}` : "";
    const variantB = c.body_b ? `<br><span class="mut">B: ${fmt(st.b)}</span>` : "";
    rows.push(`<tr>
<td><b>${esc(c.name)}</b><br><span class="mut">${segLabel[c.segment] || esc(c.segment)}${c.scheduled_at ? " \xB7 " + new Date(c.scheduled_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : ""}</span></td>
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
async function quotesPage(db, user, mem, msg = "") {
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const r = await db.query(
    `SELECT q.*, c.name AS contact_name FROM receptionist_quote q
     LEFT JOIN receptionist_contact c ON c.id=q.contact_id
     WHERE q.workspace_id=$1 ORDER BY CASE q.status WHEN 'draft' THEN 0 WHEN 'sent' THEN 1 WHEN 'won' THEN 2 ELSE 3 END, q.follow_up_on NULLS LAST, q.created_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const contacts = await db.query(`SELECT id, name, wa_id FROM receptionist_contact WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT 100`, [mem.workspace_id]);
  const opts = ['<option value="">(no linked customer)</option>', ...contacts.rows.map((c) => `<option value="${c.id}">${esc(c.name || c.wa_id)}</option>`)].join("");
  const rows = r.rows.map((q) => {
    const chase = q.status === "sent" && q.follow_up_on && new Date(q.follow_up_on) <= /* @__PURE__ */ new Date(today + "T00:00:00");
    return `<tr${chase ? ' style="background:#fff7ed"' : ""}>
<td><b>${esc(q.customer_name)}</b><br><span class="mut">${esc(q.title || "Quote")}</span></td>
<td>R${(q.amount_cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
<td>${q.status === "sent" ? '<span class="pill warn">sent</span>' : q.status === "won" ? '<span class="ok">won</span>' : q.status === "lost" ? '<span class="mut">lost</span>' : "<b>draft</b>"}
${chase ? `<br><span class="bad">chase today</span>` : q.follow_up_on ? `<br><span class="mut">chase ${new Date(q.follow_up_on).toLocaleDateString("en-ZA")}</span>` : ""}</td>
<td>${q.status === "draft" ? `<form class="inline" method="post" action="/quotes/${q.id}/sent"><button>Mark sent</button></form>` : ""}
${["draft", "sent"].includes(q.status) ? `<form class="inline" method="post" action="/quotes/${q.id}/won"><button class="link">Won</button></form> <form class="inline" method="post" action="/quotes/${q.id}/lost"><button class="link">Lost</button></form>` : ""}</td></tr>`;
  }).join("");
  const won = r.rows.filter((q) => q.status === "won").reduce((t, q) => t + q.amount_cents, 0) / 100;
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
async function reviewsPage(db, user, mem, base, msg = "") {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const links = await db.query(
    `SELECT l.*, c.name AS contact_name FROM receptionist_reviewlink l
     JOIN receptionist_contact c ON c.id=l.contact_id
     WHERE l.workspace_id=$1 ORDER BY l.created_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const rows = links.rows.map((l) => `<tr>
<td>${esc(l.contact_name)}</td>
<td><a href="${base}/r/${esc(l.short_code)}" target="_blank">/r/${esc(l.short_code)}</a></td>
<td>${l.clicked_at ? `<span class="ok">clicked ${new Date(l.clicked_at).toLocaleString("en-ZA")}</span>` : `<span class="mut">not yet</span>`}</td>
<td class="mut">${new Date(l.created_at).toLocaleDateString("en-ZA")}</td></tr>`).join("");
  const contacts = await db.query(
    `SELECT id, name, wa_id, review_status, issue_note, opted_out FROM receptionist_contact
     WHERE workspace_id=$1 AND wa_id <> '' ORDER BY updated_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const events = await db.query(
    `SELECT e.*, c.name AS contact_name FROM receptionist_reviewevent e
     JOIN receptionist_contact c ON c.id=e.contact_id
     WHERE e.workspace_id=$1 ORDER BY e.created_at DESC LIMIT 20`,
    [mem.workspace_id]
  );
  const contactOpts = contacts.rows.filter((c) => !c.opted_out).map((c) => `<option value="${c.id}">${esc(c.name || c.wa_id)}</option>`).join("");
  const evRows = events.rows.map((e) => `<tr>
<td>${esc(e.contact_name)}</td><td>${esc(e.step.replace("_", " "))}</td>
<td>${e.status === "sent" ? `<span class="ok">sent</span>` : e.status === "failed" ? `<span class="bad">failed</span>` : esc(e.status)}</td>
<td class="mut">${new Date(e.scheduled_for).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
<td class="mut">${e.error ? esc(e.error) : ""}</td></tr>`).join("");
  const issues = contacts.rows.filter((c) => c.review_status === "issue_flagged");
  const statusLabel = { new: "new", check_in_sent: "check-in sent", review_requested: "review asked", clicked: "clicked", unsubscribed: "opted out", issue_flagged: "issue" };
  return layout("Reviews", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
${b.google_review_url ? `<p>Google review destination: <a href="${esc(b.google_review_url)}">${esc(b.google_review_url)}</a></p>` : `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">First: where should reviews go?</h2><p class="mut">Paste your Google review link (from Google Business Profile \u2192 "Ask for reviews"). Every tracked link you create sends customers here.</p><form method="post" action="/reviews/destination"><input name="google_review_url" placeholder="https://g.page/r/\u2026" required><button>Save and continue</button></form></div>`}
${b.google_review_url ? `<h2>New review link</h2>
<div class="card"><form method="post" action="/reviews/links">
<label>Customer name<input name="name" required maxlength="200"></label>
<label>Customer WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27\u2026"></label>
<button>Create tracked link</button>
<p class="mut">Send the /r/\u2026 link to the customer. It redirects to your Google review page and records the click.</p>
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
<div class="card">${issues.map((c) => `<p><b>${esc(c.name || c.wa_id)}</b>: ${esc(c.issue_note || "negative reply")} <form method="post" action="/reviews/resolve" style="display:inline"><input type="hidden" name="contact_id" value="${c.id}"><button class="link">Resolved</button></form></p>`).join("")}</div>` : ""}

<h2>Pipeline activity</h2>
<div class="card">${events.rows.length ? `<table><tr><th>Customer</th><th>Step</th><th>Status</th><th>When</th><th>Note</th></tr>${evRows}</table>` : `<p class="mut">Nothing yet. Mark a visit done above to start the flow.</p>`}</div>

<h2>Customers</h2>
<div class="card">${contacts.rows.length ? `<table><tr><th>Name</th><th>Phone</th><th>Review status</th></tr>${contacts.rows.map((c) => `<tr><td>${esc(c.name || "-")}</td><td class="mut">${esc(c.wa_id)}</td><td>${c.opted_out ? '<span class="bad">opted out</span>' : esc(statusLabel[c.review_status] || c.review_status || "new")}</td></tr>`).join("")}</table>` : `<p class="mut">No customers yet.</p>`}</div>`, user);
}
function newPostPage(user, mem, pre, msg = "") {
  return layout("New post", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="card"><form method="post" action="/posts/draft">
<label>Topic<input name="topic" maxlength="200" value="${esc(pre.topic || "")}" placeholder="e.g. teeth whitening special this month" required></label>
<button class="btn-secondary">Draft with AI</button>
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
async function intakeBoards(db, mem) {
  const bp = await db.query(`SELECT industry FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const industry = bp.rows[0]?.industry || "";
  const board = async (table, title, cols) => {
    const r = await db.query(
      `SELECT t.*, c.name AS contact_name, c.wa_id FROM ${table} t JOIN receptionist_contact c ON c.id=t.contact_id
       WHERE t.workspace_id=$1 ORDER BY t.created_at DESC LIMIT 20`,
      [mem.workspace_id]
    );
    if (!r.rows.length) return "";
    const rows = r.rows.map((t) => `<tr><td><b>${esc(t.contact_name || t.wa_id)}</b></td><td>${cols(t)}</td>
<td>${t.status === "resolved" ? '<span class="ok">resolved</span>' : esc(t.status)}</td>
<td>${t.status !== "resolved" ? `<form class="inline" method="post" action="/inbox/intake/${table}/${t.id}/resolve"><button class="link">Resolve</button></form>` : ""}</td></tr>`).join("");
    return `<h2>${title}</h2><div class="card"><table><tr><th>Customer</th><th>Details</th><th>Status</th><th></th></tr>${rows}</table></div>`;
  };
  let h = "";
  if (industry === "funeral") h += await board("receptionist_funeralclaim", "Funeral claims", (t) => esc([t.deceased_name, t.claimant_name && `claimant: ${t.claimant_name}`, t.policy_number && `policy: ${t.policy_number}`].filter(Boolean).join(" \xB7 ")));
  if (industry === "dental") h += await board("receptionist_dentalappointment", "Appointment requests", (t) => esc([t.patient_name, t.reason].filter(Boolean).join(" \xB7 ")));
  if (industry === "trades") h += await board("receptionist_tradedispatch", "Job dispatch", (t) => esc([t.job_type, t.address].filter(Boolean).join(" \xB7 ")));
  return h;
}
async function inboxPage(db, user, mem) {
  const r = await db.query(
    `SELECT c.id, c.name, c.wa_id, count(m.id) AS msgs, max(m.created_at) AS last_at,
            (SELECT body FROM receptionist_message m2 WHERE m2.contact_id=c.id ORDER BY m2.created_at DESC LIMIT 1) AS last_body
     FROM receptionist_contact c JOIN receptionist_message m ON m.contact_id=c.id
     WHERE c.workspace_id=$1 GROUP BY c.id ORDER BY last_at DESC NULLS LAST LIMIT 50`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((c) => `<tr>
<td><a href="/inbox/${c.id}">${esc(c.name || c.wa_id)}</a></td>
<td class="mut">${esc((c.last_body || "").slice(0, 80))}</td>
<td class="mut">${c.last_at ? new Date(c.last_at).toLocaleString("en-ZA") : ""}</td></tr>`).join("");
  return layout("Inbox", `
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Latest</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No customer conversations yet. When customers WhatsApp the business, they appear here.</p>`}</div>
${await intakeBoards(db, mem)}`, user);
}
async function conversationPage(db, user, mem, contactId, env) {
  const dc = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15e3 });
  await dc.connect();
  let c, msgs;
  try {
    c = await dc.query(`SELECT * FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, mem.workspace_id]);
    if (!c.rows[0]) {
      await dc.end().catch(() => {
      });
      return html(layout("Not found", `<p class="bad">Unknown conversation.</p>`), 404);
    }
    msgs = await dc.query(
      `SELECT direction, sender_type, body, created_at FROM receptionist_message WHERE contact_id=$1 AND workspace_id=$2 ORDER BY created_at ASC LIMIT 200`,
      [contactId, mem.workspace_id]
    );
  } finally {
    await dc.end().catch(() => {
    });
  }
  const who = { user: "Customer", ai: "Receptionist", human_agent: "You" };
  const bubbles = msgs.rows.map((m) => {
    const out = m.direction === "outbound";
    return `<div style="display:flex;justify-content:${out ? "flex-end" : "flex-start"};margin:6px 0">
<div style="max-width:70%;padding:8px 12px;border-radius:12px;${out ? "background:var(--brand);color:#fff" : "background:#fff;border:1px solid var(--line)"}">
<div class="mut" style="font-size:11px;${out ? "color:#ffe7d6" : ""}">${esc(who[m.sender_type] || m.sender_type)} \xB7 ${new Date(m.created_at).toLocaleString("en-ZA")}</div>
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
<p class="mut">${c.rows[0].visit_count || 0} visits${c.rows[0].opted_out ? " \xB7 opted out of automated messages" : ""}</p></div>
<div class="card">${bubbles || `<p class="mut">No messages.</p>`}</div>`, user));
}
async function radarPage(db, user, mem, msg) {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ind = w.rows[0]?.industry || "general";
  const p = getPreset(ind);
  const feed = await db.query(
    `SELECT title, link, source, summary, score, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 20`,
    [mem.workspace_id]
  );
  const items = feed.rows.map((r) => `<tr>
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
<ul>${(p.post_themes || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
${(p.hashtags || []).length ? `<p class="mut">Default hashtags: ${esc(p.hashtags.join(" "))}</p>` : ""}
<p class="mut">Reply tone: ${esc(p.responder_tone || "warm and professional")}</p></div>
<div class="card"><h2>Demand signals</h2>
${feed.rows.length ? `<table><tr><th>Signal</th><th>Source</th><th>When</th></tr>${items}</table>` : `<p class="mut">No signals yet for this business. The radar collects South African news and demand signals for your industry; they appear here as they arrive.</p>`}</div>`, user);
}
async function analyticsPage(db, user, mem) {
  const [byStatus, links, clicks, contacts, msgsIn, msgsOut, clicksByDay] = await Promise.all([
    db.query(`SELECT pp.status, count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 GROUP BY pp.status ORDER BY c DESC`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='inbound'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound'`, [mem.workspace_id]),
    db.query(`SELECT date_trunc('day', clicked_at) d, count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 14`, [mem.workspace_id])
  ]);
  const statusRows = byStatus.rows.map((r) => `<tr><td>${esc(r.status)}</td><td>${r.c}</td></tr>`).join("");
  const clickRows = clicksByDay.rows.map((r) => `<tr><td>${new Date(r.d).toLocaleDateString("en-ZA")}</td><td>${r.c}</td></tr>`).join("");
  return layout("Analytics", `
<div class="grid">
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked</p></div>
<div class="card"><h2>Customers</h2><p class="stat">${contacts.rows[0].c}</p><p class="mut">in inbox</p></div>
<div class="card"><h2>WhatsApp messages</h2><p class="stat">${msgsIn.rows[0].c} in \xB7 ${msgsOut.rows[0].c} out</p></div>
</div>
<div class="card"><h2>Posts by status</h2>${byStatus.rows.length ? `<table><tr><th>Status</th><th>Count</th></tr>${statusRows}</table>` : `<p class="mut">No posts yet.</p>`}</div>
<div class="card"><h2>Review-link clicks by day</h2>${clicksByDay.rows.length ? `<table><tr><th>Day</th><th>Clicks</th></tr>${clickRows}</table>` : `<p class="mut">No clicks yet.</p>`}</div>`, user);
}
async function postsPage(db, user, mem) {
  const r = await db.query(
    `SELECT p.id, p.title, p.caption, p.scheduled_at, p.published_at, p.created_at,
            string_agg(DISTINCT pp.status, ', ') AS statuses,
            string_agg(DISTINCT COALESCE(sa.platform, pp.provider), ', ') AS channels
     FROM composer_post p
     LEFT JOIN composer_platform_post pp ON pp.post_id=p.id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((x) => {
    const sts = (x.statuses || "").split(", ").filter(Boolean);
    const allDraft = sts.length > 0 && sts.every((st) => st === "draft");
    return `<tr>
<td><b>${esc(x.title || "(untitled)")}</b><br><span class="mut">${esc((x.caption || "").slice(0, 120))}</span></td>
<td>${sts.map((st) => `<span class="pill ${st === "approved" || st === "published" ? "ok" : ""}">${esc(st)}</span> `).join("")}</td>
<td class="mut">${esc(x.channels || "-")}</td>
<td class="mut">${x.scheduled_at ? new Date(x.scheduled_at).toLocaleString("en-ZA") : new Date(x.created_at).toLocaleDateString("en-ZA")}</td>
<td>${allDraft ? `<form class="inline" method="post" action="/posts/${x.id}/submit"><button>Submit for review</button></form>` : ""}</td></tr>`;
  }).join("");
  return layout("Posts", `
<p><a class="btn btn-primary" href="/posts/new">New post</a></p>
<div class="card">${r.rows.length ? `<table><tr><th>Post</th><th>Status</th><th>Channels</th><th>When</th><th></th></tr>${rows}</table>` : `<p class="mut">No posts yet.</p>`}</div>`, user);
}
var STATUS_LABELS = { approved: "approved", rejected: "rejected", changes_requested: "changes requested" };
async function approvalsPage(db, user, mem, msg = "") {
  const r = await db.query(
    `SELECT pp.id AS pp_id, pp.status, pp.provider, sa.platform, sa.account_name,
            p.id AS post_id, p.title, p.caption, p.scheduled_at, u.name AS author
     FROM composer_platform_post pp
     JOIN composer_post p ON p.id=pp.post_id
     LEFT JOIN accounts_user u ON u.id=p.author_id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1 AND pp.status='pending_review'
     ORDER BY p.created_at LIMIT 100`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((x) => `<tr>
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
async function billingPage(db, user, mem, base, env) {
  const plans = [
    { slug: "starter", name: "Starter", price: 499, feat: "1 workspace \xB7 core publishing" },
    { slug: "growth", name: "Growth", price: 999, feat: "3 workspaces \xB7 approvals \xB7 reviews" },
    { slug: "business-pro", name: "Business Pro", price: 1999, feat: "everything in Growth \xB7 FrontDesk lead pipeline + follow-ups \xB7 3 channels" }
  ];
  const cards = plans.map((p) => `<div class="card"><h2>${p.name}</h2>
<p style="font-size:26px;margin:0">R${p.price.toLocaleString("en-ZA")}<span class="mut">/month</span></p>
<p class="mut">${p.feat}</p>
${p.slug === mem.plan ? `<p class="pill">current plan</p>` : `<a class="btn" href="${pfUrl(env, base, p.slug, mem)}">Subscribe with PayFast</a>`}
</div>`).join("");
  return layout("Billing", `
<p>Plan <b>${esc(mem.plan)}</b> \xB7 status <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc(mem.subscription_status)}</span>
${mem.payment_reference ? ` \xB7 ref <span class="mut">${esc(mem.payment_reference)}</span>` : ""}</p>
${mem.trial_started_at ? `<p class="mut">Trial started ${new Date(mem.trial_started_at).toLocaleDateString("en-ZA")}${mem.activated_at ? ` \xB7 activated ${new Date(mem.activated_at).toLocaleDateString("en-ZA")}` : ""}</p>` : ""}
<div class="grid">${cards}</div>
<p class="mut">Payments are processed by PayFast in rand. You can cancel any time.</p>`, user);
}
function withSecurity(res, path) {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!path.startsWith("/f/")) h.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
var index_default = {
  async fetch(req, env) {
    const res = await handle(req, env);
    return withSecurity(res, new URL(req.url).pathname);
  },
  async scheduled(_event, env, ctx) {
    const db = pool(env);
    try {
      ctx.waitUntil((async () => {
        await runDueReviewEvents(db, env, "https://revup.nahalabs.co.za");
        await runDueServiceReminders(db, env);
        await expireVouchers(db);
        await runDueCampaigns(db, env);
        await autoDraftOpportunities(db);
        await db.end().catch(() => {
        });
      })());
    } catch {
      await db.end().catch(() => {
      });
    }
  }
};
async function handle(req, env) {
  const url = new URL(req.url);
  const base = url.origin;
  const path = url.pathname;
  if (path.startsWith("/t/")) {
    const slug = path.slice(3).replace(/[^a-z0-9]/gi, "").slice(0, 24);
    const db2 = pool(env);
    try {
      const r = await db2.query(`UPDATE cf_prospect_link SET click_count=click_count+1, first_clicked_at=COALESCE(first_clicked_at,now()), last_clicked_at=now() WHERE lower(slug)=lower($1) RETURNING target_url`, [slug]);
      await db2.end().catch(() => {
      });
      const dest = r.rows[0]?.target_url || "https://revup.nahalabs.co.za/?ref=" + slug;
      return new Response(null, { status: 302, headers: { location: dest } });
    } catch {
      await db2.end().catch(() => {
      });
      return redirect("/");
    }
  }
  if ((path === "/webhooks/zernio" || path === "/webhooks/zernio/") && req.method === "POST") {
    const raw = await req.text();
    const sig = req.headers.get("x-zernio-signature") || req.headers.get("x-late-signature") || "";
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false }, 400);
    }
    if (!await verifyZernioSignature(env.ZERNIO_WEBHOOK_SECRET || "", raw, sig.toLowerCase())) {
      const tdb = pool(env);
      let tenantSecret = "";
      try {
        tenantSecret = await tenantWebhookSecret(tdb, payload);
      } finally {
        await tdb.end().catch(() => {
        });
      }
      if (!tenantSecret || !await verifyZernioSignature(tenantSecret, raw, sig.toLowerCase()))
        return json({ ok: false }, 403);
    }
    const eventId = String(payload.id || req.headers.get("x-zernio-event-id") || "");
    const db2 = pool(env);
    try {
      if (eventId) {
        const ins = await db2.query(`INSERT INTO cf_webhook_event(id,event,received_at) VALUES($1,$2,now()) ON CONFLICT (id) DO NOTHING RETURNING id`, [eventId, String(payload.event || "")]);
        if (!ins.rows[0]) {
          await db2.end().catch(() => {
          });
          return json({ ok: true, deduped: true });
        }
      }
      await handleZernioWebhook(db2, env, payload);
      await db2.end().catch(() => {
      });
      return json({ ok: true });
    } catch (e) {
      await db2.end().catch(() => {
      });
      return json({ ok: false, error: String(e).slice(0, 200) }, 500);
    }
  }
  if (path === "/health") {
    try {
      const db2 = pool(env);
      const r = await db2.query("SELECT 1 AS ok");
      await db2.end().catch(() => {
      });
      return json({ ok: true, db: r.rows[0].ok === 1, ts: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }
  const rm = /^\/r\/([A-Za-z0-9_-]{6,12})$/.exec(path);
  if (rm) {
    const db2 = pool(env);
    try {
      const r = await db2.query(
        `UPDATE receptionist_reviewlink SET clicked_at=COALESCE(clicked_at, now()) WHERE short_code=$1 RETURNING original_url, contact_id, clicked_at`,
        [rm[1]]
      );
      if (!r.rows[0]) return html(layout("Link not found", `<p class="bad">This review link doesn't exist.</p>`), 404);
      await cancelPending(db2, r.rows[0].contact_id, "reminder");
      await db2.query(`UPDATE receptionist_contact SET review_status='clicked', updated_at=now() WHERE id=$1 AND review_status NOT IN ('unsubscribed','issue_flagged') AND NOT opted_out`, [r.rows[0].contact_id]);
      return new Response(null, { status: 302, headers: { location: r.rows[0].original_url } });
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/billing/payfast-itn" && req.method === "POST") {
    const db2 = pool(env);
    try {
      return await handlePayfastItn(db2, env, req);
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/signup") {
    if (req.method === "GET") return html(signupPage());
    {
      const rl = pool(env);
      try {
        if (await rateLimited(rl, "signup", req, 10)) {
          await rl.end().catch(() => {
          });
          return html(signupPage("Too many signups from this network today - please try again tomorrow."), 429);
        }
        await rl.end().catch(() => {
        });
      } catch {
        await rl.end().catch(() => {
        });
      }
    }
    const f = await formData(req);
    const db2 = pool(env);
    try {
      if (!f.email || !f.password || !f.name || !f.business) return html(signupPage("All fields are required."), 400);
      if ((f.password || "").length < 8) return html(signupPage("Password must be at least 8 characters."), 400);
      const email = f.email.trim().toLowerCase();
      const dupe = await db2.query(`SELECT 1 FROM accounts_user WHERE lower(email)=$1`, [email]);
      if (dupe.rows[0]) return html(signupPage("An account with this email already exists. Log in instead."), 400);
      const h = await db2.query(MAKE_HASH_SQL, [f.password]);
      const userId = crypto.randomUUID(), orgId = crypto.randomUUID(), wsId = crypto.randomUUID();
      const ref = "RU-" + orgId.replace(/-/g, "").slice(0, 8).toUpperCase();
      const client = await db2.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO accounts_user(id,password,email,name,is_superuser,is_active,is_staff,totp_enabled,totp_recovery_codes,created_at,updated_at,avatar,tos_accepted_at)
             VALUES($1,$2,$3,$4,false,true,false,false,'[]'::jsonb,now(),now(),'',now())`,
          [userId, h.rows[0].hash, email, f.name.trim()]
        );
        await client.query(
          `INSERT INTO organizations_organization(id,name,logo_url,default_timezone,plan,subscription_status,payment_reference,payfast_token,access_suspension_reason,trial_started_at,billing_email,created_at,updated_at)
             VALUES($1,$2,'','Africa/Johannesburg','starter','trial',$3,'','',now(),$4,now(),now())`,
          [orgId, f.business.trim(), ref, email]
        );
        await client.query(
          `INSERT INTO workspaces_workspace(id,name,description,organization_id,timezone,primary_color,secondary_color,default_hashtags,default_first_comment,approval_workflow_mode,is_archived,icon,industry,publish_test_mode,website_url,facebook_url,web_presence_gate_exempt,created_at,updated_at)
             VALUES($1,$2,'',$3,'Africa/Johannesburg','#0ea5e9','#0b1120','[]'::jsonb,'','required',false,'','',false,'','',false,now(),now())`,
          [wsId, f.business.trim(), orgId]
        );
        await client.query(
          `INSERT INTO members_org_membership(id,org_role,organization_id,user_id,accepted_at,invited_at) VALUES($1,'owner',$2,$3,now(),now())`,
          [crypto.randomUUID(), orgId, userId]
        );
        await client.query(
          `INSERT INTO members_workspace_membership(id,workspace_role,user_id,workspace_id,added_at) VALUES($1,'owner',$2,$3,now())`,
          [crypto.randomUUID(), userId, wsId]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      const token = await newSession(db2, userId, req);
      return new Response(null, { status: 303, headers: { location: "/onboarding", "set-cookie": sessionCookie(token) } });
    } catch (e) {
      return html(signupPage("Signup failed: " + String(e).slice(0, 200)), 500);
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/login") {
    if (req.method === "GET") return html(loginPage());
    const f = await formData(req);
    const db2 = pool(env);
    try {
      if (await rateLimited(db2, "login", req, 20)) return html(loginPage("Too many attempts from this network today - please try again tomorrow."), 429);
      const r = await db2.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
      const row = r.rows[0];
      let ok = false;
      if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
        const v = await db2.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
        ok = v.rows[0]?.ok === true;
      }
      if (!ok) return html(loginPage("Wrong email or password."), 401);
      const token = await newSession(db2, row.id, req);
      return new Response(null, { status: 303, headers: { location: "/", "set-cookie": sessionCookie(token) } });
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/logout" && req.method === "POST") {
    const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
    const db2 = pool(env);
    if (m) await db2.query(`DELETE FROM cf_sessions WHERE token_hash=$1`, [await sha256hex(m[1])]);
    await db2.end().catch(() => {
    });
    return new Response(null, { status: 303, headers: { location: "/login", "set-cookie": "cf_session=; Path=/; Max-Age=0" } });
  }
  const fm = /^\/f\/([0-9a-f-]{36})$/.exec(path);
  if (fm) {
    const pdb = pool(env);
    try {
      const w = await pdb.query(
        `SELECT w.id, w.name, o.plan FROM workspaces_workspace w JOIN organizations_organization o ON o.id=w.organization_id WHERE w.id=$1 AND w.is_archived=false AND o.deleted_at IS NULL`,
        [fm[1]]
      );
      const biz = w.rows[0];
      if (!biz || biz.plan !== "business-pro") return html(layout("Enquiries closed", `<div class="card"><p>This business is not taking online enquiries right now.</p></div>`), 404);
      if (req.method === "POST") {
        const f = await formData(req);
        const name = (f.name || "").trim().slice(0, 200), contact = (f.contact || "").trim().slice(0, 200), message = (f.message || "").trim().slice(0, 2e3);
        if (!name || !contact || !message) return html(enquiryForm(biz.name, "Please fill in your name, contact and message."));
        const ip = req.headers.get("cf-connecting-ip") || "";
        const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const key = (await sha256hex(fm[1] + ip + day)).slice(0, 40);
        const leadId = crypto.randomUUID();
        const ins = await pdb.query(
          `INSERT INTO frontdesk_lead(id,workspace_id,name,contact,message,stage,value_cents,request_key,created_at,updated_at)
             VALUES($1,$2,$3,$4,$5,'new',0,$6,now(),now()) ON CONFLICT (workspace_id,request_key) DO NOTHING RETURNING id`,
          [leadId, fm[1], name, contact, message, key]
        );
        if (ins.rows[0]) {
          const cid = crypto.randomUUID();
          await pdb.query(
            `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
               VALUES($1,$2,$3,$4,'[]'::jsonb,true,false,'','','new','',false,'web enquiry',0,0,now(),now())`,
            [cid, fm[1], ("web:" + contact).slice(0, 32), name.slice(0, 120)]
          );
          await pdb.query(
            `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
               VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,'[]'::jsonb)`,
            [crypto.randomUUID(), message, "fd-" + leadId, cid, fm[1]]
          );
        }
        return html(layout("Thank you", `<div class="card"><h2>Thank you, ${esc(name)}</h2><p>${esc(biz.name)} has your enquiry and will get back to you shortly.</p></div>`));
      }
      return html(enquiryForm(biz.name));
    } finally {
      await pdb.end().catch(() => {
      });
    }
  }
  const pm = /^\/p\/([a-z0-9-]{4,64})(\/go)?$/.exec(path);
  if (pm) {
    const pgdb = pool(env);
    try {
      return await servePublic(pgdb, pm[1], !!pm[2], req);
    } finally {
      await pgdb.end().catch(() => {
      });
    }
  }
  const db = pool(env);
  try {
    if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    const user = await getUser(req, db);
    if (!user && path === "/") return html(landingPage());
    if (!user) return redirect("/login");
    const mem = await membership(db, user.id, req);
    if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);
    user._cur_ws = mem.workspace_name;
    user._ws_count = (mem.workspaces || []).length;
    user._goals = Array.isArray(mem.goals) ? mem.goals : [];
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
        } catch (e) {
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
        cta_label: (f.cta_label || "WhatsApp us").trim().slice(0, 40)
      };
      let gen;
      try {
        gen = await generateSections(env, brief, skeleton);
      } catch {
        return html(layout("New landing page", newPageBody("The copywriter is busy right now - please try again in a minute."), user), 502);
      }
      const pageId = crypto.randomUUID();
      const slug = makeSlug(brief.business || "page");
      const title = (gen.seo_title || `${brief.business} - ${brief.angle}`).slice(0, 200);
      const brand = { business: brief.business, whatsapp: brief.whatsapp, cta_label: brief.cta_label, color: (f.color || "#F97316").slice(0, 7), area: brief.area, link: "" };
      await db.query(
        `INSERT INTO cf_page(id,workspace_id,title,slug,angle,industry,status,brand,sections,source_url) VALUES($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9)`,
        [pageId, mem.workspace_id, title, slug, brief.angle, brief.industry, JSON.stringify(brand), JSON.stringify(gen.sections), sourceUrl]
      );
      return redirect("/pages/" + pageId);
    }
    const pam = /^\/pages\/([0-9a-f-]{36})(?:\/(publish|unpublish|delete))?$/.exec(path);
    if (pam) {
      await ensurePageTables(db);
      const pr = await db.query(`SELECT * FROM cf_page WHERE id=$1 AND workspace_id=$2`, [pam[1], mem.workspace_id]);
      const page = pr.rows[0];
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
        const sections = (page.sections || []).map((s, i) => ({
          type: s.type,
          heading: (f["h_" + i] ?? s.heading).slice(0, 140),
          body: (f["b_" + i] ?? s.body).slice(0, 800),
          items: String(f["i_" + i] ?? (s.items || []).join("\n")).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 140))
        }));
        const brand = Object.assign({}, page.brand || {}, {
          cta_label: (f.cta_label || "WhatsApp us").slice(0, 40),
          whatsapp: (f.whatsapp || "").slice(0, 20),
          link: (f.link || "").slice(0, 500),
          color: (f.color || "#F97316").slice(0, 7)
        });
        await db.query(`UPDATE cf_page SET sections=$1, brand=$2, updated_at=now() WHERE id=$3`, [JSON.stringify(sections), JSON.stringify(brand), page.id]);
        return redirect("/pages/" + page.id);
      }
      return html(layout(page.title, await pageDetailBody(db, page, base, url.searchParams.get("msg") || ""), user));
    }
    if (path === "/switch") {
      if (req.method === "POST") {
        const f = await formData(req);
        const ok = (mem.workspaces || []).some((w) => w.id === f.workspace_id);
        if (!ok) return redirect("/switch");
        return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `cf_ws=${f.workspace_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 86400}` } });
      }
      const rows = (mem.workspaces || []).map((w) => `<tr>
<td><b>${esc(w.name)}</b><br><span class="mut">${esc(w.org)}</span></td>
<td>${esc(w.plan)} \xB7 ${esc(w.status)}</td>
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
          await db.query(
            `INSERT INTO cf_prospect_link(id,workspace_id,slug,prospect_name,target_url) VALUES($1,$2,$3,$4,$5)`,
            [crypto.randomUUID(), mem.workspace_id, slug, name, target || "https://revup.nahalabs.co.za/?ref=" + slug]
          );
        }
        return redirect("/prospects");
      }
      const links = await db.query(`SELECT * FROM cf_prospect_link WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
      const rows = links.rows.map((l) => `<tr>
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
          await db.query(
            `INSERT INTO receptionist_tenantmessagingconnection(id,workspace_id,api_key,profile_id,status,last_error,created_at,updated_at)
               VALUES($1,$2,$3,$4,'key_valid','',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET api_key=EXCLUDED.api_key, profile_id=EXCLUDED.profile_id, status='key_valid', last_error='', updated_at=now()`,
            [crypto.randomUUID(), mem.workspace_id, key, v.profileId]
          );
          return redirect("/receptionist/connect?msg=" + encodeURIComponent("Key saved. Now connect your WhatsApp."));
        }
        if (f.action === "start") {
          if (!conn || !conn.profile_id) return redirect("/receptionist/connect?err=" + encodeURIComponent("Save your API key first."));
          const cb = `${base}/receptionist/connect/callback?ws=${mem.workspace_id}&u=${user.id}&p=${conn.profile_id}`;
          let authUrl = "";
          try {
            authUrl = await tenantConnectUrl(conn.api_key, conn.profile_id, cb);
          } catch (e) {
            return redirect("/receptionist/connect?err=" + encodeURIComponent(e.status === 402 ? "Your messaging plan covers 2 numbers. Add a card in your messaging account to connect more." : "Could not start the connection. Please try again."));
          }
          await db.query(`UPDATE receptionist_tenantmessagingconnection SET status='connecting', updated_at=now() WHERE workspace_id=$1`, [mem.workspace_id]);
          return new Response(null, { status: 303, headers: { location: authUrl } });
        }
        return redirect("/receptionist/connect");
      }
      const step = conn ? conn.status === "connected" ? 3 : 2 : 1;
      return html(layout("Connect WhatsApp", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}${err ? `<p class="bad">${esc(err)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Connect your own WhatsApp number</h2>
<p class="mut">Three one-time steps. Your customers then chat with YOUR number, and the receptionist answers them with your business details.</p>
<h3>1. Create your messaging account ${step > 1 ? '<span class="ok">&#10003;</span>' : ""}</h3>
<p class="mut">Open a free account with our messaging partner, then copy your API key from its settings.</p>
<h3>2. Paste your API key ${step > 2 ? '<span class="ok">&#10003;</span>' : ""}</h3>
${conn && conn.status === "connected" ? `<p class="ok">Number connected: +${esc(conn.phone_number || "")}</p>` : `<form method="post"><input type="hidden" name="action" value="save_key"><label>API key<input name="api_key" required maxlength="200" autocomplete="off"></label><button>Save key</button></form>`}
${conn && conn.status !== "connected" ? `<h3>3. Connect WhatsApp</h3><form method="post"><input type="hidden" name="action" value="start"><button class="btn btn-primary">Connect WhatsApp</button><p class="mut">You will scan a QR code with the WhatsApp app on your phone - the same way WhatsApp Web pairs.</p></form>` : ""}
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
        const r = await tenantConfirmAndBind(db, conn, profileId, accountId, `${base}/webhooks/zernio`);
        return redirect("/receptionist/connect?" + (r.ok ? "msg" : "err") + "=" + encodeURIComponent(r.msg));
      } catch (e) {
        return redirect("/receptionist/connect?err=" + encodeURIComponent("Your number connected, but we could not confirm it yet. Refresh in a moment."));
      }
    }
    if (path === "/receptionist") {
      const [ch, prof, usedM, planRow] = await Promise.all([
        db.query(`SELECT phone_number, label, is_sandbox, connected_at FROM receptionist_zerniochannel WHERE workspace_id=$1`, [mem.workspace_id]),
        db.query(`SELECT business_name, industry, is_active FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]),
        db.query(`SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`, [mem.org_id]),
        db.query(`SELECT plan FROM organizations_organization WHERE id=$1`, [mem.org_id])
      ]);
      const allowance = { starter: 500, growth: 1e3, "business-pro": 2500 };
      const pl = planRow.rows[0]?.plan || "starter";
      const lim = allowance[pl] ?? 500;
      const chan = ch.rows.map((c) => `<tr><td>+${esc(c.phone_number || "")}</td><td>${esc(c.label || "")}</td><td>${c.is_sandbox ? "demo line" : "live"}</td></tr>`).join("");
      const p = prof.rows[0];
      return html(layout("Receptionist", `
${!ch.rows.length ? `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">Connect your WhatsApp</h2><p>Your receptionist answers customers on your own business WhatsApp number. <a href="/receptionist/connect">Connect it yourself in three steps</a> - it takes a few minutes.</p></div>` : ""}
<div class="card"><h2 style="margin-top:0">Your receptionist</h2>
<p>${p ? `${esc(p.business_name || mem.org_name)} \xB7 ${esc(p.industry || "general")} \xB7 ${p.is_active ? '<span class="ok">answering</span>' : '<span class="warn">paused</span>'}` : "Tell RevUp about your business in onboarding so the receptionist knows what to say."}</p>
<p class="mut">Business details, hours and prices come from <a href="/onboarding">onboarding</a>. Conversations live in your <a href="/inbox">inbox</a> - step in any time.</p></div>
<div class="grid">
<div class="card"><h2>AI replies this month</h2><p class="stat">${usedM.rows[0].c} / ${lim}</p><p class="mut">on the ${esc(pl)} plan</p></div>
<div class="card"><h2>Connected numbers</h2>${ch.rows.length ? `<table><tr><th>Number</th><th>Label</th><th>Type</th></tr>${chan}</table>` : `<p class="mut">None yet.</p>`}</div>
</div>`, user));
    }
    if (path === "/") return html(await dashboardPage(db, user, mem, url.searchParams.get("msg") || ""));
    if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    if (path === "/onboarding") {
      if (req.method === "POST") {
        const f = await formData(req);
        const goals = GOALS.map(([v]) => v).filter((v) => f["goal_" + v]);
        const plan = ["starter", "growth", "business-pro"].includes(f.plan || "") ? f.plan : recommendPlan(goals);
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `UPDATE workspaces_workspace SET industry=$1, website_url=$2, timezone=$3, updated_at=now() WHERE id=$4`,
            [f.industry || "", f.website_url || "", f.timezone || "Africa/Johannesburg", mem.workspace_id]
          );
          await client.query(`UPDATE organizations_organization SET plan=$1, goals=$3::jsonb, updated_at=now() WHERE id=$2`, [plan, mem.org_id, JSON.stringify(goals)]);
          await client.query(
            `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
               VALUES($1,$2,$3,$4,$6::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$5,true,true,2,'reviews',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET business_name=EXCLUDED.business_name, industry=EXCLUDED.industry,
                 google_review_url=EXCLUDED.google_review_url, custom_rules=EXCLUDED.custom_rules, updated_at=now()`,
            [crypto.randomUUID(), mem.workspace_id, f.business_name || mem.org_name, f.industry || "", f.google_review_url || "", JSON.stringify({ goals })]
          );
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
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
      const tmap = {};
      for (const t of totals.rows) tmap[t.stage] = t;
      const STAGES = ["new", "contacted", "quoted", "won", "lost"];
      const summary = STAGES.map((s) => `<div class="card"><h2 style="text-transform:capitalize">${s}</h2><p class="stat">${tmap[s]?.c || 0}</p><p class="mut">R${((tmap[s]?.v || 0) / 100).toLocaleString("en-ZA")}</p></div>`).join("");
      const byLead = {};
      for (const d of drafts.rows) (byLead[d.lead_id] = byLead[d.lead_id] || []).push(d);
      const rows = leads.rows.map((l) => {
        const ds = (byLead[l.id] || []).map((d) => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0">
<div class="mut" style="font-size:11px">Follow-up draft \xB7 ${esc(d.status)} \xB7 ${new Date(d.created_at).toLocaleString("en-ZA")}</div>
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
<p class="mut">Your public enquiry form: <a href="/f/${mem.workspace_id}" target="_blank" rel="noopener">/f/${mem.workspace_id.slice(0, 8)}\u2026</a> - share it anywhere. Enquiries land here and in your inbox.</p>
<div class="grid">${summary}</div>
<div class="card">${leads.rows.length ? `<table><tr><th>Lead</th><th>Enquiry + follow-ups</th><th>Stage \xB7 value (ZAR)</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No enquiries yet. Share your enquiry form link to start capturing leads.</p>`}</div>`, user));
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
        await db.query(
          `INSERT INTO frontdesk_followup_draft(id,lead_id,workspace_id,body,status,created_at,updated_at) VALUES($1,$2,$3,$4,'draft',now(),now())`,
          [crypto.randomUUID(), fdraft[1], mem.workspace_id, body]
        );
      } catch (e) {
        return redirect("/frontdesk?err=" + encodeURIComponent("Drafting failed - try again."));
      }
      return redirect("/frontdesk");
    }
    const fappr = /^\/frontdesk\/draft\/([0-9a-f-]{36})\/approve$/.exec(path);
    if (fappr && req.method === "POST") {
      if (mem.plan !== "business-pro") return redirect("/frontdesk");
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
        await db.query(
          `INSERT INTO cf_media(id,workspace_id,filename,mime,size,data) VALUES($1,$2,$3,$4,$5,$6)`,
          [crypto.randomUUID(), mem.workspace_id, (file.name || "image").slice(0, 200), file.type, file.size, buf]
        );
        return redirect("/media?msg=" + encodeURIComponent("Image added to your library."));
      }
      const items = await db.query(`SELECT id, filename, mime, size, created_at FROM cf_media WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 60`, [mem.workspace_id]);
      const msg = url.searchParams.get("msg") || "", err = url.searchParams.get("err") || "";
      const cards = items.rows.map((m) => `<div class="card" style="padding:10px">
<img src="/media/${m.id}/raw" alt="${esc(m.filename)}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:var(--line)">
<p style="margin:6px 0 2px"><b>${esc(m.filename)}</b><br><span class="mut">${Math.round(m.size / 1024)} KB \xB7 ${new Date(m.created_at).toLocaleDateString("en-ZA")}</span></p>
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
            [postId, (f.title || "").trim(), (f.caption || "").trim(), mem.workspace_id, user.id, /^[0-9a-f-]{36}$/.test(f.media_id || "") ? f.media_id : null]
          );
          const accs = await client.query(
            `SELECT id, provider FROM social_accounts_social_account WHERE workspace_id=$1 AND connection_status='connected'`,
            [mem.workspace_id]
          );
          for (const a of accs.rows) {
            await client.query(
              `INSERT INTO composer_platform_post(id,platform_post_id,publish_error,retry_count,created_at,updated_at,social_account_id,post_id,platform_extra,status,first_comment_error,first_comment_id,first_comment_retry_count,first_comment_status,last_provider_error,last_provider_status,provider,provider_post_id)
                 VALUES($1,'','',0,now(),now(),$2,$3,'{}'::jsonb,'draft','','',0,'none','','',$4,'')`,
              [crypto.randomUUID(), a.id, postId, a.provider || "zernio"]
            );
          }
          await client.query("COMMIT");
          return redirect("/posts?msg=" + encodeURIComponent("Draft created."));
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
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
      } catch (e) {
        return html(newPostPage(user, mem, f, "Drafting failed (" + String(e?.message || e) + ") - write it manually or try again."));
      }
    }
    if (path === "/inbox") return html(await inboxPage(db, user, mem));
    const cardPost = /^\/inbox\/([0-9a-f-]{36})\/card$/.exec(path);
    if (cardPost && req.method === "POST") {
      const f = await formData(req);
      const spend = Number(String(f.total_spend || "0").replace(",", "."));
      if (isNaN(spend) || spend < 0 || spend > 1e8) return redirect("/inbox/" + cardPost[1]);
      const bday = /^\d{4}-\d{2}-\d{2}$/.test(f.birthday || "") ? f.birthday : null;
      await db.query(
        `UPDATE receptionist_contact SET name=$1, birthday=$2, dietary_notes=$3, notes=$4, total_spend=$5, is_vip=$6, updated_at=now()
           WHERE id=$7 AND workspace_id=$8`,
        [String(f.name || "").trim().slice(0, 120), bday, String(f.dietary_notes || "").trim().slice(0, 200), String(f.notes || "").trim(), spend, f.is_vip === "on", cardPost[1], mem.workspace_id]
      );
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
             WHERE pp.post_id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`,
          [sm[1], mem.workspace_id]
        );
        let moved = 0;
        for (const pp of cur.rows) {
          if (pp.status !== "draft") continue;
          await client.query(`UPDATE composer_platform_post SET status='pending_review', updated_at=now() WHERE id=$1`, [pp.id]);
          moved++;
        }
        if (moved) {
          await client.query(
            `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
               VALUES($1,$2,NULL,$3,'submitted','',now())`,
            [crypto.randomUUID(), sm[1], user.id]
          );
        }
        await client.query("COMMIT");
        return redirect(moved ? "/approvals" : "/posts?msg=" + encodeURIComponent("Nothing to submit (no draft channels)."));
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/bookings") {
      const bk = await db.query(
        `SELECT b.*, c.name AS contact_name, c.wa_id FROM receptionist_booking b
           JOIN receptionist_contact c ON c.id=b.contact_id
           WHERE b.workspace_id=$1 ORDER BY b.created_at DESC LIMIT 50`,
        [mem.workspace_id]
      );
      const msg = url.searchParams.get("msg") || "";
      const rows = bk.rows.map((b) => `<tr>
<td><b>${esc(b.contact_name || b.wa_id)}</b><br><span class="mut">${esc(b.service || "booking")}</span></td>
<td class="mut">${b.status === "confirmed" && b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : esc(b.preferred_time || "to confirm")}</td>
<td>${b.status === "confirmed" ? '<span class="ok">confirmed</span>' : b.status === "done" ? "done" : b.status === "cancelled" ? '<span class="mut">cancelled</span>' : "<b>requested</b>"}</td>
<td>${b.status === "requested" ? `<form class="inline" method="post" action="/bookings/${b.id}/confirm"><input type="datetime-local" name="when" required style="width:auto"><button>Confirm</button></form>` : ""}
${b.status === "confirmed" ? `<form class="inline" method="post" action="/bookings/${b.id}/done"><button>Mark done</button></form>` : ""}
${["requested", "confirmed"].includes(b.status) ? `<form class="inline" method="post" action="/bookings/${b.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`).join("");
      return html(layout("Bookings", `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<p class="mut">Booking requests land here from your WhatsApp receptionist. Confirm a time, and when the job is finished mark it done - that starts the review request flow automatically.</p>
<div class="card">${bk.rows.length ? `<table><tr><th>Customer</th><th>Time</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No bookings yet. When a customer books on WhatsApp, it shows up here.</p>`}</div>`, user));
    }
    const bact = /^\/bookings\/([0-9a-f-]{36})\/(confirm|done|cancel)$/.exec(path);
    if (bact && req.method === "POST") {
      const own = await db.query(`SELECT id, contact_id, status FROM receptionist_booking WHERE id=$1 AND workspace_id=$2`, [bact[1], mem.workspace_id]);
      const b = own.rows[0];
      if (!b) return redirect("/bookings");
      if (bact[2] === "confirm" && b.status === "requested") {
        const f = await formData(req);
        const when = String(f.when || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) return redirect("/bookings");
        await db.query(`UPDATE receptionist_booking SET status='confirmed', scheduled_start=($1 || ':00+02')::timestamptz WHERE id=$2`, [when.slice(0, 16), b.id]);
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
        await db.query(`UPDATE receptionist_booking SET status='cancelled' WHERE id=$1`, [b.id]);
        return redirect("/bookings?msg=" + encodeURIComponent("Booking cancelled."));
      }
      return redirect("/bookings");
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
        [f.enabled === "on", Math.max(0, Number(f.points_per_visit) || 0), Math.max(0, Number(f.welcome_bonus) || 0), Math.max(1, Number(f.points_for_voucher) || 100), Math.max(1, Number(f.voucher_value_rand) || 50), Math.max(1, Number(f.voucher_valid_days) || 90), mem.workspace_id]
      );
      return redirect("/loyalty?msg=" + encodeURIComponent("Rules saved."));
    }
    if (path === "/loyalty/vouchers/new" && req.method === "POST") {
      const f = await formData(req);
      try {
        const v = await issueVoucher(db, mem.workspace_id, String(f.contact_id || ""));
        return redirect("/loyalty?msg=" + encodeURIComponent(`Voucher ${v.code} issued - R${v.amount_rand}.`));
      } catch (e) {
        return redirect("/loyalty?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const vred = /^\/loyalty\/vouchers\/([0-9a-f-]{36})\/redeem$/.exec(path);
    if (vred && req.method === "POST") {
      const okd = await redeemVoucher(db, mem.workspace_id, vred[1]);
      return redirect("/loyalty?msg=" + encodeURIComponent(okd ? "Voucher redeemed." : "That voucher is not usable."));
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
        } catch (e) {
          return redirect("/campaigns?msg=" + encodeURIComponent(String(e?.message || e)));
        }
      }
      return html(await campaignsPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const capp = /^\/campaigns\/([0-9a-f-]{36})\/approve$/.exec(path);
    if (capp && req.method === "POST") {
      const f = await formData(req);
      try {
        await campaignApprove(db, mem.workspace_id, capp[1], String(f.when || ""));
        return redirect("/campaigns?msg=" + encodeURIComponent("Approved. The send starts within 15 minutes."));
      } catch (e) {
        return redirect("/campaigns?msg=" + encodeURIComponent(String(e?.message || e)));
      }
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
        } catch (e) {
          return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
        }
      }
      return html(await competitorsPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const cdish = /^\/competitors\/([0-9a-f-]{36})\/dishes$/.exec(path);
    if (cdish && req.method === "POST") {
      const f = await formData(req);
      try {
        await dishAdd(db, mem.workspace_id, cdish[1], String(f.name || ""), Number(f.price), String(f.own_item_id || ""));
        return redirect("/competitors?msg=" + encodeURIComponent("Dish logged."));
      } catch (e) {
        return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const cpromo = /^\/competitors\/([0-9a-f-]{36})\/promos$/.exec(path);
    if (cpromo && req.method === "POST") {
      const f = await formData(req);
      try {
        await promoAdd(db, mem.workspace_id, cpromo[1], String(f.text || ""), String(f.valid_until || ""));
        return redirect("/competitors?msg=" + encodeURIComponent("Promotion logged."));
      } catch (e) {
        return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
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
      } catch (e) {
        return redirect("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    if (path === "/support") {
      if (req.method === "POST") {
        const f = await formData(req);
        const q = String(f.question || "").trim();
        if (q) await supportHandle(db, mem.workspace_id, q.slice(0, 1e3));
        return redirect("/support");
      }
      return html(await supportPage(db, user, mem));
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
          [crypto.randomUUID(), mem.workspace_id, mem.org_name, f.google_review_url]
        );
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
             RETURNING id`,
          [crypto.randomUUID(), mem.workspace_id, (f.wa_id || "").trim(), (f.name || "").trim()]
        );
        const contactId = cUp.rows[0].id;
        const code = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
        await client.query(
          `INSERT INTO receptionist_reviewlink(id,workspace_id,contact_id,short_code,original_url,created_at)
             VALUES($1,$2,$3,$4,$5,now())`,
          [crypto.randomUUID(), mem.workspace_id, contactId, code, dest]
        );
        await client.query("COMMIT");
        return redirect(`/reviews?created=${code}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
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
             WHERE pp.id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`,
          [ppId, mem.workspace_id]
        );
        const pp = cur.rows[0];
        if (!pp) {
          await client.query("ROLLBACK");
          return html(layout("Not found", `<p class="bad">Post not found.</p>`, user), 404);
        }
        const allowed = {
          pending_review: ["approved", "changes_requested", "rejected"],
          pending_client: ["approved", "changes_requested", "rejected"]
        };
        if (!(allowed[pp.status] || []).includes(target)) {
          await client.query("ROLLBACK");
          return redirect(`/approvals?done=${encodeURIComponent("already " + pp.status)}`);
        }
        await client.query(`UPDATE composer_platform_post SET status=$1, updated_at=now() WHERE id=$2`, [target, ppId]);
        await client.query(
          `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
             VALUES($1,$2,$3,$4,$5,'',now())`,
          [crypto.randomUUID(), pp.post_id, ppId, user.id, target]
        );
        await client.query("COMMIT");
        return redirect(`/approvals?done=${target}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/billing") return html(await billingPage(db, user, mem, base, env));
    return html(layout("Not found", `<p class="bad">Nothing here yet.</p>`, user), 404);
  } catch (e) {
    return html(layout("Error", `<p class="bad">${esc(String(e).slice(0, 300))}</p>`), 500);
  } finally {
    await db.end().catch(() => {
    });
  }
}
export {
  index_default as default,
  landingPage,
  md5,
  navLinks,
  pfUrl,
  recommendPlan
};
