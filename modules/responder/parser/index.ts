import type { ParsedEnquiry, PortalProvider } from "./types.js";
import { parseEmail } from "./email.js";
import { parseProperty24 } from "./property24.js";
import { parsePrivateProperty } from "./privateProperty.js";
import { parseGeneric } from "./generic.js";

export * from "./types.js";
export { parseEmail } from "./email.js";
export { normalizeSaPhone } from "./phones.js";

export function detectProvider(from: string, subject: string, body: string): PortalProvider {
  const hay = `${from}\n${subject}\n${body.slice(0, 500)}`;
  if (/property\s*24|property24\.com/i.test(hay)) return "property24";
  if (/private\s*property|privateproperty\.co\.za/i.test(hay)) return "privateproperty";
  return "unknown";
}

/** Parse a raw enquiry email (.eml contents) into a structured lead. */
export function parseEnquiry(raw: string): ParsedEnquiry {
  const email = parseEmail(raw);
  const provider = detectProvider(email.from, email.subject, email.text);
  switch (provider) {
    case "property24":
      return parseProperty24(email);
    case "privateproperty":
      return parsePrivateProperty(email);
    default:
      return parseGeneric(email);
  }
}
