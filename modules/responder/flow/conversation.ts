import type { ParsedEnquiry } from "../parser/types.js";
import type { CalendarProvider, ViewingSlot } from "./slots.js";
import * as msg from "./messages.js";
import { slotToJson, slotFromJson, type ConvoSnapshot } from "../store/leadStore.js";

export interface BookingWrite {
  eventId: string;
  htmlLink?: string;
}

/** CalendarProvider plus an optional live booking write (Google provider has one; the stub does not). */
export type BookingCalendar = CalendarProvider & {
  bookSlot?: (slot: ViewingSlot, enquiry: ParsedEnquiry) => Promise<BookingWrite>;
};

export type ConversationState =
  | "QUALIFYING"      // collecting budget / finance / timing preference
  | "SLOTS_OFFERED"   // numbered slots sent, waiting for a pick
  | "BOOKED";         // slot confirmed

export interface LeadQualification {
  budgetRaw?: string;
  finance?: "pre-approved" | "cash" | "bond-not-yet" | "unknown";
  timingPreference?: string;
}

export interface ReplyResult {
  messages: string[];
  state: ConversationState;
  bookedSlot?: ViewingSlot;
}

export interface ConversationOptions {
  agentName: string;
  calendar: BookingCalendar;
  preset?: import("../presets.js").IndustryPreset;
  /** Connection state of the workspace; undefined means "unknown, assume connected". */
  calendarConnected?: boolean;
  whatsappConnected?: boolean;
  /** Short "name Rprice, ..." line from the business's saved menu, when available. */
  menuContext?: string;
}

/** Extracts whatever qualification facts appear in free text. Tolerant: answers can arrive in any order, in one message or many. */
export function extractQualification(text: string, q: LeadQualification): string[] {
  const stillMissing: string[] = [];

  const budget = /(?:r\s?\d[\d\s,.]*(?:\s?(?:m|million|k))?|\d+(?:[.,]\d+)?\s?(?:m|million)\b)/i.exec(text);
  if (!q.budgetRaw && budget && /budget|range|price|around|about|r\s?\d|million|\bm\b/i.test(text)) {
    q.budgetRaw = budget[0].trim();
  }

  if (!q.finance) {
    if (/pre-?approv/i.test(text)) q.finance = "pre-approved";
    else if (/\bcash\b/i.test(text)) q.finance = "cash";
    else if (/bond|finance|loan|not yet|still need/i.test(text)) q.finance = "bond-not-yet";
  }

  if (!q.timingPreference) {
    if (/satur|sun|weekend|morning/i.test(text)) q.timingPreference = "weekend/morning";
    else if (/weekday|after\s?(5|work)|evening|late afternoon/i.test(text)) q.timingPreference = "weekday late afternoon";
  }

  if (!q.budgetRaw) stillMissing.push("budget");
  if (!q.finance) stillMissing.push("finance");
  return stillMissing;
}

/**
 * Per-lead qualification + viewing-booking conversation.
 * Text-only, numbered-reply style (the WhatsApp engine is text-only).
 */
export class LeadConversation {
  state: ConversationState = "QUALIFYING";
  readonly qualification: LeadQualification = {};
  bookedSlot?: ViewingSlot;
  bookedEvent?: BookingWrite;
  bookingWriteFailed = false;
  private offeredSlots: ViewingSlot[] = [];

  constructor(
    readonly enquiry: ParsedEnquiry,
    private opts: ConversationOptions,
  ) {}

  /** The instant first reply sent seconds after the enquiry arrives. */
  initialMessages(): string[] {
    return [
      msg.instantReply(this.enquiry, this.opts.agentName, this.opts.preset, this.opts.menuContext, {
        calendarConnected: this.opts.calendarConnected,
        whatsappConnected: this.opts.whatsappConnected,
      }),
    ];
  }

  async handleReply(text: string): Promise<ReplyResult> {
    if (this.state === "QUALIFYING") return this.handleQualifying(text);
    if (this.state === "SLOTS_OFFERED") return this.handleSlotPick(text);
    return { messages: [], state: this.state };
  }

  private async handleQualifying(text: string): Promise<ReplyResult> {
    const missing = extractQualification(text, this.qualification);

    // A lead who goes straight to "can I view Saturday" should not be interrogated further.
    const eagerToView = /view|slot|book|saturday|sunday|when can|come see/i.test(text);
    if (missing.length > 0 && !eagerToView) {
      return { messages: [msg.reaskBudget()], state: this.state };
    }

    this.offeredSlots = await this.opts.calendar.getAvailableSlots(3);
    this.state = "SLOTS_OFFERED";
    return { messages: [msg.slotOffer(this.offeredSlots)], state: this.state };
  }

  private async handleSlotPick(text: string): Promise<ReplyResult> {
    const pick = /^\s*([123])\s*$/.exec(text) ?? /\b(?:option|number|slot)?\s*([123])\b/.exec(text);
    if (!pick) {
      return { messages: [msg.slotUnclear()], state: this.state };
    }
    const slot = this.offeredSlots[Number(pick[1]) - 1];
    if (!slot) {
      return { messages: [msg.slotUnclear()], state: this.state };
    }
    this.state = "BOOKED";
    this.bookedSlot = slot;
    if (this.opts.calendar.bookSlot) {
      try {
        this.bookedEvent = await this.opts.calendar.bookSlot(slot, this.enquiry);
      } catch {
        // The lead still gets their confirmation; the agent handover flags the failed write.
        this.bookingWriteFailed = true;
      }
    }
    return {
      messages: [msg.bookingConfirmation(slot, this.enquiry, this.opts.agentName)],
      state: this.state,
      bookedSlot: slot,
    };
  }

  /** Serializable state for durable storage (Postgres in production). */
  snapshot(): ConvoSnapshot {
    return {
      enquiry: this.enquiry,
      qualification: this.qualification,
      state: this.state,
      offeredSlots: this.offeredSlots.map(slotToJson),
      bookedSlot: this.bookedSlot ? slotToJson(this.bookedSlot) : undefined,
      bookedEvent: this.bookedEvent,
      bookingWriteFailed: this.bookingWriteFailed,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Rebuild a conversation from its stored snapshot after a restart. */
  static revive(
    enquiry: ParsedEnquiry,
    opts: ConversationOptions,
    snap: ConvoSnapshot,
  ): LeadConversation {
    const convo = new LeadConversation(enquiry, opts);
    convo.state = snap.state;
    Object.assign(convo.qualification, snap.qualification);
    convo.offeredSlots = snap.offeredSlots.map(slotFromJson);
    convo.bookedSlot = snap.bookedSlot ? slotFromJson(snap.bookedSlot) : undefined;
    convo.bookedEvent = snap.bookedEvent;
    convo.bookingWriteFailed = snap.bookingWriteFailed;
    return convo;
  }

  /** Internal note for the agent about where this lead stands. */
  handoverNote(): string {
    const notes: string[] = [];
    if (this.bookedEvent?.htmlLink) notes.push(`Calendar event: ${this.bookedEvent.htmlLink}`);
    if (this.bookingWriteFailed) notes.push("WARNING: calendar write failed - create the viewing event manually");
    if (this.qualification.budgetRaw) notes.push(`Budget: ${this.qualification.budgetRaw}`);
    if (this.qualification.finance) notes.push(`Finance: ${this.qualification.finance}`);
    if (this.qualification.timingPreference) notes.push(`Prefers: ${this.qualification.timingPreference}`);
    if (this.enquiry.message) notes.push(`Lead said: "${this.enquiry.message.slice(0, 200)}"`);
    return msg.agentHandover(this.enquiry, this.bookedSlot, notes);
  }
}

