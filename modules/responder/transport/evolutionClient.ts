import type { WhatsAppClient } from "./operatorClient.js";

export interface EvolutionConfig {
  /** Base URL of the Evolution API instance, e.g. https://evolution-xxxx.onrender.com */
  url: string;
  apiKey: string;
  /** Instance name (the business's paired WhatsApp session). */
  instance: string;
}

/**
 * LIVE client for Evolution API v2 (the WhatsApp transport the NahaLabs
 * Growth system uses). Same WhatsAppClient seam as the Operator client, so
 * the responder plugs into either engine without code changes.
 * Send contract: POST {url}/message/sendText/{instance}, header `apikey`,
 * body { number, text }.
 */
export class EvolutionApiClient implements WhatsAppClient {
  readonly mode = "live" as const;
  constructor(private cfg: EvolutionConfig) {}

  async sendText(to: string, text: string): Promise<void> {
    const res = await fetch(
      `${this.cfg.url.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(this.cfg.instance)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.cfg.apiKey },
        body: JSON.stringify({ number: to, text, linkPreview: false }),
      },
    );
    if (!res.ok) {
      throw new Error(`Evolution sendText failed: ${res.status} ${await res.text()}`);
    }
  }
}

export function evolutionConfigFromEnv(env: NodeJS.ProcessEnv = process.env): EvolutionConfig | null {
  const { EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE } = env;
  if (!EVOLUTION_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) return null;
  return { url: EVOLUTION_URL, apiKey: EVOLUTION_API_KEY, instance: EVOLUTION_INSTANCE };
}
