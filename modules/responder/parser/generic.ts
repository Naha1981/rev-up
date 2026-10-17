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
    const display = /^"?([^"<@]+)"?\s*</.exec(from);
    if (display && !/property24|privateproperty|no-?reply|donotreply/i.test(display[1]!)) {
      name = display[1]!.trim();
    }
  }

  const phone = normalizeSaPhone(f.phoneRaw) ?? extractPhoneFromText(text)?.normalized ?? undefined;
  const phoneRaw = f.phoneRaw ?? extractPhoneFromText(text)?.raw;
  const listingUrl = firstUrlMatching(text, /(^|\.)(property24\.com|privateproperty\.co\.za)/i);

  return buildResult("unknown", email, {
    name,
    emailAddr: f.email,
    phone,
    phoneRaw,
    listingRef: f.listingRef,
    listingTitle: f.listingTitle,
    listingUrl,
    price: f.price,
    message: f.message,
  });
}
