// Backend-only isolated staging. No production app import, outbound adapter,
// AI/provider/payment routes, scheduled handler or request-time migrations.
import {Pool} from 'pg';
import {ingressResponse} from './ingress-response';
import type {TenantCryptoEnv} from './tenant-crypto';
interface StagingEnv extends TenantCryptoEnv {STAGING_ONLY?:string;STAGING_DATABASE_URL?:string;STAGING_MARKER?:string;STAGING_HOST?:string;STAGING_COMMIT?:string;}
export function stagingRequestAllowed(req:Request,env:StagingEnv):boolean{
 if(env.STAGING_ONLY!=='true'||!env.STAGING_DATABASE_URL||!env.STAGING_MARKER||!env.STAGING_HOST||!/^[a-f0-9]{40}$/.test(env.STAGING_COMMIT||''))return false;
 const u=new URL(req.url);return u.protocol==='https:'&&u.hostname===env.STAGING_HOST&&/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(u.hostname);
}
export async function stagingMarkerMatches(pool:Pool,marker:string):Promise<boolean>{
 const r=await pool.query('SELECT marker,synthetic_only,egress_disabled FROM cf_staging_boundary');
 return r.rows.length===1&&r.rows[0].marker===marker&&r.rows[0].synthetic_only===true&&r.rows[0].egress_disabled===true;
}
export async function stagingFetch(req:Request,env:StagingEnv,makePool=(url:string)=>new Pool({connectionString:url,max:1,connectionTimeoutMillis:1500,idleTimeoutMillis:0}),respond=ingressResponse):Promise<Response>{
 if(!stagingRequestAllowed(req,env))return Response.json({status:'staging_not_configured'},{status:503});
 const db=makePool(env.STAGING_DATABASE_URL!);
 try{
  if(!await stagingMarkerMatches(db,env.STAGING_MARKER!))return Response.json({status:'staging_boundary_failed'},{status:503});
  const u=new URL(req.url);
  if(u.pathname==='/health'&&req.method==='GET')return Response.json({status:'ok',scope:'synthetic_backend_only',commit:env.STAGING_COMMIT,outbound:'disabled',uiJourneys:'unverified'});
  const endpoint=/^\/synthetic-ingress\/([a-f0-9-]{36})$/.exec(u.pathname);
  if(endpoint)return await respond(req,endpoint[1],db,env);
  return Response.json({status:'not_available_in_isolated_staging'},{status:404});
 }catch{return Response.json({status:'staging_unavailable'},{status:503});}finally{await db.end().catch(()=>{});}
}
export default{fetch:stagingFetch};
