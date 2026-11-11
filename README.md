# RevUp

## Your WhatsApp employee

RevUp by NahaLabs brings customer messages, customer cards, enquiries, bookings, quotes, repeat visits, reviews and approved social content into one business workspace.

## Start with the current application

**The live application at https://revup.nahalabs.co.za is the TypeScript Cloudflare Worker in [`workers/revup-cf/`](workers/revup-cf/), not the older Django templates.** Its production entry is `src/worker.ts`, which imports `src/index.ts`.

For the current interface, read `workers/revup-cf/src/index.ts`, `journey.ts`, `landing.ts` and the feature modules below. Do not use `templates/base.html` or `theme/static_src/src/styles.css` as a description of the live interface. Those belong to the older Django stack, retained for background jobs and rollback.

The live navigation has five main destinations: Home, Customers, Bookings, Posts and Settings. Additional tools sit in expandable groups and the Search menu. A five-screen walkthrough is not a complete feature inventory.

See [the current feature and route map](docs/current-product.md) for the full screen list, source files and activation limits. Checked against the live navigation on 11 November 2026. A screen opening is evidence of a screen, not proof that its external services are connected or working for every business.

## Current feature map

| Area | Screens and workflows |
| --- | --- |
| Home | Today, recent activity and next steps. |
| Customers | WhatsApp messages and history; customer cards with name, birthday, preferences, spend, VIP flag and private notes. |
| Lead pipeline | Public enquiry form, enquiry capture, stages and values, follow-up drafts and approval. Business Pro access applies. |
| Bookings and quotes | Booking status, completion, Google Calendar connection, quotes and quote status. |
| Repeat business | Waitlist, loyalty points, rewards and vouchers. |
| Restaurant tools | Menu items, prices, specials, availability, sales and customer orders from a public menu. |
| Posts and reviews | Post drafts, per-channel status, submission for review, approvals, scheduling and customer review links. Delivery depends on account connections and provider support. |
| Content team and photos | Research/writing/review tools and the business media library. Generated words need factual review. |
| Competitor watch | Competitor prices, promotions, opportunities and campaign drafts. Estimates are not collected revenue. |
| Industry ideas | In-app Radar: industry selection, post ideas and sourced demand signals when available. This is not the separate owner operations dashboard. |
| Customer campaigns | Approved messages to consenting customers, with sending and opt-out checks. Not a paid-ad buying platform. |
| Results | Message counts, post status and review-link activity. Not guaranteed sales attribution. |
| Customer tools | Printable guest WiFi/enquiry QR card and tracked links. |
| Owner tools | Business Pro owner assistant and business-record help. Setup and approval rules still apply. |
| Settings | Setup checklist, business details, WhatsApp and calendar connections, business switching, monthly plan and payment status. |

## Plans and payment status

| Plan | Monthly price (ZAR) | Configured monthly reply allowance | Connected channels |
| --- | ---: | ---: | ---: |
| Starter | R499 | 500 | 1 |
| Growth | R999 | 1,000 | 2 |
| Business Pro | R1,999 | 2,500 | 3 |

No setup fee. Plan access, usage limits and activation checks apply. A plan name in a database is not evidence of payment or successful activation.

The current live billing screen uses **one-off Yoco payment links for each month**, not automatic card charging. PayFast sandbox callback code remains in the repository; its presence does not make it the current checkout. Paystack work on a review branch is not a live release. Do not describe test receipts as sales or collected revenue. See [pricing notes](workers/revup-cf/PRICING.md).

## What availability does not mean

- Messaging, calendar sync, reviews and publishing need the right business account, permissions and end-to-end checks.
- Facebook/Instagram posting must not be described as proven live merely because its connection or post screen exists.
- The lead pipeline is not a promise of every full-CRM feature. Customer campaigns are not a complete advertising campaign manager.
- Activity, link clicks, opportunities and estimated impact are not proven revenue or guaranteed outcomes.
- Inherited API, media-processing, reporting and team features in Django are not automatically available in the Worker interface.
- No claim of unattended activation or production-ready two-factor authentication is made here.

## Implementation and documentation

| Purpose | Start here |
| --- | --- |
| Current routes, pages, billing and business workspaces | `workers/revup-cf/src/index.ts` |
| Navigation, Search menu and current landing page | `workers/revup-cf/src/journey.ts`, `landing.ts` |
| Receptionist, knowledge and owner assistant | `workers/revup-cf/src/receptionist.ts`, `assistant.ts` |
| Lead pipeline and follow-up handling | `workers/revup-cf/src/enquiries.ts`, `index.ts` |
| Waitlist, loyalty, vouchers, quotes and competitor opportunities | `workers/revup-cf/src/features.ts` |
| Menu and customer orders | `workers/revup-cf/src/menu.ts` |
| Content team, review follow-up, calendar and WiFi card | `workers/revup-cf/src/socialteam.ts`, `reviews.ts`, `calendar.ts`, `wificard.ts` |
| Current feature inventory and architecture | [`docs/current-product.md`](docs/current-product.md) |
| Worker release checks | `.github/workflows/revup-cf-gate.yml`, `tools/safe-release/` |
| Older Django stack and background jobs | `apps/`, `providers/`, `templates/`, `theme/`, `config/` |
| Historical Django architecture and original product spec | `development_specs/architecture.md`, `development_specs/feature-spec-social-media-management-v2.md` |
| Older Django API contract | `docs/agent-api.md`; verify target host and route before use. |

## Development and operations

The current front door uses a Cloudflare Worker with Node compatibility, PostgreSQL, server-rendered HTML and scheduled work. Its routing and cron configuration are in `workers/revup-cf/wrangler.toml`. Run the Worker unit suite from that directory with `npm test`; build a deployment candidate with `npx wrangler deploy --dry-run --outdir <candidate-directory>`. A dry-run does not publish.

The older stack uses Python/Django, PostgreSQL and background jobs. Its Docker, environment and theme-build instructions apply to that stack, not the live Worker front door. Do not remove the older stack just because it is not the front door.

Never commit credentials. Provider setup, persistent media storage and per-business connections require separate checks. Tests with mocked providers or fictional records prove only the tested paths. No whole-product readiness percentage or live delivery guarantee follows from a test count.

## Licence

This repository retains the AGPL-3.0 licence. See [LICENSE](LICENSE) and the existing source notices. RevUp's branding does not remove the obligations attached to inherited code.


### Industry and specialist pages

The Worker serves all 27 public industry pages at `/industries/:id`, linked from `/industries` and the homepage. Auto workshop has dedicated service/repair intake. The content team includes `/team/specialists`: all 50 roles can produce grounded, saved and reviewed briefs from supplied evidence. Checked briefs can become post ideas; no specialist brief itself sends, schedules or publishes. See [the current product map](docs/current-product.md) for limits and the owner approval path.
