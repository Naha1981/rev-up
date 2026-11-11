-- Isolated/staging only. No production auto-run.
BEGIN;
ALTER TABLE cf_inbound_job ADD CONSTRAINT cf_inbound_job_tenant_id UNIQUE(workspace_id,id);
CREATE TABLE cf_inbound_effect (
 workspace_id uuid NOT NULL,job_id uuid NOT NULL,effect_key text NOT NULL,
 result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(workspace_id,job_id,effect_key),
 FOREIGN KEY(workspace_id,job_id) REFERENCES cf_inbound_job(workspace_id,id)
);
ALTER TABLE cf_outbound_message ADD COLUMN provider text;
ALTER TABLE cf_outbound_message ADD COLUMN account_id text;
CREATE TABLE cf_delivery_receipt (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,provider text NOT NULL,account_id text NOT NULL,
 event_id text NOT NULL,message_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('delivered','read','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(workspace_id,provider,account_id,event_id),
 FOREIGN KEY(workspace_id,message_id) REFERENCES cf_outbound_message(workspace_id,id)
);
COMMIT;
