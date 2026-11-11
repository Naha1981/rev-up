-- Isolated/staging only. Trusted adapter populates evidence, never HTTP body flags.
BEGIN;
ALTER TABLE cf_conversation_control ADD COLUMN last_inbound_at timestamptz;
ALTER TABLE cf_conversation_control ADD COLUMN inbound_evidence_ref text;
ALTER TABLE cf_outbound_message ADD COLUMN approved_body_sha256 text;
ALTER TABLE cf_outbound_message ADD COLUMN template_id text;
ALTER TABLE cf_outbound_message ADD COLUMN template_version text;
ALTER TABLE cf_outbound_message ADD COLUMN template_language text;
ALTER TABLE cf_outbound_message ADD COLUMN policy_version bigint;
ALTER TABLE cf_outbound_message ADD COLUMN policy_fingerprint text;
ALTER TABLE cf_outbound_message ADD COLUMN credential_version bigint;
CREATE TABLE cf_workspace_dispatch_policy (
 workspace_id uuid PRIMARY KEY,enabled boolean NOT NULL DEFAULT false,plan_active boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1,hour_limit integer NOT NULL CHECK(hour_limit>=0),
 day_limit integer NOT NULL CHECK(day_limit>=0),month_limit integer NOT NULL CHECK(month_limit>=0),
 evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),valid_until timestamptz NOT NULL
);
CREATE TABLE cf_channel_dispatch_binding (
 workspace_id uuid NOT NULL,channel_id uuid NOT NULL,provider text NOT NULL,account_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('connected','held','revoked')),api_key text NOT NULL,
 version bigint NOT NULL DEFAULT 1,evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),valid_until timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,channel_id)
);
CREATE TABLE cf_contact_permission (
 workspace_id uuid NOT NULL,contact_id uuid NOT NULL,channel_id uuid NOT NULL,purpose text NOT NULL,
 status text NOT NULL CHECK(status IN ('allowed','denied','unknown')),evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
 valid_until timestamptz NOT NULL,withdrawn_at timestamptz,
 PRIMARY KEY(workspace_id,contact_id,channel_id,purpose)
);
CREATE TABLE cf_template_dispatch_policy (
 workspace_id uuid NOT NULL,channel_id uuid NOT NULL,account_id text NOT NULL,template_id text NOT NULL,
 version text NOT NULL,language text NOT NULL,purpose text NOT NULL,status text NOT NULL CHECK(status IN ('approved','rejected','revoked')),
 evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),valid_until timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,channel_id,account_id,template_id,version,language,purpose)
);
COMMIT;
