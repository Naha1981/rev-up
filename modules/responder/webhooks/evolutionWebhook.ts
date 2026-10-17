import type { WebhookAction } from "./operatorWebhook.js";

/**
 * Evolution API v2 webhook payload (messages.upsert). Evolution wraps the
 * same Baileys message shape as the Operator, one level deeper (data.*).
 */
export interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: Record<string, unknown>;
    messageType?: string;
    pushName?: string;
  };
}

export function isEvolutionPayload(body: unknown): body is EvolutionWebhookPayload {
  return typeof body === "object" && body !== null && typeof (body as { event?: unknown }).event === "string";
}

export function extractEvolutionLeadReply(payload: EvolutionWebhookPayload): WebhookAction {
  if (payload.event !== "messages.upsert") {
    return { kind: "ignored", reason: `event ${payload.event ?? "unknown"}` };
  }
  const data = payload.data;
  if (!data?.key) return { kind: "ignored", reason: "no message key" };
  if (data.key.fromMe) return { kind: "ignored", reason: "own outbound message" };

  const jid = data.key.remoteJid ?? "";
  if (jid.endsWith("@g.us")) return { kind: "ignored", reason: "group message" };
  if (jid.endsWith("@broadcast") || jid === "status@broadcast") return { kind: "ignored", reason: "broadcast" };
  const phone = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
  if (!phone) return { kind: "ignored", reason: "no sender phone" };

  const inner = data.message ?? {};
  const text =
    (typeof inner.conversation === "string" && inner.conversation) ||
    (typeof (inner.extendedTextMessage as { text?: string } | undefined)?.text === "string" &&
      (inner.extendedTextMessage as { text: string }).text) ||
    "";
  if (!text.trim()) return { kind: "ignored", reason: "non-text message" };

  return { kind: "lead-reply", phone, text: text.trim() };
}
