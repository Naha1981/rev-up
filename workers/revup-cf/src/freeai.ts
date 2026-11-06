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
  // zero-price guard: only ever free endpoints
  provider: { max_price: { prompt: 0, completion: 0 } },
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
  env: { GROQ_API_KEY?: string; OPENROUTER_API_KEY?: string },
  prompt: string,
  opts: { maxTokens: number; temperature?: number },
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
        { model, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens, reasoning_effort: "low", messages });
      if (ok) return ok;
    }
  } else attempts.push({ provider: "Groq", status: "missing" });

  if (env.OPENROUTER_API_KEY) {
    const ok = await attempt("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", env.OPENROUTER_API_KEY,
      { model: "openrouter/free", max_tokens: opts.maxTokens, messages, ...OPENROUTER_BODY_EXTRA });
    if (ok) return ok;
  } else attempts.push({ provider: "OpenRouter", status: "missing" });

  return null;
}
