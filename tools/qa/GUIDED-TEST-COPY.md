# Fictional-data test copy

No production data or credentials are needed. Never use an existing customer database.

1. Create an empty Postgres database on loopback whose name ends in `_test`.
2. Install Python requirements and run Django migrations against that database. The standard DB_HOST,DB_PORT,DB_NAME,DB_USER,DB_PASSWORD environment settings apply. Use config.settings.test and a non-production test SECRET_KEY.
3. Apply tools/qa/worker-test-schema.sql to that database. This adds Worker-only tables in the empty fixture database,not production.
4. In workers/revup-cf run npm ci,then npm test.
5. Start `DATABASE_URL=postgres://...@127.0.0.1:55432/brightbean_test node tools/qa/worker-preview.mjs` from the repository root.
6. Open http://127.0.0.1:8765/signup and create a fictional business with an example.invalid address. Keep its browser storage state for journey checks.

The checked-in preview refuses remote databases and blocks external requests. It never sends messages,publishes posts or charges money. `PREVIEW_FIXTURE=connections` simulates a private Email connection callback only. It rewrites the request origin to https://revup.test.invalid;API test POSTs must send that Origin. The short-lived callback is written to /tmp/revup-fixture-callback.txt. Do not follow the fake provider redirect:use the callback path+query against127.0.0.1:8765. `PREVIEW_FIXTURE=cancel` simulates successful cancellation only for token00000000-0000-4000-8000-000000000001. All other provider traffic still fails. These fixture results are not real provider confirmations.

Existing89-check script tools/qa/revup-guided-journey.py uses storage_state /tmp/revup-fictional-state.json. tools/qa/revup-paid-entitlement.py targets only the loopback fictionalDB and restores the original plan/status after its paid-account attack check. Use fictional accounts only.
