// src/presets.ts
var PRESETS = {
  "general": { "label": "General / other", "radar_keywords": [], "post_themes": ["Industry news with a local angle", "Customer questions answered", "Behind-the-scenes"], "hashtags": [], "responder_tone": "warm and professional", "responder_questions": [], "responder_faqs": [] },
  "restaurant": { "label": "Restaurants & Food", "radar_keywords": ["restaurant", "food", "menu", "chef", "eatery", "takeaway", "braai", "cuisine", "dining", "coffee", "bakery", "catering", "halaal", "vegan"], "post_themes": ["Today's specials and limited-time dishes", "Behind the pass: meet the kitchen", "Customer favourites and reviews", "Weekend and payday promos", "Local food culture and events"], "hashtags": ["#JoburgEats", "#SAFoodie"], "responder_tone": "warm and welcoming", "responder_questions": ["Would you like a table, and for how many people?", "Is this for today or another day - and what time suits you?", "Any dietary needs we should know about (halaal, vegetarian, allergies)?"], "responder_faqs": ["Do I need to book, or can I walk in?", "What's on the menu today?", "Do you deliver or offer collection?"] },
  "real_estate": { "label": "Real Estate", "radar_keywords": ["property", "housing", "bond", "mortgage", "transfer", "estate", "rental", "conveyancing", "suburb"], "post_themes": ["Rate moves and what they mean for buyers", "Suburb spotlight", "Listing marketing tips", "First-time buyer guidance"], "hashtags": ["#PropertySA", "#RealEstateSA"], "responder_tone": "warm and professional", "responder_questions": ["What price range are you working with?", "Are you pre-approved for a bond, or buying cash?", "Would a weekday late afternoon or a Saturday morning suit you better?"], "responder_faqs": ["Is the property still available?", "Can I book a viewing?", "What are the transfer costs?"] },
  "dental": { "label": "Dentists & Clinics", "radar_keywords": ["dental", "dentist", "clinic", "healthcare", "medical aid", "teeth", "oral", "health"], "post_themes": ["Oral health tips patients actually read", "Medical aid and payment options", "New treatment announcements", "School-holiday checkup reminders"], "hashtags": ["#DentalCareSA", "#HealthySmile"], "responder_tone": "caring and reassuring", "responder_questions": ["Is this for a check-up, or is something bothering you?", "Do you have medical aid, and if so which one?", "Would a morning or afternoon appointment suit you better?"], "responder_faqs": ["Do you accept my medical aid?", "How do I book an appointment?", "Do you see children?"] },
  "auto": { "label": "Car Dealers", "radar_keywords": ["car", "vehicle", "auto", "dealership", "bakkie", "sedan", "suv", "fuel", "petrol", "diesel"], "post_themes": ["Fuel price moves and what they mean for buyers", "New stock announcements", "Finance and trade-in explainers", "Weekend test-drive invites"], "hashtags": ["#CarsSA", "#AutoDealer"], "responder_tone": "helpful and energetic", "responder_questions": ["What's your budget range?", "Are you trading in, and do you need finance?", "When suits you for a test drive - weekday or Saturday?"], "responder_faqs": ["Is this vehicle still in stock?", "Can I book a test drive?", "Do you take trade-ins?"] },
  "panel_beater": { "label": "Panel Beaters & Body Shops", "radar_keywords": ["panel beater", "panel beating", "body shop", "spray paint", "dent repair", "scratch repair", "accident repair", "bumper", "hail damage", "insurance claim"], "post_themes": ["Before-and-after repair transformations", "How the insurance claim process works", "Hail and dent season readiness", "What a proper respray involves"], "hashtags": ["#PanelBeaterSA", "#AutoBodySA"], "responder_tone": "reassuring and practical", "responder_questions": ["Can you send photos of the damage?", "What is the make, model and year of the vehicle?", "Is this going through insurance, or is it a private repair?"], "responder_faqs": ["How do I get a quote for the damage?", "Do you work with my insurance?", "How long will the repair take?"] },
  "auto_electrician": { "label": "Auto Electricians", "radar_keywords": ["auto electrician", "auto electrical", "car battery", "alternator", "starter motor", "wiring", "ecu", "immobiliser", "car alarm", "central locking"], "post_themes": ["Warning lights and what they mean", "Battery care in winter and summer", "Common electrical faults by make", "When a rewire beats another patch"], "hashtags": ["#AutoElectricianSA", "#CarElectrical"], "responder_tone": "clear and methodical", "responder_questions": ["What is the make, model and year of the vehicle?", "What is it doing - any warning lights, or does it fail to start?", "Is the vehicle with you, or stranded somewhere?"], "responder_faqs": ["Can you diagnose a warning light?", "Do you replace batteries and alternators?", "Can you come to the vehicle?"] },
  "funeral": { "label": "Funeral Services", "radar_keywords": ["funeral", "memorial", "burial", "cremation", "tombstone", "hearse", "mourning", "condolences", "funeral cover", "undertaker"], "post_themes": ["What to do first when a death occurs", "Planning ahead: what families should know", "Cover plans explained in plain language", "Honouring a loved one: memorial ideas", "Supporting grieving families in our community"], "hashtags": ["#FuneralServicesSA", "#GriefSupport"], "responder_tone": "compassionate and unhurried", "responder_questions": ["Is this about arrangements needed now, or planning ahead?", "Do you have a policy or cover plan with us - and the policy number, if so?", "What is the best number to call you back on?"], "responder_faqs": ["What cover plans do you offer, and what do they cost per month?", "What do we do first when a death occurs?", "How do we claim on a policy?"] },
  "plumber": { "label": "Plumbing", "radar_keywords": ["plumber", "geyser", "burst pipe", "drain", "leak", "blocked", "tap", "sewer"], "post_themes": ["Geyser failures before winter - what to check", "Burst pipe? What to do in the first 10 minutes", "Water-saving fixes that cut your bill", "Emergency call-out vs booked job - what costs what"], "hashtags": ["#PlumberSA", "#GeyserHelp"], "responder_tone": "calm and practical", "responder_questions": ["Where is the problem - and is water still running?", "Is this an emergency or can it wait for a booked slot?", "Which suburb are you in?"], "responder_faqs": ["Do you charge a call-out fee?", "How much to replace a geyser?", "Are you available after hours?"] },
  "electrician": { "label": "Electrical", "radar_keywords": ["electrician", "electrical", "power trip", "db board", "coc", "compliance certificate", "wiring", "lights"], "post_themes": ["Load-shedding prep: what a healthy DB board looks like", "Why your power keeps tripping", "Compliance certificates when selling your home", "Safe generator and inverter connections"], "hashtags": ["#ElectricianSA", "#PowerTrip"], "responder_tone": "reassuring and safety-first", "responder_questions": ["Is there any burning smell or exposed wiring? If yes, switch off at the main breaker.", "Which area are you in?", "Is the whole house out or one circuit?"], "responder_faqs": ["Do you issue COC certificates?", "How much is a call-out?", "Can you connect an inverter?"] },
  "security": { "label": "Security", "radar_keywords": ["security", "alarm", "cctv", "armed response", "access control", "electric fence", "beams", "guarding"], "post_themes": ["Holiday security checklist for your home", "Alarm systems vs CCTV - what actually deters", "How armed response times really work", "Gate motor and beam maintenance"], "hashtags": ["#SecuritySA", "#HomeSafety"], "responder_tone": "alert and trustworthy", "responder_questions": ["Is this for a home or business?", "Do you need a new install or a repair/upgrade?", "Which suburb or complex?"], "responder_faqs": ["Do you do free assessments?", "What does armed response cost monthly?", "Can you take over an existing alarm?"] },
  "solar": { "label": "Solar / inverters", "radar_keywords": ["solar", "inverter", "battery", "panels", "load shedding", "eskom", "backup power", "pv"], "post_themes": ["What size inverter does your home actually need", "Solar payback periods in SA right now", "Battery care through load-shedding cycles", "Eskom tariff hikes vs going solar"], "hashtags": ["#SolarSA", "#LoadShedding"], "responder_tone": "knowledgeable and straight-talking", "responder_questions": ["What is your average monthly electricity bill?", "Do you want backup only or full solar?", "House or business premises?"], "responder_faqs": ["How much does a basic backup system cost?", "How long does installation take?", "Do you offer finance?"] },
  "mobile-mechanic": { "label": "Mobile mechanic", "radar_keywords": ["mobile mechanic", "car service", "breakdown", "battery", "brakes", "car won't start", "roadside"], "post_themes": ["Your car won't start - the 3 most common causes", "Why mobile servicing beats sitting in a workshop queue", "Brake warning signs you should never ignore", "Pre-holiday vehicle checks"], "hashtags": ["#MobileMechanic", "#CarServiceSA"], "responder_tone": "helpful and down-to-earth", "responder_questions": ["What make, model and year is the vehicle?", "Where is the vehicle parked right now?", "Does it start, or is it completely dead?"], "responder_faqs": ["Do you come to my home or work?", "What does a basic service cost?", "Do you charge for diagnostics?"] },
  "towing": { "label": "Towing / roadside", "radar_keywords": ["towing", "tow truck", "breakdown", "accident", "roadside assist", "flat tyre", "recovery"], "post_themes": ["What to do right after a breakdown on the N1", "Flat tyre on the highway - stay safe first", "How towing fees work and what insurance covers", "Why response time matters more than price"], "hashtags": ["#TowingSA", "#RoadsideAssist"], "responder_tone": "fast, calm and reassuring", "responder_questions": ["Where exactly is the vehicle - nearest landmark or pin?", "Is anyone injured or in danger?", "What vehicle is it and can it roll?"], "responder_faqs": ["How much to tow within town?", "Do you work with my insurance?", "How long until a truck reaches me?"] },
  "hvac": { "label": "Aircon / refrigeration", "radar_keywords": ["aircon", "air conditioning", "hvac", "refrigeration", "cold room", "regas", "split unit"], "post_themes": ["Summer is coming - book your aircon service now", "Why your aircon is blowing warm air", "Cold room care for restaurants and butcheries", "Inverter aircons vs older units on your bill"], "hashtags": ["#AirconSA", "#HVac"], "responder_tone": "efficient and friendly", "responder_questions": ["Service, repair or new installation?", "What type of unit and roughly how old?", "Home or business?"], "responder_faqs": ["How much is an aircon service?", "Do you regas units?", "Can you supply and install?"] },
  "roofing": { "label": "Roofing / waterproofing", "radar_keywords": ["roof", "roofing", "waterproofing", "leak", "gutters", "thatch", "ibr", "torch-on"], "post_themes": ["Rain season checklist: find leaks before they find you", "Waterproofing flat roofs - what lasts and what fails", "Gutter cleaning before the storms", "IBr vs tile vs thatch - honest pros and cons"], "hashtags": ["#RoofingSA", "#Waterproofing"], "responder_tone": "solid and dependable", "responder_questions": ["Where is the leak or problem area?", "What type of roof do you have?", "Can you share a photo?"], "responder_faqs": ["Do you guarantee waterproofing work?", "How much per square metre?", "Do you do free quotes?"] },
  "gates-access": { "label": "Gates / fencing / access control", "radar_keywords": ["gate motor", "electric gate", "fencing", "access control", "intercom", "palisade", "centurion"], "post_themes": ["Gate motor battery care during load shedding", "Palisade vs clear-view fencing for your property", "Access control for complexes and offices", "Why gates fail after power surges"], "hashtags": ["#GateMotors", "#FencingSA"], "responder_tone": "prompt and security-minded", "responder_questions": ["Is the gate stuck open or closed right now?", "What motor brand do you have?", "Home, complex or business?"], "responder_faqs": ["Do you repair Centurion motors?", "How much is a new gate motor installed?", "Do you do intercoms?"] },
  "pest-control": { "label": "Pest control", "radar_keywords": ["pest control", "termites", "cockroaches", "rats", "fumigation", "ants", "bed bugs"], "post_themes": ["Termite season in SA - early signs in your home", "Why cockroaches come back after shop sprays", "Bed bugs: what actually gets rid of them", "Rodent proofing before winter"], "hashtags": ["#PestControlSA", "#Fumigation"], "responder_tone": "discreet and thorough", "responder_questions": ["What pest are you seeing and where?", "How big is the property?", "Any kids or pets we should plan around?"], "responder_faqs": ["Is treatment safe for children and pets?", "How much for a once-off treatment?", "Do you guarantee the work?"] },
  "property-maintenance": { "label": "Property maintenance", "radar_keywords": ["maintenance", "handyman", "repairs", "painting", "complex maintenance", "facilities"], "post_themes": ["The maintenance schedule every complex needs", "Small repairs that stop big insurance claims", "Painting season: prep work that makes it last", "One call, whole-list handyman days"], "hashtags": ["#PropertyMaintenance", "#HandymanSA"], "responder_tone": "reliable and organised", "responder_questions": ["What is on the repair list?", "Is this a once-off or ongoing maintenance?", "Home, complex or office park?"], "responder_faqs": ["Do you charge per job or per day?", "Do you do complex contracts?", "Can I send photos for a quote?"] },
  "container-transport": { "label": "Container transport", "radar_keywords": ["container", "transport", "logistics", "freight", "shipping container", "haulage", "delivery"], "post_themes": ["Container transport rates - what drives the price", "Port delays and how to plan around them", "Buying vs hiring containers for storage", "Cross-border freight basics for small importers"], "hashtags": ["#LogisticsSA", "#ContainerTransport"], "responder_tone": "direct and dependable", "responder_questions": ["What size container and what route?", "One trip or regular loads?", "Any crane or side-loader needs on site?"], "responder_faqs": ["What does a 6m container move cost?", "Do you do cross-border?", "How far ahead must I book?"] },
  "pool": { "label": "Pool services", "radar_keywords": ["pool", "pool pump", "green pool", "pool cleaning", "marbelite", "pool repairs"], "post_themes": ["Green pool rescue - the 5-day turnaround", "Winter pool care that saves you money", "Pump and filter basics every owner should know", "Heating options to stretch your swim season"], "hashtags": ["#PoolServicesSA", "#PoolCare"], "responder_tone": "friendly and knowledgeable", "responder_questions": ["Weekly service or a once-off cleanup?", "Roughly what size is the pool?", "Is the water green right now?"], "responder_faqs": ["How much is a weekly pool service?", "Do you repair pumps?", "Can you fix a green pool?"] },
  "aesthetics": { "label": "Aesthetics / cosmetic clinic", "radar_keywords": ["aesthetics", "botox", "fillers", "skin clinic", "laser", "facial", "anti-ageing"], "post_themes": ["What a first consultation actually involves", "Skincare routines that work in the SA climate", "Laser vs peels - honest guidance", "Safe treatments only: questions to ask any clinic"], "hashtags": ["#AestheticsSA", "#SkinClinic"], "responder_tone": "warm, discreet and professional", "responder_questions": ["Which treatment are you interested in?", "Is this your first visit to an aesthetics clinic?", "Would you like a consultation first?"], "responder_faqs": ["How much is a consultation?", "Are treatments done by a doctor?", "Do you have before-and-after photos?"] },
  "property-management": { "label": "Property management", "radar_keywords": ["property management", "rental", "levy", "body corporate", "tenant", "sectional title", "landlord"], "post_themes": ["Levy increases explained plainly", "How good management protects your property value", "Tenant vetting that prevents problems", "AGM season: what owners should ask"], "hashtags": ["#PropertyManagement", "#RentalsSA"], "responder_tone": "professional and organised", "responder_questions": ["Complex, single rental or portfolio?", "How many units?", "Are you an owner, trustee or landlord?"], "responder_faqs": ["What do your management fees cover?", "Do you handle maintenance?", "How do you screen tenants?"] },
  "legal": { "label": "Law firm", "radar_keywords": ["lawyer", "attorney", "legal", "contract", "estate", "conveyancing", "litigation", "deceased estate"], "post_themes": ["Why every adult needs a will - plainly explained", "Buying a house? What conveyancing actually covers", "Contracts: the clauses that cost people money", "What to bring to a first legal consultation"], "hashtags": ["#AttorneysSA", "#LegalAdvice"], "responder_tone": "measured and trustworthy", "responder_questions": ["What area of law does this involve?", "Is the matter urgent?", "Have you worked with an attorney before?"], "responder_faqs": ["What does a consultation cost?", "Do you do free first meetings?", "Which areas of law do you cover?"] },
  "financial-broker": { "label": "Financial / insurance broker", "radar_keywords": ["insurance", "broker", "medical aid", "life cover", "short-term", "funeral cover", "investment"], "post_themes": ["Insurance reviews: why January matters", "Medical aid vs hospital plan - the real difference", "Life cover milestones: marriage, kids, bond", "Short-term insurance: what your premium actually buys"], "hashtags": ["#InsuranceSA", "#FinancialAdvice"], "responder_tone": "clear and trustworthy", "responder_questions": ["What cover are you looking at - life, medical, car, home?", "Are you reviewing existing cover or starting fresh?", "When did you last compare your policies?"], "responder_faqs": ["Do you charge for advice?", "Which providers do you work with?", "Can you beat my current premium?"] },
  "catering": { "label": "Catering / food truck", "radar_keywords": ["catering", "food truck", "events catering", "platters", "wedding catering", "spit braai"], "post_themes": ["Wedding catering: what to book first", "Spit braai season is here", "Corporate platters that actually impress", "Food truck Fridays - where to find us"], "hashtags": ["#CateringSA", "#SpitBraai"], "responder_tone": "warm and appetising", "responder_questions": ["What event and how many guests?", "What date and venue?", "Any dietary requirements?"], "responder_faqs": ["How much per person?", "Do you cater for halaal or vegetarian guests?", "How far ahead must we book?"] },
  "trades": { "label": "Trades (general building & repairs)", "radar_keywords": ["builder", "renovation", "building", "repairs", "construction", "alterations", "paving"], "post_themes": ["Renovations: the order of work that saves money", "NHBRC and why it matters for your build", "Small jobs welcome - why that matters", "Planning permission basics for additions"], "hashtags": ["#BuildersSA", "#Renovations"], "responder_tone": "straightforward and capable", "responder_questions": ["What work do you need done?", "Do you have plans or need them drawn?", "What is your rough budget range?"], "responder_faqs": ["Do you do small jobs?", "Are you NHBRC registered?", "How do your quotes work?"] }
};
var ALIAS = { "auto-workshop": "auto", "real-estate": "real_estate" };
function getPreset(industry) {
  const k = (industry || "general").trim();
  return PRESETS[k] || PRESETS[ALIAS[k]] || PRESETS[k.replace(/-/g, "_")] || PRESETS.general;
}

// src/receptionist.ts
var SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c";
var SANDBOX_SEND_ALLOWLIST = /* @__PURE__ */ new Set(["27672347593", "27612980377"]);
var OPT_OUT = /* @__PURE__ */ new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
var PLAN_ALLOWANCE = { starter: 500, growth: 1e3, "business-pro": 2500 };
var MAX_SENDS_HOUR = 60;
var MAX_SENDS_DAY = 300;
var MAX_DRAFTS_DAY = 300;
var ESCALATION = [
  /\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b/i,
  /\b(complaint|sue|lawyer|attorney|refund)\b/i,
  /\b(died|death|passed away|deceased)\b/i,
  /\b(emergency|urgent|burst|flooding|no power|sparking)\b/i
];
var RULES = "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); no emojis; never mention you are an AI unless asked. When the customer sends photos, acknowledge them by count and never describe, diagnose or price what might be in them - a person from the team assesses photos. IMPORTANT: the business information above is the COMPLETE list of what this business offers. If the customer asks about a service, product, price or policy that is not listed there, do NOT say yes and do NOT say no - say a person from the team will confirm. If you do not know, say a person will confirm.";
async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function verifyZernioSignature(secret, body, signature) {
  if (!secret || !signature) return false;
  const expected = await hmacHex(secret, body);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
function industryBrief(industry) {
  const p = getPreset(industry || "general");
  const label = p.label || "local service";
  let s = `You are the WhatsApp receptionist for a ${label} business in South Africa. Tone: ${p.responder_tone || "warm and professional"}.`;
  const qs = p.responder_questions || [];
  if (qs.length) s += ` When the customer wants to book or buy, gather: ${qs.join(" ")}`;
  const faqs = p.responder_faqs || [];
  if (faqs.length) s += ` Common customer questions: ${faqs.join(" ")}`;
  return s;
}
function profileBlock(p) {
  const lines = [`Business: ${p.business_name || ""}`];
  if (p.operating_hours && Object.keys(p.operating_hours).length) lines.push(`Operating hours: ${JSON.stringify(p.operating_hours)}`);
  if (p.pricing_data && Object.keys(p.pricing_data).length) lines.push(`Price list (ZAR): ${JSON.stringify(p.pricing_data)}`);
  if (p.call_out_fee != null) lines.push(`Call-out fee: R${p.call_out_fee}`);
  if (p.payment_link_url) lines.push("Payments are taken by secure link; share it only when a customer is ready to pay.");
  if (p.custom_rules && Object.keys(p.custom_rules).length) lines.push(`Standing rules from the owner: ${JSON.stringify(p.custom_rules)}`);
  return lines.join("\n");
}
function customerBlock(c) {
  if (!c) return "";
  const lines = [];
  if (c.name) lines.push(`Customer name: ${c.name}`);
  if (c.is_vip) lines.push("This customer is a VIP - treat them especially well.");
  if (c.visit_count) lines.push(`They have visited ${c.visit_count} time${c.visit_count === 1 ? "" : "s"} before.`);
  if (c.dietary_notes) lines.push(`Dietary needs: ${c.dietary_notes}`);
  return lines.join("\n");
}
async function groqDraft(apiKey, prompt) {
  let lastErr = "no response";
  for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, temperature: 0.2, max_tokens: 800, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const m = content.match(/\{.*\}/s);
        if (m) return m[0];
        lastErr = "no JSON in reply";
      } catch (e) {
        lastErr = String(e).slice(0, 120);
      }
    }
  }
  throw new Error(lastErr);
}
async function handleZernioWebhook(db, env, payload) {
  if ((payload.event || "") !== "message.received") return;
  const message = payload.message || {};
  const account = message.account || payload.account || {};
  const accountId = account.accountId || account._id || "";
  if (!accountId) return;
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE zernio_account_id=$1 LIMIT 1`, [accountId]);
  const channel = ch.rows[0];
  if (!channel) return;
  const pr = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [channel.workspace_id]);
  const profile = pr.rows[0];
  if (!profile) return;
  const direction = message.direction || (message.fromMe ? "outbound" : "inbound");
  if (!["inbound", "incoming"].includes(direction)) return;
  let sender = message.sender || {};
  if (typeof sender === "string") sender = { id: sender };
  const waId = String(sender.phoneNumber || "").replace(/^\+/, "") || String(sender.id || "").split("@")[0].replace(/^\+/, "");
  let body = String(message.text || message.body || "").trim();
  const media = (message.attachments || []).map((a) => typeof a === "string" ? a : a.url || a.mediaUrl || a.link || a.src || "").filter(Boolean).slice(0, 10);
  if (!waId || !body && !media.length) return;
  if (!body && media.length) body = `[${media.length} photo${media.length === 1 ? "" : "s"} received]`;
  const conv = payload.conversation || {};
  const convId = String(conv.id || conv.conversationId || "");
  const senderName = sender.name || conv.participantName || "";
  const zid = String(message._id || message.id || "");
  let contact;
  const cr = await db.query(`SELECT * FROM receptionist_contact WHERE workspace_id=$1 AND wa_id=$2 LIMIT 1`, [channel.workspace_id, waId]);
  if (cr.rows[0]) {
    contact = cr.rows[0];
    if (convId && contact.zernio_conversation_id !== convId)
      await db.query(`UPDATE receptionist_contact SET zernio_conversation_id=$1, updated_at=now() WHERE id=$2`, [convId, contact.id]);
  } else {
    const id = crypto.randomUUID();
    const ins = await db.query(
      `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
       VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,$5,'','new','',false,'',0,0,now(),now()) RETURNING *`,
      [id, channel.workspace_id, waId.slice(0, 32), String(senderName).slice(0, 120), convId]
    );
    contact = ins.rows[0];
  }
  if (zid) {
    const dup = await db.query(`SELECT 1 FROM receptionist_message WHERE workspace_id=$1 AND zernio_message_id=$2 LIMIT 1`, [channel.workspace_id, zid]);
    if (dup.rows[0]) return;
  }
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,$6::jsonb)`,
    [crypto.randomUUID(), body, zid, contact.id, channel.workspace_id, JSON.stringify(media)]
  );
  if (OPT_OUT.has(body.trim().toUpperCase())) {
    await db.query(`UPDATE receptionist_contact SET opted_out=true, opted_out_at=now(), updated_at=now() WHERE id=$1`, [contact.id]);
    return;
  }
  const org = await db.query(`SELECT o.plan, o.id FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [channel.workspace_id]);
  const plan = org.rows[0]?.plan || "starter";
  const allowance = PLAN_ALLOWANCE[plan] ?? 500;
  const used = await db.query(
    `SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id
     WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`,
    [org.rows[0]?.id]
  );
  if (Number(used.rows[0].c) >= allowance) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const todayDrafts = await db.query(
    `SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND sender_type='ai' AND created_at >= now() - interval '1 day'`,
    [channel.workspace_id]
  );
  if (Number(todayDrafts.rows[0].c) >= MAX_DRAFTS_DAY) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const hist = await db.query(`SELECT sender_type, body FROM receptionist_message WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 12`, [contact.id]);
  const transcript = hist.rows.reverse().map((m) => `${m.sender_type === "user" ? "Customer" : "Receptionist"}: ${m.body}`).join("\n");
  const now = (/* @__PURE__ */ new Date()).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const incoming = media.length ? `[Customer sent ${media.length} photo${media.length === 1 ? "" : "s"}] ${body}`.trim() : body;
  const prompt = `Today is ${now}, South Africa time.
${industryBrief(profile.industry || "general")}
${profileBlock(profile)}
` + (customerBlock(contact) ? customerBlock(contact) + "\n" : "") + `
Conversation so far:
${transcript}

Reply with JSON only: {"reply": "...", "intake": {"name": "", "detail": "", "preferred_time": "", "address": "", "policy_number": ""}} (fill only the intake fields the customer actually gave; make detail a short description of what they want - for a restaurant booking use 'Table for N', never a bare number).
${RULES}`;
  let draft = { reply: "", intake: {} };
  try {
    draft = JSON.parse(await groqDraft(env.GROQ_API_KEY, prompt));
  } catch {
    return;
  }
  const reply = String(draft.reply || "").trim();
  if (!reply) return;
  const escalate = ESCALATION.some((re) => re.test(incoming));
  if (escalate) await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, reply, contact.id, channel.workspace_id]
  );
  const intake = draft.intake || {};
  const detail = String(intake.detail || "").trim(), preferred = String(intake.preferred_time || "").trim();
  if (detail || preferred) {
    try {
      await db.query(
        `INSERT INTO receptionist_booking(id,service,preferred_time,status,notes,created_at,contact_id,workspace_id,duration_minutes,google_event_id,value)
        VALUES($1,$2,$3,'new','',now(),$4,$5,60,'',0)`,
        [crypto.randomUUID(), detail.slice(0, 200), preferred.slice(0, 200), contact.id, channel.workspace_id]
      );
    } catch {
    }
  }
  const sandbox = channel.is_sandbox || channel.zernio_account_id === SANDBOX_ACCOUNT_ID;
  if (sandbox && !SANDBOX_SEND_ALLOWLIST.has(waId)) return;
  const sentHour = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 hour'`, [channel.workspace_id]);
  const sentDay = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 day'`, [channel.workspace_id]);
  if (Number(sentHour.rows[0].c) >= MAX_SENDS_HOUR || Number(sentDay.rows[0].c) >= MAX_SENDS_DAY) return;
  if (!contact.zernio_conversation_id) return;
  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${contact.zernio_conversation_id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.ZERNIO_API_KEY}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: reply })
  });
  if (!resp.ok) return;
  const data = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
}
export {
  customerBlock,
  handleZernioWebhook,
  industryBrief,
  profileBlock,
  verifyZernioSignature
};
