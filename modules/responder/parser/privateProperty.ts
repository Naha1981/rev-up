import type { ParsedEmail, ParsedEnquiry } from "./types.js";
import { extractFields, firstUrlMatching } from "./labels.js";
import { extractPhoneFromText, normalizeSaPhone } from "./phones.js";
import { buildResult } from "./property24.js";

/**
 * Private Property (privateproperty.co.za) agent enquiry alerts.
 * Same "Label: value" family as Property24 with its own subject line,
 * e.g. "Private Property enquiry: 2 Bedroom Apartment in Umhlanga".
 * MODELED ON THE KNOWN LAYOUT - confirm against a real sample before production.
 */
export function parsePrivateProperty(email: ParsedEmail): ParsedEnquiry {
  const { text, subject } = email;
  const f = extractFields(text);

  let listingTitle = f.listingTitle;
  const subjTitle = /private\s*property\s*(?:enquiry|lead)\s*[-:]\s*(.+)$/i.exec(subject)
    ?? /(?:enquiry|new enquiry|interest)\s*(?:for|on|in)\s*(?:your listing\s*)[-:]?\s*(.+)$/i.exec(subject);
  if (!listingTitle && subjTitle) listingTitle = subjTitle[1]!.trim();

  const listingUrl = firstUrlMatching(text, /(^|\.)privateproperty\.co\.za/i);
  const phone = normalizeSaPhone(f.phoneRaw) ?? extractPhoneFromText(text)?.normalized ?? undefined;
  const phoneRaw = f.phoneRaw ?? extractPhoneFromText(text)?.raw;

  return buildResult("privateproperty", email, {
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
