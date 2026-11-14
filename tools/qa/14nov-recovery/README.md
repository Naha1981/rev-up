# Private synthetic proof, not a deploy instruction

Use the source archive. Node22, Python3.12 with repository requirements, PostgreSQL14+ and Chrome are needed. No paid test tool or product dependency was added; pg(MIT) and Playwright(Apache2.0) are QA-only and already in the supplied QA lock. Existing source license is unchanged.

Do not run against any real/shared database or account. These scripts deliberately create fictional database rows. Server mail is Django locmem only, provider fetch is mocked or denied and browser traffic is loopback-only. Fixed DB:127.0.0.1:55440/revup_finish_synthetic. The scripts verify cf_staging_boundary marker=revup-full-journey-14nov2026, synthetic_only=true, egress_disabled=true before creating fixtures. They use OS role sandbox in this environment; for another OS role adjust synthetic_settings.py and both Node proof connection strings consistently. No hosted credential is supplied or needed.

1. Start a separate disposable loopback PostgreSQL14+ instance at55440. Restore empty-schema.sql from the private QA packet, then insert the one marker row above. Alternatively apply Django migrations into this brand-new DB, apply tools/qa/worker-test-schema.sql and create the same marker table/row. Never aim repository migrations at shared staging or production.
2. In workers/revup-cf: npm ci --ignore-scripts; npm test; npm run typecheck. The four historical production HTTP probes stay OFF. No deploy, provider request or production query is needed. If pg/playwright aren't present for browser proof, use the separate QA packet's locked dependencies or an isolated npm prefix and NODE_PATH. Do not alter product package dependencies for QA.
3. Set REVUP_QA_PYTHON to the Python3.12 environment containing repo requirements. From repository root:
   REVUP_QA_PYTHON=/path/to/python node tools/qa/14nov-recovery/receipt-proof.mjs
   REVUP_QA_PYTHON=/path/to/python node tools/qa/14nov-recovery/browser-proof.mjs
   node tools/qa/14nov-recovery/activation-SIMULATION-ONLY.mjs
   Browser proof uses installed Chrome /opt/google/chrome/chrome. Adjust executablePath in that QA-only script for another installed browser. It binds8766 and starts the loopback Django test bridge8767; it closes both after proof. Create /downloads for private screenshots or change the two QA output paths.

Receipt proof: real PostgreSQL draft/unknown marker persistence and retry hold, with exactly one mock HTTP200{} and no real provider request. Does not prove atomic budgets or concurrency-safe dispatch. Pending marker also holds on crash; no auto-clear/retry is implemented. Other legacy outbound adapters have not been certified by this test.

Recovery proof: Worker adapter -> actual Django allauth form/CSRF -> memory-only reset email -> actual token form -> generated fictional password change -> old Worker-session row invalidated -> Worker password login303 -> reused link rejected -> expired token rejected. No real user password reset/logout/email is performed. The unchanged Django templates are tested; screenshots show their current rendering. Repository lacks built static CSS in this environment, so the two screenshots are unstyled functional evidence, NOT design or final visual acceptance. No design-dependent edits were made. The mandatory design page remains inaccessible.

Hosting gap: RECOVERY_SERVICE is an injectable Fetcher contract used by this proof, NOT a configured hosted Django service. No Wrangler service binding or upstream host was created. Cloudflare cannot directly bind a Django process as a Worker service. A real supported reverse-proxy/service topology, existing backend availability and static-asset delivery still need implementation/verification within approved deployment scope. With no binding, the route returns503 rather than redirecting to the suspended Render host. Do not call hosted recovery fixed from this packet. The alias /accounts/login/ redirects to the existing /login route so unchanged recovery templates can return to Worker sign-in.

Recovery resets revoke all existing cf_sessions for that user on the allauth password_reset signal. Django-only instances without that table do not create it from a request. New Worker sessions issued after the reset are allowed. Broader concurrency/transactional session revocation and operational mail delivery are not certified by this proof.

Activation simulation is only a memory model with asserted signatureVerified fixture. It is never imported by product code. There is no actual cryptographic Yoco receipt verification, checkout, bill, DB activation, entitlement proof or paid journey. See docs/qa/14nov-yoco-activation-design.md for source-grounded design and held owner choices.

All source remains isolated, unpushed and undeployed. Current Yoco links/config, pricing/billing, production DB, real customers and all A-F production release holds are unchanged.
