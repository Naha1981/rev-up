-- Isolated only. No public approval writer or automatic replay.
BEGIN;
ALTER TABLE cf_inbound_job ADD COLUMN recovery_generation integer NOT NULL DEFAULT 0 CHECK(recovery_generation>=0);
CREATE TABLE cf_inbound_recovery_approval (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,job_id uuid NOT NULL REFERENCES cf_inbound_job(id),
 actor_id uuid NOT NULL,evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
 expected_generation integer NOT NULL CHECK(expected_generation>=0),
 expected_attempts integer NOT NULL CHECK(expected_attempts>0),
 expected_error text NOT NULL CHECK(expected_error IN ('sender_identity_unresolved','conversation_identity_unresolved','inbound_evidence_expired','attempts_exhausted')),
 payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),
 ingress_fingerprint text NOT NULL,valid_until timestamptz NOT NULL,consumed_at timestamptz
);
CREATE TABLE cf_inbound_recovery_audit (
 approval_id uuid PRIMARY KEY REFERENCES cf_inbound_recovery_approval(id),workspace_id uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES cf_inbound_job(id),actor_id uuid NOT NULL,
 prior_generation integer NOT NULL,prior_attempts integer NOT NULL,prior_error text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
