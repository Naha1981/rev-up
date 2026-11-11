export type JobResult={name:string;ok:boolean;errorCode?:string};
// Cleanup always runs; one failed job cannot skip an independent later job.
export async function runIndependentJobs(jobs:Array<{name:string;run:()=>Promise<void>}>,cleanup:()=>Promise<void>):Promise<JobResult[]>{
 const results:JobResult[]=[];
 try{for(const job of jobs){try{await job.run();results.push({name:job.name,ok:true});}catch{results.push({name:job.name,ok:false,errorCode:'job_failed'});}}}
 finally{try{await cleanup();results.push({name:'cleanup',ok:true});}catch{results.push({name:'cleanup',ok:false,errorCode:'cleanup_failed'});}}
 return results;
}
