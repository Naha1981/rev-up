-- Isolated/staging only. Internal alert ledger, not delivered notifications.
BEGIN;
CREATE TABLE cf_safety_alert (
 workspace_id uuid NOT NULL,kind text NOT NULL CHECK(kind IN ('dead_inbound','unmatched_receipt','unknown_outbound','held_normalized')),
 open boolean NOT NULL DEFAULT true,affected_count bigint NOT NULL CHECK(affected_count>=0),
 oldest_at timestamptz,first_seen_at timestamptz NOT NULL DEFAULT now(),last_seen_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,version bigint NOT NULL DEFAULT 1,acknowledged_by uuid,acknowledged_version bigint,
 PRIMARY KEY(workspace_id,kind)
);
COMMIT;
