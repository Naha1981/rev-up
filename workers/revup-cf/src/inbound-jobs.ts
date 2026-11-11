// Only authenticated, exactly mapped events may enter this repository.
// No external calls, AI calls, or request-time DDL.
import type { Pool } from 'pg';
export async function receiveInbound(pool:Pool,event:{workspaceId:string;accountId:string;provider:string;eventId:string;payload:unknown;authenticated:boolean;tenantMapped:boolean}):Promise<string>{
 if(!event.authenticated||!event.tenantMapped)throw Error('unauthenticated_or_unmapped');
 if(!event.eventId||!event.accountId||!event.provider||event.eventId.length>512)throw Error('invalid_identity');
 const body=JSON.stringify(event.payload);if(!body||new TextEncoder().encode(body).length>32768)throw Error('payload_too_large');
 const r=await pool.query(`INSERT INTO cf_inbound_job(id,workspace_id,account_id,provider,event_id,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(provider,workspace_id,account_id,event_id) DO UPDATE SET event_id=cf_inbound_job.event_id RETURNING id`,[crypto.randomUUID(),event.workspaceId,event.accountId,event.provider,event.eventId,body]);return r.rows[0].id;
}
export async function claimInbound(pool:Pool,workspaceId:string,maxAttempts=5):Promise<any|null>{
 if(!Number.isInteger(maxAttempts)||maxAttempts<1)throw Error('invalid_attempt_limit');
 // Expired claims with exhausted retries are terminal, never silently stranded.
 await pool.query(`UPDATE cf_inbound_job SET state='dead',lease_token=NULL,lease_until=NULL,last_error_code='attempts_exhausted' WHERE workspace_id=$1 AND attempts>=$2 AND (state IN ('received','retry_wait') OR (state='processing' AND lease_until<=now()))`,[workspaceId,maxAttempts]);
 const r=await pool.query(`WITH candidate AS (SELECT id FROM cf_inbound_job WHERE workspace_id=$1 AND attempts<$2 AND ((state IN ('received','retry_wait') AND available_at<=now()) OR (state='processing' AND lease_until<=now())) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE cf_inbound_job j SET state='processing',attempts=attempts+1,lease_token=$3,lease_until=now()+interval '30 seconds' FROM candidate c WHERE j.id=c.id RETURNING j.*`,[workspaceId,maxAttempts,crypto.randomUUID()]);return r.rows[0]||null;
}
// Lock first, then evaluate wall-clock lease. SQL now() is transaction-start
// time, and a predicate evaluated before a row-lock wait is not a final fence.
export async function completeInbound(pool:Pool,workspaceId:string,id:string,lease:string):Promise<boolean>{
 return transitionInbound(pool,workspaceId,id,lease);
}
export async function failInbound(pool:Pool,workspaceId:string,id:string,lease:string,errorCode:string,maxAttempts=5):Promise<boolean>{
 if(!/^[a-z0-9_]{1,80}$/.test(errorCode))throw Error('invalid_error_code');
 if(!Number.isInteger(maxAttempts)||maxAttempts<1)throw Error('invalid_attempt_limit');
 return transitionInbound(pool,workspaceId,id,lease,errorCode,maxAttempts);
}
async function transitionInbound(pool:Pool,workspaceId:string,id:string,lease:string,errorCode?:string,maxAttempts=5):Promise<boolean>{
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const row=await c.query(`SELECT id FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[id,workspaceId]);
  if(!row.rowCount){await c.query('ROLLBACK');return false;}
  const r=errorCode===undefined?await c.query(`UPDATE cf_inbound_job SET state='completed',lease_token=NULL,lease_until=NULL,completed_at=clock_timestamp() WHERE id=$1 AND workspace_id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp()`,[id,workspaceId,lease]):await c.query(`UPDATE cf_inbound_job SET state=CASE WHEN attempts>=$5 THEN 'dead' ELSE 'retry_wait' END,available_at=clock_timestamp()+interval '30 seconds',last_error_code=$4,lease_token=NULL,lease_until=NULL WHERE id=$1 AND workspace_id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp()`,[id,workspaceId,lease,errorCode,maxAttempts]);
  await c.query('COMMIT');return !!r.rowCount;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

// Database-only effect callback. Never run AI, HTTP, email or external services
// inside this transaction. All effects use this exact client; never the pool.
export async function applyInboundEffects(pool:Pool,workspaceId:string,id:string,lease:string,effects:(client:import('pg').PoolClient)=>Promise<void>):Promise<boolean>{
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const owned=await c.query(`SELECT id FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp() FOR UPDATE`,[id,workspaceId,lease]);
  if(!owned.rowCount){await c.query('ROLLBACK');return false;}
  await effects(c);
  const done=await c.query(`UPDATE cf_inbound_job SET state='completed',lease_token=NULL,lease_until=NULL,completed_at=now() WHERE id=$1 AND workspace_id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp()`,[id,workspaceId,lease]);
  if(!done.rowCount){await c.query('ROLLBACK');return false;}
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
