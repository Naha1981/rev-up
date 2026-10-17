import type { CalendarProvider, ViewingSlot } from "../flow/slots.js";
import { candidateSlots } from "../flow/slots.js";
import type { ParsedEnquiry } from "../parser/types.js";
import type { GoogleAuth } from "./auth.js";

export interface GoogleCalendarConfig {
  calendarId: string;          // "primary" or a specific calendar id
  viewingDurationMin: number;  // default 30
  agentName: string;
}

export interface BookedEvent {
  eventId: string;
  htmlLink?: string;
}

const API = "https://www.googleapis.com/calendar/v3";

/**
 * LIVE Google Calendar provider: real free/busy filtering plus booking writes.
 * Created only when Google OAuth env credentials exist - the stub stays the default.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  constructor(
    private auth: GoogleAuth,
    private cfg: GoogleCalendarConfig,
  ) {}

  async getAvailableSlots(count: number, from: Date = new Date()): Promise<ViewingSlot[]> {
    const candidates = candidateSlots(count * 4, from); // over-generate, then filter by busy
    const timeMax = new Date(candidates[candidates.length - 1]!.start.getTime() + this.durationMs());
    const res = await this.auth.fetch(`${API}/freeBusy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: this.cfg.calendarId }],
      }),
    });
    if (!res.ok) throw new Error(`freeBusy failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      calendars: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    const busy = (data.calendars[this.cfg.calendarId]?.busy ?? []).map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

    const free = candidates.filter((c) => {
      const cStart = c.start.getTime();
      const cEnd = cStart + this.durationMs();
      return !busy.some((b) => cStart < b.end && b.start < cEnd);
    });
    return free.slice(0, count);
  }

  /** Writes the confirmed viewing to the agent's calendar. Returns the event for the handover note. */
  async bookSlot(slot: ViewingSlot, enquiry: ParsedEnquiry): Promise<BookedEvent> {
    const listing = enquiry.listingTitle ?? (enquiry.listingRef ? `listing ${enquiry.listingRef}` : "property");
    const end = new Date(slot.start.getTime() + this.durationMs());
    const res = await this.auth.fetch(`${API}/calendars/${encodeURIComponent(this.cfg.calendarId)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `Viewing: ${listing} - ${enquiry.leadName ?? "lead"}`,
        description: [
          `Lead: ${enquiry.leadName ?? "unknown"} (${enquiry.leadPhone ?? "no phone"})`,
          enquiry.leadEmail ? `Email: ${enquiry.leadEmail}` : null,
          `Source: ${enquiry.provider} enquiry`,
          enquiry.listingUrl ? `Listing: ${enquiry.listingUrl}` : null,
          `Booked automatically by LeadMachine Property - confirm address with the lead.`,
        ].filter(Boolean).join("\n"),
        start: { dateTime: slot.start.toISOString(), timeZone: "Africa/Johannesburg" },
        end: { dateTime: end.toISOString(), timeZone: "Africa/Johannesburg" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
      }),
    });
    if (!res.ok) throw new Error(`events.insert failed: ${res.status} ${await res.text()}`);
    const ev = (await res.json()) as { id: string; htmlLink?: string };
    return { eventId: ev.id, htmlLink: ev.htmlLink };
  }

  private durationMs(): number {
    return this.cfg.viewingDurationMin * 60_000;
  }
}
