// Isolated database-only durable receipt runner. Never sends or blind-retries.
import type {Pool} from 'pg';
import {ingressFingerprint} from './authenticated-ingress';
import {reduceReceiptOnClient,type ReceiptResult} from './delivery-receipts';
export async function processReceiptJob(pool:Pool,workspaceId:string,id:string,lease:string):Promise<ReceiptResult|'stale'|'held'> {
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const j=(await c.query(`SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp() FOR UPDATE`,[id,workspaceId,lease])).rows[0];
  if(!j){await c.query('ROLLBACK');return 'stale';}
  if(!j.ingress_endpoint_id||!j.ingress_channel_id||!j.ingress_fingerprint)throw Error('ingress_identity_missing');
  const b=(await c.query(`SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE`,[j.ingress_endpoint_id])).rows[0];
  if(!b||!b.enabled||b.workspace_id!==workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint)throw Error('ingress_remapped');
  const e=j.payload,kind=({'message.delivered':'delivered','message.read':'read','message.failed':'failed'} as const)[e.event as 'message.delivered'];
  if(!kind||typeof e.message?.id!=='string'||!e.message.id||e.message.id.length>512)throw Error('receipt_schema_invalid');
  const result=await reduceReceiptOnClient(c,{workspaceId,channelId:j.ingress_channel_id,provider:j.provider,accountId:j.account_id,eventId:j.event_id,providerMessageId:e.message.id,kind,authenticated:true,tenantMapped:true});
  if(result==='invalid')throw Error('receipt_identity_conflict');
  // Keep unmatched durable job retryable, preserving inbox evidence atomically.
  const retry=result==='retryable_unmatched';
  const done=await c.query(`UPDATE cf_inbound_job SET state=CASE WHEN $4 THEN 'retry_wait' ELSE 'completed' END,available_at=clock_timestamp()+interval '30 seconds',completed_at=CASE WHEN $4 THEN NULL ELSE clock_timestamp() END,last_error_code=CASE WHEN $4 THEN 'receipt_unmatched' ELSE '' END,lease_token=NULL,lease_until=NULL WHERE id=$1 AND workspace_id=$2 AND lease_token=$3 AND state='processing' AND lease_until>clock_timestamp() AND $5::timestamptz>clock_timestamp() RETURNING id`,[id,workspaceId,lease,retry,b.valid_until]);
  if(!done.rowCount){await c.query('ROLLBACK');return 'stale';}
  await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
