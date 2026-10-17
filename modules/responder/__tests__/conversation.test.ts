import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnquiry } from "../parser/index.js";
import { LeadConversation, extractQualification } from "../flow/conversation.js";
import { StubCalendarProvider } from "../flow/slots.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const enquiry = parseEnquiry(readFileSync(join(fixtures, "property24-basic.eml"), "utf8"));
const opts = { agentName: "Thabiso", calendar: new StubCalendarProvider() };

test("full walk: initial reply -> qualification -> slots -> booking", async () => {
  const convo = new LeadConversation(enquiry, opts);

  const initial = convo.initialMessages();
  assert.equal(initial.length, 1);
  assert.match(initial[0]!, /Hi Sipho/);
  assert.match(initial[0]!, /3 Bedroom House for Sale in Fourways/);
  assert.match(initial[0]!, /price range/i);

  const r1 = await convo.handleReply("Hi, budget is around R2.5m and I'm pre-approved");
  assert.equal(r1.state, "SLOTS_OFFERED");
  assert.match(r1.messages[0]!, /1\).*\n2\).*\n3\)/s);
  assert.equal(convo.qualification.finance, "pre-approved");

  const r2 = await convo.handleReply("2");
  assert.equal(r2.state, "BOOKED");
  assert.ok(r2.bookedSlot);
  assert.match(r2.messages[0]!, /booked to view/i);
});

test("vague first reply re-asks budget without offering slots", async () => {
  const convo = new LeadConversation(enquiry, opts);
  convo.initialMessages();
  const r = await convo.handleReply("hello");
  assert.equal(r.state, "QUALIFYING");
  assert.match(r.messages[0]!, /price range/i);
});

test("unclear slot pick is corrected, then valid pick books", async () => {
  const convo = new LeadConversation(enquiry, opts);
  convo.initialMessages();
  await convo.handleReply("R2m, cash buyer");
  const bad = await convo.handleReply("maybe next year");
  assert.match(bad.messages[0]!, /1, 2 or 3/);
  const good = await convo.handleReply("1");
  assert.equal(good.state, "BOOKED");
});

test("qualification extraction is tolerant", () => {
  const q: { budgetRaw?: string; finance?: string } = {};
  extractQualification("My budget is around R2.5m and I am pre-approved for a bond", q as any);
  assert.ok(q.budgetRaw);
  assert.equal(q.finance, "pre-approved");
  const q2: { finance?: string } = {};
  extractQualification("we are cash buyers", q2 as any);
  assert.equal(q2.finance, "cash");
});

test("stub calendar offers future, labelled slots", async () => {
  const cal = new StubCalendarProvider();
  const slots = await cal.getAvailableSlots(3, new Date());
  assert.equal(slots.length, 3);
  for (const s of slots) {
    assert.ok(s.start.getTime() > Date.now());
    assert.ok(s.label.length > 5);
  }
});
