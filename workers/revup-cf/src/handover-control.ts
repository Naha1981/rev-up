// Signed ownership observations can only tighten safety, never grant resume.
import type {Pool} from 'pg';
import {applyInboundEffects} from './inbound-jobs';
import {ingressFingerprint} from './authenticated-ingress';
import {pauseConversationOnClient} from './messaging-safety';
export async function applyHandoverJob(pool:Pool,workspaceId:string,jobId:string,lease:string):Promise<boolean>{
 return applyInboundEffects(pool,workspaceId,jobId,lease,async c=>{
  await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  const j=(await c.query(`SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2`,[jobId,workspaceId])).rows[0];
  if(!j?.ingress_endpoint_id||!j.ingress_channel_id||!j.ingress_fingerprint)throw Error('ingress_identity_missing');
  const b=(await c.query(`SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE`,[j.ingress_endpoint_id])).rows[0];
  if(!b||!b.enabled||b.workspace_id!==workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint)throw Error('ingress_remapped');
  const e=j.payload;if(e.event!=='conversation.control_changed'||!['app','ai_agent','other'].includes(e.control?.owner))throw Error('handover_invalid');
  const identity=(await c.query(`SELECT * FROM cf_provider_conversation_identity WHERE workspace_id=$1 AND channel_id=$2 AND provider=$3 AND account_id=$4 AND conversation_id=$5 FOR SHARE`,[workspaceId,j.ingress_channel_id,j.provider,j.account_id,e.conversation?.id])).rows[0];
  if(!identity)throw Error('conversation_identity_unresolved');
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;if(b.valid_until<=now||identity.valid_until<=now)throw Error('inbound_evidence_expired');
  // Even owner=app does not mean owner's explicit authorized bot resume. A late
  // out-of-order ownership event can pause again, but can never reopen a thread.
  await pauseConversationOnClient(c,{workspaceId,contactId:identity.contact_id,channelId:j.ingress_channel_id},'provider_control_'+e.control.owner);
  const changed=typeof e.changedAt==='string'&&Number.isFinite(Date.parse(e.changedAt))?new Date(e.changedAt):null;
  await c.query(`INSERT INTO cf_handover_observation(job_id,workspace_id,channel_id,contact_id,reported_owner,claimed_changed_at) VALUES($1,$2,$3,$4,$5,$6)`,[jobId,workspaceId,j.ingress_channel_id,identity.contact_id,e.control.owner,changed]);
  const final=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;if(b.valid_until<=final||identity.valid_until<=final)throw Error('inbound_evidence_expired');
 });
}
