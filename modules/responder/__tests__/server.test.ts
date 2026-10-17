import { test } from "node:test";
import assert from "node:assert/strict";
import { startService } from "../server.js";

// Boot the composition root with zero env: dry-run transport, in-memory
// store, stub calendar, no Gmail poll - and the webhook receiver must still
// answer /health so Render's health check passes.
test("server boots with no env: /health 200, webhook paths closed", async () => {
  const port = 34000 + Math.floor(Math.random() * 1000);
  const svc = await startService({ PORT: String(port) } as NodeJS.ProcessEnv);
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    // No transport secrets -> webhook paths must not be live.
    const res = await fetch(`http://127.0.0.1:${port}/webhooks/evolution`, { method: "POST", body: "{}" });
    assert.notEqual(res.status, 200);
  } finally {
    await svc.stop();
  }
});
