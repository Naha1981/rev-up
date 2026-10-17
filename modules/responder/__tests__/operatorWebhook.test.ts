import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createOperatorWebhookServer, extractLeadReply, signatureValid } from "../webhooks/operatorWebhook.js";

const SECRET = "test-webhook-secret";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
}

const baileysPayload = (text: string, jid = "27825550134@s.whatsapp.net") => ({
  waAccountId: "acc-1",
  appId: "leadmachine-property",
  tenantId: "t1",
  message: {
    key: { remoteJid: jid, fromMe: false, id: "ABC123" },
    message: { conversation: text },
  },
  deliveredAt: "2026-10-09T09:00:00.000Z",
});

test("signature verification", () => {
  const body = JSON.stringify(baileysPayload("hello"));
  assert.ok(signatureValid(body, sign(body), SECRET));
  assert.ok(!signatureValid(body, sign(body + "x"), SECRET));
  assert.ok(!signatureValid(body, undefined, SECRET));
  assert.ok(!signatureValid(body, "deadbeef", SECRET));
});

test("extractLeadReply: plain conversation text", () => {
  const a = extractLeadReply(baileysPayload("2"));
  assert.deepEqual(a, { kind: "lead-reply", phone: "27825550134", text: "2" });
});

test("extractLeadReply: extendedTextMessage", () => {
  const p = baileysPayload("ignored");
  (p.message as { message: unknown }).message = { extendedTextMessage: { text: "yes, Saturday works" } };
  const a = extractLeadReply(p);
  assert.deepEqual(a, { kind: "lead-reply", phone: "27825550134", text: "yes, Saturday works" });
});

test("extractLeadReply ignores own messages, groups, and non-text", () => {
  const own = baileysPayload("hi");
  (own.message.key as { fromMe: boolean }).fromMe = true;
  assert.equal(extractLeadReply(own).kind, "ignored");

  const group = baileysPayload("hi", "120363@g.us");
  assert.equal(extractLeadReply(group).kind, "ignored");

  const image = baileysPayload("hi");
  (image.message as { message: unknown }).message = { imageMessage: { caption: "look" } };
  const r = extractLeadReply(image);
  assert.equal(r.kind, "ignored");
  assert.match((r as { reason: string }).reason, /non-text/);
});

test("HTTP server: signed POST routes to handler, bad signature 401, health ok", async () => {
  const received: { phone: string; text: string }[] = [];
  const server = createOperatorWebhookServer({
    secret: SECRET,
    onLeadReply: (phone, text) => { received.push({ phone, text }); },
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);

  const body = JSON.stringify(baileysPayload("1"));
  const ok = await fetch(`${base}/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": sign(body) },
    body,
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { routed: true, phones: ["27825550134"] });
  assert.deepEqual(received, [{ phone: "27825550134", text: "1" }]);

  const bad = await fetch(`${base}/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Signature": "00" },
    body,
  });
  assert.equal(bad.status, 401);

  const nosig = await fetch(`${base}/webhooks/whatsapp`, { method: "POST", body });
  assert.equal(nosig.status, 401);

  server.close();
});
