import type {Pool,PoolClient} from 'pg';
export type JobResult={name:string;ok:boolean;errorCode?:string};
export type CancellableJob={name:string;run:(signal:AbortSignal)=>Promise<void>;cancel:()=>Promise<void>};
// Cancellation must actually stop owned I/O. Arbitrary uncooperative code is
// reported unconfirmed, never called cancelled or safe to replay. No raw errors.
async function boundedJob(job:CancellableJob,timeoutMs:number,graceMs:number):Promise<JobResult>{
 const controller=new AbortController();let timedOut=false,timer:ReturnType<typeof setTimeout>;
 const run=Promise.resolve().then(()=>job.run(controller.signal));
 const observed=run.then(()=>true,()=>false); // Always observe late rejection.
 const outcome=await Promise.race([observed,new Promise<null>(resolve=>{timer=setTimeout(()=>{timedOut=true;controller.abort();resolve(null);},timeoutMs);})]);
 clearTimeout(timer!);
 if(!timedOut)return{name:job.name,ok:outcome===true,...(outcome===true?{}:{errorCode:'job_failed'})};
 let grace:ReturnType<typeof setTimeout>;
 const cancelled=Promise.resolve().then(()=>job.cancel()).then(async()=>{await observed;return true;},()=>false);
 const confirmed=await Promise.race([cancelled,new Promise<false>(resolve=>{grace=setTimeout(()=>resolve(false),graceMs);})]);
 clearTimeout(grace!);return{name:job.name,ok:false,errorCode:confirmed?'job_timeout':'cancellation_unconfirmed'};
}
export async function runIndependentJobs(jobs:CancellableJob[],cleanup:CancellableJob,timeoutMs=5000,graceMs=1000):Promise<JobResult[]>{
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||!Number.isInteger(graceMs)||graceMs<1||graceMs>5000)throw Error('invalid_job_deadline');
 const results:JobResult[]=[];
 try{for(const job of jobs)results.push(await boundedJob(job,timeoutMs,graceMs));}
 finally{const r=await boundedJob({...cleanup,name:'cleanup'},timeoutMs,graceMs);if(r.errorCode==='job_failed')r.errorCode='cleanup_failed';results.push(r);}
 return results;
}
// Dedicated client per DB job, destroyed on abort, never returned as reusable
// while a query may be pending. PostgreSQL statement_timeout is an independent
// server-side query cancellation, including pg_sleep and lock waits. No external
// I/O belongs in this callback. Caller must pass the same deadline to runner.
export function databaseJob(pool:Pool,name:string,timeoutMs:number,effects:(client:PoolClient,signal:AbortSignal)=>Promise<void>):CancellableJob{
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('invalid_job_deadline');
 let client:PoolClient|undefined,released=false;
 const destroy=()=>{if(client&&!released){released=true;client.release(true);}};
 return{name,cancel:async()=>{destroy();},run:async signal=>{
  const pending=pool.connect();let onAbort:()=>void;
  const c=await Promise.race([pending,new Promise<null>(resolve=>{onAbort=()=>{destroy();resolve(null);};if(signal.aborted)onAbort();else signal.addEventListener('abort',onAbort,{once:true});})]);
  if(!c){void pending.then(late=>late.release(true),()=>{});throw Error('job_aborted');}
  client=c;if(signal.aborted){destroy();throw Error('job_aborted');}
  try{
   await c.query('BEGIN');await c.query(`SET LOCAL statement_timeout='${timeoutMs}ms'`);await c.query(`SET LOCAL lock_timeout='${timeoutMs}ms'`);
   await effects(c,signal);if(signal.aborted)throw Error('job_aborted');await c.query('COMMIT');
  }catch(e){if(!released)await c.query('ROLLBACK').catch(()=>{});throw e;}
  finally{signal.removeEventListener('abort',onAbort!);destroy();}
 }};
}
