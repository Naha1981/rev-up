import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeAiGenerate, extractAmounts, rejectInventedPrices } from '../dist-test/freeai.mjs';

const parseCaption = (text) => {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try { const p = JSON.parse(m[0]); return p && p.caption ? p : null; } catch { return null; }
};
const okJson = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const fake = (resp) => { const calls = []; const f = async (url) => { calls.push(url); return resp; }; f.calls = calls; return f; };

test('extractAmounts: symbols, ZAR, rand, commas, decimals', () => {
  const a = extractAmounts('R799 and R 1,500.00 plus ZAR 250 or 80 rand, $40');
  for (const x of ['799', '1500', '250', '80', '40']) assert.ok(a.includes(x), x);
});

test('extractAmounts: percentages and bare numbers are not prices', () => {
  assert.deepEqual(extractAmounts('20% off, table for 4, open 8 to 5'), []);
});

test('guard rejects a draft quoting an amount absent from the prompt', () => {
  const parse = rejectInventedPrices('Business: Demo Dental. Topic: whitening special.', parseCaption);
  assert.equal(parse('{"caption":"Only R799 this Saturday!","hashtags":[]}'), null);
});

test('guard accepts a draft quoting an amount present in the prompt', () => {
  const prompt = 'Known prices: {"whitening": 799}. Topic: whitening special.';
  const parse = rejectInventedPrices(prompt, parseCaption);
  const r = parse('{"caption":"Whitening just R799 as listed","hashtags":[]}');
  assert.ok(r, 'price from the brief must pass');
});

test('guard normalises formats: R1,500.00 output matches ZAR 1500 input', () => {
  const parse = rejectInventedPrices('Price list: ZAR 1500 for consult', parseCaption);
  assert.ok(parse('{"caption":"Consult is R1,500.00","hashtags":[]}'));
});

test('guard rejects foreign-currency inventions too', () => {
  const parse = rejectInventedPrices('Business: Demo Dental.', parseCaption);
  assert.equal(parse('{"caption":"Only $49!","hashtags":[]}'), null);
  assert.equal(parse('{"caption":"Only 49 rand!","hashtags":[]}'), null);
});

test('chain: primary invents a price -> rejected -> secondary clean draft succeeds', async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    if (url.includes('groq.com')) return okJson({ caption: 'Whitening only R599!', hashtags: [] });
    return okJson({ caption: 'Book your whitening visit this Saturday.', hashtags: ['#smile'] });
  };
  const prompt = 'Business: Demo Dental. Topic: whitening special.';
  const r = await freeAiGenerate({ GROQ_API_KEY: 'k1', OPENROUTER_API_KEY: 'k2' }, prompt, { maxTokens: 100 }, rejectInventedPrices(prompt, parseCaption), fetcher);
  assert.ok(r, 'secondary clean draft must succeed');
  assert.equal(r.provider, 'OpenRouter');
  assert.ok(!/R\d/.test(r.value.caption), 'no invented amount in accepted draft');
  assert.ok(r.attempts.some(a => a.provider === 'Groq' && a.status === 'invalid'));
});

test('chain: every provider invents prices -> null, nothing to persist', async () => {
  const fetcher = async () => okJson({ caption: 'Special price R123!', hashtags: [] });
  const prompt = 'Business: Demo Dental. No prices given.';
  const r = await freeAiGenerate({ GROQ_API_KEY: 'k1', OPENROUTER_API_KEY: 'k2' }, prompt, { maxTokens: 100 }, rejectInventedPrices(prompt, parseCaption), fetcher);
  assert.equal(r, null);
});
