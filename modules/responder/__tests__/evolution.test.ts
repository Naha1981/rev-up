import { test } from "node:test";
import assert from "node:assert/strict";
import { createOperatorWebhookServer } from "../webhooks/operatorWebhook.js";
import { extractEvolutionLeadReply } from "../webhooks/evolutionWebhook.js";
import { EvolutionApiClient, evolutionConfigFromEnv } from "../transport/evolutionClient.js";

const TOKEN = "evo-shared-token";

const upsert = (text: string, jid = "27825550134@s.whatsapp.net", fromMe = false) => ({
  event: "messages.upsert",
  instance: "demo-instance",
  data: {
    key: { remoteJid: jid, fromMe, id: "EVO123" },
    pushName: "Sipho",
    message: { conversation: text } as Record<string, unknown>,
    messageType: "conversation",
  },
});

test("Evolution client posts to sendText with apikey header", async () => {
  const calls: { url: string; apikey?: string; body: Record<string, unknown> }[] = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      apikey: new Headers(init?.headers).get("apikey") ?? undefined,
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify({ key: { id: "x" } }), { status: 201 });
  }) as typeof fetch;
  try {
    const c = new EvolutionApiClient({ url: "https://evo.example.com/", apiKey: "k-1", instance: "inst-1" });
    await c.sendText("27825550134", "hello lead");
  } finally {
    globalThis.fetch = origFetch;
  }
  assert.equal(calls[0]!.url, "https://evo.example.com/message/sendText/inst-1");
  assert.equal(calls[0]!.apikey, "k-1");
  assert.deepEqual(calls[0]!.body, { number: "27825550134", text: "hello lead", linkPreview: false });
});

test("Evolution extraction: text, extendedText, and ignores", () => {
  assert.deepEqual(extractEvolutionLeadReply(upsert("2")), { kind: "lead-reply", phone: "27825550134", text: "2" });

  const ext = upsert("ignored");
  ext.data.message = { extendedTextMessage: { text: "Saturday please" } };
  assert.deepEqual(extractEvolutionLeadReply(ext), { kind: "lead-reply", phone: "27825550134", text: "Saturday please" });

  assert.equal(extractEvolutionLeadReply(upsert("hi", "27825550134@s.whatsapp.net", true)).kind, "ignored"); // fromMe
  assert.equal(extractEvolutionLeadReply(upsert("hi", "120363@g.us")).kind, "ignored"); // group
  assert.equal(extractEvolutionLeadReply(upsert("hi", "status@broadcast")).kind, "ignored"); // broadcast
  const img = upsert("x");
  img.data.message = { imageMessage: { caption: "c" } };
  assert.equal(extractEvolutionLeadReply(img).kind, "ignored"); // non-text
  const conn = { event: "connection.update", data: {} };
  const r = extractEvolutionLeadReply(conn as Parameters<typeof extractEvolutionLeadReply>[0]);
  assert.equal(r.kind, "ignored");
});

test("Evolution webhook path: token required, routes replies", async () => {
  const received: { phone: string; text: string }[] = [];
  const server = createOperatorWebhookServer({
    evolutionToken: TOKEN,
    onLeadReply: (phone, text) => { received.push({ phone, text }); },
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  // operator path disabled when no secret
  const op = await fetch(`${base}/webhooks/whatsapp`, { method: "POST", body: "{}" });
  assert.equal(op.status, 404);

  const body = JSON.stringify(upsert("3"));
  const ok = await fetch(`${base}/webhooks/evolution`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Token": TOKEN },
    body,
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(received, [{ phone: "27825550134", text: "3" }]);

  const bad = await fetch(`${base}/webhooks/evolution`, {
    method: "POST",
    headers: { "X-Webhook-Token": "wrong" },
    body,
  });
  assert.equal(bad.status, 401);

  const missing = await fetch(`${base}/webhooks/evolution`, { method: "POST", body });
  assert.equal(missing.status, 401);

  server.close();
});

test("evolution env config", () => {
  assert.equal(evolutionConfigFromEnv({} as NodeJS.ProcessEnv), null);
  const cfg = evolutionConfigFromEnv({ EVOLUTION_URL: "https://e", EVOLUTION_API_KEY: "k", EVOLUTION_INSTANCE: "i" } as NodeJS.ProcessEnv);
  assert.equal(cfg!.instance, "i");
});
