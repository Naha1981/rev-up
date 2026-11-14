-- Additive candidate schema. Apply ONLY to explicitly marked isolated DB.
-- Not imported/run at app startup. No production migration approval implied.
CREATE TABLE IF NOT EXISTS cf_manual_activation_receipt (
 id uuid PRIMARY KEY,
 provider text NOT NULL CHECK(provider='yoco'),
 environment text NOT NULL CHECK(environment='synthetic'),
 payment_id text NOT NULL,
 organization_id uuid NOT NULL REFERENCES organizations_organization(id),
 payment_reference text NOT NULL,
 plan text NOT NULL CHECK(plan IN ('starter','growth','business-pro')),
 amount_cents integer NOT NULL CHECK(amount_cents>0),
 currency text NOT NULL CHECK(currency='ZAR'),
 evidence_ref text NOT NULL CHECK(evidence_ref LIKE 'synthetic://yoco-receipts/%'),
 actor_user_id uuid NOT NULL REFERENCES accounts_user(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 previous_status text NOT NULL,
 UNIQUE(provider,environment,payment_id)
);
-- App candidate only INSERTs/SELECTs receipts. Runtime production roles must
-- eventually receive INSERT/SELECT only, not UPDATE/DELETE. No false immutable
-- storage claim while staging owner role retains full DB privileges.
