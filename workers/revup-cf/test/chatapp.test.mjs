import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist-test/index.mjs';
import {
  base64url, pkceS256, validRedirectUri, popiaSnippet, firstName,
  protectedResourceMetadata, privacyPage, CHATAPP_SCOPE,
} from '../dist-test/chatapp.mjs';

// --- pure helpers ---
test('base64url: url-safe, unpadded', async () => {
  const b = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('abc')));
  assert.match(b, /^[A-Za-z0-9_-]+$/);
  assert.equal(b.includes('='), false);
});
test('pkceS256: RFC 7636 appendix B vector', async () => {
  const out = await pkceS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  assert.equal(out, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('validRedirectUri: exact match only', () => {
  const reg = ['https://chatgpt.com/connector_platform_oauth_redirect'];
  assert.ok(validRedirectUri('https://chatgpt.com/connector_platform_oauth_redirect', reg));
  assert.ok(!validRedirectUri('https://chatgpt.com/connector_platform_oauth_redirect/x', reg));
  assert.ok(!validRedirectUri('https://evil.example/cb', reg));
});
test('popiaSnippet: caps length, collapses whitespace', () => {
  assert.equal(popiaSnippet('a'.repeat(200)).length, 140);
  assert.equal(popiaSnippet('hi\nthere\t you'), 'hi there you');
  assert.equal(popiaSnippet(null), '');
});
test('firstName: first token only', () => {
  assert.equal(firstName('Sipho Naha'), 'Sipho');
  assert.equal(firstName(''), '');
  assert.equal(firstName(null), '');
});

// --- metadata docs (no db) ---
test('protected resource metadata: resource is /mcp on the same origin, read scope', () => {
  const m = protectedResourceMetadata('https://revup.nahalabs.co.za');
  assert.equal(m.resource, 'https://revup.nahalabs.co.za/mcp');
  assert.deepEqual(m.authorization_servers, ['https://revup.nahalabs.co.za']);
  assert.deepEqual(m.scopes_supported, [CHATAPP_SCOPE]);
});
test('privacy page: POPIA, read-only ChatGPT section, contact, no invented stats', () => {
  const p = privacyPage();
  assert.ok(p.includes('POPIA'));
  assert.ok(p.includes('read-only'));
  assert.ok(p.includes('hello@nahalabs.co.za'));
  assert.ok(!/free trial/i.test(p));
});

// --- worker wiring: public endpoints answer without login ---
test('worker: OAuth + MCP discovery endpoints are public', async () => {
  for (const p of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server']) {
    const res = await worker.fetch(new Request('https://revup.nahalabs.co.za' + p), {});
    assert.equal(res.status, 200, p);
    const body = await res.json();
    assert.ok(body.authorization_endpoint || body.authorization_servers, p);
  }
  const meta = await (await worker.fetch(new Request('https://revup.nahalabs.co.za/.well-known/oauth-authorization-server'), {})).json();
  assert.deepEqual(meta.code_challenge_methods_supported, ['S256']);
  assert.deepEqual(meta.token_endpoint_auth_methods_supported, ['none']);
  assert.equal(meta.registration_endpoint, 'https://revup.nahalabs.co.za/oauth/register');
});
test('worker: /privacy is public', async () => {
  const res = await worker.fetch(new Request('https://revup.nahalabs.co.za/privacy'), {});
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes('POPIA'));
});
test('worker: /mcp initialize + tools/list work without auth (mixed-auth pattern)', async () => {
  const init = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }),
  }), {});
  assert.equal(init.status, 200);
  const ib = await init.json();
  assert.equal(ib.result.serverInfo.name, 'revup');
  assert.equal(ib.result.protocolVersion, '2025-06-18');
  const list = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
  }), {});
  const lb = await list.json();
  const names = lb.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['get_radar_feed', 'get_review_stats', 'get_today_enquiry_summary', 'get_upcoming_bookings']);
  for (const t of lb.result.tools) {
    assert.equal(t.annotations.readOnlyHint, true, t.name);
    assert.equal(t.annotations.destructiveHint, false, t.name);
  }
});
test('worker: /mcp notifications get 202, unknown method gets -32601, GET gets 405', async () => {
  const n = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  }), {});
  assert.equal(n.status, 202);
  const u = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'nope/nope' }),
  }), {});
  assert.equal((await u.json()).error.code, -32601);
  const g = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp'), {});
  assert.equal(g.status, 405);
});
test('worker: tools/call without token -> 401 with WWW-Authenticate pointing at protected resource metadata', async () => {
  const res = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_review_stats', arguments: {} } }),
  }), {});
  assert.equal(res.status, 401);
  assert.ok((res.headers.get('www-authenticate') || '').includes('/.well-known/oauth-protected-resource'));
});
test('worker: resources/read returns the skybridge widget', async () => {
  const res = await worker.fetch(new Request('https://revup.nahalabs.co.za/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'resources/read', params: { uri: 'ui://widget/revup-overview-v1.html' } }),
  }), {});
  const b = await res.json();
  assert.equal(b.result.contents[0].mimeType, 'text/html+skybridge');
  assert.ok(b.result.contents[0].text.includes('window.openai'));
});
test('worker: DCR rejects http redirect URIs', async () => {
  const res = await worker.fetch(new Request('https://revup.nahalabs.co.za/oauth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_name: 'x', redirect_uris: ['http://insecure.example/cb'] }),
  }), {});
  assert.equal(res.status, 400);
});
