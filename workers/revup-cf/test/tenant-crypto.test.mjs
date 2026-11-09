import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptTenantKey,decryptTenantKey} from '../dist-test/tenant-crypto.mjs';
const env={DJANGO_SECRET_KEY:'synthetic-django-secret',ENCRYPTION_KEY_SALT:'synthetic-salt'};
const clear='synthetic-tenant-key-never-real';
const pythonFixture="AAECAwQFBgcICQoLtoyXi4nTpMfjPk2cskwlXYNGFAKY01dCbu7SfwyWVquQ21B4vjlw40cKso3hOgc=";

test('decrypts Python AESGCM/HKDF fixture in existing Django format',async()=>assert.equal(await decryptTenantKey(pythonFixture,env),clear));
test('encrypts with random nonce and decrypts without exposing plaintext at rest',async()=>{
 const a=await encryptTenantKey(clear,env),b=await encryptTenantKey(clear,env);
 assert.notEqual(a,b);assert.notEqual(a,clear);assert.equal(await decryptTenantKey(a,env),clear);
});
for (const config of [{},{DJANGO_SECRET_KEY:'synthetic-django-secret'},{...env,ENCRYPTION_KEY_SALT:'wrong'}]) test('wrong or missing key fails closed '+JSON.stringify(config),async()=>{
 await assert.rejects(()=>decryptTenantKey(pythonFixture,config),/could not be read securely/);
});
for (const value of [clear,'not base64',pythonFixture.slice(0,-4)+'AAAA']) test('no plaintext or corrupted-ciphertext fallback '+value.length,async()=>{
 await assert.rejects(()=>decryptTenantKey(value,env),/could not be read securely/);
});
test('missing encryption configuration cannot write a tenant key',async()=>{
 const {saveTenantKey}=await import('../dist-test/connect-errors.mjs');
 await assert.rejects(()=>saveTenantKey({query:()=>{throw Error('must never write')}},'id','ws',clear,'p',{}),/configuration is missing/);
});
for (const valid of [true,false]) test('send uses decrypted tenant key, no ciphertext or shared fallback '+valid,async()=>{
 const {sendChannelMessage}=await import('../dist-test/receptionist.mjs');
 const stored=await encryptTenantKey(clear,env),calls=[];
 const db={query:async(q)=>({rows:q.includes('count(*)')?[{c:0}]:q.includes('zernio_conversation_id')?[{zernio_conversation_id:'synthetic-conversation'}]:[{api_key:stored,status:'connected'}]})};
 const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{calls.push(options);return new Response(JSON.stringify({data:{messageId:'synthetic-id'}}),{status:200,headers:{'content-type':'application/json'}})};
 try {
  const action=()=>sendChannelMessage(db,{...env,ENCRYPTION_KEY_SALT:valid?env.ENCRYPTION_KEY_SALT:'wrong',ZERNIO_API_KEY:'shared-key'}, {workspace_id:'synthetic-ws',is_sandbox:false,zernio_account_id:'synthetic-account'},'synthetic-contact','0000000','Synthetic test');
  if(valid){await action();assert.equal(calls.length,1);assert.equal(calls[0].headers.authorization,'Bearer '+clear);}
  else{await assert.rejects(action,/could not be read securely/);assert.equal(calls.length,0);}
 } finally {globalThis.fetch=original;}
});

test('production derived-key path decrypts Django-compatible ciphertext',async()=>{
 assert.equal(await decryptTenantKey(pythonFixture,{TENANT_FIELD_KEY:'dtB5VtOsskvoCtUY0H5PpKTKI6GPJktOPs/1gJ5nN1I='}),clear);
});
test('invalid derived-key length fails closed',async()=>{
 await assert.rejects(()=>decryptTenantKey(pythonFixture,{TENANT_FIELD_KEY:btoa('bad')}),/could not be read securely/);
});
