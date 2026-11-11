-- Isolated/staging only. Populated only by a future trusted registration adapter.
BEGIN;
CREATE TABLE cf_webhook_ingress_binding (
 endpoint_id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL,
 channel_id uuid NOT NULL,
 provider text NOT NULL CHECK(provider='zernio'),
 account_id text NOT NULL CHECK(length(account_id) BETWEEN 1 AND 512),
 profile_id text NOT NULL CHECK(length(profile_id) BETWEEN 1 AND 512),
 encrypted_secret text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 evidence_ref text NOT NULL CHECK(length(evidence_ref)>0),
 valid_until timestamptz NOT NULL,
 UNIQUE(provider,account_id)
);
COMMIT;
