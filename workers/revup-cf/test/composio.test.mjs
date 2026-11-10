import {test} from 'node:test';import assert from 'node:assert/strict';
import {AppConnections} from '../dist-test/composio.mjs';
const p={enabled:true,projectId:'pr_8367LVZaOfL2',apiKey:'fictional',callbackOrigin:'https://example.invalid',authConfigs:{gmail:'ac_test'}};
const binding={workspaceId:'ws_one',userId:'revup_ws_ws_one',accountId:'ca_test',authConfigId:'ac_test',toolkit:'gmail'};
const grant={workspaceId:'ws_one',accountId:'ca_test',argumentsJson:'{}',requestId:'request1',tool:'GMAIL_LIST_MESSAGES',version:'20261101_00',expiresAt:Date.now()+60000,approved:true};
const account={id:'ca_test',user_id:'revup_ws_ws_one',auth_config:{id:'ac_test'},toolkit:{slug:'gmail'},status:'ACTIVE'};
const response=x=>new Response(JSON.stringify(x));
test('connections disabled is zero network',async()=>{let n=0;const a=new AppConnections({...p,enabled:false},{reserve:async()=>true},async()=>{n++;});await assert.rejects(a.start('ws_one','gmail'));assert.equal(n,0)});
test('unknown app cannot create a connection',async()=>{const a=new AppConnections(p,{},async()=>assert.fail('network'));await assert.rejects(a.start('ws_one','whatsapp'))});
test('tenant mismatch fails before network',async()=>{const a=new AppConnections(p,{},async()=>assert.fail('network'));await assert.rejects(a.status('ws_two',binding))});
test('missing upstream owner fails closed',async()=>{const {user_id,...r}=account;const a=new AppConnections(p,{},async()=>response(r));await assert.rejects(a.status('ws_one',binding))});
test('valid connection returns only status,never credentials',async()=>{const a=new AppConnections(p,{},async()=>response({...account,state:{access_token:'hidden'}}));assert.equal(await a.status('ws_one',binding),'connected')});
test('expired approval blocks execution',async()=>{const a=new AppConnections(p,{},async()=>assert.fail('network'));await assert.rejects(a.execute('ws_one',binding,{...grant,expiresAt:0},{},'request1'))});
test('budget exhaustion blocks tool request',async()=>{let n=0;const a=new AppConnections(p,{reserve:async()=>false},async()=>{n++;return response(account)});await assert.rejects(a.execute('ws_one',binding,grant,{},'request1'));assert.equal(n,1)});
test('execution pins owner account version and arguments',async()=>{let calls=[];const a=new AppConnections(p,{reserve:async()=>true},async(url,opts)=>{calls.push({url,opts});return response(calls.length===1?account:{successful:true,data:{count:1}})});assert.deepEqual(await a.execute('ws_one',binding,{...grant,argumentsJson:'{"limit":1}'},{limit:1},'request1'),{count:1});assert.deepEqual(JSON.parse(calls[1].opts.body),{user_id:binding.userId,connected_account_id:'ca_test',version:grant.version,arguments:{limit:1}});assert.equal(calls[1].opts.redirect,'error')});
test('latest version and instant account never execute',async()=>{const a=new AppConnections(p,{},async()=>assert.fail('network'));await assert.rejects(a.execute('ws_one',binding,{...grant,version:'latest'},{},'request1'));await assert.rejects(a.status('ws_one',{...binding,accountId:'instant_account'}))});
test('HTTP error does not leak provider response',async()=>{const a=new AppConnections(p,{},async()=>new Response('secret-provider-response',{status:500}));await assert.rejects(a.status('ws_one',binding),e=>!e.message.includes('secret-provider-response'))});

test('approval is bound to account payload and request',async()=>{const a=new AppConnections(p,{},async()=>assert.fail('network'));await assert.rejects(a.execute('ws_one',binding,grant,{to:'someone'},'request1'));await assert.rejects(a.execute('ws_one',binding,grant,{},'request2'));await assert.rejects(a.execute('ws_one',binding,{...grant,accountId:'other'},{},'request1'))});
