import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type Server } from "node:http";
import { extractEvolutionLeadReply, isEvolutionPayload, type EvolutionWebhookPayload } from "./evolutionWebhook.js";
import { cloudApiSignatureValid, extractCloudApiLeadReplies, verifyCloudApiChallenge } from "./cloudApiWebhook.js";

export interface OperatorWebhookPayload {
  waAccountId: string;
  appId: string;
  tenantId: string;
  message?: Record<string, unknown>;
  deliveredAt?: string;
}

export type WebhookAction =
  | { kind: "lead-reply"; phone: string; text: string }
  | { kind: "ignored"; reason: string };

/** Verify X-Webhook-Signature: hex HMAC-SHA256 of the exact raw body with WEBHOOK_SECRET. */
export function signatureValid(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Pull (phone, text) out of a raw Baileys WAMessage. Returns null when there is nothing to route. */
export function extractLeadReply(payload: OperatorWebhookPayload): WebhookAction {
  const msg = payload.message as
    | { key?: { remoteJid?: string; fromMe?: boolean }; message?: Record<string, unknown> }
    | undefined;
  if (!msg?.key) return { kind: "ignored", reason: "no message key" };
  if (msg.key.fromMe) return { kind: "ignored", reason: "own outbound message" };

  const jid = msg.key.remoteJid ?? "";
  if (jid.endsWith("@g.us")) return { kind: "ignored", reason: "group message" };
  const phone = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
  if (!phone) return { kind: "ignored", reason: "no sender phone" };

  const inner = msg.message ?? {};
  const text =
    (typeof inner.conversation === "string" && inner.conversation) ||
    (typeof (inner.extendedTextMessage as { text?: string } | undefined)?.text === "string" &&
      (inner.extendedTextMessage as { text: string }).text) ||
    "";
  if (!text.trim()) return { kind: "ignored", reason: "non-text message" };

  return { kind: "lead-reply", phone, text: text.trim() };
}

export interface WebhookServerDeps {
  /** Operator HMAC secret. When unset, the Operator path returns 404. */
  secret?: string;
  path?: string; // default /webhooks/whatsapp
  /** Evolution shared-secret token (x-webhook-token header) for POST /webhooks/evolution. When unset, that path returns 404. */
  evolutionToken?: string;
  /** Official Cloud API: app secret (POST HMAC) and verify token (GET handshake) for /webhooks/cloud-api. Both required for that path. */
  cloudApi?: { appSecret: string; verifyToken: string };
  onLeadReply: (phone: string, text: string) => Promise<void> | void;
}

/**
 * HTTP receiver for inbound WhatsApp webhooks, two transports behind one server:
 * - POST /webhooks/whatsapp (Operator): X-Webhook-Signature HMAC-SHA256 of the
 *   exact raw body with the shared secret. Active only when deps.secret is set.
 * - POST /webhooks/evolution (Evolution API v2): shared-secret x-webhook-token
 *   header (Evolution does not sign payloads; the token is configured as a
 *   custom webhook header on the instance). Active only when deps.evolutionToken is set.
 */
export function createOperatorWebhookServer(deps: WebhookServerDeps): Server {
  const operatorPath = deps.path ?? "/webhooks/whatsapp";
  const evolutionPath = "/webhooks/evolution";
  const cloudApiPath = "/webhooks/cloud-api";

  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
      return;
    }
    // Meta webhook verification handshake
    if (req.method === "GET" && pathname === cloudApiPath) {
      if (!deps.cloudApi) {
        res.writeHead(404).end();
        return;
      }
      const challenge = verifyCloudApiChallenge(
        Object.fromEntries(url.searchParams.entries()),
        deps.cloudApi.verifyToken,
      );
      if (challenge === null) {
        res.writeHead(403).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge);
      return;
    }
    if (req.method !== "POST" || (pathname !== operatorPath && pathname !== evolutionPath && pathname !== cloudApiPath)) {
      res.writeHead(404).end();
      return;
    }
    if (pathname === cloudApiPath && !deps.cloudApi) {
      res.writeHead(404).end();
      return;
    }
    if (pathname === operatorPath && !deps.secret) {
      res.writeHead(404).end();
      return;
    }
    if (pathname === evolutionPath && !deps.evolutionToken) {
      res.writeHead(404).end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", async () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");

      let actions: WebhookAction[];
      if (pathname === cloudApiPath) {
        const sig = req.headers["x-hub-signature-256"];
        const presented = Array.isArray(sig) ? sig[0] : sig;
        if (!cloudApiSignatureValid(rawBody, presented, deps.cloudApi!.appSecret)) {
          res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad signature" }));
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "invalid json" }));
          return;
        }
        actions = extractCloudApiLeadReplies(payload as Parameters<typeof extractCloudApiLeadReplies>[0]);
      } else if (pathname === evolutionPath) {
        const token = req.headers["x-webhook-token"];
        const presented = Array.isArray(token) ? token[0] : token;
        if (!presented || presented !== deps.evolutionToken) {
          res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad token" }));
          return;
        }
        let payload: EvolutionWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as EvolutionWebhookPayload;
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "invalid json" }));
          return;
        }
        if (!isEvolutionPayload(payload)) {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "not an evolution payload" }));
          return;
        }
        actions = [extractEvolutionLeadReply(payload)];
      } else {
        const signature = req.headers["x-webhook-signature"];
        if (!signatureValid(rawBody, Array.isArray(signature) ? signature[0] : signature, deps.secret!)) {
          res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad signature" }));
          return;
        }
        let payload: OperatorWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as OperatorWebhookPayload;
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "invalid json" }));
          return;
        }
        actions = [extractLeadReply(payload)];
      }

      const routed: string[] = [];
      for (const action of actions) {
        if (action.kind === "lead-reply") {
          try {
            await deps.onLeadReply(action.phone, action.text);
            routed.push(action.phone);
          } catch (err) {
            res.writeHead(500, { "Content-Type": "application/json" }).end(
              JSON.stringify({ error: `handler failed: ${(err as Error).message}` }),
            );
            return;
          }
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify(routed.length > 0 ? { routed: true, phones: routed } : { routed: false }),
      );
    });
  });
}
