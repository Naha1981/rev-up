// Same-origin transport to the existing Django/allauth recovery implementation.
// No new token scheme, password logic, mail provider, account or schema change.
export interface RecoveryService { fetch(request:Request):Promise<Response>; }
export function isRecoveryPath(path:string):boolean {
 return path==='/forgot-password'||/^\/accounts\/password\/reset\/(?:done\/|key\/[-A-Za-z0-9_]+\/|key\/done\/)?$/.test(path);
}
const unavailable=()=>new Response('Password recovery is temporarily unavailable. No password has been changed. Please try again later.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'}});
export async function recoveryResponse(req:Request,service?:RecoveryService):Promise<Response>{
 const url=new URL(req.url);
 if(!isRecoveryPath(url.pathname)&&!isRecoveryAsset(url.pathname))return new Response('Not found',{status:404});
 if(isRecoveryAsset(url.pathname)&&req.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 if(!['GET','POST'].includes(req.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, POST'}});
 if(req.method==='POST'&&req.headers.get('origin')!==url.origin)return new Response('Origin not allowed',{status:403});
 if(!service)return unavailable();
 if(url.pathname==='/forgot-password')url.pathname='/accounts/password/reset/';
 // Never disclose Worker login/session cookies to the recovery service.
 const headers=new Headers(req.headers);headers.delete('authorization');
 const cookie=(headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>/^(csrftoken|sessionid)=/.test(x)).join('; ');
 if(cookie)headers.set('cookie',cookie);else headers.delete('cookie');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),75000);
 try{
  const upstream=await service.fetch(new Request(url,{method:req.method,headers,body:req.method==='POST'?await req.arrayBuffer():undefined,redirect:'manual',signal:controller.signal}));
  if(upstream.status>=500)return unavailable();
  const out=new Headers(upstream.headers);out.set('Cache-Control','no-store');out.delete('content-length');
  const location=out.get('location');if(location){const target=new URL(location,url);if(target.origin!==url.origin||(!isRecoveryPath(target.pathname)&&target.pathname!=='/login'))return unavailable();out.set('location',target.pathname+target.search+target.hash);}
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }catch{return unavailable();}finally{clearTimeout(timer);}
}

// Fixed reviewed host, never a URL from query/body/headers. Absent config fails
// closed; a service identity is not a public arbitrary-URL proxy.
export function hostedRecoveryService(backend:string|undefined,transport:typeof fetch=fetch):RecoveryService|undefined{
 if(backend!=='https://nahalabs-brightbean.onrender.com')return undefined;
 return {fetch:async request=>{
  const source=new URL(request.url),target=new URL(source.pathname+source.search,backend);
  const headers=new Headers(request.headers);
  headers.set('host',target.host);
  headers.set('accept-encoding','identity');
  headers.set('x-forwarded-host',source.host);
  headers.set('x-forwarded-proto',source.protocol.slice(0,-1));
  // Client-supplied forwarding values cannot choose a recovery origin.
  headers.delete('forwarded');
  const clientIP=headers.get('cf-connecting-ip');headers.delete('x-forwarded-for');if(clientIP)headers.set('x-forwarded-for',clientIP);
  return transport(new Request(target,{method:request.method,headers,body:request.method==='POST'?await request.arrayBuffer():undefined,redirect:'manual',signal:request.signal}));
 }};
}
export function isRecoveryAsset(path:string):boolean{
 return ['/static/css/dist/styles.css','/static/brand/revup-light.png','/static/favicon/apple-touch-icon.png','/static/favicon/favicon-96x96.png','/static/favicon/favicon.ico','/static/favicon/favicon.svg','/static/favicon/site.webmanifest','/static/js/alpine.min.js','/static/js/htmx.min.js','/static/js/password-toggle.js'].includes(path);
}
