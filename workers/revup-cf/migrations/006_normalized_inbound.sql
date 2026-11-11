-- Isolated/staging only, no historical identity merges or permission grants.
BEGIN;
ALTER TABLE cf_inbound_job ADD COLUMN ingress_endpoint_id uuid;
ALTER TABLE cf_inbound_job ADD COLUMN ingress_channel_id uuid;
ALTER TABLE cf_inbound_job ADD COLUMN ingress_fingerprint text;
CREATE TABLE cf_sender_identity (
 workspace_id uuid NOT NULL,channel_id uuid NOT NULL,provider text NOT NULL,account_id text NOT NULL,
 platform text NOT NULL,identity_kind text NOT NULL CHECK(identity_kind IN ('bsuid','phone','platform')),
 identity_key text NOT NULL,contact_id uuid NOT NULL,evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
 valid_until timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,channel_id,provider,account_id,platform,identity_kind,identity_key)
);
CREATE TABLE cf_normalized_inbound (
 job_id uuid PRIMARY KEY REFERENCES cf_inbound_job(id),workspace_id uuid NOT NULL,channel_id uuid NOT NULL,
 contact_id uuid NOT NULL,provider_message_id text NOT NULL,provider_conversation_id text NOT NULL,
 standby boolean NOT NULL,stop boolean NOT NULL,claimed_sent_at timestamptz,
 processing_state text NOT NULL DEFAULT 'held' CHECK(processing_state='held'),
 bot_reply_allowed boolean NOT NULL DEFAULT false CHECK(bot_reply_allowed=false),
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
