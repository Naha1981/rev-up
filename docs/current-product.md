# Current RevUp product and route map

Checked against the authenticated live navigation at https://revup.nahalabs.co.za on 11 November 2026 and the Worker source on main. This is a screen inventory, not a certification that every integration is activated. No customer records or private identifiers are included here.

## Read the right implementation

- Production front door: `workers/revup-cf/src/worker.ts` imports the handler in `index.ts`.
- Current HTML, shared page styling, billing, workspaces and route handling: `index.ts`.
- Current navigation, expandable groups and Search tool index: `journey.ts`.
- Public landing page: `landing.ts`. Legal copy: `legal.ts`.
- PostgreSQL is shared with the retained Django application. The older Render stack still serves background work and is a rollback target; it is not the current interface.
- `templates/`, `theme/`, `apps/` and `providers/` contain inherited Django functionality. Do not infer that every inherited feature is exposed by the Worker.

## Screen inventory

Paths below are application routes. Dynamic placeholders are not real customer IDs. Search exposes tools that may be inside collapsed groups or restricted by plan, role or business setup.

| Screen / capability | Route | Current source and limits |
| --- | --- | --- |
| Today / home | `/` | `index.ts`: activity and next-step cards. |
| Customers hub | `/customers` | `index.ts`: recent conversations and customer tools. |
| Customer messages | `/inbox` | `index.ts`, `receptionist.ts`: conversation list and history; sending requires a working connection and consent rules. |
| Customer card | `/inbox/:contactId` | `index.ts`: name, birthday, dietary/preferences notes, lifetime spend, VIP, private notes and visit count. Workspace-scoped. |
| Enquiries and follow ups / lead pipeline | `/frontdesk` | `index.ts`, `enquiries.ts`: stage/value tracking and follow-up drafts. Business Pro gate. The route identifier is historical, not the customer-facing product name. |
| Public enquiry form | `/f/:workspaceId` | `index.ts`, `enquiries.ts`: capture enquiries into the business workspace. |
| Bookings and quotes hub | `/work` | `index.ts`: upcoming bookings and links to operational tools. |
| Bookings / calendar connection | `/bookings` | `index.ts`, `calendar.ts`: booking states, completion and calendar connection; Google credentials and account consent are required for sync. |
| Quotes | `/quotes` | `index.ts`, `features.ts`: amounts and quote status. A saved quote does not prove delivery. |
| Waitlist | `/waitlist` | `index.ts`, `features.ts`: waiting customers and offers; sending guards still apply. |
| Loyalty and vouchers | `/loyalty` | `index.ts`, `features.ts`: customer points, rewards and vouchers. |
| Menu and specials | `/menu` | `menu.ts`: dishes, prices, availability, specials and sales. |
| Public menu | `/m/:workspaceId` | `menu.ts`: customer-facing menu and order entry. An order record is not proof of payment. |
| Customer orders | `/orders` | `menu.ts`: order progress and handover. |
| Posts and reviews hub | `/growth` | `index.ts`: content, review and opportunity tools. |
| Social posts / new post | `/posts`, `/posts/new` | `index.ts`: drafts, caption generation, media and per-channel state. Provider delivery must be checked separately. |
| Review posts | `/approvals` | `index.ts`: review/approval workflow. Approval is not a delivery receipt. |
| Customer reviews | `/reviews` | `index.ts`, `reviews.ts`: review requests and tracked links, with sending and opt-out rules. A click is not a posted Google review. |
| Content team | `/team` | `socialteam.ts`, `index.ts`: research, writing and review tools. Generated facts and claims need review. |
| Photos | `/media` | `index.ts`: media upload/library and use in posts. Not a claim that every inherited video-processing tool is exposed here. |
| Competitor watch | `/competitors` | `index.ts`, `features.ts`: recorded prices/promotions, opportunity evidence and campaign drafts. Not an automatic revenue guarantee. |
| Industry ideas / in-app Radar | `/radar` | `index.ts`, `presets.ts`: industry, post themes and sourced demand items. Empty feeds are not fabricated activity. Separate from the owner's operations Radar and not a substitute for it. |
| Customer campaigns | `/campaigns` | `index.ts`, `features.ts`: review and send to eligible, consenting customers. Not ad-budget management. |
| Results / analytics | `/analytics` | `index.ts`: post status, contact/message counts and review-link clicks by day. Does not prove sales attribution. |
| Guest WiFi card | `/wifi-card` | `wificard.ts`: printable card with separate WiFi and enquiry QR codes. Use a guest network. WiFi details stay in the browser. |
| Tracked links | `/prospects` | `index.ts`: shared-link activity; views/clicks are not buyer intent or sales. |
| Settings | `/settings` | `index.ts`: connections, business details and plan tools. |
| Setup checklist | `/setup` | `index.ts`: setup steps and connection/activation status. |
| Business details | `/onboarding` | `index.ts`, `presets.ts`: business type, website, hours and goals. |
| WhatsApp connection | `/receptionist/connect` | `index.ts`, `tenant-crypto.ts`, `connect-errors.ts`: own-business number setup. Saved credentials alone do not prove a working number/webhook. |
| WhatsApp receptionist | `/receptionist` | `index.ts`, `receptionist.ts`: business knowledge, rules and handover. |
| Monthly plan / payments | `/billing` | `index.ts`: current plan/status and one-off monthly card links. See billing notes below. |
| Owner assistant | `/assistant` | `assistant.ts`, `receptionist.ts`: Business Pro owner tools with setup/approval gates. Starter shows an upgrade gate, not an active assistant. |
| Business-record help | `/support` | `index.ts`, `features.ts`: answers based on business records. Not general proof that outside actions were completed. |
| Switch business | `/switch` | `index.ts`: only workspaces the signed-in user can access. |

## Integration and billing boundaries

A reachable page, a saved connection, a generated draft, an approval and a provider-confirmed delivery are different states. Keep them separate in sales copy, walkthroughs and status reports. In particular, Facebook/Instagram publishing remains in progress until its delivery is proved for the relevant account. Calendar and WhatsApp setup are per business.

Current configured prices are Starter R499/month, Growth R999/month and Business Pro R1,999/month. The live `/billing` screen opens Yoco one-off monthly links. Each month requires a fresh payment; the screen does not promise automatic charging. Activation requires confirmation of the payment. Retained PayFast sandbox code and a Paystack test candidate do not change that live behaviour.

This document does not activate services, alter prices/limits or grant permission to publish, send messages or charge anyone. No free-period or unlimited-use offer is established by historical specification text.

## Documentation hierarchy

1. Current Worker source and live screen/status for the relevant business.
2. Root README and this inventory for navigation and implementation orientation.
3. Historical Django specs/API docs for the retained implementation only, after checking that host and route exist.

The original social-platform specification includes old free/unlimited positioning and broad platform plans. It is historical, not the current RevUp offer or a list of verified live integrations. A walkthrough should use real current screenshots and label plan-locked, empty, disconnected or in-progress states honestly.
