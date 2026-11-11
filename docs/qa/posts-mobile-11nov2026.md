# Posts list: small-screen readability and honest draft state

Source-only candidate. No production release, migration, provider or price change.

## Brief and direction

- Product: RevUp helps South African small businesses handle enquiries and posts.
- Task: identify a saved draft and whether any channel is selected on a phone.
- Character: practical, readable, calm. Preserve orange brand, logo and type.
- World: the working business inbox, not a decorative dashboard.
- Signature: explicit post status and connection truth, with one New post action.

Audit first: the existing phone table squeezed caption text into a narrow column,
clipped dates and left status blank on saved posts with no channel children.
This is a bounded repair, not a redesign. Keep all fields, routes, order and
submission rules. Desktop remains a table; phone rows become labelled stacks.

Existing tokens retained: neutral page #F5F7FA, white content #FFFFFF, ink #18232E,
secondary #475569, orange action #C54B00 and existing dark-mode tokens. Existing
Manrope/system typography, page sizes and shell remain unchanged. No new fonts,
images, effects, dependencies or motion. No billing or auth changes in this PR.

Review order: unslop audit first, frontend design plan second, Apple clarity,
44px-class controls and restrained hierarchy third. References read:
- https://raw.githubusercontent.com/heydamir/unslop/main/skills/unslop/SKILL.md
- https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md
- https://raw.githubusercontent.com/omarrns/de-slop-UI-Package/main/skills/apple-design/SKILL.md

Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0. Reference review only; brand
and task requirements win over incompatible generic font/effect suggestions.

## Evidence

Actual app bundle against a dedicated synthetic full-schema DB. No real data.
The same saved fictional post is shown before/after. At 390px the content cell
is 308px wide after repair, rather than a squeezed desktop column. At 390,
820 and1280px, table content width equals container width and page width equals
viewport. Actual captures inspected at all three sizes and390px dark mode.

A post with no PlatformPost children displays draft, matching the existing
Django derive_post_status([]) rule. No channel selected is explicit. No false
Submit for review button is offered without connected draft children. Mixed
published/failed statuses stay visible; no claim that anything was published.

Three new unit assertions plus complete existing Worker suite and TypeScript
check are the code checks. Independent review and hosted staging remain open.

Remaining issue: existing dark-mode shell controls show weak contrast during
transition and need a separate settled-state/contrast audit. No whole-screen
accessibility or product-complete claim. Payment, email verification and full
five stranger journeys remain blocked as documented in PR31.
