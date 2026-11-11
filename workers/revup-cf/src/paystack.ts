import type {Pool} from 'pg';

export interface PaystackEnv { PAYSTACK_TEST_ORG_IDS?: string; PAYSTACK_ENABLED?: string; PAYSTACK_SECRET_KEY?: string; PAYSTACK_WEBHOOK_SECRET?: string; }
export const PAYSTACK_PRICES: Record<string,number> = {starter:49900,growth:99900,'business-pro':199900};
export function paystackReady(env:PaystackEnv):boolean {
  // Candidate deliberately supports test keys only. Live activation is a separate approved release.
  return env.PAYSTACK_ENABLED==='true' && /^sk_test_[A-Za-z0-9]+$/.test(env.PAYSTACK_SECRET_KEY||'');
}
export async function ensurePaystackTables(db:Pool):Promise<void>{
 await db.query(`CREATE TABLE IF NOT EXISTS cf_paystack_checkout (
 reference text PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations_organization(id),
 plan text NOT NULL, amount_cents integer NOT NULL, email text NOT NULL, mode text NOT NULL CHECK(mode='test'),
 status text NOT NULL DEFAULT 'pending', authorization_url text NOT NULL DEFAULT '',
 provider_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour')`);
 await db.query(`CREATE TABLE IF NOT EXISTS cf_paystack_entitlement (
 organization_id uuid PRIMARY KEY REFERENCES organizations_organization(id), plan text NOT NULL,
 paid_until timestamptz NOT NULL, last_reference text NOT NULL REFERENCES cf_paystack_checkout(reference),
 mode text NOT NULL CHECK(mode='test'))`);
}
export function testOrgAllowed(env:PaystackEnv,org:string):boolean{return (env.PAYSTACK_TEST_ORG_IDS||'').split(',').map(x=>x.trim()).includes(org);}
async function api(env:PaystackEnv,path:string,body?:any):Promise<any>{
 if(!paystackReady(env))throw new Error('Payment test configuration is not ready.');
 const r=await fetch('https://api.paystack.co'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Payment service could not complete the request.');
 const x:any=await r.json();if(x.status!==true||!x.data)throw new Error('Payment service did not confirm the request.');return x.data;
}
export function checkoutUrlSafe(raw:string):boolean{try{const u=new URL(raw);return u.protocol==='https:'&&u.hostname==='checkout.paystack.com'&&!u.username&&!u.password&&u.port==='';}catch{return false;}}
export async function initializePaystack(db:Pool,env:PaystackEnv,org:string,email:string,plan:string,base:string):Promise<string>{
 if(!paystackReady(env))throw new Error('Payment test configuration is not ready.');
 if(!testOrgAllowed(env,org))throw new Error('Only approved fictional test businesses may use this candidate.');
 const amount=Object.prototype.hasOwnProperty.call(PAYSTACK_PRICES,plan)?PAYSTACK_PRICES[plan]:0;if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Choose a valid plan.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('A valid account email is needed.');
 await ensurePaystackTables(db);
 const client=await db.connect();const ref='RU-PS-'+crypto.randomUUID().replace(/-/g,'');
 try{
  await client.query('BEGIN');
  const current=(await client.query(`SELECT * FROM organizations_organization WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[org])).rows[0];
  if(!current)throw new Error('Business not found.');
  if(current.payfast_token)throw new Error('An existing recurring payment must be reviewed before changing payment providers.');
  const entitlement=(await client.query(`SELECT plan,paid_until FROM cf_paystack_entitlement WHERE organization_id=$1 AND paid_until>now()`,[org])).rows[0];
  if(entitlement&&entitlement.plan!==plan)throw new Error('Keep the current plan until this paid month ends.');
  const previous=(await client.query(`SELECT authorization_url FROM cf_paystack_checkout WHERE organization_id=$1 AND plan=$2 AND email=$3 AND status='pending' AND expires_at>now() AND authorization_url<>'' ORDER BY created_at DESC LIMIT 1`,[org,plan,email])).rows[0];
  if(previous){await client.query('COMMIT');if(!checkoutUrlSafe(previous.authorization_url))throw new Error('Payment link was not safe.');return previous.authorization_url;}
  await client.query(`INSERT INTO cf_paystack_checkout(reference,organization_id,plan,amount_cents,email,mode) VALUES($1,$2,$3,$4,$5,'test')`,[ref,org,plan,amount,email]);
  const x=await api(env,'/transaction/initialize',{email,amount:String(amount),currency:'ZAR',reference:ref,channels:['card'],callback_url:base+'/billing/paystack/callback',metadata:{revup_reference:ref}});
  if(x.reference!==ref||!checkoutUrlSafe(x.authorization_url))throw new Error('Payment service returned an invalid checkout.');
  await client.query(`UPDATE cf_paystack_checkout SET authorization_url=$1 WHERE reference=$2`,[x.authorization_url,ref]);
  await client.query('COMMIT');return x.authorization_url;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
function equal(a:string,b:string):boolean{let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;}
async function mac(secret:string,body:Uint8Array):Promise<string>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-512'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,Uint8Array.from(body).buffer))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function validPaystackSignature(raw:Uint8Array,headers:Headers,env:PaystackEnv,now=Math.floor(Date.now()/1000)):Promise<boolean>{
 if(!paystackReady(env))return false;
 const modern=headers.get('paystack-signature');
 if(modern!==null){
  if(!env.PAYSTACK_WEBHOOK_SECRET?.startsWith('whsec_'))return false;
  let t:string|null=null;const sigs:string[]=[];
  for(const p of modern.split(',')){const i=p.indexOf('=');if(i<0)continue;const k=p.slice(0,i).trim(),v=p.slice(i+1).trim();if(k==='t'){if(t!==null||!/^\d+$/.test(v))return false;t=v;}else if(k==='v1'){const j=v.indexOf(':');if(j>0&&/^whk_/.test(v.slice(0,j))&&/^[a-f0-9]{128}$/.test(v.slice(j+1)))sigs.push(v.slice(j+1));}}
  if(t===null||!Number.isSafeInteger(Number(t))||Math.abs(now-Number(t))>300||!sigs.length)return false;
  const prefix=new TextEncoder().encode(t+'.'),signed=new Uint8Array(prefix.length+raw.length);signed.set(prefix);signed.set(raw,prefix.length);const expected=await mac(env.PAYSTACK_WEBHOOK_SECRET,signed);return sigs.some(s=>equal(s,expected));
 }
 // Legacy header is used only while no modern signing secret is configured.
 if(env.PAYSTACK_WEBHOOK_SECRET)return false;
 const legacy=headers.get('x-paystack-signature')||'';return /^[a-f0-9]{128}$/.test(legacy)&&equal(legacy,await mac(env.PAYSTACK_SECRET_KEY!,raw));
}
export function verifiedPaymentMatches(x:any,intent:any):boolean{
 return x?.status==='success'&&x.domain==='test'&&x.reference===intent.reference&&x.currency==='ZAR'&&Number.isSafeInteger(x.amount)&&x.amount===intent.amount_cents&&typeof x.customer?.email==='string'&&x.customer.email.toLowerCase()===intent.email.toLowerCase()&&((typeof x.id==='string'&&/^[0-9]+$/.test(x.id))||(typeof x.id==='number'&&Number.isSafeInteger(x.id)&&x.id>0))&&Number.isFinite(Date.parse(x.paid_at));
}
export async function reconcilePaystack(db:Pool,env:PaystackEnv,ref:string,org?:string):Promise<'paid'|'pending'|'failed'>{
 if(!/^RU-PS-[a-f0-9]{32}$/.test(ref))throw new Error('Unknown payment reference.');
 await ensurePaystackTables(db);
 const intent=(await db.query(`SELECT * FROM cf_paystack_checkout WHERE reference=$1`+(org?' AND organization_id=$2':''),org?[ref,org]:[ref])).rows[0];
 if(!intent)throw new Error('Unknown payment reference.');
 if(!testOrgAllowed(env,intent.organization_id))throw new Error('Only approved fictional test businesses may use this candidate.');
 if(intent.status==='paid')return 'paid';
 const x=await api(env,'/transaction/verify/'+encodeURIComponent(ref));
 if(x.status!=='success')return ['failed','abandoned','reversed'].includes(x.status)?'failed':'pending';
 if(!verifiedPaymentMatches(x,intent))throw new Error('Payment details did not match this checkout.');
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  // Lock order is always organization, then checkout, to avoid checkout/renewal deadlocks.
  const current=(await client.query(`SELECT id,payfast_token FROM organizations_organization WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`,[intent.organization_id])).rows[0];
  if(!current||current.payfast_token)throw new Error('Business payment state needs review.');
  const locked=(await client.query(`SELECT * FROM cf_paystack_checkout WHERE reference=$1 FOR UPDATE`,[ref])).rows[0];
  if(locked.status==='paid'){await client.query('COMMIT');return 'paid';}
  const existing=(await client.query(`SELECT plan FROM cf_paystack_entitlement WHERE organization_id=$1 AND paid_until>now()`,[intent.organization_id])).rows[0];
  if(existing&&existing.plan!==intent.plan)throw new Error('Plan changed while payment was pending; review required.');
  await client.query(`UPDATE cf_paystack_checkout SET status='paid',provider_id=$1,paid_at=$2 WHERE reference=$3`,[String(x.id),x.paid_at,ref]);
  await client.query(`INSERT INTO cf_paystack_entitlement(organization_id,plan,paid_until,last_reference,mode) VALUES($1,$2,now()+interval '1 month',$3,'test') ON CONFLICT(organization_id) DO UPDATE SET plan=EXCLUDED.plan,paid_until=GREATEST(now(),cf_paystack_entitlement.paid_until)+interval '1 month',last_reference=EXCLUDED.last_reference`,[intent.organization_id,intent.plan,ref]);
  await client.query(`UPDATE organizations_organization SET plan=$1,subscription_status='active',activated_at=COALESCE(activated_at,now()),updated_at=now() WHERE id=$2`,[intent.plan,intent.organization_id]);
  await client.query('COMMIT');return 'paid';
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function paystackWebhook(db:Pool,env:PaystackEnv,req:Request):Promise<Response>{
 const raw=new Uint8Array(await req.arrayBuffer());if(raw.byteLength>262144)return new Response('too large',{status:413});
 if(!await validPaystackSignature(raw,req.headers,env))return new Response('invalid signature',{status:401});
 let event:any;try{event=JSON.parse(new TextDecoder().decode(raw));}catch{return new Response('invalid JSON',{status:400});}
 if(event.event!=='charge.success'||!String(event.data?.reference||'').startsWith('RU-PS-'))return new Response('OK');
 try{await reconcilePaystack(db,env,String(event.data?.reference||''));return new Response('OK');}catch{return new Response('payment not reconciled',{status:503});}
}
export async function expirePaystackEntitlements(db:Pool,env:PaystackEnv):Promise<void>{
 if(!paystackReady(env))return;
 await ensurePaystackTables(db);
 await db.query(`UPDATE organizations_organization o SET subscription_status='expired',updated_at=now() FROM cf_paystack_entitlement e WHERE e.organization_id=o.id AND e.paid_until<=now() AND e.mode='test' AND o.subscription_status='active' AND o.payfast_token='' AND o.plan=e.plan AND o.id=ANY($1::uuid[])`,[(env.PAYSTACK_TEST_ORG_IDS||'').split(',').filter(Boolean)]);
}
