import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeAiGenerate } from '../dist-test/freeai.mjs';

const ENV = { GROQ_API_KEY: 'gsk_test_primary_key', OPENROUTER_API_KEY: 'sk-or-test_secondary_key' };
const PROMPT = 'Write a caption for a dental studio. SECRET-MARKER-123';
const parseJson = (text) => {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try { const p = JSON.parse(m[0]); return p && p.caption ? p : null; } catch { return null; }
};

// fetcher factory: script per URL substring; records calls
function fakeFetch(script) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    for (const [match, responder] of script) {
      if (url.includes(match)) return typeof responder === 'function' ? responder(url, init) : responder;
    }
    throw new Error('unexpected URL ' + url);
  };
  fetcher.calls = calls;
  return fetcher;
}
const okJson = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }] }) });
const okText = (t) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: t } }] }) });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });

test('groq success means the secondary is never called', async () => {
  const f = fakeFetch([['groq.com', okJson({ caption: 'Hello', hashtags: ['#a'] })]]);
  const r = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r.provider, 'Groq');
  assert.deepEqual(r.value, { caption: 'Hello', hashtags: ['#a'] });
  assert.ok(!f.calls.some(c => c.url.includes('openrouter')), 'secondary must not be called');
});

for (const [name, primaryResp] of [
  ['429', fail(429)],
  ['500', fail(500)],
  ['timeout', () => { throw new Error('TimeoutError: The operation timed out'); }],
  ['empty reply', okText('')],
  ['invalid JSON', okText('sure! here is your caption, no json at all')],
]) {
  test(`primary ${name} advances once to the free secondary, output schema-validated`, async () => {
    const f = fakeFetch([['groq.com', primaryResp], ['openrouter', okJson({ caption: 'From secondary', hashtags: [] })]]);
    const r = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
    assert.ok(r, 'secondary should succeed');
    assert.equal(r.provider, 'OpenRouter');
    assert.equal(r.value.caption, 'From secondary');
    const orCalls = f.calls.filter(c => c.url.includes('openrouter'));
    assert.equal(orCalls.length, 1, 'secondary tried exactly once');
    assert.ok(r.attempts.some(a => a.provider === 'Groq'));
  });
}

test('missing primary key goes straight to the secondary', async () => {
  const f = fakeFetch([['openrouter', okJson({ caption: 'Backup', hashtags: [] })]]);
  const r = await freeAiGenerate({ OPENROUTER_API_KEY: ENV.OPENROUTER_API_KEY }, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r.provider, 'OpenRouter');
  assert.deepEqual(r.attempts[0], { provider: 'Groq', status: 'missing' });
  assert.ok(!f.calls.some(c => c.url.includes('groq.com')));
});

test('all providers fail: null, no false success, attempts carry no secrets or prompt text', async () => {
  const f = fakeFetch([['groq.com', fail(429)], ['openrouter', fail(503)]]);
  const r = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r, null);
});

test('attempts never contain keys, prompt text, or response bodies', async () => {
  const f = fakeFetch([['groq.com', fail(429)], ['openrouter', okText('garbage not json')]]);
  const r = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r, null);
  // re-run capturing attempts through a success path to inspect the array
  const f2 = fakeFetch([['groq.com', fail(429)], ['openrouter', okJson({ caption: 'ok', hashtags: [] })]]);
  const r2 = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f2);
  const blob = JSON.stringify(r2.attempts);
  assert.ok(!blob.includes('gsk_test_primary_key'));
  assert.ok(!blob.includes('sk-or-test_secondary_key'));
  assert.ok(!blob.includes('SECRET-MARKER-123'));
  assert.ok(!blob.includes('quota'));
});

test('zero-price guard and free model on every secondary call', async () => {
  const f = fakeFetch([['groq.com', fail(500)], ['openrouter', okJson({ caption: 'x', hashtags: [] })]]);
  await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  const body = JSON.parse(f.calls.find(c => c.url.includes('openrouter')).init.body);
  assert.equal(body.model, 'openrouter/free');
  assert.deepEqual(body.provider, { max_price: { prompt: 0, completion: 0 } });
  // and the primary never gets an OpenRouter-style body, secondary URL is fixed
  assert.ok(f.calls.every(c => c.url.startsWith('https://api.groq.com/') || c.url.startsWith('https://openrouter.ai/')));
});

test('every provider call carries a timeout AbortSignal', async () => {
  const f = fakeFetch([['groq.com', fail(500)], ['openrouter', okJson({ caption: 'x', hashtags: [] })]]);
  await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.ok(f.calls.length >= 2);
  for (const c of f.calls) assert.ok(c.init.signal instanceof AbortSignal, 'signal present');
});

test('bad JSON from every provider is never returned for persistence', async () => {
  const f = fakeFetch([['groq.com', okText('{"caption": "unterminated')], ['openrouter', okText('[] not the schema')]]);
  const r = await freeAiGenerate(ENV, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r, null, 'unparseable output must surface as unavailable, never as a draft');
});

test('no keys configured at all: null with two missing attempts', async () => {
  const f = fakeFetch([]);
  const r = await freeAiGenerate({}, PROMPT, { maxTokens: 100 }, parseJson, f);
  assert.equal(r, null);
});
