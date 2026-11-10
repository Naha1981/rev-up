// Owner Assistant (Business Pro): the business owner chats with their own
// assistant on the business's existing WhatsApp line. Ported from the
// standalone own-assistant v1 into RevUp as a per-business feature:
// every table is scoped by workspace_id, WhatsApp goes through the existing
// Messaging-partner channel path, AI goes through the existing free chain (Groq primary,
// OpenRouter free backup only behind the approved data-use consent), and the
// daily AI-attempt cap is the shared cf_ai_usage table. No new services.
//
// The memory-first loop: nothing is answered before stored rules and matching
// memories are read. Research and drafts are free; anything that sends,
// spends or deploys parks on the owner's Go + Sure approval.
import { freeAiGenerate, rejectInventedPrices } from "./freeai";
import type { Pool } from "pg";

// ---------- schema (lazy, mirrors the cf_ai_usage pattern) ----------
let tablesReady = false;
export async function ensureAssistantTables(db: Pool): Promise<void> {
  if (tablesReady) return;
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_setting(
    workspace_id uuid PRIMARY KEY,
    owner_phone text NOT NULL DEFAULT '',
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_memory(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    kind text NOT NULL,
    text text NOT NULL,
    source_message_id text,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE INDEX IF NOT EXISTS assistant_memory_ws_kind_idx ON assistant_memory(workspace_id, kind)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_approval(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    action text NOT NULL,
    detail text,
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_task(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    kind text NOT NULL,
    detail text,
    status text NOT NULL DEFAULT 'running',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_vault_secret(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    ciphertext text NOT NULL,
    iv text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, name))`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_vault_link(
    token text PRIMARY KEY,
    workspace_id uuid NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now())`);
  tablesReady = true;
}

// ---------- intent detection (ported from v1 agent.ts) ----------
export const isRuleCapture = (t: string) => /^(new rule|rule)\s*[:\-]/i.test(t.trim()) || /\b(remember this|never forget|from now on)\b/i.test(t);
export const isMemoryQuery = (t: string) => /\bwhat do you (remember|know)\b/i.test(t);
export const isTasksQuery = (t: string) => /\b(what are you (running|doing)|running tasks|task log|show tasks)\b/i.test(t);
export const isVaultRequest = (t: string) => /\b(save|store|add)\b.*\b(secret|password|api key|token)\b|\bvault\b/i.test(t);
export const isApprovalReply = (t: string) => /^(go|sure|go sure|go\s*\+\s*sure|yes go)[.! ]*$/i.test(t.trim());
export const isActionIntent = (t: string) => /\b(send|email|message|pay|buy|book|deploy|publish|post|schedule)\b/i.test(t) && !isApprovalReply(t) && !isMemoryQuery(t) && !isTasksQuery(t);

const CORE_RULES = [
  "Never invent facts. If memory is empty on something, say so plainly.",
  "Never print a vault secret or any stored credential, in any form.",
  "Research and drafts need no approval. Anything that sends, spends or deploys waits for the owner's Go + Sure.",
  "Short plain answers. The owner reads on a phone.",
  "If the owner said it once, remember it. Never make them repeat themselves.",
];

// ---------- per-business memory ----------
export type MemoryKind = "rule" | "decision" | "person" | "project" | "preference" | "fact";
export interface MemoryRow { id: number; kind: string; text: string; created_at: string }

export async function loadRules(db: Pool, ws: string): Promise<string[]> {
  const r = await db.query(`SELECT text FROM assistant_memory WHERE workspace_id=$1 AND kind='rule' ORDER BY id ASC`, [ws]);
  return r.rows.map((x: any) => x.text);
}

const STOP = new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "it", "my", "me", "i", "you", "your", "what", "do", "does", "about", "this", "that", "with", "are", "was", "be", "how", "who", "when", "where", "can", "could", "please"]);

export function keywords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).slice(0, 8);
}

// Keyword-overlap recall: v1 memory search, scoped to this business.
export async function recall(db: Pool, ws: string, question: string, limit = 10): Promise<MemoryRow[]> {
  const words = keywords(question);
  if (!words.length) return [];
  const likes = words.map((w) => `%${w}%`);
  const r = await db.query(
    `SELECT id, kind, text, created_at FROM assistant_memory WHERE workspace_id=$1 AND (${words.map((_, i) => `text ILIKE $${i + 2}`).join(" OR ")}) ORDER BY created_at DESC LIMIT ${limit}`,
    [ws, ...likes]);
  return r.rows;
}

export async function remember(db: Pool, ws: string, kind: MemoryKind, text: string, sourceMessageId?: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const existing = await db.query(`SELECT id FROM assistant_memory WHERE workspace_id=$1 AND kind=$2 AND text=$3 LIMIT 1`, [ws, kind, clean]);
  if (existing.rows.length) return; // said once, kept once
  await db.query(`INSERT INTO assistant_memory(workspace_id, kind, text, source_message_id) VALUES($1,$2,$3,$4)`, [ws, kind, clean, sourceMessageId ?? null]);
}

// ---------- tasks log ----------
export async function startTask(db: Pool, ws: string, kind: string, detail: string): Promise<number> {
  const r = await db.query(`INSERT INTO assistant_task(workspace_id, kind, detail) VALUES($1,$2,$3) RETURNING id`, [ws, kind, detail]);
  return r.rows[0].id as number;
}
export async function finishTask(db: Pool, id: number, status: "done" | "failed", detail?: string): Promise<void> {
  if (detail) await db.query(`UPDATE assistant_task SET status=$2, detail=detail || ' | ' || $3::text, finished_at=now() WHERE id=$1`, [id, status, detail]);
  else await db.query(`UPDATE assistant_task SET status=$2, finished_at=now() WHERE id=$1`, [id, status]);
}
export interface TaskRow { id: number; kind: string; detail: string; status: string; started_at: string }
export async function runningTasks(db: Pool, ws: string, excludeId?: number): Promise<TaskRow[]> {
  const r = await db.query(
    `SELECT id, kind, detail, status, started_at FROM assistant_task WHERE workspace_id=$1 AND status='running' AND ($2::bigint IS NULL OR id <> $2) ORDER BY started_at DESC LIMIT 10`,
    [ws, excludeId ?? null]);
  return r.rows;
}
const sast = (d: any) => new Date(d).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ---------- vault (write-only; AES-256-GCM; no route or reply ever returns a secret) ----------
async function masterKey(env: { VAULT_MASTER_KEY?: string }): Promise<CryptoKey> {
  if (!env.VAULT_MASTER_KEY) throw new Error("VAULT_MASTER_KEY missing");
  const raw = Uint8Array.from(atob(env.VAULT_MASTER_KEY), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealSecret(env: { VAULT_MASTER_KEY?: string }, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await masterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: btoa(String.fromCharCode(...new Uint8Array(buf))), iv: btoa(String.fromCharCode(...iv)) };
}
// Internal use only: decrypt to USE server-side. Deliberately no route or chat path calls this for display.
export async function openSecret(env: { VAULT_MASTER_KEY?: string }, ciphertext: string, iv: string): Promise<string> {
  const key = await masterKey(env);
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)) },
    key,
    Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0)));
  return new TextDecoder().decode(buf);
}
export async function storeSecret(db: Pool, env: { VAULT_MASTER_KEY?: string }, ws: string, name: string, plaintext: string): Promise<void> {
  const { ciphertext, iv } = await sealSecret(env, plaintext);
  await db.query(
    `INSERT INTO assistant_vault_secret(workspace_id, name, ciphertext, iv) VALUES($1,$2,$3,$4)
     ON CONFLICT (workspace_id, name) DO UPDATE SET ciphertext=$3, iv=$4`,
    [ws, name, ciphertext, iv]);
}
export async function consumeVaultLink(db: Pool, token: string): Promise<string | null> {
  const r = await db.query(`SELECT token, workspace_id, used FROM assistant_vault_link WHERE token=$1`, [token]);
  const row = r.rows[0] as any;
  if (!row || row.used) return null;
  await db.query(`UPDATE assistant_vault_link SET used=true WHERE token=$1`, [token]);
  return String(row.workspace_id);
}
export function collectPage(token: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RevUp Vault</title>
<style>body{font-family:-apple-system,sans-serif;max-width:26rem;margin:3rem auto;padding:0 1rem}input,button{font-size:1rem;padding:.6rem;width:100%;margin:.3rem 0;box-sizing:border-box}button{background:#000;color:#fff;border:0;border-radius:.5rem}</style></head>
<body><h2>Save a secret</h2><p>Write-only vault. It is stored encrypted and never shown in chat, ever.</p>
<form method="POST" action="/vault/save"><input type="hidden" name="token" value="${token}">
<input name="name" placeholder="Name (e.g. SomeService login)" required>
<input name="secret" type="password" placeholder="The secret" required>
<button type="submit">Save to vault</button></form><script>(function(){var inp=document.querySelector('input[type="password"]');if(!inp)return;var b=document.createElement('button');b.type='button';b.textContent='Show';b.setAttribute('aria-label','Show secret');b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){var t=inp.type==='password';inp.type=t?'text':'password';b.textContent=t?'Hide':'Show';b.setAttribute('aria-pressed',String(t));});inp.after(b);})();</script></body></html>`;
}

// ---------- the memory-first answer loop ----------
export interface AssistantResult { reply: string; storedMemory?: string; approvalId?: number; provider?: string }

type Fetcher = (url: string, init: any) => Promise<any>;

export async function handleAssistantMessage(
  db: Pool,
  env: any,
  ws: string,
  businessName: string,
  contactId: string,
  text: string,
  sourceMessageId?: string,
  fetcher?: Fetcher,
  excludeTaskId?: number,
): Promise<AssistantResult> {
  await ensureAssistantTables(db);
  const name = businessName ? `${businessName} assistant` : "your business assistant";

  // 1. Tasks log query - answered from the log, no AI needed.
  if (isTasksQuery(text)) {
    const running = await runningTasks(db, ws, excludeTaskId);
    if (!running.length) return { reply: "Nothing running right now. Ask me to do something and it shows up here." };
    const lines = running.map((t) => `- #${t.id} ${t.kind}: ${t.detail ?? ""} (started ${sast(t.started_at)})`);
    return { reply: `Running now:\n${lines.join("\n")}` };
  }

  // 2. Memory query - answered from stored memory only.
  if (isMemoryQuery(text)) {
    const hits = await recall(db, ws, text, 8);
    if (!hits.length) return { reply: "I have nothing stored on that yet. Tell me once and I keep it." };
    const lines = hits.map((m) => `- [${m.kind}] ${m.text}`);
    return { reply: `What I remember:\n${lines.join("\n")}` };
  }

  // 3. Vault request - one-time collection link. Secrets never in chat.
  if (isVaultRequest(text)) {
    if (!env.VAULT_MASTER_KEY) return { reply: "The vault is not set up on this deployment yet." };
    const token = crypto.randomUUID();
    await db.query(`INSERT INTO assistant_vault_link(token, workspace_id) VALUES($1,$2)`, [token, ws]);
    const base = env.WORKER_URL || "https://revup.nahalabs.co.za";
    return { reply: `Open this one-time link to save it into your vault (never in chat): ${base}/vault/c/${token}` };
  }

  // 4. Go + Sure on the oldest pending approval.
  if (isApprovalReply(text)) {
    const pending = await db.query(`SELECT id, action FROM assistant_approval WHERE workspace_id=$1 AND status='pending' ORDER BY id ASC LIMIT 1`, [ws]);
    if (!pending.rows.length) return { reply: "Nothing waiting on your Go + Sure right now." };
    await db.query(`UPDATE assistant_approval SET status='approved', resolved_at=now() WHERE id=$1`, [pending.rows[0].id]);
    await remember(db, ws, "decision", `Approved with Go + Sure: ${pending.rows[0].action}`, sourceMessageId);
    return { reply: `Go + Sure noted. #${pending.rows[0].id} is approved and queued: ${pending.rows[0].action}` };
  }

  // 5. Rule capture - stored immediately, enforced on every future answer.
  if (isRuleCapture(text)) {
    const cleaned = text.replace(/^(new rule|rule)\s*[:\-]\s*/i, "").trim();
    await remember(db, ws, /^(new rule|rule)\s*[:\-]/i.test(text.trim()) ? "rule" : "preference", cleaned, sourceMessageId);
    return { reply: "Stored. It is loaded before every answer from now on.", storedMemory: cleaned };
  }

  // 6. Action intent - park on Go + Sure, do not execute.
  if (isActionIntent(text)) {
    const r = await db.query(`INSERT INTO assistant_approval(workspace_id, action, detail) VALUES($1,$2,$3) RETURNING id`, [ws, text.slice(0, 120), text]);
    const id = r.rows[0].id as number;
    return { reply: `That one sends/spends/deploys, so it waits for you. Reply "Go + Sure" and I do it.\n\nQueued #${id}: ${text.slice(0, 200)}`, approvalId: id };
  }

  // 7. Normal answer: rules + relevant memory + recent chat, then the free AI chain.
  const hist = await db.query(
    `SELECT direction, body FROM receptionist_message WHERE contact_id=$1 AND body IS NOT NULL AND body <> '' ORDER BY created_at DESC LIMIT 20`,
    [contactId]);
  const history: { role: string; content: string }[] = hist.rows.reverse().map((h: any) => `${h.direction === "inbound" ? "Owner" : "Assistant"}: ${h.body}`);
  const [rules, memories] = await Promise.all([loadRules(db, ws), recall(db, ws, text)]);
  const prompt = [
    `You are ${name}, the business owner's own assistant on WhatsApp. The owner is in South Africa (SAST).`,
    "CORE RULES (always):",
    ...CORE_RULES.map((r) => `- ${r}`),
    rules.length ? "THEIR RULES (always enforce):" : "",
    ...rules.map((r) => `- ${r}`),
    memories.length ? "MEMORY relevant to this message:" : "",
    ...memories.map((m) => `- [${m.kind}] ${m.text}`),
    history.length ? "Recent conversation:\n" + history.join("\n") : "",
    `Owner: ${text}`,
  ].filter(Boolean).join("\n");

  const ai = await freeAiGenerate<string>(env, prompt, { maxTokens: 800, temperature: 0.4, requireBackupConsent: true },
    rejectInventedPrices(prompt, (t) => t.trim() || null), fetcher);
  if (!ai) return { reply: "My AI is unavailable right now and the backup is either off or down. Try me again in a few minutes." };

  // Memory extraction pass: store one durable fact/rule the owner stated. Best-effort.
  let stored: string | undefined;
  try {
    const extract = await freeAiGenerate<any>(env,
      `From the user message, extract at most one durable fact, rule, decision, person or project worth remembering long-term. Reply as JSON {"kind":"rule|decision|person|project|preference|fact","text":"..."} or {"skip":true}. Never extract questions, greetings or one-off requests.\n\nUser message: ${text}`,
      { maxTokens: 200, temperature: 0.1, requireBackupConsent: true }, (t) => {
        const m = t.match(/\{[\s\S]*\}/);
        if (!m) return null;
        try { return JSON.parse(m[0]); } catch { return null; }
      }, fetcher);
    const parsed: any = extract?.value;
    if (parsed && !parsed.skip && parsed.text && parsed.kind && ["rule", "decision", "person", "project", "preference", "fact"].includes(parsed.kind)) {
      await remember(db, ws, parsed.kind, String(parsed.text).slice(0, 500), sourceMessageId);
      stored = String(parsed.text).slice(0, 500);
    }
  } catch { /* extraction is best-effort; the answer already landed */ }
  return { reply: ai.value, provider: ai.provider, storedMemory: stored };
}

// ---------- webhook entry: owner gate + Pro gate + shared caps + partner send ----------
export interface AssistantCtx {
  workspaceId: string;
  waId: string;         // sender digits
  body: string;
  contactId: string;
  zernioMessageId: string;
  channel: any;         // receptionist_zerniochannel row
  businessName: string;
}

// Returns true when the message belonged to the assistant (owner on a Pro
// workspace) and was fully handled. Anything else returns false so the
// receptionist flow continues unchanged.
export async function maybeHandleAssistant(db: Pool, env: any, c: AssistantCtx): Promise<boolean> {
  await ensureAssistantTables(db);
  const s = await db.query(`SELECT owner_phone, enabled FROM assistant_setting WHERE workspace_id=$1`, [c.workspaceId]);
  const setting = s.rows[0];
  if (!setting || !setting.enabled || !setting.owner_phone) return false;
  if (String(setting.owner_phone).replace(/\D/g, "") !== c.waId.replace(/\D/g, "")) return false;

  const org = await db.query(`SELECT o.plan, o.subscription_status FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [c.workspaceId]);
  if ((org.rows[0]?.plan || "starter") !== "business-pro" || org.rows[0]?.subscription_status !== "active") return false; // Pro-tier feature, paid orgs only

  const taskId = await startTask(db, c.workspaceId, "message", `Reply to owner: ${c.body.slice(0, 80)}`);
  try {
    // shared per-business daily AI-attempt cap: reserve before any AI call
    // (rule/memory/tasks/vault/approval paths below use no AI, but the
    // reservation keeps one message = one slot like the receptionist).
    await db.query(`CREATE TABLE IF NOT EXISTS cf_ai_usage(workspace_id uuid, day date, attempts int NOT NULL DEFAULT 0, PRIMARY KEY(workspace_id, day))`);
    await db.query(
      `INSERT INTO cf_ai_usage(workspace_id, day, attempts) VALUES($1, CURRENT_DATE, 1)
       ON CONFLICT (workspace_id, day) DO UPDATE SET attempts = cf_ai_usage.attempts + 1`,
      [c.workspaceId]);

    const result = await handleAssistantMessage(db, env, c.workspaceId, c.businessName, c.contactId, c.body, c.zernioMessageId || undefined, undefined, taskId);

    // record + send through the same channel path as the receptionist
    const outId = crypto.randomUUID();
    await db.query(
      `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
       VALUES($1,'outbound','assistant',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
      [outId, result.reply, c.contactId, c.workspaceId]);
    const { sendChannelMessage } = await import("./receptionist");
    const sent = await sendChannelMessage(db, env, c.channel, c.contactId, c.waId, result.reply);
    if (sent.ok) await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sent.messageId, outId]);
    await finishTask(db, taskId, "done");
    return true;
  } catch (e: any) {
    await finishTask(db, taskId, "failed", String(e).slice(0, 200));
    return true; // the assistant owned this message; do not fall through to the customer receptionist
  }
}

// ---------- dashboard settings (Pro-gated in index.ts) ----------
export async function getSettings(db: Pool, ws: string): Promise<{ owner_phone: string; enabled: boolean } | null> {
  await ensureAssistantTables(db);
  const r = await db.query(`SELECT owner_phone, enabled FROM assistant_setting WHERE workspace_id=$1`, [ws]);
  return r.rows[0] || null;
}
export async function upsertSettings(db: Pool, ws: string, ownerPhone: string, enabled: boolean): Promise<void> {
  await ensureAssistantTables(db);
  const phone = ownerPhone.replace(/\D/g, "").slice(0, 32);
  await db.query(
    `INSERT INTO assistant_setting(workspace_id, owner_phone, enabled, updated_at) VALUES($1,$2,$3,now())
     ON CONFLICT (workspace_id) DO UPDATE SET owner_phone=$2, enabled=$3, updated_at=now()`,
    [ws, phone, enabled]);
}
export async function assistantCounts(db: Pool, ws: string): Promise<{ memories: number; pending: number; running: number }> {
  await ensureAssistantTables(db);
  const [m, a, t] = await Promise.all([
    db.query(`SELECT count(*) c FROM assistant_memory WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT count(*) c FROM assistant_approval WHERE workspace_id=$1 AND status='pending'`, [ws]),
    db.query(`SELECT count(*) c FROM assistant_task WHERE workspace_id=$1 AND status='running'`, [ws]),
  ]);
  return { memories: Number(m.rows[0].c), pending: Number(a.rows[0].c), running: Number(t.rows[0].c) };
}
