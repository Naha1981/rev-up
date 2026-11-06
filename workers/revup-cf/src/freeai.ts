// Free-AI provider chain (server-only): Groq primary, OpenRouter free model secondary.
// No paid gateway, no client-supplied URL/model/key. A primary failure of any kind
// (missing key, 429, 5xx, timeout, empty or unparseable reply) advances ONCE to the
// free secondary. Attempts record provider + status only: never keys, prompts,
// quota text or response bodies. The chain never mutates send/schedule state.

export interface AiAttempt { provider: string; status: string | number; }
export interface AiSuccess<T> { value: T; provider: string; attempts: AiAttempt[]; }

type Fetcher = (url: string, init: any) => Promise<any>;

const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const OPENROUTER_BODY_EXTRA = {
  // zero-price guard: only ever free endpoints; no-training: provider may not collect/store prompts
  provider: {
    max_price: { prompt: 0, completion: 0 },
    require_parameters: true, // only providers that accept every parameter - no silent downgrade
    data_collection: "deny", // no-training: provider may not collect/store prompts
    zdr: true, // zero data retention endpoints only
  },
  reasoning: { enabled: false, exclude: true },
};

async function oneCall(url: string, key: string, body: any, fetcher: Fetcher): Promise<{ text: string } | { status: string | number }> {
  try {
    const r = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + String(key).trim() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { status: r.status };
    const d: any = await r.json();
    const text: string = d?.choices?.[0]?.message?.content || "";
    if (!text.trim()) return { status: "empty" };
    return { text };
  } catch {
    return { status: "unavailable" };
  }
}

export async function freeAiGenerate<T>(
  env: { GROQ_API_KEY?: string; OPENROUTER_API_KEY?: string; OPENROUTER_FREE_ONLY?: string; OPENROUTER_DATA_USE_APPROVED?: string },
  prompt: string,
  opts: { maxTokens: number; temperature?: number; requireBackupConsent?: boolean },
  parse: (text: string) => T | null,
  fetcher: Fetcher = fetch,
): Promise<AiSuccess<T> | null> {
  const attempts: AiAttempt[] = [];
  const messages = [{ role: "user", content: prompt }];
  const attempt = async (provider: string, url: string, key: string, body: any): Promise<AiSuccess<T> | null> => {
    const r = await oneCall(url, key, body, fetcher);
    if ("status" in r) { attempts.push({ provider, status: r.status }); return null; }
    const value = parse(r.text);
    if (value === null || value === undefined) { attempts.push({ provider, status: "invalid" }); return null; }
    return { value, provider, attempts };
  };

  if (env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      const ok = await attempt("Groq", "https://api.groq.com/openai/v1/chat/completions", env.GROQ_API_KEY,
        { model, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens, reasoning_effort: "low", store: false, messages });
      if (ok) return ok;
    }
  } else attempts.push({ provider: "Groq", status: "missing" });

  if (opts.requireBackupConsent && !(env.OPENROUTER_FREE_ONLY === "true" && env.OPENROUTER_DATA_USE_APPROVED === "true")) {
    attempts.push({ provider: "OpenRouter", status: "not-approved" });
  } else if (env.OPENROUTER_API_KEY) {
    const ok = await attempt("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_API_KEY,
      { model: "openrouter/free", max_tokens: opts.maxTokens, messages, ...OPENROUTER_BODY_EXTRA });
    if (ok) return ok;
  } else attempts.push({ provider: "OpenRouter", status: "missing" });

  return null;
}

// ---------- shared fact rules for every AI instruction ----------
// One spine so no call site can drift: only the business's own supplied info,
// plain simple English, the business's WhatsApp employee voice, no AI mention,
// no vendor names, ZAR for money. Enforced twice: these instructions shape the
// draft, and rejectInventedPrices below kills any draft that still invents an amount.
export const FACT_RULES =
  "Hard fact rules: use ONLY the facts supplied in this prompt - the business's own information. " +
  "Never invent or guess prices, discounts, opening hours, dates, services, products, guarantees, " +
  "qualifications, years of experience, people's names, addresses, phone numbers or any other detail. " +
  "If a fact is not supplied, leave it out or say the team will confirm - never fill the gap. " +
  "Money may only be quoted as an amount supplied here, always in South African rand (R). " +
  "You are the business's WhatsApp employee writing as the business itself: never mention AI, " +
  "never name any technology vendor, tool or model. Plain, simple English a customer reads in one pass.";

// ---------- invented-price guard ----------
// A draft may only quote a currency amount that appears in the user's own input
// (the prompt: business brief, price list, enquiry text). Any other R/$/ZAR/rand
// amount is treated as invented and the whole draft is rejected - the chain then
// advances provider or reports unavailable. Reject, never strip: a stripped
// sentence reads broken and can still mislead.

export function extractAmounts(text: string): string[] {
  const out = new Set<string>();
  const add = (raw: string) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) out.add(String(n));
  };
  let m: RegExpExecArray | null;
  // symbol-anchored; the lookbehind stops "for 4" / "winner 500" matching as "r 4"
  const sym = /(?<![A-Za-z0-9])(?:R|ZAR|\$|€|£)\s?(\d[\d\s,]*(?:\.\d{1,2})?)/gi;
  while ((m = sym.exec(text))) add(m[1]);
  const word = /(\d[\d,]*(?:\.\d{1,2})?)\s?(?:rand|zar)\b/gi;
  while ((m = word.exec(text))) add(m[1]);
  return [...out];
}

// Amounts the user's own input makes legitimate: symbol-anchored amounts plus
// bare numbers in price context (JSON price lists like {"whitening": 799},
// "price 1500", "cost: 80") so a listed price may be quoted back as "R799".
function promptAllowedAmounts(prompt: string): Set<string> {
  const allowed = new Set(extractAmounts(prompt));
  const add = (raw: string) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) allowed.add(String(n));
  };
  let m: RegExpExecArray | null;
  const ctx = /(?::|\bprice\b|\bprices\b|\bcost\b|\bfee\b)\s*"?R?\s?(\d[\d,]*(?:\.\d{1,2})?)/gi;
  while ((m = ctx.exec(prompt))) add(m[1]);
  return allowed;
}

export function rejectInventedPrices<T>(prompt: string, parse: (text: string) => T | null): (text: string) => T | null {
  const allowed = promptAllowedAmounts(prompt);
  return (text) => {
    const amounts = extractAmounts(text);
    if (!amounts.every((a) => allowed.has(a))) return null;
    return parse(text);
  };
}
