import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectFailure} from '../dist-test/connect-errors.mjs';
for (const status of [401,403]) test(`auth ${status} marks only the requested workspace and gives a safe recovery message`, async()=>{
 const calls=[]; const db={query:async(...args)=>calls.push(args)};
 const msg=await connectFailure(db,'qa-workspace',status);
 assert.equal(calls.length,1); assert.match(calls[0][0],/needs_attention/);
 assert.deepEqual(calls[0][1],[msg,'qa-workspace']); assert.match(msg,/Paste a fresh key/);
});
for(const status of [402,429,500,503,undefined]) test(`status ${status} does not invalidate key`,async()=>{
 const db={query:async()=>{throw Error('must not write')}};
 const msg=await connectFailure(db,'qa-workspace',status);
 assert.ok(msg); assert.doesNotMatch(msg,/stopped working/);
});
test('route prevents restart and hides pairing button until fresh key is saved',async()=>{
 const fs=await import('node:fs/promises');const s=await fs.readFile(new URL('../src/index.ts',import.meta.url),'utf8');
 assert.ok(s.includes('!conn.profile_id || conn.status === "needs_attention"'));
 assert.ok(s.includes('conn.status !== "connected" && conn.status !== "needs_attention"'));
 assert.ok(s.includes('await connectFailure(db, mem.workspace_id, e?.status)'));
});

test('save key fills every required initial field and uses bound parameters',async()=>{
 const {saveTenantKey}=await import('../dist-test/connect-errors.mjs'); const calls=[];
 await saveTenantKey({query:async(...args)=>calls.push(args)},'id','workspace','synthetic-key','profile',{DJANGO_SECRET_KEY:'synthetic-django-secret',ENCRYPTION_KEY_SALT:'synthetic-salt'});
 assert.equal(calls[0][1][0],'id'); assert.equal(calls[0][1][1],'workspace'); assert.equal(calls[0][1][3],'profile');
 const {decryptTenantKey}=await import('../dist-test/tenant-crypto.mjs');
 assert.notEqual(calls[0][1][2],'synthetic-key');assert.equal(await decryptTenantKey(calls[0][1][2],{DJANGO_SECRET_KEY:'synthetic-django-secret',ENCRYPTION_KEY_SALT:'synthetic-salt'}),'synthetic-key');
 for(const name of ['account_id','phone_number','webhook_id','webhook_secret']) assert.ok(calls[0][0].includes(name));
 assert.match(calls[0][0],/VALUES\(\$1,\$2,\$3,\$4,'','','','','key_valid','',now\(\),now\(\)\)/);
 assert.match(calls[0][0],/ON CONFLICT \(workspace_id\)/);
});
