-- Isolated only. Internal delivery intent, no actual messages or destinations.
BEGIN;
CREATE TABLE cf_safety_alert_delivery (
 id uuid PRIMARY KEY,workspace_id uuid NOT NULL,kind text NOT NULL,alert_version bigint NOT NULL,
 payload jsonb NOT NULL,state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','processing','delivered','dead','cancelled')),
 attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid,lease_until timestamptz,delivered_at timestamptz,last_error_code text NOT NULL DEFAULT '',
 UNIQUE(workspace_id,kind,alert_version),
 FOREIGN KEY(workspace_id,kind) REFERENCES cf_safety_alert(workspace_id,kind),
 CHECK((state='processing')=(lease_token IS NOT NULL AND lease_until IS NOT NULL))
);
COMMIT;
