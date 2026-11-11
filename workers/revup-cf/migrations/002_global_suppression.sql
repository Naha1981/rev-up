-- Isolated/staging only, after001. No automated production migration.
BEGIN;
CREATE TABLE cf_contact_suppression (
 workspace_id uuid NOT NULL,contact_id uuid NOT NULL,suppressed boolean NOT NULL DEFAULT true,
 version bigint NOT NULL DEFAULT 1,reason text NOT NULL DEFAULT '',updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,contact_id)
);
-- Existing channel STOPs seed global suppression, never erase a prior STOP.
INSERT INTO cf_contact_suppression(workspace_id,contact_id,suppressed,reason)
 SELECT workspace_id,contact_id,true,'migrated_channel_suppression'
 FROM cf_conversation_control WHERE suppressed GROUP BY workspace_id,contact_id
 ON CONFLICT(workspace_id,contact_id) DO UPDATE SET suppressed=true;
ALTER TABLE cf_outbound_attempt ADD CONSTRAINT cf_outbound_attempt_tenant_id UNIQUE(workspace_id,id);
CREATE TABLE cf_budget_reservation (
 attempt_id uuid NOT NULL,workspace_id uuid NOT NULL,
 bucket text NOT NULL,period_start timestamptz NOT NULL,
 PRIMARY KEY(attempt_id,bucket,period_start),
 FOREIGN KEY(workspace_id,attempt_id) REFERENCES cf_outbound_attempt(workspace_id,id),
 FOREIGN KEY(workspace_id,bucket,period_start) REFERENCES cf_send_budget(workspace_id,bucket,period_start)
);
COMMIT;
