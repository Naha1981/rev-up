import { parseEnquiry, type ParsedEnquiry } from "../parser/index.js";
import type { GoogleAuth } from "./auth.js";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailIntakeConfig {
  /** Gmail search query. Default: unread portal enquiry mail. */
  query: string;
  /** When true, apply processedLabel to handled messages. Never deletes or modifies content. */
  markProcessed: boolean;
  processedLabel: string;
  maxPerPoll: number;
}

export const DEFAULT_INTAKE_CONFIG: GmailIntakeConfig = {
  query: "from:(property24.com OR privateproperty.co.za) is:unread",
  markProcessed: false,
  processedLabel: "LeadMachine/Processed",
  maxPerPoll: 10,
};

export interface IntakeItem {
  gmailMessageId: string;
  enquiry: ParsedEnquiry;
}

export function intakeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GmailIntakeConfig {
  return {
    query: env.GMAIL_QUERY ?? DEFAULT_INTAKE_CONFIG.query,
    markProcessed: env.GMAIL_MARK_PROCESSED === "true",
    processedLabel: env.GMAIL_PROCESSED_LABEL ?? DEFAULT_INTAKE_CONFIG.processedLabel,
    maxPerPoll: Number(env.GMAIL_MAX_PER_POLL ?? DEFAULT_INTAKE_CONFIG.maxPerPoll),
  };
}

/**
 * Read-only Gmail intake for portal enquiry mail.
 * - lists messages matching the configured query
 * - fetches each as raw RFC822 (format=raw) and runs it through the parser
 * - optionally marks processed messages with a label (addLabelIds only -
 *   no deletions, no content changes, no trash)
 * Needs scope gmail.readonly, or gmail.modify when markProcessed is on.
 */
export class GmailIntake {
  private labelIdCache: string | null = null;

  constructor(
    private auth: GoogleAuth,
    private cfg: GmailIntakeConfig = DEFAULT_INTAKE_CONFIG,
  ) {}

  async pollOnce(): Promise<IntakeItem[]> {
    const list = await this.api<{ messages?: { id: string }[] }>(
      `/messages?q=${encodeURIComponent(this.cfg.query)}&maxResults=${this.cfg.maxPerPoll}`,
    );
    const out: IntakeItem[] = [];
    for (const m of list.messages ?? []) {
      const raw = await this.getRaw(m.id);
      out.push({ gmailMessageId: m.id, enquiry: parseEnquiry(raw) });
      if (this.cfg.markProcessed) await this.markProcessed(m.id);
    }
    return out;
  }

  async getRaw(messageId: string): Promise<string> {
    const data = await this.api<{ raw: string }>(`/messages/${encodeURIComponent(messageId)}?format=raw`);
    // Gmail returns base64url
    return Buffer.from(data.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  }

  private async markProcessed(messageId: string): Promise<void> {
    const labelId = await this.ensureLabel();
    const res = await this.auth.fetch(`${API}/messages/${encodeURIComponent(messageId)}/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds: [labelId] }),
    });
    if (!res.ok) throw new Error(`messages.modify failed: ${res.status} ${await res.text()}`);
  }

  private async ensureLabel(): Promise<string> {
    if (this.labelIdCache) return this.labelIdCache;
    const labels = await this.api<{ labels?: { id: string; name: string }[] }>(`/labels`);
    const existing = labels.labels?.find((l) => l.name === this.cfg.processedLabel);
    if (existing) {
      this.labelIdCache = existing.id;
      return existing.id;
    }
    const res = await this.auth.fetch(`${API}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: this.cfg.processedLabel,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    });
    if (!res.ok) throw new Error(`labels.create failed: ${res.status} ${await res.text()}`);
    const created = (await res.json()) as { id: string };
    this.labelIdCache = created.id;
    return created.id;
  }

  private async api<T>(path: string): Promise<T> {
    const res = await this.auth.fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`Gmail API ${path} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }
}
