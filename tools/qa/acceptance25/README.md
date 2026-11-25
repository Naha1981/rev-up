# RevUp acceptance candidate, 25 November 2026

Run only on disposable loopback data. No production credentials. No provider connections, external messages, real charges or deployments.

Prerequisites: Node22, Chrome at /usr/bin/google-chrome, Python3.12 virtual environment with repository requirements. Install embedded-postgres18.6.0-beta.19 and Playwright1.65.1 in a parent package resolvable by these files. The current default work directory is /tmp/revup25. REVUP_QA_WORK and REVUP_QA_PYTHON may override the working directory and interpreter. Ports55431and8765must be free. The database is disposable, created fresh and stopped/removed in finally.

1. In workers/revup-cf: npm ci, then npm test and npm run typecheck.
2. From the checkout: node tools/qa/acceptance25/acceptance-run.mjs.
3. Review journey-results.json. Screenshots are internal QA, not completed hosted release proof. There are synthetic fixture activations, not money. The customer data and all activities are fictional. Server fetch is disabled; browser external requests are blocked.

This uses the actual Worker handler with PostgreSQL and native browser forms. It is not the deployed Workers runtime. Fifty parallel dashboard loads use one synthetic account, not fifty production customers or a production capacity acceptance test. Six built-in roles plus a custom role are exercised through real routes after fixture role changes, not staff invitation/onboarding. Public enquirer/order guest roles are included. Provider receipt, Google Calendar sync, WhatsApp number self-connection, paid activation, provider social publication, automatic timed follow-up and all fifty specialist outputs are NOT certified by this run.

The old mixed unit suite contacted production and counted one signed test as passing when a secret was absent. Those probes are removed from unit scope, native fetch is blocked by the unit runner, and separate explicitly targeted read-only health/form checks are in test/hosted-readonly.mjs. This does not erase the separate required production/signed acceptance work.

Candidate fixes: remove unsupported delivery-time/channel promises from order/quote/review/campaign acknowledgement text; enforce same-origin browser mutation requests; add missing synthetic tracked-link table contract. No tier, price, provider or customer record changed.
