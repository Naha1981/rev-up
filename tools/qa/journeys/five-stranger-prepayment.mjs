import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium} from '../../../workers/revup-cf/node_modules/playwright/index.mjs';
import pg from '../../../workers/revup-cf/node_modules/pg/lib/index.js';
const {Pool}=pg;
const credentialFile=process.env.REVUP_JOURNEY_DATABASE_URL_FILE;
if(!credentialFile)throw Error('Explicit synthetic DB credential file required');
const dburl=(await readFile(credentialFile,'utf8')).trim();
const parsed=new URL(dburl); if(parsed.pathname!='/revup_journeys'||parsed.hostname!=='ep-bitter-queen-b9t8xqfb-pooler.c-7.eu-central-1.aws.neon.tech')throw Error('Wrong DB');
const db=new Pool({connectionString:dburl,max:1});
const boundary=(await db.query('select * from cf_staging_boundary')).rows;
if(boundary.length!==1||boundary[0].marker!=='revup-full-journey-11nov2026'||!boundary[0].synthetic_only||!boundary[0].egress_disabled)throw Error('No boundary');
await db.end();
const denied=[];globalThis.fetch=async input=>{let u=new URL(typeof input==='string'?input:input.url);denied.push(u.origin);throw Error('External transport disabled in isolated journey QA');};
const {default:app}=await import('../../../workers/revup-cf/dist-test/index.mjs');
const env={DATABASE_URL:dburl,STAGING_ONLY:'true',DJANGO_SECRET_KEY:'synthetic-journey-environment-not-production',ENCRYPTION_KEY_SALT:'synthetic-journey-salt'};
let errors=[];
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const b of req)chunks.push(b);const body=Buffer.concat(chunks);let url='http://127.0.0.1:8765'+req.url;const r=await app.fetch(new Request(url,{method:req.method,headers:req.headers,...(body.length?{body}:{} )}),env);res.statusCode=r.status;for(const [k,v]of r.headers)res.setHeader(k,v);res.end(Buffer.from(await r.arrayBuffer()));}catch(e){errors.push(String(e));res.statusCode=500;res.end('Isolated harness error: '+String(e));}});
await new Promise(r=>server.listen(8765,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',headless:true,args:['--no-sandbox']});
const results=[];
const cases=[['plumber','starter',390,844],['restaurant','growth',820,1180],['dental','business-pro',1280,900],['real-estate','growth',390,844],['container-transport','business-pro',1280,900]];
try{
for(let i=0;i<cases.length;i++){
 const [industry,intendedTier,width,height]=cases[i];
 const context=await browser.newContext({viewport:{width,height}});
 await context.route('**/*',async route=>{let u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();return route.abort();});
 const page=await context.newPage();const label='Fictional '+industry+' journey '+i;
 const email='journey-'+industry+'-'+Date.now()+'@example.invalid';
 const row={industry,intendedTier,viewport:[width,height],steps:[],blockers:[]};results.push(row);
 let r=await page.goto('http://127.0.0.1:8765/industries/'+industry);
 assert.equal(r.status(),200);row.steps.push({step:'discovery',status:r.status()});
 await page.goto('http://127.0.0.1:8765/signup?industry='+industry);
 await page.locator('[name=name]').fill('Fictional QA '+i);
 await page.locator('[name=email]').fill(email);
 await page.locator('[name=password]').fill('synthetic-test-only-never-production');
 await page.locator('[name=business]').fill(label);
 await Promise.all([page.waitForURL('**/onboarding'),page.getByRole('button',{name:'Create account',exact:true}).click()]);
 assert.equal(new URL(page.url()).pathname,'/onboarding');row.steps.push({step:'signup-native-form',url:new URL(page.url()).pathname});
 await page.locator('[name=industry]').selectOption(industry);
 await page.locator('[name=website_url]').fill('https://'+industry+'.example.invalid');
 await page.locator('[name=goal_receptionist]').check();
 await Promise.all([page.waitForURL(url=>url.pathname==='/'),page.getByRole('button',{name:'Save and continue',exact:true}).click()]);
 await page.goto('http://127.0.0.1:8765/onboarding');
 assert.equal(await page.locator('[name=industry]').inputValue(),industry);
 row.steps.push({step:'saved-industry-after-reload',value:await page.locator('[name=industry]').inputValue(),business:await page.locator('[name=business_name]').inputValue()});
 await page.goto('http://127.0.0.1:8765/billing');
 await page.screenshot({path:'/downloads/revup-journey-'+i+'-billing.png',fullPage:true});
 const billing=await page.locator('body').innerText();row.steps.push({step:'billing',text:billing.slice(-1500)});
 row.blockers.push('No self-service verified Yoco payment activation tested; all new accounts remain pending_activation. No charge, fake webhook, hidden flag or account update performed.');
 const p=await page.goto('http://127.0.0.1:8765/posts/new');
 if(p.status()===200&&await page.locator('[name=title]').count()){
  await page.locator('[name=title]').fill('Fictional QA first draft '+industry);
  await page.locator('[name=caption]').fill(label+' is a fictional quality test. No offer or customer message.');
  const buttons=await page.locator('button').allTextContents();
  row.steps.push({step:'draft-controls',buttons});
  const submit=page.locator('form').filter({has:page.locator('[name=title]')}).locator('button[type=submit],button:not([type])').last();
  await submit.click();await page.waitForLoadState('domcontentloaded');
  row.steps.push({step:'manual-draft-save',url:new URL(page.url()).pathname,text:(await page.locator('body').innerText()).slice(-900)});
  await page.screenshot({path:'/downloads/revup-journey-'+i+'-draft.png',fullPage:true});
 }
 const reset=await context.request.get('http://127.0.0.1:8765/forgot-password',{maxRedirects:0});
 row.steps.push({step:'password-recovery',status:reset.status(),location:reset.headers().location});
 row.steps.push({step:'frictionless-signup-policy',note:'No email gate, matching owner4Nov explicit preference. Not a defect.'});
 row.blockers.push('Password recovery still redirects to the sleep-prone production Render origin. Redirect was not followed.');
 const verify=new Pool({connectionString:dburl,max:1});
 try{
 const state=await verify.query(`select o.plan,o.subscription_status,w.industry, (select count(*)::int from composer_post p where p.workspace_id=w.id) draft_count,(select count(*)::int from account_emailaddress e where e.user_id=u.id and e.verified) verified_email_count from accounts_user u join members_org_membership m on m.user_id=u.id join organizations_organization o on o.id=m.organization_id join workspaces_workspace w on w.organization_id=o.id where u.email=$1`,[email]);
 row.persisted=state.rows;assert.equal(state.rows.length,1);assert.equal(state.rows[0].industry,industry);assert.equal(state.rows[0].draft_count,1);assert.equal(state.rows[0].plan,'starter');assert.equal(state.rows[0].subscription_status,'pending_activation');assert.equal(state.rows[0].verified_email_count,0);
 }finally{await verify.end();}
 await context.close();
}
assert.equal(results.length,5);assert.deepEqual(errors,[]);assert.deepEqual(denied,[]);
}finally{await browser.close();await new Promise(r=>server.close(r));await writeFile('/tmp/revup-five-journeys-results.json',JSON.stringify({results,errors,denied},null,2));console.log(JSON.stringify({results,errors,denied},null,2));}
