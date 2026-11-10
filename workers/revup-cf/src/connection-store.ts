import type {Pool} from 'pg';
import type {Binding,Budget} from './composio';
export class ConnectionStore {
 constructor(private db:Pool){}
 async rememberAttempt(hash:string,ws:string,user:string,account:string,auth:string,toolkit:string){
  await this.db.query(`INSERT INTO app_connection_attempt(state_hash,workspace_id,user_id,account_id,auth_config_id,toolkit,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')`,[hash,ws,user,account,auth,toolkit]);
 }
 async attempt(hash:string,ws:string,user:string):Promise<Binding|null>{
  const r=await this.db.query(`SELECT * FROM app_connection_attempt WHERE state_hash=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now() AND consumed_at IS NULL`,[hash,ws,user]);
  const a=r.rows[0];return a?{workspaceId:ws,userId:'revup_ws_'+ws,accountId:a.account_id,authConfigId:a.auth_config_id,toolkit:a.toolkit}:null;
 }
 async finish(hash:string,ws:string,user:string){
  // Atomic consume+binding prevents callback replay and concurrent rebinding.
  const r=await this.db.query(`WITH used AS (UPDATE app_connection_attempt SET consumed_at=now() WHERE state_hash=$1 AND workspace_id=$2 AND user_id=$3 AND expires_at>now() AND consumed_at IS NULL RETURNING *) INSERT INTO app_connection_binding(id,workspace_id,account_id,auth_config_id,toolkit,connected_at) SELECT gen_random_uuid(),workspace_id,account_id,auth_config_id,toolkit,now() FROM used ON CONFLICT(workspace_id,toolkit) DO NOTHING RETURNING account_id`,[hash,ws,user]);
  return r.rowCount===1;
 }
 async list(ws:string){return (await this.db.query(`SELECT toolkit,connected_at FROM app_connection_binding WHERE workspace_id=$1 ORDER BY toolkit`,[ws])).rows}
 budget(cap:number):Budget{
  return {reserve:async(ws,request)=>{
   // cap=0 denies by default. Lock serializes global project usage,not just one tenant.
   if(!Number.isSafeInteger(cap)||cap<1||cap>100000)return false;
   const c=await this.db.connect();try{
    await c.query('BEGIN');await c.query("SELECT pg_advisory_xact_lock(8367,100000)");
    const r=await c.query(`SELECT count(*)::int AS count FROM app_tool_reservation WHERE created_at>=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`);
    if(r.rows[0].count>=cap){await c.query('ROLLBACK');return false}
    const made=await c.query(`INSERT INTO app_tool_reservation(request_id,workspace_id,created_at) VALUES($1,$2,now()) ON CONFLICT(request_id) DO NOTHING RETURNING request_id`,[request,ws]);
    await c.query('COMMIT');return made.rowCount===1;
   }catch{await c.query('ROLLBACK');return false}finally{c.release()}
  }};
 }
}
