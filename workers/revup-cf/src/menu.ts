// Restaurant core: menu management, public menu page, order capture, dish-sales
// logging and specials. Ported from the old Django stack (apps/menus) into the
// Worker so the live product has the restaurant core. Tables are shared with the
// old stack (menus_category/menus_item/menus_dishsale) plus menus_order(+item).

import type { Pool } from "pg";

export function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export const rands = (cents: number): string => "R" + (cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 });

// Menu section injected into the receptionist prompt so WhatsApp replies quote
// real dishes and real prices only (rejectInventedPrices backs this up).
export function menuBlock(items: { name: string; price: any; category?: string | null; is_special?: boolean }[]): string {
  if (!items.length) return "";
  const lines = items.map((i) => {
    const p = Number(i.price);
    return `- ${i.name} - R${isNaN(p) ? i.price : p.toFixed(2)}${i.is_special ? " (on special)" : ""}`;
  });
  return (
    "Menu (these are the ONLY dishes and prices this restaurant has - quote them exactly, never invent others):\n" +
    lines.join("\n") + "\n"
  );
}

export async function loadMenu(db: Pool, workspaceId: string) {
  const r = await db.query(
    `SELECT i.id, i.name, i.description, i.price, i.food_cost, i.is_available, i.is_special, i.position,
            i.category_id, c.name AS category_name, c.position AS cat_pos
     FROM menus_item i LEFT JOIN menus_category c ON c.id=i.category_id
     WHERE i.workspace_id=$1 ORDER BY c.position NULLS LAST, c.name NULLS LAST, i.position, i.name LIMIT 200`, [workspaceId]);
  return r.rows;
}

// ---------- owner screens ----------

export async function menuManagePage(db: Pool, mem: any, base: string, msg = ""): Promise<string> {
  const items = await loadMenu(db, mem.workspace_id);
  const cats = await db.query(`SELECT id, name, position FROM menus_category WHERE workspace_id=$1 ORDER BY position, name`, [mem.workspace_id]);
  const sales = await db.query(
    `SELECT s.sold_on, s.quantity, i.name FROM menus_dishsale s JOIN menus_item i ON i.id=s.item_id
     WHERE s.workspace_id=$1 ORDER BY s.sold_on DESC LIMIT 15`, [mem.workspace_id]);
  const catOpts = ['<option value="">(no section)</option>', ...cats.rows.map((c: any) => `<option value="${c.id}">${esc(c.name)}</option>`)].join("");
  const itemOpts = items.map((i: any) => `<option value="${i.id}">${esc(i.name)}</option>`).join("");
  const itemRows = items.map((i: any) => `<tr>
<td><b>${esc(i.name)}</b>${i.is_special ? ' <span class="pill pill-live">special</span>' : ""}${i.description ? `<br><span class="mut">${esc(i.description)}</span>` : ""}</td>
<td class="mut">${esc(i.category_name || "-")}</td>
<td>R${Number(i.price).toFixed(2)}</td>
<td>${i.is_available ? '<span class="ok">on the menu</span>' : '<span class="mut">hidden</span>'}</td>
<td><form class="inline" method="post" action="/menu/items/${i.id}/toggle"><button class="link">${i.is_available ? "Hide" : "Show"}</button></form>
<form class="inline" method="post" action="/menu/items/${i.id}/special"><button class="link">${i.is_special ? "Off special" : "On special"}</button></form></td></tr>`).join("");
  const salesRows = sales.rows.map((s: any) => `<tr><td>${esc(s.name)}</td><td>${s.quantity}</td><td class="mut">${new Date(s.sold_on).toLocaleDateString("en-ZA")}</td></tr>`).join("");
  return `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<p class="mut">Your public menu: <a href="/m/${mem.workspace_id}" target="_blank" rel="noopener">/m/${String(mem.workspace_id).slice(0, 8)}…</a> - share it anywhere. Customers can order straight from it; orders land on the <a href="/orders">Orders</a> screen. Your WhatsApp employee answers menu questions with exactly these dishes and prices.</p>
<div class="card"><h2 style="margin-top:0">Add a dish</h2>
<form method="post" action="/menu/items">
<label>Dish<input name="name" required maxlength="120" placeholder="Chicken kota"></label>
<label>Section<select name="category_id">${catOpts}</select></label>
<label>Description<input name="description" maxlength="300" placeholder="Chips, Russian, cheese, atchar"></label>
<label>Price (R)<input name="price" type="number" min="0" step="0.01" required style="width:140px"></label>
<label>Cost to make (R, optional)<input name="food_cost" type="number" min="0" step="0.01" style="width:140px"></label>
<label><input type="checkbox" name="is_special" value="1" style="width:auto"> On special this week</label>
<button>Add dish</button></form></div>
<div class="card"><h2 style="margin-top:0">Add a section</h2>
<form method="post" action="/menu/categories" class="inline-form">
<input name="name" required maxlength="80" placeholder="Mains, Braai, Drinks…" style="max-width:280px"> <button>Add section</button></form></div>
<div class="card"><h2 style="margin-top:0">Your menu (${items.length})</h2>
${items.length ? `<table><tr><th>Dish</th><th>Section</th><th>Price</th><th>Status</th><th></th></tr>${itemRows}</table>` : `<p class="mut">No dishes yet. Add your first one above - it shows on your public menu and your WhatsApp employee can quote it within minutes.</p>`}</div>
<div class="card"><h2 style="margin-top:0">Log today's sales</h2>
${items.length ? `<form method="post" action="/menu/sales">
<label>Dish<select name="item_id">${itemOpts}</select></label>
<label>Plates sold<input name="quantity" type="number" min="0" max="10000" required style="width:120px"></label>
<label>Day<input name="sold_on" type="date" required></label>
<button>Log sales</button>
<p class="mut">Sales feed the competitor price-gap alerts on the <a href="/competitors">Competitors</a> screen.</p></form>` : `<p class="mut">Add dishes first, then log what sold.</p>`}
${salesRows ? `<table><tr><th>Dish</th><th>Plates</th><th>Day</th></tr>${salesRows}</table>` : ""}</div>`;
}

export async function ordersPage(db: Pool, mem: any, msg = ""): Promise<string> {
  const r = await db.query(
    `SELECT * FROM menus_order WHERE workspace_id=$1
     ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'ready' THEN 2 WHEN 'done' THEN 3 ELSE 4 END, created_at DESC LIMIT 50`, [mem.workspace_id]);
  const withItems = [];
  for (const o of r.rows) {
    const its = await db.query(`SELECT name, quantity, price_cents FROM menus_orderitem WHERE order_id=$1 ORDER BY name`, [o.id]);
    withItems.push({ ...o, items: its.rows });
  }
  const rows = withItems.map((o: any) => `<tr>
<td><b>${esc(o.customer_name)}</b><br><span class="mut">${esc(o.customer_contact)}</span></td>
<td>${o.items.map((i: any) => `${i.quantity}× ${esc(i.name)}`).join("<br>")}${o.notes ? `<br><span class="mut">${esc(o.notes)}</span>` : ""}</td>
<td>${rands(o.total_cents)}</td>
<td>${o.status === "new" ? "<b>new</b>" : o.status === "confirmed" ? '<span class="ok">confirmed</span>' : o.status === "ready" ? '<span class="pill pill-live">ready</span>' : o.status === "done" ? "done" : '<span class="mut">cancelled</span>'}<br><span class="mut">${new Date(o.created_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</span></td>
<td>${o.status === "new" ? `<form class="inline" method="post" action="/orders/${o.id}/confirm"><button>Confirm</button></form>` : ""}
${o.status === "confirmed" ? `<form class="inline" method="post" action="/orders/${o.id}/ready"><button>Mark ready</button></form>` : ""}
${o.status === "ready" ? `<form class="inline" method="post" action="/orders/${o.id}/done"><button>Handed over</button></form>` : ""}
${["new", "confirmed"].includes(o.status) ? `<form class="inline" method="post" action="/orders/${o.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`).join("");
  return `
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<p class="mut">Orders placed on your <a href="/m/${mem.workspace_id}" target="_blank" rel="noopener">public menu</a> land here. Confirm the order, mark it ready, then handed over.</p>
<div class="card">${withItems.length ? `<table><tr><th>Customer</th><th>Order</th><th>Total</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No orders yet. Share your public menu link - orders placed there show up here.</p>`}</div>`;
}

// ---------- public menu page (no login) ----------

export function publicMenuHtml(bizName: string, items: any[], workspaceId: string, sent: boolean, err: string): string {
  const specials = items.filter((i) => i.is_special);
  const byCat = new Map<string, any[]>();
  for (const i of items) {
    const k = i.category_name || "Menu";
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(i);
  }
  const catSections = [...byCat.entries()].map(([cat, rows]) => `
<section class="cat"><h2>${esc(cat)}</h2>
${rows.map((i) => `<div class="dish"><div class="dish-head">
<label class="dish-name"><input type="checkbox" name="item_${i.id}" value="1"> ${esc(i.name)}${i.is_special ? ' <span class="badge">special</span>' : ""}</label>
<span class="price">R${Number(i.price).toFixed(2)}</span></div>
${i.description ? `<p class="desc">${esc(i.description)}</p>` : ""}
<input class="qty" type="number" name="qty_${i.id}" min="1" max="20" value="1" aria-label="How many ${esc(i.name)}"></div>`).join("")}
</section>`).join("");
  const orderForm = items.length && !sent ? `
<form class="order" method="post" action="/m/${workspaceId}/order">
<h2>Place your order</h2>
${catSections}
<label>Your name<input name="name" required maxlength="120"></label>
<label>Your WhatsApp number<input name="contact" required maxlength="32" placeholder="072 000 0000"></label>
<label>Anything else? (optional)<input name="notes" maxlength="500" placeholder="No chillies, collect at 18:00…"></label>
<button type="submit">Send order</button>
<p class="fine">The restaurant confirms your order and the price on WhatsApp before anything is made.</p>
</form>` : "";
  const specialBanner = specials.length ? `<div class="specials"><h2>This week's specials</h2>${specials.map((i) => `<span class="badge">${esc(i.name)} - R${Number(i.price).toFixed(2)}</span>`).join(" ")}</div>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(bizName)} - Menu</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;margin:0;background:#FAFAF9;color:#1C1917;line-height:1.5}
main{max-width:560px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:24px 0 10px}
.sub{color:#78716C;margin:0 0 8px}
.dish{padding:12px 0;border-bottom:1px solid #E7E5E4}
.dish-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.dish-name{font-weight:600;cursor:pointer}.dish-name input{margin-right:8px}
.price{font-weight:600;white-space:nowrap}
.desc{margin:4px 0 0 24px;color:#78716C;font-size:14px}
.qty{width:56px;margin:6px 0 0 24px;padding:4px 6px;border:1px solid #D6D3D1;border-radius:8px}
.badge{display:inline-block;background:#FFF7ED;color:#C2410C;border:1px solid #FDBA74;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
.specials{margin:16px 0;padding:12px 14px;background:#FFF7ED;border:1px solid #FDBA74;border-radius:12px}
.specials h2{margin:0 0 8px}
.order label{display:block;margin:14px 0 4px;font-weight:600}
.order input[name=name],.order input[name=contact],.order input[name=notes]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #D6D3D1;border-radius:10px;font-size:16px}
button{margin-top:18px;width:100%;padding:14px;border:0;border-radius:12px;background:#EA580C;color:#fff;font-size:17px;font-weight:700;cursor:pointer}
.fine{color:#78716C;font-size:13px;margin-top:10px}
.sent{padding:28px 18px;background:#ECFDF5;border:1px solid #6EE7B7;border-radius:12px;margin-top:24px}
.err{padding:12px 14px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;margin-top:16px}
.foot{margin-top:36px;color:#A8A29E;font-size:12px;text-align:center}
</style></head><body><main>
<h1>${esc(bizName)}</h1>
<p class="sub">Menu &amp; ordering</p>
${err ? `<p class="err">${esc(err)}</p>` : ""}
${sent ? `<div class="sent"><h2 style="margin-top:0">Order sent</h2><p>Thanks - the restaurant has your order and will confirm it on WhatsApp shortly.</p></div>` : ""}
${specialBanner}
${items.length ? orderForm : `<p class="sub">The menu is being updated - please check back soon.</p>`}
<p class="foot">Powered by RevUp</p>
</main></body></html>`;
}

export async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createOrder(db: Pool, workspaceId: string, f: Record<string, string>, ip: string): Promise<{ ok: boolean; err: string; totalCents: number }> {
  const name = (f.name || "").trim().slice(0, 120);
  const contact = (f.contact || "").trim().slice(0, 32);
  const notes = (f.notes || "").trim().slice(0, 500);
  if (!name || !contact) return { ok: false, err: "Please add your name and WhatsApp number.", totalCents: 0 };
  const items = await loadMenu(db, workspaceId);
  const chosen = items.filter((i: any) => i.is_available && f[`item_${i.id}`] === "1")
    .map((i: any) => ({ ...i, qty: Math.max(1, Math.min(20, parseInt(f[`qty_${i.id}`] || "1", 10) || 1)) }));
  if (!chosen.length) return { ok: false, err: "Pick at least one dish for your order.", totalCents: 0 };
  const totalCents = chosen.reduce((t: number, i: any) => t + Math.round(Number(i.price) * 100) * i.qty, 0);
  const day = new Date().toISOString().slice(0, 10);
  const key = (await sha256hex(workspaceId + contact + day + chosen.map((i: any) => `${i.id}x${i.qty}`).sort().join(","))).slice(0, 40);
  const orderId = crypto.randomUUID();
  const ins = await db.query(
    `INSERT INTO menus_order(id,workspace_id,customer_name,customer_contact,notes,status,total_cents,request_key,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,'new',$6,$7,now(),now()) ON CONFLICT (workspace_id,request_key) WHERE request_key<>'' DO NOTHING RETURNING id`,
    [orderId, workspaceId, name, contact, notes, totalCents, key]).catch(() => ({ rows: [] as any[] }));
  const oid = ins.rows[0]?.id;
  if (!oid) return { ok: true, err: "", totalCents }; // same order re-submitted: treat as sent
  for (const i of chosen) {
    await db.query(
      `INSERT INTO menus_orderitem(id,order_id,item_id,name,price_cents,quantity) VALUES($1,$2,$3,$4,$5,$6)`,
      [crypto.randomUUID(), oid, i.id, String(i.name).slice(0, 120), Math.round(Number(i.price) * 100), i.qty]);
  }
  return { ok: true, err: "", totalCents };
}
