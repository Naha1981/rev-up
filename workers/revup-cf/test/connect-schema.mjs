import {Client} from 'pg';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {saveTenantKey,connectFailure} from '../dist-test/connect-errors.mjs';
const client=new Client({connectionString:(await readFile('/tmp/dburl.txt','utf8')).trim()});
await client.connect();
try {
 await client.query('BEGIN');
 await client.query('CREATE TEMP TABLE connect_schema_qa (LIKE receptionist_tenantmessagingconnection INCLUDING ALL) ON COMMIT DROP');
 const db={query:(q,v)=>client.query(q.replaceAll('receptionist_tenantmessagingconnection','connect_schema_qa'),v)};
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ws='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 await client.query('SAVEPOINT old_insert');
 try {await db.query("INSERT INTO receptionist_tenantmessagingconnection(id,workspace_id,api_key,profile_id,status,last_error,created_at,updated_at) VALUES($1,$2,'synthetic','profile','key_valid','',now(),now())",[id,ws]);assert.fail('old insert must fail');}
 catch(e){assert.equal(e.code,'23502');console.log('PASS: old missing-field insert reproduced NOT NULL failure');}
 await client.query('ROLLBACK TO SAVEPOINT old_insert');
 await saveTenantKey(db,id,ws,'synthetic-key','synthetic-profile');
 let row=(await client.query('SELECT * FROM connect_schema_qa')).rows[0];
 assert.equal(row.status,'key_valid');assert.equal(row.account_id,'');console.log('PASS: fixed initial key save');
 await connectFailure(db,ws,401);
 row=(await client.query('SELECT * FROM connect_schema_qa')).rows[0];assert.equal(row.status,'needs_attention');console.log('PASS: expired-key state saved');
 await saveTenantKey(db,id,ws,'synthetic-replacement','synthetic-profile');
 row=(await client.query('SELECT * FROM connect_schema_qa')).rows[0];assert.equal(row.status,'key_valid');assert.equal(row.last_error,'');assert.equal(row.api_key,'synthetic-replacement');console.log('PASS: re-key recovery via ON CONFLICT');
 const count=(await client.query('SELECT count(*) n FROM connect_schema_qa')).rows[0].n;assert.equal(count,'1');console.log('PASS: no duplicate connection');
}finally{await client.query('ROLLBACK');await client.end();console.log('Temporary fixtures rolled back; production rows untouched');}
