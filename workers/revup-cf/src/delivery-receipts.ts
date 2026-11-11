import type {Pool} from 'pg';
// A successful HTTP status alone is insufficient. A future provider adapter
// must validate exact binding and real message ID before calling this reducer.
export async function settleProviderStart(pool:Pool,input:{workspaceId:string;messageId:string;attemptId:string;startToken:string;provider:string;accountId:string;outcome:'accepted'|'unknown'|'failed';providerMessageId?:string}):Promise<boolean>{
 if(input.outcome==='accepted'&&!input.providerMessageId)return false;
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const r=await c.query(`UPDATE cf_outbound_message SET state=$1,provider_message_id=CASE WHEN $1='provider_accepted' THEN $2 ELSE provider_message_id END,hold_reason=CASE WHEN $1='unknown' THEN 'provider_outcome_unverified' ELSE '' END,updated_at=now() WHERE id=$3 AND workspace_id=$4 AND attempt_id=$5 AND start_token=$6 AND provider=$7 AND account_id=$8 AND state IN ('dispatching','unknown') RETURNING id`,[input.outcome==='accepted'?'provider_accepted':input.outcome,input.providerMessageId||null,input.messageId,input.workspaceId,input.attemptId,input.startToken,input.provider,input.accountId]);
  if(!r.rowCount){await c.query('ROLLBACK');return false;}
  await c.query(`UPDATE cf_outbound_attempt SET result=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3`,[input.outcome==='accepted'?'provider_accepted':input.outcome,input.attemptId,input.workspaceId]);
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
// Authenticated means a trusted raw-signature/account adapter verified the event.
// Never bind this flag directly to an HTTP request field. No route uses it yet.
export async function reduceDeliveryReceipt(pool:Pool,input:{workspaceId:string;provider:string;accountId:string;eventId:string;providerMessageId:string;kind:'delivered'|'read'|'failed';authenticated:boolean;tenantMapped:boolean}):Promise<boolean>{
 if(!input.authenticated||!input.tenantMapped||!input.eventId||!['delivered','read','failed'].includes(input.kind))return false;
 const c=await pool.connect();try{
  await c.query('BEGIN');
  const found=await c.query(`SELECT id,state FROM cf_outbound_message WHERE workspace_id=$1 AND provider=$2 AND account_id=$3 AND provider_message_id=$4 FOR UPDATE`,[input.workspaceId,input.provider,input.accountId,input.providerMessageId]);
  const m=found.rows[0];if(!m){await c.query('ROLLBACK');return false;}
  const receipt=await c.query(`INSERT INTO cf_delivery_receipt(id,workspace_id,provider,account_id,event_id,message_id,kind) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id`,[crypto.randomUUID(),input.workspaceId,input.provider,input.accountId,input.eventId,m.id,input.kind]);
  if(!receipt.rowCount){await c.query('COMMIT');return false;}
  const rank:Record<string,number>={provider_accepted:1,unknown:1,failed:1,delivered:2,read:3};
  const next=input.kind;
  if(['provider_accepted','unknown','failed','delivered','read'].includes(m.state)&&((next==='failed'&&rank[m.state]===1)||(next!=='failed'&&rank[next]>rank[m.state])))await c.query(`UPDATE cf_outbound_message SET state=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3`,[next,m.id,input.workspaceId]);
  // Cancelled/held/queued messages never resurrect from a receipt.
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
