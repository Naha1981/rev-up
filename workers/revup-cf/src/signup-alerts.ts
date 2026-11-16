// Called inside the signup transaction. In-app alert only, never email delivery.
import type {PoolClient,Pool} from 'pg';
export async function recordSignupAlert(db:Pick<PoolClient,'query'>,input:{userId:string;orgId:string;workspaceId:string;email:string;business:string;paymentReference:string}):Promise<number>{
 const r=await db.query(`INSERT INTO notifications_notification(id,user_id,event_type,title,body,data,is_read,read_at,created_at)
 SELECT gen_random_uuid(),id,'new_business_signup','New business signup',$1,$2::jsonb,false,NULL,now()
 FROM accounts_user WHERE is_superuser=true AND is_active=true RETURNING id`,[
  `${input.business} (${input.email}) created a RevUp account. Payment is not confirmed.`,
  JSON.stringify({signup_user_id:input.userId,organization_id:input.orgId,workspace_id:input.workspaceId,payment_reference:input.paymentReference,payment_status:'unverified'})]);
 if(!r.rows.length)throw Error('signup_alert_owner_not_configured');
 return r.rows.length;
}
export async function ownerSignupAlerts(db:Pick<Pool,'query'>,user:any):Promise<any[]>{
 if(!user?.is_superuser)return [];
 return (await db.query(`SELECT id,title,body,data,is_read,created_at FROM notifications_notification WHERE user_id=$1 AND event_type='new_business_signup' ORDER BY created_at DESC LIMIT 50`,[user.id])).rows;
}
