# Connection adapter candidate,10 November2026

Disabled by default,not deployed. Authenticated owner/manager connection setup routes are gated by explicit config. Tool execution is not exposed through any route. Existing WhatsApp,social,calendar and assistant paths are unchanged. This is an additive transport boundary,not a working customer connection feature.

Project fixed to pr_8367LVZaOfL2. Server-owned workspace IDs become revup_ws_<workspace>. Toolkit/auth-config mapping must be reviewed before enabling. Connection response returns only a redirect and account identifier;account inspection returns status only,never credential payload. Execution requires matching workspace/account/payload/request/version,unexpired approval and atomic durable budget reservation. No automatic retries,no latest-version fallback,no instant account.

Built: durable one-use ten-minute callback state bound to user/workspace,private account lookup filtered by user/account/auth config/toolkit,binding storage that never replaces an earlier connection,and atomic project-level monthly budget reservation. Approval storage is prepared;tool execution is still unexposed. Outstanding before enabling: project credential through vault,verified auth-config scopes,configured free-tier limit,reviewed version-pinned tool manifest,approval issuance and consumption workflow,credential-safe audit events,and an integration test with a private synthetic connection. Customer OAuth scopes or real account changes require their own authority. No real tools were executed.

Docs fetched10November2026:
- https://docs.composio.dev/reference/api-reference/tools/postToolsExecuteByToolSlug.md
- https://docs.composio.dev/reference/api-reference/connected-accounts/postConnectedAccountsLink.md
- https://docs.composio.dev/reference/api-reference/connected-accounts/getConnectedAccountsByNanoid.md

The fetched official docs identify RESTv3.1 as current;older search hits point tov3.0. Transport usesv3.1,pins versions explicitly,and does not use SDK code-generator instructions.

Owner-filtered lookup reference:https://docs.composio.dev/reference/api-reference/connected-accounts/getConnectedAccounts.md
