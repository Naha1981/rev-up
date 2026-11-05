import { parseEnquiry, type ParsedEnquiry } from "./parser/index.js";
import type { WhatsAppClient } from "./transport/operatorClient.js";
import { LeadConversation, type ConversationOptions } from "./flow/conversation.js";
import type { LeadStore } from "./store/leadStore.js";
import type { ViewingSlot } from "./flow/slots.js";

export interface PipelineDeps {
  whatsApp: WhatsAppClient;
  store: LeadStore;
  convoOpts: ConversationOptions;
  /** Dry-run only: synthetic sender number for try-it enquiries without one. */
  testSenderPhone?: string;
}

export type PipelineStatus = "replied" | "needs_review";

export interface PipelineResult {
  status: PipelineStatus;
  enquiry: ParsedEnquiry;
  sent: { to: string; text: string }[];
  reason?: string;
}

export const MIN_CONFIDENCE = 0.5;

/**
 * The core loop: raw enquiry email in -> parse -> instant WhatsApp reply out.
 * No reply (not even dry-run) is attempted when the parse is not trustworthy
 * or the lead has no phone number - those go to the agent for manual handling.
 */
export async function processEnquiryEmail(
  raw: string,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const enquiry = parseEnquiry(raw);
  // Dry-run try-it: a real WhatsApp message always carries the sender's number,
  // so the console injects one when the typed enquiry has none.
  if (!enquiry.leadPhone && deps.testSenderPhone) {
    enquiry.leadPhone = deps.testSenderPhone;
  }

  if (!enquiry.leadPhone) {
    return { status: "needs_review", enquiry, sent: [], reason: "no usable SA phone number found in enquiry" };
  }
  if (enquiry.confidence < MIN_CONFIDENCE) {
    return {
      status: "needs_review",
      enquiry,
      sent: [],
      reason: `parse confidence ${enquiry.confidence} below ${MIN_CONFIDENCE} (missing: ${enquiry.missing.join(", ") || "none"})`,
    };
  }
  return replyToEnquiry(enquiry, deps);
}

/**
 * Dry-run try-it path: the typed text IS the customer's WhatsApp message, not a
 * portal email, so the email-parse gates (listing ref, name, confidence) do not
 * apply. The sender's number always exists on a real WhatsApp message; the
 * console injects a synthetic one when the text has none.
 */
export async function processDirectMessage(
  raw: string,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const parsed = parseEnquiry(raw);
  const enquiry: ParsedEnquiry = {
    ...parsed,
    leadPhone: parsed.leadPhone ?? deps.testSenderPhone,
    message: parsed.message ?? raw,
    confidence: 1,
    missing: [],
  };
  if (!enquiry.leadPhone) {
    return { status: "needs_review", enquiry, sent: [], reason: "no usable SA phone number found in enquiry" };
  }
  return replyToEnquiry(enquiry, deps);
}

async function replyToEnquiry(
  enquiry: ParsedEnquiry,
  deps: PipelineDeps,
): Promise<PipelineResult> {
  const sent: { to: string; text: string }[] = [];
  const convo = new LeadConversation(enquiry, deps.convoOpts);

  const texts = convo.initialMessages();
  if (deps.whatsApp.sendInitial) {
    // Official-API transport: first contact must be the approved template.
    // The full free-text opener follows only once the lead replies (24h window).
    const listing =
      enquiry.listingTitle ??
      (enquiry.listingRef ? `listing ${enquiry.listingRef}` : deps.convoOpts.preset?.about ?? "your enquiry");
    const first = (enquiry.leadName ?? "").trim().split(/\s+/)[0] || "there";
    await deps.whatsApp.sendInitial(enquiry.leadPhone!, first, listing);
    sent.push({ to: enquiry.leadPhone!, text: `[template] ${texts[0]!}` });
  } else {
    for (const text of texts) {
      await deps.whatsApp.sendText(enquiry.leadPhone!, text);
      sent.push({ to: enquiry.leadPhone!, text });
    }
  }
  await deps.store.saveConvo(enquiry.leadPhone!, convo.snapshot());
  return { status: "replied", enquiry, sent };
}

/** Handle an inbound WhatsApp reply from a lead (later: arrives via the Operator's signed webhook). */
export async function handleLeadReply(
  phone: string,
  text: string,
  deps: PipelineDeps & { agentPhone?: string },
): Promise<{ messages: string[]; bookedSlot?: ViewingSlot } | { error: string }> {
  const snap = await deps.store.getConvo(phone);
  if (!snap) return { error: `no active conversation for ${phone}` };
  const convo = LeadConversation.revive(snap.enquiry, deps.convoOpts, snap);

  const result = await convo.handleReply(text);
  for (const m of result.messages) {
    await deps.whatsApp.sendText(phone, m);
  }
  await deps.store.saveConvo(phone, convo.snapshot());
  if (result.bookedSlot) {
    // Calendar write happens inside the conversation when the provider supports it.
    // The handover note is logged via the same (dry-run) channel if an agent phone is set.
    if (deps.agentPhone) {
      await deps.whatsApp.sendText(deps.agentPhone, convo.handoverNote());
    }
  }
  return { messages: result.messages, bookedSlot: result.bookedSlot };
}
