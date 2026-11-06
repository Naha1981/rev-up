var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/freeai.ts
async function oneCall(url, key, body, fetcher) {
  try {
    const r = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + String(key).trim() },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1e4)
    });
    if (!r.ok) return { status: r.status };
    const d = await r.json();
    const text = d?.choices?.[0]?.message?.content || "";
    if (!text.trim()) return { status: "empty" };
    return { text };
  } catch {
    return { status: "unavailable" };
  }
}
async function freeAiGenerate(env, prompt, opts, parse, fetcher = fetch) {
  const attempts = [];
  const messages = [{ role: "user", content: prompt }];
  const attempt = async (provider, url, key, body) => {
    const r = await oneCall(url, key, body, fetcher);
    if ("status" in r) {
      attempts.push({ provider, status: r.status });
      return null;
    }
    const value = parse(r.text);
    if (value === null || value === void 0) {
      attempts.push({ provider, status: "invalid" });
      return null;
    }
    return { value, provider, attempts };
  };
  if (env.GROQ_API_KEY) {
    for (const model of GROQ_MODELS) {
      const ok = await attempt(
        "Groq",
        "https://api.groq.com/openai/v1/chat/completions",
        env.GROQ_API_KEY,
        { model, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens, reasoning_effort: "low", store: false, messages }
      );
      if (ok) return ok;
    }
  } else attempts.push({ provider: "Groq", status: "missing" });
  if (opts.requireBackupConsent && !(env.OPENROUTER_FREE_ONLY === "true" && env.OPENROUTER_DATA_USE_APPROVED === "true")) {
    attempts.push({ provider: "OpenRouter", status: "not-approved" });
  } else if (env.OPENROUTER_API_KEY) {
    const ok = await attempt(
      "OpenRouter",
      "https://openrouter.ai/api/v1/chat/completions",
      env.OPENROUTER_API_KEY,
      { model: "openrouter/free", max_tokens: opts.maxTokens, messages, ...OPENROUTER_BODY_EXTRA }
    );
    if (ok) return ok;
  } else attempts.push({ provider: "OpenRouter", status: "missing" });
  return null;
}
function extractAmounts(text) {
  const out = /* @__PURE__ */ new Set();
  const add = (raw) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) out.add(String(n));
  };
  let m;
  const sym = /(?<![A-Za-z0-9])(?:R|ZAR|\$|€|£)\s?(\d[\d\s,]*(?:\.\d{1,2})?)/gi;
  while (m = sym.exec(text)) add(m[1]);
  const word = /(\d[\d,]*(?:\.\d{1,2})?)\s?(?:rand|zar)\b/gi;
  while (m = word.exec(text)) add(m[1]);
  return [...out];
}
function promptAllowedAmounts(prompt) {
  const allowed = new Set(extractAmounts(prompt));
  const add = (raw) => {
    const n = Number(String(raw).replace(/[\s,]/g, ""));
    if (Number.isFinite(n) && n > 0) allowed.add(String(n));
  };
  let m;
  const ctx = /(?::|\bprice\b|\bprices\b|\bcost\b|\bfee\b)\s*"?R?\s?(\d[\d,]*(?:\.\d{1,2})?)/gi;
  while (m = ctx.exec(prompt)) add(m[1]);
  return allowed;
}
function rejectInventedPrices(prompt, parse) {
  const allowed = promptAllowedAmounts(prompt);
  return (text) => {
    const amounts = extractAmounts(text);
    if (!amounts.every((a) => allowed.has(a))) return null;
    return parse(text);
  };
}
var GROQ_MODELS, OPENROUTER_BODY_EXTRA, FACT_RULES;
var init_freeai = __esm({
  "src/freeai.ts"() {
    GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
    OPENROUTER_BODY_EXTRA = {
      // zero-price guard: only ever free endpoints; no-training: provider may not collect/store prompts
      provider: {
        max_price: { prompt: 0, completion: 0 },
        require_parameters: true,
        // only providers that accept every parameter - no silent downgrade
        data_collection: "deny",
        // no-training: provider may not collect/store prompts
        zdr: true
        // zero data retention endpoints only
      },
      reasoning: { enabled: false, exclude: true }
    };
    FACT_RULES = "Hard fact rules: use ONLY the facts supplied in this prompt - the business's own information. Never invent or guess prices, discounts, opening hours, dates, services, products, guarantees, qualifications, years of experience, people's names, addresses, phone numbers or any other detail. If a fact is not supplied, leave it out or say the team will confirm - never fill the gap. Money may only be quoted as an amount supplied here, always in South African rand (R). You are the business's WhatsApp employee writing as the business itself: never mention AI, never name any technology vendor, tool or model. Plain, simple English a customer reads in one pass.";
  }
});

// src/presets.ts
function getPreset(industry) {
  const k = (industry || "general").trim();
  return PRESETS[k] || PRESETS[ALIAS[k]] || PRESETS[k.replace(/-/g, "_")] || PRESETS.general;
}
var PRESETS, ALIAS;
var init_presets = __esm({
  "src/presets.ts"() {
    PRESETS = {
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
    ALIAS = { "auto-workshop": "auto", "real-estate": "real_estate" };
  }
});

// src/reviews.ts
var reviews_exports = {};
__export(reviews_exports, {
  CHECK_IN_DELAY_MIN: () => CHECK_IN_DELAY_MIN,
  OPT_OUT_FOOTER: () => OPT_OUT_FOOTER,
  REMINDER_DELAY_H: () => REMINDER_DELAY_H,
  REVIEW_REQUEST_DELAY_H: () => REVIEW_REQUEST_DELAY_H,
  cancelPending: () => cancelPending,
  checkInMessage: () => checkInMessage,
  deliver: () => deliver,
  flagIssue: () => flagIssue,
  looksNegative: () => looksNegative,
  reminderMessage: () => reminderMessage,
  resolveIssue: () => resolveIssue,
  reviewRequestMessage: () => reviewRequestMessage,
  runDueReviewEvents: () => runDueReviewEvents,
  runDueServiceReminders: () => runDueServiceReminders,
  scheduleServiceReminder: () => scheduleServiceReminder,
  sendEvent: () => sendEvent,
  serviceReminderMessage: () => serviceReminderMessage,
  startPipeline: () => startPipeline,
  unsubscribeContact: () => unsubscribeContact
});
function looksNegative(body) {
  const t = (body || "").toLowerCase();
  return NEGATIVE_KEYWORDS.some((w) => t.includes(w));
}
function checkInMessage(profile, wsName, contact) {
  return `Hey ${firstName(contact)}, this is ${businessName(profile, wsName)}. Just checking in to make sure everything looks good with the work we did today.`;
}
function reviewRequestMessage(profile, wsName, contact, link) {
  return `Hi ${firstName(contact)}, ${businessName(profile, wsName)} here. Just wanted to say thanks again for the opportunity. If you have 30 seconds, would you mind sharing your experience in a quick Google review? It helps other customers know they can trust us: ${link}`;
}
function reminderMessage(link) {
  return `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review: ${link}`;
}
async function startPipeline(db, workspaceId, contactId, bookingId = null) {
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, workspaceId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,'check_in','scheduled',now() + ($2 || ' minutes')::interval,'',now(),$3,$4,$5)`,
    [id, String(CHECK_IN_DELAY_MIN), bookingId, contactId, workspaceId]
  );
  return id;
}
async function ensureLink(db, workspaceId, contactId) {
  const ex = await db.query(`SELECT * FROM receptionist_reviewlink WHERE contact_id=$1 LIMIT 1`, [contactId]);
  if (ex.rows[0]) return ex.rows[0];
  const bp = await db.query(`SELECT google_review_url FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  const url = bp.rows[0]?.google_review_url || "";
  if (!url) throw new Error("No Google review link set on the Reviews page.");
  for (let i = 0; i < 5; i++) {
    const code = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const dup = await db.query(`SELECT 1 FROM receptionist_reviewlink WHERE short_code=$1`, [code]);
    if (!dup.rows[0]) {
      const id = crypto.randomUUID();
      await db.query(
        `INSERT INTO receptionist_reviewlink(id,workspace_id,contact_id,short_code,original_url,created_at)
         VALUES($1,$2,$3,$4,$5,now())`,
        [id, workspaceId, contactId, code, url]
      );
      return (await db.query(`SELECT * FROM receptionist_reviewlink WHERE id=$1`, [id])).rows[0];
    }
  }
  throw new Error("Could not allocate a short link code.");
}
async function cancelPending(db, contactId, step) {
  if (step) await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled' AND step=$2`, [contactId, step]);
  else await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE contact_id=$1 AND status='scheduled'`, [contactId]);
}
async function unsubscribeContact(db, contactId) {
  await db.query(`UPDATE receptionist_contact SET opted_out=true, opted_out_at=now(), review_status='unsubscribed', updated_at=now() WHERE id=$1`, [contactId]);
  await cancelPending(db, contactId);
}
async function flagIssue(db, workspaceId, contactId, note) {
  await db.query(`UPDATE receptionist_contact SET review_status='issue_flagged', issue_note=$1, needs_human=true, updated_at=now() WHERE id=$2`, [note.slice(0, 500), contactId]);
  try {
    await db.query(
      `INSERT INTO receptionist_complaint(id,text,source,status,apology_text,resolution_note,created_at,contact_id,workspace_id)
       VALUES($1,$2,'check_in','new','','',now(),$3,$4)`,
      [crypto.randomUUID(), note.slice(0, 2e3), contactId, workspaceId]
    );
  } catch {
  }
}
async function resolveIssue(db, contactId) {
  const r = await db.query(
    `UPDATE receptionist_contact SET review_status='check_in_sent', issue_note='', updated_at=now() WHERE id=$1 AND review_status='issue_flagged'`,
    [contactId]
  );
  return (r.rowCount || 0) > 0;
}
async function reviewGate(db, workspaceId) {
  const p = await db.query(`SELECT review_requests_enabled FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  if (!p.rows[0] || !p.rows[0].review_requests_enabled) return "review requests are off for this workspace";
  const org = await db.query(`SELECT o.plan FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [workspaceId]);
  const plan = org.rows[0]?.plan || "starter";
  if (!REVIEW_PLANS.has(plan)) return `plan ${plan} does not include review requests`;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  if (!ch.rows[0]) return "no connected WhatsApp number";
  return "";
}
async function deliver(db, env, workspaceId, contact, body) {
  const ch = await db.query(`SELECT * FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  const channel = ch.rows[0];
  if (!channel) throw new Error("No connected WhatsApp number.");
  const outId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
     VALUES($1,'outbound','ai',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
    [outId, body, contact.id, workspaceId]
  );
  const sandbox = channel.is_sandbox || channel.zernio_account_id === "6a180a034c7f364ffded3c9c";
  const ALLOW = /* @__PURE__ */ new Set(["27672347593", "27612980377"]);
  if (sandbox && !ALLOW.has(contact.wa_id)) throw new Error("sandbox line may only message allowlisted test numbers");
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`,
    [workspaceId]
  );
  if (Number(budget.rows[0].h) >= 20 || Number(budget.rows[0].d) >= 100) throw new Error("send budget reached");
  if (!contact.zernio_conversation_id) throw new Error("customer has no active WhatsApp conversation yet");
  const connQ = await db.query(`SELECT api_key, status FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [workspaceId]);
  const conn = connQ.rows[0];
  if (conn && conn.status === "needs_attention") throw new Error("messaging account needs reconnection");
  const sendKey = conn && conn.status === "connected" && conn.api_key ? conn.api_key : env.ZERNIO_API_KEY;
  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${contact.zernio_conversation_id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sendKey}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: body })
  });
  if (!resp.ok) throw new Error(`messaging send failed (${resp.status})`);
  const data = await resp.json().catch(() => ({}));
  const sentId = String(data?.message?.id || data?.messageId || data?.id || "");
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sentId, outId]);
  return outId;
}
async function sendEvent(db, env, appUrl, event) {
  const claim = await db.query(
    `UPDATE receptionist_reviewevent SET status='sending' WHERE id=$1 AND status='scheduled'`,
    [event.id]
  );
  if (!claim.rowCount) return "cancelled";
  const cq = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [event.contact_id]);
  const contact = cq.rows[0];
  const wq = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [event.workspace_id]);
  const wsName = wq.rows[0]?.name || "the business";
  const pq = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [event.workspace_id]);
  const profile = pq.rows[0];
  if (!contact || contact.opted_out) {
    await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE id=$1`, [event.id]);
    await cancelPending(db, event.contact_id);
    return "cancelled";
  }
  const holdReason = await reviewGate(db, event.workspace_id);
  if (holdReason) {
    await db.query(`UPDATE receptionist_reviewevent SET status='scheduled', scheduled_for=now() + interval '15 minutes' WHERE id=$1`, [event.id]);
    return "held";
  }
  const base = appUrl.replace(/\/$/, "");
  try {
    if (event.step === "check_in") {
      await deliver(db, env, event.workspace_id, contact, checkInMessage(profile, wsName, contact) + OPT_OUT_FOOTER);
      if (contact.review_status !== "issue_flagged")
        await db.query(`UPDATE receptionist_contact SET review_status='check_in_sent', updated_at=now() WHERE id=$1`, [contact.id]);
      await db.query(
        `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
         VALUES($1,'review_request','scheduled',now() + ($2 || ' hours')::interval,'',now(),$3,$4,$5)`,
        [crypto.randomUUID(), String(REVIEW_REQUEST_DELAY_H), event.booking_id, contact.id, event.workspace_id]
      );
    } else if (event.step === "review_request") {
      const link = await ensureLink(db, event.workspace_id, contact.id);
      await deliver(db, env, event.workspace_id, contact, reviewRequestMessage(profile, wsName, contact, `${base}/r/${link.short_code}`) + OPT_OUT_FOOTER);
      if (contact.review_status !== "issue_flagged")
        await db.query(`UPDATE receptionist_contact SET review_status='review_requested', updated_at=now() WHERE id=$1`, [contact.id]);
      await db.query(
        `INSERT INTO receptionist_reviewevent(id,step,status,scheduled_for,error,created_at,booking_id,contact_id,workspace_id)
         VALUES($1,'reminder','scheduled',now() + ($2 || ' hours')::interval,'',now(),$3,$4,$5)`,
        [crypto.randomUUID(), String(REMINDER_DELAY_H), event.booking_id, contact.id, event.workspace_id]
      );
    } else {
      const found = await db.query(`SELECT * FROM receptionist_reviewlink WHERE contact_id=$1 LIMIT 1`, [contact.id]);
      if (found.rows[0]?.clicked_at) {
        await db.query(`UPDATE receptionist_reviewevent SET status='cancelled' WHERE id=$1`, [event.id]);
        return "cancelled";
      }
      if (!found.rows[0]) throw new Error("No tracked link exists for this contact.");
      await deliver(db, env, event.workspace_id, contact, reminderMessage(`${base}/r/${found.rows[0].short_code}`) + OPT_OUT_FOOTER);
    }
  } catch (e) {
    await db.query(`UPDATE receptionist_reviewevent SET status='failed', error=$1 WHERE id=$2`, [String(e?.message || e).slice(0, 500), event.id]);
    return "failed";
  }
  await db.query(`UPDATE receptionist_reviewevent SET status='sent', sent_at=now() WHERE id=$1`, [event.id]);
  return "sent";
}
async function runDueReviewEvents(db, env, appUrl, workspaceId) {
  const due = workspaceId ? await db.query(
    `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() AND workspace_id=$1 ORDER BY scheduled_for LIMIT 10`,
    [workspaceId]
  ) : await db.query(
    `SELECT * FROM receptionist_reviewevent WHERE status='scheduled' AND scheduled_for <= now() ORDER BY scheduled_for LIMIT 10`
  );
  const results = {};
  for (const ev of due.rows) {
    const r = await sendEvent(db, env, appUrl, ev);
    results[r] = (results[r] || 0) + 1;
  }
  return { due: due.rows.length, results };
}
function serviceReminderMessage(profile, wsName, contact, service) {
  const what = service || "your vehicle";
  const biz = profile?.business_name || "" || wsName;
  const name = (contact.name || "").trim().split(" ")[0] || "there";
  return `Hi ${name}, ${biz} here. It's time to book ${what} in for its next service. Reply to this message and we will find you a slot.`;
}
async function scheduleServiceReminder(db, workspaceId, bookingId, contactId, service) {
  const p = await db.query(`SELECT service_reminder_days FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [workspaceId]);
  const days = Number(p.rows[0]?.service_reminder_days || 0);
  if (days <= 0) return null;
  const c = await db.query(`SELECT opted_out FROM receptionist_contact WHERE id=$1`, [contactId]);
  if (!c.rows[0] || c.rows[0].opted_out) return null;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_servicereminder(id,service,due_on,status,error,created_at,booking_id,contact_id,workspace_id)
     VALUES($1,$2,(now() AT TIME ZONE 'Africa/Johannesburg')::date + ($3)::int,'scheduled','',now(),$4,$5,$6)`,
    [id, (service || "").slice(0, 200), days, bookingId, contactId, workspaceId]
  );
  return id;
}
async function runDueServiceReminders(db, env, workspaceId) {
  const due = workspaceId ? await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date AND workspace_id=$1 ORDER BY due_on LIMIT 10`, [workspaceId]) : await db.query(`SELECT * FROM receptionist_servicereminder WHERE status='scheduled' AND due_on <= (now() AT TIME ZONE 'Africa/Johannesburg')::date ORDER BY due_on LIMIT 10`);
  const results = {};
  for (const rem of due.rows) {
    const claim = await db.query(`UPDATE receptionist_servicereminder SET status='sending' WHERE id=$1 AND status='scheduled'`, [rem.id]);
    if (!claim.rowCount) {
      results.cancelled = (results.cancelled || 0) + 1;
      continue;
    }
    const cq = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [rem.contact_id]);
    const contact = cq.rows[0];
    if (!contact || contact.opted_out) {
      await db.query(`UPDATE receptionist_servicereminder SET status='cancelled' WHERE id=$1`, [rem.id]);
      results.cancelled = (results.cancelled || 0) + 1;
      continue;
    }
    const wq = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [rem.workspace_id]);
    const pq = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [rem.workspace_id]);
    try {
      await deliver(db, env, rem.workspace_id, contact, serviceReminderMessage(pq.rows[0], wq.rows[0]?.name || "the business", contact, rem.service) + OPT_OUT_FOOTER);
    } catch (e) {
      await db.query(`UPDATE receptionist_servicereminder SET status='scheduled' WHERE id=$1`, [rem.id]);
      results.held = (results.held || 0) + 1;
      continue;
    }
    await db.query(`UPDATE receptionist_servicereminder SET status='sent', sent_at=now() WHERE id=$1`, [rem.id]);
    results.sent = (results.sent || 0) + 1;
  }
  return { due: due.rows.length, results };
}
var CHECK_IN_DELAY_MIN, REVIEW_REQUEST_DELAY_H, REMINDER_DELAY_H, REVIEW_PLANS, OPT_OUT_FOOTER, NEGATIVE_KEYWORDS, firstName, businessName;
var init_reviews = __esm({
  "src/reviews.ts"() {
    CHECK_IN_DELAY_MIN = 15;
    REVIEW_REQUEST_DELAY_H = 2;
    REMINDER_DELAY_H = 48;
    REVIEW_PLANS = /* @__PURE__ */ new Set(["starter", "growth", "business-pro"]);
    OPT_OUT_FOOTER = "\nReply STOP to opt out.";
    NEGATIVE_KEYWORDS = [
      "not happy",
      "unhappy",
      "not satisfied",
      "terrible",
      "awful",
      "horrible",
      "worst",
      "bad service",
      "poor service",
      "disappointed",
      "complaint",
      "problem",
      "broken",
      "not fixed",
      "still leaking",
      "refund",
      "useless",
      "angry",
      "not impressed",
      "still not working",
      "still not fixed",
      "came back",
      "waste of money",
      "rip off",
      "ripped off",
      "disgusted"
    ];
    firstName = (c) => (c.name || "").trim().split(" ")[0] || "there";
    businessName = (p, ws) => p?.business_name || "" || ws;
  }
});

// src/receptionist.ts
var receptionist_exports = {};
__export(receptionist_exports, {
  RULES: () => RULES,
  customerBlock: () => customerBlock,
  handleZernioWebhook: () => handleZernioWebhook,
  industryBrief: () => industryBrief,
  profileBlock: () => profileBlock,
  sendChannelMessage: () => sendChannelMessage,
  tenantConfirmAndBind: () => tenantConfirmAndBind,
  tenantConnectUrl: () => tenantConnectUrl,
  tenantWebhookSecret: () => tenantWebhookSecret,
  validateTenantKey: () => validateTenantKey,
  verifyZernioSignature: () => verifyZernioSignature
});
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
    const { unsubscribeContact: unsubscribeContact2 } = await Promise.resolve().then(() => (init_reviews(), reviews_exports));
    await unsubscribeContact2(db, contact.id);
    return;
  }
  {
    const { maybeHandleAssistant: maybeHandleAssistant2 } = await Promise.resolve().then(() => (init_assistant(), assistant_exports));
    if (await maybeHandleAssistant2(db, env, {
      workspaceId: channel.workspace_id,
      waId,
      body,
      contactId: contact.id,
      zernioMessageId: zid,
      channel,
      businessName: String(profile.business_name || "")
    })) return;
  }
  if (["check_in_sent", "review_requested"].includes(contact.review_status || "")) {
    const { looksNegative: looksNegative2, flagIssue: flagIssue2 } = await Promise.resolve().then(() => (init_reviews(), reviews_exports));
    if (looksNegative2(body)) {
      await flagIssue2(db, channel.workspace_id, contact.id, body);
      return;
    }
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
  await db.query(`CREATE TABLE IF NOT EXISTS cf_ai_usage(workspace_id uuid, day date, attempts int NOT NULL DEFAULT 0, PRIMARY KEY(workspace_id, day))`);
  const usage = await db.query(
    `INSERT INTO cf_ai_usage(workspace_id, day, attempts) VALUES($1, CURRENT_DATE, 1)
     ON CONFLICT (workspace_id, day) DO UPDATE SET attempts = cf_ai_usage.attempts + 1
     RETURNING attempts`,
    [channel.workspace_id]
  );
  if (Number(usage.rows[0].attempts) > MAX_AI_ATTEMPTS_DAY) {
    await db.query(`UPDATE receptionist_contact SET needs_human=true, updated_at=now() WHERE id=$1 AND NOT needs_human`, [contact.id]);
    return;
  }
  const aiResult = await freeAiGenerate(env, prompt, { maxTokens: 800, temperature: 0.2, requireBackupConsent: true }, rejectInventedPrices(prompt, (text) => {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const d = JSON.parse(m[0]);
      return d && typeof d === "object" ? d : null;
    } catch {
      return null;
    }
  }));
  if (!aiResult) return;
  const draft = aiResult.value;
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
  let detail = String(intake.detail || "").trim();
  const preferred = String(intake.preferred_time || "").trim();
  const industry = String(profile.industry || "general");
  if (industry === "restaurant" && /^\d+$/.test(detail)) detail = `Table for ${detail}`;
  if (detail || preferred) {
    try {
      await db.query(
        `INSERT INTO receptionist_booking(id,service,preferred_time,status,notes,created_at,contact_id,workspace_id,duration_minutes,google_event_id,value)
        VALUES($1,$2,$3,'requested','',now(),$4,$5,60,'',0)`,
        [crypto.randomUUID(), detail.slice(0, 200), preferred.slice(0, 200), contact.id, channel.workspace_id]
      );
    } catch {
    }
  }
  const inName = String(intake.name || "").trim();
  const inAddress = String(intake.address || "").trim();
  const inPolicy = String(intake.policy_number || "").trim();
  try {
    if (industry === "funeral" && (inName || detail || inPolicy)) {
      await db.query(`INSERT INTO receptionist_funeralclaim(id,deceased_name,claimant_name,policy_number,status,notes,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,$4,'new','',now(),$5,$6)`, [crypto.randomUUID(), detail.slice(0, 200), inName.slice(0, 200), inPolicy.slice(0, 64), contact.id, channel.workspace_id]);
    } else if (industry === "dental" && (inName || detail)) {
      await db.query(`INSERT INTO receptionist_dentalappointment(id,patient_name,reason,status,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,'new',now(),$4,$5)`, [crypto.randomUUID(), inName.slice(0, 200), detail.slice(0, 300), contact.id, channel.workspace_id]);
    } else if (industry === "trades" && (detail || inAddress)) {
      await db.query(`INSERT INTO receptionist_tradedispatch(id,job_type,address,urgent,status,created_at,contact_id,workspace_id)
        VALUES($1,$2,$3,false,'new',now(),$4,$5)`, [crypto.randomUUID(), detail.slice(0, 120), inAddress.slice(0, 300), contact.id, channel.workspace_id]);
    }
  } catch {
  }
  const sent = await sendChannelMessage(db, env, channel, contact.id, waId, reply);
  if (!sent.ok) return;
  await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sent.messageId, outId]);
}
async function sendChannelMessage(db, env, channel, contactId, waId, text) {
  const sandbox = channel.is_sandbox || channel.zernio_account_id === SANDBOX_ACCOUNT_ID;
  if (sandbox && !SANDBOX_SEND_ALLOWLIST.has(waId)) return { ok: false, messageId: "" };
  const sentHour = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 hour'`, [channel.workspace_id]);
  const sentDay = await db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false AND created_at >= now() - interval '1 day'`, [channel.workspace_id]);
  if (Number(sentHour.rows[0].c) >= MAX_SENDS_HOUR || Number(sentDay.rows[0].c) >= MAX_SENDS_DAY) return { ok: false, messageId: "" };
  const cq = await db.query(`SELECT zernio_conversation_id FROM receptionist_contact WHERE id=$1`, [contactId]);
  const convId = cq.rows[0]?.zernio_conversation_id;
  if (!convId) return { ok: false, messageId: "" };
  const connQ = await db.query(`SELECT api_key, status FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [channel.workspace_id]);
  const conn = connQ.rows[0];
  if (conn && conn.status === "needs_attention") return { ok: false, messageId: "" };
  const sendKey = conn && conn.status === "connected" && conn.api_key ? conn.api_key : env.ZERNIO_API_KEY;
  const base = env.ZERNIO_BASE_URL || "https://zernio.com/api/v1";
  const resp = await fetch(`${base}/inbox/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sendKey}` },
    body: JSON.stringify({ accountId: channel.zernio_account_id, message: text })
  });
  if (!resp.ok) return { ok: false, messageId: "" };
  const data = await resp.json().catch(() => ({}));
  return { ok: true, messageId: String(data?.message?.id || data?.messageId || data?.id || "") };
}
async function zget(apiKey, path) {
  const resp = await fetch(ZBASE + path, { headers: { authorization: `Bearer ${apiKey}` } });
  if (!resp.ok) {
    const e = new Error("zernio " + resp.status);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}
async function zpost(apiKey, path, body) {
  const resp = await fetch(ZBASE + path, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const e = new Error("zernio " + resp.status);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}
async function validateTenantKey(apiKey, workspaceId, workspaceName) {
  try {
    await zget(apiKey, "/accounts");
    const byExt = await zget(apiKey, `/profiles?externalId=${encodeURIComponent(workspaceId)}`).catch(() => ({}));
    let profile = (byExt.profiles || [])[0] || byExt.profile;
    if (!profile) {
      const all = await zget(apiKey, "/profiles");
      const profiles = all.profiles || [];
      if (profiles.length === 1) profile = profiles[0];
    }
    if (!profile) {
      const made = await zpost(apiKey, "/profiles", { name: workspaceName.slice(0, 80), externalId: workspaceId });
      profile = made.profile;
    }
    return { profileId: String(profile?._id || profile?.id || ""), error: "" };
  } catch (e) {
    if (e.status === 401 || e.status === 403) return { profileId: "", error: "That key was not accepted. Copy the full key from your messaging account and paste it again." };
    if (e.status === 402) return { profileId: "", error: "Your messaging plan covers 2 numbers. Add a card in your messaging account to connect more." };
    return { profileId: "", error: "Could not reach the messaging service. Please try again." };
  }
}
async function tenantConnectUrl(apiKey, profileId, redirectUrl) {
  const data = await zget(apiKey, `/connect/whatsapp?profileId=${encodeURIComponent(profileId)}&redirect_url=${encodeURIComponent(redirectUrl)}`);
  const url = data.authUrl || data.data?.authUrl;
  if (!url) throw new Error("no authUrl");
  return url;
}
async function tenantConfirmAndBind(db, conn, profileId, accountId, webhookUrl) {
  const accounts = await zget(conn.api_key, `/accounts?profileId=${encodeURIComponent(profileId)}&platform=whatsapp`);
  const list = accounts.accounts || [];
  const match = list.find((a) => String(a._id || a.id) === accountId);
  if (!match) return { ok: false, msg: "That number was not found on your messaging account. Please try again." };
  const secret = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
  let webhookId = "", webhookOk = false;
  try {
    const hook = await zpost(conn.api_key, "/webhooks/settings", {
      name: "revup-" + conn.workspace_id,
      url: webhookUrl,
      secret,
      events: ["message.received", "message.delivered", "message.read", "account.disconnected"],
      profileIds: [profileId]
    });
    webhookId = String(hook.webhook?._id || hook.webhook?.id || "");
    if (webhookId) {
      const t = await zpost(conn.api_key, "/webhooks/test", { webhookId });
      webhookOk = !!t.success;
    }
  } catch {
  }
  const phone = String(match.username || match.phoneNumber || "").replace(/^\+/, "");
  await db.query(
    `UPDATE receptionist_tenantmessagingconnection SET account_id=$1, phone_number=$2, webhook_id=$3, webhook_secret=$4, status='connected', last_error=$5, updated_at=now() WHERE workspace_id=$6`,
    [accountId, phone, webhookId, webhookId ? secret : "", webhookOk ? "" : "Webhook check did not pass yet - replies may be delayed.", conn.workspace_id]
  );
  const ex = await db.query(`SELECT id FROM receptionist_zerniochannel WHERE workspace_id=$1`, [conn.workspace_id]);
  if (ex.rows[0]) {
    await db.query(
      `UPDATE receptionist_zerniochannel SET zernio_account_id=$1, zernio_profile_id=$2, phone_number=$3, label=$4, is_sandbox=false WHERE workspace_id=$5`,
      [accountId, profileId, phone, match.name || "WhatsApp", conn.workspace_id]
    );
  } else {
    await db.query(
      `INSERT INTO receptionist_zerniochannel(id,workspace_id,zernio_account_id,zernio_profile_id,phone_number,label,is_sandbox,connected_at)
       VALUES($1,$2,$3,$4,$5,$6,false,now())`,
      [crypto.randomUUID(), conn.workspace_id, accountId, profileId, phone, match.name || "WhatsApp"]
    );
  }
  return { ok: true, msg: webhookOk ? "WhatsApp connected. Your receptionist is live on your number." : "Connected, but the delivery check did not pass yet - replies may be delayed." };
}
async function tenantWebhookSecret(db, payload) {
  const account = payload?.message?.account || payload?.account || {};
  const accountId = account.accountId || account._id || payload?.accountId || "";
  const profileId = account.profileId || payload?.profileId || "";
  if (accountId) {
    const r = await db.query(`SELECT webhook_secret FROM receptionist_tenantmessagingconnection WHERE account_id=$1 AND webhook_secret<>'' LIMIT 1`, [accountId]);
    if (r.rows[0]) return r.rows[0].webhook_secret;
  }
  if (profileId) {
    const r = await db.query(`SELECT webhook_secret FROM receptionist_tenantmessagingconnection WHERE profile_id=$1 AND webhook_secret<>'' LIMIT 1`, [profileId]);
    if (r.rows[0]) return r.rows[0].webhook_secret;
  }
  return "";
}
var SANDBOX_ACCOUNT_ID, SANDBOX_SEND_ALLOWLIST, OPT_OUT, PLAN_ALLOWANCE, MAX_SENDS_HOUR, MAX_SENDS_DAY, MAX_DRAFTS_DAY, MAX_AI_ATTEMPTS_DAY, ESCALATION, RULES, ZBASE;
var init_receptionist = __esm({
  "src/receptionist.ts"() {
    init_freeai();
    init_presets();
    SANDBOX_ACCOUNT_ID = "6a180a034c7f364ffded3c9c";
    SANDBOX_SEND_ALLOWLIST = /* @__PURE__ */ new Set(["27672347593", "27612980377"]);
    OPT_OUT = /* @__PURE__ */ new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
    PLAN_ALLOWANCE = { starter: 500, growth: 1e3, "business-pro": 2500 };
    MAX_SENDS_HOUR = 60;
    MAX_SENDS_DAY = 300;
    MAX_DRAFTS_DAY = 300;
    MAX_AI_ATTEMPTS_DAY = 100;
    ESCALATION = [
      /\b(speak|talk)\s+to\s+(a\s+)?(person|human|someone|manager|owner)\b/i,
      /\b(complaint|sue|lawyer|attorney|refund)\b/i,
      /\b(died|death|passed away|deceased)\b/i,
      /\b(emergency|urgent|burst|flooding|no power|sparking)\b/i
    ];
    RULES = "Rules: reply in under 120 words; plain WhatsApp language; prices in South African rand (R); no emojis. When the customer sends photos, acknowledge them by count and never describe, diagnose or price what might be in them - a person from the team assesses photos. IMPORTANT: the business information above is the COMPLETE list of what this business offers. If the customer asks about a service, product, price or policy that is not listed there, do NOT say yes and do NOT say no - say a person from the team will confirm. If you do not know, say a person will confirm. " + FACT_RULES;
    ZBASE = "https://zernio.com/api/v1";
  }
});

// src/assistant.ts
var assistant_exports = {};
__export(assistant_exports, {
  assistantCounts: () => assistantCounts,
  collectPage: () => collectPage,
  consumeVaultLink: () => consumeVaultLink,
  ensureAssistantTables: () => ensureAssistantTables,
  finishTask: () => finishTask,
  getSettings: () => getSettings,
  handleAssistantMessage: () => handleAssistantMessage,
  isActionIntent: () => isActionIntent,
  isApprovalReply: () => isApprovalReply,
  isMemoryQuery: () => isMemoryQuery,
  isRuleCapture: () => isRuleCapture,
  isTasksQuery: () => isTasksQuery,
  isVaultRequest: () => isVaultRequest,
  keywords: () => keywords,
  loadRules: () => loadRules,
  maybeHandleAssistant: () => maybeHandleAssistant,
  openSecret: () => openSecret,
  recall: () => recall,
  remember: () => remember,
  runningTasks: () => runningTasks,
  sealSecret: () => sealSecret,
  startTask: () => startTask,
  storeSecret: () => storeSecret,
  upsertSettings: () => upsertSettings
});
async function ensureAssistantTables(db) {
  if (tablesReady) return;
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_setting(
    workspace_id uuid PRIMARY KEY,
    owner_phone text NOT NULL DEFAULT '',
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_memory(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    kind text NOT NULL,
    text text NOT NULL,
    source_message_id text,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE INDEX IF NOT EXISTS assistant_memory_ws_kind_idx ON assistant_memory(workspace_id, kind)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_approval(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    action text NOT NULL,
    detail text,
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_task(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    kind text NOT NULL,
    detail text,
    status text NOT NULL DEFAULT 'running',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz)`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_vault_secret(
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    ciphertext text NOT NULL,
    iv text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, name))`);
  await db.query(`CREATE TABLE IF NOT EXISTS assistant_vault_link(
    token text PRIMARY KEY,
    workspace_id uuid NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now())`);
  tablesReady = true;
}
async function loadRules(db, ws) {
  const r = await db.query(`SELECT text FROM assistant_memory WHERE workspace_id=$1 AND kind='rule' ORDER BY id ASC`, [ws]);
  return r.rows.map((x) => x.text);
}
function keywords(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).slice(0, 8);
}
async function recall(db, ws, question, limit = 10) {
  const words = keywords(question);
  if (!words.length) return [];
  const likes = words.map((w) => `%${w}%`);
  const r = await db.query(
    `SELECT id, kind, text, created_at FROM assistant_memory WHERE workspace_id=$1 AND (${words.map((_, i) => `text ILIKE $${i + 2}`).join(" OR ")}) ORDER BY created_at DESC LIMIT ${limit}`,
    [ws, ...likes]
  );
  return r.rows;
}
async function remember(db, ws, kind, text, sourceMessageId) {
  const clean = text.trim();
  if (!clean) return;
  const existing = await db.query(`SELECT id FROM assistant_memory WHERE workspace_id=$1 AND kind=$2 AND text=$3 LIMIT 1`, [ws, kind, clean]);
  if (existing.rows.length) return;
  await db.query(`INSERT INTO assistant_memory(workspace_id, kind, text, source_message_id) VALUES($1,$2,$3,$4)`, [ws, kind, clean, sourceMessageId ?? null]);
}
async function startTask(db, ws, kind, detail) {
  const r = await db.query(`INSERT INTO assistant_task(workspace_id, kind, detail) VALUES($1,$2,$3) RETURNING id`, [ws, kind, detail]);
  return r.rows[0].id;
}
async function finishTask(db, id, status, detail) {
  if (detail) await db.query(`UPDATE assistant_task SET status=$2, detail=detail || ' | ' || $3::text, finished_at=now() WHERE id=$1`, [id, status, detail]);
  else await db.query(`UPDATE assistant_task SET status=$2, finished_at=now() WHERE id=$1`, [id, status]);
}
async function runningTasks(db, ws, excludeId) {
  const r = await db.query(
    `SELECT id, kind, detail, status, started_at FROM assistant_task WHERE workspace_id=$1 AND status='running' AND ($2::bigint IS NULL OR id <> $2) ORDER BY started_at DESC LIMIT 10`,
    [ws, excludeId ?? null]
  );
  return r.rows;
}
async function masterKey(env) {
  if (!env.VAULT_MASTER_KEY) throw new Error("VAULT_MASTER_KEY missing");
  const raw = Uint8Array.from(atob(env.VAULT_MASTER_KEY), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealSecret(env, plaintext) {
  const key = await masterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: btoa(String.fromCharCode(...new Uint8Array(buf))), iv: btoa(String.fromCharCode(...iv)) };
}
async function openSecret(env, ciphertext, iv) {
  const key = await masterKey(env);
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Uint8Array.from(atob(iv), (c) => c.charCodeAt(0)) },
    key,
    Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  );
  return new TextDecoder().decode(buf);
}
async function storeSecret(db, env, ws, name, plaintext) {
  const { ciphertext, iv } = await sealSecret(env, plaintext);
  await db.query(
    `INSERT INTO assistant_vault_secret(workspace_id, name, ciphertext, iv) VALUES($1,$2,$3,$4)
     ON CONFLICT (workspace_id, name) DO UPDATE SET ciphertext=$3, iv=$4`,
    [ws, name, ciphertext, iv]
  );
}
async function consumeVaultLink(db, token) {
  const r = await db.query(`SELECT token, workspace_id, used FROM assistant_vault_link WHERE token=$1`, [token]);
  const row = r.rows[0];
  if (!row || row.used) return null;
  await db.query(`UPDATE assistant_vault_link SET used=true WHERE token=$1`, [token]);
  return String(row.workspace_id);
}
function collectPage(token) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RevUp Vault</title>
<style>body{font-family:-apple-system,sans-serif;max-width:26rem;margin:3rem auto;padding:0 1rem}input,button{font-size:1rem;padding:.6rem;width:100%;margin:.3rem 0;box-sizing:border-box}button{background:#000;color:#fff;border:0;border-radius:.5rem}</style></head>
<body><h2>Save a secret</h2><p>Write-only vault. It is stored encrypted and never shown in chat, ever.</p>
<form method="POST" action="/vault/save"><input type="hidden" name="token" value="${token}">
<input name="name" placeholder="Name (e.g. SomeService login)" required>
<input name="secret" type="password" placeholder="The secret" required>
<button type="submit">Save to vault</button></form></body></html>`;
}
async function handleAssistantMessage(db, env, ws, businessName2, contactId, text, sourceMessageId, fetcher, excludeTaskId) {
  await ensureAssistantTables(db);
  const name = businessName2 ? `${businessName2} assistant` : "your business assistant";
  if (isTasksQuery(text)) {
    const running = await runningTasks(db, ws, excludeTaskId);
    if (!running.length) return { reply: "Nothing running right now. Ask me to do something and it shows up here." };
    const lines = running.map((t) => `- #${t.id} ${t.kind}: ${t.detail ?? ""} (started ${sast(t.started_at)})`);
    return { reply: `Running now:
${lines.join("\n")}` };
  }
  if (isMemoryQuery(text)) {
    const hits = await recall(db, ws, text, 8);
    if (!hits.length) return { reply: "I have nothing stored on that yet. Tell me once and I keep it." };
    const lines = hits.map((m) => `- [${m.kind}] ${m.text}`);
    return { reply: `What I remember:
${lines.join("\n")}` };
  }
  if (isVaultRequest(text)) {
    if (!env.VAULT_MASTER_KEY) return { reply: "The vault is not set up on this deployment yet." };
    const token = crypto.randomUUID();
    await db.query(`INSERT INTO assistant_vault_link(token, workspace_id) VALUES($1,$2)`, [token, ws]);
    const base = env.WORKER_URL || "https://revup.nahalabs.co.za";
    return { reply: `Open this one-time link to save it into your vault (never in chat): ${base}/vault/c/${token}` };
  }
  if (isApprovalReply(text)) {
    const pending = await db.query(`SELECT id, action FROM assistant_approval WHERE workspace_id=$1 AND status='pending' ORDER BY id ASC LIMIT 1`, [ws]);
    if (!pending.rows.length) return { reply: "Nothing waiting on your Go + Sure right now." };
    await db.query(`UPDATE assistant_approval SET status='approved', resolved_at=now() WHERE id=$1`, [pending.rows[0].id]);
    await remember(db, ws, "decision", `Approved with Go + Sure: ${pending.rows[0].action}`, sourceMessageId);
    return { reply: `Go + Sure noted. #${pending.rows[0].id} is approved and queued: ${pending.rows[0].action}` };
  }
  if (isRuleCapture(text)) {
    const cleaned = text.replace(/^(new rule|rule)\s*[:\-]\s*/i, "").trim();
    await remember(db, ws, /^(new rule|rule)\s*[:\-]/i.test(text.trim()) ? "rule" : "preference", cleaned, sourceMessageId);
    return { reply: "Stored. It is loaded before every answer from now on.", storedMemory: cleaned };
  }
  if (isActionIntent(text)) {
    const r = await db.query(`INSERT INTO assistant_approval(workspace_id, action, detail) VALUES($1,$2,$3) RETURNING id`, [ws, text.slice(0, 120), text]);
    const id = r.rows[0].id;
    return { reply: `That one sends/spends/deploys, so it waits for you. Reply "Go + Sure" and I do it.

Queued #${id}: ${text.slice(0, 200)}`, approvalId: id };
  }
  const hist = await db.query(
    `SELECT direction, body FROM receptionist_message WHERE contact_id=$1 AND body IS NOT NULL AND body <> '' ORDER BY created_at DESC LIMIT 20`,
    [contactId]
  );
  const history = hist.rows.reverse().map((h) => `${h.direction === "inbound" ? "Owner" : "Assistant"}: ${h.body}`);
  const [rules, memories] = await Promise.all([loadRules(db, ws), recall(db, ws, text)]);
  const prompt = [
    `You are ${name}, the business owner's own assistant on WhatsApp. The owner is in South Africa (SAST).`,
    "CORE RULES (always):",
    ...CORE_RULES.map((r) => `- ${r}`),
    rules.length ? "THEIR RULES (always enforce):" : "",
    ...rules.map((r) => `- ${r}`),
    memories.length ? "MEMORY relevant to this message:" : "",
    ...memories.map((m) => `- [${m.kind}] ${m.text}`),
    history.length ? "Recent conversation:\n" + history.join("\n") : "",
    `Owner: ${text}`
  ].filter(Boolean).join("\n");
  const ai = await freeAiGenerate(
    env,
    prompt,
    { maxTokens: 800, temperature: 0.4, requireBackupConsent: true },
    rejectInventedPrices(prompt, (t) => t.trim() || null),
    fetcher
  );
  if (!ai) return { reply: "My AI is unavailable right now and the backup is either off or down. Try me again in a few minutes." };
  let stored;
  try {
    const extract = await freeAiGenerate(
      env,
      `From the user message, extract at most one durable fact, rule, decision, person or project worth remembering long-term. Reply as JSON {"kind":"rule|decision|person|project|preference|fact","text":"..."} or {"skip":true}. Never extract questions, greetings or one-off requests.

User message: ${text}`,
      { maxTokens: 200, temperature: 0.1, requireBackupConsent: true },
      (t) => {
        const m = t.match(/\{[\s\S]*\}/);
        if (!m) return null;
        try {
          return JSON.parse(m[0]);
        } catch {
          return null;
        }
      },
      fetcher
    );
    const parsed = extract?.value;
    if (parsed && !parsed.skip && parsed.text && parsed.kind && ["rule", "decision", "person", "project", "preference", "fact"].includes(parsed.kind)) {
      await remember(db, ws, parsed.kind, String(parsed.text).slice(0, 500), sourceMessageId);
      stored = String(parsed.text).slice(0, 500);
    }
  } catch {
  }
  return { reply: ai.value, provider: ai.provider, storedMemory: stored };
}
async function maybeHandleAssistant(db, env, c) {
  await ensureAssistantTables(db);
  const s = await db.query(`SELECT owner_phone, enabled FROM assistant_setting WHERE workspace_id=$1`, [c.workspaceId]);
  const setting = s.rows[0];
  if (!setting || !setting.enabled || !setting.owner_phone) return false;
  if (String(setting.owner_phone).replace(/\D/g, "") !== c.waId.replace(/\D/g, "")) return false;
  const org = await db.query(`SELECT o.plan FROM organizations_organization o JOIN workspaces_workspace w ON w.organization_id=o.id WHERE w.id=$1`, [c.workspaceId]);
  if ((org.rows[0]?.plan || "starter") !== "business-pro") return false;
  const taskId = await startTask(db, c.workspaceId, "message", `Reply to owner: ${c.body.slice(0, 80)}`);
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS cf_ai_usage(workspace_id uuid, day date, attempts int NOT NULL DEFAULT 0, PRIMARY KEY(workspace_id, day))`);
    await db.query(
      `INSERT INTO cf_ai_usage(workspace_id, day, attempts) VALUES($1, CURRENT_DATE, 1)
       ON CONFLICT (workspace_id, day) DO UPDATE SET attempts = cf_ai_usage.attempts + 1`,
      [c.workspaceId]
    );
    const result = await handleAssistantMessage(db, env, c.workspaceId, c.businessName, c.contactId, c.body, c.zernioMessageId || void 0, void 0, taskId);
    const outId = crypto.randomUUID();
    await db.query(
      `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
       VALUES($1,'outbound','assistant',$2,'',true,now(),$3,$4,'[]'::jsonb)`,
      [outId, result.reply, c.contactId, c.workspaceId]
    );
    const { sendChannelMessage: sendChannelMessage2 } = await Promise.resolve().then(() => (init_receptionist(), receptionist_exports));
    const sent = await sendChannelMessage2(db, env, c.channel, c.contactId, c.waId, result.reply);
    if (sent.ok) await db.query(`UPDATE receptionist_message SET is_draft=false, zernio_message_id=$1 WHERE id=$2`, [sent.messageId, outId]);
    await finishTask(db, taskId, "done");
    return true;
  } catch (e) {
    await finishTask(db, taskId, "failed", String(e).slice(0, 200));
    return true;
  }
}
async function getSettings(db, ws) {
  await ensureAssistantTables(db);
  const r = await db.query(`SELECT owner_phone, enabled FROM assistant_setting WHERE workspace_id=$1`, [ws]);
  return r.rows[0] || null;
}
async function upsertSettings(db, ws, ownerPhone, enabled) {
  await ensureAssistantTables(db);
  const phone = ownerPhone.replace(/\D/g, "").slice(0, 32);
  await db.query(
    `INSERT INTO assistant_setting(workspace_id, owner_phone, enabled, updated_at) VALUES($1,$2,$3,now())
     ON CONFLICT (workspace_id) DO UPDATE SET owner_phone=$2, enabled=$3, updated_at=now()`,
    [ws, phone, enabled]
  );
}
async function assistantCounts(db, ws) {
  await ensureAssistantTables(db);
  const [m, a, t] = await Promise.all([
    db.query(`SELECT count(*) c FROM assistant_memory WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT count(*) c FROM assistant_approval WHERE workspace_id=$1 AND status='pending'`, [ws]),
    db.query(`SELECT count(*) c FROM assistant_task WHERE workspace_id=$1 AND status='running'`, [ws])
  ]);
  return { memories: Number(m.rows[0].c), pending: Number(a.rows[0].c), running: Number(t.rows[0].c) };
}
var tablesReady, isRuleCapture, isMemoryQuery, isTasksQuery, isVaultRequest, isApprovalReply, isActionIntent, CORE_RULES, STOP, sast;
var init_assistant = __esm({
  "src/assistant.ts"() {
    init_freeai();
    tablesReady = false;
    isRuleCapture = (t) => /^(new rule|rule)\s*[:\-]/i.test(t.trim()) || /\b(remember this|never forget|from now on)\b/i.test(t);
    isMemoryQuery = (t) => /\bwhat do you (remember|know)\b/i.test(t);
    isTasksQuery = (t) => /\b(what are you (running|doing)|running tasks|task log|show tasks)\b/i.test(t);
    isVaultRequest = (t) => /\b(save|store|add)\b.*\b(secret|password|api key|token)\b|\bvault\b/i.test(t);
    isApprovalReply = (t) => /^(go|sure|go sure|go\s*\+\s*sure|yes go)[.! ]*$/i.test(t.trim());
    isActionIntent = (t) => /\b(send|email|message|pay|buy|book|deploy|publish|post|schedule)\b/i.test(t) && !isApprovalReply(t) && !isMemoryQuery(t) && !isTasksQuery(t);
    CORE_RULES = [
      "Never invent facts. If memory is empty on something, say so plainly.",
      "Never print a vault secret or any stored credential, in any form.",
      "Research and drafts need no approval. Anything that sends, spends or deploys waits for the owner's Go + Sure.",
      "Short plain answers. The owner reads on a phone.",
      "If the owner said it once, remember it. Never make them repeat themselves."
    ];
    STOP = /* @__PURE__ */ new Set(["the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "it", "my", "me", "i", "you", "your", "what", "do", "does", "about", "this", "that", "with", "are", "was", "be", "how", "who", "when", "where", "can", "could", "please"]);
    sast = (d) => new Date(d).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
});
init_assistant();
export {
  assistantCounts,
  collectPage,
  consumeVaultLink,
  ensureAssistantTables,
  finishTask,
  getSettings,
  handleAssistantMessage,
  isActionIntent,
  isApprovalReply,
  isMemoryQuery,
  isRuleCapture,
  isTasksQuery,
  isVaultRequest,
  keywords,
  loadRules,
  maybeHandleAssistant,
  openSecret,
  recall,
  remember,
  runningTasks,
  sealSecret,
  startTask,
  storeSecret,
  upsertSettings
};
