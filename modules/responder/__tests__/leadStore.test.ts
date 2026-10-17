import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InMemoryLeadStore, PostgresLeadStore, type Queryable } from "../store/leadStore.js";
import { LeadConversation } from "../flow/conversation.js";
import { StubCalendarProvider, candidateSlots } from "../flow/slots.js";
import { parseEnquiry } from "../parser/index.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const enquiry = parseEnquiry(readFileSync(join(fixtures, "property24-basic.eml"), "utf8"));
const opts = { agentName: "Thabiso", calendar: new StubCalendarProvider() };

test("snapshot -> revive round-trip preserves a booked conversation", async () => {
  const convo = new LeadConversation(enquiry, opts);
  convo.initialMessages();
  await convo.handleReply("R2.5m, pre-approved");
  await convo.handleReply("1");
  const snap = convo.snapshot();

  const revived = LeadConversation.revive(snap.enquiry, opts, snap);
  assert.equal(revived.state, "BOOKED");
  assert.equal(revived.qualification.finance, "pre-approved");
  assert.ok(revived.bookedSlot);
  assert.equal(revived.bookedSlot!.label, convo.bookedSlot!.label);
  assert.ok(revived.bookedSlot!.start instanceof Date);
  assert.equal(revived.enquiry.leadPhone, "27825550134");
  assert.match(revived.handoverNote(), /Sipho Dlamini/);
});

test("InMemoryLeadStore: save/get + processed ledger", async () => {
  const store = new InMemoryLeadStore();
  const convo = new LeadConversation(enquiry, opts);
  await store.saveConvo("27825550134", convo.snapshot());
  const got = await store.getConvo("27825550134");
  assert.equal(got!.enquiry.leadName, "Sipho Dlamini");
  assert.equal(await store.isProcessed("m1"), false);
  await store.markProcessed("m1");
  assert.equal(await store.isProcessed("m1"), true);
});

function fakePg(): Queryable & { calls: { text: string; params?: unknown[] }[]; tables: Map<string, Map<string, unknown>> } {
  const calls: { text: string; params?: unknown[] }[] = [];
  const convos = new Map<string, unknown>();
  const processed = new Set<string>();
  return {
    calls,
    tables: new Map(),
    async query(text: string, params?: unknown[]) {
      calls.push({ text, params });
      if (text.includes("SELECT snapshot FROM lead_conversations")) {
        const snap = convos.get(params![0] as string);
        return { rows: snap ? [{ snapshot: snap }] : [] };
      }
      if (text.includes("INSERT INTO lead_conversations")) {
        convos.set(params![0] as string, JSON.parse(params![1] as string));
        return { rows: [] };
      }
      if (text.includes("FROM processed_intake")) {
        return { rows: processed.has(params![0] as string) ? [{ one: 1 }] : [] };
      }
      if (text.includes("INSERT INTO processed_intake")) {
        processed.add(params![0] as string);
        return { rows: [] };
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };
}

test("PostgresLeadStore: upsert round-trip + idempotent processed marking", async () => {
  const pg = fakePg();
  const store = new PostgresLeadStore(pg);

  const convo = new LeadConversation(enquiry, opts);
  convo.initialMessages();
  await convo.handleReply("R2.5m, cash");
  await convo.handleReply("2");
  await store.saveConvo("27825550134", convo.snapshot());

  // snapshot comes back out and revives to the same state
  const got = await store.getConvo("27825550134");
  const revived = LeadConversation.revive(got!.enquiry, opts, got!);
  assert.equal(revived.state, "BOOKED");
  assert.equal(revived.qualification.finance, "cash");

  // upsert uses ON CONFLICT (safe to save repeatedly)
  const insert = pg.calls.find((c) => c.text.includes("INSERT INTO lead_conversations"));
  assert.match(insert!.text, /ON CONFLICT \(phone\) DO UPDATE/);

  assert.equal(await store.isProcessed("g1"), false);
  await store.markProcessed("g1");
  await store.markProcessed("g1"); // idempotent
  assert.equal(await store.isProcessed("g1"), true);
  const ledgerInsert = pg.calls.find((c) => c.text.includes("INSERT INTO processed_intake"));
  assert.match(ledgerInsert!.text, /ON CONFLICT DO NOTHING/);
});

test("revived conversation continues where it left off after 'restart'", async () => {
  const store = new InMemoryLeadStore();
  const convo = new LeadConversation(enquiry, opts);
  convo.initialMessages();
  await convo.handleReply("R2.5m, pre-approved"); // now SLOTS_OFFERED
  await store.saveConvo("27825550134", convo.snapshot());

  // simulate restart: fresh process reads the store
  const snap = await store.getConvo("27825550134");
  const revived = LeadConversation.revive(snap!.enquiry, opts, snap!);
  assert.equal(revived.state, "SLOTS_OFFERED");
  const r = await revived.handleReply("1"); // picks an offered slot from before the restart
  assert.equal(r.state, "BOOKED");
  assert.ok(r.bookedSlot);
});
