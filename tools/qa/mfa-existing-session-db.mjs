// Synthetic DB only. Temporary shadow tables, rollback, no real account edits.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from '../../workers/revup-cf/node_modules/pg/lib/index.js';
import {getUser,sha256hex} from '../../workers/revup-cf/dist-test/index.mjs';
const filename=process.env.REVUP_JOURNEY_DATABASE_URL_FILE;
if(!filename)throw Error('Explicit synthetic DB file required');
const uri=(await readFile(filename,'utf8')).trim(),url=new URL(uri);
assert.equal(url.hostname,'ep-bitter-queen-b9t8xqfb-pooler.c-7.eu-central-1.aws.neon.tech');assert.equal(url.pathname,'/revup_journeys');
const db=new pg.Client({connectionString:uri,connectionTimeoutMillis:8000});await db.connect();
try{
 const b=(await db.query('SELECT * FROM cf_staging_boundary')).rows;assert.equal(b.length,1);assert.equal(b[0].synthetic_only,true);assert.equal(b[0].egress_disabled,true);
 await db.query('BEGIN');
 await db.query('CREATE TEMP TABLE accounts_user(id uuid,email text,name text,is_superuser boolean,is_active boolean,totp_enabled boolean) ON COMMIT DROP');
 await db.query('CREATE TEMP TABLE cf_sessions(token_hash text,user_id uuid,expires_at timestamptz,last_seen_at timestamptz) ON COMMIT DROP');
 let passes=0;
 for(const [i,mfa,active,expected] of [[1,false,true,true],[2,true,true,false],[3,false,false,false],[4,null,true,false]]){
  const id='aaaaaaaa-aaaa-4aaa-8aaa-'+String(i).padStart(12,'0');const token=String(i).repeat(64);
  await db.query('INSERT INTO accounts_user VALUES($1,$2,$3,false,$4,$5)',[id,'fictional-'+i+'@example.invalid','Fictional account',active,mfa]);
  await db.query("INSERT INTO cf_sessions VALUES($1,$2,now()+interval '1 hour',now())",[await sha256hex(token),id]);
  const result=await getUser(new Request('https://synthetic.invalid/',{headers:{cookie:'cf_session='+token}}),db);
  assert.equal(Boolean(result),expected);passes++;
 }
 console.log(passes+' actual PostgreSQL session checks passed: ordinary allowed; MFA, inactive and missing flag denied.');
}finally{await db.query('ROLLBACK');await db.end();}
