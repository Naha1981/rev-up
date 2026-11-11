// Staging internal queue only. No destination, external send, or false delivery.
import type {Pool} from 'pg';
export async function queueSafetyAlerts(pool:Pool,workspaceId:string):Promise<number>{
 const c=await pool.connect();try{await c.query('BEGIN');
  const alerts=(await c.query(`SELECT * FROM cf_safety_alert WHERE workspace_id=$1 AND open ORDER BY kind FOR SHARE`,[workspaceId])).rows;
  let n=0;for(const a of alerts){const r=await c.query(`INSERT INTO cf_safety_alert_delivery(id,workspace_id,kind,alert_version,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,kind,alert_version) DO NOTHING RETURNING id`,[crypto.randomUUID(),workspaceId,a.kind,a.version,JSON.stringify({kind:a.kind,version:String(a.version),count:String(a.affected_count),oldestAt:a.oldest_at?.toISOString()||null})]);n+=r.rowCount||0;}
  await c.query('COMMIT');return n;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function claimSafetyAlert(pool:Pool,workspaceId:string):Promise<any|null>{
 const c=await pool.connect();try{await c.query('BEGIN');
  // Source resolution/change invalidates unsent intent, not a silent stale alert.
  await c.query(`UPDATE cf_safety_alert_delivery d SET state='cancelled',lease_token=NULL,lease_until=NULL WHERE d.workspace_id=$1 AND d.state IN ('queued','processing') AND EXISTS(SELECT 1 FROM cf_safety_alert a WHERE a.workspace_id=d.workspace_id AND a.kind=d.kind AND (NOT a.open OR a.version<>d.alert_version))`,[workspaceId]);
  await c.query(`UPDATE cf_safety_alert_delivery SET state='dead',lease_token=NULL,lease_until=NULL,last_error_code='attempts_exhausted' WHERE workspace_id=$1 AND attempts>=5 AND (state='queued' OR(state='processing' AND lease_until<=clock_timestamp()))`,[workspaceId]);
  const r=await c.query(`WITH candidate AS(SELECT id FROM cf_safety_alert_delivery WHERE workspace_id=$1 AND attempts<5 AND ((state='queued' AND available_at<=clock_timestamp()) OR(state='processing' AND lease_until<=clock_timestamp())) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE cf_safety_alert_delivery d SET state='processing',attempts=attempts+1,lease_token=$2,lease_until=clock_timestamp()+interval '30 seconds' FROM candidate c WHERE d.id=c.id RETURNING d.*`,[workspaceId,crypto.randomUUID()]);
  await c.query('COMMIT');return r.rows[0]||null;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
// Deliberately no complete/send API until an authenticated approved destination
// and trusted provider confirmation can be bound to this exact alert/version.
export async function failSafetyAlert(pool:Pool,workspaceId:string,id:string,lease:string,code:string):Promise<boolean>{
 if(!/^[a-z0-9_]{1,80}$/.test(code))throw Error('invalid_error_code');
 const r=await pool.query(`UPDATE cf_safety_alert_delivery SET state=CASE WHEN attempts>=5 THEN 'dead' ELSE 'queued' END,last_error_code=$4,available_at=clock_timestamp()+interval '60 seconds',lease_token=NULL,lease_until=NULL WHERE workspace_id=$1 AND id=$2 AND state='processing' AND lease_token=$3 AND lease_until>clock_timestamp() RETURNING id`,[workspaceId,id,lease,code]);return !!r.rowCount;
}
