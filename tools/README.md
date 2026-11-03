# tools/

Operator test helpers for RevUp. Not part of the deployed app; no runtime impact.

- `shot.mjs`, `shot2.mjs`, `shot-tall.mjs`, `shot-scroll.mjs` - headless-Chrome screenshot rigs (mobile 390px, tall, scrolling, click variant). Usage: `node shot.mjs <url> <out.png> <sessionid|-> <csrftoken|-> <waitMs>`.
- `run_pg_tests.py` - runs the pytest suite against a local ephemeral Postgres (pgserver). Usage: `python run_pg_tests.py <test paths>`.
- `audit.sh` - stranger-journey smoke audit against the live site (expects `REVUP_AUDIT_EMAIL` / `REVUP_AUDIT_PASSWORD` for a synthetic test account).
- `reverify-revup.sh` - signup + calendar re-verification script (expects `REVUP_TEST_PASSWORD` for a synthetic account).
- `build_sessions.sh` - paced login-session builder for synthetic load users (reads `synthetic_load_users.tsv`, not committed).
- `pf_curl.sh` - PayFast sandbox checkout helper (all credentials via env vars).

No secrets are stored in this folder; every credential comes from the environment.
