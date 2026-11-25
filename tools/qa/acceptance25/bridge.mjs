import http from 'node:http';
import worker from '../../../workers/revup-cf/dist-test/index.mjs';
// Synthetic-only test bridge. No provider credentials; every server fetch is denied.
globalThis.fetch=async()=>{throw Error('acceptance_egress_disabled');};
const env={DATABASE_URL:'postgresql://sandbox@127.0.0.1:55431/brightbean_test'};
const s=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const b=Buffer.concat(chunks);const r=await worker.fetch(new Request('http://127.0.0.1:8765'+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:b})}),env,{waitUntil:()=>{}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end('Synthetic bridge error: '+String(e));}});
s.listen(8765,'127.0.0.1',()=>console.log('bridge-ready'));
