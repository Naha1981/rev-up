# RevUp acceptance candidate, 25 November 2026

Run only on disposable loopback data. No production credentials. No provider connections, external messages, real charges or deployments.

Prerequisites: Node22, Chrome at /usr/bin/google-chrome, Python3.12 virtual environment with repository requirements. Install embedded-postgres18.6.0-beta.19 and Playwright1.65.1 in a parent package resolvable by these files. The current default work directory is /tmp/revup25. REVUP_QA_WORK and REVUP_QA_PYTHON may override the working directory and interpreter. Ports55431,8765,8766and8767must be free. The database is disposable, created fresh and stopped/removed in finally.

1. In workers/revup-cf: npm ci, then npm test and npm run typecheck.
2. Build recovery-page CSS with cd theme/static_src && npm ci && npm run build, then return to the checkout.
3. From the checkout: node tools/qa/acceptance25/acceptance-run.mjs.
4. Review journey-results.json. Screenshots are internal QA, not completed hosted release proof. There are synthetic fixture activations, not money. The customer data and all activities are fictional. Server fetch is disabled; browser external requests are blocked.

This uses the actual Worker handler with PostgreSQL and native browser forms. It is not the deployed Workers runtime. The original fifty parallel dashboard loads use one synthetic account; the additional independent-tenant test is also disposable local evidence, not a production capacity acceptance test. Six built-in roles plus a custom role are exercised through real routes after fixture role changes, not staff invitation/onboarding. A separate concurrency check creates fifty fictional businesses with fifty independent user sessions, logs them in concurrently and checks dashboards and refused cross-tenant customer URLs. This remains local capacity evidence, never hosted capacity proof. Public enquirer/order guest roles are included. Provider receipt, Google Calendar sync, WhatsApp number self-connection, paid activation, provider social publication, automatic timed follow-up and all fifty specialist outputs are NOT certified by this run.

The old mixed unit suite contacted production and counted one signed test as passing when a secret was absent. Those probes are removed from unit scope, native fetch is blocked by the unit runner, and separate explicitly targeted read-only health/form checks are in test/hosted-readonly.mjs. This does not erase the separate required production/signed acceptance work.

Candidate fixes: remove unsupported delivery-time/channel promises from order/quote/review/campaign acknowledgement text; enforce same-origin browser mutation requests; add missing synthetic tracked-link table contract. No production tier, price, provider or customer record changed.

Expanded checks: native upload/exact image bytes/deletion; submit/approve/repeated approval audit; approved-post scheduling into the retained publisher due selector; review tracked redirect; voucher debit/redemption/repeat refusal; opted-out review pipeline refusal; business-owner denial at the platform-operator alerts endpoint; logout. Real Django/allauth reset runs separately within the same disposable database with enforced CSRF, in-memory email, expired/reused-token rejection and Worker login afterwards. Its middleware background drain and all non-loopback network are disabled.

Additional candidate changes restore the embedded brand image before the recovery asset proxy and add permission/plan/status-checked approved-post scheduling. This queues a post, not a provider publication. The publisher still needs hosted runtime and provider acceptance; native library images are not yet linked to the retained publishing-media model, so attached-image posts fail closed at scheduling rather than silently publish without their image.
