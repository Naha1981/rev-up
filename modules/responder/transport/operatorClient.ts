import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CloudApiWhatsAppClient, cloudApiConfigFromEnv } from "./cloudApiClient.js";
import { EvolutionApiClient, evolutionConfigFromEnv } from "./evolutionClient.js";

export interface SendRecord {
  to: string;
  text: string;
  at: string;
}

export interface WhatsAppClient {
  readonly mode: "dry-run" | "live";
  sendText(to: string, text: string): Promise<void>;
  /**
   * Optional first-contact sender. Transports with a 24h customer-service
   * window (official Cloud API) implement this with an approved template;
   * transports without that constraint leave it undefined and the pipeline
   * falls back to sendText.
   */
  sendInitial?(to: string, leadFirstName: string, listingTitle: string): Promise<void>;
}

/**
 * DRY-RUN client: the default. Sends NOTHING. Records every message that
 * would have been sent to an in-memory transcript and a JSONL log.
 * NahaLabs standing rule: no automated WhatsApp message goes to a real
 * number without the owner's explicit go-ahead - that includes tests.
 */
export class DryRunWhatsAppClient implements WhatsAppClient {
  readonly mode = "dry-run" as const;
  readonly transcript: SendRecord[] = [];
  constructor(private logPath?: string) {}

  async sendText(to: string, text: string): Promise<void> {
    const rec: SendRecord = { to, text, at: new Date().toISOString() };
    this.transcript.push(rec);
    if (this.logPath) {
      mkdirSync(dirname(this.logPath), { recursive: true });
      appendFileSync(this.logPath, JSON.stringify(rec) + "\n");
    }
    console.log(`[dry-run] WOULD SEND WhatsApp -> ${to}\n${text}\n---`);
  }
}

export interface OperatorConfig {
  operatorUrl: string;
  apiKey: string;
  waAccountId: string;
  appId: string;
  tenantId: string;
}

/**
 * LIVE client for the NahaLabs WhatsApp Operator (my-own-whatsapp repo).
 * Contract per docs/WHATSAPP_OPERATOR_INTEGRATION.md:
 *   POST {operatorUrl}/send
 *   headers: X-API-Key, X-App-Id, X-Tenant-Id, Content-Type: application/json
 *   body: { waAccountId, to, text }
 */
export class OperatorWhatsAppClient implements WhatsAppClient {
  readonly mode = "live" as const;
  constructor(private cfg: OperatorConfig) {}

  async sendText(to: string, text: string): Promise<void> {
    const res = await fetch(`${this.cfg.operatorUrl.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.cfg.apiKey,
        "X-App-Id": this.cfg.appId,
        "X-Tenant-Id": this.cfg.tenantId,
      },
      body: JSON.stringify({ waAccountId: this.cfg.waAccountId, to, text }),
    });
    if (!res.ok) {
      throw new Error(`Operator /send failed: ${res.status} ${await res.text()}`);
    }
  }
}

/**
 * Build the client from env. Dry-run unless WHATSAPP_MODE=live.
 * Transport: WHATSAPP_TRANSPORT = "cloud-api" (official, default for live),
 * "evolution", or "operator". A live build with no complete transport
 * config throws - it never silently picks one.
 */
export function clientFromEnv(env: NodeJS.ProcessEnv = process.env): WhatsAppClient {
  if (env.WHATSAPP_MODE !== "live") {
    return new DryRunWhatsAppClient(env.DRY_RUN_LOG);
  }
  const transport = env.WHATSAPP_TRANSPORT ?? "cloud-api";
  if (transport === "cloud-api") {
    const missing = ["WA_CLOUD_TOKEN", "WA_CLOUD_PHONE_NUMBER_ID"].filter((k) => !env[k]);
    if (missing.length) throw new Error(`WHATSAPP_TRANSPORT=cloud-api but missing env: ${missing.join(", ")}`);
    // Lazy import avoided on purpose: this file is the transport registry.
    return new CloudApiWhatsAppClient(cloudApiConfigFromEnv(env)!);
  }
  if (transport === "evolution") {
    const missing = ["EVOLUTION_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"].filter((k) => !env[k]);
    if (missing.length) throw new Error(`WHATSAPP_TRANSPORT=evolution but missing env: ${missing.join(", ")}`);
    return new EvolutionApiClient(evolutionConfigFromEnv(env)!);
  }
  if (transport === "operator") {
    const missing = ["OPERATOR_URL", "OPERATOR_API_KEY", "WA_ACCOUNT_ID", "APP_ID", "TENANT_ID"].filter((k) => !env[k]);
    if (missing.length) throw new Error(`WHATSAPP_TRANSPORT=operator but missing env: ${missing.join(", ")}`);
    return new OperatorWhatsAppClient({
      operatorUrl: env.OPERATOR_URL!,
      apiKey: env.OPERATOR_API_KEY!,
      waAccountId: env.WA_ACCOUNT_ID!,
      appId: env.APP_ID!,
      tenantId: env.TENANT_ID!,
    });
  }
  throw new Error(`unknown WHATSAPP_TRANSPORT: ${transport}`);
}
