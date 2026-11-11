import type {PoolClient} from 'pg';
import {decryptTenantKey,type TenantCryptoEnv} from './tenant-crypto';
export async function loadDispatchPolicy(c:PoolClient,s:{workspaceId:string;contactId:string;channelId:string},m:any,env:TenantCryptoEnv){
 const blocked=(reason:string)=>({reason,eligibility:null,budgets:[],policyVersion:null,credentialVersion:null,fingerprint:null,validUntil:0});
 const clock=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now as Date,now=clock.getTime();
 const p=(await c.query(`SELECT * FROM cf_workspace_dispatch_policy WHERE workspace_id=$1 FOR SHARE`,[s.workspaceId])).rows[0];
 if(!p||!p.enabled||!p.plan_active||p.valid_until.getTime()<=now)return blocked('policy_unavailable');
 const b=(await c.query(`SELECT * FROM cf_channel_dispatch_binding WHERE workspace_id=$1 AND channel_id=$2 FOR SHARE`,[s.workspaceId,s.channelId])).rows[0];
 if(!b||b.status!=='connected'||b.valid_until.getTime()<=now||b.account_id!==m.account_id||b.provider!==m.provider)return blocked('binding_unavailable');
 try{const key=await decryptTenantKey(b.api_key,env);if(!key)return blocked('credential_unavailable');}catch{return blocked('credential_unavailable');}
 const permission=(await c.query(`SELECT * FROM cf_contact_permission WHERE workspace_id=$1 AND contact_id=$2 AND channel_id=$3 AND purpose=$4 FOR SHARE`,[s.workspaceId,s.contactId,s.channelId,m.purpose])).rows[0];
 if(!permission||permission.status!=='allowed'||permission.withdrawn_at||permission.valid_until.getTime()<=now)return blocked('permission_missing');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m.body)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(!m.approved_by||!m.approved_at||!m.approved_body_sha256||m.approved_body_sha256!==hash)return blocked('approval_content_mismatch');
 const ctrl=(await c.query(`SELECT last_inbound_at,inbound_evidence_ref FROM cf_conversation_control WHERE workspace_id=$1 AND contact_id=$2 AND channel_id=$3`,[s.workspaceId,s.contactId,s.channelId])).rows[0];
 let templateApproved=false;let template:any=null;
 if(m.template_id&&m.template_version&&m.template_language){const t=(await c.query(`SELECT * FROM cf_template_dispatch_policy WHERE workspace_id=$1 AND channel_id=$2 AND account_id=$3 AND template_id=$4 AND version=$5 AND language=$6 AND purpose=$7 FOR SHARE`,[s.workspaceId,s.channelId,m.account_id,m.template_id,m.template_version,m.template_language,m.purpose])).rows;template=t[0]||null;templateApproved=!!template&&template.status==='approved';}
 const finalNow=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now.getTime();
 if(p.valid_until.getTime()<=finalNow||b.valid_until.getTime()<=finalNow||permission.valid_until.getTime()<=finalNow)return blocked('evidence_expired');
 templateApproved=templateApproved&&template.valid_until.getTime()>finalNow;
 const validUntil=Math.min(p.valid_until.getTime(),b.valid_until.getTime(),permission.valid_until.getTime(),templateApproved?template.valid_until.getTime():(ctrl?.last_inbound_at?.getTime()||0)+86400000);
 const fingerprint=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({policy:p,binding:b,permission,approval:{by:m.approved_by,at:m.approved_at,hash:m.approved_body_sha256},template:{id:m.template_id,version:m.template_version,language:m.template_language,record:template,approved:templateApproved},inbound:ctrl}))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const date=new Date(finalNow),hour=new Date(finalNow),day=new Date(finalNow),month=new Date(finalNow);hour.setUTCMinutes(0,0,0);day.setUTCHours(0,0,0,0);month.setUTCDate(1);month.setUTCHours(0,0,0,0);
 return{reason:'',eligibility:{tenantMatches:true,credentialReady:true,permission:'allowed' as const,approvalRequired:true,approved:true,lastInboundAt:ctrl?.inbound_evidence_ref&&ctrl?.last_inbound_at?ctrl.last_inbound_at.getTime():null,templateApproved,templateBound:templateApproved,now:date.getTime()},budgets:[{bucket:'hour',periodStart:hour.toISOString(),limit:p.hour_limit},{bucket:'day',periodStart:day.toISOString(),limit:p.day_limit},{bucket:'month',periodStart:month.toISOString(),limit:p.month_limit}],policyVersion:String(p.version),credentialVersion:String(b.version),fingerprint,validUntil};
}
