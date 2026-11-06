# RevUp

## Your WhatsApp employee

RevUp by NahaLabs helps a business handle WhatsApp enquiries, keep customer details and booking requests together, and manage reviews and social content from one workspace.

This repository contains the implementation. A feature being present in code does not mean it is activated or accepted for a particular business. Messaging, payments, account connections and publishing need configuration and a verified end-to-end check before customer use.

## What is implemented

### Enquiries and customer follow-up
- Workspace-specific business information and reply drafts.
- Incoming WhatsApp enquiry capture, customer records and structured intake.
- Booking records and calendar connection code.
- Human handoff and conversation history.
- Reply-only sending rules and per-business usage limits.
- Review check-ins, review requests, reminders, click tracking and unsubscribe handling.

Messaging and review automation are gated. Connecting a number does not by itself prove that replies, bookings or review requests are working end to end.

### Content and publishing
- A content composer with per-platform captions and media, reusable templates, tags, version history and an idea board.
- A publishing calendar, recurring slots and posting queues.
- Internal and client approvals, comments and passwordless client review links.
- Publishing adapters, retries, rate-limit handling, status confirmation and audit logs.
- A media library with folders, image processing and video tools.
- Generated content drafts placed into a human review queue.

Actual publishing and performance data depend on each account's connection, permissions and platform support. No all-platform delivery guarantee is made here. Generated drafts need review before approval or scheduling.

### Business workspaces
- Organisations, separate workspaces, team invitations and role-based access.
- Workspace branding and publishing defaults.
- Customer-owned messaging connection flow, behind an activation flag.
- Monthly subscription checkout and validated payment callbacks.
- In-app and email notifications, API keys, a REST API and MCP endpoints.
- Social inbox sync and analytics code, with unavailable data handled separately from real results.

## Monthly plans

The current application defines these monthly plans in South African Rand:

| Plan | Monthly price | Monthly receptionist replies | Connected channels |
| --- | ---: | ---: | ---: |
| Starter | R499 | 500 | 1 |
| Growth | R999 | 1,000 | 2 |
| Business Pro | R1,999 | 2,500 | 3 |

No setup fee. These are the configured application prices and allowances, not evidence that live billing or every feature is enabled. Confirm the applicable plan, activation and billing terms before customer onboarding. Do not treat this table as a promise of unlimited use.

## What is not claimed

- A complete advertising campaign manager or full CRM deals pipeline.
- Proven revenue attribution or guaranteed customer outcomes.
- Every social platform supporting every inbox or analytics feature.
- Unattended customer activation without connection and acceptance checks.
- Production-ready two-factor authentication.

Customer records, enquiries and opportunity boards are implemented. That is not the same as a full CRM or an advertising platform.

## Implementation map

| Area | Source |
| --- | --- |
| Receptionist, contacts, intake and bookings | `apps/receptionist/` |
| Review requests and follow-up | `apps/receptionist/reviews.py` |
| Customer-owned messaging onboarding | `apps/receptionist/tenant_connect.py` |
| Subscription billing | `apps/workspaces/payfast.py`, `apps/workspaces/payfast_views.py` |
| Plan prices and limits | `apps/organizations/models.py`, `apps/workspaces/views.py` |
| Onboarding checklist | `apps/onboarding/` |
| Composer and content drafts | `apps/composer/`, `apps/content_agent/` |
| Scheduling and publishing | `apps/calendar/`, `apps/publisher/`, `providers/` |
| Social inbox and analytics | `apps/inbox/`, `apps/analytics/` |
| Approvals and client portal | `apps/approvals/`, `apps/client_portal/` |
| Media, teams and workspace settings | `apps/media_library/`, `apps/members/`, `apps/settings_manager/` |
| API and agent connections | `apps/api/`, `apps/api_keys/`, `apps/mcp/` |

## Development and operations

The current application uses Python 3.12+, Django, PostgreSQL and a background worker. Node.js is used to build the theme. See `.env.example`, `requirements.txt`, `package.json`, the Docker configuration and `docs/` for implementation details. Existing technical documents may describe inherited components; check current code and settings before following them.

Never commit credentials. External messaging, publishing, calendar, search, model, email, storage and payment services require their own configuration. Uploaded media needs persistent storage in production.

The 6 November 2026 code audit ran 1,268 regression tests successfully using an isolated SQLite test configuration and mocked provider responses. That proves those tested code paths, not a live payment, message delivery, platform connection, production database behaviour or a customer acceptance result. The content-generation suite was not completed in that bounded run.

## Licence

This repository retains the AGPL-3.0 licence. See [LICENSE](LICENSE) and the existing source notices. RevUp's branding does not remove the obligations attached to inherited code.
