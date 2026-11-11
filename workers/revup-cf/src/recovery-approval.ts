// Isolated owner-confirmed recovery approval writer. Not routed or imported by
// live entry. No identity mapping, sends, resume or client approval booleans.
import type {Pool} from 'pg';
import {ingressFingerprint} from './authenticated-ingress';
import {recoveryPayloadHash} from './inbound-recovery';
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
export async function approveInboundRecovery(pool:Pool,request:Request,choice:{workspaceId:string;jobId:string;jobFingerprint:string},configuredOrigin:string):Promise<string|null>{
 // Configured origin is deployment configuration, never a header/body value.
 let origin:string;try{const u=new URL(configuredOrigin);if(u.protocol!=='https:'||u.origin!==configuredOrigin)return null;origin=u.origin;}catch{return null;}
 if(request.method!=='POST'||new URL(request.url).origin!==origin||request.headers.get('origin')!==origin)return null;
 const cookie=request.headers.get('cookie')||'',tokens=[...cookie.matchAll(/(?:^|;\s*)cf_session=([a-f0-9]{64})(?=;|$)/g)];if(tokens.length!==1||!/^[a-f0-9]{64}$/.test(choice.jobFingerprint))return null;
 const tokenHash=await sha(tokens[0][1]);
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const auth=(await c.query(`SELECT s.user_id,s.expires_at FROM cf_sessions s JOIN accounts_user u ON u.id=s.user_id JOIN members_workspace_membership m ON m.user_id=u.id JOIN workspaces_workspace w ON w.id=m.workspace_id JOIN organizations_organization o ON o.id=w.organization_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND u.is_active AND m.workspace_id=$2 AND m.workspace_role='owner' AND m.custom_role_id IS NULL AND NOT w.is_archived AND o.deleted_at IS NULL FOR SHARE OF s,u,m,w,o`,[tokenHash,choice.workspaceId])).rows[0];
  if(!auth){await c.query('ROLLBACK');return null;}
  const j=(await c.query('SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 FOR SHARE',[choice.jobId,choice.workspaceId])).rows[0];
  if(!j||j.state!=='dead'||!j.ingress_fingerprint||j.attempts<1||!['sender_identity_unresolved','conversation_identity_unresolved','inbound_evidence_expired','attempts_exhausted'].includes(j.last_error_code)||!['message.received','conversation.control_changed'].includes(j.payload?.event)||await ingressFingerprint(j)!==choice.jobFingerprint){await c.query('ROLLBACK');return null;}
  const b=(await c.query('SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE',[j.ingress_endpoint_id])).rows[0];
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(!b||!b.enabled||b.workspace_id!==choice.workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint||b.valid_until<=now||auth.expires_at<=now){await c.query('ROLLBACK');return null;}
  const id=crypto.randomUUID(),hash=await recoveryPayloadHash(j.payload);
  const r=await c.query(`INSERT INTO cf_inbound_recovery_approval(id,workspace_id,job_id,actor_id,evidence_ref,expected_generation,expected_attempts,expected_error,payload_sha256,ingress_fingerprint,valid_until) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,LEAST(clock_timestamp()+interval '5 minutes',$11::timestamptz,$12::timestamptz) WHERE $11::timestamptz>clock_timestamp() AND $12::timestamptz>clock_timestamp() RETURNING id`,[id,choice.workspaceId,choice.jobId,auth.user_id,'owner_recovery:'+choice.jobFingerprint,j.recovery_generation,j.attempts,j.last_error_code,hash,j.ingress_fingerprint,auth.expires_at,b.valid_until]);
  if(!r.rowCount){await c.query('ROLLBACK');return null;}
  await c.query('COMMIT');return id;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
