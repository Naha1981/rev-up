// Isolated owner-confirmed mapping from a signed durable message. No routing,
// automatic mapping, identity merges, sends, resume or permission grants.
import type {Pool} from 'pg';
import {ingressFingerprint} from './authenticated-ingress';
import {senderAnchor} from './normalized-inbound';
import {pauseConversationOnClient} from './messaging-safety';
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
export async function confirmInboundIdentity(pool:Pool,request:Request,choice:{workspaceId:string;jobId:string;jobFingerprint:string;contactId:string},configuredOrigin:string):Promise<boolean>{
 // Configured origin is deployment configuration, never a header/body value.
 let origin:string;try{const u=new URL(configuredOrigin);if(u.protocol!=='https:'||u.origin!==configuredOrigin)return false;origin=u.origin;}catch{return false;}
 if(request.method!=='POST'||new URL(request.url).origin!==origin||request.headers.get('origin')!==origin)return false;
 const cookie=request.headers.get('cookie')||'',tokens=[...cookie.matchAll(/(?:^|;\s*)cf_session=([a-f0-9]{64})(?=;|$)/g)];if(tokens.length!==1||!/^[a-f0-9]{64}$/.test(choice.jobFingerprint))return false;
 const tokenHash=await sha(tokens[0][1]);
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const auth=(await c.query(`SELECT s.user_id,s.expires_at FROM cf_sessions s JOIN accounts_user u ON u.id=s.user_id JOIN members_workspace_membership m ON m.user_id=u.id JOIN workspaces_workspace w ON w.id=m.workspace_id JOIN organizations_organization o ON o.id=w.organization_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND u.is_active AND m.workspace_id=$2 AND m.workspace_role='owner' AND m.custom_role_id IS NULL AND NOT w.is_archived AND o.deleted_at IS NULL FOR SHARE OF s,u,m,w,o`,[tokenHash,choice.workspaceId])).rows[0];
  if(!auth){await c.query('ROLLBACK');return false;}
  const j=(await c.query('SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2 FOR SHARE',[choice.jobId,choice.workspaceId])).rows[0];
  if(!j||j.state!=='dead'||!j.ingress_fingerprint||j.attempts<1||!['sender_identity_unresolved','conversation_identity_unresolved','inbound_evidence_expired','attempts_exhausted'].includes(j.last_error_code)||!['message.received','conversation.control_changed'].includes(j.payload?.event)||await ingressFingerprint(j)!==choice.jobFingerprint){await c.query('ROLLBACK');return false;}
  const b=(await c.query('SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE',[j.ingress_endpoint_id])).rows[0];
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(!b||!b.enabled||b.workspace_id!==choice.workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint||b.valid_until<=now||auth.expires_at<=now){await c.query('ROLLBACK');return false;}
  const contact=(await c.query('SELECT * FROM receptionist_contact WHERE id=$1 AND workspace_id=$2 FOR SHARE',[choice.contactId,choice.workspaceId])).rows[0];
  const e=j.payload,anchor=e.event==='message.received'?senderAnchor(e):null;
  const conversationId=e.event==='message.received'?e.message?.conversationId:e.conversation?.id;
  if(!contact||!anchor||typeof conversationId!=='string'||!conversationId||conversationId.length>512){await c.query('ROLLBACK');return false;}
  // Serialize all mapping decisions in a tenant. Never overwrite, renew, merge,
  // or silently remap an existing sender or conversation, even if expired.
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['identity-map:'+choice.workspaceId]);
  const existing=await c.query(`SELECT 1 FROM cf_sender_identity WHERE workspace_id=$1 AND channel_id=$2 AND provider=$3 AND account_id=$4 AND platform=$5 AND identity_kind=$6 AND identity_key=$7 UNION ALL SELECT 1 FROM cf_provider_conversation_identity WHERE workspace_id=$1 AND channel_id=$2 AND provider=$3 AND account_id=$4 AND conversation_id=$8`,[choice.workspaceId,j.ingress_channel_id,j.provider,j.account_id,e.message.platform,anchor.kind,anchor.key,conversationId]);
  if(existing.rowCount){await c.query('ROLLBACK');return false;}
  const auditId=crypto.randomUUID(),evidence='owner_identity:'+auditId;
  const final=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(auth.expires_at<=final||b.valid_until<=final){await c.query('ROLLBACK');return false;}
  await c.query(`INSERT INTO cf_sender_identity(workspace_id,channel_id,provider,account_id,platform,identity_kind,identity_key,contact_id,evidence_ref,valid_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,LEAST(clock_timestamp()+interval '24 hours',$10::timestamptz))`,[choice.workspaceId,j.ingress_channel_id,j.provider,j.account_id,e.message.platform,anchor.kind,anchor.key,choice.contactId,evidence,b.valid_until]);
  await c.query(`INSERT INTO cf_provider_conversation_identity(workspace_id,channel_id,provider,account_id,conversation_id,contact_id,evidence_ref,valid_until) VALUES($1,$2,$3,$4,$5,$6,$7,LEAST(clock_timestamp()+interval '24 hours',$8::timestamptz))`,[choice.workspaceId,j.ingress_channel_id,j.provider,j.account_id,conversationId,choice.contactId,evidence,b.valid_until]);
  await pauseConversationOnClient(c,{workspaceId:choice.workspaceId,channelId:j.ingress_channel_id,contactId:choice.contactId},'owner_identity_confirmation',contact.opted_out===true);
  const done=await c.query(`INSERT INTO cf_identity_mapping_audit(id,workspace_id,job_id,contact_id,actor_id,job_fingerprint) SELECT $1,$2,$3,$4,$5,$6 WHERE $7::timestamptz>clock_timestamp() AND $8::timestamptz>clock_timestamp() RETURNING id`,[auditId,choice.workspaceId,choice.jobId,choice.contactId,auth.user_id,choice.jobFingerprint,auth.expires_at,b.valid_until]);
  if(!done.rowCount){await c.query('ROLLBACK');return false;}
  await c.query('COMMIT');return true;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
