-- Isolated/staging only. Durable unmatched signed receipt inbox.
BEGIN;
CREATE TABLE cf_unmatched_receipt (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,provider text NOT NULL,account_id text NOT NULL,
 event_id text NOT NULL,provider_message_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('delivered','read','failed')),
 state text NOT NULL DEFAULT 'unmatched' CHECK(state IN ('unmatched','reconciled','held')),
 attempts integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,provider,account_id,event_id)
);
CREATE INDEX cf_unmatched_receipt_message ON cf_unmatched_receipt(workspace_id,provider,account_id,provider_message_id) WHERE state='unmatched';
COMMIT;
