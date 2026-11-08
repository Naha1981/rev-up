import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { navLinks, recommendPlan } from '../dist-test/index.mjs';
import { verifyZernioSignature, industryBrief, profileBlock, customerBlock } from '../dist-test/receptionist.mjs';
import { landingPage } from '../dist-test/index.mjs';
import crypto from 'node:crypto';

// --- onboarding: plan recommendation ---
test('recommendPlan: leads -> business-pro', () => assert.equal(recommendPlan(['leads']), 'business-pro'));
test('recommendPlan: social -> growth', () => assert.equal(recommendPlan(['social']), 'growth'));
test('recommendPlan: reviews only -> starter', () => assert.equal(recommendPlan(['reviews']), 'starter'));
test('recommendPlan: empty -> starter', () => assert.equal(recommendPlan([]), 'starter'));

// --- goal-driven nav tailoring ---
const nav = (goals) => navLinks({ _goals: goals });
test('nav: no goals shows everything', () => {
  const h = nav([]);
  for (const item of ['Analytics', 'Radar', 'Posts', 'Reviews', 'Inbox', 'Leads', 'Approvals', 'Billing', 'Receptionist'])
    assert.ok(h.includes(item), item);
});
test('nav: social+reviews hides Inbox/Leads/Receptionist', () => {
  const h = nav(['social', 'reviews']);
  for (const item of ['Analytics', 'Radar', 'Posts', 'Reviews']) assert.ok(h.includes(item), item);
  for (const item of ['Inbox', 'Leads', 'Receptionist']) assert.ok(!h.includes(item), item);
});
test('nav: leads+receptionist hides social/review features', () => {
  const h = nav(['leads', 'receptionist']);
  for (const item of ['Inbox', 'Leads', 'Receptionist']) assert.ok(h.includes(item), item);
  for (const item of ['Analytics', 'Radar', 'Posts', 'Reviews']) assert.ok(!h.includes(item), item);
});
test('nav: Dashboard/Onboarding/Billing always present', () => {
  for (const g of [[], ['social'], ['leads']]) {
    const h = nav(g);
    for (const item of ['Dashboard', 'Onboarding', 'Billing']) assert.ok(h.includes(item), item);
  }
});

// --- webhook signature ---
const SECRET = 'testsecret';
const sig = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('hex');
test('verifyZernioSignature: valid passes', async () => {
  const body = JSON.stringify({ event: 'message.received' });
  assert.ok(await verifyZernioSignature(SECRET, body, sig(body)));
});
test('verifyZernioSignature: wrong signature rejected', async () => {
  assert.ok(!(await verifyZernioSignature(SECRET, 'body', sig('other'))));
});
test('verifyZernioSignature: empty secret/signature fail closed', async () => {
  assert.ok(!(await verifyZernioSignature('', 'body', sig('body'))));
  assert.ok(!(await verifyZernioSignature(SECRET, 'body', '')));
});

// --- receptionist prompt blocks ---
test('industryBrief: plumber preset used', () => {
  const b = industryBrief('plumber');
  assert.ok(b.toLowerCase().includes('plumb'));
  assert.ok(b.includes('Tone:'));
});
test('industryBrief: unknown industry falls back to general', () => {
  assert.ok(industryBrief('nonsense').length > 20);
});
test('profileBlock: name, hours, prices, ZAR rules', () => {
  const b = profileBlock({ business_name: 'Demo Dental', operating_hours: { text: 'Mon-Fri 8-5' }, pricing_data: { 'Check-up': 'R850' }, call_out_fee: null, payment_link_url: '', custom_rules: {} });
  assert.ok(b.includes('Demo Dental'));
  assert.ok(b.includes('Mon-Fri 8-5'));
  assert.ok(b.includes('R850'));
});
test('customerBlock: VIP + visits + dietary', () => {
  const b = customerBlock({ name: 'Lerato', is_vip: true, visit_count: 3, dietary_notes: 'halaal' });
  assert.ok(b.includes('Lerato') && b.includes('VIP') && b.includes('3 times') && b.includes('halaal'));
});

// --- landing truthfulness ---
test('landing: core sections present', () => {
  const l = landingPage();
  for (const good of ['WhatsApp employee', 'Google review', 'Lead pipeline', 'Competitor watch', 'pricing', 'RevUp by NahaLabs'])
    assert.ok(l.includes(good), good);
});
test('landing: no internal or vendor terms, no banned pricing wording', () => {
  const l = landingPage().toLowerCase();
  for (const bad of ['frontdesk', 'radar', 'website builder', 'zernio', 'cloudflare', 'groq', 'openrouter', 'trigger.dev', 'free trial', 'setup fee', ' vat', 'testimonial', 'demo', 'not yet built'])
    assert.ok(!l.includes(bad), bad);
});
test('landing: ZAR pricing, all three monthly plans', () => {
  const l = landingPage();
  for (const good of ['R499', 'R999', 'R1,999', 'Starter', 'Growth', 'Business Pro', 'per month'])
    assert.ok(l.includes(good), good);
});

// --- live HTTP ---
const BASE = 'https://revup.nahalabs.co.za';
test('live: /health ok with db', async () => {
  const r = await fetch(BASE + '/health');
  const j = await r.json();
  assert.ok(j.ok && j.db);
});
test('live: webhook rejects bad signature with 403', async () => {
  const r = await fetch(BASE + '/webhooks/zernio', { method: 'POST', headers: { 'content-type': 'application/json', 'x-zernio-signature': 'deadbeef' }, body: '{}' });
  assert.equal(r.status, 403);
});
test('live: webhook dedupes a replayed event id', async () => {
  const id = 'cf-test-dedupe-fixed-1';
  const body = JSON.stringify({ id, event: 'message.received', message: { account: { accountId: 'unknown-acct' } } });
  const s = crypto.createHmac('sha256', process.env.ZS || '').update(body).digest('hex');
  if (!process.env.ZS) { console.log('  (skipped: ZS env not set)'); return; }
  const r1 = await fetch(BASE + '/webhooks/zernio', { method: 'POST', headers: { 'content-type': 'application/json', 'x-zernio-signature': s }, body });
  const r2 = await fetch(BASE + '/webhooks/zernio', { method: 'POST', headers: { 'content-type': 'application/json', 'x-zernio-signature': s }, body });
  assert.equal((await r1.json()).ok, true);
  assert.equal((await r2.json()).deduped, true);
});
test('live: tracked link redirects and counts', async () => {
  const r = await fetch(BASE + '/t/demolink01', { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.ok(r.headers.get('location').includes('ref=demolink01'));
});

// --- RevUp Pages ---
import { mirrorStructure, makeSlug, renderPublicPage, ctaTarget } from '../dist-test/pages.mjs';

test('mirror: hero first, cta last, structure only', () => {
  const html = `<html><body><script>evil()</script>
  <h1>Best Dentist in Town</h1><p>welcome friend</p>
  <h2>Our Services</h2><p>we do teeth and more teeth here</p>
  <h2>Pricing</h2><p>from R500</p>
  <h2>What Patients Say</h2><blockquote>great</blockquote>
  <h2>Contact Us</h2><p>book now</p></body></html>`;
  const sk = mirrorStructure(html);
  assert.equal(sk[0].type, 'hero');
  assert.equal(sk[sk.length-1].type, 'cta');
  assert.ok(sk.some(s => s.type === 'offer'), 'pricing classified as offer');
  assert.ok(sk.some(s => s.type === 'proof'), 'testimonials classified as proof');
  // structure only: no source copy survives in the skeleton
  assert.ok(!JSON.stringify(sk).includes('Best Dentist'));
  assert.ok(!JSON.stringify(sk).includes('teeth'));
});

test('mirror: empty page still yields hero+cta skeleton', () => {
  const sk = mirrorStructure('<html><body><p>no headings</p></body></html>');
  assert.equal(sk[0].type, 'hero');
  assert.equal(sk[sk.length-1].type, 'cta');
});

test('makeSlug: kebab plus suffix, url-safe', () => {
  const s = makeSlug("Sipho's Panel Beaters!");
  assert.match(s, /^sipho-s-panel-beaters-[a-z0-9]{4}$/);
});

const demoPage = {
  id: 'x', workspace_id: 'w', title: 'Demo Dental - sore tooth', slug: 'demo-dental-ab12',
  angle: 'sore tooth', industry: 'dental', status: 'published', source_url: '',
  brand: { business: 'Demo Dental', color: '#0ea5e9', whatsapp: '082 555 1234', cta_label: 'WhatsApp us', area: 'Sandton' },
  sections: [
    { type: 'hero', heading: 'Toothache? Seen today.', body: 'Same-day appointments in Sandton.', items: [] },
    { type: 'cta', heading: 'Ready', body: 'Message now.', items: [] },
  ],
};
test('renderPublicPage: escapes html, shows brand, sticky CTA, no RevUp logo in header', () => {
  const evil = { ...demoPage, sections: [{ type: 'hero', heading: '<script>alert(1)</script>Hi', body: 'x', items: [] }] };
  const out = renderPublicPage(evil, 'https://revup.test');
  assert.ok(!out.includes('<script>alert(1)</script>Hi'));
  assert.ok(out.includes('&lt;script&gt;'));
  const good = renderPublicPage(demoPage, 'https://revup.test');
  assert.ok(good.includes('Demo Dental'));
  assert.ok(good.includes('/p/demo-dental-ab12/go'));
  assert.ok(good.includes('#0ea5e9'));
  assert.ok(good.includes('class="bar"'), 'mobile sticky CTA bar');
});
test('ctaTarget: wa.me with 27 prefix and prefilled message', () => {
  const t = ctaTarget(demoPage);
  assert.ok(t.startsWith('https://wa.me/27825551234?text='), t);
});
test('ctaTarget: falls back to link then signup', () => {
  assert.equal(ctaTarget({ ...demoPage, brand: { link: 'https://x.co.za/book' } }), 'https://x.co.za/book');
  assert.equal(ctaTarget({ ...demoPage, brand: {} }), 'https://revup.nahalabs.co.za/signup');
});

// --- RevUp Pages UI kit (uiverse picks, MIT) ---
import { pagesAdminAssets, newPageBody, pageDetailBody } from '../dist-test/pages.mjs';

test('public page CTA uses comic-button style with attribution', () => {
  const h = renderPublicPage({ id: 1, slug: 'x', title: 'T', angle: 'a', industry: 'general', status: 'published', views: 0, cta_clicks: 0, brand: { business: 'B' }, sections: [{ type: 'cta', heading: 'H', body: 'B', items: [] }] }, 'https://example.com');
  assert.ok(h.includes('box-shadow:5px 5px 0 #1C1917'), 'comic shadow');
  assert.ok(h.includes('uiverse.io/Gautammsharma/wicked-cobra-3'), 'attribution');
});
test('admin assets include all six element classes with attribution', () => {
  const a = pagesAdminAssets();
  for (const cls of ['uipill', 'uitip', 'ruiswitch', 'uicard', 'uiload-overlay', 'uigauge']) assert.ok(a.includes(cls), cls);
  for (const who of ['ErzenXz', 'sahilxkhadka', 'gharsh11032000', 'jubayer-10', 'Nawsome']) assert.ok(a.includes(who), who);
});
test('new page form shows gauge loader on submit', () => {
  const b = newPageBody();
  assert.ok(b.includes('uiloadShow(') && b.includes('uiload-overlay'));
});
test('page detail has publish toggle, stat cards, tooltips', async () => {
  const b = await pageDetailBody(null, { id: 7, slug: 's', title: 'T', angle: 'a', status: 'draft', views: 3, cta_clicks: 1, brand: {}, sections: [], source_url: null }, 'https://example.com');
  assert.ok(b.includes('id="pubToggle"'), 'toggle');
  assert.ok((b.match(/uicard/g) || []).length >= 2, 'stat cards');
  assert.ok(b.includes('uitip-b'), 'tooltips');
  assert.equal((b.match(/publish" style="display:inline"/g) || []).length, 1, 'only the noscript fallback form remains');
});

// --- login rate limit: only failed attempts count ---
import { rateLimitExceeded } from '../dist-test/index.mjs';
const fakeReq = { headers: { get: () => '1.2.3.4' } };
test('rateLimitExceeded: under budget allowed', async () => {
  const db = { query: async () => ({ rows: [{ count: 20 }] }) };
  assert.equal(await rateLimitExceeded(db, 'login', fakeReq, 20), false);
});
test('rateLimitExceeded: over budget blocked', async () => {
  const db = { query: async () => ({ rows: [{ count: 21 }] }) };
  assert.equal(await rateLimitExceeded(db, 'login', fakeReq, 20), true);
});
test('rateLimitExceeded: no row means allowed (no failed attempts yet)', async () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(await rateLimitExceeded(db, 'login', fakeReq, 20), false);
});

// --- PayFast ITN amount check (audit fix: amount_gross must match plan price) ---
import { itnAmountOk } from '../dist-test/index.mjs';
test('itnAmountOk: exact price passes', () => {
  assert.ok(itnAmountOk('starter', '499.00'));
  assert.ok(itnAmountOk('growth', '999.00'));
  assert.ok(itnAmountOk('business-pro', '1999.00'));
});
test('itnAmountOk: wrong amount rejected', () => {
  assert.ok(!itnAmountOk('business-pro', '1.00'));
  assert.ok(!itnAmountOk('starter', '999.00'));
});
test('itnAmountOk: missing/garbage amount rejected', () => {
  assert.ok(!itnAmountOk('starter', undefined));
  assert.ok(!itnAmountOk('starter', 'abc'));
});
test('itnAmountOk: unknown plan rejected', () => assert.ok(!itnAmountOk('free', '499.00')));

// --- constant-time signature compare (audit fix) ---
import { timingSafeEq } from '../dist-test/index.mjs';
test('timingSafeEq: equal strings pass', () => assert.ok(timingSafeEq('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3')));
test('timingSafeEq: one-char diff rejected', () => assert.ok(!timingSafeEq('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3', 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd4')));
test('timingSafeEq: length mismatch rejected', () => assert.ok(!timingSafeEq('abc', 'abcd')));

// --- ITN source IP allowlist (PayFast published ranges) ---
import { itnSourceAllowed } from '../dist-test/index.mjs';
test('itnSourceAllowed: PayFast-range IPs pass', () => {
  assert.ok(itnSourceAllowed('197.97.145.150'));   // 197.97.145.144/28
  assert.ok(itnSourceAllowed('41.74.179.200'));    // 41.74.179.192/27
  assert.ok(itnSourceAllowed('102.216.36.10'));    // 102.216.36.0/28
  assert.ok(itnSourceAllowed('102.216.36.140'));   // 102.216.36.128/28
  assert.ok(itnSourceAllowed('144.126.193.139'));  // single host
});
test('itnSourceAllowed: non-range IPs rejected', () => {
  assert.ok(!itnSourceAllowed('197.97.145.160'));  // just outside /28
  assert.ok(!itnSourceAllowed('8.8.8.8'));
  assert.ok(!itnSourceAllowed('10.0.0.1'));
});
test('itnSourceAllowed: garbage rejected', () => {
  assert.ok(!itnSourceAllowed(''));
  assert.ok(!itnSourceAllowed('999.1.1.1'));
  assert.ok(!itnSourceAllowed('not-an-ip'));
});
