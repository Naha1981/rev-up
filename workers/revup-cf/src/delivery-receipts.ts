import type {Pool,PoolClient} from 'pg';
type Receipt={channelId:string;workspaceId:string;provider:string;accountId:string;eventId:string;providerMessageId:string;kind:'delivered'|'read'|'failed';authenticated:boolean;tenantMapped:boolean};
export type ReceiptResult='invalid'|'duplicate'|'retryable_unmatched'|'reconciled';
async function messageLock(c:PoolClient,w:string,p:string,a:string,id:string){await c.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[JSON.stringify([w,p,a,id])]);}
async function reconcile(c:PoolClient,row:any,m:any):Promise<void>{
 if(!row.channel_id||row.channel_id!==m.channel_id)throw Error('receipt_channel_mismatch');
 const receipt=await c.query(`INSERT INTO cf_delivery_receipt(id,workspace_id,provider,account_id,event_id,message_id,kind,channel_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,[crypto.randomUUID(),row.workspace_id,row.provider,row.account_id,row.event_id,m.id,row.kind,row.channel_id]);
 if(receipt.rowCount){
  const current=(await c.query(`SELECT state FROM cf_outbound_message WHERE id=$1 AND workspace_id=$2 FOR UPDATE`,[m.id,row.workspace_id])).rows[0].state;
  const rank:Record<string,number>={provider_accepted:1,unknown:1,failed:1,delivered:2,read:3};
  if(current in rank&&((row.kind==='failed'&&rank[current]===1)||(row.kind!=='failed'&&rank[row.kind]>rank[current])))await c.query(`UPDATE cf_outbound_message SET state=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3`,[row.kind,m.id,row.workspace_id]);
 }
 await c.query(`UPDATE cf_unmatched_receipt SET state='reconciled',updated_at=now() WHERE id=$1`,[row.id]);
}
// Exact consumed start ownership + independently mapped provider account only.
export async function settleProviderStart(pool:Pool,input:{workspaceId:string;messageId:string;attemptId:string;startToken:string;provider:string;accountId:string;outcome:'accepted'|'unknown'|'failed';providerMessageId?:string}):Promise<boolean>{
 if(!['accepted','unknown','failed'].includes(input.outcome)||(input.outcome==='accepted'&&!input.providerMessageId))return false;
 const c=await pool.connect();try{
  await c.query('BEGIN');
  if(input.outcome==='accepted')await messageLock(c,input.workspaceId,input.provider,input.accountId,input.providerMessageId!);
  const r=await c.query(`UPDATE cf_outbound_message SET state=$1,provider_message_id=CASE WHEN $1='provider_accepted' THEN $2 ELSE provider_message_id END,hold_reason=CASE WHEN $1='unknown' THEN 'provider_outcome_unverified' ELSE '' END,updated_at=now() WHERE id=$3 AND workspace_id=$4 AND attempt_id=$5 AND start_token=$6 AND provider=$7 AND account_id=$8 AND state IN ('dispatching','unknown') RETURNING id,channel_id`,[input.outcome==='accepted'?'provider_accepted':input.outcome,input.providerMessageId||null,input.messageId,input.workspaceId,input.attemptId,input.startToken,input.provider,input.accountId]);
  if(!r.rowCount){await c.query('ROLLBACK');return false;}
  await c.query(`UPDATE cf_outbound_attempt SET result=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3`,[input.outcome==='accepted'?'provider_accepted':input.outcome,input.attemptId,input.workspaceId]);
  if(input.outcome==='accepted'){
   const pending=await c.query(`SELECT * FROM cf_unmatched_receipt WHERE workspace_id=$1 AND provider=$2 AND account_id=$3 AND provider_message_id=$4 AND state IN ('unmatched','held') ORDER BY created_at,id FOR UPDATE`,[input.workspaceId,input.provider,input.accountId,input.providerMessageId]);
   for(const row of pending.rows){if(row.channel_id===r.rows[0].channel_id)await reconcile(c,row,r.rows[0]);else await c.query("UPDATE cf_unmatched_receipt SET state='held',updated_at=now() WHERE id=$1",[row.id]);}
  }
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
// Internal authenticated/mapped facts only. Never use HTTP body flags as proof.
// retryable_unmatched MUST NOT complete its durable inbound job. Back off/retry
// or hold it; the receipt inbox also persists it across loss of the response.
export async function reduceDeliveryReceipt(pool:Pool,input:Receipt):Promise<ReceiptResult>{
 if(!input.channelId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.channelId)||!input.authenticated||!input.tenantMapped||![input.provider,input.accountId,input.eventId,input.providerMessageId].every(x=>typeof x==='string'&&x.length>0&&x.length<=512)||!['delivered','read','failed'].includes(input.kind))return 'invalid';
 const c=await pool.connect();try{
  await c.query('BEGIN');const result=await reduceReceiptOnClient(c,input);await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function reduceReceiptOnClient(c:PoolClient,input:Receipt):Promise<ReceiptResult>{
 if(!input.channelId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input.channelId)||!input.authenticated||!input.tenantMapped||![input.provider,input.accountId,input.eventId,input.providerMessageId].every(x=>typeof x==='string'&&x.length>0&&x.length<=512)||!['delivered','read','failed'].includes(input.kind))return 'invalid';
 await messageLock(c,input.workspaceId,input.provider,input.accountId,input.providerMessageId);
  const inbox=await c.query(`INSERT INTO cf_unmatched_receipt(id,workspace_id,provider,account_id,event_id,provider_message_id,kind,channel_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(workspace_id,provider,account_id,event_id) DO UPDATE SET attempts=cf_unmatched_receipt.attempts+1,updated_at=now() RETURNING *`,[crypto.randomUUID(),input.workspaceId,input.provider,input.accountId,input.eventId,input.providerMessageId,input.kind,input.channelId]);const row=inbox.rows[0];
  if(row.channel_id!==input.channelId||row.provider_message_id!==input.providerMessageId||row.kind!==input.kind){return 'invalid';}
  if(row.state==='reconciled'){return 'duplicate';}
  const found=await c.query(`SELECT id,state,channel_id FROM cf_outbound_message WHERE workspace_id=$1 AND provider=$2 AND account_id=$3 AND provider_message_id=$4 FOR UPDATE`,[input.workspaceId,input.provider,input.accountId,input.providerMessageId]);
  if(!found.rows[0]){return 'retryable_unmatched';}
  if(found.rows[0].channel_id!==input.channelId){await c.query("UPDATE cf_unmatched_receipt SET state='held',updated_at=now() WHERE id=$1",[row.id]);return 'retryable_unmatched';}
  await reconcile(c,row,found.rows[0]);return 'reconciled';
}
export async function holdUnmatchedReceipts(pool:Pool,workspaceId:string,ageSeconds=300):Promise<number>{
 if(!Number.isInteger(ageSeconds)||ageSeconds<60)throw Error('invalid_hold_age');
 const r=await pool.query(`UPDATE cf_unmatched_receipt SET state='held',updated_at=now() WHERE workspace_id=$1 AND state='unmatched' AND created_at<clock_timestamp()-($2*interval '1 second') RETURNING id`,[workspaceId,ageSeconds]);return r.rowCount||0;
 // Future monitored adapter must alert on held count/oldest age; no route is wired.
}
