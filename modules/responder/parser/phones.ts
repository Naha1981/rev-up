/** South African phone normalisation. Returns digits-only international form (27XXXXXXXXX) or null. */
export function normalizeSaPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  const hasPlus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2); // 0027...
  if (hasPlus && digits.startsWith("27")) {
    // already international
  } else if (digits.startsWith("27") && digits.length === 11) {
    // 27XXXXXXXXX
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = "27" + digits.slice(1);
  } else if (digits.length === 9 && /^[1-8]/.test(digits)) {
    digits = "27" + digits; // missing trunk 0
  }
  // SA numbers: 27 + 9 digits
  if (/^27\d{9}$/.test(digits)) return digits;
  return null;
}

/** Finds the first SA-looking phone number in free text. */
export function extractPhoneFromText(text: string): { raw: string; normalized: string } | null {
  const candidates = text.match(/(?:\+27|0027|0)[\d\s().-]{8,14}\d/g) ?? [];
  for (const c of candidates) {
    const normalized = normalizeSaPhone(c);
    if (normalized) return { raw: c.trim(), normalized };
  }
  return null;
}
