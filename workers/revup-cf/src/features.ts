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
  const own=await db.query(`SELECT 1 FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`,[contactId,ws]);
  if(!own.rows[0])throw new Error("Customer not found in this business.");
  const s=await loyaltySettings(db,ws);
  const account=kind==='loyalty'?await loyaltyAccount(db,ws,contactId):null;
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    if(account){
      const locked=(await client.query(`SELECT balance FROM receptionist_loyaltyaccount WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[account.id,ws])).rows[0];
      if(!locked||locked.balance<s.points_for_voucher)throw new Error(`${locked?.balance||0} points - ${s.points_for_voucher} needed for a voucher.`);
      await loyaltyApply(client as any,account.id,'redeem',-s.points_for_voucher,'Reward voucher issued');
    }
    const code=crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();
    const id=crypto.randomUUID();
    const result=await client.query(`INSERT INTO receptionist_voucher(id,workspace_id,contact_id,kind,code,amount_rand,status,note,expires_at,created_at)
      VALUES($1,$2,$3,$4,$5,$6,'active',$7,now()+($8||' days')::interval,now()) RETURNING *`,[id,ws,contactId,kind,code,s.voucher_value_rand,note.slice(0,200),String(s.voucher_valid_days)]);
    await client.query('COMMIT');return result.rows[0];
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}

}

export async function redeemVoucher(db: Pool, ws: string, id: string): Promise<boolean> {
  // One conditional write is the redemption claim. A stale reader must not
  // report success after another request has already spent this voucher.
  const won=await db.query(`UPDATE receptionist_voucher SET status='redeemed',redeemed_at=now()
    WHERE id=$1 AND workspace_id=$2 AND status='active' AND expires_at>=now() RETURNING id`,[id,ws]);
  if(won.rows[0])return true;
  await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE id=$1 AND workspace_id=$2 AND status='active' AND expires_at<now()`,[id,ws]);
  return false;
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
  if(contactId){const own=await db.query(`SELECT 1 FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`,[contactId,ws]);if(!own.rows[0])throw new Error("Customer not found in this business.");}
  if(!Number.isFinite(amountRand)||amountRand<0||amountRand>10000000)throw new Error("Enter a valid quote amount.");
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
      const c = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [quote.contact_id,ws]);
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
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const c = await client.query(`SELECT * FROM receptionist_campaign WHERE id=$1 AND workspace_id=$2 FOR UPDATE`, [id, ws]);
    const camp = c.rows[0];
    if (!camp || camp.status !== "draft") throw new Error("Only a draft can be approved.");
    const contacts = await segmentContacts(client as any, ws, camp.segment);
    if (!contacts.length) throw new Error("No customers in this segment yet.");
    const useB = !!camp.body_b;
    for (let i = 0; i < contacts.length; i++) {
      await client.query(
        `INSERT INTO receptionist_campaignrecipient(id,campaign_id,contact_id,variant,status,error,attributed_amount)
         VALUES($1,$2,$3,$4,'pending','',0) ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
        [crypto.randomUUID(), id, contacts[i].id, useB && i % 2 ? "b" : "a"]);
    }
    const whenTs = when ? new Date(when) : new Date();
    const sched = isNaN(whenTs.getTime()) ? new Date() : whenTs;
    await client.query(
      `UPDATE receptionist_campaign SET approved_at=now(), scheduled_at=$1, status=$2 WHERE id=$3`,
      [sched, sched > new Date() ? "scheduled" : "sending", id]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
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
  // Pin one connection so a workspace has one sender, across overlapping cron
  // runs and distinct campaigns. Independent writes persist if a later send fails.
  const client=await db.connect();let locked=false;let discard=false;
  const key='campaign-send:'+camp.workspace_id;
  try{
    locked=!!(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',[key])).rows[0]?.locked;
    if(!locked)return;
    await sendClaimedCampaign(client as unknown as Pool,env,camp);
  }finally{
    if(locked){try{await client.query('SELECT pg_advisory_unlock(hashtext($1))',[key])}catch{discard=true}}
    client.release(discard);
  }
}

async function sendClaimedCampaign(db: Pool, env: any, camp: any): Promise<void> {
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
    const won=await db.query(`UPDATE receptionist_campaignrecipient SET status='sending'
      WHERE id=$1 AND campaign_id=$2 AND status='pending' RETURNING id`,[r.id,camp.id]);
    if(!won.rows[0])continue;
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

// ---------- competitors + market opportunities ----------
const PRICE_GAP_RAND = 10;
const DRAFT_BODIES: Record<string, string> = {
  price_gap: "Hi {first name}, this week only: come in for your favourite and mention this message - we will make it worth your while. Book on WhatsApp.",
  price_advantage: "Hi {first name}, did you know our best dish also beats the neighbours on price? Come taste it this week - book on WhatsApp.",
  rating_gap: "Hi {first name}, thank you for rating us the area's favourite! Bring a friend this week and show them why - book on WhatsApp.",
  promo: "Hi {first name}, we would rather spoil YOU than watch you try the neighbour's special. This week, your usual comes with something extra - book on WhatsApp.",
  demand: "Hi {first name}, weekends are filling up fast. Book a midweek table this week and skip the wait entirely - reply here and we will sort it.",
};

export async function competitorAdd(db: Pool, ws: string, name: string, area: string, website: string, rating: string, notes: string): Promise<void> {
  if (!name.trim()) throw new Error("Give the competitor a name.");
  const r = rating ? Number(rating) : null;
  if (r !== null && (isNaN(r) || r < 0 || r > 5)) throw new Error("Rating is 0 to 5.");
  await db.query(
    `INSERT INTO receptionist_competitor(id,workspace_id,name,area,website,rating,notes,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (workspace_id, name) DO UPDATE SET area=$4, website=$5, rating=$6, notes=$7`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), area.trim().slice(0, 120), website.trim().slice(0, 200), r, notes.trim()]);
}

export async function dishAdd(db: Pool, ws: string, competitorId: string, name: string, price: number, ownItemId: string): Promise<void> {
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
    [crypto.randomUUID(), competitorId, name.trim().slice(0, 120), price, ownId]);
}

export async function promoAdd(db: Pool, ws: string, competitorId: string, text: string, validUntil: string): Promise<void> {
  const own = await db.query(`SELECT 1 FROM receptionist_competitor WHERE id=$1 AND workspace_id=$2`, [competitorId, ws]);
  if (!own.rows.length) throw new Error("Competitor not found.");
  if (!text.trim()) throw new Error("Say what the promotion is.");
  await db.query(
    `INSERT INTO receptionist_competitorpromo(id,competitor_id,text,valid_until,created_at) VALUES($1,$2,$3,$4,now())`,
    [crypto.randomUUID(), competitorId, text.trim().slice(0, 200), /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null]);
}

async function oppUpsert(db: Pool, ws: string, key: string, kind: string, title: string, detail: string, competitorId: string | null, confidence: number, impact: number | null, evidence: string[]): Promise<void> {
  await db.query(
    `INSERT INTO receptionist_marketopportunity(id,workspace_id,competitor_id,kind,title,detail,status,dedupe_key,confidence,impact_rand,evidence,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,'new',$7,$8,$9,$10::jsonb,now(),now())
     ON CONFLICT (workspace_id, dedupe_key) DO UPDATE SET kind=$4, title=$5, detail=$6, competitor_id=$3, confidence=$8, impact_rand=$9, evidence=$10::jsonb, updated_at=now()`,
    [crypto.randomUUID(), ws, competitorId, kind, title.slice(0, 160), detail, key.slice(0, 120), confidence, impact, JSON.stringify(evidence)]);
}

export async function refreshOpportunities(db: Pool, ws: string): Promise<void> {
  const bp = await db.query(`SELECT google_rating FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [ws]);
  const ownRating = bp.rows[0]?.google_rating !== null && bp.rows[0]?.google_rating !== undefined ? Number(bp.rows[0].google_rating) : null;
  const seen: string[] = [];
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [ws]);
  for (const comp of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`, [comp.id]);
    for (const dish of dishes.rows) {
      if (!dish.own_item_id || dish.own_price === null) continue;
      const gap = Number(dish.own_price) - Number(dish.price);
      const u = await db.query(
        `SELECT COALESCE(sum(quantity),0) q FROM menus_dishsale WHERE workspace_id=$1 AND item_id=$2 AND sold_on >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 30`, [ws, dish.own_item_id]);
      const units = Number(u.rows[0].q) || 0;
      const impact = units ? Math.abs(gap) * units : null;
      if (gap > PRICE_GAP_RAND) {
        const key = `price_gap:${dish.id}`;
        seen.push(key);
        await oppUpsert(db, ws, key, "price_gap",
          `${comp.name} undercuts your ${dish.own_name}`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${gap.toFixed(2)} more. Match it, beat it on portion or quality, or let the dish compete on something else.`,
          comp.id, 90, impact,
          [`Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
           `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`,
           units ? `Your sales: ${units} sold in the last 30 days` : "No sales logged yet, so no rand impact estimate"]);
      } else if (gap < -PRICE_GAP_RAND) {
        const key = `price_advantage:${dish.id}`;
        seen.push(key);
        await oppUpsert(db, ws, key, "price_advantage",
          `Your ${dish.own_name} beats ${comp.name} on price`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${(-gap).toFixed(2)} less. Worth saying out loud: feature it on the public menu and in campaigns.`,
          comp.id, 80, impact,
          [`Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
           `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`]);
      }
    }
    if (comp.rating !== null && ownRating !== null && ownRating > Number(comp.rating)) {
      const key = `rating:${comp.id}`;
      seen.push(key);
      await oppUpsert(db, ws, key, "rating_gap",
        `You outrate ${comp.name}`,
        `Google: you ${ownRating}, them ${comp.rating}. Ask happy customers for reviews while the gap is in your favour.`,
        comp.id, 70, null,
        [`Your Google rating: ${ownRating} (Competitors screen)`, `Their Google rating: ${comp.rating} (Competitors screen)`]);
    }
    const promo = await db.query(
      `SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 AND created_at >= now() - interval '7 days' ORDER BY created_at DESC LIMIT 1`, [comp.id]);
    if (promo.rows[0]) {
      const p = promo.rows[0];
      const key = `promo:${p.id}`;
      seen.push(key);
      await oppUpsert(db, ws, key, "promo",
        `${comp.name} is running a promotion`,
        `Spotted: "${p.text}". Answer with your own campaign to regulars before they drift - the Campaigns screen drafts it in minutes.`,
        comp.id, 60, null, [`Promotion logged: "${p.text}" (Competitors screen)`]);
    }
  }
  const wl = await db.query(
    `SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND created_at >= now() - interval '7 days'`, [ws]);
  const recent = Number(wl.rows[0].c);
  if (recent >= 5) {
    const key = "demand:waitlist";
    seen.push(key);
    const avg = await db.query(
      `SELECT avg(value) v FROM (SELECT value FROM receptionist_booking WHERE workspace_id=$1 AND status='done' AND value IS NOT NULL LIMIT 50) t`, [ws]);
    const avgValue = avg.rows[0].v !== null ? Number(avg.rows[0].v) : null;
    await oppUpsert(db, ws, key, "demand",
      "Demand is outgrowing your tables",
      `${recent} parties joined the waitlist in the last 7 days. Consider longer hours on the busy nights or an off-peak campaign to spread the load.`,
      null, 65, avgValue ? avgValue * recent : null,
      [`${recent} waitlist entries in the last 7 days (Waitlist screen)`,
       avgValue ? `Average booking value: R${avgValue.toFixed(2)}` : "No booking values captured yet"]);
  }
  if (seen.length) {
    await db.query(
      `DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND NOT (dedupe_key = ANY($2))`, [ws, seen]);
  } else {
    await db.query(`DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new'`, [ws]);
  }
}

export async function opportunityAction(db: Pool, ws: string, id: string, action: string): Promise<boolean> {
  if (!["acted", "dismissed"].includes(action)) return false;
  return !!(await db.query(
    `UPDATE receptionist_marketopportunity SET status=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3 AND status='new'`, [action, id, ws])).rowCount;
}

export async function opportunityDraftCampaign(db: Pool, ws: string, id: string): Promise<void> {
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
    [campId, ws, `Revenue: ${opp.title}`.slice(0, 120), segment, body]);
  await db.query(
    `UPDATE receptionist_marketopportunity SET campaign_id=$1, status='acted', updated_at=now() WHERE id=$2`, [campId, id]);
}

// ---------- owner support assistant ----------
export async function supportAnswer(db: Pool, ws: string, question: string): Promise<{ text: string; confidence: number; sources: string[]; escalate: boolean }> {
  const q = question.toLowerCase();
  if (["booking", "table", "reservation", "tonight", "today"].some((w) => q.includes(w))) {
    const today = await db.query(
      `SELECT status, count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date
       GROUP BY status`, [ws]);
    const week = await db.query(
      `SELECT count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 7`, [ws]);
    const confirmed = Number(today.rows.find((r: any) => r.status === "confirmed")?.c || 0);
    const done = Number(today.rows.find((r: any) => r.status === "done")?.c || 0);
    const wk = Number(week.rows[0].c);
    if (!today.rows.length && !wk)
      return { text: "You have no bookings logged yet. Once bookings come in I can answer questions about them.", confidence: 40, sources: ["0 bookings in the last 7 days"], escalate: false };
    return {
      text: `Today: ${confirmed} confirmed booking${confirmed === 1 ? "" : "s"}${done ? `, ${done} already done` : ""}. This week so far: ${wk} bookings. Open the Bookings screen for the full board.`,
      confidence: 95, sources: [`${confirmed} confirmed bookings today`, `${wk} bookings in the last 7 days`], escalate: false };
  }
  if (["waitlist", "waiting", "queue"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND status='waiting'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: n ? `${n} partie${n === 1 ? " is" : "s are"} on the waitlist right now. Manage them on the Waitlist screen.` : "The waitlist is empty right now.",
      confidence: 95, sources: [`${n} waiting on the waitlist`], escalate: false };
  }
  if (["complaint", "unhappy", "angry", "review", "reputation"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_complaint WHERE workspace_id=$1 AND status='open'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: `You have ${n} open complaint${n === 1 ? "" : "s"}.` + (n ? " Answer them from the Inbox - quick replies protect your rating." : " Nothing needs attention."),
      confidence: 95, sources: [`${n} open complaints`], escalate: false };
  }
  if (["campaign", "revenue", "sales", "money", "attribut", "marketing"].some((w) => q.includes(w))) {
    const running = await db.query(`SELECT count(*) c FROM receptionist_campaign WHERE workspace_id=$1 AND status IN ('scheduled','sending')`, [ws]);
    const attr = await db.query(
      `SELECT count(*) c, COALESCE(sum(r.attributed_amount),0) t
       FROM receptionist_campaignrecipient r
       JOIN receptionist_campaign c ON c.id=r.campaign_id
       JOIN receptionist_booking b ON b.id=r.attributed_booking_id
       WHERE c.workspace_id=$1 AND b.created_at >= date_trunc('month', now())`, [ws]);
    const total = Number(attr.rows[0].t), n = Number(attr.rows[0].c), run = Number(running.rows[0].c);
    return {
      text: `This month your campaigns are linked to R${total.toLocaleString("en-ZA")} across ${n} attributed booking${n === 1 ? "" : "s"}. ${run} campaign${run === 1 ? " is" : "s are"} running. The Campaigns screen has the full picture.`,
      confidence: 90, sources: [`R${total} attributed this month`, `${n} attributed bookings`], escalate: false };
  }
  if (["competitor", "rival", "opportunit", "market"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT title FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' ORDER BY confidence DESC`, [ws]);
    if (r.rows.length)
      return {
        text: `${r.rows.length} open opportunit${r.rows.length === 1 ? "y" : "ies"}. Top one: ${r.rows[0].title}. See them all on the Competitors screen.`,
        confidence: 90, sources: [`${r.rows.length} open opportunities`], escalate: false };
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
    confidence: 20, sources: [], escalate: true };
}

export async function supportHandle(db: Pool, ws: string, question: string): Promise<void> {
  await db.query(`INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,sources,escalated,created_at) VALUES($1,$2,'owner',$3,'[]'::jsonb,false,now())`,
    [crypto.randomUUID(), ws, question]);
  const a = await supportAnswer(db, ws, question);
  await db.query(
    `INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,confidence,sources,escalated,created_at) VALUES($1,$2,'assistant',$3,$4,$5::jsonb,$6,now())`,
    [crypto.randomUUID(), ws, a.text, a.confidence, JSON.stringify(a.sources), a.escalate]);
}

// ---------- revenue employee ----------
export async function autoDraftOpportunities(db: Pool): Promise<number> {
  const wss = await db.query(`SELECT workspace_id FROM receptionist_businessprofile WHERE revenue_mode='draft' AND is_active`);
  let made = 0;
  for (const w of wss.rows) {
    const opps = await db.query(
      `SELECT id FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND campaign_id IS NULL AND confidence >= 75`, [w.workspace_id]);
    for (const o of opps.rows) {
      try { await opportunityDraftCampaign(db, w.workspace_id, o.id); made++; } catch { /* one bad draft never stops the rest */ }
    }
  }
  return made;
}
