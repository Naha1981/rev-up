# LeadMachine Property

Instant WhatsApp lead response for South African estate agents.

A portal enquiry email (Property24 / Private Property) lands in the agent's
mailbox. Within seconds the lead gets a WhatsApp reply, gets qualified
(budget, finance, timing), and picks a viewing slot - before a competing
agent has even seen the enquiry.

Status: **first build, dry-run only**. No WhatsApp message goes to a real
number without the owner's explicit go-ahead. See "Going live" below.

## What is built

| Piece | Where | Notes |
|---|---|---|
| Enquiry email parser | `src/parser/` | Property24 + Private Property formats, MIME (multipart, base64, quoted-printable, HTML-only), SA phone normalisation, generic fallback for forwarded/unknown formats, confidence score |
| Instant reply + qualification flow | `src/flow/` | Text-only numbered-reply conversation (matches the WhatsApp engine's constraint), tolerant answer extraction, re-asks only what is missing |
| Viewing slots | `src/flow/slots.ts` | `CalendarProvider` interface + stub (weekday 17:00 / Sat 10:00 & 12:00 SAST). Real Google Calendar adapter plugs in here |
| WhatsApp transport | `src/whatsapp/operatorClient.ts` | NahaLabs WhatsApp Operator contract (`POST /send`, `X-API-Key`/`X-App-Id`/`X-Tenant-Id` headers) from the `my-own-whatsapp` repo. **DryRun client is the default and logs what WOULD be sent** |
| Pipeline | `src/pipeline.ts` | email in -> parse -> reply out; low-confidence or phone-less enquiries go to `needs_review` instead of guessing |
| Gmail intake | `src/google/gmailIntake.ts` | Read-only poll for portal mail, optional processed-label marking |
| Webhook receiver | `src/webhooks/operatorWebhook.ts` | HMAC-verified Operator webhook -> lead reply routing |
| Google Calendar | `src/google/googleCalendar.ts` | Live free/busy slot filtering + booking writes (stub stays default) |
| Composition | `src/service.ts` | Wires intake + webhook + calendar + pipeline |
| Demo | `src/demo.ts` | End-to-end on synthetic fixtures, all dry-run |
| Persistence | `src/store/leadStore.ts` + `db/schema.sql` | Postgres snapshots + intake dedupe ledger; in-memory fallback for dev/demo |
| Tests | `test/` | 33 tests: parser per provider/format, phone normalisation, conversation walk, pipeline routing, intake, webhook (incl. live HTTP), calendar, store round-trip/restart recovery |

## Run it

```bash
npm install
npm test        # 33 tests
npm run demo    # end-to-end dry-run on fixtures/, transcript in demo-out/messages.jsonl
```

## Live connections (phase 2)

### 1. Gmail intake (`src/google/gmailIntake.ts`)

Polls the agent's Gmail for portal enquiry mail and feeds raw RFC822 into the
parser. **Read-only by default.** Optional `GMAIL_MARK_PROCESSED=true` adds a
`LeadMachine/Processed` label to handled messages (addLabelIds only - no
deletions, no content changes). Configure `GMAIL_QUERY`,
`POLL_INTERVAL_SECONDS`, `GMAIL_MAX_PER_POLL`.

### 2. Operator webhook receiver (`src/webhooks/operatorWebhook.ts`)

HTTP server (default `:3100`): `POST /webhooks/whatsapp` verifies
`X-Webhook-Signature` (HMAC-SHA256 of the exact raw body with the shared
`WEBHOOK_SECRET`, timing-safe compare), extracts the sender and text from the
raw Baileys message, ignores own outbound / group / non-text messages, and
routes into `handleLeadReply`. `GET /health` for uptime checks. Set the
account's `webhookUrl` on the Operator to this endpoint and use the same
`WEBHOOK_SECRET` on both sides.

### 3. Google Calendar provider (`src/google/googleCalendar.ts`)

Replaces the stub when Google OAuth env is present: over-generates candidate
slots from the weekly template, filters them with the live free/busy API,
and writes the confirmed viewing (`Viewing: <listing> - <lead>`, 30 min,
Africa/Johannesburg) to the agent's calendar on booking. The event link goes
into the agent handover note; a failed write still confirms the lead and
flags the agent to book manually.

### Google OAuth setup (one-time, per agent)

Create an OAuth client (desktop app) in Google Cloud, then consent with
scopes `https://www.googleapis.com/auth/gmail.modify` and
`https://www.googleapis.com/auth/calendar`. Exchange the code for a refresh
token and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
`GOOGLE_REFRESH_TOKEN`. `gmail.readonly` suffices when
`GMAIL_MARK_PROCESSED=false`.

`src/service.ts` wires all three together (`npx tsx src/service.ts`): poll ->
instant reply, webhook -> qualification -> booking. Without Google env it
runs intake-disabled with the stub calendar - the demo path.

## Parser: what the fixtures assume (MUST be confirmed with real samples)

The fixtures in `fixtures/` are modeled on the known portal layouts:

- **Property24**: sender `@property24.com`, listing title in the subject,
  body as `Listing:` / `Listing number:` / `Price:` / `Name:` / `Email:` /
  `Contact number:` labels plus a `Message:` section and a portal link.
- **Private Property**: sender `@privateproperty.co.za`,
  `Property:` / `Reference:` / `Asking price:` labels, `Enquirer details`
  block, `Message` section.

The parser is label-tolerant (many synonyms per field, subject-line title
fallback, phone discovery in free text, HTML-only bodies) so small layout
differences should still parse - but **three real Property24 and three real
Private Property enquiry emails are needed to lock this in**. Drop them in
`fixtures/` and run `npm test` / `npm run demo`; extend the label lists in
`src/parser/labels.ts` where they differ.

## Production

- `npm run build` compiles to `dist/`; `npm start` runs the compiled service.
- `Dockerfile`: multi-stage node:22-slim build (ci -> build -> runtime, prod deps only).
- Render deployment is managed in the Render dashboard (no repo blueprint); health check on `/health`, `WHATSAPP_MODE=dry-run` default, secrets set in the dashboard.
- `db/schema.sql`: `lead_conversations` (snapshot per lead phone, upserted) + `processed_intake` (dedupe ledger across restarts). Without `DATABASE_URL` the service runs on in-memory state and says so at boot.
- `.github/workflows/ci.yml`: install, typecheck, 33 tests, build on every push/PR.
- Graceful shutdown: SIGTERM/SIGINT stop the poll, close the webhook server and the Postgres pool.
- State survives restarts: conversations are snapshotted after every message and revived on the next inbound reply (tested).

## Going live (not yet - on purpose)

1. `WHATSAPP_MODE` defaults to `dry-run`. `live` requires `OPERATOR_URL`,
   `OPERATOR_API_KEY`, `WA_ACCOUNT_ID`, `APP_ID`, `TENANT_ID` (see `.env.example`)
   and sends through the Operator exactly like the Baron/Flavourly app does.
2. Email intake is not wired yet. Planned: poll the agent's Gmail for portal
   senders (or a forwarding rule to a webhook) and feed raw mail into
   `processEnquiryEmail`.
3. Inbound lead replies arrive via the Operator's signed webhook
   (`X-Webhook-Signature`, HMAC-SHA256 with `WEBHOOK_SECRET`) and route into
   `handleLeadReply`.
4. Swap `StubCalendarProvider` for a Google Calendar provider that reads the
   agent's free slots and writes the confirmed booking.

Keep volume low and replies-only on the unofficial engine - per the owner's
2026-10-05 decision for the shared WhatsApp number, and the standing rule
that no automated WhatsApp message goes out without his explicit go-ahead.

## WhatsApp transports (one seam, three engines)

`WHATSAPP_TRANSPORT` picks the live engine; `WHATSAPP_MODE=dry-run` remains
the default everywhere - no message reaches a real number without an
explicit opt-in.

| Transport | Use | First contact | Webhook |
|---|---|---|---|
| `cloud-api` | Production default (official Meta API) | Approved template only (24h rule); refuses without one | `POST+GET /webhooks/cloud-api` (X-Hub-Signature-256 HMAC + verify handshake) |
| `evolution` | NahaLabs Growth infra | sendText | `POST /webhooks/evolution` (shared `x-webhook-token`) |
| `operator` | my-own-whatsapp engine, dev/low-volume only | sendText | `POST /webhooks/whatsapp` (HMAC-SHA256) |

One webhook server exposes all configured paths; secrets determine which are
active. See HANDOFF.md for the nahalabs-growth-service merge map.
