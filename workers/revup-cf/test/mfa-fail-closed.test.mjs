import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workerPasswordLoginAllowed,getUser} from '../dist-test/index.mjs';

test('password-only Worker login allows only explicit authenticator-disabled accounts',()=>{
 assert.equal(workerPasswordLoginAllowed({totp_enabled:false}),true);
 for(const row of [null,undefined,{}, {totp_enabled:true},{totp_enabled:null},{totp_enabled:0},{totp_enabled:''},{totp_enabled:'false'}])assert.equal(workerPasswordLoginAllowed(row),false);
});
test('password-login route selects second-factor state and gates password verification',()=>{
 const source=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');
 const login=source.slice(source.indexOf('    if (path === "/login")'),source.indexOf('    if (path === "/logout"'));
 assert.ok(login.includes('SELECT id,password,totp_enabled'));
 assert.ok(login.includes('if (workerPasswordLoginAllowed(row) &&'));
 assert.ok(login.indexOf('workerPasswordLoginAllowed(row)')<login.indexOf('newSession(db'));
});
test('existing Worker session identity lookup refuses enabled second-factor accounts',async()=>{
 const queries=[];
 const db={query:async(sql)=>{queries.push(sql);return {rows:sql.startsWith('UPDATE')?[{user_id:'synthetic-user'}]:[]};}};
 assert.equal(await getUser(new Request('https://synthetic.invalid/',{headers:{cookie:'cf_session='+'a'.repeat(64)}}),db),null);
 assert.equal(queries.length,2);
 assert.match(queries[1],/is_active AND totp_enabled=false/);
});
