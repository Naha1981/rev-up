// Baseline policies that do not broaden production data disclosure. No
// includeSubDomains/preload: sibling applications are outside this release.
export function securityResponse(res:Response,path:string):Response{
 const h=new Headers(res.headers);
 h.set('Strict-Transport-Security','max-age=31536000');
 h.set('X-Content-Type-Options','nosniff');
 h.set('Referrer-Policy','strict-origin-when-cross-origin');
 h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 const embedded=path.startsWith('/f/');
 if(!embedded)h.set('X-Frame-Options','SAMEORIGIN');
 // The public enquiry form intentionally allows customer-site embedding.
 // Full nonce/hash script policy remains a separate audited UI migration;
 // do not silently break existing inline scripts or claim strict script CSP.
 h.set('Content-Security-Policy',"object-src 'none'; base-uri 'self'"+(embedded?'':"; frame-ancestors 'self'"));
 return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
}
