export interface ViewingSlot {
  id: string;
  /** ISO instant */
  start: Date;
  label: string; // human label in Africa/Johannesburg, e.g. "Sat 11 Oct, 10:00"
}

export interface CalendarProvider {
  getAvailableSlots(count: number, from?: Date): Promise<ViewingSlot[]>;
}

const DAY = 24 * 60 * 60 * 1000;

const fmt = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Candidate viewing times from the weekly template shared by every provider:
 * weekdays 17:00, Saturday 10:00 and 12:00 (Africa/Johannesburg), earliest tomorrow.
 */
export function candidateSlots(limit: number, from: Date = new Date()): ViewingSlot[] {
  const slots: ViewingSlot[] = [];
  let day = new Date(from.getTime() + DAY);
  while (slots.length < limit) {
    const jhbDay = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Johannesburg", weekday: "short" }).format(day);
    const hours = jhbDay === "Sat" ? [10, 12] : jhbDay === "Sun" ? [] : [17];
    for (const h of hours) {
      const start = jhbWallClock(day, h);
      if (start.getTime() > from.getTime()) {
        slots.push({ id: `slot-${start.getTime()}`, start, label: fmt.format(start) });
      }
      if (slots.length >= limit) break;
    }
    day = new Date(day.getTime() + DAY);
  }
  return slots;
}

/** STUB calendar: the weekly template with no real availability behind it. */
export class StubCalendarProvider implements CalendarProvider {
  async getAvailableSlots(count: number, from: Date = new Date()): Promise<ViewingSlot[]> {
    return candidateSlots(count, from);
  }
}

/** Build a Date for wall-clock hour h in Johannesburg on the same JHB calendar day as `day`. */
function jhbWallClock(day: Date, hour: number): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(day);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  // SAST is UTC+2, no DST
  return new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), hour - 2, 0, 0));
}
