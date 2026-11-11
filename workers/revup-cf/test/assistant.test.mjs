import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isApprovalReply, isActionIntent, isRuleCapture, isMemoryQuery, isTasksQuery, isVaultRequest,
  remember, recall, loadRules, runningTasks, sealSecret, openSecret, consumeVaultLink,
  handleAssistantMessage, maybeHandleAssistant, upsertSettings, getSettings, assistantCounts,
} from '../dist-test/assistant.mjs';

// --- in-memory pg-style shim covering the assistant's SQL surface ---
function makeDb() {
  const tables = {
    assistant_setting: [], assistant_memory: [], assistant_approval: [],
    assistant_task: [], assistant_vault_secret: [], assistant_vault_link: [],
    receptionist_message: [], cf_ai_usage: [],
  };
  let seq = 1;
  const n = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const query = async (text, params = []) => {
    const s = n(text);
    if (['begin','commit','rollback'].includes(s)||s.startsWith('set local')||s.startsWith('select token from assistant_vault_link'))return{rows:[]};
    if (s.startsWith('create')) return { rows: [] };
    // settings
    if (s.startsWith('select owner_phone, enabled from assistant_setting'))
      return { rows: tables.assistant_setting.filter((r) => r.workspace_id === params[0]).slice(0, 1) };
    if (s.startsWith('insert into assistant_setting')) {
      const ex = tables.assistant_setting.find((r) => r.workspace_id === params[0]);
      if (ex) { ex.owner_phone = params[1]; ex.enabled = params[2]; }
      else tables.assistant_setting.push({ workspace_id: params[0], owner_phone: params[1], enabled: params[2] });
      return { rows: [] };
    }
    // org plan
    if (s.includes('from organizations_organization')) return { rows: [{ plan: makeDb.plan, subscription_status: makeDb.status || 'active' }] };
    // cf_ai_usage upsert
    if (s.startsWith('insert into cf_ai_usage')) {
      const key = params[0];
      const ex = tables.cf_ai_usage.find((r) => r.workspace_id === key);
      if (ex) ex.attempts += 1; else tables.cf_ai_usage.push({ workspace_id: key, attempts: 1 });
      const row = ex || tables.cf_ai_usage[tables.cf_ai_usage.length - 1];
      return { rows: s.includes('returning') ? [{ attempts: row.attempts }] : [] };
    }
    // tasks
    if (s.startsWith('insert into assistant_task')) {
      const row = { id: seq++, workspace_id: params[0], kind: params[1], detail: params[2], status: 'running', started_at: new Date().toISOString() };
      tables.assistant_task.push(row);
      return { rows: [row] };
    }
    if (s.startsWith('update assistant_task')) {
      const row = tables.assistant_task.find((r) => r.id === params[0]);
      if (row) { row.status = params[1]; if (params[2]) row.detail += ' | ' + params[2]; }
      return { rows: [] };
    }
    if (s.startsWith('select id, kind, detail, status, started_at from assistant_task'))
      return { rows: tables.assistant_task.filter((r) => r.workspace_id === params[0] && r.status === 'running' && (params[1] == null || r.id !== params[1])) };
    // memory
    if (s.startsWith('select text from assistant_memory'))
      return { rows: tables.assistant_memory.filter((r) => r.workspace_id === params[0] && r.kind === 'rule') };
    if (s.startsWith('select id, kind, text, created_at from assistant_memory')) {
      const terms = params.slice(1).map((p) => String(p).replace(/%/g, '').toLowerCase());
      return { rows: tables.assistant_memory.filter((r) => r.workspace_id === params[0] && terms.some((t) => r.text.toLowerCase().includes(t))) };
    }
    if (s.startsWith('select id from assistant_memory'))
      return { rows: tables.assistant_memory.filter((r) => r.workspace_id === params[0] && r.kind === params[1] && r.text === params[2]).slice(0, 1) };
    if (s.startsWith('insert into assistant_memory')) {
      tables.assistant_memory.push({ id: seq++, workspace_id: params[0], kind: params[1], text: params[2], source_message_id: params[3], created_at: new Date().toISOString() });
      return { rows: [] };
    }
    // approvals
    if (s.startsWith('select id, action from assistant_approval'))
      return { rows: tables.assistant_approval.filter((r) => r.workspace_id === params[0] && r.status === 'pending').slice(0, 1) };
    if (s.startsWith('update assistant_approval')) {
      const row = tables.assistant_approval.find((r) => r.id === params[0]);
      if (row) row.status = 'approved';
      return { rows: [] };
    }
    if (s.startsWith('insert into assistant_approval')) {
      const row = { id: seq++, workspace_id: params[0], action: params[1], detail: params[2], status: 'pending' };
      tables.assistant_approval.push(row);
      return { rows: [row] };
    }
    // vault
    if (s.startsWith('insert into assistant_vault_link')) {
      tables.assistant_vault_link.push({ token: params[0], workspace_id: params[1], used: false, created_at: Date.now() });
      return { rows: [] };
    }
    if (s.startsWith('select token, workspace_id, used from assistant_vault_link'))
      return { rows: tables.assistant_vault_link.filter((r) => r.token === params[0]).slice(0, 1) };
    if (s.startsWith('update assistant_vault_link')) {
      const row = tables.assistant_vault_link.find((r) => r.token === params[0] && !r.used && r.created_at>Date.now()-15*60000);
      if(row)row.used=true;
      return{rows:row?[{workspace_id:row.workspace_id}]:[]};
    }
    if (s.startsWith('insert into assistant_vault_secret')) {
      const ex = tables.assistant_vault_secret.find((r) => r.workspace_id === params[0] && r.name === params[1]);
      if (ex) { ex.ciphertext = params[2]; ex.iv = params[3]; }
      else tables.assistant_vault_secret.push({ id: seq++, workspace_id: params[0], name: params[1], ciphertext: params[2], iv: params[3] });
      return { rows: [] };
    }
    // receptionist_message
    if (s.startsWith('select direction, body from receptionist_message'))
      return { rows: tables.receptionist_message.filter((r) => r.contact_id === params[0] && r.workspace_id === params[1]).slice(-20) };
    if (s.startsWith('insert into receptionist_message')) {
      const dir = s.includes("'outbound'") ? 'outbound' : 'inbound';
      const st = s.includes("'assistant'") ? 'assistant' : s.includes("'ai'") ? 'ai' : 'user';
      tables.receptionist_message.push({ id: params[0], direction: dir, sender_type: st, body: params[1], contact_id: params[2] });
      return { rows: [] };
    }
    if (s.startsWith('update receptionist_message set is_draft=false')) return { rows: [] };
    if (s.startsWith('select zernio_conversation_id from receptionist_contact'))
      return { rows: [{ zernio_conversation_id: 'conv1' }] };
    if (s.startsWith('select count(*) c from receptionist_message')) return { rows: [{ c: 0 }] };
    if (s.startsWith('select api_key, status from receptionist_tenantmessagingconnection')) return { rows: [] };
    // counts
    if (s.startsWith('select count(*) c from assistant_memory'))
      return { rows: [{ c: tables.assistant_memory.filter((r) => r.workspace_id === params[0]).length }] };
    if (s.startsWith('select count(*) c from assistant_approval'))
      return { rows: [{ c: tables.assistant_approval.filter((r) => r.workspace_id === params[0] && r.status === 'pending').length }] };
    if (s.startsWith('select count(*) c from assistant_task'))
      return { rows: [{ c: tables.assistant_task.filter((r) => r.workspace_id === params[0] && r.status === 'running').length }] };
    throw new Error('shim: unhandled SQL: ' + s);
  };
  return { query, tables, connect:async()=>({query,release:()=>{}}) };
}
makeDb.plan = 'business-pro';

const WS = '11111111-2222-3333-4444-555555555555';
const VAULT_KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const env = { VAULT_MASTER_KEY: VAULT_KEY, GROQ_API_KEY: 'test-key', OPENROUTER_DATA_USE_APPROVED: 'false', OPENROUTER_FREE_ONLY: 'true', WORKER_URL: 'https://test.example' };

const groqOk = (reply, calls) => async (url, init) => {
  calls?.push(JSON.parse(init.body));
  if (url.includes('zernio.com')) return new Response(JSON.stringify({ message: { id: 'zm-1' } }), { status: 200 });
  return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200 });
};

// --- intent detection ---
test('approval replies', () => {
  for (const t of ['Go', 'Sure', 'Go Sure', 'Go + Sure', 'go+sure']) assert.ok(isApprovalReply(t), t);
  assert.ok(!isApprovalReply('please send it tomorrow'));
});
test('action intents vs queries', () => {
  assert.ok(isActionIntent('send an email to Gareth'));
  assert.ok(isActionIntent('book a table'));
  assert.ok(!isActionIntent('what do you remember about Gareth'));
  assert.ok(!isActionIntent('what are you running'));
});
test('rule capture / memory / tasks / vault detection', () => {
  assert.ok(isRuleCapture('NEW RULE: always test first'));
  assert.ok(isRuleCapture('remember this: Bongeka is my wife'));
  assert.ok(isMemoryQuery('what do you remember about Bongeka'));
  assert.ok(isTasksQuery('what are you running'));
  assert.ok(isVaultRequest('save this password please'));
});

// --- memory ---
test('remember dedupes and recall is keyword scoped per business', async () => {
  const db = makeDb();
  await remember(db, WS, 'person', 'Bongeka is my wife');
  await remember(db, WS, 'person', 'Bongeka is my wife');
  await remember(db, 'other-ws', 'person', 'Bongeka is a stranger');
  const hits = await recall(db, WS, 'who is Bongeka');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].text, 'Bongeka is my wife');
});

// --- vault ---
test('vault seal/open roundtrip and one-time link', async () => {
  const db = makeDb();
  const { ciphertext, iv } = await sealSecret(env, 'super-secret');
  assert.ok(!ciphertext.includes('super-secret'));
  assert.equal(await openSecret(env, ciphertext, iv), 'super-secret');
  await db.query(`INSERT INTO assistant_vault_link(token, workspace_id) VALUES($1,$2)`, ['tok1', WS]);
  assert.equal(await consumeVaultLink(db, 'tok1'), WS);
  assert.equal(await consumeVaultLink(db, 'tok1'), null); // one-time
});

// --- the loop ---
test('rule capture stores without AI; rules load into the next answer', async () => {
  const db = makeDb();
  let aiCalls = 0;
  const fetcher = async () => { aiCalls++; return new Response(JSON.stringify({ choices: [{ message: { content: '{"skip":true}' } }] }), { status: 200 }); };
  const r1 = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'NEW RULE: always test first');
  assert.equal(r1.storedMemory, 'always test first');
  assert.equal(aiCalls, 0);
  assert.deepEqual(await loadRules(db, WS), ['always test first']);
  const calls = [];
  const r2 = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'how are things?', undefined, groqOk('All good.', calls));
  assert.equal(r2.reply, 'All good.');
  assert.ok(JSON.stringify(calls[0]).includes('always test first'), 'rule is in the prompt');
});

test('tasks query answers from the log with no AI call', async () => {
  const db = makeDb();
  let aiCalls = 0;
  const fetcher = async () => { aiCalls++; throw new Error('AI must not be called'); };
  const r = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'what are you running', undefined, fetcher);
  assert.match(r.reply, /Nothing running/);
  assert.equal(aiCalls, 0);
});

test('action intent parks for Go + Sure; approval resolves oldest pending', async () => {
  const db = makeDb();
  const r1 = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'send an email to Gareth');
  assert.ok(r1.approvalId);
  assert.match(r1.reply, /Go \+ Sure/);
  const r2 = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'Go sure');
  assert.match(r2.reply, /approved and queued/);
  const counts = await assistantCounts(db, WS);
  assert.equal(counts.pending, 0);
});

test('vault request returns a one-time link, never the secret', async () => {
  const db = makeDb();
  const r = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'please save this api key for me');
  assert.match(r.reply, /https:\/\/test\.example\/vault\/c\//);
  assert.equal(db.tables.assistant_vault_link.length, 1);
});

test('normal answer uses AI and stores an extracted durable fact', async () => {
  const db = makeDb();
  const fetcher = async (url, init) => {
    const body = JSON.parse(init.body);
    const prompt = body.messages[0].content;
    const content = prompt.includes('extract at most one durable fact')
      ? '{"kind":"person","text":"Gareth is the landlord"}'
      : 'Noted, Gareth is the landlord.';
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const r = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'Gareth is the landlord', undefined, fetcher);
  assert.equal(r.reply, 'Noted, Gareth is the landlord.');
  assert.equal(r.storedMemory, 'Gareth is the landlord');
  const hits = await recall(db, WS, 'Gareth');
  assert.equal(hits.length, 1);
});

test('AI fully unavailable gives a plain honest reply', async () => {
  const db = makeDb();
  const fetcher = async () => new Response('nope', { status: 500 });
  const r = await handleAssistantMessage(db, env, WS, 'Demo Dental', 'c1', 'tell me something', undefined, fetcher);
  assert.match(r.reply, /unavailable/i);
});

// --- webhook entry: owner gate + Pro gate ---
const chan = { workspace_id: WS, zernio_account_id: 'acct1', is_sandbox: false };
const ctx = { workspaceId: WS, waId: '27000000001', body: 'what are you running', contactId: 'c1', zernioMessageId: 'z1', channel: chan, businessName: 'Demo Dental' };

test('maybeHandleAssistant: no settings -> not handled (receptionist continues)', async () => {
  const db = makeDb();
  assert.equal(await maybeHandleAssistant(db, env, ctx), false);
});
test('maybeHandleAssistant: non-owner number -> not handled', async () => {
  const db = makeDb();
  await upsertSettings(db, WS, '27000000001', true);
  assert.equal(await maybeHandleAssistant(db, env, { ...ctx, waId: '27820000000' }), false);
});
test('maybeHandleAssistant: non-Pro plan -> not handled', async () => {
  const db = makeDb();
  makeDb.plan = 'growth';
  await upsertSettings(db, WS, '27000000001', true);
  assert.equal(await maybeHandleAssistant(db, env, ctx), false);
  makeDb.plan = 'business-pro';
});
test('maybeHandleAssistant: unpaid org on Pro plan -> not handled', async () => {
  const db = makeDb();
  makeDb.status = 'pending_activation';
  await upsertSettings(db, WS, '27000000001', true);
  assert.equal(await maybeHandleAssistant(db, env, ctx), false);
  makeDb.status = 'active';
});
test('maybeHandleAssistant: Pro owner message handled end to end, no AI for tasks query', async () => {
  const db = makeDb();
  await upsertSettings(db, WS, '27000000001', true);
  const calls = [];
  const fetcher = groqOk('x', calls);
  const origFetch = globalThis.fetch;
  globalThis.fetch = fetcher; // sendChannelMessage uses global fetch
  try {
    assert.equal(await maybeHandleAssistant(db, env, ctx), true);
  } finally { globalThis.fetch = origFetch; }
  const out = db.tables.receptionist_message.filter((m) => m.direction === 'outbound' && m.sender_type === 'assistant');
  assert.equal(out.length, 1);
  assert.match(out[0].body, /Nothing running/);
  const task = db.tables.assistant_task[0];
  assert.equal(task.status, 'done');
  assert.equal(db.tables.cf_ai_usage[0].attempts, 1);
});
test('settings upsert normalises the phone', async () => {
  const db = makeDb();
  await upsertSettings(db, WS, '+27 00 000 0001', true);
  const s = await getSettings(db, WS);
  assert.equal(s.owner_phone, '27000000001');
});

test('assistant history cannot import another tenant row for supplied contact ID',async()=>{const db=makeDb(),prompts=[];db.tables.receptionist_message.push({contact_id:'c1',workspace_id:'other-tenant',direction:'inbound',body:'FOREIGN-TENANT-PRIVATE'}, {contact_id:'c1',workspace_id:WS,direction:'inbound',body:'OWN-HISTORY'});await handleAssistantMessage(db,env,WS,'Synthetic','c1','Tell me the opening hours',undefined,async(_url,init)=>{prompts.push(JSON.stringify(JSON.parse(init.body).messages));return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}),{status:200});});assert.ok(prompts.some(p=>p.includes('OWN-HISTORY')));assert.ok(prompts.every(p=>!p.includes('FOREIGN-TENANT-PRIVATE')));});
test('assistant secret collection links expire and concurrent claims consume once',async()=>{const db=makeDb();db.tables.assistant_vault_link.push({token:'expired',workspace_id:WS,used:false,created_at:Date.now()-16*60000},{token:'fresh',workspace_id:WS,used:false,created_at:Date.now()});assert.equal(await consumeVaultLink(db,'expired'),null);const r=await Promise.all([consumeVaultLink(db,'fresh'),consumeVaultLink(db,'fresh')]);assert.equal(r.filter(x=>x===WS).length,1);});
