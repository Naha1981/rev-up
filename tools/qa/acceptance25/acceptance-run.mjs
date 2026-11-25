import {fileURLToPath}from'node:url';import{resolve,dirname}from'node:path';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');const WORK=process.env.REVUP_QA_WORK||'/tmp/revup25';
import EmbeddedPostgres from 'embedded-postgres';
import {spawnSync} from 'node:child_process';
const pg = new EmbeddedPostgres({databaseDir:WORK+'/pgdata',user:'sandbox',port:55431,authMethod:'password',persistent:false,autoRehydrateSymlinks:true,initdbFlags:['--auth=trust'],onLog:()=>{}});
try {
 await pg.initialise();await pg.start();
 await pg.createDatabase('brightbean_test');
 const env={PATH:process.env.PATH,HOME:process.env.HOME,DJANGO_SETTINGS_MODULE:'config.settings.test',DB_USER:'sandbox',DB_HOST:'127.0.0.1',DB_PORT:'55431',SECRET_KEY:'synthetic-acceptance-not-production',ENCRYPTION_KEY_SALT:'synthetic-acceptance-not-production',APP_URL:'http://127.0.0.1:8787'};
 const out=spawnSync(process.env.REVUP_QA_PYTHON||WORK+'/pyenv312/bin/python',['manage.py','migrate','--noinput'],{cwd:ROOT,env,encoding:'utf8'});
 console.log(out.stdout,out.stderr);if(out.status)throw Error('migrate failed');
 const {Client}=await import('pg');const client=new Client({connectionString:'postgresql://sandbox@127.0.0.1:55431/brightbean_test'});await client.connect();
 await client.query(await import('node:fs/promises').then(fs=>fs.readFile(ROOT+'/tools/qa/worker-test-schema.sql','utf8')));
 await client.query("CREATE TABLE cf_staging_boundary(marker text PRIMARY KEY,synthetic_only boolean,egress_disabled boolean); INSERT INTO cf_staging_boundary VALUES('revup-full-journey-14nov2026',true,true)");await client.end();
 const seed=spawnSync(process.env.REVUP_QA_PYTHON||WORK+'/pyenv312/bin/python',['manage.py','shell','-c',"from apps.accounts.models import User; u=User.objects.create(email='operator@example.invalid',name='SYNTHETIC Operator',is_superuser=True,is_staff=True,is_active=True); u.set_unusable_password(); u.save()"],{cwd:ROOT,env,encoding:'utf8'});console.log(seed.stdout,seed.stderr);if(seed.status)throw Error('seed failed');
 const {spawn}=await import('node:child_process');const server=spawn('node',[ROOT+'/tools/qa/acceptance25/bridge.mjs'],{cwd:WORK,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Synthetic bridge did not become ready')),10000);server.once('error',reject);server.once('exit',code=>reject(Error('Synthetic bridge exited '+code)));server.stdout.once('data',()=>{clearTimeout(timer);resolve();});});
 try{const journey=spawnSync('node',[ROOT+'/tools/qa/acceptance25/journey.mjs'],{cwd:WORK,env,encoding:'utf8',timeout:120000});console.log(journey.stdout,journey.stderr,'journey-exit',journey.status);if(journey.status!==0)throw Error('Browser acceptance failed');}finally{server.kill();}

 const recovery=spawnSync('node',[ROOT+'/tools/qa/acceptance25/browser-proof.mjs'],{cwd:WORK,env:{...env,REVUP_QA_PYTHON:process.env.REVUP_QA_PYTHON||WORK+'/pyenv312/bin/python',REVUP_QA_WORK:WORK},encoding:'utf8',timeout:90000});console.log('recovery',recovery.stdout,recovery.stderr,recovery.status);if(recovery.status!==0)throw Error('Synthetic recovery acceptance failed');
}finally{await pg.stop();}
