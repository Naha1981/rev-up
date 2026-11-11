import assert from 'node:assert/strict';import {Pool} from 'pg';import {createHmac,webcrypto} from 'node:crypto';import {initializePaystack,reconcilePaystack,paystackWebhook,ensurePaystackTables,expirePaystackEntitlements} from '../dist-test/paystack.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const url=process.env.PAYSTACK_TEST_DATABASE||'postgres://sandbox@127.0.0.1:55432/revup_paystack_test';const u=new URL(url);if(!['127.0.0.1','localhost'].includes(u.hostname)||!u.pathname.endsWith('_test'))throw Error('Fictional test database required');
const db=new Pool({connectionString:url,max:12});
const org='d939c5f0-172d-4755-a745-177388adb3b3';const env={PAYSTACK_ENABLED:'true',PAYSTACK_SECRET_KEY:'sk_test_fictional',PAYSTACK_TEST_ORG_IDS:org};
let initializes=0,verifies=0,mode='success',current,proof=[];
const ok=(name)=>{proof.push(name);console.log('PASS '+name);};
globalThis.fetch=async(url,opts)=>{const x=new URL(url);assert.equal(x.origin,'https://api.paystack.co');assert.equal(opts.headers.Authorization,'Bearer sk_test_fictional');
 if(x.pathname==='/transaction/initialize'){
  initializes++;const body=JSON.parse(opts.body);current=body;assert.equal(body.amount,'49900');assert.equal(body.currency,'ZAR');assert.equal(body.plan,undefined);assert.deepEqual(body.channels,['card']);
  if(mode==='outage')return new Response('{}',{status:503});
  return Response.json({status:true,data:{reference:body.reference,authorization_url:mode==='evil-url'?'https://evil.invalid/checkout':'https://checkout.paystack.com/fictional'}});
 }
 if(x.pathname.startsWith('/transaction/verify/')){
  verifies++;if(mode==='outage')throw Error('network outage');
  const ref=x.pathname.split('/').pop();const i=(await db.query('SELECT * FROM cf_paystack_checkout WHERE reference=$1',[ref])).rows[0];
  return Response.json({status:true,data:{status:['failed','pending','abandoned'].includes(mode)?mode:'success',domain:mode==='live'?'live':'test',reference:ref,amount:mode==='wrong-amount'?1:i.amount_cents,currency:mode==='wrong-currency'?'NGN':'ZAR',id:mode==='same-id'?111:Math.abs(parseInt(ref.slice(-10),16)),paid_at:new Date().toISOString(),customer:{email:mode==='foreign-email'?'other@example.invalid':i.email}}});
 }
 throw Error('Unexpected outbound request');
};
async function reset(){await db.query('DELETE FROM cf_paystack_entitlement');await db.query('DELETE FROM cf_paystack_checkout');await db.query("UPDATE organizations_organization SET payfast_token='',subscription_status='expired',plan='starter' WHERE id=$1",[org]);initializes=0;verifies=0;mode='success';}
async function start(){await initializePaystack(db,env,org,'fictional@example.invalid','starter','https://fictional.invalid');return current.reference;}
async function state(){return (await db.query('SELECT plan,subscription_status FROM organizations_organization WHERE id=$1',[org])).rows[0];}
try{
 await ensurePaystackTables(db);await reset();
 await assert.rejects(initializePaystack(db,env,'foreign','fictional@example.invalid','starter','https://fictional.invalid'));assert.equal(initializes,0);ok('foreign fictional organization rejected before provider call');
 await assert.rejects(initializePaystack(db,env,org,'fictional@example.invalid','madeup','https://fictional.invalid'));ok('unknown plan rejected');
 await assert.rejects(initializePaystack(db,{...env,PAYSTACK_SECRET_KEY:'sk_live_forbidden'},org,'fictional@example.invalid','starter','https://fictional.invalid'));ok('live key rejected before provider call');
 await Promise.all(Array.from({length:50},()=>initializePaystack(db,env,org,'fictional@example.invalid','starter','https://fictional.invalid')));assert.equal(initializes,1);assert.equal((await state()).subscription_status,'expired');ok('50 checkout taps create one checkout without activating');
 let ref=current.reference;await assert.rejects(reconcilePaystack(db,env,ref,'foreign'));assert.equal(verifies,0);ok('foreign organization cannot verify another checkout');
 for(const fail of ['failed','pending','abandoned','wrong-amount','wrong-currency','foreign-email','live','outage']){
  mode=fail;if(['failed','pending','abandoned'].includes(fail))assert.equal(await reconcilePaystack(db,env,ref,org),fail==='pending'?'pending':'failed');else await assert.rejects(reconcilePaystack(db,env,ref,org));assert.equal((await state()).subscription_status,'expired');ok(fail+' does not activate');
 }
 mode='success';await Promise.all(Array.from({length:50},()=>reconcilePaystack(db,env,ref,org)));assert.equal((await state()).subscription_status,'active');assert.equal((await db.query("SELECT count(*)::int c FROM cf_paystack_checkout WHERE status='paid'")).rows[0].c,1);const until=(await db.query('SELECT paid_until FROM cf_paystack_entitlement')).rows[0].paid_until;await reconcilePaystack(db,env,ref,org);assert.equal(+(await db.query('SELECT paid_until FROM cf_paystack_entitlement')).rows[0].paid_until,+until);ok('50 concurrent confirmations activate once; replay cannot add months');
 const body=JSON.stringify({event:'charge.success',data:{reference:ref}});const signature=createHmac('sha512',env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
 const hook=()=>new Request('https://fictional.invalid/billing/paystack/webhook',{method:'POST',headers:{'x-paystack-signature':signature},body});
 assert.equal((await paystackWebhook(db,env,hook())).status,200);ok('authenticated legacy webhook handles paid replay');
 const stamp=Math.floor(Date.now()/1000);const signed='t='+stamp+',v1=whk_fixture:'+createHmac('sha512','whsec_fictional').update(stamp+'.'+body).digest('hex');
 assert.equal((await paystackWebhook(db,{...env,PAYSTACK_WEBHOOK_SECRET:'whsec_fictional'},new Request('https://fictional.invalid',{method:'POST',headers:{'Paystack-Signature':signed},body}))).status,200);ok('authenticated modern webhook handles paid replay');
 const unknown=JSON.stringify({event:'charge.success',data:{reference:'RU-PS-'+ 'a'.repeat(32)}});assert.equal((await paystackWebhook(db,env,new Request('https://fictional.invalid',{method:'POST',headers:{'x-paystack-signature':createHmac('sha512',env.PAYSTACK_SECRET_KEY).update(unknown).digest('hex')},body:unknown}))).status,503);ok('unknown reference never activates; retryable webhook failure');
 const irrelevant=JSON.stringify({event:'invoice.payment_failed',data:{reference:ref}});assert.equal((await paystackWebhook(db,env,new Request('https://fictional.invalid',{method:'POST',headers:{'x-paystack-signature':createHmac('sha512',env.PAYSTACK_SECRET_KEY).update(irrelevant).digest('hex')},body:irrelevant}))).status,200);ok('unrelated subscription event cannot alter one-off payment');
 assert.equal((await paystackWebhook(db,env,new Request('https://fictional.invalid',{method:'POST',body:'x'.repeat(262145)}))).status,413);ok('oversized webhook refused');

 assert.equal((await paystackWebhook(db,env,new Request('https://fictional.invalid',{method:'POST',body}))).status,401);ok('unsigned webhook rejected');
 await db.query("UPDATE cf_paystack_entitlement SET paid_until=now()-interval '1 second'");await expirePaystackEntitlements(db,env);assert.equal((await state()).subscription_status,'expired');ok('paid month expires');
 await reset();mode='evil-url';await assert.rejects(start());assert.equal((await db.query('SELECT count(*)::int c FROM cf_paystack_checkout')).rows[0].c,0);ok('malicious provider checkout URL rolls back intent');
 await reset();mode='outage';await assert.rejects(start());assert.equal((await db.query('SELECT count(*)::int c FROM cf_paystack_checkout')).rows[0].c,0);ok('checkout outage rolls back intent');
 await reset();await db.query("UPDATE organizations_organization SET payfast_token='fictional-existing-token' WHERE id=$1",[org]);await assert.rejects(start());assert.equal(initializes,0);ok('existing recurring contract is not silently migrated');
 await reset();ref=await start();
 await db.query(`CREATE OR REPLACE FUNCTION cf_paystack_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional forced write failure'; END $$; CREATE TRIGGER paystack_fail BEFORE UPDATE ON organizations_organization FOR EACH ROW EXECUTE FUNCTION cf_paystack_fail()`);
 await assert.rejects(reconcilePaystack(db,env,ref,org));assert.equal((await db.query('SELECT status FROM cf_paystack_checkout WHERE reference=$1',[ref])).rows[0].status,'pending');assert.equal((await db.query('SELECT count(*)::int c FROM cf_paystack_entitlement')).rows[0].c,0);ok('storage failure rolls back both paid receipt and entitlement');
 await db.query('DROP TRIGGER paystack_fail ON organizations_organization; DROP FUNCTION cf_paystack_fail()');await reconcilePaystack(db,env,ref,org);ok('failed write recovers on retry');
 await db.query("UPDATE cf_paystack_checkout SET expires_at=now()-interval '1 second' WHERE reference=$1",[ref]);const second=await start();assert.notEqual(second,ref);await reconcilePaystack(db,env,second,org);assert.equal((await db.query("SELECT paid_until > now()+interval '50 days' extended FROM cf_paystack_entitlement")).rows[0].extended,true);ok('second paid month extends current entitlement');
 console.log(JSON.stringify({checks:proof.length,proof},null,2));
}finally{await db.query('DROP TRIGGER IF EXISTS paystack_fail ON organizations_organization').catch(()=>{});await db.query('DROP FUNCTION IF EXISTS cf_paystack_fail()').catch(()=>{});await db.end();}
