// DESIGN SIMULATION ONLY. Not imported by Worker. No payment API, keys or DB.
import assert from 'node:assert/strict';
const invoice={id:'fictional-invoice',org:'fictional-org-A',account:'fictional-merchant',checkout:'fictional-checkout',amount:49900,currency:'ZAR',plan:'starter',mode:'test'};
function receive(state,event,{signatureVerified=false,account,mode}={}){
 if(!signatureVerified||account!==invoice.account||mode!=='test')return 'rejected';
 if(event.type!=='payment.succeeded'||event.payload?.status!=='succeeded'||event.payload.mode!==invoice.mode)return 'held';
 const p=event.payload;if(p.metadata?.checkoutId!==invoice.checkout||p.amount!==invoice.amount||p.currency!==invoice.currency||p.metadata?.org!==invoice.org||!event.id||!p.id)return 'held';
 if(state.events.has(event.id)||state.payments.has(p.id))return 'duplicate';
 // A real implementation must do all of these under database locks/uniques,
 // using stored invoice ownership, never trusting metadata for org selection.
 state.events.add(event.id);state.payments.add(p.id);state.org={id:invoice.org,status:'active',plan:invoice.plan,source:'SIMULATION_ONLY'};return 'simulated activation';
}
const options={signatureVerified:true,account:invoice.account,mode:'test'},valid={id:'fictional-event',type:'payment.succeeded',payload:{id:'fictional-payment',status:'succeeded',mode:'test',amount:49900,currency:'ZAR',metadata:{checkoutId:invoice.checkout,org:invoice.org}}};
const state=()=>({events:new Set(),payments:new Set(),org:{id:invoice.org,status:'pending_activation'}});
let s=state();assert.equal(receive(s,valid,options),'simulated activation');assert.equal(s.org.source,'SIMULATION_ONLY');assert.equal(receive(s,valid,options),'duplicate');assert.equal(receive(s,{...valid,id:'different-event'},options),'duplicate');
for(const change of [{amount:49899},{currency:'USD'},{mode:'live'},{status:'failed'},{metadata:{checkoutId:'wrong',org:invoice.org}},{metadata:{checkoutId:invoice.checkout,org:'foreign-org'}}]){let s=state();assert.equal(receive(s,{...valid,payload:{...valid.payload,...change}},options),'held');assert.equal(s.org.status,'pending_activation')}
for(const change of [{signatureVerified:false},{account:'foreign-merchant'},{mode:'live'}]){let s=state();assert.equal(receive(s,valid,{...options,...change}),'rejected');assert.equal(s.org.status,'pending_activation')}
console.log('SIMULATION_ONLY: happy/duplicate-event/duplicate-payment/amount/currency/mode/status/checkout/org/signature/account gates; no Yoco request, DB edit, payment verification, activation or product proof.');
