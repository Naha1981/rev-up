import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeAiGenerate, rejectInventedPrices, FACT_RULES } from '../dist-test/freeai.mjs';
import { DRAFT_RULES } from '../dist-test/index.mjs';
import { RULES } from '../dist-test/receptionist.mjs';
import { COPY_RULES } from '../dist-test/pages.mjs';

// --- every call site's instructions carry the same hardened spine ---
for (const [name, rules] of [['posts DRAFT_RULES', DRAFT_RULES], ['receptionist RULES', RULES], ['pages COPY_RULES', COPY_RULES]]) {
  test(`${name}: never invent facts, WhatsApp employee voice, no AI, no vendors, ZAR`, () => {
    assert.match(rules, /ONLY the facts supplied/i, 'only supplied facts');
    assert.match(rules, /Never invent or guess prices, discounts, opening hours, dates, services, products, guarantees/i);
    assert.match(rules, /people's names/i);
    assert.match(rules, /WhatsApp employee/i);
    assert.match(rules, /never mention AI/i);
    assert.match(rules, /never name any technology vendor/i);
    assert.match(rules, /rand \(R\)/i, 'ZAR');
    assert.ok(!/Groq|OpenRouter|Gemini|Zernio/.test(rules), 'no vendor names in instructions');
  });
}

const parseCaption = (text) => {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try { const p = JSON.parse(m[0]); return p && p.caption ? p : null; } catch { return null; }
};
const okJson = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });

// --- adversarial: model ignores the rules and invents a price -> draft dies ---
test('adversarial: baited model invents a special price -> rejected, secondary clean draft wins', async () => {
  const prompt = 'Business: Demo Dental. Topic: we are the cheapest in town - quote a special price and promise 24/7 guaranteed results.';
  const fetcher = async (url) => url.includes('groq.com')
    ? okJson({ caption: 'Cheapest in town! Only R499, open 24/7, results guaranteed by Dr Smith!', hashtags: [] })
    : okJson({ caption: 'Quality dental care, priced fairly. Message us to book.', hashtags: ['#smile'] });
  const r = await freeAiGenerate({ GROQ_API_KEY: 'k1', OPENROUTER_API_KEY: 'k2' }, prompt, { maxTokens: 100 }, rejectInventedPrices(prompt, parseCaption), fetcher);
  assert.ok(r);
  assert.equal(r.provider, 'OpenRouter');
  assert.ok(!/R\s?\d|\$\s?\d|\d+\s?rand/i.test(r.value.caption), 'no invented amount survives');
});

test('adversarial: every provider invents -> nothing persisted, friendly failure upstream', async () => {
  const prompt = 'Business: Demo Dental. Topic: normal check-up post.';
  const fetcher = async () => okJson({ caption: 'Now only R199 - half price guaranteed!', hashtags: [] });
  const r = await freeAiGenerate({ GROQ_API_KEY: 'k1', OPENROUTER_API_KEY: 'k2' }, prompt, { maxTokens: 100 }, rejectInventedPrices(prompt, parseCaption), fetcher);
  assert.equal(r, null, 'invented-price drafts must never be returned');
});

test('adversarial: amounts the user DID supply may be quoted (R499 in topic passes)', async () => {
  const prompt = 'Business: Demo Dental. Topic: quote our R499 whitening special this Saturday.';
  const fetcher = async () => okJson({ caption: 'This Saturday: professional whitening R499. Book now!', hashtags: [] });
  const r = await freeAiGenerate({ GROQ_API_KEY: 'k1', OPENROUTER_API_KEY: 'k2' }, prompt, { maxTokens: 100 }, rejectInventedPrices(prompt, parseCaption), fetcher);
  assert.ok(r, 'user-supplied price must pass');
});
