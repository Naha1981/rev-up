# Worker signup and shared Django recovery compatibility

## Reproduced failure

A new account created by the actual Worker signup flow persisted plaintext JSON
`[]` in `accounts_user.totp_recovery_codes`. Django defines that nullable field as
EncryptedJSONField. Fetching this account through Django's ORM raised
`ValueError: Decryption failed - possibly wrong SECRET_KEY or corrupted data`
with an underlying invalid-nonce error. The isolated account used the same
synthetic secret/salt on both sides. This is a representation mismatch, not
proof that a production key is wrong.

## Source-only correction

Leave the unused authenticator recovery field NULL on signup, matching the
nullable model contract. Do not encrypt an invented recovery-code list or modify
any existing account. No new model, production migration or user-password change.
No second-factor or email-verification policy change.

## Evidence

- Actual Worker signup to separate full-schema synthetic DB:303 to onboarding.
- New account fully loads through the Django ORM without decryption failure.
- Existing allauth reset form200; reset request302; one email captured in memory.
- Token opens password form; reset of that dedicated fictional account succeeds.
- Original fictional password rejected; used reset token cannot open another
  password form. Unknown-account request gets the same generic done redirect;
  allauth captures its signup guidance email in memory without a reset token.
- No email transmitted, real account inspected/changed, provider call, production
  data/schema change or deployment. All addresses end in example.invalid.
- Whole-source TypeScript and371 unit assertions pass, including the new signup
  representation guard. No CI run started.

This proves isolated new-account compatibility, not live recovery or delivery.
Existing Worker-created rows containing plaintext may need a separately approved,
scoped data repair. Their presence/count in production has NOT been checked.
Render idle-sleep latency and the hard-coded recovery-origin dependency remain.
All production gates remain HOLD. Independent QA and release approval required.
