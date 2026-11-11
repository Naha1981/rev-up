# P0 safety foundation, slice 1

Status: IMPLEMENTED and isolated TESTED only. Not staging-verified, not production-verified, not a complete P0 gate. Owner authorized isolated implementation at 11 Nov 2026 05:51 SAST. Production remains unchanged. No provider/billing/design changes.

## Included
- Additive migration 001: tenant-scoped durable inbound, leases/attempts/dead letters, control/audit, outbound/reservation/attempts and atomic budget tables.
- Durable receipt idempotency scoped to provider, tenant, account and event ID. Repeated receipt cannot overwrite original normalized payload. Claims use SKIP LOCKED; expired claims can recover; exhausted jobs persist dead.
- Explicit pause and suppression, permission/template/window eligibility evaluation, no shared credential fallback. STOP cannot be undone by ordinary resume.
- T-dispatch locks control before message, then reserves budget and records attempt in one transaction. STOP committed first prevents reservation. A consuming provider-start CAS permits only one caller per attempt to obtain a start token. A separate diagnostic check is not send authority. Lost start responses/crashes are held unknown, not retried. Short pre-fetch control recheck can block newly paused/expired attempts. A prior reservation/in-flight request cannot be recalled. Expired unresolved attempts become unknown and cannot re-reserve.
- Independent job runner returns safe per-job outcomes and always attempts cleanup.

## Not included / cannot claim fixed
- No production route imports these modules. Current live defects remain. No migration auto-run, no deployment and no provider HTTP calls in this slice.
- No provider adapter or receipt reducer, no actual sends. Provider idempotency/receipt/template contracts still require verification. Budget tightening persists even if the new limit is below already reserved usage; stale larger caller limits cannot widen it. These helper limits are not a replacement for authoritative plan configuration.
- Eligibility receives normalized facts from a future trusted adapter. Booleans are internal contract inputs, not authentication/permission proof. Route wiring must derive them from tenant-bound current DB/provider state and persist approval/permission/template evidence. Never pass request body booleans into these APIs.
- Inbound authentication/mapping inputs similarly require upstream verified raw-body signature/account mapping; this repository is not a webhook authenticator.
- Missing control fails closed. No legacy data backfill has run. STOP is currently channel/contact scoped in the foundation; cross-channel/global purpose suppression and integration with existing opted_out/needs_human must be designed/tested before dispatch activation.
- Pause during generation is not yet wired. Outcome settlement and effect transactions need lease ownership fencing through actual processing. A generic job lease alone does not make customer effects exactly once.
- Budget fixture currently tests one bucket per reservation; production must atomically reserve every required hour/day/plan bucket in a fixed lock order before enabling outbound, not call this function separately for each bucket.
- No staffed alert route, heartbeat persistence, automated backup/restore, capacity or real staging/customer journey proof. No safe outbound-enabled rollback artifact yet. All A-F gates HOLD.

## Deterministic tests and target safety
`npm test` includes original 318 tests and 22 new pure safety/credential/cron cases: 340 passed, zero failed/skipped. Existing tests include mocked external operations, never live customers.
`npm run test:safety-db`: 23 integration cases against synthetic PostgreSQL18.6 at hard-coded loopback127.0.0.1:55431 only. It never reads DATABASE_URL or production credentials. Each run creates a random isolated schema and drops only that schema afterwards. Original18-case suite ran twice; expanded23-case suite ran twice, 23/23 each, including ten concurrent duplicate receipts/claims, twenty reservations at cap1, stale lease fencing, tenant boundaries, STOP ordering, expiry-to-unknown and audit.
New modules pass focused TypeScript checking. Full-source baseline8errors remains open. Fresh dry-run artifact hash is unchanged from main/live because these modules are not imported into production routes: ea7c0c4ca17db9d4b75207271c1cd17f47a42028d7110c5cd8c5bd55fea2419b.

## Rollback and migration
No production deployment or production DB write occurred. For this unmerged branch rollback is simply not merging/releasing it; the live artifact is unchanged byte-for-byte. Migration was exercised only in synthetic test schemas, removed by test teardown. Do not run this SQL on production until backup/restore/cutover approval and mixed-version safety tests exist. Schema compatibility is not an outbound-safety guarantee. Retained unsafe baseline cannot become an outbound-enabled rollback target. Use reviewed safety-compatible rollback or independently proven egress block, otherwise maintenance/fail closed.

## Next isolated slice
Review this foundation independently, then close multi-bucket reservation, global suppression and persisted eligibility/credentials/approval bindings; add raw-signature tenant adapter and outcome reducer with unknown-delivery handling. Build safe cutover/rollback tests before route activation. Frontend and billing/provider replacement remain blocked. Yoco unchanged; Paystack RevUp candidate paused.

## Slice2 - global STOP and multi-bucket foundation
002 adds tenant/contact suppression independent of channel, preserving prior channel STOPs. STOP in one channel blocks every channel's queued/unreserved dispatch and consuming provider-start claim. Normal resume cannot clear it. A separate contact identity merge/re-consent design is still required; this global key assumes the same canonical tenant contact ID across channels. No live backfill.

All supplied hour/day/month buckets reserve in one transaction, lock sorted canonical identities, persist every tightening even when exhausted, and charge none if any bucket is exhausted. Reservations retain per-attempt bucket links, tenant-bound by composite foreign keys. Caller omission of a required bucket is not detected: the future persisted authoritative policy adapter must supply the complete required set. No production caller uses this API yet.

Expanded PostgreSQL suite28/28 pass twice, including cross-channel suppression, reserved cross-channel start blocked, all-or-none exhausted bucket behavior,20competing reservations with reversed input order and canonical duplicate-period denial. Full Worker340/340 passes, focused types pass. No production imports or calls. All remaining next-slice blockers unchanged except these two foundations now implemented/tested, not production verified.

## Slice3 - transaction-fenced DB effects and delivery reducer
003 adds tenant-bound effect keys, explicit provider/account binding on outbox and immutable deduplicated delivery receipts. applyInboundEffects locks the exact tenant/job/lease, runs database-only effects on that same client, checks wall-clock lease again and completes atomically. Handler failure or stale lease rolls back effects. AI/provider/email/network work must never occur in this transaction. The callback is internal code, not client-supplied SQL or a public plugin.

Provider outcomes settle only against the consumed start token, exact message/attempt/tenant/provider/account. Success requires a real provider message ID supplied by a verified adapter. Unknown stays non-retryable; an exact late response can reconcile it. Signed/mapped delivery receipts are scoped to exact provider/account/message and deduplicated; read/delivered cannot regress, and cancelled/held/queued never resurrect. Receipt authentication booleans remain normalized internal adapter inputs, not self-authenticating request fields. No actual provider integration or webhook route is activated.

Expanded synthetic PostgreSQL suite40/40 passes twice; original340Worker tests pass. No production wiring, no migration/deploy, no real messages/charges/refunds or provider/billing/frontend changes. Persisted authoritative eligibility, trusted adapter proof and safe cutover/rollback remain open; P0 and releaseA-F not complete.

### Independent review correction: receipt before response
003b adds durable unmatched-receipt storage. Reducer returns typed invalid/duplicate/retryable_unmatched/reconciled. An unmatched authenticated receipt MUST NOT complete its durable inbound job; retry or hold it. Settlement and receipt ingestion serialize on a tenant/provider/account/message advisory lock, preventing the receipt-before-acceptance race. Accepted settlement reconciles all matching unmatched/held receipts atomically; repeat/out-of-order events remain monotonic. Unknown response with no verified provider ID stays held, never guessed by contact/time. Unmatched rows age to held; alert delivery and scheduling remain a future monitored-adapter gate, not a claim this primitive sends alerts.

Four added real-DB cases exercise repeated early receipt, read/delivery before unknown response, concurrent receipt/response, and aged-held receipt later reconciled. No provider callbacks are live.
