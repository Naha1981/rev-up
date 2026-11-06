# RevUp pricing - LOCKED

Locked by Thabiso on 6 Nov 2026 (approval: "Lock the RevUp plan" = "Yes").
Do not change prices, tier names, tier contents or this wording without his
explicit approval.

## Tiers (ZAR, per month, no setup fee, no contract, cancel anytime)

1. **Starter - R499/month**
   Google review booster, enquiry inbox, social posting with his/your approval
   on every word (approve-every-word). Up to 500 AI-drafted replies a month,
   1 connected channel.
2. **Growth - R999/month**
   Everything in Starter, more social posting, up to 1,000 AI-drafted replies
   a month, 2 connected channels.
3. **Business Pro - R1,999/month**
   Everything in Growth, plus hands-free auto-posting and FrontDesk (public
   enquiry form, shared lead pipeline, AI-drafted follow-ups you approve).
   Up to 2,500 AI-drafted replies a month, 3 connected channels.

Free trial - choose a plan during setup, pay only when the trial ends.
Plans include a monthly AI reply volume; extra usage and its rates are agreed
with the customer before activation.

## Canonical locations (must all stay in sync)

- Landing page pricing cards: `src/landing.ts` (#pricing section)
- In-app plan picker: `PLAN_CARDS` in `src/index.ts` (~line 359)
- Billing page cards: `src/index.ts` (~line 875)
- PayFast amounts: `src/index.ts` (~line 183) - starter 499, growth 999,
  business-pro 1999
