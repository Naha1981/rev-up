# Handoff: responder module -> nahalabs-growth-service (ONE pipeline, Stage 1)

Built to the standing product definition (17 Oct): this is the Stage-1
WhatsApp responder, packaged as a module for the single pipeline, not a
standalone product. Real-estate is the first vertical (config/templates);
the same engine responds to any business's inbound WhatsApp.

## What this module does

Portal enquiry email (Property24/Private Property) or inbound WhatsApp ->
instant reply -> qualification (budget / finance / timing) -> viewing slot
from the business's calendar -> booking confirmation + owner handover note.
Engagement events are the Stage-3 aggregation input (see "Pipeline hooks").

## Merge map (into nahalabs-growth-service)

Copy as `src/modules/responder/`:

| Source here | Lands as | Notes |
|---|---|---|
| `src/parser/` | `modules/responder/parser/` | P24/PP enquiry email parsing; portal-agnostic labels |
| `src/flow/` | `modules/responder/flow/` | qualification conversation, slot logic, message templates (the vertical lives here) |
| `src/pipeline.ts` | `modules/responder/pipeline.ts` | intake -> reply orchestration |
| `src/store/leadStore.ts` | `modules/responder/store/` | Postgres snapshots + intake ledger; reuse the service's existing pg pool and run `db/schema.sql` as a migration |
| `src/whatsapp/` | `modules/responder/transport/` | seam: dry-run (default), Cloud API, Evolution, Operator |
| `src/webhooks/` | `modules/responder/webhooks/` | one receiver, three signed/tokened paths |
| `src/google/` | `modules/responder/intake/` | Gmail poll + Calendar provider; reuse the service's Google OAuth if it has one |
| `test/` (all) | `modules/responder/__tests__/` | 43 tests; node:test runner |
| `src/service.ts`, `src/demo.ts` | DO NOT copy | standalone dev harness; the Growth service wires the module into its own boot/web server |

Runtime dep: `pg` only. Everything else is Node 20+ stdlib + fetch.

## Transport seam (three engines, one interface)

`WhatsAppClient { mode, sendText(to, text), sendInitial?(to, firstName, listing) }`

- **cloud-api** (production default): official WhatsApp Business Cloud API.
  First contact to a fresh lead MUST be an approved template (24h rule) -
  `sendInitial` throws without `WA_CLOUD_TEMPLATE_NAME` so we can never
  silently violate policy. Replies then flow free-form inside the window.
- **evolution**: the Growth system's existing Evolution API instance
  (`POST /message/sendText/{instance}`, `apikey` header; `messages.upsert`
  webhooks with a shared-secret `x-webhook-token` header we configure).
- **operator**: his my-own-whatsapp engine. Dev/low-volume only - the 067
  restriction shows why the sellable product must not depend on it.
  **Never wire the 067 number into anything.**

`WHATSAPP_TRANSPORT` selects; a live build with incomplete config throws.
Dry-run remains the default everywhere (no message to a real number without
his explicit go-ahead).

## Webhook endpoints to expose in the Growth service

- `POST /webhooks/cloud-api` + `GET /webhooks/cloud-api` (Meta verify handshake)
- `POST /webhooks/evolution` (shared-token header)
- `POST /webhooks/whatsapp` (Operator HMAC) - only if the Operator is kept

## Env contract

See `.env.example`: WA_CLOUD_*, EVOLUTION_*, OPERATOR_*, GOOGLE_*,
GMAIL_*, GCAL_*, WEBHOOK_*, DATABASE_URL, AGENT_NAME/AGENT_PHONE.

## Pipeline hooks (stages 2-4)

- Every state transition is a `LeadConversation.snapshot()` - persist these
  per workspace and Stage 3 gets WhatsApp engagement data (response rates,
  qualification completion, bookings) for post generation.
- The vertical (real estate) is templates + intake query + calendar config;
  restaurant vertical would reuse the same engine with its own templates.

## Verified (proof logs, 17 Oct)

43/43 tests; three-transport webhook smoke (signed/tokened 200s, 401s);
compiled service boot + SIGTERM shutdown; genuine Gmail MIME + real
freeBusy shape replays; Postgres store round-trip via fake (real DB on
Render untested - no Postgres in the build sandbox).

## Unverified / needs the platform

Real Meta app + WABA + approved template; real Evolution instance
credentials; real Google OAuth consent; real Postgres; his go-ahead for
WHATSAPP_MODE=live.
