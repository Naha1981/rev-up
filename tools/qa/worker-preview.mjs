/** Fictional-data preview. Refuses remote DBs and blocks ALL external requests.
 * Build: cd workers/revup-cf && npm run build:test
 * Run: DATABASE_URL=postgres://...@127.0.0.1:55432/brightbean_test node tools/qa/worker-preview.mjs
 * Optional PREVIEW_FIXTURE=connections|cancel simulates only that provider's response.
 */
import {createServer} from 'node:http';import {Readable} from 'node:stream';import {webcrypto} from 'node:crypto';import {writeFileSync} from 'node:fs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||!db.pathname.endsWith('_test'))throw new Error('Preview requires a separate loopback fictional _test database');
const fixture=process.env.PREVIEW_FIXTURE||'off';if(!['off','connections','cancel'].includes(fixture))throw new Error('Unknown fixture');
let fixtureUser='';
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url));
 if(fixture==='connections' && u.href==='https://backend.composio.dev/api/v3.1/connected_accounts/link'){
  const body=JSON.parse(options.body);fixtureUser=body.user_id;
  writeFileSync('/tmp/revup-fixture-callback.txt',body.callback_url,{mode:0o600});
  return new Response(JSON.stringify({connected_account_id:'ca_browser_fixture',redirect_url:'https://connect.composio.dev/link/fixture'}));
 }
 if(fixture==='connections' && u.origin==='https://backend.composio.dev' && u.pathname==='/api/v3.1/connected_accounts')return new Response(JSON.stringify({items:u.searchParams.get('user_ids')===fixtureUser?[{id:'ca_browser_fixture',user_id:fixtureUser,toolkit:{slug:'gmail'},auth_config:{id:'ac_fixture'},status:'ACTIVE'}]:[]}));
 if(fixture==='cancel' && u.href==='https://api.payfast.co.za/subscriptions/00000000-0000-4000-8000-000000000001/cancel?testing=true' && options.method==='PUT')return new Response(JSON.stringify({code:200,status:'success'}));
 throw new Error('External requests are blocked in this fictional preview');
};
const {default:worker}=await import('../../workers/revup-cf/dist-test/index.mjs');
const env={DATABASE_URL:db.href,GROQ_API_KEY:'',ZERNIO_API_KEY:'',PF_MERCHANT_ID:fixture==='cancel'?'10000100':'',PF_MERCHANT_KEY:'',PF_PASSPHRASE:fixture==='cancel'?'fictional':'',APP_CONNECTIONS_ENABLED:fixture==='connections'?'true':'false',COMPOSIO_API_KEY:'fictional',COMPOSIO_PROJECT_ID:'pr_8367LVZaOfL2',COMPOSIO_AUTH_CONFIGS:'{"gmail":"ac_fixture"}',APP_CONNECTIONS_ORIGIN:'https://revup.test.invalid'};
createServer(async(req,res)=>{try{
 const options={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){options.body=Readable.toWeb(req);options.duplex='half'}
 const origin=fixture==='connections'?'https://revup.test.invalid':'http://127.0.0.1:8765';
 const r=await worker.fetch(new Request(origin+req.url,options),env,{waitUntil(){}});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
}catch{res.writeHead(500);res.end('Fictional preview error')}}).listen(8765,'127.0.0.1',()=>console.log('Fictional preview ready at127.0.0.1:8765;external network disabled;fixture='+fixture));
