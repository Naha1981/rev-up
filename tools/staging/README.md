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


---

# Isolated RevUp host candidate - not production

This package runs the actual Worker handler on Node22 beside the existing Django recovery implementation. No new password-token system, billing provider or production hostname. Dockerfile.staging builds existing Tailwind assets, bundles/typechecks Worker code, collects static assets, then starts tools/staging/server.mjs. It does NOT migrate a database or start Django's publishing supervisor/background jobs. It must NEVER replace a production service's Dockerfile/start command.

Required runtime: REVUP_STAGING_ONLY=1, REVUP_STAGING_ORIGIN exact isolated URL, PORT, DATABASE_URL pointing ONLY to the previously approved revup_journeys database (or disposable revup_finish_synthetic), SECRET_KEY/ENCRYPTION_KEY_SALT matching synthetic fixtures. Use private host secret configuration, not source or chat. No real credentials or provider keys. Both Node and Django verify the synthetic boundary marker before serving. Node disables external fetch; Django disables external socket connections except its synthetic DB. In-memory email only. No tasks/cron, real messages/charges or Yoco wiring.

PUBLIC HOSTING IS NOT DONE: Render workspace A is over its750free hours; workspace B is at25/25service slots. No service was deleted/replaced/upgraded. Cloudflare Containers is paid. Do not call this a hosted release or recovery fixed until an isolated free host is actually running and independently tested. Free Render can sleep after15idle minutes and lose files; synthetic state must remain in the isolated database. No promise of production reliability. Source approval GO94 covers new staging branch only; main/production untouched.

Backend transport and existing assets proof: run a separate disposable PostgreSQL14+ database at127.0.0.1:55440/revup_finish_synthetic using the private schema packet and its boundary marker. Build theme/static_src with npm ci --ignore-scripts && npm run build. Set synthetic env and DJANGO_SETTINGS_MODULE=tools.staging.settings, python manage.py collectstatic --noinput. Then run REVUP_QA_PYTHON=/path/to/python tools/staging/server.mjs using Node22. App binds PORT or8766; Django binds127.0.0.1:8767. No real email is delivered, so hosted GET/form/assets is not mail-delivery proof. Separate tools/qa/14nov-recovery proof covers actual allauth reset/token/session behavior using memory mail.

Path A activation: manual-activation.sql is an ADDITIVE, isolated-only schema candidate, never applied from app startup. manual-activation.mjs is imported only by this isolated host at POST /__staging/operator/activate, never by the production Worker. The endpoint requires an existing active superuser Worker session, same origin, application/json and X-RevUp-Operator-Action: verify-yoco-receipt. It is a backend operator API, not a completed staff UI. It validates active superuser, exact synthetic boundary, verified fictional Yoco receipt, server-owned plan amount/ZAR, stored organisation reference, existing pending/expired status; it locks receipt and organisation, writes one audit row+activation in one transaction, and rejects conflicting identity/reuse. It does not contact Yoco. proof-activation-a.mjs runs only on disposable loopback DB, requires two pending signup organisations from the browser journey fixture, and promotes one fictional fixture user to a test operator.10simultaneous same-receipt attempts must yield one activation/receipt and9no-opduplicates. Wrong reference, amount, currency, role, evidence, non-staging mode and foreign-org reuse reject. No claim of immutable storage under owner DB role. Real receipt verification remains a human responsibility requiring actual merchant/reference evidence and owner authority. No production activation route, charge or staff role is created by deployment.

Before assisted activation can be sold: real merchant transaction/reference correlation, authorised operator identity/access, a usable staff workflow, named response window, a verified ledger-backed entitlement/first-value journey, receipt disputes/refunds and release approval. The candidate is not a payment or production readiness certificate.

Rollback of unmerged source is removing the new branch only after explicit deletion permission. Stopping a hypothetical new staging service affects only that service; it must not alter main/live routes or shared schema. Do not promise that deleting a Git branch automatically stops a separately hosted service or reverses a DB action.


The staging HTTP host strips the existing Yoco payment hrefs from HTML and routes them to a403synthetic-payments-disabled page. This is an isolated test safety guard, not a changed live billing experience. No live link or charge is exercised by HTTP activation proof. proof-http-host.mjs exercises the actual session-protected operator API: native signup creates fictional operator+tenant, synthetic SQL promotes only the operator, tenant request403, ten concurrent operator requests ->one grant/nine duplicates, tenant billing readback active/Growth and live payment links absent. Requires disposable schema+manual-activation.sql already installed. It stops both child servers. Its default RFC5737testIP192.0.2.102 may hit the intentional10/day signup limit after repeat runs; set a separately recorded REVUP_QA_IP, never erase the limiter.

B prototype is deliberately not wired: yoco-checkout-PROTOTYPE.mjs and proof-checkout-PROTOTYPE.mjs. It derives amount from the existing server plan table, creates fictional invoice+idempotency key and correlates a verified-adapter fixture receipt to stored invoice/checkout/mode/amount/currency. A return URL never grants access. No real Yoco API call, credential, checkout, webhook registration, cryptographic verification or durable entitlement write. Current official references inspected14Nov: https://developer.yoco.com/api-reference/checkout-api/webhooks/register-webhook and https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification . A real account-scoped signature/replay contract still needs verification; the prototype refuses missing adapter rather than pretending an unauthenticated event is verified. The earlier docs/qa/14nov-yoco-activation-design.md retains the full held integration plan. No switch to Paystack or PayFast.
