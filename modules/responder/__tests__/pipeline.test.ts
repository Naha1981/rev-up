import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { processEnquiryEmail, handleLeadReply } from "../pipeline.js";
import { DryRunWhatsAppClient } from "../transport/operatorClient.js";
import { InMemoryLeadStore } from "../store/leadStore.js";
import { StubCalendarProvider } from "../flow/slots.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const read = (f: string) => readFileSync(join(fixtures, f), "utf8");

function deps() {
  const whatsApp = new DryRunWhatsAppClient();
  const store = new InMemoryLeadStore();
  return {
    whatsApp,
    store,
    convoOpts: { agentName: "Sipho", calendar: new StubCalendarProvider() },
  };
}

test("every fixture routes correctly and dry-run captures would-be sends", async () => {
  const d = deps();
  const results = [];
  for (const f of readdirSync(fixtures).filter((f) => f.endsWith(".eml"))) {
    results.push([f, await processEnquiryEmail(read(f), d)] as const);
  }
  const byFile = new Map(results);
  assert.equal(byFile.get("property24-basic.eml")!.status, "replied");
  assert.equal(byFile.get("property24-html.eml")!.status, "replied");
  assert.equal(byFile.get("privateproperty-basic.eml")!.status, "replied");
  assert.equal(byFile.get("privateproperty-html.eml")!.status, "replied");
  assert.equal(byFile.get("forwarded-unknown.eml")!.status, "replied"); // phone + name found, capped confidence still >= 0.5
  assert.equal(byFile.get("property24-no-phone.eml")!.status, "needs_review");
  assert.match(byFile.get("property24-no-phone.eml")!.reason!, /phone/);

  // nothing was ever "sent" for the no-phone lead
  for (const rec of d.whatsApp.transcript) {
    assert.match(rec.to, /^27\d{9}$/);
    assert.ok(rec.text.length > 20);
  }
});

test("end-to-end: enquiry email in, booking confirmed out, agent notified - all dry-run", async () => {
  const d = deps();
  const r = await processEnquiryEmail(read("property24-basic.eml"), d);
  assert.equal(r.status, "replied");
  assert.equal(d.whatsApp.transcript.length, 1);

  const phone = r.enquiry.leadPhone!;
  await handleLeadReply(phone, "R2.5m, pre-approved", { ...d, agentPhone: "27000000000" });
  const final = await handleLeadReply(phone, "1", { ...d, agentPhone: "27000000000" });
  assert.ok("bookedSlot" in final && final.bookedSlot);

  // lead got: instant reply + slot offer + confirmation; agent got: handover note
  assert.equal(d.whatsApp.transcript.length, 4);
  const handover = d.whatsApp.transcript.find((t) => t.to === "27000000000");
  assert.ok(handover);
  assert.match(handover!.text, /Sipho Dlamini/);
  assert.match(handover!.text, /Budget/);
});

test("unknown lead reply errors cleanly", async () => {
  const d = deps();
  const r = await handleLeadReply("27999999999", "hi", { ...d });
  assert.ok("error" in r);
});
