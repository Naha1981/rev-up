// Metadata is injected from an independently verified release packet. Never
// infer source SHA/deployment ID from mutable headers or request parameters.
import type{Pool}from'pg';
export interface RuntimeProofEnv{RELEASE_SHA?:string;RELEASE_BUILT_AT?:string;CF_VERSION_METADATA?:{id?:string;timestamp?:string};}
export function versionResponse(req:Request,env:RuntimeProofEnv):Response{
 if(req.method!=='GET'&&req.method!=='HEAD')return Response.json({status:'method_not_allowed'},{status:405,headers:{Allow:'GET, HEAD'}});
 const sha=env.RELEASE_SHA,builtAt=env.RELEASE_BUILT_AT,deployId=env.CF_VERSION_METADATA?.id;
 if(!/^[a-f0-9]{40}$/.test(sha||'')||!builtAt||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(builtAt)||!Number.isFinite(Date.parse(builtAt))||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(deployId||''))return Response.json({status:'release_metadata_unverified'},{status:503,headers:{'Cache-Control':'no-store'}});
 const r=Response.json({sha,builtAt,deployId},{headers:{'Cache-Control':'no-store'}});return req.method==='HEAD'?new Response(null,{status:r.status,headers:r.headers}):r;
}
export async function healthResponse(req:Request,makePool:()=>Pool):Promise<Response>{
 if(req.method!=='GET'&&req.method!=='HEAD')return Response.json({ok:false,status:'method_not_allowed'},{status:405,headers:{Allow:'GET, HEAD'}});
 let db:Pool|undefined;try{
  db=makePool();const c=await db.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='1500ms'");const r=await c.query('SELECT 1 AS ok');await c.query('ROLLBACK');if(r.rows[0]?.ok!==1)throw Error('db_failed');}finally{c.release(true);}
  return Response.json({ok:true,db:true,ts:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false,db:false,status:'database_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
 finally{if(db)await db.end().catch(()=>{});}
}
