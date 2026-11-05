import { presetFor, type IndustryPreset } from "../presets.js";
import type { ParsedEnquiry } from "../parser/types.js";
import type { ViewingSlot } from "./slots.js";

export function firstName(name?: string): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0]!;
}

export function instantReply(
  enquiry: ParsedEnquiry,
  agentName: string,
  preset?: IndustryPreset,
  menuContext?: string,
): string {
  const p = preset ?? presetFor("real_estate"); // historical default copy
  const named = enquiry.listingTitle ?? (enquiry.listingRef ? `listing ${enquiry.listingRef}` : null);
  const subject = named ?? (p.about || null);
  const [q1, q2, q3] = p.questions;
  const lines = [
    subject
      ? `Hi ${firstName(enquiry.leadName)}, thanks for your enquiry about ${subject}${enquiry.price ? ` (${enquiry.price})` : ""}.`
      : `Hi ${firstName(enquiry.leadName)}, thanks for getting in touch.`,
    `I'm ${agentName}'s assistant - ${p.cta}`,
  ];
  if (menuContext) lines.push(`From our current menu: ${menuContext}`);
  lines.push(
    "Three quick questions so I can help you right away:",
    `1) ${q1}`,
    `2) ${q2}`,
    `3) ${q3}`,
  );
  return lines.join("\n");
}

export function slotOffer(slots: ViewingSlot[]): string {
  const lines = slots.map((s, i) => `${i + 1}) ${s.label}`);
  return [
    `Great, thanks. Here are the next open viewing times:`,
    ...lines,
    `Reply with 1, 2 or 3 and I'll lock it in.`,
  ].join("\n");
}

export function bookingConfirmation(slot: ViewingSlot, enquiry: ParsedEnquiry, agentName: string): string {
  const listing = enquiry.listingTitle ?? (enquiry.listingRef ? `listing ${enquiry.listingRef}` : "the property");
  return [
    `Done - you're booked to view ${listing} on ${slot.label}.`,
    `${agentName} will confirm the exact address and meet you there.`,
    `Reply CHANGE any time to pick another slot.`,
  ].join("\n");
}

export function reaskBudget(): string {
  return `Thanks! Just so I book you into the right places - roughly what price range are you looking in? (e.g. R1.8m-R2.2m)`;
}

export function slotUnclear(): string {
  return `Sorry, I didn't catch that - reply with 1, 2 or 3 for one of the viewing times above.`;
}

/** Internal handover note for the agent (dry-run logged; later: WhatsApp/email to the agent). */
export function agentHandover(enquiry: ParsedEnquiry, slot: ViewingSlot | undefined, notes: string[]): string {
  return [
    `LEAD UPDATE - ${enquiry.leadName ?? "Unknown lead"} (${enquiry.leadPhone ?? "no phone"})`,
    `Listing: ${enquiry.listingTitle ?? enquiry.listingRef ?? "unknown"}`,
    slot ? `Viewing: ${slot.label}` : `Viewing: not booked yet`,
    ...notes.map((n) => `- ${n}`),
  ].join("\n");
}
