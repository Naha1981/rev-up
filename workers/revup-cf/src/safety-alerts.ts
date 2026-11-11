// Internal staging ledger. Does not send alerts, auto-replay or resume anything.
import type {Pool} from 'pg';
export async function scanSafetyHolds(pool:Pool,workspaceId:string):Promise<number>{
 const c=await pool.connect();try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='1000ms'");await c.query("SET LOCAL statement_timeout='2500ms'");
  await c.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,['safety-alert:'+workspaceId]);
  const rows=(await c.query(`SELECT 'dead_inbound' AS kind,count(*) AS n,min(created_at) AS oldest FROM cf_inbound_job WHERE workspace_id=$1 AND state='dead'
   UNION ALL SELECT 'unmatched_receipt',count(*),min(created_at) FROM cf_unmatched_receipt WHERE workspace_id=$1 AND state IN ('unmatched','held') AND created_at<clock_timestamp()-interval '5 minutes'
   UNION ALL SELECT 'unknown_outbound',count(*),min(updated_at) FROM cf_outbound_message WHERE workspace_id=$1 AND state='unknown'
   UNION ALL SELECT 'held_normalized',count(*),min(created_at) FROM cf_normalized_inbound WHERE workspace_id=$1 AND processing_state='held' AND created_at<clock_timestamp()-interval '5 minutes'`,[workspaceId])).rows;
  let count=0;for(const row of rows){const open=BigInt(row.n)>0n;if(open)count++;
   await c.query(`INSERT INTO cf_safety_alert(workspace_id,kind,open,affected_count,oldest_at,resolved_at) VALUES($1,$2,$3,$4,$5,CASE WHEN $3 THEN NULL ELSE clock_timestamp() END) ON CONFLICT(workspace_id,kind) DO UPDATE SET open=EXCLUDED.open,affected_count=EXCLUDED.affected_count,oldest_at=EXCLUDED.oldest_at,last_seen_at=clock_timestamp(),resolved_at=CASE WHEN EXCLUDED.open THEN NULL ELSE COALESCE(cf_safety_alert.resolved_at,clock_timestamp()) END,version=cf_safety_alert.version+CASE WHEN (cf_safety_alert.open,cf_safety_alert.affected_count,cf_safety_alert.oldest_at) IS DISTINCT FROM (EXCLUDED.open,EXCLUDED.affected_count,EXCLUDED.oldest_at) THEN 1 ELSE 0 END`,[workspaceId,row.kind,open,row.n,row.oldest]);
  }
  await c.query('COMMIT');return count;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
