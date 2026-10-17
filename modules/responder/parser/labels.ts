/** Shared label-tolerant field extraction used by every provider parser. */

export interface BodyFields {
  name?: string;
  email?: string;
  phoneRaw?: string;
  message?: string;
  listingTitle?: string;
  listingRef?: string;
  price?: string;
}

const NAME_LABELS = ["name", "enquirer name", "from name", "full name"];
const PHONE_LABELS = ["contact number", "contact no", "telephone", "phone", "phone number", "mobile", "cell", "cellphone", "tel"];
const EMAIL_LABELS = ["email", "e-mail", "email address", "e-mail address"];
const REF_LABELS = ["listing number", "listing no", "listing id", "reference", "ref", "listing ref", "property ref", "property reference", "web ref", "web reference"];
const TITLE_LABELS = ["listing", "property", "listing title", "property title", "regarding", "re"];
const PRICE_LABELS = ["price", "asking price", "list price", "listing price"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract "Label: value" where value runs to end of line. Labels matched case-insensitively, longest first. */
function fieldByLabels(text: string, labels: string[]): string | undefined {
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  const re = new RegExp(`^\\s*(?:${sorted.map(escapeRe).join("|")})\\s*[:\\-]\\s*(.+?)\\s*$`, "im");
  const m = re.exec(text);
  if (!m) return undefined;
  const v = m[1]!.trim();
  return v.length > 0 ? v : undefined;
}

/** Extract the free-text message: text after a "Message"/"Enquiry" label until a footer marker. */
function extractMessage(text: string): string | undefined {
  const start = /^\s*(?:message|comments?|enquiry|their message|additional comments?)\s*[:\-]?\s*$/im.exec(text)
    ?? /^\s*(?:message|comments?|enquiry|their message|additional comments?)\s*[:\-]\s*(.+)$/im.exec(text);
  if (!start) return undefined;

  // Inline form: "Message: hello..." -> capture group 1 when present
  const inline = /^\s*(?:message|comments?|enquiry|their message|additional comments?)\s*[:\-]\s*(.+)$/im.exec(text);
  let rest: string;
  if (inline && !/^\s*(?:message|comments?|enquiry|their message|additional comments?)\s*[:\-]?\s*$/im.test(text)) {
    rest = text.slice(text.indexOf(inline[0])).replace(inline[0], inline[1]! + "\n");
  } else {
    rest = text.slice((start.index ?? 0) + start[0].length);
  }

  const footer = /\n\s*(?:--|to (?:view|stop|unsubscribe|respond|reply)|view (?:the )?(?:listing|property)|unsubscribe|this (?:email|message) was|kind regards|regards,|thank you for using|powered by|sent (?:from|via)|please do not reply|do not reply)/i;
  const fm = footer.exec(rest);
  const msg = (fm ? rest.slice(0, fm.index) : rest).trim();
  const cleaned = msg.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function extractFields(text: string): BodyFields {
  const out: BodyFields = {};
  out.name = fieldByLabels(text, NAME_LABELS);
  out.email = fieldByLabels(text, EMAIL_LABELS);
  out.phoneRaw = fieldByLabels(text, PHONE_LABELS);
  out.listingRef = fieldByLabels(text, REF_LABELS)?.replace(/^[#]/, "").trim();
  out.listingTitle = fieldByLabels(text, TITLE_LABELS);
  out.price = fieldByLabels(text, PRICE_LABELS);
  out.message = extractMessage(text);

  // Guard: a "name" that is actually an email address or too long is wrong
  if (out.name && (out.name.includes("@") || out.name.length > 60)) out.name = undefined;
  // Guard: ref must look like a reference, not prose
  if (out.listingRef && !/^[A-Za-z]{0,4}[-/]?\d{3,}[A-Za-z0-9/-]*$/.test(out.listingRef)) out.listingRef = undefined;
  return out;
}

export function firstUrlMatching(text: string, hostRe: RegExp): string | undefined {
  const urls = text.match(/https?:\/\/[^\s<>()"']+/g) ?? [];
  return urls.find((u) => hostRe.test(u));
}
