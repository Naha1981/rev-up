/** Details a customer already gave in their message, so the instant reply
 * acknowledges them instead of asking again. */

export interface GivenDetails {
  partySize?: string;
  when?: string;
  dietary: string[];
  /** Clear ask in the message, e.g. "table" for a booking request. */
  intent?: string;
  /** The customer asked what something costs. */
  askedPrice: boolean;
}

const DAY = /\b(this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tonight|tomorrow)\b/i;
const TIME = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i;
const DAYPART = /\b(morning|afternoon|evening|lunch(?:time)?|dinner|breakfast)\b/i;
const NUM_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13",
  fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18",
  nineteen: "19", twenty: "20",
};
const NUM = "(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)";
const PARTY = [
  new RegExp(`\\btable\\s+for\\s+${NUM}\\b`, "i"),
  new RegExp(`\\bparty\\s+of\\s+${NUM}\\b`, "i"),
  new RegExp(`\\b${NUM}\\s+(?:people|persons|guests|pax)\\b`, "i"),
];
const DIETARY: [RegExp, string][] = [
  [/vegetarian/i, "vegetarian"],
  [/vegan/i, "vegan"],
  [/halaal|halal/i, "halaal"],
  [/gluten[- ]?free/i, "gluten-free"],
  [/allerg/i, "allergy"],
];

export function extractGivenDetails(text: string): GivenDetails {
  const out: GivenDetails = { dietary: [], askedPrice: /\b(cost|price|prices|how much)\b/i.test(text) };
  for (const re of PARTY) {
    const m = re.exec(text);
    if (m) { out.partySize = NUM_WORDS[m[1]!.toLowerCase()] ?? m[1]; break; }
  }
  if (/\b(table|booking|book a|reserve|reservation)\b/i.test(text)) out.intent = "table";
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
