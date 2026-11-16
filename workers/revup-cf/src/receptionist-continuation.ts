// Persist authenticated receptionist work before acknowledging the provider.
// Failed/ambiguous work is retained for review, never silently replayed.
import type {Pool} from 'pg';
export interface ContinuationContext {waitUntil(task:Promise<unknown>):void;}
export async function queueReceptionistWebhook(db:Pool,payload:any,ctx:ContinuationContext,run:(db:Pool,payload:any)=>Promise<void>):Promise<{status:number;code:string}>{
 const id=typeof payload.id==='string'?payload.id:'';
 if(!id||id.length>512){await db.end().catch(()=>{});return {status:400,code:'event_id_required'};}
 try{
  const row=(await db.query(`INSERT INTO cf_receptionist_webhook_job(event_id,payload,state) VALUES($1,$2::jsonb,'pending') ON CONFLICT(event_id) DO NOTHING RETURNING event_id`,[id,JSON.stringify(payload)])).rows[0];
  if(!row){
   const existing=(await db.query('SELECT state FROM cf_receptionist_webhook_job WHERE event_id=$1',[id])).rows[0];
   await db.end().catch(()=>{});
   return existing&&['pending','processing','complete'].includes(existing.state)?{status:200,code:'already_received'}:{status:503,code:'processing_held'};
  }
  const job=(async()=>{
   try{
    const claimed=(await db.query(`UPDATE cf_receptionist_webhook_job SET state='processing',started_at=now(),updated_at=now() WHERE event_id=$1 AND state='pending' RETURNING event_id`,[id])).rows[0];
    if(!claimed)return;
    await run(db,payload);
    await db.query(`UPDATE cf_receptionist_webhook_job SET state='complete',completed_at=now(),updated_at=now() WHERE event_id=$1 AND state='processing'`,[id]);
   }catch{
    await db.query(`UPDATE cf_receptionist_webhook_job SET state='failed',failure_code='handler_failed',updated_at=now() WHERE event_id=$1 AND state<>'complete'`,[id]).catch(()=>{});
   }finally{await db.end().catch(()=>{});}
  })();
  ctx.waitUntil(job);
  return {status:200,code:'received'};
 }catch{await db.end().catch(()=>{});return {status:503,code:'persistence_unavailable'};}
}
