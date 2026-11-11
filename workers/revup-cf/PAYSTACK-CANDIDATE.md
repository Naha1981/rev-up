# Paystack test candidate

Status: candidate only. No live release is authorized. The deployed billing page is unchanged.

## Behavior

- Server-created hosted checkout. Server-owned amounts: Starter 49900, Growth 99900, Business Pro 199900 ZAR cents.
- One payment buys one calendar month; payments do not create recurring charges. Another successful payment extends a current month. A change of plan during an already-paid test month is refused pending review.
- The account's authenticated user supplies the email; the browser cannot select another business, price or currency.
- Paid access is granted only after a server-to-server verify call matches the saved reference, test domain, amount, currency and account email. A redirect alone grants nothing.
- Both the modern timestamped Paystack-Signature header and pre-migration x-paystack-signature are supported. Once a webhook signing secret is configured, legacy-only signatures are refused. Invalid modern headers never fall back to legacy by default. Accounts without the modern signing-secret control may explicitly configure PAYSTACK_SIGNATURE_MODE=legacy, which authenticates only the documented raw-body legacy HMAC. A configured modern secret always overrides that setting.
- Organization locks, unique references, a unique provider receipt and transactional writes prevent duplicate activation. Repeated checkout taps reuse a pending link. Failed writes roll back and may be retried.
- Existing PayFast recurring tokens are not silently migrated or cancelled.
- A separate entitlement table records paid-through time; expired test months lapse before the next authenticated request.

## Test configuration

Required: PAYSTACK_ENABLED=true, PAYSTACK_SECRET_KEY beginning sk_test_, PAYSTACK_TEST_ORG_IDS containing only fictional organization UUIDs. Optional PAYSTACK_WEBHOOK_SECRET when that account has generated a whsec_ test signing secret. Never put secrets in source control, logs, screenshots or chat.

Live keys are deliberately rejected. Only allowlisted fictional organizations may initialize or reconcile. The supplied test configuration must use a separate fictional database. Candidate tables are created additively; no existing payment tables or provider connections are removed.

Webhook route: POST /billing/paystack/webhook. Signed charge.success triggers an independent verify call. Callback route: GET /billing/paystack/callback, authenticated and bound to the active organization. Start route: POST /billing/paystack/start, workspace-settings permission and same-origin required.

The default disabled candidate retains the existing billing path unchanged. Enabling test mode shows a clear test-only notice and test payment buttons.

## Reproducing evidence

- npm test in workers/revup-cf runs the unit suite, including paystack.test.mjs.
- test/paystack-integration.mjs requires a loopback database named *_test and fictional fixtures. It blocks all unexpected outbound calls and simulates the provider responses. It is not Paystack-network evidence.
- The integration checks cover concurrent checkout/confirmation, tenant isolation, failed/pending/abandoned charges, amount/currency/email/test-domain mismatch, modern and legacy signed webhooks, oversized/unsigned events, unsafe redirects, storage-failure rollback, retry recovery, recurring-token migration protection and month extension/expiry.
- UI proof at desktop and phone widths covers the candidate billing page and honest payment-not-confirmed page. Those images do not prove provider settlement.

## Live-release boundary

This candidate is not suitable for live payments yet. It must not be deployed to the production front door. Before a separate live-release decision: prove a provider-hosted test checkout and actual signed test webhook delivery; define refund/dispute handling and migration of existing paid periods; add explicitly approved live configuration and separate test/live receipt and entitlement namespaces; review policy, billing terms, recovery and monitoring; bind an exact tested artifact to the user's Go. Existing production subscriptions and provider settings are untouched.

## Official contracts checked

- https://paystack.com/docs/api/transaction/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/verify-payments/
- https://paystack.com/docs/payments/subscriptions/

These APIs are used through server requests. Public/Inline keys are not needed for hosted checkout.

## Actual Test Mode provider proof, 11 November 2026

Hosted R499 ZAR checkout, browser callback and genuine signed charge.success delivery passed. Reference RU-PS-31d85041fca54f85b1cbeb743b34e142, provider transaction 6751484699. The webhook returned200 after strict raw-body legacy HMAC validation and independent provider verification, and created the paid fictional receipt. The account dashboard exposed no modern signing-secret field, so the account was explicitly pinned to its documented legacy signature contract. No real money, production database or live configuration was used. The temporary Test Webhook URL was cleared and verified blank; the tunnel and receiver were stopped.
