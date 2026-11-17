import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
globalThis.require=createRequire(new URL('../../../workers/revup-cf/package.json',import.meta.url));
const {default:worker}=await import(new URL('../../../workers/revup-cf/dist-test/index.mjs',import.meta.url));
const {hostedRecoveryService}=await import(new URL('../../../workers/revup-cf/dist-test/recovery-route.mjs',import.meta.url));
const nativeFetch=fetch;let frontend;
const recovery=hostedRecoveryService('https://nahalabs-brightbean.onrender.com',async request=>{let url=new URL(request.url);url.protocol='http:';url.host='127.0.0.1:8767';return nativeFetch(new Request(url,{method:request.method,headers:request.headers,body:request.method==='POST'?await request.arrayBuffer():undefined,redirect:'manual',signal:request.signal}));});
import {fileURLToPath} from 'node:url';
import {createRequire as qaRequire} from 'node:module';
const qaRoot=fileURLToPath(new URL('../../../',import.meta.url));
const {chromium}=qaRequire(qaRoot+'workers/revup-cf/package.json')('playwright');
import assert from 'node:assert/strict';
const root=process.env.REVUP_QA_ROOT || new URL('../../../',import.meta.url).pathname.replace(/\/$/,'');
const child=spawn(process.env.REVUP_QA_PYTHON||'python3',['-m','gunicorn','tools.recovery_host.wsgi:application','--bind','127.0.0.1:8767','--workers','1','--threads','2','--access-logfile','/dev/null'],{cwd:root,env:{...process.env,REVUP_RECOVERY_SYNTHETIC:'1',REVUP_RECOVERY_ORIGIN:'http://127.0.0.1:8766',DATABASE_URL:'postgresql://sandbox@127.0.0.1:55440/revup_finish_synthetic',SECRET_KEY:'synthetic-build-only'},stdio:['ignore','ignore','pipe']});
let err='';child.stderr.on('data',b=>err+=b);let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{let r=await fetch('http://127.0.0.1:8767/health/');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,err);
 for(const path of ['/admin/','/internal/run-due/','/accounts/login/','/accounts/signup/','/billing/','/operator/signup-alerts'])assert.equal((await fetch('http://127.0.0.1:8767'+path,{method:'POST'})).status,404,path);
 const csrf=await fetch('http://127.0.0.1:8767/accounts/password/reset/',{method:'POST',headers:{origin:'http://127.0.0.1:8767','content-type':'application/x-www-form-urlencoded'},body:'email=nobody%40example.invalid'});assert.equal(csrf.status,403);
 frontend=createServer(async(req,res)=>{try{let chunks=[];for await(const chunk of req)chunks.push(chunk);let body=Buffer.concat(chunks);let request=new Request('http://127.0.0.1:8766'+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});let r=await worker.fetch(request,{RECOVERY_SERVICE:recovery});res.statusCode=r.status;for(const[k,v]of r.headers)if(k!=='set-cookie')res.setHeader(k,v);if(r.headers.getSetCookie().length)res.setHeader('set-cookie',r.headers.getSetCookie());res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});await new Promise(r=>frontend.listen(8766,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:'/opt/google/chrome/chrome',args:['--no-sandbox']});let c=await browser.newContext({viewport:{width:390,height:844}});await c.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());let page=await c.newPage();let r=await page.goto('http://127.0.0.1:8766/forgot-password');assert.equal(r.status(),200);assert.equal(await page.locator('input[name=email]').count(),1);await page.screenshot({path:'/downloads/revup-recovery-styled390-17nov.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok((await c.request.get('http://127.0.0.1:8766/static/css/dist/styles.css')).ok());await page.locator('input[name=email]').fill('host-smoke@example.invalid');await Promise.all([page.waitForURL('**/accounts/password/reset/done/'),page.locator('button[type=submit]').click()]);await page.screenshot({path:'/downloads/revup-recovery-styled-done390-17nov.png',fullPage:true});console.log(JSON.stringify({recoveryOnlyNativeHost:true,form200:true,css200:true,nativeCsrfPost302:true,missingCsrf403:true,sixForbiddenRoutes404:true,viewport390NoHorizontalOverflow:true,email:'memory-only',productionUntouched:true}));
}catch(e){console.error(err);throw e;}finally{if(browser)await browser.close();if(frontend)await new Promise(r=>frontend.close(r));child.kill();}
