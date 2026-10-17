-- LeadMachine Property durable state (same Postgres pattern as the WhatsApp Operator).
CREATE TABLE IF NOT EXISTS lead_conversations (
  phone       TEXT PRIMARY KEY,
  snapshot    JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_intake (
  gmail_message_id TEXT PRIMARY KEY,
  processed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
