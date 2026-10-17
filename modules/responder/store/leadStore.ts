import type { ParsedEnquiry } from "../parser/types.js";
import type { ViewingSlot } from "../flow/slots.js";
import type { ConversationState, LeadQualification, BookingWrite } from "../flow/conversation.js";

/** Serializable snapshot of a lead conversation (for durable storage). */
export interface ConvoSnapshot {
  enquiry: ParsedEnquiry;
  qualification: LeadQualification;
  state: ConversationState;
  offeredSlots: { id: string; start: string; label: string }[];
  bookedSlot?: { id: string; start: string; label: string };
  bookedEvent?: BookingWrite;
  bookingWriteFailed: boolean;
  updatedAt: string;
}

export interface LeadStore {
  getConvo(phone: string): Promise<ConvoSnapshot | undefined>;
  saveConvo(phone: string, snapshot: ConvoSnapshot): Promise<void>;
  isProcessed(gmailMessageId: string): Promise<boolean>;
  markProcessed(gmailMessageId: string): Promise<void>;
  close(): Promise<void>;
}

export function slotToJson(s: ViewingSlot): { id: string; start: string; label: string } {
  return { id: s.id, start: s.start.toISOString(), label: s.label };
}

export function slotFromJson(s: { id: string; start: string; label: string }): ViewingSlot {
  return { id: s.id, start: new Date(s.start), label: s.label };
}

/** Default store for dev/demo/tests: process memory. State is lost on restart. */
export class InMemoryLeadStore implements LeadStore {
  private convos = new Map<string, ConvoSnapshot>();
  private processed = new Set<string>();

  async getConvo(phone: string): Promise<ConvoSnapshot | undefined> {
    return this.convos.get(phone);
  }
  async saveConvo(phone: string, snapshot: ConvoSnapshot): Promise<void> {
    this.convos.set(phone, snapshot);
  }
  async isProcessed(gmailMessageId: string): Promise<boolean> {
    return this.processed.has(gmailMessageId);
  }
  async markProcessed(gmailMessageId: string): Promise<void> {
    this.processed.add(gmailMessageId);
  }
  async close(): Promise<void> {}
}

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * Durable store for production (Render restarts wipe memory).
 * Same Postgres pattern as the WhatsApp Operator. Schema in db/schema.sql.
 * Accepts anything with a pg.Pool-compatible query() so tests can inject a fake.
 */
export class PostgresLeadStore implements LeadStore {
  constructor(private db: Queryable) {}

  async getConvo(phone: string): Promise<ConvoSnapshot | undefined> {
    const r = await this.db.query("SELECT snapshot FROM lead_conversations WHERE phone = $1", [phone]);
    return (r.rows[0]?.snapshot as ConvoSnapshot | undefined) ?? undefined;
  }

  async saveConvo(phone: string, snapshot: ConvoSnapshot): Promise<void> {
    await this.db.query(
      `INSERT INTO lead_conversations (phone, snapshot, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (phone) DO UPDATE SET snapshot = $2, updated_at = now()`,
      [phone, JSON.stringify(snapshot)],
    );
  }

  async isProcessed(gmailMessageId: string): Promise<boolean> {
    const r = await this.db.query("SELECT 1 AS one FROM processed_intake WHERE gmail_message_id = $1", [gmailMessageId]);
    return r.rows.length > 0;
  }

  async markProcessed(gmailMessageId: string): Promise<void> {
    await this.db.query(
      "INSERT INTO processed_intake (gmail_message_id, processed_at) VALUES ($1, now()) ON CONFLICT DO NOTHING",
      [gmailMessageId],
    );
  }

  async close(): Promise<void> {
    const endable = this.db as Queryable & { end?: () => Promise<void> };
    if (endable.end) await endable.end();
  }
}
