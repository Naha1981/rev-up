# RevUp Agent API

Programmatic access for external apps and agents. Interactive OpenAPI docs
live at `/api/v1/docs` on the deployment (Swagger UI, try-it-out enabled).

## Authentication

Scoped bearer tokens, minted in-app under Organization → API Keys:

```
Authorization: Bearer bb_studio_<token>
```

- One key = one workspace. Keys act only inside their own workspace.
- Each key carries a subset of workspace permissions (`create_posts`,
  `publish_directly`, `use_responder`, ...) intersected live with the
  issuer's current permissions - demoting the issuer shrinks the key.
- Keys that only call social-account-free endpoints (today: the responder)
  can be issued without a connected-account allowlist.
- Send a distinct `User-Agent` for your client; the default
  `Python-urllib/3.x` UA is rejected at the edge with 403 / error 1010.

## Key rotation

Organization → API Keys → Rotate. The old token dies immediately (401 on
next use); the replacement token is shown exactly once. Programmatic
equivalent: `POST /api-keys/<id>/rotate/` from a session with the org-level
`manage_api_keys` permission. Rotate on any suspected leak, and on a fixed
cadence for production consumers.

## Rate limits

Layered, all returning the same 429 body with a `tier` field:

- Per-key / per-workspace / per-IP HTTP throttles (burst control).
- Per-key hourly + daily call caps (backstop against flat-out polling).
- Per-platform 24h post quotas aligned to each platform's published limits.

Self-throttle on `tier`; retry after the window resets.

## Endpoints for app integrations

### POST /api/v1/responder/enquiries - run an enquiry through the responder

Hand RevUp a customer enquiry (portal alert email text, or plain text with
name + SA phone + listing). Returns the reply the responder would send.

```
curl -X POST https://<host>/api/v1/responder/enquiries \
  -H "Authorization: Bearer bb_studio_..." \
  -H "Content-Type: application/json" \
  -H "User-Agent: my-app/1.0" \
  -d '{"enquiry": "Hi, my name is Lerato Mokoena (082 555 0198). I am interested in the 2 Bedroom Apartment to Rent in Sandton Central listed at R14,500/month. Is it still available?"}'
```

Response:

```json
{
  "status": "replied",
  "reason": null,
  "replies": [{"to": "27825550198", "text": "Hi Lerato, thanks for your enquiry..."}],
  "mode": "dry-run",
  "industry": "real_estate"
}
```

- `status` is `replied` or `needs_review` (low-confidence parses and
  enquiries without a usable SA number go to `needs_review` with a `reason`).
- `mode: "dry-run"` means the reply text was generated but NOT sent to the
  number. The current deployment is dry-run only.
- The workspace's industry preset (signup dropdown, or the Radar screen)
  selects tone and qualifying questions: `general`, `real_estate`,
  `dental`, `auto`.
- Permission: `use_responder`.

### POST /api/v1/posts/ingest - push a generated post

Radar-style ingestion of one upstream-generated post. Honors the
workspace's `publishing.generated_post_mode` setting: `approval` lands in
the Approvals queue, `auto` schedules immediately. Idempotent on
`Idempotency-Key`. Permission: `create_posts` (+ `publish_directly` for
auto-publish paths).

### POST /api/v1/posts/ - create a draft or scheduled post

Full composer payload: caption, media, per-platform overrides,
`scheduled_at`. Permission: `create_posts` (+ `publish_directly` to
schedule past the approval gate).

## Radar feeds

A workspace's demand radar polls a JSON feed every 15 minutes
(`radar.feed_url` on the Radar screen), dedups by link, filters items by
the workspace's industry preset keywords, and pushes survivors through the
same ingest path above - so feed items obey the same approval/auto mode as
API-ingested posts.
