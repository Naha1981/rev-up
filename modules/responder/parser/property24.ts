import type { ParsedEmail, ParsedEnquiry } from "./types.js";
import { extractFields, firstUrlMatching } from "./labels.js";
import { extractPhoneFromText, normalizeSaPhone } from "./phones.js";

/**
 * Property24 agent enquiry alerts.
 * Sender domain: property24.com. Subject commonly carries the listing title,
 * e.g. "New enquiry from Property24 - 3 Bedroom House for Sale in Fourways".
 * Body uses "Label: value" pairs plus a free-text Message section.
 * MODELED ON THE KNOWN LAYOUT - confirm against a real sample before production.
 */
export function parseProperty24(email: ParsedEmail): ParsedEnquiry {
  const { text, subject, from } = email;
  const f = extractFields(text);

  // Listing title often lives in the subject after the last dash/colon
  let listingTitle = f.listingTitle;
  const subjTitle = /(?:enquiry|lead|interest)\s*(?:from|on|via|:)?\s*property\s*24\s*[-:]\s*(.+)$/i.exec(subject)
    ?? /^(?:new enquiry|enquiry|new lead)\s*[-:]\s*(.+)$/i.exec(subject);
  if (!listingTitle && subjTitle) listingTitle = subjTitle[1]!.trim();

  const listingUrl = firstUrlMatching(text, /(^|\.)property24\.com/i);
  const phone = normalizeSaPhone(f.phoneRaw) ?? extractPhoneFromText(text)?.normalized ?? undefined;
  const phoneRaw = f.phoneRaw ?? extractPhoneFromText(text)?.raw;

  return buildResult("property24", email, {
    name: f.name,
    emailAddr: f.email,
    phone,
    phoneRaw,
    listingRef: f.listingRef,
    listingTitle,
    listingUrl,
    price: f.price,
    message: f.message,
  });
}

export function buildResult(
  provider: ParsedEnquiry["provider"],
  email: ParsedEmail,
  x: {
    name?: string; emailAddr?: string; phone?: string; phoneRaw?: string;
    listingRef?: string; listingTitle?: string; listingUrl?: string;
    price?: string; message?: string;
  },
): ParsedEnquiry {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!x.name) missing.push("leadName");
  if (!x.phone) missing.push("leadPhone");
  if (!x.listingRef && !x.listingTitle) missing.push("listing");
  if (!x.message) warnings.push("no message body found - lead sent an empty enquiry or layout changed");

  let confidence = 0;
  if (x.phone) confidence += 0.35;
  if (x.name) confidence += 0.2;
  if (x.listingRef || x.listingTitle) confidence += 0.2;
  if (x.message) confidence += 0.15;
  if (x.emailAddr) confidence += 0.1;
  if (provider === "unknown") confidence = Math.min(confidence, 0.6);

  return {
    provider,
    leadName: x.name,
    leadEmail: x.emailAddr,
    leadPhone: x.phone,
    leadPhoneRaw: x.phoneRaw,
    listingRef: x.listingRef,
    listingTitle: x.listingTitle,
    listingUrl: x.listingUrl,
    price: x.price,
    message: x.message,
    subject: email.subject,
    from: email.from,
    confidence: Math.round(confidence * 100) / 100,
    missing,
    warnings,
  };
}
