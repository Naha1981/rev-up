// Isolated HTTP transport contract. NOT imported by live route. No external calls.
import type {Pool} from 'pg';
import type {TenantCryptoEnv} from './tenant-crypto';
import {receiveSignedIngress} from './authenticated-ingress';
// Provider retries408/429/5xx, terminal4xx otherwise; acknowledge only after commit.
// Invalid/unknown registration returns503 (not false202 or terminal404), retained
// provider queue must remain recoverable while operator resolves mapping.
export async function ingressResponse(req:Request,endpointId:string,pool:Pool,env:TenantCryptoEnv,receive=receiveSignedIngress):Promise<Response>{
 const reply=(status:number,code:string)=>Response.json({status:code},{status,headers:status===503?{'Retry-After':'30'}:{}});
 if(req.method!=='POST')return reply(405,'method_not_allowed');
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('Content-Type')||''))return reply(415,'json_required');
 const signature=req.headers.get('X-Zernio-Signature')||'';
 const eventHeader=req.headers.get('X-Zernio-Event')||'',eventIdHeader=req.headers.get('X-Zernio-Event-Id')||'';
 if(!/^[a-f0-9]{64}$/.test(signature)||!eventHeader||!eventIdHeader||eventHeader.length>512||eventIdHeader.length>512)return reply(400,'invalid_headers');
 const declared=req.headers.get('Content-Length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>32768))return reply(413,'payload_too_large');
 if(!req.body)return reply(400,'body_required');
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>32768){await reader.cancel();return reply(413,'payload_too_large');}chunks.push(part.value);}
 }catch{return reply(503,'body_unavailable');}finally{reader.releaseLock();}
 const raw=new Uint8Array(length);let i=0;for(const c of chunks){raw.set(c,i);i+=c.byteLength;}
 try{const accepted=await receive(pool,{endpointId,raw,signature,eventHeader,eventIdHeader},env);return accepted?reply(202,'accepted'):reply(503,'ingress_held');}
 catch{return reply(503,'persistence_unavailable');} // Never leak exception/key/body.
}
