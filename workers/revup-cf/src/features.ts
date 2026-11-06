// Waitlist, loyalty+vouchers, quotes - ported from the old receptionist app.
import type { Pool } from "pg";
import { deliver, OPT_OUT_FOOTER } from "./reviews";

// ---------- waitlist ----------
export async function waitlistAdd(db: Pool, ws: string, waId: string, name: string, partySize: number, wantedTime: string): Promise<void> {
  const c = await db.query(
    `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
     VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())
     ON CONFLICT (workspace_id, wa_id) DO UPDATE SET name=COALESCE(NULLIF(EXCLUDED.name,''), receptionist_contact.name), updated_at=now()
     RETURNING id`, [crypto.randomUUID(), ws, waId, name]);
  await db.query(
    `INSERT INTO receptionist_waitlistentry(id,workspace_id,contact_id,party_size,wanted_time,status,offer_minutes,notes,created_at)
     VALUES($1,$2,$3,$4,$5,'waiting',15,'',now())`, [crypto.randomUUID(), ws, c.rows[0].id, partySize || 2, wantedTime.slice(0, 200)]);
}

export async function waitlistExpire(db: Pool, ws: string): Promise<void> {
  await db.query(
    `UPDATE receptionist_waitlistentry SET status='expired'
     WHERE workspace_id=$1 AND status='offered' AND offered_at < now() - (offer_minutes || ' minutes')::interval`, [ws]);
}

export async function waitlistAction(db: Pool, ws: string, id: string, action: string): Promise<boolean> {
  if (action === "offer")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='offered', offered_at=now() WHERE id=$1 AND workspace_id=$2 AND status='waiting'`, [id, ws])).rowCount;
  if (action === "accept")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='accepted' WHERE id=$1 AND workspace_id=$2 AND status='offered'`, [id, ws])).rowCount;
  if (action === "cancel")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('waiting','offered')`, [id, ws])).rowCount;
  return false;
}

// ---------- loyalty + vouchers ----------
export async function loyaltySettings(db: Pool, ws: string): Promise<any> {
  const ex = await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE workspace_id=$1`, [ws]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltysettings(id,workspace_id,enabled,points_per_visit,welcome_bonus,points_for_voucher,voucher_value_rand,voucher_valid_days)
     VALUES($1,$2,true,10,25,100,50,90)`, [id, ws]);
  return (await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE id=$1`, [id])).rows[0];
}

async function loyaltyApply(db: Pool, accountId: string, kind: string, points: number, note: string, bookingId: string | null = null): Promise<void> {
  await db.query(
    `INSERT INTO receptionist_loyaltytransaction(id,account_id,kind,points,note,booking_id,created_at)
     VALUES($1,$2,$3,$4,$5,$6,now())`, [crypto.randomUUID(), accountId, kind, points, note.slice(0, 200), bookingId]);
  await db.query(
    `UPDATE receptionist_loyaltyaccount SET balance=GREATEST(0,balance+$2), lifetime_points=lifetime_points+GREATEST(0,$2),
       welcomed=welcomed OR $3='welcome', updated_at=now() WHERE id=$1`, [accountId, points, kind]);
}

export async function loyaltyAccount(db: Pool, ws: string, contactId: string): Promise<any> {
  const s = await loyaltySettings(db, ws);
  const ex = await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE workspace_id=$1 AND contact_id=$2`, [ws, contactId]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltyaccount(id,workspace_id,contact_id,balance,lifetime_points,welcomed,created_at,updated_at)
     VALUES($1,$2,$3,0,0,false,now(),now())`, [id, ws, contactId]);
  if (s.welcome_bonus > 0) await loyaltyApply(db, id, "welcome", s.welcome_bonus, "Welcome bonus");
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [id])).rows[0];
}

export async function awardForBooking(db: Pool, ws: string, bookingId: string, contactId: string): Promise<any> {
  const s = await loyaltySettings(db, ws);
  if (!s.enabled) return null;
  const account = await loyaltyAccount(db, ws, contactId);
  const already = await db.query(`SELECT 1 FROM receptionist_loyaltytransaction WHERE account_id=$1 AND kind='earn' AND booking_id=$2`, [account.id, bookingId]);
  if (already.rows[0]) return account;
  const vc = await db.query(`SELECT visit_count FROM receptionist_contact WHERE id=$1`, [contactId]);
  await loyaltyApply(db, account.id, "earn", s.points_per_visit, `Visit #${vc.rows[0]?.visit_count || 1}`, bookingId);
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [account.id])).rows[0];
}

export async function issueVoucher(db: Pool, ws: string, contactId: string, kind = "loyalty", note = ""): Promise<any> {
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
    [id, ws, contactId, kind, code, s.voucher_value_rand, note.slice(0, 200), String(s.voucher_valid_days)]);
  return (await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1`, [id])).rows[0];
}

export async function redeemVoucher(db: Pool, ws: string, id: string): Promise<boolean> {
  const v = await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  if (!v.rows[0]) return false;
  if (v.rows[0].status === "active" && new Date(v.rows[0].expires_at) < new Date()) {
    await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE id=$1`, [id]);
    return false;
  }
  if (v.rows[0].status !== "active") return false;
  await db.query(`UPDATE receptionist_voucher SET status='redeemed', redeemed_at=now() WHERE id=$1`, [id]);
  return true;
}

export async function expireVouchers(db: Pool): Promise<number> {
  const r = await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE status='active' AND expires_at < now()`);
  return r.rowCount || 0;
}

export function balanceLine(settings: any, account: any): string {
  if (!settings.enabled) return "";
  const needed = Math.max(0, settings.points_for_voucher - account.balance);
  if (needed) return `You have ${account.balance} points - ${needed} more and you earn a R${settings.voucher_value_rand} voucher.`;
  return `You have ${account.balance} points - enough for a R${settings.voucher_value_rand} voucher whenever you're ready.`;
}

// ---------- quotes ----------
export async function quoteCreate(db: Pool, ws: string, customerName: string, contactId: string | null, title: string, amountRand: number, followUpOn: string): Promise<void> {
  await db.query(
    `INSERT INTO receptionist_quote(id,workspace_id,contact_id,customer_name,title,amount_cents,status,created_at,follow_up_on)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now(),$7)`,
    [crypto.randomUUID(), ws, contactId, customerName.slice(0, 200), title.slice(0, 200), Math.round(amountRand * 100), followUpOn || null]);
}

export async function quoteAction(db: Pool, env: any, ws: string, id: string, action: string): Promise<string> {
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
          await deliver(db, env, ws, c.rows[0],
            `Hi ${(c.rows[0].name || "").trim().split(" ")[0] || "there"}, ${wname.rows[0]?.name || "we"} here with your quote${quote.title ? ` for ${quote.title}` : ""}: R${(quote.amount_cents / 100).toFixed(2)}. Any questions, just reply here.`);
        } catch { /* quote status stands even when the WhatsApp send is held */ }
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

// ---------- campaigns ----------
export async function segmentContacts(db: Pool, ws: string, segment: string): Promise<any[]> {
  let q = `SELECT * FROM receptionist_contact WHERE workspace_id=$1 AND opted_out=false`;
  if (segment === "dormant") q += ` AND (last_visit_at IS NULL OR last_visit_at < now() - interval '30 days')`;
  else if (segment === "vip") q += ` AND is_vip=true`;
  return (await db.query(q + ` ORDER BY created_at`, [ws])).rows;
}

export async function campaignCreate(db: Pool, ws: string, name: string, segment: string, bodyA: string, bodyB: string): Promise<void> {
  if (!name.trim()) throw new Error("Give the campaign a name.");
  if (!["all", "dormant", "vip"].includes(segment)) throw new Error("Unknown segment.");
  if (!bodyA.trim()) throw new Error("Write the message first.");
  await db.query(
    `INSERT INTO receptionist_campaign(id,workspace_id,name,segment,body_a,body_b,status,created_at)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now())`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), segment, bodyA.trim(), bodyB.trim()]);
}

export async function campaignApprove(db: Pool, ws: string, id: string, when: string): Promise<void> {
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
      [crypto.randomUUID(), id, contacts[i].id, useB && i % 2 ? "b" : "a"]);
  }
  const whenTs = when ? new Date(when) : new Date();
  const sched = isNaN(whenTs.getTime()) ? new Date() : whenTs;
  await db.query(
    `UPDATE receptionist_campaign SET approved_at=now(), scheduled_at=$1, status=$2 WHERE id=$3`,
    [sched, sched > new Date() ? "scheduled" : "sending", id]);
}

export async function campaignCancel(db: Pool, ws: string, id: string): Promise<boolean> {
  return !!(await db.query(
    `UPDATE receptionist_campaign SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('draft','scheduled')`, [id, ws])).rowCount;
}

export async function runDueCampaigns(db: Pool, env: any): Promise<void> {
  const due = await db.query(
    `SELECT * FROM receptionist_campaign WHERE status IN ('scheduled','sending') AND (scheduled_at IS NULL OR scheduled_at <= now()) ORDER BY scheduled_at NULLS FIRST LIMIT 3`);
  for (const camp of due.rows) await sendCampaign(db, env, camp);
}

async function sendCampaign(db: Pool, env: any, camp: any): Promise<void> {
  const claim = await db.query(
    `UPDATE receptionist_campaign SET status='sending' WHERE id=$1 AND status IN ('scheduled','sending')`, [camp.id]);
  if (!claim.rowCount) return;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [camp.workspace_id]);
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`, [camp.workspace_id]);
  if (!ch.rows.length || Number(budget.rows[0].h) >= 20 || Number(budget.rows[0].d) >= 100) {
    await db.query(`UPDATE receptionist_campaign SET status='scheduled', scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
    return;
  }
  const pend = await db.query(
    `SELECT r.*, c.name, c.opted_out, c.zernio_conversation_id, c.wa_id
     FROM receptionist_campaignrecipient r JOIN receptionist_contact c ON c.id=r.contact_id
     WHERE r.campaign_id=$1 AND r.status='pending' ORDER BY c.created_at LIMIT 50`, [camp.id]);
  for (const r of pend.rows) {
    if (r.opted_out) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='opted out' WHERE id=$1`, [r.id]);
      continue;
    }
    if (!r.zernio_conversation_id) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='no active WhatsApp conversation' WHERE id=$1`, [r.id]);
      continue;
    }
    const first = ((r.name || "").trim().split(" ")[0]) || "there";
    const body = (r.variant === "b" ? camp.body_b : camp.body_a).replace("{first name}", first) + OPT_OUT_FOOTER;
    try {
      const contact = { id: r.contact_id, name: r.name, wa_id: r.wa_id, zernio_conversation_id: r.zernio_conversation_id };
      const msgId = await deliver(db, env, camp.workspace_id, contact, body);
      await db.query(`UPDATE receptionist_campaignrecipient SET status='sent', sent_at=now(), message_id=$1 WHERE id=$2`, [msgId, r.id]);
    } catch (e: any) {
      const msg = String(e?.message || e);
      const skip = msg.includes("no active WhatsApp conversation") || msg.includes("allowlisted");
      await db.query(`UPDATE receptionist_campaignrecipient SET status=$1, error=$2 WHERE id=$3`,
        [skip ? "skipped" : "failed", msg.slice(0, 300), r.id]);
    }
  }
  const left = await db.query(`SELECT 1 FROM receptionist_campaignrecipient WHERE campaign_id=$1 AND status='pending' LIMIT 1`, [camp.id]);
  await db.query(`UPDATE receptionist_campaign SET status=$1 WHERE id=$2`, [left.rows.length ? "scheduled" : "sent", camp.id]);
  if (left.rows.length) await db.query(`UPDATE receptionist_campaign SET scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
}

export async function attributeBookingToCampaign(db: Pool, ws: string, booking: any): Promise<void> {
  const r = await db.query(
    `SELECT r.id FROM receptionist_campaignrecipient r JOIN receptionist_campaign c ON c.id=r.campaign_id
     WHERE c.workspace_id=$1 AND r.contact_id=$2 AND r.status='sent' AND r.sent_at >= now() - interval '30 days' AND r.attributed_booking_id IS NULL
     ORDER BY r.sent_at DESC LIMIT 1`, [ws, booking.contact_id]);
  if (!r.rows[0]) return;
  await db.query(`UPDATE receptionist_campaignrecipient SET attributed_booking_id=$1, attributed_amount=$2 WHERE id=$3`,
    [booking.id, Number(booking.value) || 0, r.rows[0].id]);
}

export async function campaignStats(db: Pool, campaignId: string): Promise<any> {
  const r = await db.query(
    `SELECT variant,
            count(*) total,
            count(*) FILTER (WHERE status='sent') sent,
            count(*) FILTER (WHERE status='failed') failed,
            count(*) FILTER (WHERE status='skipped') skipped,
            count(*) FILTER (WHERE attributed_booking_id IS NOT NULL) bookings,
            COALESCE(sum(attributed_amount),0) revenue
     FROM receptionist_campaignrecipient WHERE campaign_id=$1 GROUP BY variant`, [campaignId]);
  const out: any = {};
  for (const row of r.rows) out[row.variant] = row;
  return out;
}
