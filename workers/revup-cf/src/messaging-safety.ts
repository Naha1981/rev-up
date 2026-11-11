// Safety foundation only. No route imports or provider adapter in this slice.
// A reserved/in-flight attempt may finish after STOP. No recall guarantee.
import type { Pool, PoolClient } from 'pg';
import {loadDispatchPolicy} from './dispatch-policy';
import { decryptTenantKey, type TenantCryptoEnv } from './tenant-crypto';
export type Scope={workspaceId:string;contactId:string;channelId:string};
export type Eligibility={tenantMatches:boolean;credentialReady:boolean;permission:'allowed'|'denied'|'unknown';approvalRequired:boolean;approved:boolean;lastInboundAt:number|null;templateApproved:boolean;templateBound:boolean;now:number};
export function eligibilityReason(e:Eligibility):string {
 if(!e.tenantMatches)return 'tenant_mismatch';
 if(!e.credentialReady)return 'credential_unavailable';
 if(e.permission!=='allowed')return 'permission_missing';
 if(e.approvalRequired&&!e.approved)return 'approval_missing';
 if(!Number.isFinite(e.now))return 'invalid_clock';
 const inside=e.lastInboundAt!==null&&Number.isFinite(e.lastInboundAt)&&e.lastInboundAt<=e.now&&e.now-e.lastInboundAt<24*60*60*1000;
 if(!inside&&!(e.templateApproved&&e.templateBound))return 'template_required';
 return '';
}
export async function resolveCredential(connection:{workspace_id:string;account_id:string;status:string;api_key:string}|null,workspaceId:string,accountId:string,env:TenantCryptoEnv):Promise<string>{
 if(!connection||connection.workspace_id!==workspaceId||connection.account_id!==accountId||connection.status!=='connected'||!connection.api_key)throw Error('credential_unavailable');
 return decryptTenantKey(connection.api_key,env); // No global/plaintext fallback.
}
async function tx<T>(pool:Pool,f:(c:PoolClient)=>Promise<T>):Promise<T>{
 const c=await pool.connect();try{await c.query('BEGIN');const value=await f(c);await c.query('COMMIT');return value;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
const scopeValues=(s:Scope)=>[s.workspaceId,s.contactId,s.channelId];
export async function pauseConversation(pool:Pool,s:Scope,reason:string,suppress=false):Promise<void>{
 await tx(pool,async c=>{
  if(suppress)await c.query(`INSERT INTO cf_contact_suppression(workspace_id,contact_id,suppressed,reason) VALUES($1,$2,true,$3) ON CONFLICT(workspace_id,contact_id) DO UPDATE SET suppressed=true,version=cf_contact_suppression.version+1,reason=EXCLUDED.reason,updated_at=now()`,[s.workspaceId,s.contactId,reason]);
  const r=await c.query(`INSERT INTO cf_conversation_control(workspace_id,contact_id,channel_id,state,suppressed,reason) VALUES($1,$2,$3,'paused',$4,$5) ON CONFLICT(workspace_id,contact_id,channel_id) DO UPDATE SET state='paused',suppressed=cf_conversation_control.suppressed OR EXCLUDED.suppressed,reason=EXCLUDED.reason,version=cf_conversation_control.version+1,updated_at=now() RETURNING version`,[...scopeValues(s),suppress,reason]);
  await c.query(`INSERT INTO cf_control_audit(id,workspace_id,contact_id,channel_id,action,reason,version) VALUES($1,$2,$3,$4,$5,$6,$7)`,[crypto.randomUUID(),...scopeValues(s),suppress?'stop':'pause',reason,r.rows[0].version]);
 });
}
// Callers must authenticate owner/manager authority before invoking. STOP cannot
// be undone by resume; a future separately evidenced re-consent flow is required.
export async function resumeConversation(pool:Pool,s:Scope,actorId:string,authorized:boolean):Promise<boolean>{
 if(!authorized||!actorId)throw Error('resume_forbidden');
 return tx(pool,async c=>{
  const global=await c.query(`SELECT suppressed FROM cf_contact_suppression WHERE workspace_id=$1 AND contact_id=$2 FOR UPDATE`,[s.workspaceId,s.contactId]);if(global.rows[0]?.suppressed)return false;
  const r=await c.query(`UPDATE cf_conversation_control SET state='active',reason='',version=version+1,updated_at=now() WHERE workspace_id=$1 AND contact_id=$2 AND channel_id=$3 AND NOT suppressed RETURNING version`,scopeValues(s));
  if(!r.rowCount)return false;
  await c.query(`INSERT INTO cf_control_audit(id,workspace_id,contact_id,channel_id,actor_id,action,reason,version) VALUES($1,$2,$3,$4,$5,'resume','explicit_authorized_resume',$6)`,[crypto.randomUUID(),...scopeValues(s),actorId,r.rows[0].version]);return true;
 });
}
export type Budget={bucket:string;periodStart:string;limit:number};
export async function reserveDispatch(pool:Pool,s:Scope,messageId:string,e:Eligibility,budget:Budget){
 return reserveDispatchBudgets(pool,s,messageId,e,[budget]);
}
export async function reserveDispatchBudgets(pool:Pool,s:Scope,messageId:string,e:Eligibility,input:Budget[]){return reserveInternal(pool,s,messageId,e,input);}
export async function reserveDispatchFromPolicy(pool:Pool,s:Scope,messageId:string,env:TenantCryptoEnv){return reserveInternal(pool,s,messageId,null,[],env);}
async function reserveInternal(pool:Pool,s:Scope,messageId:string,e:Eligibility|null,input:Budget[],policyEnv?:TenantCryptoEnv):Promise<{ok:boolean;reason:string;attemptId?:string;version?:string}>{
 const reason=e?eligibilityReason(e):'';if(reason)return{ok:false,reason};
 if(!policyEnv&&(!input.length||input.length>8||input.some(b=>!b.bucket||!Number.isInteger(b.limit)||b.limit<0||!Number.isFinite(Date.parse(b.periodStart)))))return{ok:false,reason:'invalid_budget'};
 let budgets=input.map(b=>({...b,periodStart:new Date(b.periodStart).toISOString()})).sort((a,b)=>(a.bucket+a.periodStart).localeCompare(b.bucket+b.periodStart));
 if(new Set(budgets.map(b=>JSON.stringify([b.bucket,b.periodStart]))).size!==budgets.length)return{ok:false,reason:'duplicate_budget'};
 return tx(pool,async c=>{
  // Global first, then conversation, message, sorted budget rows everywhere.
  await c.query(`INSERT INTO cf_contact_suppression(workspace_id,contact_id,suppressed) VALUES($1,$2,false) ON CONFLICT DO NOTHING`,[s.workspaceId,s.contactId]);
  const global=await c.query(`SELECT suppressed FROM cf_contact_suppression WHERE workspace_id=$1 AND contact_id=$2 FOR UPDATE`,[s.workspaceId,s.contactId]);
  if(global.rows[0].suppressed)return{ok:false,reason:'globally_suppressed'};
  const q=await c.query(`SELECT state,suppressed,version FROM cf_conversation_control WHERE workspace_id=$1 AND contact_id=$2 AND channel_id=$3 FOR UPDATE`,scopeValues(s));const ctrl=q.rows[0];
  if(!ctrl||ctrl.state!=='active'||ctrl.suppressed)return{ok:false,reason:'paused_or_suppressed'};
  const m=await c.query(`SELECT * FROM cf_outbound_message WHERE id=$1 AND workspace_id=$2 AND contact_id=$3 AND channel_id=$4 FOR UPDATE`,[messageId,...scopeValues(s)]);const message=m.rows[0];
  if(!message||!['approved','queued'].includes(message.state)||!message.approved_by||!message.approved_at)return{ok:false,reason:'not_dispatchable'};
  if(!policyEnv&&(await c.query(`SELECT 1 FROM cf_workspace_dispatch_policy WHERE workspace_id=$1 FOR SHARE`,[s.workspaceId])).rowCount)return{ok:false,reason:'persisted_policy_required'};
  let policyVersion:string|null=null,credentialVersion:string|null=null,policyFingerprint:string|null=null;
  if(policyEnv){const policy=await loadDispatchPolicy(c,s,message,policyEnv);if(policy.reason||!policy.eligibility)return{ok:false,reason:policy.reason||'policy_unavailable'};const denied=eligibilityReason(policy.eligibility);if(denied)return{ok:false,reason:denied};budgets=policy.budgets.sort((a,b)=>(a.bucket+a.periodStart).localeCompare(b.bucket+b.periodStart));policyVersion=policy.policyVersion;credentialVersion=policy.credentialVersion;policyFingerprint=policy.fingerprint;}
  let exhausted=false;
  for(const b of budgets){
   const r=await c.query(`INSERT INTO cf_send_budget(workspace_id,bucket,period_start,limit_count) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id,bucket,period_start) DO UPDATE SET limit_count=LEAST(cf_send_budget.limit_count,EXCLUDED.limit_count) RETURNING reserved,limit_count`,[s.workspaceId,b.bucket,b.periodStart,b.limit]);
   if(r.rows[0].reserved>=r.rows[0].limit_count)exhausted=true;
  }
  // Tightening is durable even on denial; no bucket gets charged if any is full.
  if(exhausted)return{ok:false,reason:'budget_exhausted'};
  const attemptId=crypto.randomUUID();
  await c.query(`UPDATE cf_outbound_message SET state='dispatching',attempt_id=$1,reserved_at=now(),lease_until=now()+interval '5 seconds',control_version=$2,policy_version=$4,credential_version=$5,policy_fingerprint=$6,updated_at=now() WHERE id=$3`,[attemptId,ctrl.version,messageId,policyVersion,credentialVersion,policyFingerprint]);
  await c.query(`INSERT INTO cf_outbound_attempt(id,workspace_id,message_id,result) VALUES($1,$2,$3,'reserved')`,[attemptId,s.workspaceId,messageId]);
  for(const b of budgets){
   await c.query(`UPDATE cf_send_budget SET reserved=reserved+1 WHERE workspace_id=$1 AND bucket=$2 AND period_start=$3`,[s.workspaceId,b.bucket,b.periodStart]);
   await c.query(`INSERT INTO cf_budget_reservation(attempt_id,workspace_id,bucket,period_start) VALUES($1,$2,$3,$4)`,[attemptId,s.workspaceId,b.bucket,b.periodStart]);
  }
  return{ok:true,reason:'',attemptId,version:String(ctrl.version)};
 });
}
export async function canBeginReservedAttempt(pool:Pool,s:Scope,messageId:string,attemptId:string):Promise<boolean>{
 const r=await pool.query(`SELECT 1 FROM cf_outbound_message m JOIN cf_conversation_control c USING(workspace_id,contact_id,channel_id) JOIN cf_contact_suppression g USING(workspace_id,contact_id) WHERE m.id=$1 AND m.workspace_id=$2 AND m.contact_id=$3 AND m.channel_id=$4 AND m.attempt_id=$5 AND m.state='dispatching' AND m.provider_started_at IS NULL AND m.lease_until>clock_timestamp() AND NOT g.suppressed AND c.state='active' AND NOT c.suppressed AND c.version=m.control_version`,[messageId,...scopeValues(s),attemptId]);
 return !!r.rowCount; // Diagnostic only, never grants a provider-start right.
}
// Consuming start fence: exactly one caller can obtain a start token. The
// caller must not send if this returns null. A lost response is UNKNOWN, not
// permission to retry. The token is needed by the future outcome reducer.
export async function claimProviderStart(pool:Pool,s:Scope,messageId:string,attemptId:string):Promise<string|null>{return startInternal(pool,s,messageId,attemptId);}
export async function claimProviderStartFromPolicy(pool:Pool,s:Scope,messageId:string,attemptId:string,env:TenantCryptoEnv):Promise<string|null>{return startInternal(pool,s,messageId,attemptId,env);}
async function startInternal(pool:Pool,s:Scope,messageId:string,attemptId:string,policyEnv?:TenantCryptoEnv):Promise<string|null>{
 return tx(pool,async c=>{
  const global=await c.query(`SELECT suppressed FROM cf_contact_suppression WHERE workspace_id=$1 AND contact_id=$2 FOR UPDATE`,[s.workspaceId,s.contactId]);if(!global.rows[0]||global.rows[0].suppressed)return null;
  const ctrl=await c.query(`SELECT state,suppressed,version FROM cf_conversation_control WHERE workspace_id=$1 AND contact_id=$2 AND channel_id=$3 FOR UPDATE`,scopeValues(s));
  if(!ctrl.rows[0]||ctrl.rows[0].state!=='active'||ctrl.rows[0].suppressed)return null;
  const m=(await c.query(`SELECT * FROM cf_outbound_message WHERE id=$1 AND workspace_id=$2 AND contact_id=$3 AND channel_id=$4 FOR UPDATE`,[messageId,...scopeValues(s)])).rows[0];if(!m)return null;
  if(!policyEnv&&(m.policy_version||(await c.query(`SELECT 1 FROM cf_workspace_dispatch_policy WHERE workspace_id=$1 FOR SHARE`,[s.workspaceId])).rowCount))return null;
  let validUntil:number|null=null;
  if(policyEnv){if(!m.policy_version||!m.credential_version)return null;const p=await loadDispatchPolicy(c,s,m,policyEnv);if(p.reason||!p.eligibility||eligibilityReason(p.eligibility)||String(m.policy_version)!==p.policyVersion||String(m.credential_version)!==p.credentialVersion||m.policy_fingerprint!==p.fingerprint)return null;validUntil=p.validUntil;}
  const token=crypto.randomUUID();
  const r=await c.query(`WITH wall AS MATERIALIZED (SELECT clock_timestamp() AS t) UPDATE cf_outbound_message m SET provider_started_at=wall.t,start_token=$6,updated_at=wall.t FROM wall WHERE m.id=$1 AND m.workspace_id=$2 AND m.contact_id=$3 AND m.channel_id=$4 AND m.attempt_id=$5 AND m.state='dispatching' AND m.provider_started_at IS NULL AND m.lease_until>wall.t AND m.control_version=$7 AND ($8::timestamptz IS NULL OR wall.t<$8::timestamptz) AND NOT EXISTS (SELECT 1 FROM cf_budget_reservation b WHERE b.attempt_id=m.attempt_id AND (b.bucket NOT IN ('hour','day','month') OR b.period_start<>(date_trunc(b.bucket,wall.t AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))) RETURNING m.id`,[messageId,...scopeValues(s),attemptId,token,ctrl.rows[0].version,validUntil?new Date(validUntil).toISOString():null]);
  return r.rowCount?token:null;
 });
}
export async function expireDispatches(pool:Pool,workspaceId:string):Promise<number>{
 return tx(pool,async c=>{
  const r=await c.query(`UPDATE cf_outbound_message SET state='unknown',hold_reason='reservation_expired_outcome_unverified',updated_at=now() WHERE workspace_id=$1 AND state='dispatching' AND lease_until<=clock_timestamp() RETURNING attempt_id`,[workspaceId]);
  for(const row of r.rows)await c.query(`UPDATE cf_outbound_attempt SET result='unknown',error_code='reservation_expired_outcome_unverified',updated_at=now() WHERE id=$1 AND workspace_id=$2`,[row.attempt_id,workspaceId]);return r.rowCount||0;
 });
}
