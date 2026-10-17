import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GmailIntake, intakeConfigFromEnv, DEFAULT_INTAKE_CONFIG } from "../intake/gmailIntake.js";
import { GoogleAuth } from "../intake/auth.js";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const rawEmail = readFileSync(join(fixtures, "property24-basic.eml"), "utf8");
const rawB64url = Buffer.from(rawEmail, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

interface Call { url: string; method: string; body?: unknown; }

function fakeAuth(calls: Call[], responses: Record<string, unknown>): GoogleAuth {
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), { status: 200 });
    }
    calls.push({ url: u, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if ((init?.method ?? "GET") === "POST" && u.endsWith("/labels")) {
      return new Response(JSON.stringify({ id: "Label_new_1", name: "LeadMachine/Processed" }), { status: 200 });
    }
    for (const [key, value] of Object.entries(responses)) {
      if (u.includes(key)) return new Response(JSON.stringify(value), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;
  return new GoogleAuth({ clientId: "c", clientSecret: "s", refreshToken: "r" }, fetchImpl);
}

test("pollOnce lists, fetches raw, and parses each message - read-only by default", async () => {
  const calls: Call[] = [];
  const auth = fakeAuth(calls, {
    "/messages?": { messages: [{ id: "m1" }, { id: "m2" }] },
    "/messages/m1": { raw: rawB64url },
    "/messages/m2": { raw: rawB64url },
  });
  const intake = new GmailIntake(auth, { ...DEFAULT_INTAKE_CONFIG });
  const items = await intake.pollOnce();

  assert.equal(items.length, 2);
  assert.equal(items[0]!.gmailMessageId, "m1");
  assert.equal(items[0]!.enquiry.provider, "property24");
  assert.equal(items[0]!.enquiry.leadPhone, "27825550134");

  const listCall = calls.find((c) => c.url.includes("/messages?"));
  assert.ok(listCall);
  assert.match(decodeURIComponent(listCall!.url), /from:\(property24\.com OR privateproperty\.co\.za\) is:unread/);
  // read-only: no modify calls
  assert.ok(!calls.some((c) => c.url.includes("/modify")), "no label modify when markProcessed=false");
});

test("markProcessed adds the processed label (create if missing), never deletes", async () => {
  const calls: Call[] = [];
  const auth = fakeAuth(calls, {
    "/messages?": { messages: [{ id: "m1" }] },
    "/messages/m1": { raw: rawB64url },
    "/labels": { labels: [] }, // label does not exist yet
  });
  const intake = new GmailIntake(auth, { ...DEFAULT_INTAKE_CONFIG, markProcessed: true });
  await intake.pollOnce();

  const create = calls.find((c) => c.url.endsWith("/labels") && c.method === "POST");
  assert.ok(create, "label created when missing");
  assert.equal((create!.body as { name: string }).name, "LeadMachine/Processed");

  const modify = calls.find((c) => c.url.includes("/messages/m1/modify"));
  assert.ok(modify);
  const labelId = (modify!.body as { addLabelIds: string[] }).addLabelIds[0]!;
  assert.equal(labelId, "Label_new_1");

  const labelList = calls.filter((c) => c.url.endsWith("/labels") && c.method === "GET");
  assert.equal(labelList.length, 1, "label id is cached across messages");
});

test("reuses an existing processed label instead of creating one", async () => {
  const calls: Call[] = [];
  const auth = fakeAuth(calls, {
    "/messages?": { messages: [{ id: "m1" }] },
    "/messages/m1": { raw: rawB64url },
    "/labels": { labels: [{ id: "Label_99", name: "LeadMachine/Processed" }] },
  });
  const intake = new GmailIntake(auth, { ...DEFAULT_INTAKE_CONFIG, markProcessed: true });
  await intake.pollOnce();
  assert.ok(!calls.some((c) => c.url.endsWith("/labels") && c.method === "POST"), "no label create when it exists");
  const modify = calls.find((c) => c.url.includes("/modify"));
  assert.deepEqual(modify!.body, { addLabelIds: ["Label_99"] });
});

test("env config wiring", () => {
  const cfg = intakeConfigFromEnv({ GMAIL_MARK_PROCESSED: "true", GMAIL_QUERY: "from:x" } as NodeJS.ProcessEnv);
  assert.equal(cfg.markProcessed, true);
  assert.equal(cfg.query, "from:x");
  const def = intakeConfigFromEnv({} as NodeJS.ProcessEnv);
  assert.equal(def.markProcessed, false);
  assert.match(def.query, /is:unread/);
});
