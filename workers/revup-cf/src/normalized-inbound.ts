// Database-only staging adapter. No AI/reply scheduling or fresh service-window grants.
import type {Pool} from 'pg';
import {applyInboundEffects} from './inbound-jobs';
import {ingressFingerprint} from './authenticated-ingress';
import {pauseConversationOnClient} from './messaging-safety';
export function senderAnchor(e:any):{kind:string;key:string}|null{
 const s=e?.message?.sender;if(!s||typeof s.id!=='string'||!s.id||s.id.length>512)return null;
 if(e.message.platform==='whatsapp'){
  if(s.businessScopedUserId!==undefined)return typeof s.businessScopedUserId==='string'&&s.businessScopedUserId.length>0&&s.businessScopedUserId.length<=512?{kind:'bsuid',key:s.businessScopedUserId}:null;
  if(typeof s.phoneNumber==='string'&&/^\+[1-9][0-9]{6,14}$/.test(s.phoneNumber))return{kind:'phone',key:s.phoneNumber};
  return null; // Never guess that opaque sender.id is a phone number.
 }
 return typeof e.message.platform==='string'&&['instagram','facebook','telegram','sms','rcs','twitter','bluesky','reddit','slack','tiktok','imessage'].includes(e.message.platform)?{kind:'platform',key:s.id}:null;
}
export async function normalizeInboundJob(pool:Pool,workspaceId:string,jobId:string,lease:string):Promise<boolean>{
 return applyInboundEffects(pool,workspaceId,jobId,lease,async c=>{
  const j=(await c.query(`SELECT * FROM cf_inbound_job WHERE id=$1 AND workspace_id=$2`,[jobId,workspaceId])).rows[0];
  if(!j?.ingress_endpoint_id||!j.ingress_channel_id||!j.ingress_fingerprint)throw Error('ingress_identity_missing');
  const b=(await c.query(`SELECT * FROM cf_webhook_ingress_binding WHERE endpoint_id=$1 FOR SHARE`,[j.ingress_endpoint_id])).rows[0];
  if(!b||!b.enabled||b.workspace_id!==workspaceId||b.channel_id!==j.ingress_channel_id||b.account_id!==j.account_id||b.provider!==j.provider||await ingressFingerprint(b)!==j.ingress_fingerprint)throw Error('ingress_remapped');
  const e=j.payload;if(e.event!=='message.received')throw Error('receipt_requires_reducer');
  const anchor=senderAnchor(e);if(!anchor)throw Error('sender_identity_unresolved');
  if(e.metadata?.standby!==undefined&&typeof e.metadata.standby!=='boolean')throw Error('standby_invalid');
  const identity=(await c.query(`SELECT * FROM cf_sender_identity WHERE workspace_id=$1 AND channel_id=$2 AND provider=$3 AND account_id=$4 AND platform=$5 AND identity_kind=$6 AND identity_key=$7 FOR SHARE`,[workspaceId,j.ingress_channel_id,j.provider,j.account_id,e.message.platform,anchor.kind,anchor.key])).rows[0];
  if(!identity)throw Error('sender_identity_unresolved');
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  if(b.valid_until<=now||identity.valid_until<=now)throw Error('inbound_evidence_expired');
  const stop=typeof e.message.text==='string'&&/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(e.message.text.trim());
  const standby=e.metadata?.standby===true;
  if(stop||standby)await pauseConversationOnClient(c,{workspaceId,contactId:identity.contact_id,channelId:j.ingress_channel_id},stop?'authenticated_stop':'provider_standby',stop);
  // sentAt is only chronological provider data. Never set last_inbound_at to now.
  let sentAt:Date|null=null;if(typeof e.message.sentAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(e.message.sentAt)&&Number.isFinite(Date.parse(e.message.sentAt)))sentAt=new Date(e.message.sentAt);
  await c.query(`INSERT INTO cf_normalized_inbound(job_id,workspace_id,channel_id,contact_id,provider_message_id,provider_conversation_id,standby,stop,claimed_sent_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[jobId,workspaceId,j.ingress_channel_id,identity.contact_id,e.message.id,e.message.conversationId,standby,stop,sentAt]);
  const final=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;if(b.valid_until<=final||identity.valid_until<=final)throw Error('inbound_evidence_expired');
 });
}
