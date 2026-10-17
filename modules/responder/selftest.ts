/**
 * Boot selftest (RESPONDER_SELFTEST=1): runs one synthetic Property24
 * enquiry through the full pipeline with the dry-run transport and logs the
 * result. Proves in-container that intake -> parse -> conversation -> reply
 * works end to end. Nothing is sent: dry-run only logs "WOULD SEND".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DryRunWhatsAppClient } from "./transport/operatorClient.js";
import { InMemoryLeadStore } from "./store/leadStore.js";
import { StubCalendarProvider } from "./flow/slots.js";
import { processEnquiryEmail } from "./pipeline.js";

const here = dirname(fileURLToPath(import.meta.url));
const eml = readFileSync(join(here, "..", "fixtures", "property24-basic.eml"), "utf8");

const store = new InMemoryLeadStore();
const result = await processEnquiryEmail(eml, {
  whatsApp: new DryRunWhatsAppClient(),
  store,
  convoOpts: { agentName: "Selftest Agent", calendar: new StubCalendarProvider() },
});
console.log(`[selftest] synthetic enquiry result: ${result.status}${result.reason ? " - " + result.reason : ""}`);
await store.close();
