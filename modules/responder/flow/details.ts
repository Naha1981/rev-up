/** Details a customer already gave in their message, so the instant reply
 * acknowledges them instead of asking again. */

export interface GivenDetails {
  partySize?: string;
  when?: string;
  dietary: string[];
}

const DAY = /\b(this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tonight|tomorrow)\b/i;
const TIME = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i;
const DAYPART = /\b(morning|afternoon|evening|lunch(?:time)?|dinner|breakfast)\b/i;
const PARTY = [
  /\btable\s+for\s+(\d{1,2})\b/i,
  /\bparty\s+of\s+(\d{1,2})\b/i,
  /\b(\d{1,2})\s+(?:people|persons|guests|pax)\b/i,
];
const DIETARY: [RegExp, string][] = [
  [/vegetarian/i, "vegetarian"],
  [/vegan/i, "vegan"],
  [/halaal|halal/i, "halaal"],
  [/gluten[- ]?free/i, "gluten-free"],
  [/allerg/i, "allergy"],
];

export function extractGivenDetails(text: string): GivenDetails {
  const out: GivenDetails = { dietary: [] };
  for (const re of PARTY) {
    const m = re.exec(text);
    if (m) { out.partySize = m[1]; break; }
  }
  const day = DAY.exec(text);
  const time = TIME.exec(text);
  const part = DAYPART.exec(text);
  if (day || time) {
    let dayBit = day ? day[0].trim() : "";
    if (!time && part && dayBit && !/^(today|tonight|tomorrow)$/i.test(dayBit)
        && !dayBit.toLowerCase().includes(part[0].toLowerCase())) {
      dayBit = `${dayBit} ${part[0].trim()}`;
    }
    out.when = dayBit && time ? `${dayBit} at ${time[0].trim()}` : (dayBit || time![0].trim());
  }
  for (const [re, label] of DIETARY) {
    if (re.test(text) && !out.dietary.includes(label)) out.dietary.push(label);
  }
  return out;
}
