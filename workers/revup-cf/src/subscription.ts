import SparkMD5 from 'spark-md5';
export type PaymentEnv={PF_MERCHANT_ID?:string;PF_PASSPHRASE?:string;PF_SANDBOX?:string};
export function subscriptionHeaders(env:PaymentEnv,timestamp:string){
 if(!env.PF_MERCHANT_ID || !env.PF_PASSPHRASE)throw new Error('Subscription management is not configured');
 const fields:Record<string,string>={'merchant-id':env.PF_MERCHANT_ID,version:'v1',timestamp,passphrase:env.PF_PASSPHRASE};
 const enc=(x:string)=>encodeURIComponent(x).replace(/%20/g,'+').replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
 const signature=SparkMD5.hash(Object.keys(fields).sort().map(k=>k+'='+enc(fields[k])).join('&'));
 return {'merchant-id':env.PF_MERCHANT_ID,version:'v1',timestamp,signature};
}
export async function cancelRecurring(env:PaymentEnv,token:string,send:typeof fetch=fetch){
 if(!/^[a-f0-9-]{36}$/i.test(token))throw new Error('Subscription reference is invalid');
 const headers=subscriptionHeaders(env,new Date().toISOString().replace(/\.\d{3}Z$/,'+0000'));
 const testing=env.PF_SANDBOX==='false'?'':'?testing=true';
 const r=await send('https://api.payfast.co.za/subscriptions/'+token+'/cancel'+testing,{method:'PUT',headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Cancellation was not confirmed. Your plan has not changed.');
 let result:any;try{result=await r.json()}catch{throw new Error('Cancellation confirmation could not be read. Check status before trying again.')}
 if(result.status!=='success'||result.code!==200)throw new Error('Cancellation was not confirmed. Your plan has not changed.');
}
