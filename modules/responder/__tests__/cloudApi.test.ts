import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { CloudApiWhatsAppClient, cloudApiConfigFromEnv } from "../transport/cloudApiClient.js";
import { cloudApiSignatureValid, extractCloudApiLeadReplies, verifyCloudApiChallenge } from "../webhooks/cloudApiWebhook.js";
import { createOperatorWebhookServer } from "../webhooks/operatorWebhook.js";

const APP_SECRET = "meta-app-secret";
const VERIFY_TOKEN = "meta-verify-token";

const cfg = {
  accessToken: "EAAG...",
  phoneNumberId: "123456789",
  apiVersion: "v21.0",
  initialTemplateName: "lead_instant_reply",
};

function captureFetch(calls: { url: string; auth?: string; body: Record<string, unknown> }[]) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      auth: new Headers(init?.headers).get("Authorization") ?? undefined,
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), { status: 200 });
  }) as typeof fetch;
}

test("Cloud API free-form text send payload (inside 24h window)", async () => {
  const calls: Parameters<typeof captureFetch>[0] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = captureFetch(calls);
  try {
    const c = new CloudApiWhatsAppClient(cfg);
    await c.sendText("27825550134", "here are the slots");
  } finally {
    globalThis.fetch = orig;
  }
  assert.equal(calls[0]!.url, "https://graph.facebook.com/v21.0/123456789/messages");
  assert.equal(calls[0]!.auth, "Bearer EAAG...");
  assert.deepEqual(calls[0]!.body, {
    messaging_product: "whatsapp",
    to: "27825550134",
    type: "text",
    text: { body: "here are the slots" },
  });
});

test("Cloud API first contact uses the approved template; refuses without one", async () => {
  const calls: Parameters<typeof captureFetch>[0] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = captureFetch(calls);
  try {
    const c = new CloudApiWhatsAppClient(cfg);
    await c.sendInitial("27825550134", "Sipho", "3 Bedroom House for Sale in Fourways");
    const body = calls[0]!.body as {
      type: string;
      template: { name: string; language: { code: string }; components: { parameters: { text: string }[] }[] };
    };
    assert.equal(body.type, "template");
    assert.equal(body.template.name, "lead_instant_reply");
    assert.deepEqual(body.template.components[0]!.parameters.map((p) => p.text), [
      "Sipho",
      "3 Bedroom House for Sale in Fourways",
    ]);

    const noTemplate = new CloudApiWhatsAppClient({ ...cfg, initialTemplateName: undefined });
    await assert.rejects(() => noTemplate.sendInitial("27825550134", "Sipho", "x"), /approved template/);
  } finally {
    globalThis.fetch = orig;
  }
});

test("Cloud API webhook signature (X-Hub-Signature-256)", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const sig = "sha256=" + createHmac("sha256", APP_SECRET).update(body, "utf8").digest("hex");
  assert.ok(cloudApiSignatureValid(body, sig, APP_SECRET));
  assert.ok(!cloudApiSignatureValid(body, sig.replace(/.$/, "0"), APP_SECRET));
  assert.ok(!cloudApiSignatureValid(body, "md5=abc", APP_SECRET));
  assert.ok(!cloudApiSignatureValid(body, undefined, APP_SECRET));
});

test("Cloud API extraction: text messages routed, statuses and non-text ignored", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        field: "messages",
        value: {
          messages: [
            { from: "27825550134", id: "wamid.1", type: "text", text: { body: "1" } },
            { from: "27735558877", id: "wamid.2", type: "image", image: { id: "img" } },
          ],
          statuses: [{ id: "wamid.0", status: "delivered" }],
        },
      }],
    }],
  };
  const actions = extractCloudApiLeadReplies(payload as Parameters<typeof extractCloudApiLeadReplies>[0]);
  assert.deepEqual(actions, [
    { kind: "lead-reply", phone: "27825550134", text: "1" },
    { kind: "ignored", reason: "non-text message" },
  ]);
});

test("Cloud API webhook end-to-end: GET verify + POST signed routes, bad sig 401", async () => {
  const received: { phone: string; text: string }[] = [];
  const server = createOperatorWebhookServer({
    cloudApi: { appSecret: APP_SECRET, verifyToken: VERIFY_TOKEN },
    onLeadReply: (phone, text) => { received.push({ phone, text }); },
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const okVerify = await fetch(`${base}/webhooks/cloud-api?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`);
  assert.equal(okVerify.status, 200);
  assert.equal(await okVerify.text(), "abc123");

  const badVerify = await fetch(`${base}/webhooks/cloud-api?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`);
  assert.equal(badVerify.status, 403);

  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { messages: [{ from: "27825550134", type: "text", text: { body: "2" } }] } }] }],
  });
  const sig = "sha256=" + createHmac("sha256", APP_SECRET).update(body, "utf8").digest("hex");
  const ok = await fetch(`${base}/webhooks/cloud-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": sig },
    body,
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(received, [{ phone: "27825550134", text: "2" }]);

  const bad = await fetch(`${base}/webhooks/cloud-api`, {
    method: "POST",
    headers: { "X-Hub-Signature-256": "sha256=00" },
    body,
  });
  assert.equal(bad.status, 401);

  server.close();
});

test("cloud api env config + transport registry", async () => {
  assert.equal(cloudApiConfigFromEnv({} as NodeJS.ProcessEnv), null);
  const c = cloudApiConfigFromEnv({ WA_CLOUD_TOKEN: "t", WA_CLOUD_PHONE_NUMBER_ID: "1" } as NodeJS.ProcessEnv);
  assert.equal(c!.apiVersion, "v21.0");

  const { clientFromEnv } = await import("../transport/operatorClient.js");
  // live with no transport config throws instead of silently choosing
  assert.throws(() => clientFromEnv({ WHATSAPP_MODE: "live" } as NodeJS.ProcessEnv), /cloud-api but missing env/);
  // explicit transports
  const evo = clientFromEnv({ WHATSAPP_MODE: "live", WHATSAPP_TRANSPORT: "evolution", EVOLUTION_URL: "https://e", EVOLUTION_API_KEY: "k", EVOLUTION_INSTANCE: "i" } as NodeJS.ProcessEnv);
  assert.equal(evo.mode, "live");
  const cloud = clientFromEnv({ WHATSAPP_MODE: "live", WHATSAPP_TRANSPORT: "cloud-api", WA_CLOUD_TOKEN: "t", WA_CLOUD_PHONE_NUMBER_ID: "1" } as NodeJS.ProcessEnv);
  assert.equal(cloud.mode, "live");
  assert.throws(() => clientFromEnv({ WHATSAPP_MODE: "live", WHATSAPP_TRANSPORT: "nonsense" } as NodeJS.ProcessEnv), /unknown WHATSAPP_TRANSPORT/);
  // dry-run stays the default
  assert.equal(clientFromEnv({} as NodeJS.ProcessEnv).mode, "dry-run");
});
