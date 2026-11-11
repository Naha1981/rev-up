// Database-only, exact persisted approval. No approval writer, transport, sends
// or automatic retry. Caller cannot supply actor/consent booleans as authority.
import type {Pool} from 'pg';
import {ingressFingerprint} from './authenticated-ingress';
export async function recoveryPayloadHash(payload:unknown):Promise<string>{
 const bytes=new TextEncoder().encode(JSON.stringify(payload));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function recoverDeadInbound(pool:Pool,workspaceId:string,jobId:string,approvalId:string):Promise<boolean>{
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const a=(await c.query('SELECT * FROM cf_inbound_recovery_approval WHERE id=$1 AND workspace_id=$2 AND job_id=$3 FOR UPDATE',[approvalId,workspaceId,jobId])).rows[0];
  if(!a||a.consumed_at){await c.query('ROLLBACK');return false;}
  const j=(await c.query('SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[jobId,workspaceId])).rows[0];
  if(!j||j.state!=='dead'||j.recovery_generation!==a.expected_generation||j.attempts!==a.expected_attempts||j.last_error_code!==a.expected_error||j.ingress_fingerprint!==a.ingress_fingerprint||await recoveryPayloadHash(j.payload)!==a.payload_sha256){await c.query('ROLLBACK');return false;}
  if(!['message.received','conversation.control_changed'].includes(j.payload?.event)){await c.query('ROLLBACK');return false;}
  const b=(await c.query('SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE',[j.ingress_endpoint_id])).rows[0];
  if(!b||!b.enabled||b.workspace_id!==workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint){await c.query('ROLLBACK');return false;}
  // A partially applied or completed effect must never be replayed by this path.
  const effects=(await c.query('SELECT 1 FROM cf_normalized_inbound WHERE job_id=$1 UNION ALL SELECT 1 FROM cf_handover_observation WHERE job_id=$1',[jobId])).rowCount;
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(effects||b.valid_until<=now||a.valid_until<=now){await c.query('ROLLBACK');return false;}
  await c.query(`INSERT INTO cf_inbound_recovery_audit(approval_id,workspace_id,job_id,actor_id,prior_generation,prior_attempts,prior_error) VALUES($1,$2,$3,$4,$5,$6,$7)`,[approvalId,workspaceId,jobId,a.actor_id,j.recovery_generation,j.attempts,j.last_error_code]);
  await c.query(`UPDATE cf_inbound_job SET state='received',recovery_generation=recovery_generation+1,attempts=0,available_at=clock_timestamp(),last_error_code='',lease_token=NULL,lease_until=NULL WHERE id=$1`,[jobId]);
  const used=await c.query(`UPDATE cf_inbound_recovery_approval SET consumed_at=clock_timestamp() WHERE id=$1 AND consumed_at IS NULL AND valid_until>clock_timestamp() AND $2::timestamptz>clock_timestamp() RETURNING id`,[approvalId,b.valid_until]);
  if(!used.rowCount){await c.query('ROLLBACK');return false;}
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
