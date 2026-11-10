# Connection adapter candidate,10 November2026

Disabled,not routed,not deployed. Existing WhatsApp,social,calendar and assistant paths are unchanged. This is an additive transport boundary,not a working customer connection feature.

Project fixed to pr_8367LVZaOfL2. Server-owned workspace IDs become revup_ws_<workspace>. Toolkit/auth-config mapping must be reviewed before enabling. Connection response returns only a redirect and account identifier;account inspection returns status only,never credential payload. Execution requires matching workspace/account/payload/request/version,unexpired approval and atomic durable budget reservation. No automatic retries,no latest-version fallback,no instant account.

Outstanding before enabling:project credential through vault,verified auth-config scopes,server-owned binding storage,authenticated callback routes with state binding,atomic budget/approval store and configured free-tier limit,reviewed tool manifest,credential-safe audit events,integration tests with a private synthetic connection. API owner field is deprecated and may disappear;adapter deliberately fails closed if owner is absent until an owner-filtered query is added. Customer OAuth scopes or real account changes require their own authority. No real tools were executed.

Docs fetched10November2026:
- https://docs.composio.dev/reference/api-reference/tools/postToolsExecuteByToolSlug.md
- https://docs.composio.dev/reference/api-reference/connected-accounts/postConnectedAccountsLink.md
- https://docs.composio.dev/reference/api-reference/connected-accounts/getConnectedAccountsByNanoid.md

The fetched official docs identify RESTv3.1 as current;older search hits point tov3.0. Transport usesv3.1,pins versions explicitly,and does not use SDK code-generator instructions.
