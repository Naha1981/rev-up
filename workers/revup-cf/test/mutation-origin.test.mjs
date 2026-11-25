import {test}from'node:test';import assert from'node:assert/strict';import worker,{mutationOriginAllowed as allowed}from'../dist-test/index.mjs';
const base='https://synthetic.invalid';
test('cookie browser mutations require same-origin, public forms retain their own checks',async()=>{
 for(const path of ['/login','/signup','/logout','/onboarding','/posts/new','/campaigns','/approvals/x/approve'])for(const origin of [undefined,'https://foreign.invalid']){
 const r=new Request(base+path,{method:'POST',headers:{cookie:'cf_session=synthetic',...(origin?{origin}:{})},body:''});assert.equal(allowed(r),false,path);assert.equal((await worker.fetch(r,{},{})).status,403);
 }
 for(const path of ['/login','/signup','/onboarding','/posts/new'])assert.equal(allowed(new Request(base+path,{method:'POST',headers:{cookie:'cf_session=synthetic',origin:base}})),true);
 assert.equal(allowed(new Request(base+'/f/11111111-1111-4111-8111-111111111111',{method:'POST',headers:{cookie:'cf_session=synthetic',origin:'https://customer.invalid'}})),true);
 assert.equal(allowed(new Request(base+'/webhooks/zernio',{method:'POST'})),true);
});
