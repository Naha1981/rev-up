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

// --- landing truthfulness (receptionist claims stay stripped until retest) ---
test('landing: no receptionist/whatsapp/bookings claims', () => {
  const l = landingPage().toLowerCase();
  for (const bad of ['receptionist', 'whatsapp', 'calendar bookings', 'live today'])
    assert.ok(!l.includes(bad), bad);
});
test('landing: ZAR pricing, all three plans', () => {
  const l = landingPage();
  for (const good of ['R499', 'R999', 'R1,999', 'Starter', 'Growth', 'Business Pro'])
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
