import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('signup leaves unused encrypted authenticator recovery field null, never plaintext JSON',()=>{
 const s=readFileSync(new URL('../src/index.ts',import.meta.url),'utf8');
 const signup=s.slice(s.indexOf('    if (path === "/signup")'),s.indexOf('    if (path === "/login")'));
 assert.ok(signup.includes('totp_recovery_codes'));
 assert.ok(signup.includes("VALUES($1,$2,$3,$4,false,true,false,false,NULL,now(),now(),'',now())"));
 assert.ok(!signup.includes("false,true,false,false,'[]'::jsonb"));
});
