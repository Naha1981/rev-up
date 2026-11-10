# Fictional stranger workflow checks

These scripts are for an isolated disposable PostgreSQL database and loopback-only test server. Never point them at a production database or a public customer workspace.

Initialize an empty database with repository Django migrations, then apply `worker-test-schema.sql`. The SQL adds the Worker-only table/column contracts absent from the Django migrations. It contains no production schema export or data. Create only fictional users and fixtures. Use a test server bound to 127.0.0.1:8765 with all external server-side requests denied and no real API credentials.

The Playwright scripts use `/tmp/revup-fictional-state.json` from a fresh fictional signup. Run onboarding first. Activate only the fictional organization as a fixture for paid-feature testing, without a payment. The booking script needs a clearly fictional requested booking tied to its fictional contact; it does not simulate WhatsApp ingress or Google Calendar. Reset the fictional booking/loyalty state before rerunning that script. The order script needs the meal created by the native script and one unlinked draft quote.

The scripts test native UI actions, then reload and inspect persisted state. They do not certify payment settlement, external message delivery, AI-provider output, or connected-provider publication. A passing count applies only to the named checks, never to whole-product or user-capacity readiness.
