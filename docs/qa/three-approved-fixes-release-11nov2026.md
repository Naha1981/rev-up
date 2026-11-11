# Three approved fixes, live-baseline release

Owner approval: 11 November 2026 17:42:48 SAST, quoted GO 3 for the MFA lock, signup/recovery compatibility and phone Posts fixes. No database changes, real messages, charges or email verification.

Based on the actual live deployment source 50fbd554376f7105da5cf126a10cd7d7e3e6dbc0. Intentionally excludes the source-only PR13-29 stack present on main. Only runtime modification is index.ts: MFA password/session guards, nullable encrypted recovery-field insert, readable phone Posts and honest channel-free draft status. Three existing TypeScript annotations are corrected, with byte-identical Wrangler output before and after the annotation correction.

325 unit cases pass. Whole-source TypeScript passes with explicit ES2022/Bundler options. Four actual synthetic PostgreSQL session checks pass. The built deploy artifact was exercised in the Workers runtime against the isolated synthetic database: phone discovery, native signup, onboarding save/reload and manual draft save/read-back passed. The initial five-case exact-runtime run was stopped by the 85-second harness timeout during the second account, not recorded as five passed. No real integrations were called. Full payment journeys remain unproven.

Rollback target: cb9ff61b-6b9e-4583-957a-51ff2170ea31, verified as 100% current production traffic before release. Candidate upload/promotion and live proof remain separate steps.
