import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookAction } from "./operatorWebhook.js";

/**
 * Official WhatsApp Business Cloud API webhook shapes.
 * Verification: GET with hub.mode/hub.verify_token/hub.challenge.
 * Events: POST entry[].changes[].value with messages[] (inbound) and/or
 * statuses[] (delivery receipts - ignored).
 * Signature: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(raw body, app secret).
 */

export function cloudApiSignatureValid(rawBody: string, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const presented = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

interface CloudApiMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
}

interface CloudApiValue {
  messages?: CloudApiMessage[];
  statuses?: unknown[];
}

interface CloudApiPayload {
  object?: string;
  entry?: { changes?: { field?: string; value?: CloudApiValue }[] }[];
}

/** Extract all lead replies from one webhook POST (Meta batches events). */
export function extractCloudApiLeadReplies(payload: CloudApiPayload): WebhookAction[] {
  const out: WebhookAction[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const m of value?.messages ?? []) {
        const phone = (m.from ?? "").replace(/\D/g, "");
        if (!phone) {
          out.push({ kind: "ignored", reason: "no sender phone" });
          continue;
        }
        if (m.type !== "text" || !m.text?.body?.trim()) {
          out.push({ kind: "ignored", reason: "non-text message" });
          continue;
        }
        out.push({ kind: "lead-reply", phone, text: m.text.body.trim() });
      }
      // value.statuses (sent/delivered/read receipts) intentionally ignored
    }
  }
  return out;
}

/** GET verification handshake: returns the challenge to echo, or null. */
export function verifyCloudApiChallenge(
  query: Record<string, string | string[] | undefined>,
  verifyToken: string,
): string | null {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && token === verifyToken && typeof challenge === "string" && challenge.length > 0) {
    return challenge;
  }
  return null;
}
