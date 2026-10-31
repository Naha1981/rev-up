# M4 design notes (verified against docs.zernio.com 31 Oct 15:13)
- Webhook setup: POST /v1/webhooks/settings {name,url,secret,events[]} (up to 50 endpoints; same in dashboard). Zernio signs deliveries with OUR secret. Verify + dedupe + retry semantics on docs.zernio.com/webhooks (fetch the delivery/signature section when implementing).
- Events to subscribe: post.platform.published, post.platform.failed, post.published, post.partial, post.failed, post.cancelled (account disconnected), post.platform.deleted, account disconnect event (see accounts webhook page - check docs for exact name), message.received (inbox later).
- Correlation: Create post accepts free-form `metadata`, echoed back as post.metadata on every event -> put PlatformPost idempotency_key there; match webhook to row by it (fallback: provider_post_id from dispatch response).
- Semantics: platform events per target; exactly one rollup per job; post.failed only on permanent failure; post.tiktok.url_resolved can trail; post.platform.deleted can trail by days.
- M3 confirm sweep (get_post) stays as fallback when webhooks are silent; webhook fast-path settles rows sooner.
- Endpoint to build: POST /webhooks/zernio/ (no CSRF, signature-verified, idempotent, 200-fast with queued processing).
- Also M4 scope: kill remaining Meta/direct FB-IG connect UI (owner: Zernio-only, off-switch only), inbox/comments + analytics (check Zernio messaging/analytics docs or ask Zernio support - not found publicly yet).
- Live deploy gap: Render service does NOT auto-deploy main (M2 pushed 13:2x, zernio callback still 404 live at 15:08). Deploy + ZERNIO_API_KEY env needed; no Render API key in vault.
