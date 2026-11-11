-- Isolated/staging only. Additive. NOT run by request handlers or deployment.
-- Production requires approved backup/restore, exclusive cutover and migration packet.
BEGIN;
CREATE TABLE cf_conversation_control (
 workspace_id uuid NOT NULL, contact_id uuid NOT NULL, channel_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'paused' CHECK(state IN ('active','paused')),
 suppressed boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 1,
 reason text NOT NULL DEFAULT 'unverified_legacy_state', updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,contact_id,channel_id)
);
CREATE TABLE cf_control_audit (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,contact_id uuid NOT NULL,channel_id uuid NOT NULL,
 actor_id uuid,action text NOT NULL,reason text NOT NULL,version bigint NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,contact_id,channel_id) REFERENCES cf_conversation_control(workspace_id,contact_id,channel_id)
);
CREATE TABLE cf_inbound_job (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,account_id text NOT NULL,provider text NOT NULL,event_id text NOT NULL,
 payload jsonb NOT NULL CHECK(octet_length(payload::text)<=65536),
 state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','processing','completed','retry_wait','dead')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,lease_until timestamptz,last_error_code text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 UNIQUE(provider,workspace_id,account_id,event_id),
 CHECK ((state='processing')=(lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX cf_inbound_claim_idx ON cf_inbound_job(workspace_id,available_at) WHERE state IN ('received','retry_wait','processing');
CREATE TABLE cf_outbound_message (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,contact_id uuid NOT NULL,channel_id uuid NOT NULL,
 business_key text NOT NULL,purpose text NOT NULL,body text NOT NULL,
 state text NOT NULL DEFAULT 'held' CHECK(state IN ('held','approved','queued','dispatching','provider_accepted','delivered','read','failed','unknown','cancelled')),
 approved_by uuid,approved_at timestamptz,attempt_id uuid,reserved_at timestamptz,lease_until timestamptz,
 provider_started_at timestamptz,start_token uuid,control_version bigint,provider_message_id text,hold_reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,business_key),UNIQUE(workspace_id,provider_message_id),UNIQUE(workspace_id,id),
 FOREIGN KEY(workspace_id,contact_id,channel_id) REFERENCES cf_conversation_control(workspace_id,contact_id,channel_id)
);
CREATE TABLE cf_send_budget (
 workspace_id uuid NOT NULL,bucket text NOT NULL,period_start timestamptz NOT NULL,
 reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),limit_count integer NOT NULL CHECK(limit_count>=0),
 PRIMARY KEY(workspace_id,bucket,period_start)
);
CREATE TABLE cf_outbound_attempt (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,message_id uuid NOT NULL,
 result text NOT NULL CHECK(result IN ('reserved','provider_accepted','unknown','failed')),
 error_code text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,message_id) REFERENCES cf_outbound_message(workspace_id,id)
);
COMMIT;
