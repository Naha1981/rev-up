-- Review and apply only with the approved webhook-continuation release.
BEGIN;
CREATE TABLE cf_receptionist_webhook_job (
 event_id text PRIMARY KEY,
 payload jsonb NOT NULL,
 state text NOT NULL CHECK(state IN ('pending','processing','complete','failed')),
 received_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 failure_code text NOT NULL DEFAULT ''
);
CREATE INDEX cf_receptionist_webhook_job_held ON cf_receptionist_webhook_job(state,updated_at) WHERE state<>'complete';
COMMIT;
