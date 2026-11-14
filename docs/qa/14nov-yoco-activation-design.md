# RevUp Yoco activation design - not implemented

Objective: connect an authenticated payment receipt to exactly one stored organisation without treating a browser return as payment. Owner: implementation, with owner decision on billing changes pending. Input: current source612d061 and explicit11Nov approval. Status: DESIGN ONLY, no provider/account/config/price/billing change.

## Verified current state

The Worker billing page contains three existing static pay.yoco.com/r links. Signup writes Starter/pending_activation. No current Yoco receipt-to-org handler exists in that Worker. Neither a static-link click, a redirect nor a database flag is payment proof. This is why the five draft journeys are not sellability proof.

Official docs inspected14Nov2026:
- https://developer.yoco.com/online/api-reference/checkout/payments/accept-payments/ - server-created checkout, amount in cents, ZAR, retained checkout ID/redirect, metadata, optional idempotency key. Explicitly says not to verify payment using successUrl.
- https://developer.yoco.com/online/api-reference/webhooks/events/successful-payment/ - payment.succeeded payload includes payment ID, amount, currency, status, mode and metadata.checkoutId.

These API documents do NOT establish that the existing static payment links deliver equivalent metadata, expose matching merchant identity or support organisation-specific references. Actual merchant capabilities, notification settings and credentials have not been inspected or changed. Do not retrofit Checkout API assumptions onto existing links.

## Exact proposed server data path, after separate approval

1. At an authenticated, membership-authorised request, create a pending invoice with server-owned random ID, org ID, immutable selected plan/version, existing price in cents/ZAR, expected merchant account, environment, creation/expiry. Never take the amount or org from a browser return. Store one durable idempotency key per attempt.
2. If approved to use Yoco Checkout API, create the checkout on the server with invoice correlation metadata, store the returned checkout ID and expected account/environment before returning its hosted URL. Checkout creation is not a payment. This is a billing integration change and is not covered by keeping existing static links untouched.
3. Receive the raw webhook body with bounded size. Authenticate using the actual account's official current signature contract and replay window. Signature scheme has NOT been verified against the connected merchant. Do not ship a guessed verifier. Match the credential/account environment, then type payment.succeeded, succeeded status and test/live mode. Test can never activate a live organisation.
4. Find stored invoice by the stored checkout ID. Metadata is a correlation hint, not authorisation to select an organisation. Validate exact amount, currency, account, invoice version and expiry. Unknown, conflicting, unmatched, partial, over/underpaid or late receipts are held for reconciliation, not silently granted access.
5. In one transaction lock invoice and organisation. Insert unique provider/account/environment/event ID and unique provider/account/environment/payment ID. Same IDs/same facts are no-op200; conflicting facts are held and audited. Change only that invoice's org to the canonical paid plan/activation state and append a receipt-backed entitlement event. Preserve immutable receipts and activation timestamp. Concurrent duplicate receipts must produce exactly one grant.
6. Browser return displays pending until the server ledger confirms activation; no write from GET. Polling is bounded and never evidence by itself. Refresh, lost tab and delayed duplicate webhook produce the same entitlement state.
7. Refund, expiry, renewal/grace and cancellation behavior need explicit product policy and verified provider contract. Do not promise automated recurring debit from monthly static links. Don't revoke/renew based on an unverified event. Operational review queue and a named acknowledger are release gates.

## Choices held for owner, not a recommendation to change configuration now

A. Keep today's static monthly links untouched. Add only a verified reconciliation workflow once the actual Yoco receipt/account/reference evidence is available and approved. Human receipt review is assisted activation, not self-serve.
B. Keep Yoco as provider but approve a separate Checkout API integration with organisation-specific invoices and authenticated receipts. This changes billing implementation and likely webhook configuration, so it needs explicit approval and controlled test credentials, then a separately approved live payment/refund test.

Neither choice is implemented here. No Paystack/PayFast switch or new provider is proposed.

## Test-only simulation and remaining evidence

Run node tools/qa/14nov-recovery/activation-SIMULATION-ONLY.mjs. It uses Maps and fictional values only. The signatureVerified boolean is an asserted test fixture, NOT cryptographic verification. It demonstrates intended rejection/duplicate semantics only, not durable transactions, real merchant linkage, a real checkout, payment, entitlement enforcement or production readiness. It is never imported by the product.

Before implementation/release: actual static-link vs Checkout evidence, owner decision, canonical tier/entitlement policy, approved additive schema, official account-scoped receipt verification, real PostgreSQL concurrency, event integrity, failure/retry tests, controlled test-mode provider round-trip, five paid-activation/first-value journeys, separate live-charge authority and all production A-F gates. No choice or permission is inferred from this design.
