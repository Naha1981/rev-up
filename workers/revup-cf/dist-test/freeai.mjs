// src/freeai.ts
var GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
var OPENROUTER_BODY_EXTRA = {
  // zero-price guard: only ever free endpoints; no-training: provider may not collect/store prompts
  provider: {
    max_price: { prompt: 0, completion: 0 },
    require_parameters: true,
    // only providers that accept every parameter - no silent downgrade
    data_collection: "deny",
    // no-training: provider may not collect/store prompts
    zdr: true
    // zero data retention endpoints only
  },
  reasoning: { enabled: false, exclude: true }
};
async function oneCall(url, key, body, fetcher) {
  try {
    const r = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + String(key).trim() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1e4)
    });
    if (!r.ok) return { status: r.status };
    const d = await r.json();
    const text = d?.choices?.[0]?.message?.content || "";
    if (!text.trim()) return { status: "empty" };
    return { text };
  } catch {
    return { status: "unavailable" };
  }
}
async function freeAiGenerate(env, prompt, opts, parse, fetcher = fetch) {
  const attempts = [];
  const messages = [{ role: "user", content: prompt }];
  const attempt = async (provider, url, key, body) => {
    const r = await oneCall(url, key, body, fetcher);
    if ("status" in r) {
      attempts.push({ provider, status: r.status });
      return null;
    }
    const value = parse(r.text);
    if (value === null || value === void 0) {
      attempts.push({ provider, status: "invalid" });
      return null;
    }
    return { value, provider, attempts };
  };
  if (env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      const ok = await attempt(
        "Groq",
        "https://api.groq.com/openai/v1/chat/completions",
        env.GROQ_API_KEY,
        { model, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens, reasoning_effort: "low", store: false, messages }
      );
      if (ok) return ok;
    }
  } else attempts.push({ provider: "Groq", status: "missing" });
  if (opts.requireBackupConsent && !(env.OPENROUTER_FREE_ONLY === "true" && env.OPENROUTER_DATA_USE_APPROVED === "true")) {
    attempts.push({ provider: "OpenRouter", status: "not-approved" });
  } else if (env.OPENROUTER_API_KEY) {
    const ok = await attempt(
      "OpenRouter",
      "https://openrouter.ai/api/v1/chat/completions",
      env.OPENROUTER_API_KEY,
      { model: "openrouter/free", max_tokens: opts.maxTokens, messages, ...OPENROUTER_BODY_EXTRA }
    );
    if (ok) return ok;
  } else attempts.push({ provider: "OpenRouter", status: "missing" });
  return null;
}
var FACT_RULES = "Hard fact rules: use ONLY the facts supplied in this prompt - the business's own information. Never invent or guess prices, discounts, opening hours, dates, services, products, guarantees, qualifications, years of experience, people's names, addresses, phone numbers or any other detail. If a fact is not supplied, leave it out or say the team will confirm - never fill the gap. Money may only be quoted as an amount supplied here, always in South African rand (R). You are the business's WhatsApp employee writing as the business itself: never mention AI, never name any technology vendor, tool or model. Plain, simple English a customer reads in one pass.";
function extractAmounts(text) {
  const out = /* @__PURE__ */ new Set();
  const add = (raw) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) out.add(String(n));
  };
  let m;
  const sym = /(?<![A-Za-z0-9])(?:R|ZAR|\$|€|£)\s?(\d[\d\s,]*(?:\.\d{1,2})?)/gi;
  while (m = sym.exec(text)) add(m[1]);
  const word = /(\d[\d,]*(?:\.\d{1,2})?)\s?(?:rand|zar)\b/gi;
  while (m = word.exec(text)) add(m[1]);
  return [...out];
}
function promptAllowedAmounts(prompt) {
  const allowed = new Set(extractAmounts(prompt));
  const add = (raw) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) allowed.add(String(n));
  };
  let m;
  const ctx = /(?::|\bprice\b|\bprices\b|\bcost\b|\bfee\b)\s*"?R?\s?(\d[\d,]*(?:\.\d{1,2})?)/gi;
  while (m = ctx.exec(prompt)) add(m[1]);
  return allowed;
}
function rejectInventedPrices(prompt, parse) {
  const allowed = promptAllowedAmounts(prompt);
  return (text) => {
    const amounts = extractAmounts(text);
    if (!amounts.every((a) => allowed.has(a))) return null;
    return parse(text);
  };
}
export {
  FACT_RULES,
  extractAmounts,
  freeAiGenerate,
  rejectInventedPrices
};
