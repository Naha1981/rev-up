// B DESIGN PROTOTYPE ONLY. Not imported by product or staging host.
// Requires explicit test-only adapter injection. No fetch or account keys.
const PRICES={starter:49900,growth:99900,'business-pro':199900};
export function prototypeCheckout({orgId,plan,origin,requestId},mockAdapter){
 if(mockAdapter?.syntheticOnly!==true||!Object.hasOwn(PRICES,plan)||!/^fictional-[a-z0-9-]+$/.test(orgId)||!/^fictional-[a-z0-9-]+$/.test(requestId))throw Error('Synthetic prototype only');
 const base=new URL(origin);if(base.protocol!=='https:'||!base.hostname.endsWith('.invalid'))throw Error('Fictional origin only');
 const invoice={id:requestId,orgId,plan,amount:PRICES[plan],currency:'ZAR',mode:'test',status:'pending'};
 const request={amount:invoice.amount,currency:'ZAR',metadata:{invoiceId:invoice.id},successUrl:base.origin+'/billing',cancelUrl:base.origin+'/billing',failureUrl:base.origin+'/billing'};
 return{invoice,request,idempotencyKey:invoice.id};
}
export async function prototypeReceipt(invoice,raw,headers,adapter){
 if(adapter?.syntheticOnly!==true||typeof adapter.verify!=='function')throw Error('Authenticated fixture adapter required');
 // Deliberately no hardcoded signature algorithm: exact merchant-scoped
 // webhook contract is a separate integration gate, not guessed from examples.
 const e=await adapter.verify(raw,headers);const p=e?.payload;
 if(e?.type!=='payment.succeeded'||!e.id||!p?.id||p.mode!=='test'||p.status!=='succeeded'||p.currency!==invoice.currency||p.amount!==invoice.amount||p.metadata?.invoiceId!==invoice.id||p.metadata?.checkoutId!==invoice.checkoutId||!invoice.checkoutId)throw Error('Receipt held');
 // Real implementation must atomically persist/dedupe receipt and grant;
 // this return value cannot activate an account or change entitlement.
 return{simulationOnly:true,invoiceId:invoice.id,paymentId:p.id,eventId:e.id,orgId:invoice.orgId,plan:invoice.plan};
}
