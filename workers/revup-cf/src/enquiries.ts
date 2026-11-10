import type {Pool} from 'pg';
export async function enquiryKey(workspace:string,name:string,contact:string,message:string,day:string):Promise<string>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([workspace,name,contact,message,day])));
 return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,40);
}
export async function captureEnquiry(db:Pool,workspace:string,name:string,contact:string,message:string,day:string):Promise<void>{
 const key=await enquiryKey(workspace,name,contact,message,day);
 // Existing short web identifiers are retained. Long values are hashed so two
 // addresses sharing the first 28 characters never become the same customer.
 const handle=contact.length<=28?'web:'+contact:'web:'+await enquiryKey(workspace,'',contact,'','').then(x=>x.slice(0,28));
 const client=await db.connect();
 try{
  await client.query('BEGIN');const leadId=crypto.randomUUID();
  const ins=await client.query(`INSERT INTO frontdesk_lead(id,workspace_id,name,contact,message,stage,value_cents,request_key,created_at,updated_at)
   VALUES($1,$2,$3,$4,$5,'new',0,$6,now(),now()) ON CONFLICT (workspace_id,request_key) DO NOTHING RETURNING id`,[leadId,workspace,name,contact,message,key]);
  if(ins.rows[0]){
   const c=await client.query(`INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
    VALUES($1,$2,$3,$4,'[]'::jsonb,true,false,'','','new','',false,'web enquiry',0,0,now(),now())
    ON CONFLICT(workspace_id,wa_id) DO UPDATE SET needs_human=true,updated_at=now() RETURNING id`,[crypto.randomUUID(),workspace,handle,name.slice(0,120)]);
   await client.query(`INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
    VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,'[]'::jsonb)`,[crypto.randomUUID(),message,'fd-'+leadId,c.rows[0].id,workspace]);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
