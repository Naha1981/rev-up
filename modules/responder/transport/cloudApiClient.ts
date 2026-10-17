import type { WhatsAppClient } from "./operatorClient.js";

export interface CloudApiConfig {
  /** Permanent or system-user access token. */
  accessToken: string;
  /** The WABA phone_number_id messages are sent from. */
  phoneNumberId: string;
  /** Graph API version, e.g. v21.0 */
  apiVersion: string;
  /** Approved template for the FIRST outbound message to a fresh lead (see sendInitial). */
  initialTemplateName?: string;
  initialTemplateLang?: string;
}

/**
 * LIVE client for the official WhatsApp Business Cloud API.
 *
 * Why this adapter exists: unofficial sessions get restricted at volume.
 * The sellable product must run on the official API; the Operator and
 * Evolution transports stay behind the same seam for dev/low-volume.
 *
 * 24h rule encoded honestly: a business may only send free-form text inside
 * the 24h customer-service window the LEAD opens by replying. The first
 * outbound message to a fresh portal enquiry must be an APPROVED TEMPLATE.
 * The pipeline calls sendInitial() for first contact; here it sends the
 * configured template when set, and refuses (throws) when it is not - a
 * silent free-form first message would violate platform policy.
 */
export class CloudApiWhatsAppClient implements WhatsAppClient {
  readonly mode = "live" as const;
  constructor(private cfg: CloudApiConfig) {}

  private endpoint(): string {
    return `https://graph.facebook.com/${this.cfg.apiVersion}/${encodeURIComponent(this.cfg.phoneNumberId)}/messages`;
  }

  private async post(body: Record<string, unknown>): Promise<void> {
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.accessToken}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    if (!res.ok) {
      throw new Error(`Cloud API send failed: ${res.status} ${await res.text()}`);
    }
  }

  /** Free-form text - valid only inside the 24h window opened by the lead's own message. */
  async sendText(to: string, text: string): Promise<void> {
    await this.post({ to, type: "text", text: { body: text } });
  }

  /**
   * First contact with a fresh lead. Uses the approved template with
   * {{1}} = lead first name, {{2}} = listing title.
   */
  async sendInitial(to: string, leadFirstName: string, listingTitle: string): Promise<void> {
    if (!this.cfg.initialTemplateName) {
      throw new Error(
        "Cloud API: first contact requires an approved template (WA_CLOUD_TEMPLATE_NAME) - free-form text is not allowed outside the 24h window",
      );
    }
    await this.post({
      to,
      type: "template",
      template: {
        name: this.cfg.initialTemplateName,
        language: { code: this.cfg.initialTemplateLang ?? "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: leadFirstName },
              { type: "text", text: listingTitle },
            ],
          },
        ],
      },
    });
  }
}

export function cloudApiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CloudApiConfig | null {
  const { WA_CLOUD_TOKEN, WA_CLOUD_PHONE_NUMBER_ID } = env;
  if (!WA_CLOUD_TOKEN || !WA_CLOUD_PHONE_NUMBER_ID) return null;
  return {
    accessToken: WA_CLOUD_TOKEN,
    phoneNumberId: WA_CLOUD_PHONE_NUMBER_ID,
    apiVersion: env.WA_CLOUD_API_VERSION ?? "v21.0",
    initialTemplateName: env.WA_CLOUD_TEMPLATE_NAME,
    initialTemplateLang: env.WA_CLOUD_TEMPLATE_LANG,
  };
}
