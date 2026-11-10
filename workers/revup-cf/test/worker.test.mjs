import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { navLinks, recommendPlan, dashboardPage } from '../dist-test/index.mjs';
import { verifyZernioSignature, industryBrief, profileBlock, customerBlock } from '../dist-test/receptionist.mjs';
import { landingPage } from '../dist-test/index.mjs';
import crypto from 'node:crypto';

// --- onboarding: plan recommendation ---
test('recommendPlan: leads -> business-pro', () => assert.equal(recommendPlan(['leads']), 'business-pro'));
test('recommendPlan: social -> growth', () => assert.equal(recommendPlan(['social']), 'growth'));
test('recommendPlan: reviews only -> starter', () => assert.equal(recommendPlan(['reviews']), 'starter'));
test('recommendPlan: empty -> starter', () => assert.equal(recommendPlan([]), 'starter'));

// --- guided navigation: five stable destinations, all tools remain reachable ---
const nav = (goals) => navLinks({ _goals: goals });
test('nav: exactly five plain destinations', () => {
  const h=nav([]);
  assert.equal((h.match(/<a /g)||[]).length,5);
  for(const label of ['Home','Customers','Bookings','Posts','Settings'])assert.ok(h.includes('>'+label+'</span>'),label);
});
test('nav: goals never hide the five stable destinations',()=>{
  assert.equal(nav(['social','reviews']),nav(['leads','receptionist']));
});
test('nav: accessible names and visible icons',()=>{
  const h=nav([]);assert.ok(h.includes('aria-label="Main navigation"'));assert.equal((h.match(/aria-hidden="true"/g)||[]).length,5);
});
test('nav: no crowded More overflow',()=>{
  const h=nav([]);assert.ok(!h.includes('<details'));assert.ok(!h.includes('Dashboard'));assert.ok(!h.includes('More'));
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

// Preserve the selected private image through AI caption generation.
test('post drafting keeps the selected image in both forms', async()=>{
 const {newPostPage}=await import('../dist-test/index.mjs');
 const id='ba263aa5-9153-4e10-9cfd-46ec61e0409a';
 const html=newPostPage(null,{}, {media:id,topic:'Synthetic tea',caption:'Synthetic draft'});
 const draft=html.match(/action="\/posts\/draft">([\s\S]*?)<\/form>/)[1];
 const save=html.match(/action="\/posts\/new">([\s\S]*?)<\/form>/)[1];
 assert.ok(draft.includes('name="media" value="'+id+'"'));
 assert.ok(save.includes('name="media_id" value="'+id+'"'));
 assert.ok(html.includes('/media/'+id+'/raw'));
});
test('post draft with no selected image adds no attachment',async()=>{
 const {newPostPage}=await import('../dist-test/index.mjs');
 const html=newPostPage(null,{},{});
 assert.ok(!html.includes('name="media"'));
 assert.ok(!html.includes('name="media_id"'));
});

test('WiFi card grid permits phone-width tracks without intrinsic overflow', async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/wificard.ts',import.meta.url),'utf8');
 assert.ok(src.includes('grid-template-columns:minmax(0,1fr)'));
 assert.ok(src.includes('.wc-grid>*{min-width:0}'));
 assert.ok(src.includes('.wifi-card{box-sizing:border-box;width:148mm;max-width:100%'));
 assert.ok(src.includes('.wc-net{overflow-wrap:anywhere;'));
});

test('lead pipeline stacks rows and stage controls at phone width',async()=>{
 const {leadPipelinePage}=await import('../dist-test/index.mjs');
 const db={query:async q=>({rows:q.includes('SELECT * FROM frontdesk_lead')?[{id:'00000000-0000-4000-8000-000000000001',name:'Synthetic QA',contact:'qa@example.invalid',message:'Private test',stage:'new',value_cents:0,created_at:'2026-11-10T00:00:00Z'}]:[]})};
 const page=await leadPipelinePage(db,{_cur_ws:'Synthetic QA'},{workspace_id:'00000000-0000-4000-8000-000000000002'});
 assert.ok(page.includes('class="rtable lead-pipeline"'));
 assert.ok(page.includes('class="lead-stage-form"'));
 assert.ok(page.includes('data-label="Stage and value"'));
 assert.ok(page.includes('flex-wrap:wrap'));
 assert.ok(page.includes('qa@example.invalid'));
});

test('calendar OAuth state binds workspace, user, purpose and 15-minute expiry',async()=>{
 const {calendarState,checkCalendarState}=await import('../dist-test/index.mjs');
 const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};
 const s=await calendarState(e,'ws','user',1000);
 assert.ok(await checkCalendarState(e,s,'ws','user',2000));
 assert.equal(await checkCalendarState(e,s,'other','user',2000),false);
 assert.equal(await checkCalendarState(e,s,'ws','other',2000),false);
 assert.equal(await checkCalendarState(e,s,'ws','user',901000),false);
 assert.equal(await checkCalendarState(e,s+'x','ws','user',2000),false);
});
test('calendar event uses explicit UTC instant, Johannesburg zone and no invitees',async()=>{
 const {calendarEventBody,calendarEventId}=await import('../dist-test/index.mjs');
 const b=calendarEventBody({scheduled_start:'2026-11-10T10:00:00+02:00',duration_minutes:30,service:'Synthetic job',contact_name:'QA'});
 assert.equal(b.start.dateTime,'2026-11-10T08:00:00.000Z');assert.equal(b.end.dateTime,'2026-11-10T08:30:00.000Z');
 assert.equal(b.start.timeZone,'Africa/Johannesburg');assert.equal(b.attendees,undefined);
 assert.equal(calendarEventId('AA000000-0000-4000-8000-000000000001'),'aa000000000040008000000000000001');
 assert.throws(()=>calendarEventBody({scheduled_start:'invalid'}));
});
test('calendar connect stores encrypted access and refresh tokens only',async()=>{
 const {calendarConnect}=await import('../dist-test/index.mjs');
 const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),GOOGLE_CALENDAR_CLIENT_ID:'synthetic-id',GOOGLE_CALENDAR_CLIENT_SECRET:'synthetic-secret'};let written;
 await calendarConnect({query:async(q,p)=>{written=p;return {rows:[]};}},e,'ws','synthetic-code','https://example.invalid',async()=>new Response(JSON.stringify({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600})));
 assert.ok(written);assert.notEqual(written[2],'synthetic-access');assert.notEqual(written[3],'synthetic-refresh');
});
test('calendar sync refuses a conflicting event before any write',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');
 const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={id:'conn',access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let methods=[];
 await assert.rejects(calendarSync({query:async()=>({rows:[c]})},e,'ws',{id:'00000000-0000-4000-8000-000000000001',scheduled_start:'2026-11-10T08:00:00Z'},false,async(u,o)=>{methods.push(o.method||'GET');return new Response(JSON.stringify({items:[{id:'busy'}]}));}),/overlaps/);
 assert.deepEqual(methods,['GET']);
});
test('calendar sync creates deterministic event after availability check and persists id',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');
 const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={id:'conn',access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let writes=[],calls=[];
 const db={query:async(q,p)=>{if(q.startsWith('SELECT'))return {rows:[c]};writes.push(p);return {rows:[]};}};
 const result=await calendarSync(db,e,'ws',{id:'00000000-0000-4000-8000-000000000001',scheduled_start:'2026-11-10T08:00:00Z'},false,async(u,o)=>{calls.push([u,o]);return new Response(JSON.stringify(o.method==='POST'?{id:JSON.parse(o.body).id}:{items:[]}));});
 assert.equal(result,'synced');assert.equal(calls.length,2);assert.ok(calls[1][0].includes('sendUpdates=none'));assert.equal(writes[0][0],'00000000000040008000000000000001');
});

test('calendar provider error never marks a booking synced',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let writes=0;
 await assert.rejects(calendarSync({query:async q=>{if(!q.startsWith('SELECT'))writes++;return {rows:[c]};}},e,'ws',{id:'00000000-0000-4000-8000-000000000001',scheduled_start:'2026-11-10T08:00:00Z'},false,async(u,o)=>o.method==='POST'?new Response('unavailable',{status:503}):new Response(JSON.stringify({items:[]}))),/sync failed/);assert.equal(writes,0);
});
test('calendar cancellation preserves booking link when Google refuses removal',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let writes=0;
 await assert.rejects(calendarSync({query:async q=>{if(!q.startsWith('SELECT'))writes++;return {rows:[c]};}},e,'ws',{id:'booking',google_event_id:'event'},true,async()=>new Response('unavailable',{status:503})),/not been cancelled/);assert.equal(writes,0);
});
test('calendar expired access refreshes through encrypted storage before syncing',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),GOOGLE_CALENDAR_CLIENT_ID:'synthetic-id',GOOGLE_CALENDAR_CLIENT_SECRET:'synthetic-secret'};const c={id:'conn',access_token:await encryptTenantKey('old-access',e),refresh_token:await encryptTenantKey('synthetic-refresh',e),token_expiry:new Date(0)};let stored;
 await calendarSync({query:async(q,p)=>{if(q.startsWith('SELECT'))return {rows:[c]};if(q.includes('access_token='))stored=p[0];return {rows:[]};}},e,'ws',{id:'00000000-0000-4000-8000-000000000001',scheduled_start:'2026-11-10T08:00:00Z'},false,async(u,o)=>new Response(JSON.stringify(u.includes('oauth2.googleapis')?{access_token:'new-access',expires_in:3600}:o.method==='POST'?{id:'00000000000040008000000000000001'}:{items:[]})));
 assert.ok(stored);assert.notEqual(stored,'new-access');
});
test('calendar disconnected workspace makes no provider request',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');let called=false;assert.equal(await calendarSync({query:async()=>({rows:[]})},{},'ws',{},false,async()=>{called=true;return new Response();}),'not-connected');assert.equal(called,false);
});

test('calendar panel distinguishes configuration, connection and account safely',async()=>{
 const {calendarPanel}=await import('../dist-test/index.mjs');assert.ok(calendarPanel(null,false).includes('not configured'));assert.ok(!calendarPanel(null,false).includes('<button>'));assert.ok(calendarPanel(null,true).includes('Connect Google Calendar'));assert.ok(calendarPanel({google_email:'<unsafe>',calendar_id:'primary'},true).includes('&lt;unsafe&gt;'));
});

test('calendar move patches the linked event, with no new event or invite',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let methods=[];
 await calendarSync({query:async q=>({rows:q.startsWith('SELECT')?[c]:[]})},e,'ws',{id:'booking',google_event_id:'existing',scheduled_start:'2026-11-10T08:00:00Z'},false,async(u,o)=>{methods.push(o.method||'GET');return new Response(JSON.stringify(o.method==='PATCH'?{id:'existing'}:{items:[{id:'existing'}]}));});assert.deepEqual(methods,['GET','PATCH']);
});
test('calendar cancellation treats an already-gone event as removed',async()=>{
 const {calendarSync}=await import('../dist-test/index.mjs');const {encryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');const e={TENANT_FIELD_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))};const c={access_token:await encryptTenantKey('synthetic-access',e),token_expiry:new Date(Date.now()+3600000)};let writes=[];
 assert.equal(await calendarSync({query:async(q,p)=>{if(q.startsWith('SELECT'))return {rows:[c]};writes.push(p);return {rows:[]};}},e,'ws',{id:'booking',google_event_id:'existing'},true,async()=>new Response('',{status:404})),'synced');assert.equal(writes.length,1);
});

// Fresh-stranger entry regressions.
test('signup includes linked existing terms/privacy and visible password rule', async () => {
  const {signupPage} = await import('../dist-test/index.mjs');
  const h=signupPage();
  assert.match(h,/href="\/legal\/terms\/"/);assert.match(h,/href="\/legal\/privacy\/"/);
  assert.match(h,/Use at least 8 characters/);
});
test('login offers password recovery', async () => {
  const {loginPage} = await import('../dist-test/index.mjs');
  assert.match(loginPage(),/href="\/forgot-password"/);
});
test('recovery uses the established shared-database flow, no caller-controlled redirect', async () => {
  const r=await worker.fetch(new Request('https://revup.nahalabs.co.za/forgot-password?next=https://evil.invalid'),{},{});
  assert.equal(r.status,303);assert.equal(r.headers.get('location'),'https://revup-8g3m.onrender.com/accounts/password/reset/');
});
for (const [path,title] of [['terms','Terms of Service'],['privacy','Privacy Policy']]) {
 test(`public ${path} accessible signed out`,async()=>{
  const r=await worker.fetch(new Request(`https://revup.nahalabs.co.za/legal/${path}/`),{},{});
  assert.equal(r.status,200);const h=await r.text();assert.ok(h.includes(title));assert.ok(h.includes('17 October 2026'));assert.match(h,/href="\/signup"/);
 });
}

test('bookings phone view labels rows, wraps controls and shows last scheduled time',async()=>{
 const {bookingsPage}=await import('../dist-test/index.mjs');
 const booking={id:'00000000-0000-4000-8000-000000000001',contact_name:'Synthetic QA',status:'cancelled',preferred_time:'original text',scheduled_start:'2026-11-10T12:30:00Z'};
 const db={query:async q=>({rows:q.includes('FROM receptionist_booking')?[booking]:[]})};
 const h=await(await bookingsPage(db,{}, {workspace_id:'synthetic'},{},new URL('https://example.invalid/bookings?msg=That%20time%20overlaps'))).text();
 assert.ok(h.includes('class="booking-table"'));
 for(const label of ['Customer','Time','Status','Actions'])assert.ok(h.includes('data-label="'+label+'"'));
 assert.ok(h.includes('content:attr(data-label)'));assert.ok(h.includes('max-width:100%!important'));
 assert.ok(h.includes('14:30:00'));assert.ok(!h.includes('original text'));
 assert.ok(h.includes('class="booking-notice bad"'));assert.ok(h.includes('role="status"'));
});


test('bookings route awaits page queries before pool cleanup',async()=>{
 const {readFileSync}=await import('node:fs');const src=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');assert.ok(src.includes('if (path === "/bookings") return await bookingsPage(db,user,mem,env,url);'));
 let ended=false;const db={query:async q=>{await new Promise(r=>setTimeout(r,1));if(ended)throw Error('pool closed early');return {rows:[]};},end:async()=>{ended=true;}};
 const {bookingsPage}=await import('../dist-test/index.mjs');
 async function route(){try{return await bookingsPage(db,{}, {workspace_id:'synthetic'},{},new URL('https://example.invalid/bookings'));}finally{await db.end();}}
 assert.equal((await route()).status,200);assert.ok(ended);
});

test('landing text passes AA contrast on its light background',()=>{
 const h=landingPage();
 const lum=hex=>{const v=hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return v.reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)};
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 const cream=h.match(/--cream:#([a-f0-9]{6})/)[1];
 for(const token of ['muted','orange-text'])assert.ok(ratio(h.match(new RegExp('--'+token+':#([a-f0-9]{6})'))[1],cream)>=4.5,token);
 assert.ok(h.includes('--orange:#f47721'));
 assert.ok(h.includes('font-size:12px'));
 assert.ok(!/font-size:(8|9|9\.5|10|10\.5|11)px/.test(h));
 assert.ok(h.includes('.faq h2 [style*="--orange-text"]'));
});

test('onboarding reads saved goals from the existing text-field JSON contract',async()=>{
 const {onboardingPage}=await import('../dist-test/index.mjs');
 const db={query:async q=>({rows:q.includes('businessprofile')?[{custom_rules:JSON.stringify({goals:['leads','social']})}]:[{}]})};
 const h=await onboardingPage(db,{}, {workspace_id:'synthetic',plan:'business-pro'});
 assert.match(h,/name="goal_leads" checked/);assert.match(h,/name="goal_social" checked/);
});
test('onboarding stores goals in custom rules, not operating hours',async()=>{
 const {readFileSync}=await import('node:fs');const s=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');
 assert.ok(s.includes("VALUES($1,$2,$3,$4,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'','',$6,$5,true,true,2,'reviews',now(),now())"));
});

// Money safety: business setup cannot upgrade a paid account.
test('onboarding never changes the paid plan',async()=>{
 const {readFileSync}=await import('node:fs');
 const src=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');
 const block=src.slice(src.indexOf('if (path === "/onboarding")'),src.indexOf('if (path === "/radar")'));
 assert.ok(!/SET plan=/.test(block));
 assert.ok(block.includes('SET goals='));
});

// Home status and next-action design uses only workspace-backed counts.
const homeFixture=async (counts={},active=false)=>dashboardPage({query:async()=>({rows:[{details:'0',whatsapp:'0',calendar:'0',sent:'0',approvals:'0',handovers:'0',bookings:'0',...counts}]})},{name:'Fictional Lerato'},{workspace_id:'fictional',workspace_name:'Fictional Plumbing',subscription_status:active?'active':'pending_activation'});
test('home: empty state has an honest next action',async()=>{const h=await homeFixture();assert.ok(h.includes('You are up to date'));assert.ok(h.includes('View customers'));assert.ok(!h.includes('Reply needed'));});
test('home: status and next action for each waiting item',async()=>{const h=await homeFixture({handovers:'1',bookings:'2',approvals:'3'});for(const t of ['Reply needed','Open inbox','Needs confirmation','Review booking','Review needed','Review posts','2 requests waiting for a time','3 posts waiting for your review'])assert.ok(h.includes(t),t);assert.equal((h.match(/class="attention-action attention-primary"/g)||[]).length,1);});
test('home: setup row disappears only after all steps complete',async()=>{const h=await homeFixture({details:'1',whatsapp:'1',calendar:'1',sent:'1'},true);assert.ok(!h.includes('class="setup-compact"'));});
test('home: untrusted names remain escaped',async()=>{const h=await dashboardPage({query:async()=>({rows:[{details:0,whatsapp:0,calendar:0,sent:0,approvals:0,handovers:0,bookings:0}]})},{name:'<script>x</script>'},{workspace_id:'fictional',workspace_name:'<img src=x>',subscription_status:'active'});assert.ok(h.includes('&lt;img src=x&gt;'));assert.ok(!h.includes('<script>x</script>'));});
