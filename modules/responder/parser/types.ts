export type PortalProvider = "property24" | "privateproperty" | "unknown";

export interface ParsedEmail {
  headers: Record<string, string>;
  subject: string;
  from: string;
  text: string; // plain text body (html converted when no text/plain part)
}

export interface ParsedEnquiry {
  provider: PortalProvider;
  leadName?: string;
  leadEmail?: string;
  /** Normalised digits-only international form, e.g. 27825550134. Undefined when absent/invalid. */
  leadPhone?: string;
  leadPhoneRaw?: string;
  listingRef?: string;
  listingTitle?: string;
  listingUrl?: string;
  price?: string;
  message?: string;
  subject: string;
  from: string;
  /** 0..1 heuristic confidence that this parse is usable for an automated reply. */
  confidence: number;
  /** Field names that could not be extracted. */
  missing: string[];
  warnings: string[];
}
