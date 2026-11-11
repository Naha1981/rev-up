# Five synthetic stranger pre-payment journeys

This is a partial journey verification harness, not a product-release gate pass.
It exercises the actual main Worker application bundle and complete Django schema
against a separate synthetic database, without activation fixtures or account edits.

## Safe scope

- Dedicated Neon project `bitter-haze-11752204`, database `revup_journeys`.
- No production DB, data snapshot, customer identity, session or transport secret.
- Exact synthetic DB host/name plus a single synthetic/egress-disabled boundary
  marker checked before the application starts.
- Loopback listener only. All application HTTP fetches denied; browser requests
  denied outside loopback. No scheduled handler is called.
- No messages, posts, AI calls, payments, refunds, provider registration or login
  outside the test app. Payment buttons are inspected, never opened.
- No direct account state edits. Every account remains `starter/pending_activation`.
- Browser contexts are independent. DB reads verify saved industry and draft.

## Setup

1. Use Python 3.12 and the repository requirements. On a new synthetic DB only,
   run the existing Django migrations (217 applied in the 11 Nov evidence run)
   with an isolated settings module, dummy email and no studio worker.
2. Apply `../worker-test-schema.sql` only to that synthetic DB.
3. Explicitly establish `cf_staging_boundary` with the single marker
   `revup-full-journey-11nov2026`, `synthetic_only=true`, `egress_disabled=true`.
4. Build the current Worker test bundle with `npm run build:test` in
   `workers/revup-cf`. Install the QA-only Playwright browser driver separately;
   do not add it to production dependencies. The run used the installed Chrome
   executable `/opt/google/chrome/chrome`.
5. Set `REVUP_JOURNEY_DATABASE_URL_FILE` to a private credential file for the
   synthetic DB and run `node tools/qa/journeys/five-stranger-prepayment.mjs`.

The literal project/host restriction is intentional. A different environment needs
its own reviewed boundary, not a command-line switch that accepts arbitrary DBs.
The harness refuses to start without an explicit credential-file argument.

## What is tested

Five industries: plumbing, restaurant, dental, real estate, container transport.
Viewports: 390x844 phone, 820x1180 tablet and 1280x900 desktop.
For each: discovery page, real signup form, onboarding form/save/reload,
plan/payment page, manually entered fictional draft/save, read-only persisted
state, password-recovery redirect inspection. No invented AI or provider result.

## What does not pass yet

- Email verification: signup reaches onboarding with zero verified email rows.
- Payment and plan activation: the source presents static external Yoco links and
  describes manual confirmation. This harness does not assert settlement,
  self-service activation, Growth/Business Pro rights or payment recovery.
- Password recovery: source redirects to production Render, which can sleep.
  The test records the redirect and deliberately does not follow it.
- First approved AI draft, enquiries/bookings/quotes, paid-tier recovery,
  renewal/cancellation, export/deletion and full accessibility have not passed.
- This run is isolated execution, not a hosted full-app deployment or independent
  QA. It does not establish the production A-F gates.

Screenshots are actual browser captures, not mockups. The result JSON records
partial completion and blockers separately. Do not rename its result to five
complete journeys. Synthetic fixture rows are retained for inspection; no deletion
or cleanup is automatic.
