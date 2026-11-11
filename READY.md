# RevUp readiness evidence - 11 November 2026

Release gates: **0/6 passed**, A-F HOLD. No whole-product percentage inferred from test counts. Target timing does not override evidence or approvals. This ledger tracks the 22 RevUp findings relayed from ALL APP DEBUG. No production activation is implied by isolated fixes.

| # | Finding | Current evidence and remaining check | State |
|---|---|---|---|
|1|Production promotion gate|tools/safe-release and revup-cf-gate.yml verify exact hosted evidence/artifact, PLAN_ONLY. Actual protected promotion, migration/rollback packet and separate approval still required.|Partial|
|2|Immutable build/source-live|Main15bb5958 deployed JS previously byte-exact, hash ea7c0c4c…; main CI3240pytest passed. New isolated candidate changes runtime, requires fresh independent build/hash. Dependencies locked via npm ci, actions pinned; full provenance audit pending.|Partial|
|3|CRM secrets|06:58 CF API names-only check: DATABASE_URL, TENANT_FIELD_KEY, ZERNIO_API_KEY/ZERNIO_WEBHOOK_SECRET present. Does not prove valid account/tenant/rotation; no values retained here.|Partial|
|4|Real /api/healthz|Live06:58 returned HTML200, not health. Candidate runtime-proof.ts adds explicit DB-query JSON+503 sanitization+cleanup. Isolated tests pass, not deployed.|Implemented/tested, live open|
|5|Real /version|Live06:58 returned HTML200. Candidate adds JSON sha/builtAt/deployId, no-store, missing provenance503. Metadata must be injected and platform version binding configured/verified at release.|Implemented/tested, live open|
|6|Runbook/env/licence/CI|README/.env.example/LICENSE and safe-release docs exist; mainCI green. New staging checklist, exactcandidateCI/provenance audit pending.|Partial|
|7|Playwright staging journeys|No provisioned full-app synthetic staging URL. Five unassisted journeys/traces/phone screenshots not run. Backend staging-only entry is not product UI.|Open|
|8|Cross-device persistence|DB persistence foundations tested; actual two-device/session return journey still required.|Open|
|9|Tenant isolation/storage|Safety primitives extensively tenant-tested. Complete row-ID/route/job/export/publiclink/storage-signed-URL matrix not complete.|Open|
|10|Security/scans/headers/rate limits|Main gitleaksCI passed; nosniff present. Full dependency/CSP/HSTS/login/webhook-abuse review pending. Do not apply untested CSP to inline-heavy UI.|Open|
|11|Privacy consent/retention/deletion|Actual provider flow, consent, retention/deletion route and tenant-safe lifecycle proof still required.|Open|
|12|Billing authority|LEAVE YOCO is current constraint; no provider/pricing changes. One-off monthly links source exists. This closes decision-to-preserve, not payment readiness.|Boundary preserved|
|13|Payment close-loop|Signature/amount/currency/account/idempotent activation/receipt proof for current provider remains incomplete. No actual charge authorized in this work.|Open|
|14|Inbound auth/replay/tenant|Signed endpoint/registration/dedup/HMAC adapter and durable processing tested. Live route still old; trusted registration writer/provider test endpoint/cutover required. Current partner webhooks use HMAC, do not invent direct-Meta challenge semantics.|Partial|
|15|Truthful dry-run responder|Isolated normalized messages held, bot_reply_allowed=false; no live transport proof. Current customer-facing claims/legacyroute must be audited before activation.|Partial|
|16|Transport authority|No provider migration, purchase or hosting commitment made; current provider preserved. Per-account cost/terms verification pending.|Boundary preserved|
|17|Real payment/message proof|Synthetic sandbox proof is separately labelled. Real provider/payment journeys remain gated by exact approval and test account/number scope.|Open|
|18|Real Worker+PG load|Synthetic 120tenant/100DBsession and loopbackHTTP100request tests pass; NOT realWorker authenticatedmixedjourney load. No production load.|Open|
|19|Load metrics/SLO|LoopbackHTTP p50/p95/max measured only. Need real staging timed workload/hostmetrics/endpoint SLO and DB headroom. Blueprint5minramp/30minhold/10mindrain not run.|Open|
|20|Automated offsite backup|Limited snapshot restore evidence exists, no automated encrypted offsite retention/RPO proof.|Open|
|21|Restore/rollback|Prior scratch restore157tables/19401rows/0FK issues; limited timed dump/restore. Currentcandidate replay/mixedversion/egress-safe rollback/RPO/RTO/runbook drill pending.|Partial|
|22|Evidence ledger|This file records exact categories/limits. No invented completion percentages. Needs ongoing independent verification as each gate closes.|Implemented|

## Independent QA corrections
PR25 candidate: row-lock then wall-clock complete/fail lease validation; bounded cron AbortSignal/cancel contract and dedicated DB query timeout/connection destruction; explicit cancellation_unconfirmed for uncooperative callbacks; staging awaits ingress before ending pool. 358unit/168DB tests passed before runtime-proof additions. New runtime-proof suite brings unit count363. Full staging/production remain unverified.

## Staging path and unresolved inputs
Separate config wrangler.staging.toml and backend-only staging-worker.ts, no production routes/crons/AI/payment/outbound modules. Requires new synthetic-only DB and staging-only secrets, zero-charge/account checks, exact workers.dev host and boundary marker. Marker is an asserted DB condition, not enforced network egress isolation. No URL is claimed. Full app UI isolation, mandatory first design record, test endpoint registration/approved number, named monitoring primary/fallback/cadence/ack/escalation and exact release/cutover/rollback approval remain required.

## Whole-source typing and advisory scan, 11Nov07:01
New isolated types-only corrections remove eight TypeScript errors: assistant history annotation matches existing stringprompt behavior, Env declares already-used optional VAULT_MASTER_KEY, PageRow declares DB-backed views/cta_clicks. New tsconfig and hosted gate run whole-source tsc --noEmit and production npm audit. Fresh registry advisory scans: 0 vulnerabilities in production and full installed dependency sets; this is a point-in-time advisory scan, not exhaustive security/provenance proof. No dependency/version/provider change. 365unit tests pass. Candidate runtime from health/version still needs release metadata and deployment proof.
