/**
 * Composition root for the standalone responder service (Render web service).
 *
 *   Gmail intake (poll) -> processEnquiryEmail -> instant dry-run/live reply
 *   Inbound webhooks    -> handleLeadReply -> qualification -> booking
 *   Postgres state (when DATABASE_URL present, else in-memory)
 *
 * WhatsApp stays dry-run unless WHATSAPP_MODE=live. Live sends require
 * Thabiso's explicit go-ahead. The 067 number is never wired anywhere.
 *
 *   npm run build && node dist/server.js   (production)
 *   npx tsx server.ts                      (dev)
 */
import { clientFromEnv } from "./transport/operatorClient.js";
import { StubCalendarProvider } from "./flow/slots.js";
import { processEnquiryEmail, handleLeadReply, type PipelineDeps } from "./pipeline.js";
import { GoogleAuth, googleConfigFromEnv } from "./intake/auth.js";
import { GoogleCalendarProvider } from "./intake/googleCalendar.js";
import { GmailIntake, intakeConfigFromEnv } from "./intake/gmailIntake.js";
import { createOperatorWebhookServer } from "./webhooks/operatorWebhook.js";
import { InMemoryLeadStore, PostgresLeadStore, type LeadStore } from "./store/leadStore.js";

export async function startService(env: NodeJS.ProcessEnv = process.env): Promise<{ stop: () => Promise<void> }> {
  const whatsApp = clientFromEnv(env);
  const agentName = env.AGENT_NAME ?? "the agent";

  let store: LeadStore;
  if (env.DATABASE_URL) {
    const { Pool } = await import("pg");
    store = new PostgresLeadStore(new Pool({ connectionString: env.DATABASE_URL }));
    console.log("[service] store: postgres");
  } else {
    store = new InMemoryLeadStore();
    console.log("[service] store: in-memory (state lost on restart)");
  }

  const googleCfg = googleConfigFromEnv(env);
  const calendar = googleCfg
    ? new GoogleCalendarProvider(new GoogleAuth(googleCfg), {
        calendarId: env.GCAL_CALENDAR_ID ?? "primary",
        viewingDurationMin: Number(env.VIEWING_DURATION_MIN ?? 30),
        agentName,
      })
    : new StubCalendarProvider();
  console.log(`[service] calendar: ${googleCfg ? "google" : "stub"}`);
  console.log(`[service] whatsapp: ${whatsApp.mode}`);

  const deps: PipelineDeps = { whatsApp, store, convoOpts: { agentName, calendar } };

  let pollTimer: NodeJS.Timeout | null = null;
  if (googleCfg) {
    const intake = new GmailIntake(new GoogleAuth(googleCfg), intakeConfigFromEnv(env));
    const intervalMs = Number(env.POLL_INTERVAL_SECONDS ?? 60) * 1000;
    const poll = async () => {
      try {
        for (const item of await intake.pollOnce()) {
          if (await store.isProcessed(item.gmailMessageId)) continue;
          const raw = await intake.getRaw(item.gmailMessageId);
          const r = await processEnquiryEmail(raw, deps);
          await store.markProcessed(item.gmailMessageId);
          console.log(`[intake] ${item.gmailMessageId}: ${r.status}${r.reason ? " - " + r.reason : ""}`);
        }
      } catch (err) {
        console.error(`[intake] poll failed: ${(err as Error).message}`);
      }
    };
    await poll();
    pollTimer = setInterval(poll, intervalMs);
    console.log(`[intake] polling Gmail every ${intervalMs / 1000}s`);
  } else {
    console.log("[intake] no Google OAuth env - Gmail intake disabled");
  }

  const cloudApi = env.WA_CLOUD_APP_SECRET && env.WA_CLOUD_VERIFY_TOKEN
    ? { appSecret: env.WA_CLOUD_APP_SECRET, verifyToken: env.WA_CLOUD_VERIFY_TOKEN }
    : undefined;
  const activePaths = [
    env.WEBHOOK_SECRET ? "/webhooks/whatsapp" : null,
    env.EVOLUTION_WEBHOOK_TOKEN ? "/webhooks/evolution" : null,
    cloudApi ? "/webhooks/cloud-api" : null,
  ].filter(Boolean);
  const server = createOperatorWebhookServer({
    secret: env.WEBHOOK_SECRET,
    evolutionToken: env.EVOLUTION_WEBHOOK_TOKEN,
    cloudApi,
    onLeadReply: async (phone, text) => {
      const r = await handleLeadReply(phone, text, { ...deps, agentPhone: env.AGENT_PHONE });
      if ("error" in r) console.log(`[webhook] ${phone}: ${r.error}`);
    },
  });
  const port = Number(env.PORT ?? 3100);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`[webhook] listening on :${port} (${activePaths.length > 0 ? activePaths.join(", ") : "no transports configured - /health only"})`);

  return {
    stop: async () => {
      if (pollTimer) clearInterval(pollTimer);
      await new Promise<void>((r) => server.close(() => r()));
      await store.close();
      console.log("[service] stopped cleanly");
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const svc = await startService();
  const shutdown = async (signal: string) => {
    console.log(`[service] ${signal} received, shutting down`);
    await svc.stop();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
