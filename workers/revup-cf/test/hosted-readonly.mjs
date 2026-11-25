// Run separately from unit tests. Requires an explicitly authorised isolated target.
// No production defaults and no signed webhook writes or tracked-link analytics.
import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.REVUP_ACCEPTANCE_BASE;
if(!base)throw Error('REVUP_ACCEPTANCE_BASE is required; unit tests never probe production');
const url=new URL(base);if(!['127.0.0.1','localhost'].includes(url.hostname)&&process.env.REVUP_READONLY_HOSTED_APPROVED!=='true')throw Error('Explicit hosted read-only acceptance approval required');
test('target health reads real DB',async()=>{const r=await fetch(base+'/health');assert.equal(r.status,200);const j=await r.json();assert.equal(j.ok,true);assert.equal(j.db,true);});
test('target signup form is reachable without login',async()=>{const r=await fetch(base+'/signup');assert.equal(r.status,200);assert.ok((await r.text()).includes('Create your RevUp account'));});
test('target login form is reachable without login',async()=>{const r=await fetch(base+'/login');assert.equal(r.status,200);assert.ok((await r.text()).includes('Log in to RevUp'));});
