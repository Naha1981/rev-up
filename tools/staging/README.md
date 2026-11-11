# Isolated safety backend staging, not a product launch
No deployment has occurred. This is a separate entry/config, not full RevUp UI.

## Provisioning checks before any deployment
- Confirm owner staging authority, account availability and zero charge or approved spending limit.
- Provision a separate PostgreSQL DB/branch with synthetic data only. No production snapshot, URL, accounts, sessions, messages or credentials.
- Apply reviewed candidate migrations only to that DB. Explicitly seed cf_staging_boundary below once. Do not create this marker in production.
- Use only staging tenant crypto key and synthetic endpoint secret/account/profile. Do not import production secrets. Provider registration or messages need separate scope.
- Record exact reviewed candidate SHA in STAGING_COMMIT and independently verify deployment bytes and version.
- Deploy with explicit --config wrangler.staging.toml. Inspect dry-run config: no production names/domains/routes/cron. Route only /health and /synthetic-ingress/<uuid>.
- Runtime requires exact workers.dev host and marker before every DB operation beyond boundary read. No scheduler, AI, payment/provider send route or production application import.

Boundary seed (only new synthetic DB, marker recorded in staging config):
```sql
CREATE TABLE cf_staging_boundary(marker text PRIMARY KEY,synthetic_only boolean NOT NULL CHECK(synthetic_only),egress_disabled boolean NOT NULL CHECK(egress_disabled));
-- Operator supplies a fresh non-secret staging marker, never production data.
```
Required deployment config: STAGING_ONLY=true, STAGING_HOST, STAGING_MARKER, STAGING_COMMIT. Required staging secrets: STAGING_DATABASE_URL and staging-only TENANT_FIELD_KEY. Original production DATABASE_URL is never read by this entry.

## Evidence still required
Fresh /health includes exact SHA and synthetic_backend_only/uiJourneys=unverified. Test TCP/provider signatures separately from actual provider credentials. Confirm malformed/forged/duplicate/durable-ACK behavior against staging URL. Teardown synthetic data after run. This entry does not enable owner UI, outbound, real messages, billing, full customer journeys or production capacity proof.
