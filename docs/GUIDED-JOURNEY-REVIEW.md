# Guided customer journey: review candidate

Test copy only. No production deployment or push authorized.

- Five stable destinations: Home, Customers, Bookings, Posts, Settings.
- Home prioritizes setup and waiting customer/booking/post actions, using workspace data.
- Signup requests name, email and password, then business type, then a five-step checklist.
- Checklist derives completion from saved business details, connected WhatsApp, calendar, paid status and a real saved outbound message. Clicking a step never marks it complete.
- Customer and booking hubs show recent workspace records. Existing module URLs and actions remain reachable through section disclosures and search.
- Search works from its button or Cmd/Ctrl+K, with a native dialog, keyboard close and no-match state.
- Light default with a saved dark/light preference. Phone navigation has icons above labels,16px text and44px+ targets. Existing forms gain readable shell styling and section return links.
- No free trial. New backend organizations require payment; legacy early-access states no longer grant seven days of unpaid access. Historical stored enum remains readable. A default-only migration is included; no production rows were changed.
- Lead preview is read-only sample data, not unpaid access to the service.
- Existing paid-feature test fixtures explicitly use active status after unpaid defaults were removed. No production gate was disabled to make tests pass.

## Verification

173 Worker unit tests pass. Reviewed case registry matches the new navigation contract.
89 browser checks pass, covering signup, persistence, navigation, keyboard search, theme memory, sample-only preview and responsive widths320/390/768/1440.
66 screen/theme reads pass across33 routes in light and dark at390px; no horizontal overflow.
Backend suite split by app:1211 passed/8 skipped in shard0;1922 passed in final shard1.77 release-gate tests pass. Combined3210 passed and8 pre-existing skips. Existing allowance fixtures explicitly represent a paid customer after its first paid week.
Ruff check and format pass. Worker dry-run package build passes. Hosted CI has not run because there has been no push.

## After visual review

Add Composio as an optional tenant-scoped app-connection adapter without replacing existing messaging, social or calendar paths. Start behind a disabled flag, use a vault-held credential, restrict tools and app scopes, separate each workspace connection, check budget before calls, and log redacted action outcomes. Actual provider calls and account linking require the scoped setup and owner approval. No Composio code is part of this review candidate.
