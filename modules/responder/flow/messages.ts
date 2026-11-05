import { presetFor, type IndustryPreset, type QuestionKey } from "../presets.js";
import { extractGivenDetails, type GivenDetails } from "./details.js";
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
  const given = extractGivenDetails(enquiry.message ?? "");
  const lines = [
    subject
      ? `Hi ${firstName(enquiry.leadName)}, thanks for your enquiry about ${subject}${enquiry.price ? ` (${enquiry.price})` : ""}.`
      : `Hi ${firstName(enquiry.leadName)}, thanks for getting in touch.`,
    `I'm ${agentName}'s assistant - ${p.cta}`,
  ];

  // Acknowledge what the customer already told us instead of asking again.
  const noted: string[] = [];
  if (given.partySize) noted.push(`${given.partySize} people`);
  if (given.when) noted.push(given.when);
  if (given.dietary.length) noted.push(`${given.dietary.join(" and ")} noted`);
  if (noted.length) lines.push(`Noted: ${noted.join(", ")}.`);

  if (menuContext) {
    lines.push(`From our current menu: ${menuContext}`);
    lines.push(...dietaryAnswers(given, menuContext));
  }

  const remaining = p.questions.filter((_, i) => !answered(p.questionKeys[i] ?? "what", given));
  if (remaining.length === 1) {
    lines.push("One quick question:", `1) ${remaining[0]}`);
  } else if (remaining.length === 2) {
    lines.push("Two quick questions:", `1) ${remaining[0]}`, `2) ${remaining[1]}`);
  } else if (remaining.length >= 3) {
    lines.push(
      "Three quick questions so I can help you right away:",
      `1) ${remaining[0]}`,
      `2) ${remaining[1]}`,
      `3) ${remaining[2]}`,
    );
  }
  lines.push(p.nextStep);
  return lines.join("\n");
}

function answered(key: QuestionKey, given: GivenDetails): boolean {
  switch (key) {
    case "party": return given.partySize !== undefined;
    case "when": return given.when !== undefined;
    case "dietary": return given.dietary.length > 0;
    default: return false;
  }
}

/** Answer "what vegetarian options do you have?" straight from the menu when
 * items carry dietary tags ("Name R129 (vegetarian)"); honest fallback otherwise. */
function dietaryAnswers(given: GivenDetails, menuContext: string): string[] {
  const lines: string[] = [];
  const entries = menuContext.split(";").map((e) => e.trim()).filter(Boolean);
  for (const need of given.dietary) {
    if (need === "allergy") {
      lines.push("Please tell us the allergy and we will make sure the kitchen knows.");
      continue;
    }
    const matches = entries.filter((e) => e.toLowerCase().includes(`(${need}`) || e.toLowerCase().includes(`, ${need}`));
    if (matches.length) {
      lines.push(`${need[0]!.toUpperCase()}${need.slice(1)} options: ${matches.join("; ")}`);
    } else {
      lines.push(`I'll check with the kitchen on ${need} options and let you know.`);
    }
  }
  return lines;
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
