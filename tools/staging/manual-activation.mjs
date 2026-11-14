// ISOLATED CANDIDATE ONLY. No product import or live Yoco integration.
const PRICES={starter:49900,growth:99900,'business-pro':199900};
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export async function activateSynthetic(db,{actorId,orgId,requestId,paymentId,paymentReference,plan,amountCents,currency,evidenceRef,receiptVerified},env){
 if(env.REVUP_STAGING_ONLY!=='1')throw Error('Isolated activation only');
 if(!uuid(actorId)||!uuid(orgId)||!uuid(requestId)||!/^fictional-[A-Za-z0-9-]{1,100}$/.test(paymentId||'')||!/^RU-[A-F0-9]{8}$/.test(paymentReference||'')||!Object.hasOwn(PRICES,plan)||PRICES[plan]!==amountCents||currency!=='ZAR'||evidenceRef!=='synthetic://yoco-receipts/'+paymentId||receiptVerified!==true)throw Error('Receipt facts not verified');
 const c=await db.connect();try{await c.query('BEGIN');const b=(await c.query('SELECT marker,synthetic_only,egress_disabled FROM cf_staging_boundary')).rows;
 if(b.length!==1||!['revup-full-journey-11nov2026','revup-full-journey-14nov2026'].includes(b[0].marker)||!b[0].synthetic_only||!b[0].egress_disabled)throw Error('Wrong boundary');
 const actor=(await c.query('SELECT is_active,is_superuser FROM accounts_user WHERE id=$1 FOR SHARE',[actorId])).rows[0];if(!actor||actor.is_active!==true||actor.is_superuser!==true)throw Error('Operator not authorised');
 // Serialise duplicate payment IDs even when they target different org rows.
 await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['synthetic-yoco:'+paymentId]);
 const previous=(await c.query('SELECT * FROM cf_manual_activation_receipt WHERE payment_id=$1 OR id=$2',[paymentId,requestId])).rows;
 if(previous.length){const p=previous[0];if(previous.length!==1||p.payment_id!==paymentId||p.id!==requestId||p.organization_id!==orgId||p.plan!==plan||p.amount_cents!==amountCents||p.currency!==currency||p.payment_reference!==paymentReference||p.evidence_ref!==evidenceRef)throw Error('Receipt identity conflicts');await c.query('COMMIT');return{status:'duplicate',receiptId:p.id,environment:'synthetic'}}
 const org=(await c.query('SELECT id,subscription_status,payment_reference FROM organizations_organization WHERE id=$1 AND deleted_at IS NULL AND access_suspended_at IS NULL FOR UPDATE',[orgId])).rows[0];
 if(!org||org.payment_reference!==paymentReference||!['pending_activation','expired'].includes(org.subscription_status))throw Error('Organisation is not eligible');
 await c.query(`INSERT INTO cf_manual_activation_receipt(id,provider,environment,payment_id,organization_id,payment_reference,plan,amount_cents,currency,evidence_ref,actor_user_id,previous_status) VALUES($1,'yoco','synthetic',$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[requestId,paymentId,orgId,paymentReference,plan,amountCents,currency,evidenceRef,actorId,org.subscription_status]);
 await c.query("UPDATE organizations_organization SET plan=$1,subscription_status='active',activated_at=COALESCE(activated_at,now()),updated_at=now() WHERE id=$2",[plan,orgId]);await c.query('COMMIT');return{status:'activated',receiptId:requestId,environment:'synthetic'};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
export async function activationResponse(req,db,env,resolveUser){
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers:{allow:'POST'}});
 if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('x-revup-operator-action')!=='verify-yoco-receipt'||!req.headers.get('content-type')?.startsWith('application/json'))return new Response('Forbidden',{status:403});
 const user=await resolveUser(req,db);if(!user||!user.is_superuser)return new Response('Forbidden',{status:403});
 try{const body=await req.json();delete body.actorId;return Response.json(await activateSynthetic(db,{...body,actorId:user.id},env),{headers:{'cache-control':'no-store'}})}catch{return Response.json({error:'Activation held. Check the receipt, organisation and operator authority.'},{status:409,headers:{'cache-control':'no-store'}})}
}
