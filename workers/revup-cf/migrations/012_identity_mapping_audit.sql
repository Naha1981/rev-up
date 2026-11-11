-- Isolated only. No automatic mapping/backfill.
BEGIN;
CREATE TABLE cf_identity_mapping_audit (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,job_id uuid NOT NULL REFERENCES cf_inbound_job(id),
 contact_id uuid NOT NULL,actor_id uuid NOT NULL,job_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
