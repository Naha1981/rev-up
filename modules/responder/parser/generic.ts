import type { ParsedEmail, ParsedEnquiry } from "./types.js";
import { extractFields, firstUrlMatching } from "./labels.js";
import { extractPhoneFromText, normalizeSaPhone } from "./phones.js";
import { buildResult } from "./property24.js";

/** Fallback parser for unknown/forwarded enquiry formats. Confidence is capped in buildResult. */
export function parseGeneric(email: ParsedEmail): ParsedEnquiry {
  const { text, from } = email;
  const f = extractFields(text);

  let name = f.name;
  if (!name) {
    // Free-text intro: "Hi, my name is Lerato Mokoena (082...) ..."
    const intro = /(?:my name is|this is|i am|i'm)\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})/.exec(text);
    if (intro) name = intro[1]!.trim();
  }
  if (!name) {
    const display = /^"?([^"<@]+)"?\s*</.exec(from);
    if (display && !/property24|privateproperty|no-?reply|donotreply/i.test(display[1]!)) {
      name = display[1]!.trim();
    }
  }

  const phone = normalizeSaPhone(f.phoneRaw) ?? extractPhoneFromText(text)?.normalized ?? undefined;
  const phoneRaw = f.phoneRaw ?? extractPhoneFromText(text)?.raw;
  const listingUrl = firstUrlMatching(text, /(^|\.)(property24\.com|privateproperty\.co\.za)/i);

  let listingTitle = f.listingTitle;
  if (!listingTitle) {
    // Free text: "interested in the 2 Bedroom Apartment to Rent in Sandton Central listed at R14,500"
    const m = /interested in (?:the\s+)?([^.,\n]+?)(?:\s+(?:listed|priced|asking|at|for)(?:\s+(?:at|for))?\s+R|[.,]|$)/i.exec(text);
    if (m) listingTitle = m[1]!.trim();
  }
  let price = f.price;
  if (!price) {
    const m = /R\s?\d[\d\s,.]*\d/.exec(text);
    if (m) price = m[0].trim();
  }
  const message = f.message ?? (text.trim() || undefined);

  return buildResult("unknown", email, {
    name,
    emailAddr: f.email,
    phone,
    phoneRaw,
    listingRef: f.listingRef,
    listingTitle,
    listingUrl,
    price,
    message,
  });
}
