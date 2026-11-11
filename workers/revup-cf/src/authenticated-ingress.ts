// No route imports this adapter. No registration/provider calls or global secret.
// Zernio contract: raw-body HMAC-SHA256, account.accountId, stable event id.
import type {Pool} from 'pg';
import {decryptTenantKey,type TenantCryptoEnv} from './tenant-crypto';
export async function authenticRawBody(raw:Uint8Array,signature:string,secret:string):Promise<boolean>{
 if(!secret||!raw.byteLength||raw.byteLength>32768||!/^[a-f0-9]{64}$/.test(signature))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16));
 return crypto.subtle.verify('HMAC',key,bytes,raw);
}
const identifier=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=512;
export async function receiveSignedIngress(pool:Pool,input:{endpointId:string;raw:Uint8Array;signature:string;eventHeader:string;eventIdHeader:string},env:TenantCryptoEnv):Promise<{jobId:string;workspaceId:string;channelId:string;event:string}|null>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.endpointId)||input.raw.byteLength>32768)return null;
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const binding=(await c.query(`SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE`,[input.endpointId])).rows[0];
  if(!binding||!binding.enabled){await c.query('ROLLBACK');return null;}
  let secret:string;try{secret=await decryptTenantKey(binding.encrypted_secret,env);}catch{await c.query('ROLLBACK');return null;}
  if(!await authenticRawBody(input.raw,input.signature,secret)){await c.query('ROLLBACK');return null;}
  let e:any;try{e=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(input.raw));}catch{await c.query('ROLLBACK');return null;}
  const events=['message.received','message.delivered','message.read','message.failed'];
  // No payload flags may establish authentication, routing, user approval or consent.
  if(!e||typeof e!=='object'||Array.isArray(e)||e.test!==undefined||!identifier(e.id)||e.id!==input.eventIdHeader||e.event!==input.eventHeader||!events.includes(e.event)||!identifier(e.account?.accountId)||e.account.accountId!==binding.account_id||e.account.profileId!==binding.profile_id||(e.account.id!==undefined&&e.account.id!==binding.account_id)||!identifier(e.message?.id)) {await c.query('ROLLBACK');return null;}
  if(e.event==='message.received'&&(e.message.direction!=='incoming'||!identifier(e.message.conversationId))){await c.query('ROLLBACK');return null;}
  // A provider timestamp is retained as a claim only, not a permission/window.
  // Wall-clock expiry after signature work and row-lock wait, immediately at insert.
  const r=await c.query(`INSERT INTO cf_inbound_job(id,workspace_id,account_id,provider,event_id,payload) SELECT $1,$2,$3,$4,$5,$6 WHERE $7::timestamptz>clock_timestamp() ON CONFLICT(provider,workspace_id,account_id,event_id) DO UPDATE SET event_id=cf_inbound_job.event_id RETURNING id,payload`,[crypto.randomUUID(),binding.workspace_id,binding.account_id,binding.provider,e.id,JSON.stringify(e),binding.valid_until]);
  if(!r.rows[0]||JSON.stringify(r.rows[0].payload)!==JSON.stringify(e)){
   // PostgreSQL jsonb key order differs, compare canonical recursively below.
   if(!r.rows[0]||canonical(r.rows[0].payload)!==canonical(e)){await c.query('ROLLBACK');return null;}
  }
  await c.query('COMMIT');return{jobId:r.rows[0].id,workspaceId:binding.workspace_id,channelId:binding.channel_id,event:e.event};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
function canonical(x:any):string{return x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
