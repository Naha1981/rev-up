-- Isolated only. Trusted conversation identity writer remains required.
BEGIN;
CREATE TABLE cf_provider_conversation_identity (
 workspace_id uuid NOT NULL,channel_id uuid NOT NULL,provider text NOT NULL,account_id text NOT NULL,
 conversation_id text NOT NULL,contact_id uuid NOT NULL,evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
 valid_until timestamptz NOT NULL,PRIMARY KEY(workspace_id,channel_id,provider,account_id,conversation_id)
);
CREATE TABLE cf_handover_observation (
 job_id uuid PRIMARY KEY REFERENCES cf_inbound_job(id),workspace_id uuid NOT NULL,channel_id uuid NOT NULL,
 contact_id uuid NOT NULL,reported_owner text NOT NULL CHECK(reported_owner IN ('app','ai_agent','other')),
 claimed_changed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
