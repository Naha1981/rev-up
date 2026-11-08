var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/presets.ts
function getPreset(industry) {
  const k = (industry || "general").trim();
  return PRESETS[k] || PRESETS[ALIAS[k]] || PRESETS[k.replace(/-/g, "_")] || PRESETS.general;
}
function industryLabel(k) {
  const f = INDUSTRIES.find(([v]) => v === k);
  return f ? f[1] : PRESETS[k]?.label || k || "General local service";
}
var INDUSTRIES, PRESETS, ALIAS;
var init_presets = __esm({
  "src/presets.ts"() {
    INDUSTRIES = [["plumber", "Plumbing"], ["electrician", "Electrical"], ["security", "Security"], ["solar", "Solar / inverters"], ["auto-workshop", "Auto workshop"], ["panel-beater", "Panel beater / body shop"], ["auto-electrician", "Auto electrician"], ["mobile-mechanic", "Mobile mechanic"], ["towing", "Towing / roadside"], ["hvac", "Aircon / refrigeration"], ["roofing", "Roofing / waterproofing"], ["gates-access", "Gates / fencing / access control"], ["pest-control", "Pest control"], ["property-maintenance", "Property maintenance"], ["container-transport", "Container transport"], ["pool", "Pool services"], ["aesthetics", "Aesthetics / cosmetic clinic"], ["real-estate", "Real estate"], ["property-management", "Property management"], ["legal", "Law firm"], ["financial-broker", "Financial / insurance broker"], ["funeral", "Funeral services"], ["dental", "Dental practice"], ["restaurant", "Restaurant / cafe / takeaway"], ["catering", "Catering / food truck"], ["trades", "Trades (general building & repairs)"], ["general", "General local service"]];
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

// node_modules/spark-md5/spark-md5.js
var require_spark_md5 = __commonJS({
  "node_modules/spark-md5/spark-md5.js"(exports, module) {
    (function(factory) {
      if (typeof exports === "object") {
        module.exports = factory();
      } else if (typeof define === "function" && define.amd) {
        define(factory);
      } else {
        var glob;
        try {
          glob = window;
        } catch (e) {
          glob = self;
        }
        glob.SparkMD5 = factory();
      }
    })(function(undefined2) {
      "use strict";
      var add32 = function(a, b) {
        return a + b & 4294967295;
      }, hex_chr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
      function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32(a << s | a >>> 32 - s, b);
      }
      function md5cycle(x, k) {
        var a = x[0], b = x[1], c = x[2], d = x[3];
        a += (b & c | ~b & d) + k[0] - 680876936 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[1] - 389564586 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[2] + 606105819 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[4] - 176418897 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[7] - 45705983 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[10] - 42063 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
        a = (a << 7 | a >>> 25) + b | 0;
        d += (a & b | ~a & c) + k[13] - 40341101 | 0;
        d = (d << 12 | d >>> 20) + a | 0;
        c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
        c = (c << 17 | c >>> 15) + d | 0;
        b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
        b = (b << 22 | b >>> 10) + c | 0;
        a += (b & d | c & ~d) + k[1] - 165796510 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[11] + 643717713 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[0] - 373897302 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[5] - 701558691 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[10] + 38016083 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[15] - 660478335 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[4] - 405537848 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[9] + 568446438 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[3] - 187363961 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
        a = (a << 5 | a >>> 27) + b | 0;
        d += (a & c | b & ~c) + k[2] - 51403784 | 0;
        d = (d << 9 | d >>> 23) + a | 0;
        c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
        c = (c << 14 | c >>> 18) + d | 0;
        b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
        b = (b << 20 | b >>> 12) + c | 0;
        a += (b ^ c ^ d) + k[5] - 378558 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[14] - 35309556 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[7] - 155497632 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[13] + 681279174 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[0] - 358537222 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[3] - 722521979 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[6] + 76029189 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (b ^ c ^ d) + k[9] - 640364487 | 0;
        a = (a << 4 | a >>> 28) + b | 0;
        d += (a ^ b ^ c) + k[12] - 421815835 | 0;
        d = (d << 11 | d >>> 21) + a | 0;
        c += (d ^ a ^ b) + k[15] + 530742520 | 0;
        c = (c << 16 | c >>> 16) + d | 0;
        b += (c ^ d ^ a) + k[2] - 995338651 | 0;
        b = (b << 23 | b >>> 9) + c | 0;
        a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
        a = (a << 6 | a >>> 26) + b | 0;
        d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
        d = (d << 10 | d >>> 22) + a | 0;
        c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
        c = (c << 15 | c >>> 17) + d | 0;
        b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
        b = (b << 21 | b >>> 11) + c | 0;
        x[0] = a + x[0] | 0;
        x[1] = b + x[1] | 0;
        x[2] = c + x[2] | 0;
        x[3] = d + x[3] | 0;
      }
      function md5blk(s) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
      }
      function md5blk_array(a) {
        var md5blks = [], i;
        for (i = 0; i < 64; i += 4) {
          md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
      }
      function md51(s) {
        var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function md51_array(a) {
        var n = a.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
        for (i = 64; i <= n; i += 64) {
          md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }
        a = i - 64 < n ? a.subarray(i - 64) : new Uint8Array(0);
        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= a[i] << (i % 4 << 3);
        }
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(state, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(state, tail);
        return state;
      }
      function rhex(n) {
        var s = "", j;
        for (j = 0; j < 4; j += 1) {
          s += hex_chr[n >> j * 8 + 4 & 15] + hex_chr[n >> j * 8 & 15];
        }
        return s;
      }
      function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
          x[i] = rhex(x[i]);
        }
        return x.join("");
      }
      if (hex(md51("hello")) !== "5d41402abc4b2a76b9719d911017c592") {
        add32 = function(x, y) {
          var lsw = (x & 65535) + (y & 65535), msw = (x >> 16) + (y >> 16) + (lsw >> 16);
          return msw << 16 | lsw & 65535;
        };
      }
      if (typeof ArrayBuffer !== "undefined" && !ArrayBuffer.prototype.slice) {
        (function() {
          function clamp(val, length) {
            val = val | 0 || 0;
            if (val < 0) {
              return Math.max(val + length, 0);
            }
            return Math.min(val, length);
          }
          ArrayBuffer.prototype.slice = function(from, to) {
            var length = this.byteLength, begin = clamp(from, length), end = length, num, target, targetArray, sourceArray;
            if (to !== undefined2) {
              end = clamp(to, length);
            }
            if (begin > end) {
              return new ArrayBuffer(0);
            }
            num = end - begin;
            target = new ArrayBuffer(num);
            targetArray = new Uint8Array(target);
            sourceArray = new Uint8Array(this, begin, num);
            targetArray.set(sourceArray);
            return target;
          };
        })();
      }
      function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
          str = unescape(encodeURIComponent(str));
        }
        return str;
      }
      function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length, buff = new ArrayBuffer(length), arr = new Uint8Array(buff), i;
        for (i = 0; i < length; i += 1) {
          arr[i] = str.charCodeAt(i);
        }
        return returnUInt8Array ? arr : buff;
      }
      function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
      }
      function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);
        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);
        return returnUInt8Array ? result : result.buffer;
      }
      function hexToBinaryString(hex2) {
        var bytes = [], length = hex2.length, x;
        for (x = 0; x < length - 1; x += 2) {
          bytes.push(parseInt(hex2.substr(x, 2), 16));
        }
        return String.fromCharCode.apply(String, bytes);
      }
      function SparkMD52() {
        this.reset();
      }
      SparkMD52.prototype.append = function(str) {
        this.appendBinary(toUtf8(str));
        return this;
      };
      SparkMD52.prototype.appendBinary = function(contents) {
        this._buff += contents;
        this._length += contents.length;
        var length = this._buff.length, i;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }
        this._buff = this._buff.substring(i - 64);
        return this;
      };
      SparkMD52.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, i, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff.charCodeAt(i) << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.prototype.reset = function() {
        this._buff = "";
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.prototype.getState = function() {
        return {
          buff: this._buff,
          length: this._length,
          hash: this._hash.slice()
        };
      };
      SparkMD52.prototype.setState = function(state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;
        return this;
      };
      SparkMD52.prototype.destroy = function() {
        delete this._hash;
        delete this._buff;
        delete this._length;
      };
      SparkMD52.prototype._finish = function(tail, length) {
        var i = length, tmp, lo, hi;
        tail[i >> 2] |= 128 << (i % 4 << 3);
        if (i > 55) {
          md5cycle(this._hash, tail);
          for (i = 0; i < 16; i += 1) {
            tail[i] = 0;
          }
        }
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;
        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
      };
      SparkMD52.hash = function(str, raw) {
        return SparkMD52.hashBinary(toUtf8(str), raw);
      };
      SparkMD52.hashBinary = function(content, raw) {
        var hash = md51(content), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      SparkMD52.ArrayBuffer = function() {
        this.reset();
      };
      SparkMD52.ArrayBuffer.prototype.append = function(arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true), length = buff.length, i;
        this._length += arr.byteLength;
        for (i = 64; i <= length; i += 64) {
          md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }
        this._buff = i - 64 < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.end = function(raw) {
        var buff = this._buff, length = buff.length, tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], i, ret;
        for (i = 0; i < length; i += 1) {
          tail[i >> 2] |= buff[i] << (i % 4 << 3);
        }
        this._finish(tail, length);
        ret = hex(this._hash);
        if (raw) {
          ret = hexToBinaryString(ret);
        }
        this.reset();
        return ret;
      };
      SparkMD52.ArrayBuffer.prototype.reset = function() {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];
        return this;
      };
      SparkMD52.ArrayBuffer.prototype.getState = function() {
        var state = SparkMD52.prototype.getState.call(this);
        state.buff = arrayBuffer2Utf8Str(state.buff);
        return state;
      };
      SparkMD52.ArrayBuffer.prototype.setState = function(state) {
        state.buff = utf8Str2ArrayBuffer(state.buff, true);
        return SparkMD52.prototype.setState.call(this, state);
      };
      SparkMD52.ArrayBuffer.prototype.destroy = SparkMD52.prototype.destroy;
      SparkMD52.ArrayBuffer.prototype._finish = SparkMD52.prototype._finish;
      SparkMD52.ArrayBuffer.hash = function(arr, raw) {
        var hash = md51_array(new Uint8Array(arr)), ret = hex(hash);
        return raw ? hexToBinaryString(ret) : ret;
      };
      return SparkMD52;
    });
  }
});

// src/index.ts
import { Client, Pool } from "pg";

// src/landing.ts
var LOGO_B64 = "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";
var DASH_JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCADcAooDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD7DoooqQCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoooo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tXCPrSj6U40YpKNhSrTlLmuIvFL3opaszCiiimAUUUUAFFFFABRRRQAUUUUAR3X/AB7yf7ppjfeP1p90f3J98UzAqWAmDnIbBpfNkB5jB9w1JRQA7zn/AOeX/j1HnP8A88v/AB6m0U7gO85/+eX/AI9R5z/88v8Ax6m0UXAd5z/88v8Ax6jzn/55f+PU2ii4DvOf/nl/49R5z/8APL/x6m0UXAd5z/8APL/x6jzn/wCeX/j1NoouA7zn/wCeX/j1HnP/AM8v/HqbRRcB3nP/AM8v/HqPOf8A55f+PU2ii4DvOf8A55f+PUec/wDzy/8AHqbRQAplkPSMZ92pB6klj64oopAHB60IzpkAbh6E4xRRQA7zn/55f+PUec//ADy/8eptFO4DvOf/AJ5f+PUec/8Azy/8eptFFwHec/8Azy/8eo85/wDnl/49TaKLgO85/wDnl/49R5z/APPL/wAeptFFwHec/wDzy/8AHqPOf/nl/wCPU2ii4DvOf/nl/wCPUec//PL/AMeptFFwHec//PL/AMeo85/+eX/j1NoouA7zn/55f+PUec//ADy/8eptFFwHec//ADy/8eFNJZyA+FX+6P8AGiigA6+1JyCGU4buCODS0UgFErjrF+TCl85/+eX/AI9TaKdwHec//PL/AMeo85/+eX/j1NoouA7zn/55f+PUec//ADy/8eptFFwHec//ADy/8eo85/8Anl/49TaKLgO85/8Anl/49R5z/wDPL/x6m0UXAd5z/wDPL/x6jzn/AOeX/j1NoouA7zn/AOeX/j1HnP8A88v/AB6m0UXAd5z/APPL/wAeo85/+eX/AI9TaKLgO85/+eX/AI9SGWQ8BAPfNJRQAAY/HrQQCMHvRRSAUSSLxtDDtzS+c/8Azy/8eptFADvOf/nl/wCPUec//PL/AMeptFO4DvOf/nl/49R5z/8APL/x6m0UXAd5z/8APL/x6jzn/wCeX/j1NoouA7zn/wCeX/j1HnP/AM8v/HqbRRcB3nP/AM8v/HqPOf8A55f+PU2ii4DvOf8A55f+PUec/wDzy/8AHqbRRcB3nP8A88v/AB6jzn/55f8Aj1NoouA7zn/55f8Aj1IZn7RD/vqkooADuY7n/IUufakopAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH/9k=";
var CHAT_JPG = "data:image/jpeg;base64,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";
var STYLE = `
@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap");
:root{--cream:#f6f0e7;--paper:#fffaf2;--ink:#171714;--orange:#f47721;--green:#214b3b;--muted:#77736d;--line:rgba(23,23,20,.14)}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:Manrope,Arial,sans-serif;background:var(--cream);color:var(--ink);-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}
.mono{font-family:"DM Mono",monospace}
h1,h2,h3,.display{font-family:"Space Grotesk",Manrope,sans-serif;letter-spacing:-0.02em}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
.topbar{background:var(--ink);color:#f6f0e7;font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.14em;padding:8px 0}
.topbar .wrap{display:flex;justify-content:space-between;gap:14px}
.topbar .dot{color:var(--orange)}
nav{position:sticky;top:0;z-index:50;background:rgba(246,240,231,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
nav .links{display:flex;gap:26px;font-size:14px;font-weight:600}
nav .links a:hover{color:var(--orange)}
nav .navcta{display:flex;align-items:center;gap:18px;font-size:14px;font-weight:600}
.logo img{height:30px;width:auto}
.btn{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;font-weight:700;font-size:14.5px;border:1px solid transparent;transition:transform .15s ease}
.btn:hover{transform:translateY(-2px)}
.btn-orange{background:var(--orange);color:#171714}
.btn-dark{background:var(--ink);color:#f6f0e7}
.btn-ghost{border-color:var(--ink);color:var(--ink);background:transparent}
.btn-line{font-weight:700;font-size:14.5px;border-bottom:2px solid var(--ink);padding-bottom:4px}
.eyebrow{font-family:"DM Mono",monospace;font-size:11px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase;display:flex;align-items:center;gap:10px}
.eyebrow:before{content:"";width:26px;height:2px;background:var(--orange);display:inline-block}
section{padding:96px 0}
.h-big{font-size:clamp(40px,5.6vw,76px);line-height:1.02;font-weight:700}
.h-mid{font-size:clamp(32px,4.2vw,54px);line-height:1.05;font-weight:700}
.lede{font-size:17px;line-height:1.65;color:var(--muted);max-width:560px}
.split-head{display:grid;grid-template-columns:1.2fr .8fr;gap:60px;align-items:end;margin-bottom:56px}
.hero{padding:80px 0 0}
.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;padding:36px 0 70px}
.hero h1{font-size:clamp(44px,5.8vw,84px);line-height:1.0;font-weight:700}
.hero .o{color:var(--orange)}.hero .g{color:var(--green)}
.hero-cta{display:flex;gap:16px;align-items:center;margin:30px 0 26px;flex-wrap:wrap}
.hero-note{display:flex;align-items:center;gap:12px;font-size:13.5px;color:var(--muted)}
.dots{display:flex}.dots span{width:26px;height:26px;border-radius:50%;border:2px solid var(--cream);margin-left:-8px}
.dots span:first-child{margin-left:0}
.mock{position:relative;background:var(--paper);border:1px solid var(--line);padding:18px;box-shadow:0 24px 60px -30px rgba(23,23,20,.35)}
.mock .mockhead{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.14em;color:var(--muted);display:flex;justify-content:space-between;margin-bottom:12px}
.badge{position:absolute;background:var(--paper);border:1px solid var(--line);padding:10px 14px;font-size:12px;font-weight:700;box-shadow:0 10px 30px -12px rgba(23,23,20,.3);display:flex;gap:8px;align-items:center}
.badge small{display:block;font-weight:500;color:var(--muted);font-size:11px}
.badge .b1{color:var(--orange)}
.metastrip{border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:16px 0;display:flex;justify-content:space-between;gap:16px;font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.16em;color:var(--muted);flex-wrap:wrap}
.marquee{background:var(--orange);color:var(--ink);overflow:hidden;padding:13px 0;border-top:1px solid rgba(23,23,20,.2)}
.marquee-track{display:flex;justify-content:center;text-align:center;font-family:"Space Grotesk";font-weight:700;font-size:15px;letter-spacing:.06em}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.ecard{padding:30px;display:flex;flex-direction:column;gap:16px;min-height:520px}
.ecard.dark{background:var(--green);color:#f6f0e7}
.ecard.paper{background:var(--paper);border:1px solid var(--line)}
.ecard.orange{background:var(--orange);color:var(--ink)}
.ecard .num{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.16em;opacity:.75}
.ecard h3{font-size:26px;line-height:1.12}
.ecard p{font-size:14.5px;line-height:1.6;opacity:.85}
.ecard .foot{margin-top:auto;font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.12em;border-top:1px solid currentColor;padding-top:12px;opacity:.8}
.phone{background:#fff;border-radius:22px;padding:12px;border:1px solid rgba(23,23,20,.12)}
.status-banner{margin:64px 0 0;border:1px solid var(--line);background:var(--paper);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:18px;font-size:14px;flex-wrap:wrap}
.status-banner b{font-weight:800}
.banner-dark{background:var(--ink);color:#f6f0e7;padding:88px 0;position:relative;overflow:hidden}
.banner-dark h2{font-size:clamp(36px,4.6vw,64px);line-height:1.03}
.banner-dark .o{color:var(--orange)}
.banner-dark .right{max-width:420px;color:#b9b4aa;font-size:15.5px;line-height:1.65}
.banner-dark .grid{display:grid;grid-template-columns:1.3fr .7fr;gap:50px;align-items:center}
.chev{position:absolute;right:-30px;top:50%;transform:translateY(-50%);color:var(--orange);font-size:200px;font-family:"Space Grotesk";font-weight:700;opacity:.9}
.igrid{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line);background:var(--paper)}
.icell{padding:22px 20px 26px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-height:190px;display:flex;flex-direction:column;gap:10px}
.icell .num{font-family:"DM Mono",monospace;font-size:10.5px;color:var(--muted);display:flex;justify-content:space-between}
.icell .num i{color:var(--orange);font-style:normal}
.icell h3{font-size:16.5px}
.icell .tags{font-family:"DM Mono",monospace;font-size:9.5px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
.icell p{font-size:12.5px;line-height:1.55;color:var(--muted)}
.dark-sec{background:var(--green);color:#f6f0e7}
.dark-sec .lede{color:#b9c4bd}
.panel{background:var(--paper);color:var(--ink);padding:26px;border:1px solid var(--line)}
.panel .phead{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.14em;color:var(--muted);display:flex;justify-content:space-between;margin-bottom:8px}
.panel h3{font-size:24px;margin-bottom:16px}
.bignum{font-family:"Space Grotesk";font-size:56px;font-weight:700}
.prow{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px;font-weight:600}
.prow:last-child{border-bottom:none}
.tag{font-family:"DM Mono",monospace;font-size:9.5px;letter-spacing:.1em}
.tag.ok{color:var(--green)}
.tag.wip{color:var(--orange)}
.tick{color:var(--green);font-weight:800}
.circle{color:var(--orange)}
.checkline{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;font-weight:600;margin:10px 0}
.checkline:before{content:"\\2713";color:var(--green);font-weight:800}
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tcell{background:var(--paper);border:1px solid var(--line);padding:24px;min-height:210px;display:flex;flex-direction:column;gap:10px}
.tcell .num{font-family:"DM Mono",monospace;font-size:10.5px;color:var(--muted)}
.tcell h3{font-size:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tcell p{font-size:13.5px;line-height:1.6;color:var(--muted)}
.pill{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:.1em;padding:4px 9px;border-radius:99px;text-transform:uppercase;white-space:nowrap}
.pill-live{background:#dff2e5;color:#1d5c38}
.pill-wip{background:#fbe3c2;color:#9a4d00}
.dashcard{background:var(--paper);border:1px solid var(--line);padding:16px;box-shadow:0 24px 60px -30px rgba(23,23,20,.3)}
.dashcard .bar{display:flex;gap:6px;margin-bottom:12px;align-items:center}
.dashcard .bar i{width:9px;height:9px;border-radius:50%;background:var(--line)}
.dashcard .bar .url{font-family:"DM Mono",monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:3px 12px;margin-left:8px}
.pricing{background:var(--ink);color:#f6f0e7}
.pricing .lede{color:#b9b4aa;margin:0 auto}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:56px}
.plan{background:var(--paper);color:var(--ink);padding:30px;display:flex;flex-direction:column;gap:14px;position:relative}
.plan .num{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.14em;color:var(--muted);display:flex;justify-content:space-between}
.plan h3{font-size:24px}
.plan .p{font-family:"Space Grotesk";font-size:52px;font-weight:700}
.plan .p sup{font-size:18px;vertical-align:top;top:14px;position:relative}
.plan .per{font-size:13px;color:var(--muted);margin-top:-10px}
.plan ul{list-style:none;display:flex;flex-direction:column;gap:9px;font-size:14px;font-weight:600;margin:8px 0 18px}
.plan ul li{display:flex;gap:9px}
.plan ul li:before{content:"\\25CF";color:var(--orange);font-size:9px;margin-top:4px}
.plan .btn{margin-top:auto;justify-content:center}
.plan.hot{background:var(--orange)}
.plan.hot .num,.plan.hot .per{color:rgba(23,23,20,.65)}
.plan.hot ul li:before{color:var(--ink)}
.plan .most{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--paper);border:1px solid var(--line);font-family:"DM Mono",monospace;font-size:9.5px;letter-spacing:.14em;padding:5px 12px}
.pfoot{font-family:"DM Mono",monospace;font-size:9.5px;letter-spacing:.14em;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
.step{border-top:1px solid var(--line);padding-top:18px}
.step .num{font-family:"DM Mono",monospace;font-size:10.5px;color:var(--muted)}
.step h3{font-size:20px;margin:14px 0 8px}
.step p{font-size:14px;line-height:1.6;color:var(--muted)}
.faq{background:var(--ink);color:#f6f0e7}
.faq .lede{color:#b9b4aa}
.faq-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:60px}
details{border-bottom:1px solid rgba(246,240,231,.14)}
summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;padding:20px 0;font-weight:700;font-size:15.5px;font-family:"Space Grotesk"}
summary::-webkit-details-marker{display:none}
summary:after{content:"+";color:var(--orange);font-size:20px}
details[open] summary:after{content:"\\2013"}
details p{color:#b9b4aa;font-size:14.5px;line-height:1.65;padding:0 0 20px;max-width:560px}
.cta{background:var(--orange);color:var(--ink);text-align:center;padding:110px 0 70px;position:relative;overflow:hidden}
.cta h2{font-size:clamp(40px,5.4vw,74px);line-height:1.02}
.cta .lede{color:rgba(23,23,20,.7);margin:18px auto 30px}
.cta .foot{font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.18em;margin-top:70px;opacity:.75}
footer{background:var(--ink);color:#f6f0e7;padding:64px 0 26px}
.foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:40px;margin-bottom:50px}
footer .tagline{font-size:14.5px;line-height:1.7;color:#b9b4aa;margin-top:16px}
footer h4{font-family:"DM Mono",monospace;font-size:10.5px;letter-spacing:.16em;color:#b9b4aa;margin-bottom:14px;font-weight:500}
footer ul{list-style:none;display:flex;flex-direction:column;gap:9px;font-size:14px;font-weight:600}
footer ul a:hover{color:var(--orange)}
.foot-base{border-top:1px solid rgba(246,240,231,.14);padding-top:20px;display:flex;justify-content:space-between;font-family:"DM Mono",monospace;font-size:9.5px;letter-spacing:.14em;color:#77736d;flex-wrap:wrap;gap:10px}
@media (max-width:900px){
.hero-grid,.split-head,.banner-dark .grid,.faq-grid{grid-template-columns:1fr;gap:34px}
.cards3,.tgrid,.pgrid,.steps{grid-template-columns:1fr}
.igrid{grid-template-columns:repeat(2,1fr)}
nav .links{display:none}
section{padding:64px 0}
.hero{padding:48px 0 0}
.mock{margin-top:10px}
.chev{display:none}
.foot-grid{grid-template-columns:1fr 1fr}
}
`;
function landingPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RevUp by NahaLabs - Your WhatsApp employee. Your reputation. Your growth.</title>
<meta name="description" content="RevUp answers every customer on WhatsApp in seconds, turns happy customers into Google reviews, and keeps your socials alive. Built for South African businesses. R499 to R1,999 per month.">
<style>${STYLE}</style></head><body>

<div class="topbar"><div class="wrap">
<span><span class="dot">&#9679;</span> BUILT FOR THE WAY SOUTH AFRICAN BUSINESSES WORK</span>
<span>CUSTOMER ENGAGEMENT, WITH INTENTION &#8599;</span>
</div></div>

<nav><div class="wrap">
<a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp by NahaLabs"></a>
<div class="links"><a href="#platform">Platform</a><a href="#industries">Industries</a><a href="#leadfinder">Lead-Finder</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
<div class="navcta"><a href="/login">Open the app</a><a class="btn btn-orange" href="/signup">Start today &#8599;</a></div>
</div></nav>

<header class="hero"><div class="wrap">
<div class="hero-grid">
<div>
<p class="eyebrow">The customer growth platform</p>
<h1 style="margin-top:18px">Your WhatsApp <span class="o">employee.</span><br>Your <span class="g">reputation.</span><br>Your growth.</h1>
<p class="lede" style="margin-top:22px">Less chasing. More momentum. RevUp answers every customer on WhatsApp in seconds, turns happy customers into Google reviews, and keeps your social media alive - while you get on with the work.</p>
<div class="hero-cta">
<a class="btn btn-orange" href="#pricing">See plans &amp; pricing &#8599;</a>
<a class="btn-line" href="#platform">Explore the platform &#8600;</a>
</div>
<div class="hero-note"><span class="dots"><span style="background:#f47721"></span><span style="background:#214b3b"></span><span style="background:#171714"></span></span><span><b>Made for real businesses.</b><br>From the first message to the next five-star review.</span></div>
</div>
<div>
<div class="mock">
<div class="mockhead"><span>&#9679; YOUR BUSINESS, THIS WEEK</span><span>REVUP / 01</span></div>
<img src="${DASH_JPG}" alt="The real RevUp dashboard: posts, approvals, review links and subscription at a glance">
<div class="badge" style="top:26px;right:-16px"><span class="b1">&#9733;</span><span>Review link clicked<small>Tracked activity</small></span></div>
<div class="badge" style="bottom:30px;left:-22px"><span class="tick">&#10003;</span><span>Post approved<small>Audit trail recorded</small></span></div>
</div>
</div>
</div>
<div class="metastrip"><span>ONE PLATFORM. MORE MOMENTUM.</span><span>WHATSAPP &nbsp;&nbsp; REVIEWS &nbsp;&nbsp; SOCIAL &nbsp;&nbsp; INDUSTRY WORKFLOWS</span></div>
</div></header>

<div class="marquee"><div class="marquee-track">
<span>RESPOND WITH PURPOSE &#10035; BUILD TRUST &#10035; KEEP MOVING &#10035; TURN ENQUIRIES INTO ACTION</span>
</div></div>

<section id="platform"><div class="wrap">
<div class="split-head">
<div><p class="eyebrow">The RevUp edge</p><h2 class="h-mid" style="margin-top:16px">Less chasing.<br><span style="color:var(--orange)">More momentum.</span></h2></div>
<p class="lede">Customers do not wait around. RevUp helps you stay on top of the moments that shape your reputation and move business forward.</p>
</div>
<div class="cards3">
<div class="ecard dark">
<span class="num">01 / CUSTOMER RESPONSE</span>
<h3>A WhatsApp employee that works the front line.</h3>
<p>Give customers a useful first response, capture what they need and help move bookings forward - without leaving an enquiry waiting.</p>
<div class="phone"><img src="${CHAT_JPG}" alt="A real RevUp conversation: a customer books a teeth whitening appointment on WhatsApp" style="border-radius:12px"></div>
<div class="foot">WHATSAPP-LED SERVICE &nbsp;&nbsp; 01 &#8599;<br><span class="tag ok">&#9679; LIVE</span></div>
</div>
<div class="ecard paper">
<span class="num">02 / REPUTATION</span>
<h3>Make great service count for more.</h3>
<p>Send trackable review requests, see link activity and give unhappy customers a route back to you before their issue goes public.</p>
<p><span class="bignum">4.9</span> <span style="color:var(--orange)">&#9733;&#9733;&#9733;&#9733;&#9733;</span><br><span class="tag" style="color:var(--muted)">ILLUSTRATIVE RATING DISPLAY</span></p>
<div class="checkline">Review request sent - tracked</div>
<div class="checkline"><span style="color:var(--orange)">Unhappy customer flagged - owner first</span></div>
<div class="foot">GOOGLE REVIEW BOOSTER &nbsp;&nbsp; 02 &#8599;<br><span class="tag ok">&#9679; LIVE</span></div>
</div>
<div class="ecard orange">
<span class="num">03 / BRAND PRESENCE</span>
<h3>Show up consistently. Stay in control.</h3>
<p>Bring social content into a clear review-and-approve flow. Keep your team aligned and know who approved what.</p>
<p style="font-family:Space Grotesk;font-weight:700;font-size:22px">YOUR WORK.<br>YOUR STANDARD.</p>
<p style="font-size:13px">Every post drafted by RevUp, approved by a human, logged with a name and a timestamp.</p>
<div class="foot">APPROVALS WITH AN AUDIT TRAIL &nbsp;&nbsp; 03 &#8599;<br><span class="tag" style="color:#171714">&#9679; APPROVAL WORKFLOW LIVE &middot; FACEBOOK/INSTAGRAM PUBLISHING IN PROGRESS</span></div>
</div>
</div>
<div class="status-banner">
<span><b>Clear status. No smoke and mirrors.</b> We mark what is live and what is still in progress. Your business deserves to know what is ready.</span>
<a class="btn-line" href="#leadfinder">See feature availability &#8599;</a>
</div>
</div></section>

<div class="banner-dark"><div class="wrap"><div class="grid">
<div><p class="eyebrow" style="color:#b9b4aa">Built around your business</p>
<h2 style="margin-top:18px">Not another<br>generic<br><span class="o">bot in a box.</span></h2></div>
<p class="right">Different businesses. Different conversations. RevUp&#39;s industry workflows are shaped around the questions customers actually ask and the next step your team needs to take.</p>
</div></div><span class="chev">&#8250;</span></div>

<section id="industries"><div class="wrap">
<div class="split-head">
<div><p class="eyebrow">Built for your world</p><h2 class="h-mid" style="margin-top:16px">Your industry.<br><span style="color:var(--orange)">Your workflow.</span></h2></div>
<p class="lede">From urgent call-outs to viewing requests, RevUp is designed to fit the way customers approach your business.</p>
</div>
<div class="igrid">
<div class="icell"><span class="num">01 <i>&#8599;</i></span><h3>Home services &amp; trades</h3><span class="tags">Plumbing &middot; Electrical &middot; Roofing &middot; Pools &middot; Aircon &middot; Pest control &middot; Gates</span><p>Capture call-outs and quote requests, book jobs, then ask for a review after the work.</p></div>
<div class="icell"><span class="num">02 <i>&#8599;</i></span><h3>Security &amp; solar</h3><span class="tags">Security &middot; Solar</span><p>Qualify enquiries, gather the right details and arrange site visits.</p></div>
<div class="icell"><span class="num">03 <i>&#8599;</i></span><h3>Automotive</h3><span class="tags">Workshops &middot; Panel beaters &middot; Auto electricians &middot; Mobile mechanics &middot; Towing</span><p>Take repair and breakdown details, coordinate bookings and request reviews.</p></div>
<div class="icell"><span class="num">04 <i>&#8599;</i></span><h3>Transport &amp; property maintenance</h3><span class="tags">Container transport &middot; Property maintenance</span><p>Collect quote requirements, create job-card workflows and capture tenant repair requests.</p></div>
<div class="icell"><span class="num">05 <i>&#8599;</i></span><h3>Health &amp; beauty</h3><span class="tags">Aesthetics &middot; Dental</span><p>Answer treatment questions, help customers book and send reminders.</p></div>
<div class="icell"><span class="num">06 <i>&#8599;</i></span><h3>Property</h3><span class="tags">Real estate &middot; Property management</span><p>Qualify prospective clients and arrange property viewings or maintenance requests.</p></div>
<div class="icell"><span class="num">07 <i>&#8599;</i></span><h3>Professional services</h3><span class="tags">Law firms &middot; Financial brokers</span><p>Arrange consultations and guide clients through document checklists.</p></div>
<div class="icell"><span class="num">08 <i>&#8599;</i></span><h3>Funeral services</h3><span class="tags">Funeral homes</span><p>Handle immediate-need enquiries with care, discretion and clear escalation.</p></div>
<div class="icell"><span class="num">09 <i>&#8599;</i></span><h3>Food &amp; hospitality</h3><span class="tags">Restaurants &middot; Cafes &middot; Catering</span><p>Answer menu and opening-hour questions, take booking enquiries, quote events and grow reviews.</p></div>
<div class="icell"><span class="num">10 <i>&#8599;</i></span><h3>Every other business</h3><span class="tags">General business reception</span><p>Give customers a clear first point of contact and route enquiries to the right person.</p></div>
</div>
<p class="tag" style="margin-top:14px;color:var(--muted)">INDUSTRY WORKFLOWS DESCRIBE INTENDED USE CASES. AVAILABILITY CAN VARY BY WORKFLOW AND ONBOARDING STATUS.</p>
</div></section>

<section class="dark-sec" id="leadfinder"><div class="wrap">
<div class="split-head" style="align-items:start">
<div><p class="eyebrow" style="color:#b9c4bd">Grow your pipeline</p>
<h2 class="h-mid" style="margin-top:16px">Find the right<br>businesses to<br><span style="color:var(--orange)">talk to next.</span></h2>
<p class="lede" style="margin-top:20px">Every enquiry becomes a tracked lead: captured, followed up, and reported on until it is won or lost. Lead-Finder presets help identify businesses by industry, so prospecting starts with a focused market instead of a blank page.</p>
<p style="margin-top:18px"><a class="btn-line" style="color:#f6f0e7;border-color:#f6f0e7" href="/signup">Ask about Lead-Finder &#8599;</a></p>
<p class="tag" style="margin-top:14px;color:#8fa398">PRESET COVERAGE IS SHOWN HONESTLY ALONGSIDE. MORE INDUSTRIES ARE BEING ADDED.</p>
</div>
<div class="panel">
<div class="phead"><span>REVUP / LEAD-FINDER</span><span>&#9679; PRESET STATUS</span></div>
<h3>Industry coverage</h3>
<div style="display:flex;gap:30px;margin-bottom:10px"><span><span class="bignum">05</span><br><span class="tag" style="color:var(--muted)">VERIFIED PRESETS</span></span><span><span class="bignum">+</span><br><span class="tag" style="color:var(--muted)">MORE IN PROGRESS</span></span></div>
<div class="prow"><span><span class="tick">&#10003;</span> Restaurants</span><span class="tag ok">DONE &middot; VERIFIED</span></div>
<div class="prow"><span><span class="tick">&#10003;</span> Dental practices</span><span class="tag ok">DONE &middot; VERIFIED</span></div>
<div class="prow"><span><span class="tick">&#10003;</span> Car dealers</span><span class="tag ok">DONE &middot; VERIFIED</span></div>
<div class="prow"><span><span class="tick">&#10003;</span> Funeral services</span><span class="tag ok">DONE &middot; VERIFIED</span></div>
<div class="prow"><span><span class="tick">&#10003;</span> General businesses</span><span class="tag ok">DONE &middot; VERIFIED</span></div>
<div class="prow"><span><span class="circle">&#9675;</span> Home services &amp; trades</span><span class="tag wip">IN PROGRESS</span></div>
<div class="prow"><span><span class="circle">&#9675;</span> Security &amp; solar</span><span class="tag wip">IN PROGRESS</span></div>
<div class="prow"><span><span class="circle">&#9675;</span> Automotive services</span><span class="tag wip">IN PROGRESS</span></div>
<div class="prow"><span><span class="circle">&#9675;</span> Property &amp; transport</span><span class="tag wip">IN PROGRESS</span></div>
<div class="prow"><span><span class="circle">&#9675;</span> Professional services</span><span class="tag wip">IN PROGRESS</span></div>
<div class="phead" style="margin-top:14px"><span>STATUS AS AT CURRENT BUILD</span><span>REVUP INTELLIGENCE &#8599;</span></div>
</div>
</div></section>

<section><div class="wrap">
<div class="split-head">
<div><p class="eyebrow">One clear view</p><h2 class="h-mid" style="margin-top:16px">Know what&#39;s<br>moving. Know<br><span style="color:var(--orange)">what needs you.</span></h2></div>
<div>
<p class="lede">A practical view of the customer touchpoints that matter: approvals, review links sent and clicked, and subscription status.</p>
<div style="margin-top:18px">
<div class="checkline">Approval queue at a glance</div>
<div class="checkline">Review link activity</div>
<div class="checkline">Subscription visibility</div>
<div class="checkline">A record of content decisions</div>
</div>
</div>
</div>
<div class="dashcard"><div class="bar"><i></i><i></i><i></i><span class="url">revup.nahalabs.co.za</span></div>
<img src="${DASH_JPG}" alt="The real RevUp dashboard, captured this week">
</div>
<p class="tag" style="margin-top:12px;color:var(--muted)">THE REAL REVUP DASHBOARD, CAPTURED THIS WEEK. NOT A STOCK MOCKUP.</p>
</div></section>

<section style="padding-top:0"><div class="wrap">
<div class="split-head">
<div><p class="eyebrow">Toolbox</p><h2 class="h-mid" style="margin-top:16px">And everything<br><span style="color:var(--orange)">around it.</span></h2></div>
<p class="lede">The quiet machinery that keeps the front of house running. Every item marked honestly: live means working today.</p>
</div>
<div class="tgrid">
<div class="tcell"><span class="num">01</span><h3>Lead pipeline <span class="pill pill-live">Live</span></h3><p>Enquiries from WhatsApp land in one pipeline. RevUp follows up for you, and you see exactly where every lead stands. On Business Pro.</p></div>
<div class="tcell"><span class="num">02</span><h3>Inbox <span class="pill pill-live">Live</span></h3><p>Every customer conversation in one place. Jump in and reply yourself any time - RevUp steps back when you do.</p></div>
<div class="tcell"><span class="num">03</span><h3>Bookings, waitlist &amp; loyalty <span class="pill pill-live">Live</span></h3><p>Appointments land in your calendar view with the details captured, a waitlist fills cancellations, and loyalty points bring customers back.</p></div>
<div class="tcell"><span class="num">04</span><h3>Quotes <span class="pill pill-live">Live</span></h3><p>RevUp sends quotes in chat from your own price list. The customer accepts with a tap and the job lands in your pipeline.</p></div>
<div class="tcell"><span class="num">05</span><h3>Campaigns <span class="pill pill-live">Live</span></h3><p>Promos to your own customers, sent only after your approval. STOP is honoured instantly, every time.</p></div>
<div class="tcell"><span class="num">06</span><h3>Competitor watch <span class="pill pill-live">Live</span></h3><p>Track your competitors&#39; prices and promos next to your own. RevUp flags concrete opportunities and drafts a campaign you approve in one tap.</p></div>
<div class="tcell"><span class="num">07</span><h3>WiFi card <span class="pill pill-live">Live</span></h3><p>A printable card for your waiting room. Guests scan one code for your WiFi and another to send an enquiry or book - straight into your pipeline.</p></div>
<div class="tcell"><span class="num">08</span><h3>Support inbox <span class="pill pill-live">Live</span></h3><p>Customer help requests land in the same flow and get answered fast, so small problems never become bad reviews.</p></div>
<div class="tcell"><span class="num">09</span><h3>Pro Assistant <span class="pill pill-live">Live on Business Pro</span></h3><p>Text RevUp questions like "how did last week go?" It pulls your real numbers, remembers your rules and does the admin. Backup AI keeps the line answering if one engine has a bad day.</p></div>
<div class="tcell"><span class="num">10</span><h3>Your social media team <span class="pill pill-live">Live</span></h3><p>A Researcher, a Writer and a Reviewer working for your business: they bring post ideas, write them in your voice and check every word. You make the final decisions - every post still waits for your approval.</p></div>
</div>
</div></section>

<section class="pricing" id="pricing"><div class="wrap">
<div class="center" style="text-align:center">
<p class="eyebrow" style="justify-content:center;color:#b9b4aa">Straight-up pricing</p>
<h2 class="h-mid" style="margin-top:16px">Choose your level<br>of <span style="color:var(--orange)">momentum.</span></h2>
<p class="lede" style="margin-top:16px">Three monthly options. A clear starting point for businesses ready to take customer engagement seriously.</p>
</div>
<div class="pgrid">
<div class="plan"><span class="num">01 / START <i style="color:var(--orange);font-style:normal">&#9679;</i></span>
<h3>Starter</h3><p style="font-size:13.5px;color:var(--muted)">For businesses ready to build a more consistent customer experience.</p>
<div class="p" aria-label="R499 per month"><sup>R</sup>499</div><div class="per">per month</div>
<ul><li>Google review booster</li><li>Enquiry inbox</li><li>Review links and reminders</li></ul>
<a class="btn btn-dark" href="/signup">Start today &#8599;</a>
<div class="pfoot">MONTH-TO-MONTH PRICING</div></div>
<div class="plan hot"><span class="most">MOST MOMENTUM</span><span class="num">02 / GROW <i style="font-style:normal">&#9679;</i></span>
<h3>Growth</h3><p style="font-size:13.5px;color:rgba(23,23,20,.65)">For growing teams ready to bring more customer touchpoints together.</p>
<div class="p" aria-label="R999 per month"><sup>R</sup>999</div><div class="per">per month</div>
<ul><li>Everything in Starter</li><li>Social posting with approvals</li><li>Campaigns to your customers</li><li>Bookings, waitlist and loyalty</li></ul>
<a class="btn btn-dark" href="/signup">Start today &#8599;</a>
<div class="pfoot" style="border-color:rgba(23,23,20,.2);color:rgba(23,23,20,.65)">MONTH-TO-MONTH PRICING</div></div>
<div class="plan"><span class="num">03 / SCALE <i style="color:var(--orange);font-style:normal">&#9679;</i></span>
<h3>Business Pro</h3><p style="font-size:13.5px;color:var(--muted)">For ambitious businesses looking for a stronger operating rhythm.</p>
<div class="p" aria-label="R1,999 per month"><sup>R</sup>1,999</div><div class="per">per month</div>
<ul><li>Everything in Growth</li><li>Hands-free auto-posting</li><li>Lead pipeline and follow-ups</li><li>Your own WhatsApp Assistant</li></ul>
<a class="btn btn-dark" href="/signup">Start today &#8599;</a>
<div class="pfoot">MONTH-TO-MONTH PRICING</div></div>
</div>
</div></section>

<section><div class="wrap">
<div class="split-head">
<div><p class="eyebrow">Get moving</p><h2 class="h-mid" style="margin-top:16px">Three steps.<br><span style="color:var(--orange)">Clearer momentum.</span></h2></div>
<p class="lede">No complicated transformation project. Start with your business, choose the right workflow and give customers a better way to connect.</p>
</div>
<div class="steps">
<div class="step"><span class="num">01</span><h3>Tell us about your business.</h3><p>Services, prices, hours, the way you talk. Ten minutes, once.</p></div>
<div class="step"><span class="num">02</span><h3>Connect your WhatsApp.</h3><p>RevUp answers on your existing business number. Your customers notice nothing but faster replies.</p></div>
<div class="step"><span class="num">03</span><h3>You approve, it works.</h3><p>Posts and sends wait for your approval. Bookings and reviews land on their own.</p></div>
</div>
</div></section>

<section class="faq" id="faq"><div class="wrap"><div class="faq-grid">
<div><p class="eyebrow" style="color:#b9b4aa">Good questions</p>
<h2 class="h-mid" style="margin-top:16px">Clear answers.<br><span style="color:var(--orange)">No surprises.</span></h2>
<p class="lede" style="margin-top:18px">We would rather be upfront about what is ready than promise the moon.</p>
<p style="margin-top:20px"><a class="btn-line" style="color:#f6f0e7;border-color:#f6f0e7" href="/signup">Still have a question? &#8599;</a></p>
</div>
<div>
<details open><summary>What is RevUp?</summary><p>RevUp is a customer engagement and business growth platform from NahaLabs. It brings together customer review growth, social content approvals and WhatsApp-led customer service workflows.</p></details>
<details><summary>Does RevUp replace my WhatsApp number?</summary><p>No. RevUp answers on your existing business number, and you can step into any conversation at any time from the inbox.</p></details>
<details><summary>Does it make things up?</summary><p>RevUp answers from the facts you give it - your services, prices and hours. It never invents prices. If it does not know, a person from your team confirms before the customer hears an answer.</p></details>
<details><summary>Can RevUp publish social posts automatically?</summary><p>Approval workflow is live: every post waits for your tap. Hands-free auto-posting is available on Business Pro once you trust the rhythm. Facebook and Instagram page connections are in progress and rolling out now.</p></details>
<details><summary>Is there a contract?</summary><p>No long contract. It is a simple monthly price and you can cancel from your billing page.</p></details>
<details><summary>What does "In progress" mean on this page?</summary><p>Exactly that: the feature is in testing with real businesses and lands soon. We label it instead of selling it as done. Live means working today.</p></details>
</div>
</div></div></section>

<div class="cta"><div class="wrap">
<p class="eyebrow" style="justify-content:center;color:rgba(23,23,20,.7)">Ready when you are</p>
<h2 style="margin-top:16px">Don&#39;t let the next<br>enquiry go <span style="color:#f6f0e7">cold.</span></h2>
<p class="lede">Give your customers a better first experience - and give your business a stronger way forward.</p>
<div style="display:flex;gap:18px;justify-content:center;align-items:center;flex-wrap:wrap">
<a class="btn btn-dark" href="/signup">Start today &#8599;</a>
<a class="btn-line" href="/login">Open the app &#8599;</a>
</div>
<p class="foot">REVUP BY NAHALABS &nbsp;&middot;&nbsp; BUILT FOR BUSINESS IN SOUTH AFRICA</p>
</div></div>

<footer><div class="wrap">
<div class="foot-grid">
<div><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp by NahaLabs" style="height:26px"></a>
<p class="tagline">Customer engagement.<br>Reputation growth.<br>Business momentum.</p></div>
<div><h4>PLATFORM</h4><ul><li><a href="#platform">Platform</a></li><li><a href="#leadfinder">Lead-Finder</a></li><li><a href="#faq">FAQ</a></li></ul></div>
<div><h4>INDUSTRIES</h4><ul><li><a href="#industries">Industries</a></li><li><a href="#pricing">Pricing</a></li></ul></div>
<div><h4>START</h4><ul><li><a href="/signup">Start today</a></li><li><a href="/login">Open the app</a></li></ul></div>
</div>
<div class="foot-base"><span>&copy; 2026 NAHALABS. ALL RIGHTS RESERVED.</span><span>REVUP / SOUTH AFRICA</span><span>INTELLIGENT CUSTOMER ENGAGEMENT</span></div>
</div></footer>

</body></html>`;
}

// src/index.ts
init_presets();
init_receptionist();
init_reviews();

// src/pages.ts
init_freeai();
init_presets();
var ensured = null;
function ensurePageTables(db) {
  if (!ensured) ensured = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS cf_page(
      id uuid PRIMARY KEY, workspace_id uuid NOT NULL,
      title text NOT NULL, slug text NOT NULL,
      angle text NOT NULL DEFAULT '', industry text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft',
      brand jsonb NOT NULL DEFAULT '{}'::jsonb,
      sections jsonb NOT NULL DEFAULT '[]'::jsonb,
      source_url text NOT NULL DEFAULT '',
      views integer NOT NULL DEFAULT 0, cta_clicks integer NOT NULL DEFAULT 0,
      last_viewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      UNIQUE(workspace_id, slug))`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS cf_page_slug ON cf_page(slug)`);
    await db.query(`CREATE TABLE IF NOT EXISTS cf_page_event(
      id bigserial PRIMARY KEY, page_id uuid NOT NULL,
      kind text NOT NULL, meta text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now())`);
    await db.query(`CREATE INDEX IF NOT EXISTS cf_page_event_page ON cf_page_event(page_id, kind)`);
  })().catch((e) => {
    ensured = null;
    throw e;
  });
  return ensured;
}
var SECTION_PATTERNS = [
  [/price|pricing|cost|plan|package/i, "offer"],
  [/faq|question|ask/i, "faq"],
  [/review|testimonial|customer|client|stories|proof|patient|guest|say|feedback/i, "proof"],
  [/how it works|how we|process|step/i, "how"],
  [/feature|benefit|why|what you get|service/i, "benefits"],
  [/contact|sign up|get started|start|book|buy|order|shop/i, "cta"],
  [/problem|pain|struggle|tired|stop/i, "pains"]
];
function mirrorStructure(src) {
  let h = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gis, " ");
  const out = [];
  const tagRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m, last = 0, first = true;
  const wordCount = (t) => t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  while (m = tagRe.exec(h)) {
    const chunk = h.slice(last, tagRe.lastIndex);
    const words = wordCount(chunk);
    const headingText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let type = "benefits";
    if (first && m[1] === "1") type = "hero";
    else {
      for (const [re, t] of SECTION_PATTERNS) if (re.test(headingText)) {
        type = t;
        break;
      }
    }
    out.push({ type, words: Math.min(words, 400) });
    first = false;
    last = tagRe.lastIndex;
    if (out.length >= 14) break;
  }
  if (!out.length || out[0].type !== "hero") out.unshift({ type: "hero", words: 80 });
  if (!out.some((s) => s.type === "cta")) out.push({ type: "cta", words: 60 });
  return out.slice(0, 14);
}
async function fetchForMirror(url) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) pages can be mirrored");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12e3);
  try {
    const resp = await fetch(u.toString(), {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; RevUpPages/1.0)", accept: "text/html" }
    });
    if (!resp.ok) throw new Error(`That page answered ${resp.status} - try another URL`);
    const text = await resp.text();
    return text.slice(0, 15e5);
  } finally {
    clearTimeout(t);
  }
}
var COPY_RULES = `You write landing page copy for South African small businesses.
Rules: plain warm SA English, short sentences, no hype words (no "revolutionary", "game-changing", "unlock"), prices in rand (R) if any, mobile-first so keep headings under 9 words, body text under 60 words per section, bullets under 12 words each.
The page speaks to ONE customer pain only - every section must tie back to that pain.
NEVER invent facts: no phone numbers, no prices, no opening hours, no services not in the brief, no guarantees, no qualifications, no names, no years of experience, no claims the business did not state. Only use details given in this brief. For contact, always point to the button (e.g. "tap the button below"), never write a phone number or email in the copy.
${FACT_RULES}
If the brief gives no testimonials, do NOT write fake quotes or claims about what customers say. In a proof section, state plainly how the product works and what the business itself commits to.`;
async function generateSections(env, brief, skeleton) {
  const preset = getPreset(brief.industry);
  const skel = skeleton.map((s, i) => `${i + 1}. ${s.type}`).join(", ");
  const prompt = `${COPY_RULES}
Business: ${brief.business} (${industryLabel(brief.industry)})${brief.area ? ` in ${brief.area}` : ""}.
Customer pain this page answers: ${brief.angle}.
What the business offers: ${brief.offer || "their services"}.
Tone: ${preset.responder_tone || "warm and professional"}.
Common customer questions to weave into a faq section if present: ${(preset.responder_faqs || []).join(" | ") || "n/a"}.
Write copy for a landing page with these sections in this order: ${skel}.
Reply with JSON only:
{"seo_title":"...","sections":[{"type":"hero","heading":"...","body":"...","items":["...","..."]},...]}
Every section in the list must appear, same order, same type. items may be [] for hero/cta.`;
  const r = await freeAiGenerate(env, prompt, { maxTokens: 3e3, temperature: 0.4 }, rejectInventedPrices(prompt, (text) => {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0]);
      const raw = Array.isArray(parsed.sections) ? parsed.sections : [];
      const sections = raw.slice(0, 14).map((sec) => ({
        type: String(sec.type || "benefits").slice(0, 20),
        heading: String(sec.heading || "").slice(0, 140),
        body: String(sec.body || "").slice(0, 800),
        items: Array.isArray(sec.items) ? sec.items.slice(0, 8).map((x) => String(x).slice(0, 140)) : []
      })).filter((sec) => sec.heading || sec.body);
      if (!sections.length) return null;
      if (!sections.some((sec) => sec.type === "cta")) sections.push({ type: "cta", heading: "Ready when you are", body: "Send a message now and get a straight answer.", items: [] });
      return { seo_title: String(parsed.seo_title || brief.business).slice(0, 120), sections };
    } catch {
      return null;
    }
  }));
  if (!r) throw new Error("the copywriter is busy right now");
  return r.value;
}
function pesc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function renderPublicPage(page, base) {
  const brand = page.brand || {};
  const color = /^#[0-9a-fA-F]{6}$/.test(brand.color || "") ? brand.color : "#F97316";
  const biz = pesc(brand.business || page.title);
  const ctaLabel = pesc(brand.cta_label || "WhatsApp us");
  const goUrl = `${base}/p/${pesc(page.slug)}/go`;
  const blocks = (page.sections || []).map((s) => {
    const items = (s.items || []).filter(Boolean);
    const list = items.length ? `<ul>${items.map((i) => `<li>${pesc(i)}</li>`).join("")}</ul>` : "";
    if (s.type === "hero") return `<section class="hero"><h1>${pesc(s.heading)}</h1><p class="lede">${pesc(s.body)}</p>${list}<p><a class="btn" href="${goUrl}">${ctaLabel}</a></p></section>`;
    if (s.type === "cta") return `<section class="cta"><h2>${pesc(s.heading)}</h2><p>${pesc(s.body)}</p><p><a class="btn" href="${goUrl}">${ctaLabel}</a></p></section>`;
    if (s.type === "faq") return `<section><h2>${pesc(s.heading)}</h2>${items.map((i) => `<details><summary>${pesc(i)}</summary></details>`).join("")}${s.body ? `<p>${pesc(s.body)}</p>` : ""}</section>`;
    if (s.type === "proof") return `<section class="proof"><h2>${pesc(s.heading)}</h2>${items.map((i) => `<blockquote>${pesc(i)}</blockquote>`).join("")}${s.body ? `<p>${pesc(s.body)}</p>` : ""}</section>`;
    return `<section><h2>${pesc(s.heading)}</h2>${s.body ? `<p>${pesc(s.body)}</p>` : ""}${list}</section>`;
  }).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pesc(page.title)}</title><meta name="description" content="${pesc((page.sections[0]?.body || page.title).slice(0, 155))}">
<style>
:root{--b:${color}}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1C1917;background:#FAFAF9;line-height:1.65}
.wrap{max-width:680px;margin:0 auto;padding:0 20px 96px}
header{padding:22px 20px;font-weight:700;font-size:1.05rem;max-width:680px;margin:0 auto}
.hero{padding:56px 0 32px}
.hero h1{font-size:2rem;line-height:1.2;letter-spacing:-0.02em;margin-bottom:14px}
.lede{font-size:1.1rem;color:#44403C;margin-bottom:22px}
/* CTA button adapted from Uiverse.io by Gautammsharma (https://uiverse.io/Gautammsharma/wicked-cobra-3) - MIT License, (c) 2023 Uiverse.io */
.btn{display:inline-block;background:var(--b);color:#fff;padding:14px 28px;border-radius:10px;font-weight:700;text-decoration:none;font-size:1.05rem;border:2px solid #1C1917;box-shadow:5px 5px 0 #1C1917;transition:all .2s ease}
.btn:hover{background:#fff;color:var(--b);border-color:var(--b);box-shadow:5px 5px 0 var(--b);text-decoration:none}
.btn:active{box-shadow:none;transform:translateY(4px)}
section{margin:34px 0}
h2{font-size:1.35rem;letter-spacing:-0.01em;margin-bottom:10px}
ul{margin:10px 0 0 0;list-style:none}
li{padding:7px 0 7px 26px;position:relative}
li:before{content:"\\2713";position:absolute;left:0;color:var(--b);font-weight:700}
blockquote{border-left:3px solid var(--b);padding:6px 14px;margin:10px 0;color:#44403C;font-style:italic}
details{border:1px solid #E7E5E4;border-radius:10px;padding:10px 14px;margin:8px 0}
summary{font-weight:600;cursor:pointer}
.cta{background:var(--b);color:#fff;border-radius:16px;padding:30px 22px;text-align:center}
.cta .btn{background:#fff;color:var(--b);border-color:#1C1917;box-shadow:5px 5px 0 #1C1917}
.cta .btn:hover{background:#1C1917;color:#fff;border-color:#1C1917;box-shadow:5px 5px 0 rgba(0,0,0,.35)}
footer{margin-top:44px;padding-top:18px;border-top:1px solid #E7E5E4;font-size:.82rem;color:#A8A29E}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #E7E5E4;padding:10px 20px;display:flex;justify-content:center}
.bar .btn{width:100%;max-width:640px;text-align:center;padding:13px}
@media(min-width:700px){.bar{display:none}}
</style></head><body>
<header>${biz}</header>
<div class="wrap">
${blocks}
<footer>${biz}${brand.area ? ` \xB7 ${pesc(brand.area)}` : ""}<br>Page by <a href="https://revup.nahalabs.co.za/signup" rel="noopener">RevUp</a> - one page per customer problem.</footer>
</div>
<div class="bar"><a class="btn" href="${goUrl}">${ctaLabel}</a></div>
</body></html>`;
}
function ctaTarget(page) {
  const b = page.brand || {};
  if (b.whatsapp && /^[+0-9][0-9 ]{7,18}$/.test(b.whatsapp)) {
    const num = b.whatsapp.replace(/[^0-9]/g, "").replace(/^0/, "27");
    const msg = encodeURIComponent(`Hi ${b.business || ""}, I saw your page about ${page.angle || "your services"}.`);
    return `https://wa.me/${num}?text=${msg}`;
  }
  if (b.link && /^https?:\/\//.test(b.link)) return b.link;
  return "https://revup.nahalabs.co.za/signup";
}
async function servePublic(db, slug, isGo, req) {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE slug=$1 AND status='published'`, [slug]);
  const page = r.rows[0];
  if (!page) return new Response(notFoundPage(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  const base = new URL(req.url).origin;
  if (isGo) {
    await db.query(`UPDATE cf_page SET cta_clicks=cta_clicks+1 WHERE id=$1`, [page.id]);
    await db.query(`INSERT INTO cf_page_event(page_id,kind,meta) VALUES($1,'cta','')`, [page.id]);
    return new Response(null, { status: 302, headers: { location: ctaTarget(page) } });
  }
  await db.query(`UPDATE cf_page SET views=views+1, last_viewed_at=now() WHERE id=$1`, [page.id]);
  await db.query(`INSERT INTO cf_page_event(page_id,kind,meta) VALUES($1,'view',$2)`, [page.id, (req.headers.get("user-agent") || "").slice(0, 120)]);
  return new Response(renderPublicPage(page, base), { headers: { "content-type": "text/html; charset=utf-8" } });
}
function notFoundPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px"><h1>This page isn't available</h1><p>The link may be old, or the page was unpublished.</p></body></html>`;
}
function makeSlug(title) {
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44) || "page";
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => b.toString(36).padStart(2, "0")).join("").replace(/[^a-z0-9]/g, "").slice(0, 4);
  return `${baseSlug}-${rand || "0000"}`;
}
function pagesAdminAssets() {
  return `<style>
/* Search input adapted from Uiverse.io by ErzenXz (https://uiverse.io/ErzenXz/horrible-rattlesnake-14) - MIT */
.uipill{width:100%;max-width:260px;height:45px;padding:12px;border-radius:12px;border:1.5px solid #D6D3D1;outline:none;transition:all .3s cubic-bezier(.19,1,.22,1);box-shadow:0 0 20px -18px;font-size:.95rem}
.uipill:hover{border:2px solid #D6D3D1}
.uipill:focus{border:2px solid #78716C}
/* Tooltip adapted from Uiverse.io by sahilxkhadka (https://uiverse.io/sahilxkhadka/modern-snail-66) - MIT */
.uitip{position:relative;display:inline-block;cursor:help;border-bottom:1px dotted #A8A29E}
.uitip .uitip-b{visibility:hidden;opacity:0;position:absolute;bottom:130%;left:50%;transform:translateX(-50%);background:#1C1917;color:#FAFAF9;font-size:.78rem;font-weight:400;padding:6px 10px;border-radius:6px;white-space:nowrap;transition:opacity .15s;z-index:50;pointer-events:none}
.uitip .uitip-b:after{content:"";position:absolute;top:100%;left:50%;margin-left:-6px;border:6px solid transparent;border-top-color:#1C1917}
.uitip:hover .uitip-b{visibility:visible;opacity:1}
/* Toggle switch adapted from Uiverse.io by gharsh11032000 (https://uiverse.io/gharsh11032000/brave-pug-20) - MIT */
.ruiswitch{font-size:15px;position:relative;display:inline-block;width:3.5em;height:2em;vertical-align:middle}
.ruiswitch input{opacity:0;width:0;height:0}
.ruiswitch .slider{position:absolute;cursor:pointer;inset:0;border:2px solid #414141;border-radius:50px;transition:all .4s cubic-bezier(.175,.885,.32,1.275)}
.ruiswitch .slider:before{position:absolute;content:"";height:1.4em;width:1.4em;left:.2em;bottom:.14em;background-color:#fff;border-radius:inherit;transition:all .4s cubic-bezier(.23,1,.320,1)}
.ruiswitch input:checked + .slider{box-shadow:0 0 20px rgba(249,115,22,.55);border:2px solid #F97316;background:#F97316}
.ruiswitch input:checked + .slider:before{transform:translateX(1.5em)}
.ruiswitch input:disabled + .slider{opacity:.5;cursor:wait}
/* Stat card adapted from Uiverse.io by jubayer-10 (https://uiverse.io/jubayer-10/white-catfish-8) - MIT */
.uicard{width:150px;background:#fff;box-shadow:0 0 15px rgba(0,0,0,.09);border-radius:12px;padding:22px 18px;position:relative;overflow:hidden;display:inline-block;margin:4px 12px 4px 0;vertical-align:top}
.uicard .n{position:absolute;right:-16px;top:-20px;width:64px;height:64px;background:#F97316;border-radius:50%}
.uicard .n span{position:absolute;bottom:16px;left:20px;color:#fff;font-size:1.05rem;font-weight:700}
.uicard h4{margin:0 0 4px;font-size:.85rem;color:#78716C;font-weight:600}
.uicard p{margin:0;font-size:1.35rem;font-weight:700}
/* Gauge loader adapted from Uiverse.io by Nawsome (https://uiverse.io/Nawsome/ancient-yak-42) - MIT */
.uiload-overlay{position:fixed;inset:0;background:rgba(250,250,249,.92);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:100;text-align:center}
.uiload-overlay.on{display:flex}
.uiload-overlay p{font-weight:600;color:#44403C;margin-top:14px}
.uigauge{display:block;width:9.375em;height:9.375em;font-size:14px}
.uigauge .ring-rotate{animation:uirr 2s linear infinite;transform-origin:80px 80px}
.uigauge .ring-stroke{animation:uirs 2s cubic-bezier(.65,0,.35,1) infinite;transform-origin:80px 80px}
.uigauge .tick{animation:uitk 2s cubic-bezier(.32,2,.5,1) infinite}
@keyframes uirr{to{transform:rotate(360deg)}}
@keyframes uirs{0%{stroke-dashoffset:452}50%{stroke-dashoffset:113}100%{stroke-dashoffset:452}}
@keyframes uitk{0%,10%{stroke-dashoffset:12}45%{stroke-dashoffset:0}60%,100%{stroke-dashoffset:-12}}
</style>
<div class="uiload-overlay" id="uiload">
<svg class="uigauge" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
<g class="ring-rotate"><circle class="ring-stroke" cx="80" cy="80" r="72" fill="none" stroke="#F97316" stroke-width="16" stroke-dasharray="452.39 452.39" stroke-dashoffset="452" stroke-linecap="round" transform="rotate(-45,80,80)"/></g>
<g stroke-width="4" stroke-dasharray="12 12" stroke-dashoffset="12" stroke-linecap="round" transform="translate(80,80)">
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)"/>
<polyline class="tick" stroke="#FDBA74" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)"/>
</g></svg>
<p id="uiload-msg">Working...</p></div>
<script>
function uiloadShow(msg){var o=document.getElementById('uiload');if(msg)document.getElementById('uiload-msg').textContent=msg;o.classList.add('on')}
</script>`;
}
async function pagesListBody(db, mem, base, msg = "") {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE workspace_id=$1 AND status!='archived' ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((p) => `<tr class="pg-row">
<td><b>${pesc(p.title)}</b><br><span class="mut">${pesc(p.angle || p.industry)}</span></td>
<td>${p.status === "published" ? `<span class="ok">Live</span> <a href="${base}/p/${pesc(p.slug)}" target="_blank" rel="noopener">/p/${pesc(p.slug)}</a>` : `<span class="mut">${pesc(p.status)}</span>`}</td>
<td>${p.views} view${p.views === 1 ? "" : "s"} \xB7 ${p.cta_clicks} tap${p.cta_clicks === 1 ? "" : "s"}</td>
<td><a href="/pages/${p.id}">Open</a></td></tr>`).join("");
  return `${pagesAdminAssets()}${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Landing pages <a class="btn btn-primary" style="float:right" href="/pages/new">New page</a></h2>
<p class="mut">One page per customer problem. Send each advert or campaign to the page that speaks to that exact problem - it converts far better than one general page.</p>
<p><input class="uipill" id="pageFilter" placeholder="Search pages..." oninput="(function(v){document.querySelectorAll('#pageTable tr.pg-row').forEach(function(tr){tr.style.display=tr.textContent.toLowerCase().indexOf(v.toLowerCase())===-1?'none':''})})(this.value)"></p>
<table id="pageTable"><tr><th>Page</th><th>Status &amp; link</th><th><span class="uitip">Results<span class="uitip-b">Views = page opens \xB7 Taps = button taps to your WhatsApp</span></span></th><th></th></tr>${rows || '<tr><td colspan="4" class="mut">No pages yet. Create your first one.</td></tr>'}</table></div>`;
}
function newPageBody(err = "") {
  return `${pagesAdminAssets()}<div class="card"><h2 style="margin-top:0">New landing page</h2>
${err ? `<p class="bad">${pesc(err)}</p>` : ""}
<form method="post" action="/pages/new" onsubmit="uiloadShow('Building your page - about 30 seconds...')">
<label>Page is for (business name)<input name="business" maxlength="200" placeholder="Your business name as customers know it"></label>
<label>Industry
<select name="industry">
<option value="general">General local service</option>
<option value="restaurant">Restaurant / cafe / takeaway</option>
<option value="dental">Dental practice</option>
<option value="funeral">Funeral services</option>
<option value="panel-beater">Panel beater / body shop</option>
<option value="auto-workshop">Auto workshop</option>
<option value="real-estate">Real estate</option>
<option value="plumber">Plumbing</option>
<option value="electrician">Electrical</option>
<option value="solar">Solar / inverters</option>
<option value="security">Security</option>
<option value="aesthetics">Aesthetics / cosmetic clinic</option>
<option value="legal">Law firm</option>
<option value="financial-broker">Financial / insurance broker</option>
<option value="towing">Towing / roadside</option>
<option value="hvac">Aircon / refrigeration</option>
<option value="roofing">Roofing / waterproofing</option>
<option value="pest-control">Pest control</option>
<option value="pool">Pool services</option>
<option value="catering">Catering / food truck</option>
<option value="trades">Trades (general)</option>
</select></label>
<label>The ONE customer pain this page answers<input name="angle" required maxlength="200" placeholder="e.g. Car dented and insurance is dragging their feet"></label>
<label>What you offer that fixes it<input name="offer" maxlength="300" placeholder="e.g. Fast approved repairs, we handle the claim, free courtesy car"></label>
<label>Area (optional)<input name="area" maxlength="120" placeholder="e.g. Sandton"></label>
<label>WhatsApp number for enquiries (optional)<input name="whatsapp" maxlength="20" placeholder="e.g. 082 555 1234"></label>
<label>Button text<input name="cta_label" maxlength="40" placeholder="WhatsApp us" value="WhatsApp us"></label>
<label>Brand colour<input name="color" type="color" value="#F97316" style="width:60px;height:34px;padding:2px"></label>
<label>Like a page's layout? Paste its URL - we copy the structure only, never its words or pictures<input name="mirror_url" maxlength="500" placeholder="https://..."></label>
<button>Build my page</button>
<p class="mut">Takes about 30 seconds. You review everything before it goes live.</p></form></div>`;
}
async function pageDetailBody(db, page, base, msg = "") {
  const brand = page.brand || {};
  const sectionForms = (page.sections || []).map((s, i) => `
<div class="card"><h3 style="margin-top:0">${pesc(s.type)}</h3>
<label>Heading<input name="h_${i}" value="${pesc(s.heading)}" maxlength="140"></label>
<label>Text<textarea name="b_${i}" rows="3" maxlength="800">${pesc(s.body)}</textarea></label>
<label>Bullets (one per line)<textarea name="i_${i}" rows="3">${pesc((s.items || []).join("\n"))}</textarea></label>
</div>`).join("");
  const published = page.status === "published";
  return `${pagesAdminAssets()}${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">${pesc(page.title)}</h2>
<p class="mut">Pain: ${pesc(page.angle)} \xB7 Status: ${pesc(page.status)}${published ? ` \xB7 Live at <a href="${base}/p/${pesc(page.slug)}" target="_blank" rel="noopener">${base}/p/${pesc(page.slug)}</a>` : ""}${page.source_url ? ` \xB7 Structure mirrored from ${pesc(page.source_url)}` : ""}</p>
<div>
<span class="uicard"><span class="n"><span>&#128065;</span></span><h4><span class="uitip">Views<span class="uitip-b">How many times the public page was opened</span></span></h4><p>${page.views}</p></span>
<span class="uicard"><span class="n"><span>&#10148;</span></span><h4><span class="uitip">Taps<span class="uitip-b">Button taps through to your WhatsApp</span></span></h4><p>${page.cta_clicks}</p></span>
</div>
<p><label class="ruiswitch"><input type="checkbox" id="pubToggle"${published ? " checked" : ""}><span class="slider"></span></label> <b id="pubLabel">${published ? "Live" : "Offline"}</b> <span class="mut">- flip to ${published ? "unpublish" : "publish"}</span></p>
<noscript><form method="post" action="/pages/${page.id}/${published ? "unpublish" : "publish"}" style="display:inline"><button>${published ? "Unpublish" : "Publish"}</button></form></noscript>
<form method="post" action="/pages/${page.id}/delete" style="display:inline" onsubmit="return confirm('Delete this page?')"><button class="link" style="color:#B91C1C">Delete</button></form>
</div>
<script>
(function(){var t=document.getElementById('pubToggle');if(!t)return;t.onchange=async function(){t.disabled=true;uiloadShow(t.checked?'Publishing...':'Unpublishing...');try{var r=await fetch('/pages/${page.id}/'+(t.checked?'publish':'unpublish'),{method:'POST'});if(!r.ok)throw 0;location.reload()}catch(e){document.getElementById('uiload').classList.remove('on');t.checked=!t.checked;t.disabled=false;alert('Could not change status - please try again.')}}})();
</script>
<form method="post" action="/pages/${page.id}" onsubmit="uiloadShow('Saving changes...')">
${sectionForms}
<div class="card"><h3 style="margin-top:0">Settings</h3>
<label>Button text<input name="cta_label" value="${pesc(brand.cta_label || "WhatsApp us")}" maxlength="40"></label>
<label>WhatsApp number<input name="whatsapp" value="${pesc(brand.whatsapp || "")}" maxlength="20"></label>
<label>Or link the button to a website instead<input name="link" value="${pesc(brand.link || "")}" maxlength="500" placeholder="https://..."></label>
<label>Brand colour<input name="color" type="color" value="${pesc(brand.color || "#F97316")}" style="width:60px;height:34px;padding:2px"></label>
</div>
<button>Save changes</button></form>
<p class="mut"><a href="/pages">&#8592; All pages</a></p>`;
}

// src/features.ts
init_reviews();
async function waitlistAdd(db, ws, waId, name, partySize, wantedTime) {
  const c = await db.query(
    `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
     VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())
     ON CONFLICT (workspace_id, wa_id) DO UPDATE SET name=COALESCE(NULLIF(EXCLUDED.name,''), receptionist_contact.name), updated_at=now()
     RETURNING id`,
    [crypto.randomUUID(), ws, waId, name]
  );
  await db.query(
    `INSERT INTO receptionist_waitlistentry(id,workspace_id,contact_id,party_size,wanted_time,status,offer_minutes,notes,created_at)
     VALUES($1,$2,$3,$4,$5,'waiting',15,'',now())`,
    [crypto.randomUUID(), ws, c.rows[0].id, partySize || 2, wantedTime.slice(0, 200)]
  );
}
async function waitlistExpire(db, ws) {
  await db.query(
    `UPDATE receptionist_waitlistentry SET status='expired'
     WHERE workspace_id=$1 AND status='offered' AND offered_at < now() - (offer_minutes || ' minutes')::interval`,
    [ws]
  );
}
async function waitlistAction(db, ws, id, action) {
  if (action === "offer")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='offered', offered_at=now() WHERE id=$1 AND workspace_id=$2 AND status='waiting'`, [id, ws])).rowCount;
  if (action === "accept")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='accepted' WHERE id=$1 AND workspace_id=$2 AND status='offered'`, [id, ws])).rowCount;
  if (action === "cancel")
    return !!(await db.query(`UPDATE receptionist_waitlistentry SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('waiting','offered')`, [id, ws])).rowCount;
  return false;
}
async function loyaltySettings(db, ws) {
  const ex = await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE workspace_id=$1`, [ws]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltysettings(id,workspace_id,enabled,points_per_visit,welcome_bonus,points_for_voucher,voucher_value_rand,voucher_valid_days)
     VALUES($1,$2,true,10,25,100,50,90)`,
    [id, ws]
  );
  return (await db.query(`SELECT * FROM receptionist_loyaltysettings WHERE id=$1`, [id])).rows[0];
}
async function loyaltyApply(db, accountId, kind, points, note, bookingId = null) {
  await db.query(
    `INSERT INTO receptionist_loyaltytransaction(id,account_id,kind,points,note,booking_id,created_at)
     VALUES($1,$2,$3,$4,$5,$6,now())`,
    [crypto.randomUUID(), accountId, kind, points, note.slice(0, 200), bookingId]
  );
  await db.query(
    `UPDATE receptionist_loyaltyaccount SET balance=GREATEST(0,balance+$2), lifetime_points=lifetime_points+GREATEST(0,$2),
       welcomed=welcomed OR $3='welcome', updated_at=now() WHERE id=$1`,
    [accountId, points, kind]
  );
}
async function loyaltyAccount(db, ws, contactId) {
  const s = await loyaltySettings(db, ws);
  const ex = await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE workspace_id=$1 AND contact_id=$2`, [ws, contactId]);
  if (ex.rows[0]) return ex.rows[0];
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_loyaltyaccount(id,workspace_id,contact_id,balance,lifetime_points,welcomed,created_at,updated_at)
     VALUES($1,$2,$3,0,0,false,now(),now())`,
    [id, ws, contactId]
  );
  if (s.welcome_bonus > 0) await loyaltyApply(db, id, "welcome", s.welcome_bonus, "Welcome bonus");
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [id])).rows[0];
}
async function awardForBooking(db, ws, bookingId, contactId) {
  const s = await loyaltySettings(db, ws);
  if (!s.enabled) return null;
  const account = await loyaltyAccount(db, ws, contactId);
  const already = await db.query(`SELECT 1 FROM receptionist_loyaltytransaction WHERE account_id=$1 AND kind='earn' AND booking_id=$2`, [account.id, bookingId]);
  if (already.rows[0]) return account;
  const vc = await db.query(`SELECT visit_count FROM receptionist_contact WHERE id=$1`, [contactId]);
  await loyaltyApply(db, account.id, "earn", s.points_per_visit, `Visit #${vc.rows[0]?.visit_count || 1}`, bookingId);
  return (await db.query(`SELECT * FROM receptionist_loyaltyaccount WHERE id=$1`, [account.id])).rows[0];
}
async function issueVoucher(db, ws, contactId, kind = "loyalty", note = "") {
  const s = await loyaltySettings(db, ws);
  if (kind === "loyalty") {
    const account = await loyaltyAccount(db, ws, contactId);
    if (account.balance < s.points_for_voucher) throw new Error(`${account.balance} points - ${s.points_for_voucher} needed for a voucher.`);
    await loyaltyApply(db, account.id, "redeem", -s.points_for_voucher, "Reward voucher issued");
  }
  let code = "";
  for (let i = 0; i < 8; i++) {
    code = [...crypto.getRandomValues(new Uint8Array(4))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const dup = await db.query(`SELECT 1 FROM receptionist_voucher WHERE code=$1`, [code]);
    if (!dup.rows[0]) break;
  }
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_voucher(id,workspace_id,contact_id,kind,code,amount_rand,status,note,expires_at,created_at)
     VALUES($1,$2,$3,$4,$5,$6,'active',$7,now() + ($8 || ' days')::interval,now())`,
    [id, ws, contactId, kind, code, s.voucher_value_rand, note.slice(0, 200), String(s.voucher_valid_days)]
  );
  return (await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1`, [id])).rows[0];
}
async function redeemVoucher(db, ws, id) {
  const v = await db.query(`SELECT * FROM receptionist_voucher WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  if (!v.rows[0]) return false;
  if (v.rows[0].status === "active" && new Date(v.rows[0].expires_at) < /* @__PURE__ */ new Date()) {
    await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE id=$1`, [id]);
    return false;
  }
  if (v.rows[0].status !== "active") return false;
  await db.query(`UPDATE receptionist_voucher SET status='redeemed', redeemed_at=now() WHERE id=$1`, [id]);
  return true;
}
async function expireVouchers(db) {
  const r = await db.query(`UPDATE receptionist_voucher SET status='expired' WHERE status='active' AND expires_at < now()`);
  return r.rowCount || 0;
}
async function quoteCreate(db, ws, customerName, contactId, title, amountRand, followUpOn) {
  await db.query(
    `INSERT INTO receptionist_quote(id,workspace_id,contact_id,customer_name,title,amount_cents,status,created_at,follow_up_on)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now(),$7)`,
    [crypto.randomUUID(), ws, contactId, customerName.slice(0, 200), title.slice(0, 200), Math.round(amountRand * 100), followUpOn || null]
  );
}
async function quoteAction(db, env, ws, id, action) {
  const q = await db.query(`SELECT * FROM receptionist_quote WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  if (!q.rows[0]) return "not found";
  const quote = q.rows[0];
  if (action === "sent" && quote.status === "draft") {
    await db.query(`UPDATE receptionist_quote SET status='sent', sent_on=(now() AT TIME ZONE 'Africa/Johannesburg')::date WHERE id=$1`, [id]);
    if (quote.contact_id) {
      const c = await db.query(`SELECT * FROM receptionist_contact WHERE id=$1`, [quote.contact_id]);
      if (c.rows[0] && !c.rows[0].opted_out && c.rows[0].zernio_conversation_id) {
        const wname = await db.query(`SELECT name FROM workspaces_workspace WHERE id=$1`, [ws]);
        try {
          await deliver(
            db,
            env,
            ws,
            c.rows[0],
            `Hi ${(c.rows[0].name || "").trim().split(" ")[0] || "there"}, ${wname.rows[0]?.name || "we"} here with your quote${quote.title ? ` for ${quote.title}` : ""}: R${(quote.amount_cents / 100).toFixed(2)}. Any questions, just reply here.`
          );
        } catch {
        }
      }
    }
    return "marked sent";
  }
  if (action === "won" && ["draft", "sent"].includes(quote.status)) {
    await db.query(`UPDATE receptionist_quote SET status='won' WHERE id=$1`, [id]);
    return "won";
  }
  if (action === "lost" && ["draft", "sent"].includes(quote.status)) {
    await db.query(`UPDATE receptionist_quote SET status='lost' WHERE id=$1`, [id]);
    return "lost";
  }
  return "no change";
}
async function segmentContacts(db, ws, segment) {
  let q = `SELECT * FROM receptionist_contact WHERE workspace_id=$1 AND opted_out=false`;
  if (segment === "dormant") q += ` AND (last_visit_at IS NULL OR last_visit_at < now() - interval '30 days')`;
  else if (segment === "vip") q += ` AND is_vip=true`;
  return (await db.query(q + ` ORDER BY created_at`, [ws])).rows;
}
async function campaignCreate(db, ws, name, segment, bodyA, bodyB) {
  if (!name.trim()) throw new Error("Give the campaign a name.");
  if (!["all", "dormant", "vip"].includes(segment)) throw new Error("Unknown segment.");
  if (!bodyA.trim()) throw new Error("Write the message first.");
  await db.query(
    `INSERT INTO receptionist_campaign(id,workspace_id,name,segment,body_a,body_b,status,created_at)
     VALUES($1,$2,$3,$4,$5,$6,'draft',now())`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), segment, bodyA.trim(), bodyB.trim()]
  );
}
async function campaignApprove(db, ws, id, when) {
  const c = await db.query(`SELECT * FROM receptionist_campaign WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  const camp = c.rows[0];
  if (!camp || camp.status !== "draft") throw new Error("Only a draft can be approved.");
  const contacts = await segmentContacts(db, ws, camp.segment);
  if (!contacts.length) throw new Error("No customers in this segment yet.");
  const useB = !!camp.body_b;
  for (let i = 0; i < contacts.length; i++) {
    await db.query(
      `INSERT INTO receptionist_campaignrecipient(id,campaign_id,contact_id,variant,status,error,attributed_amount)
       VALUES($1,$2,$3,$4,'pending','',0) ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [crypto.randomUUID(), id, contacts[i].id, useB && i % 2 ? "b" : "a"]
    );
  }
  const whenTs = when ? new Date(when) : /* @__PURE__ */ new Date();
  const sched = isNaN(whenTs.getTime()) ? /* @__PURE__ */ new Date() : whenTs;
  await db.query(
    `UPDATE receptionist_campaign SET approved_at=now(), scheduled_at=$1, status=$2 WHERE id=$3`,
    [sched, sched > /* @__PURE__ */ new Date() ? "scheduled" : "sending", id]
  );
}
async function campaignCancel(db, ws, id) {
  return !!(await db.query(
    `UPDATE receptionist_campaign SET status='cancelled' WHERE id=$1 AND workspace_id=$2 AND status IN ('draft','scheduled')`,
    [id, ws]
  )).rowCount;
}
async function runDueCampaigns(db, env) {
  const due = await db.query(
    `SELECT * FROM receptionist_campaign WHERE status IN ('scheduled','sending') AND (scheduled_at IS NULL OR scheduled_at <= now()) ORDER BY scheduled_at NULLS FIRST LIMIT 3`
  );
  for (const camp of due.rows) await sendCampaign(db, env, camp);
}
async function sendCampaign(db, env, camp) {
  const claim = await db.query(
    `UPDATE receptionist_campaign SET status='sending' WHERE id=$1 AND status IN ('scheduled','sending')`,
    [camp.id]
  );
  if (!claim.rowCount) return;
  const ch = await db.query(`SELECT 1 FROM receptionist_zerniochannel WHERE workspace_id=$1 LIMIT 1`, [camp.workspace_id]);
  const budget = await db.query(
    `SELECT count(*) FILTER (WHERE created_at >= now() - interval '1 hour') h,
            count(*) FILTER (WHERE created_at >= now() - interval '1 day') d
     FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound' AND is_draft=false`,
    [camp.workspace_id]
  );
  if (!ch.rows.length || Number(budget.rows[0].h) >= 20 || Number(budget.rows[0].d) >= 100) {
    await db.query(`UPDATE receptionist_campaign SET status='scheduled', scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
    return;
  }
  const pend = await db.query(
    `SELECT r.*, c.name, c.opted_out, c.zernio_conversation_id, c.wa_id
     FROM receptionist_campaignrecipient r JOIN receptionist_contact c ON c.id=r.contact_id
     WHERE r.campaign_id=$1 AND r.status='pending' ORDER BY c.created_at LIMIT 50`,
    [camp.id]
  );
  for (const r of pend.rows) {
    if (r.opted_out) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='opted out' WHERE id=$1`, [r.id]);
      continue;
    }
    if (!r.zernio_conversation_id) {
      await db.query(`UPDATE receptionist_campaignrecipient SET status='skipped', error='no active WhatsApp conversation' WHERE id=$1`, [r.id]);
      continue;
    }
    const first = (r.name || "").trim().split(" ")[0] || "there";
    const body = (r.variant === "b" ? camp.body_b : camp.body_a).replace("{first name}", first) + OPT_OUT_FOOTER;
    try {
      const contact = { id: r.contact_id, name: r.name, wa_id: r.wa_id, zernio_conversation_id: r.zernio_conversation_id };
      const msgId = await deliver(db, env, camp.workspace_id, contact, body);
      await db.query(`UPDATE receptionist_campaignrecipient SET status='sent', sent_at=now(), message_id=$1 WHERE id=$2`, [msgId, r.id]);
    } catch (e) {
      const msg = String(e?.message || e);
      const skip = msg.includes("no active WhatsApp conversation") || msg.includes("allowlisted");
      await db.query(
        `UPDATE receptionist_campaignrecipient SET status=$1, error=$2 WHERE id=$3`,
        [skip ? "skipped" : "failed", msg.slice(0, 300), r.id]
      );
    }
  }
  const left = await db.query(`SELECT 1 FROM receptionist_campaignrecipient WHERE campaign_id=$1 AND status='pending' LIMIT 1`, [camp.id]);
  await db.query(`UPDATE receptionist_campaign SET status=$1 WHERE id=$2`, [left.rows.length ? "scheduled" : "sent", camp.id]);
  if (left.rows.length) await db.query(`UPDATE receptionist_campaign SET scheduled_at=now() + interval '15 minutes' WHERE id=$1`, [camp.id]);
}
async function attributeBookingToCampaign(db, ws, booking) {
  const r = await db.query(
    `SELECT r.id FROM receptionist_campaignrecipient r JOIN receptionist_campaign c ON c.id=r.campaign_id
     WHERE c.workspace_id=$1 AND r.contact_id=$2 AND r.status='sent' AND r.sent_at >= now() - interval '30 days' AND r.attributed_booking_id IS NULL
     ORDER BY r.sent_at DESC LIMIT 1`,
    [ws, booking.contact_id]
  );
  if (!r.rows[0]) return;
  await db.query(
    `UPDATE receptionist_campaignrecipient SET attributed_booking_id=$1, attributed_amount=$2 WHERE id=$3`,
    [booking.id, Number(booking.value) || 0, r.rows[0].id]
  );
}
async function campaignStats(db, campaignId) {
  const r = await db.query(
    `SELECT variant,
            count(*) total,
            count(*) FILTER (WHERE status='sent') sent,
            count(*) FILTER (WHERE status='failed') failed,
            count(*) FILTER (WHERE status='skipped') skipped,
            count(*) FILTER (WHERE attributed_booking_id IS NOT NULL) bookings,
            COALESCE(sum(attributed_amount),0) revenue
     FROM receptionist_campaignrecipient WHERE campaign_id=$1 GROUP BY variant`,
    [campaignId]
  );
  const out = {};
  for (const row of r.rows) out[row.variant] = row;
  return out;
}
var PRICE_GAP_RAND = 10;
var DRAFT_BODIES = {
  price_gap: "Hi {first name}, this week only: come in for your favourite and mention this message - we will make it worth your while. Book on WhatsApp.",
  price_advantage: "Hi {first name}, did you know our best dish also beats the neighbours on price? Come taste it this week - book on WhatsApp.",
  rating_gap: "Hi {first name}, thank you for rating us the area's favourite! Bring a friend this week and show them why - book on WhatsApp.",
  promo: "Hi {first name}, we would rather spoil YOU than watch you try the neighbour's special. This week, your usual comes with something extra - book on WhatsApp.",
  demand: "Hi {first name}, weekends are filling up fast. Book a midweek table this week and skip the wait entirely - reply here and we will sort it."
};
async function competitorAdd(db, ws, name, area, website, rating, notes) {
  if (!name.trim()) throw new Error("Give the competitor a name.");
  const r = rating ? Number(rating) : null;
  if (r !== null && (isNaN(r) || r < 0 || r > 5)) throw new Error("Rating is 0 to 5.");
  await db.query(
    `INSERT INTO receptionist_competitor(id,workspace_id,name,area,website,rating,notes,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,now())
     ON CONFLICT (workspace_id, name) DO UPDATE SET area=$4, website=$5, rating=$6, notes=$7`,
    [crypto.randomUUID(), ws, name.trim().slice(0, 120), area.trim().slice(0, 120), website.trim().slice(0, 200), r, notes.trim()]
  );
}
async function dishAdd(db, ws, competitorId, name, price, ownItemId) {
  const own = await db.query(`SELECT 1 FROM receptionist_competitor WHERE id=$1 AND workspace_id=$2`, [competitorId, ws]);
  if (!own.rows.length) throw new Error("Competitor not found.");
  if (!name.trim() || !(price >= 0)) throw new Error("Dish needs a name and a price.");
  const ownId = /^[0-9a-f-]{36}$/.test(ownItemId) ? ownItemId : null;
  if (ownId) {
    const ok = await db.query(`SELECT 1 FROM menus_item WHERE id=$1 AND workspace_id=$2`, [ownId, ws]);
    if (!ok.rows.length) throw new Error("That menu item is not yours.");
  }
  await db.query(
    `INSERT INTO receptionist_competitordish(id,competitor_id,name,price,own_item_id,created_at) VALUES($1,$2,$3,$4,$5,now())`,
    [crypto.randomUUID(), competitorId, name.trim().slice(0, 120), price, ownId]
  );
}
async function promoAdd(db, ws, competitorId, text, validUntil) {
  const own = await db.query(`SELECT 1 FROM receptionist_competitor WHERE id=$1 AND workspace_id=$2`, [competitorId, ws]);
  if (!own.rows.length) throw new Error("Competitor not found.");
  if (!text.trim()) throw new Error("Say what the promotion is.");
  await db.query(
    `INSERT INTO receptionist_competitorpromo(id,competitor_id,text,valid_until,created_at) VALUES($1,$2,$3,$4,now())`,
    [crypto.randomUUID(), competitorId, text.trim().slice(0, 200), /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null]
  );
}
async function oppUpsert(db, ws, key, kind, title, detail, competitorId, confidence, impact, evidence) {
  await db.query(
    `INSERT INTO receptionist_marketopportunity(id,workspace_id,competitor_id,kind,title,detail,status,dedupe_key,confidence,impact_rand,evidence,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,'new',$7,$8,$9,$10::jsonb,now(),now())
     ON CONFLICT (workspace_id, dedupe_key) DO UPDATE SET kind=$4, title=$5, detail=$6, competitor_id=$3, confidence=$8, impact_rand=$9, evidence=$10::jsonb, updated_at=now()`,
    [crypto.randomUUID(), ws, competitorId, kind, title.slice(0, 160), detail, key.slice(0, 120), confidence, impact, JSON.stringify(evidence)]
  );
}
async function refreshOpportunities(db, ws) {
  const bp = await db.query(`SELECT google_rating FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [ws]);
  const ownRating = bp.rows[0]?.google_rating !== null && bp.rows[0]?.google_rating !== void 0 ? Number(bp.rows[0].google_rating) : null;
  const seen = [];
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [ws]);
  for (const comp of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`,
      [comp.id]
    );
    for (const dish of dishes.rows) {
      if (!dish.own_item_id || dish.own_price === null) continue;
      const gap = Number(dish.own_price) - Number(dish.price);
      const u = await db.query(
        `SELECT COALESCE(sum(quantity),0) q FROM menus_dishsale WHERE workspace_id=$1 AND item_id=$2 AND sold_on >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 30`,
        [ws, dish.own_item_id]
      );
      const units = Number(u.rows[0].q) || 0;
      const impact = units ? Math.abs(gap) * units : null;
      if (gap > PRICE_GAP_RAND) {
        const key = `price_gap:${dish.id}`;
        seen.push(key);
        await oppUpsert(
          db,
          ws,
          key,
          "price_gap",
          `${comp.name} undercuts your ${dish.own_name}`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${gap.toFixed(2)} more. Match it, beat it on portion or quality, or let the dish compete on something else.`,
          comp.id,
          90,
          impact,
          [
            `Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
            `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`,
            units ? `Your sales: ${units} sold in the last 30 days` : "No sales logged yet, so no rand impact estimate"
          ]
        );
      } else if (gap < -PRICE_GAP_RAND) {
        const key = `price_advantage:${dish.id}`;
        seen.push(key);
        await oppUpsert(
          db,
          ws,
          key,
          "price_advantage",
          `Your ${dish.own_name} beats ${comp.name} on price`,
          `Their ${dish.name} is R${Number(dish.price).toFixed(2)}; yours is R${Number(dish.own_price).toFixed(2)} - R${(-gap).toFixed(2)} less. Worth saying out loud: feature it on the public menu and in campaigns.`,
          comp.id,
          80,
          impact,
          [
            `Their menu: ${dish.name} R${Number(dish.price).toFixed(2)} (logged on the Competitors screen)`,
            `Your menu: ${dish.own_name} R${Number(dish.own_price).toFixed(2)}`
          ]
        );
      }
    }
    if (comp.rating !== null && ownRating !== null && ownRating > Number(comp.rating)) {
      const key = `rating:${comp.id}`;
      seen.push(key);
      await oppUpsert(
        db,
        ws,
        key,
        "rating_gap",
        `You outrate ${comp.name}`,
        `Google: you ${ownRating}, them ${comp.rating}. Ask happy customers for reviews while the gap is in your favour.`,
        comp.id,
        70,
        null,
        [`Your Google rating: ${ownRating} (Competitors screen)`, `Their Google rating: ${comp.rating} (Competitors screen)`]
      );
    }
    const promo = await db.query(
      `SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 AND created_at >= now() - interval '7 days' ORDER BY created_at DESC LIMIT 1`,
      [comp.id]
    );
    if (promo.rows[0]) {
      const p = promo.rows[0];
      const key = `promo:${p.id}`;
      seen.push(key);
      await oppUpsert(
        db,
        ws,
        key,
        "promo",
        `${comp.name} is running a promotion`,
        `Spotted: "${p.text}". Answer with your own campaign to regulars before they drift - the Campaigns screen drafts it in minutes.`,
        comp.id,
        60,
        null,
        [`Promotion logged: "${p.text}" (Competitors screen)`]
      );
    }
  }
  const wl = await db.query(
    `SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND created_at >= now() - interval '7 days'`,
    [ws]
  );
  const recent = Number(wl.rows[0].c);
  if (recent >= 5) {
    const key = "demand:waitlist";
    seen.push(key);
    const avg = await db.query(
      `SELECT avg(value) v FROM (SELECT value FROM receptionist_booking WHERE workspace_id=$1 AND status='done' AND value IS NOT NULL LIMIT 50) t`,
      [ws]
    );
    const avgValue = avg.rows[0].v !== null ? Number(avg.rows[0].v) : null;
    await oppUpsert(
      db,
      ws,
      key,
      "demand",
      "Demand is outgrowing your tables",
      `${recent} parties joined the waitlist in the last 7 days. Consider longer hours on the busy nights or an off-peak campaign to spread the load.`,
      null,
      65,
      avgValue ? avgValue * recent : null,
      [
        `${recent} waitlist entries in the last 7 days (Waitlist screen)`,
        avgValue ? `Average booking value: R${avgValue.toFixed(2)}` : "No booking values captured yet"
      ]
    );
  }
  if (seen.length) {
    await db.query(
      `DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND NOT (dedupe_key = ANY($2))`,
      [ws, seen]
    );
  } else {
    await db.query(`DELETE FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new'`, [ws]);
  }
}
async function opportunityAction(db, ws, id, action) {
  if (!["acted", "dismissed"].includes(action)) return false;
  return !!(await db.query(
    `UPDATE receptionist_marketopportunity SET status=$1, updated_at=now() WHERE id=$2 AND workspace_id=$3 AND status='new'`,
    [action, id, ws]
  )).rowCount;
}
async function opportunityDraftCampaign(db, ws, id) {
  const o = await db.query(`SELECT * FROM receptionist_marketopportunity WHERE id=$1 AND workspace_id=$2`, [id, ws]);
  const opp = o.rows[0];
  if (!opp) throw new Error("Opportunity not found.");
  if (opp.campaign_id) throw new Error("A draft already exists for this one.");
  const body = DRAFT_BODIES[opp.kind];
  if (!body) throw new Error("No draft available for this opportunity.");
  const segment = ["promo", "demand"].includes(opp.kind) ? "dormant" : "all";
  const campId = crypto.randomUUID();
  await db.query(
    `INSERT INTO receptionist_campaign(id,workspace_id,name,segment,body_a,body_b,status,created_at)
     VALUES($1,$2,$3,$4,$5,'','draft',now())`,
    [campId, ws, `Revenue: ${opp.title}`.slice(0, 120), segment, body]
  );
  await db.query(
    `UPDATE receptionist_marketopportunity SET campaign_id=$1, status='acted', updated_at=now() WHERE id=$2`,
    [campId, id]
  );
}
async function supportAnswer(db, ws, question) {
  const q = question.toLowerCase();
  if (["booking", "table", "reservation", "tonight", "today"].some((w) => q.includes(w))) {
    const today = await db.query(
      `SELECT status, count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date
       GROUP BY status`,
      [ws]
    );
    const week = await db.query(
      `SELECT count(*) c FROM receptionist_booking
       WHERE workspace_id=$1 AND status<>'cancelled'
         AND (COALESCE(scheduled_start, created_at) AT TIME ZONE 'Africa/Johannesburg')::date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 7`,
      [ws]
    );
    const confirmed = Number(today.rows.find((r) => r.status === "confirmed")?.c || 0);
    const done = Number(today.rows.find((r) => r.status === "done")?.c || 0);
    const wk = Number(week.rows[0].c);
    if (!today.rows.length && !wk)
      return { text: "You have no bookings logged yet. Once bookings come in I can answer questions about them.", confidence: 40, sources: ["0 bookings in the last 7 days"], escalate: false };
    return {
      text: `Today: ${confirmed} confirmed booking${confirmed === 1 ? "" : "s"}${done ? `, ${done} already done` : ""}. This week so far: ${wk} bookings. Open the Bookings screen for the full board.`,
      confidence: 95,
      sources: [`${confirmed} confirmed bookings today`, `${wk} bookings in the last 7 days`],
      escalate: false
    };
  }
  if (["waitlist", "waiting", "queue"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_waitlistentry WHERE workspace_id=$1 AND status='waiting'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: n ? `${n} partie${n === 1 ? " is" : "s are"} on the waitlist right now. Manage them on the Waitlist screen.` : "The waitlist is empty right now.",
      confidence: 95,
      sources: [`${n} waiting on the waitlist`],
      escalate: false
    };
  }
  if (["complaint", "unhappy", "angry", "review", "reputation"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(*) c FROM receptionist_complaint WHERE workspace_id=$1 AND status='open'`, [ws]);
    const n = Number(r.rows[0].c);
    return {
      text: `You have ${n} open complaint${n === 1 ? "" : "s"}.` + (n ? " Answer them from the Inbox - quick replies protect your rating." : " Nothing needs attention."),
      confidence: 95,
      sources: [`${n} open complaints`],
      escalate: false
    };
  }
  if (["campaign", "revenue", "sales", "money", "attribut", "marketing"].some((w) => q.includes(w))) {
    const running = await db.query(`SELECT count(*) c FROM receptionist_campaign WHERE workspace_id=$1 AND status IN ('scheduled','sending')`, [ws]);
    const attr = await db.query(
      `SELECT count(*) c, COALESCE(sum(r.attributed_amount),0) t
       FROM receptionist_campaignrecipient r
       JOIN receptionist_campaign c ON c.id=r.campaign_id
       JOIN receptionist_booking b ON b.id=r.attributed_booking_id
       WHERE c.workspace_id=$1 AND b.created_at >= date_trunc('month', now())`,
      [ws]
    );
    const total = Number(attr.rows[0].t), n = Number(attr.rows[0].c), run = Number(running.rows[0].c);
    return {
      text: `This month your campaigns are linked to R${total.toLocaleString("en-ZA")} across ${n} attributed booking${n === 1 ? "" : "s"}. ${run} campaign${run === 1 ? " is" : "s are"} running. The Campaigns screen has the full picture.`,
      confidence: 90,
      sources: [`R${total} attributed this month`, `${n} attributed bookings`],
      escalate: false
    };
  }
  if (["competitor", "rival", "opportunit", "market"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT title FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' ORDER BY confidence DESC`, [ws]);
    if (r.rows.length)
      return {
        text: `${r.rows.length} open opportunit${r.rows.length === 1 ? "y" : "ies"}. Top one: ${r.rows[0].title}. See them all on the Competitors screen.`,
        confidence: 90,
        sources: [`${r.rows.length} open opportunities`],
        escalate: false
      };
    return { text: "No open opportunities right now - the Competitors screen is where new ones appear.", confidence: 85, sources: ["0 open opportunities"], escalate: false };
  }
  if (["menu", "dish", "food", "sell", "popular", "star"].some((w) => q.includes(w))) {
    const r = await db.query(`SELECT count(DISTINCT item_id) c FROM menus_dishsale WHERE workspace_id=$1 AND sold_on >= (now() AT TIME ZONE 'Africa/Johannesburg')::date - 30`, [ws]);
    const n = Number(r.rows[0].c);
    if (n)
      return { text: `${n} dishes have sales logged in the last 30 days. Those sales feed the rand-impact estimates on the Competitors screen.`, confidence: 70, sources: [`${n} dishes with sales logged in 30 days`], escalate: false };
    return { text: "No dish sales logged yet. Once sales are logged I can talk about what is working.", confidence: 50, sources: ["0 dishes with sales logged in 30 days"], escalate: false };
  }
  if (["human", "person", "help me", "someone", "call me", "escalat"].some((w) => q.includes(w)))
    return { text: "Understood - I have flagged this for a human to follow up. Anything else I can answer from your numbers in the meantime?", confidence: 100, sources: ["Owner asked for a human"], escalate: true };
  return {
    text: "I do not have enough in your data to answer that confidently. I can answer about bookings, the waitlist, complaints, campaigns and attributed revenue, competitors and your menu. Want me to flag this for a human?",
    confidence: 20,
    sources: [],
    escalate: true
  };
}
async function supportHandle(db, ws, question) {
  await db.query(
    `INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,sources,escalated,created_at) VALUES($1,$2,'owner',$3,'[]'::jsonb,false,now())`,
    [crypto.randomUUID(), ws, question]
  );
  const a = await supportAnswer(db, ws, question);
  await db.query(
    `INSERT INTO receptionist_supportmessage(id,workspace_id,role,text,confidence,sources,escalated,created_at) VALUES($1,$2,'assistant',$3,$4,$5::jsonb,$6,now())`,
    [crypto.randomUUID(), ws, a.text, a.confidence, JSON.stringify(a.sources), a.escalate]
  );
}
async function autoDraftOpportunities(db) {
  const wss = await db.query(`SELECT workspace_id FROM receptionist_businessprofile WHERE revenue_mode='draft' AND is_active`);
  let made = 0;
  for (const w of wss.rows) {
    const opps = await db.query(
      `SELECT id FROM receptionist_marketopportunity WHERE workspace_id=$1 AND status='new' AND campaign_id IS NULL AND confidence >= 75`,
      [w.workspace_id]
    );
    for (const o of opps.rows) {
      try {
        await opportunityDraftCampaign(db, w.workspace_id, o.id);
        made++;
      } catch {
      }
    }
  }
  return made;
}

// src/index.ts
var import_spark_md5 = __toESM(require_spark_md5(), 1);

// src/wificard.ts
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function wifiCardPage(opts) {
  const biz = esc(opts.businessName || "Your business");
  const enquiryUrl = esc(opts.enquiryUrl);
  const preSsid = esc(opts.prefill?.ssid || "");
  const prePass = esc(opts.prefill?.pass || "");
  const sampleBanner = opts.sample ? `<div class="card" style="border:2px dashed #F97316;background:#FFF7ED"><h2 style="margin-top:0">Sample preview</h2>
<p>This is the exact card your customers would see in your waiting room. Guests scan one code to join your guest WiFi and the other to send you an enquiry - it lands straight in your RevUp inbox. The sample below is filled in with demo details; your own card uses your business name and your real enquiry form.</p>
<p style="margin-bottom:0"><a class="btn btn-primary" href="/signup">Get your own card - start free</a></p></div>` : "";
  return `<style>
.wc-grid{display:grid;grid-template-columns:minmax(280px,380px) 1fr;gap:22px;align-items:start}
@media(max-width:860px){.wc-grid{grid-template-columns:1fr}}
.wc-preview-wrap{position:sticky;top:16px}
.wifi-card{width:148mm;max-width:100%;aspect-ratio:148/105;background:#fff;border:1px solid #E7E5E4;border-radius:10px;box-shadow:0 1px 2px rgba(28,25,23,.05),0 8px 24px rgba(249,115,22,.10);display:flex;flex-direction:column;overflow:hidden}
.wc-head{background:#FAFAF9;border-bottom:1px solid #E7E5E4;padding:10px 16px;display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.wc-biz{font-size:17px;font-weight:700;letter-spacing:-0.2px;color:#1C1917;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wc-tag{font-size:11px;font-weight:600;color:#EA580C;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.wc-body{flex:1;display:flex;align-items:center;justify-content:space-evenly;gap:10px;padding:10px 12px}
.wc-qr{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.wc-qr .qrbox{background:#fff;border:1px solid #E7E5E4;border-radius:6px;padding:6px;line-height:0}
.wc-qr .qrbox svg{width:26mm;height:26mm;max-width:104px;max-height:104px}
.wc-lab{font-size:12px;font-weight:600;color:#1C1917;line-height:1.35}
.wc-sub{font-size:10.5px;color:#57534E;line-height:1.35;max-width:34mm}
.wc-net{font-size:11px;color:#57534E;margin-top:2px;line-height:1.4}
.wc-net b{color:#1C1917;font-weight:600}
.wc-foot{border-top:1px solid #E7E5E4;padding:6px 16px;display:flex;justify-content:space-between;align-items:center}
.wc-foot span{font-size:9.5px;color:#A8A29E}
#wifi-card-print{display:none}
@media print{
  body.printing > *:not(#wifi-card-print){display:none!important}
  #wifi-card-print{display:flex;width:148mm;height:105mm;aspect-ratio:auto;box-shadow:none;border:1px solid #E7E5E4;margin:0}
  @page{size:148mm 105mm;margin:0}
}
</style>
${sampleBanner}
<div class="card"><h2 style="margin-top:0">Waiting-room WiFi card</h2>
<p>One printable card for your waiting room, with two separate codes: guests scan one to join your WiFi, and scan the other to ask for a quote or book - that lands straight in your RevUp inbox. Fill in your WiFi details below; the card is made right here in your browser and your WiFi password never leaves this page.</p></div>
<div class="wc-grid">
<div class="card"><h2 style="margin-top:0">Your details</h2>
<form id="wc-form" onsubmit="return false">
<label for="wc-biz">Business name on the card</label>
<input id="wc-biz" maxlength="48" value="${biz}">
<label for="wc-ssid">WiFi network name (SSID)</label>
<input id="wc-ssid" maxlength="32" value="${preSsid}" placeholder="e.g. DemoDental-Guest" autocomplete="off">
<label for="wc-pass">WiFi password</label>
<input id="wc-pass" maxlength="63" value="${prePass}" placeholder="Your guest WiFi password" autocomplete="off">
<label for="wc-sec">Security</label>
<select id="wc-sec"><option value="WPA" selected>WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Open (no password)</option></select>
<label style="display:flex;align-items:center;gap:8px;font-weight:500"><input type="checkbox" id="wc-showpass" checked style="width:auto;margin:0"> Print the password as text on the card</label>
<p class="mut" style="margin:6px 0 0">Use a separate guest network, never your office or till network. A photo of the card shows the WiFi details, so keep it to guest WiFi only.</p>
<button type="button" class="btn btn-primary" style="width:100%;margin-top:14px" onclick="window.print()">Print / save as PDF</button>
</form></div>
<div class="wc-preview-wrap">
<div class="print-root">
<div class="wifi-card" id="wifi-card">
<div class="wc-head"><span class="wc-biz" id="wc-biz-out">${biz}</span><span class="wc-tag">Free guest WiFi</span></div>
<div class="wc-body">
<div class="wc-qr"><div class="qrbox" id="qr-wifi"></div><div><div class="wc-lab">Scan to join our WiFi</div><div class="wc-net" id="wc-net-out">Network: <b>-</b><br>Password: <b>-</b></div></div></div>
<div class="wc-qr"><div class="qrbox" id="qr-enquiry"></div><div><div class="wc-lab">Need a quote or want to book?</div><div class="wc-sub">Scan to message us - we reply fast.</div></div></div>
</div>
<div class="wc-foot"><span>Powered by RevUp</span><span id="wc-foot-note">Free for our guests</span></div>
</div>
</div>
</div>
</div>
<script src="/static/qrcode.js"></script>
<script>
(function(){
  var ENQ = ${JSON.stringify(opts.enquiryUrl)};
  function escWifi(s){ return String(s||"").replace(/([\\\\;,:"'])/g, "\\\\$1"); }
  function makeQr(el, text){
    el.innerHTML = "";
    var q = window.qrcode(0, "M");
    q.addData(text); q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    var svg = el.querySelector("svg");
    if (svg){ svg.setAttribute("width","100%"); svg.setAttribute("height","100%"); }
  }
  function wifiPayload(){
    var sec = document.getElementById("wc-sec").value;
    var ssid = document.getElementById("wc-ssid").value.trim();
    var pass = document.getElementById("wc-pass").value;
    if (!ssid) return "";
    if (sec === "nopass") return "WIFI:T:nopass;S:" + escWifi(ssid) + ";;";
    return "WIFI:T:" + sec + ";S:" + escWifi(ssid) + ";P:" + escWifi(pass) + ";;";
  }
  function render(){
    var biz = document.getElementById("wc-biz").value.trim() || "Your business";
    var ssid = document.getElementById("wc-ssid").value.trim();
    var pass = document.getElementById("wc-pass").value;
    var sec = document.getElementById("wc-sec").value;
    var showPass = document.getElementById("wc-showpass").checked;
    document.getElementById("wc-biz-out").textContent = biz;
    var net = "Network: <b>" + (ssid ? ssid.replace(/</g,"&lt;") : "-") + "</b>";
    if (sec !== "nopass") net += "<br>Password: <b>" + (showPass && pass ? pass.replace(/</g,"&lt;") : (pass ? "ask at the counter" : "-")) + "</b>";
    document.getElementById("wc-net-out").innerHTML = net;
    var wp = wifiPayload();
    makeQr(document.getElementById("qr-wifi"), wp || "WIFI:T:nopass;S:guest;;");
    makeQr(document.getElementById("qr-enquiry"), ENQ);
  }
  window.addEventListener("beforeprint", function(){
    var old = document.getElementById("wifi-card-print"); if (old) old.remove();
    var c = document.getElementById("wifi-card").cloneNode(true);
    c.id = "wifi-card-print";
    document.body.appendChild(c);
    document.body.classList.add("printing");
  });
  window.addEventListener("afterprint", function(){
    var c = document.getElementById("wifi-card-print"); if (c) c.remove();
    document.body.classList.remove("printing");
  });
  ["wc-biz","wc-ssid","wc-pass","wc-sec","wc-showpass"].forEach(function(id){
    document.getElementById(id).addEventListener("input", render);
    document.getElementById(id).addEventListener("change", render);
  });
  render();
})();
</script>`;
}

// src/chatapp.ts
var CHATAPP_SCOPE = "revup:read";
var CODE_TTL_MIN = 10;
var ACCESS_TTL_DAYS = 30;
async function ensureChatAppTables(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_client(
    client_id text PRIMARY KEY,
    client_name text NOT NULL DEFAULT '',
    redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_code(
    code_hash text PRIMARY KEY,
    client_id text NOT NULL,
    redirect_uri text NOT NULL,
    code_challenge text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS cf_oauth_token(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    access_hash text UNIQUE NOT NULL,
    refresh_hash text UNIQUE NOT NULL,
    client_id text NOT NULL,
    workspace_id uuid NOT NULL,
    scope text NOT NULL DEFAULT 'revup:read',
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked boolean NOT NULL DEFAULT false)`);
}
function base64url(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function pkceS256(verifier) {
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}
function validRedirectUri(uri, registered) {
  return registered.includes(uri);
}
function popiaSnippet(s, max = 140) {
  return String(s || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function firstName2(s) {
  return String(s || "").trim().split(/\s+/)[0] || "";
}
function authMetadata(base) {
  return {
    issuer: base,
    authorization_response_iss_parameter_supported: true,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    token_endpoint_auth_methods_supported: ["none"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    response_types_supported: ["code"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [CHATAPP_SCOPE]
  };
}
function protectedResourceMetadata(base) {
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    scopes_supported: [CHATAPP_SCOPE],
    resource_name: "RevUp",
    resource_documentation: `${base}/privacy`
  };
}
function consentPage(qs, mem, clientName, err = "") {
  return layout("Connect RevUp to ChatGPT", `
${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><h2>Connect ${esc2(mem.org_name)} to ChatGPT</h2>
<p><b>${esc2(clientName || "ChatGPT")}</b> is asking for <b>read-only</b> access to this workspace:</p>
<ul>
<li>Today's enquiry summary (counts and message snippets)</li>
<li>Review stats (counts only)</li>
<li>Your demand radar feed</li>
<li>Upcoming bookings (service, time, status, first name)</li>
</ul>
<p class="mut">No write actions. No customer phone numbers, emails or addresses are shared. You can disconnect any time from ChatGPT's app settings.</p>
<form method="post" action="/oauth/authorize?${qs}">
<button name="action" value="approve">Allow read-only access</button>
<button class="link" name="action" value="deny" formnovalidate>Cancel</button>
</form></div>`);
}
function connectLoginPage(qs, err = "") {
  return layout("Log in to connect ChatGPT", `
${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><h2>Log in to RevUp to connect ChatGPT</h2>
<form method="post" action="/oauth/authorize?${qs}">
<label>Email<input type="email" name="email" required autocomplete="email"></label>
<label>Password<input type="password" name="password" required autocomplete="current-password"></label>
<button>Log in and continue</button>
</form></div>`);
}
function oauthErr(redirectUri, state, error, desc, iss) {
  if (redirectUri) {
    const u = new URL(redirectUri);
    u.searchParams.set("error", error);
    u.searchParams.set("error_description", desc);
    if (state) u.searchParams.set("state", state);
    u.searchParams.set("iss", iss);
    return new Response(null, { status: 302, headers: { location: u.toString() } });
  }
  return json({ error, error_description: desc }, 400);
}
async function handleAuthorize(req, env, url, poolFn) {
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    const p = url.searchParams;
    const base = url.origin;
    const clientId = p.get("client_id") || "";
    const redirectUri = p.get("redirect_uri") || "";
    const state = p.get("state") || "";
    const challenge = p.get("code_challenge") || "";
    const method = p.get("code_challenge_method") || "";
    if ((p.get("response_type") || "") !== "code") return oauthErr(null, state, "unsupported_response_type", "response_type must be code", base);
    const cr = await db.query(`SELECT client_id, client_name, redirect_uris FROM cf_oauth_client WHERE client_id=$1`, [clientId]);
    const client = cr.rows[0];
    if (!client) return json({ error: "invalid_client", error_description: "unknown client_id" }, 400);
    if (!validRedirectUri(redirectUri, client.redirect_uris || [])) return json({ error: "invalid_request", error_description: "redirect_uri not registered" }, 400);
    if (!challenge || method !== "S256") return oauthErr(redirectUri, state, "invalid_request", "PKCE S256 required", base);
    const qs = url.search.replace(/^\?/, "");
    if (req.method === "POST") {
      const f = await formData(req);
      if (f.email !== void 0) {
        if (await rateLimitExceeded(db, "login", req, 20)) return html(connectLoginPage(qs, "Too many failed attempts from this network today - please try again tomorrow."), 429);
        const r = await db.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
        const row = r.rows[0];
        let ok = false;
        if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
          const v = await db.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
          ok = v.rows[0]?.ok === true;
        }
        if (!ok) {
          await rateLimited(db, "login", req, 20);
          return html(connectLoginPage(qs, "Wrong email or password."), 401);
        }
        const token = await newSession(db, row.id, req);
        return new Response(null, { status: 303, headers: { location: `/oauth/authorize?${qs}`, "set-cookie": sessionCookie(token) } });
      }
      if (f.action === "deny") return oauthErr(redirectUri, state, "access_denied", "The owner declined the connection.", base);
      if (f.action !== "approve") return json({ error: "invalid_request" }, 400);
    }
    const user = await getUser(req, db);
    if (!user) return html(connectLoginPage(qs));
    const mem = await membership(db, user.id, req);
    if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet.</p>`, user), 403);
    if (mem.workspace_role && !["owner", "admin"].includes(mem.workspace_role) && req.method === "POST")
      return html(consentPage(qs, mem, client.client_name, "Only a workspace owner or admin can connect apps."), 403);
    if (req.method === "POST") {
      const code = base64url(crypto.getRandomValues(new Uint8Array(32)));
      await db.query(
        `INSERT INTO cf_oauth_code(code_hash,client_id,redirect_uri,code_challenge,workspace_id,scope,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,now()+interval '${CODE_TTL_MIN} minutes')`,
        [await sha256hex(code), clientId, redirectUri, challenge, mem.workspace_id, CHATAPP_SCOPE]
      );
      const u = new URL(redirectUri);
      u.searchParams.set("code", code);
      if (state) u.searchParams.set("state", state);
      u.searchParams.set("iss", base);
      return new Response(null, { status: 302, headers: { location: u.toString() } });
    }
    return html(consentPage(qs, mem, client.client_name));
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function handleRegisterReal(req, env, poolFn) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_client_metadata", error_description: "JSON body required" }, 400);
  }
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === "string" && u.startsWith("https://")) : [];
  if (!uris.length) return json({ error: "invalid_redirect_uri", error_description: "at least one https redirect_uri required" }, 400);
  const clientId = crypto.randomUUID();
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    await db.query(
      `INSERT INTO cf_oauth_client(client_id,client_name,redirect_uris) VALUES($1,$2,$3)`,
      [clientId, String(body.client_name || "").slice(0, 120), JSON.stringify(uris)]
    );
    return json({
      client_id: clientId,
      client_name: String(body.client_name || "").slice(0, 120),
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: CHATAPP_SCOPE,
      client_id_issued_at: Math.floor(Date.now() / 1e3)
    }, 201);
  } finally {
    await db.end().catch(() => {
    });
  }
}
function tokenJson(access, refresh) {
  return json({ access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_DAYS * 86400, refresh_token: refresh, scope: CHATAPP_SCOPE });
}
async function issueTokens(db, clientId, workspaceId) {
  const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.query(
    `INSERT INTO cf_oauth_token(access_hash,refresh_hash,client_id,workspace_id,scope,expires_at)
     VALUES($1,$2,$3,$4,$5,now()+interval '${ACCESS_TTL_DAYS} days')`,
    [await sha256hex(access), await sha256hex(refresh), clientId, workspaceId, CHATAPP_SCOPE]
  );
  return { access, refresh };
}
async function handleToken(req, env, poolFn) {
  const f = await formData(req);
  const db = poolFn(env);
  try {
    await ensureChatAppTables(db);
    if (f.grant_type === "authorization_code") {
      const ch = await sha256hex(f.code || "");
      const r = await db.query(
        `DELETE FROM cf_oauth_code WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND expires_at>now()
         RETURNING code_challenge, workspace_id`,
        [ch, f.client_id || "", f.redirect_uri || ""]
      );
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant", error_description: "code unknown, expired or already used" }, 400);
      if (await pkceS256(f.code_verifier || "") !== row.code_challenge)
        return json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
      const t = await issueTokens(db, f.client_id || "", row.workspace_id);
      return tokenJson(t.access, t.refresh);
    }
    if (f.grant_type === "refresh_token") {
      const rh = await sha256hex(f.refresh_token || "");
      const r = await db.query(`SELECT id, client_id, workspace_id FROM cf_oauth_token WHERE refresh_hash=$1 AND NOT revoked`, [rh]);
      const row = r.rows[0];
      if (!row) return json({ error: "invalid_grant" }, 400);
      const access = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const refresh = base64url(crypto.getRandomValues(new Uint8Array(32)));
      await db.query(
        `UPDATE cf_oauth_token SET access_hash=$1, refresh_hash=$2, expires_at=now()+interval '${ACCESS_TTL_DAYS} days', created_at=now() WHERE id=$3`,
        [await sha256hex(access), await sha256hex(refresh), row.id]
      );
      return tokenJson(access, refresh);
    }
    return json({ error: "unsupported_grant_type" }, 400);
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function workspaceForToken(req, env, poolFn) {
  const auth = req.headers.get("authorization") || "";
  const tok = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!tok) return null;
  const db = poolFn(env);
  try {
    const r = await db.query(
      `SELECT t.workspace_id, o.name AS org_name, w.name AS workspace_name FROM cf_oauth_token t
       JOIN workspaces_workspace w ON w.id=t.workspace_id
       JOIN organizations_organization o ON o.id=w.organization_id
       WHERE t.access_hash=$1 AND NOT t.revoked AND t.expires_at>now()`,
      [await sha256hex(tok)]
    );
    return r.rows[0] || null;
  } finally {
    await db.end().catch(() => {
    });
  }
}
async function toolTodayEnquiries(db, ws) {
  const [today, stages, latest] = await Promise.all([
    db.query(`SELECT count(*) c FROM frontdesk_lead WHERE workspace_id=$1 AND (created_at AT TIME ZONE 'Africa/Johannesburg')::date = (now() AT TIME ZONE 'Africa/Johannesburg')::date`, [ws]),
    db.query(`SELECT stage, count(*) c FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [ws]),
    db.query(`SELECT message, stage, created_at FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 3`, [ws])
  ]);
  const data = {
    day: (/* @__PURE__ */ new Date()).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" }),
    enquiries_today: Number(today.rows[0].c),
    all_time_by_stage: Object.fromEntries(stages.rows.map((r) => [r.stage, Number(r.c)])),
    latest: latest.rows.map((r) => ({
      at: new Date(r.created_at).toLocaleTimeString("en-ZA", { hour12: false, timeZone: "Africa/Johannesburg" }),
      stage: r.stage,
      snippet: popiaSnippet(r.message)
    }))
  };
  const lines = [`${data.enquiries_today} new enquir${data.enquiries_today === 1 ? "y" : "ies"} today (${data.day}).`];
  const stageStr = Object.entries(data.all_time_by_stage).map(([k, v]) => `${k}: ${v}`).join(", ");
  if (stageStr) lines.push(`Pipeline (all time): ${stageStr}.`);
  for (const l of data.latest) lines.push(`- ${l.at} [${l.stage}] ${l.snippet}`);
  return { data, text: lines.join("\n") };
}
async function toolReviewStats(db, ws) {
  const [links, clicked, contacts, events] = await Promise.all([
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [ws]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [ws]),
    db.query(`SELECT step, status, count(*) c FROM receptionist_reviewevent WHERE workspace_id=$1 GROUP BY step, status`, [ws])
  ]);
  const data = {
    review_links_sent: Number(links.rows[0].c),
    links_clicked: Number(clicked.rows[0].c),
    contacts_in_inbox: Number(contacts.rows[0].c),
    events: events.rows.map((r) => ({ step: r.step, status: r.status, count: Number(r.c) }))
  };
  const ev = data.events.map((e) => `${e.step}/${e.status}: ${e.count}`).join(", ");
  return {
    data,
    text: `Review links sent: ${data.review_links_sent} (${data.links_clicked} clicked). Contacts in inbox: ${data.contacts_in_inbox}.${ev ? ` Events - ${ev}.` : ""}`
  };
}
async function toolRadarFeed(db, ws) {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [ws]);
  const feed = await db.query(
    `SELECT title, source, summary, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 10`,
    [ws]
  );
  const data = {
    industry: w.rows[0]?.industry || "general",
    items: feed.rows.map((r) => ({
      title: popiaSnippet(r.title, 200),
      source: popiaSnippet(r.source, 80),
      published_at: r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : null,
      snippet: popiaSnippet(r.summary)
    }))
  };
  const lines = [`Demand radar (${data.industry}): ${data.items.length} recent signal${data.items.length === 1 ? "" : "s"}.`];
  for (const i of data.items) lines.push(`- ${i.published_at || "undated"} \xB7 ${i.title}${i.source ? ` (${i.source})` : ""}`);
  return { data, text: lines.join("\n") };
}
async function toolUpcomingBookings(db, ws) {
  const r = await db.query(
    `SELECT b.service, b.scheduled_start, b.preferred_time, b.status, c.name AS contact_name
     FROM receptionist_booking b LEFT JOIN receptionist_contact c ON c.id=b.contact_id
     WHERE b.workspace_id=$1 AND b.status IN ('requested','confirmed')
     ORDER BY b.scheduled_start NULLS LAST, b.created_at LIMIT 10`,
    [ws]
  );
  const data = {
    upcoming: r.rows.map((b) => ({
      service: popiaSnippet(b.service, 80),
      when: b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : popiaSnippet(b.preferred_time, 60),
      status: b.status,
      customer: firstName2(b.contact_name)
    })),
    requested: r.rows.filter((b) => b.status === "requested").length,
    confirmed: r.rows.filter((b) => b.status === "confirmed").length
  };
  const lines = [`${data.upcoming.length} upcoming booking${data.upcoming.length === 1 ? "" : "s"} (${data.confirmed} confirmed, ${data.requested} awaiting confirmation).`];
  for (const b of data.upcoming) lines.push(`- ${b.when || "time to confirm"} \xB7 ${b.service || "booking"} \xB7 ${b.status}${b.customer ? ` \xB7 ${b.customer}` : ""}`);
  return { data, text: lines.join("\n") };
}
var WIDGET_URI = "ui://widget/revup-overview-v1.html";
var WIDGET_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;margin:0;padding:12px;background:#fff;color:#1d1d1f}
h2{font-size:15px;margin:0 0 8px}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:13px}
.row:last-child{border:none}.mut{color:#6e6e73;font-size:12px}.n{font-weight:700;font-size:22px}
.grid{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #e5e5ea;border-radius:10px;padding:10px 14px;min-width:110px}
</style></head><body><div id="root"><p class="mut">Loading\u2026</p></div><script>
const o=(window.openai&&window.openai.toolOutput)||{};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let h='';
if(o.enquiries_today!==undefined){h+='<h2>Today\\'s enquiries - '+esc(o.day)+'</h2><div class="grid"><div class="card"><div class="n">'+esc(o.enquiries_today)+'</div><div class="mut">today</div></div>';
for(const[k,v]of Object.entries(o.all_time_by_stage||{}))h+='<div class="card"><div class="n">'+esc(v)+'</div><div class="mut">'+esc(k)+'</div></div>';
h+='</div>';for(const l of(o.latest||[]))h+='<div class="row"><span>'+esc(l.snippet)+'</span><span class="mut">'+esc(l.at)+' \xB7 '+esc(l.stage)+'</span></div>';}
else if(o.review_links_sent!==undefined){h+='<h2>Review stats</h2><div class="grid"><div class="card"><div class="n">'+esc(o.review_links_sent)+'</div><div class="mut">links sent</div></div><div class="card"><div class="n">'+esc(o.links_clicked)+'</div><div class="mut">clicked</div></div><div class="card"><div class="n">'+esc(o.contacts_in_inbox)+'</div><div class="mut">contacts</div></div></div>';}
else if(o.items){h+='<h2>Demand radar - '+esc(o.industry)+'</h2>';for(const i of o.items)h+='<div class="row"><span>'+esc(i.title)+'</span><span class="mut">'+esc(i.published_at||'')+'</span></div>';}
else if(o.upcoming){h+='<h2>Upcoming bookings</h2>';for(const b of o.upcoming)h+='<div class="row"><span>'+esc(b.service||'booking')+(b.customer?' \xB7 '+esc(b.customer):'')+'</span><span class="mut">'+esc(b.when||'')+' \xB7 '+esc(b.status)+'</span></div>';if(!o.upcoming.length)h+='<p class="mut">No upcoming bookings.</p>';}
else h='<p class="mut">No data.</p>';
document.getElementById('root').innerHTML=h;
</script></body></html>`;
var TOOLS = [
  {
    name: "get_today_enquiry_summary",
    title: "Today's enquiry summary",
    description: "Use this when the owner asks how many website enquiries came in today, or wants the latest enquiry messages. Returns today's count, the all-time lead pipeline by stage, and short snippets of the 3 newest enquiry messages. Read-only; contains no contact details.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with today's enquiry count, pipeline stages and the newest enquiry snippets.", "openai/toolInvocation/invoking": "Checking today's enquiries", "openai/toolInvocation/invoked": "Enquiry summary ready" },
    run: toolTodayEnquiries
  },
  {
    name: "get_review_stats",
    title: "Review stats",
    description: "Use this when the owner asks about Google review performance: how many review links were sent, how many customers clicked, inbox size, and review/reminder event counts. Read-only; counts only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "Cards with review links sent, clicked and contacts in inbox.", "openai/toolInvocation/invoking": "Pulling review stats", "openai/toolInvocation/invoked": "Review stats ready" },
    run: toolReviewStats
  },
  {
    name: "get_radar_feed",
    title: "Demand radar feed",
    description: "Use this when the owner asks what is happening in their industry or area: the latest South African demand signals and news the radar collected for their business. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of the newest demand radar signals with source and date.", "openai/toolInvocation/invoking": "Scanning the demand radar", "openai/toolInvocation/invoked": "Radar feed ready" },
    run: toolRadarFeed
  },
  {
    name: "get_upcoming_bookings",
    title: "Upcoming bookings",
    description: "Use this when the owner asks about today's or this week's bookings: service, time, status and customer first name for the next bookings, with requested vs confirmed counts. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { "openai/outputTemplate": WIDGET_URI, "ui.resourceUri": WIDGET_URI, "openai/widgetDescription": "List of upcoming bookings with service, time and status.", "openai/toolInvocation/invoking": "Checking the diary", "openai/toolInvocation/invoked": "Bookings ready" },
    run: toolUpcomingBookings
  }
];
function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id, result });
}
function rpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}
function mcpUnauthorized(base) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "OAuth required" } }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`
    }
  });
}
async function handleMcp(req, env, url, poolFn) {
  const base = url.origin;
  if (req.method === "GET") return json({ error: "SSE not supported; POST JSON-RPC here" }, 405);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  let msg;
  try {
    msg = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Batches not supported");
  const id = msg.id;
  if (id === void 0 || id === null) {
    if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled") return new Response(null, { status: 202 });
  }
  switch (msg.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: msg.params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "revup", title: "RevUp", version: "1.0.0" },
        instructions: "RevUp read-only tools for the connected business workspace: today's enquiries, review stats, demand radar, upcoming bookings. All tools are read-only and POPIA-safe (counts and short snippets only, no contact details)."
      });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "resources/list":
      return rpcResult(id, { resources: [{ uri: WIDGET_URI, name: "RevUp overview", mimeType: "text/html+skybridge", description: "Visual summary for RevUp read-only tools." }] });
    case "resources/read":
      if (msg.params?.uri !== WIDGET_URI) return rpcError(id, -32602, "Unknown resource");
      return rpcResult(id, { contents: [{ uri: WIDGET_URI, mimeType: "text/html+skybridge", text: WIDGET_HTML }] });
    case "tools/call": {
      const ws = await workspaceForToken(req, env, poolFn);
      if (!ws) return mcpUnauthorized(base);
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return rpcError(id, -32602, "Unknown tool");
      const db = poolFn(env);
      try {
        const { data, text } = await tool.run(db, ws.workspace_id);
        return rpcResult(id, {
          content: [{ type: "text", text }],
          structuredContent: { ...data, workspace: ws.workspace_name, business: ws.org_name }
        });
      } catch (e) {
        return rpcResult(id, { content: [{ type: "text", text: `RevUp could not load that right now: ${String(e).slice(0, 160)}` }], isError: true });
      } finally {
        await db.end().catch(() => {
        });
      }
    }
    default:
      return rpcError(id, -32601, "Method not found");
  }
}
function corsHeaders() {
  return { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "authorization,content-type,mcp-protocol-version,mcp-session-id" };
}
function privacyPage() {
  return layout("Privacy policy", `
<div class="card"><h2>Privacy policy - RevUp</h2>
<p class="mut">Last updated 8 November 2026 \xB7 NahaLabs, South Africa</p>
<p>RevUp is a business tool from NahaLabs that helps South African businesses answer enquiries, collect Google reviews, follow up leads and manage bookings. This policy explains what we collect and why, in line with the Protection of Personal Information Act (POPIA).</p>
<h3>What we collect</h3>
<ul>
<li>Account details you give us: name, email, business name.</li>
<li>Customer information your customers send you through RevUp: enquiry messages, WhatsApp conversations, booking details.</li>
<li>Usage and technical data needed to run the service.</li>
</ul>
<h3>How we use it</h3>
<ul>
<li>To provide the features you switched on: replying to enquiries, requesting reviews, reminders, bookings and posts.</li>
<li>We never sell personal information and never use your customer data to advertise.</li>
</ul>
<h3>ChatGPT app connection</h3>
<p>If you connect RevUp to ChatGPT, the connection is read-only. It shares counts and short message snippets only - never customer phone numbers, email addresses or full records. You can disconnect at any time from ChatGPT's app settings, which stops all further sharing immediately.</p>
<h3>Your rights</h3>
<p>You may ask to see, correct or delete your information at any time. Customers of a business using RevUp can ask that business directly, or contact us and we will route the request.</p>
<h3>Contact</h3>
<p>Information officer: Thabiso Naha \xB7 <a href="mailto:hello@nahalabs.co.za">hello@nahalabs.co.za</a> \xB7 South Africa. Complaints may also be lodged with the Information Regulator (South Africa).</p>
</div>`);
}
async function handleChatAppRoute(req, env, url, poolFn) {
  const path = url.pathname;
  const base = url.origin;
  if (path === "/.well-known/oauth-protected-resource") {
    const r = json({ ...protectedResourceMetadata(base) });
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/.well-known/oauth-authorization-server") {
    const r = json(authMetadata(base));
    for (const [k, v] of Object.entries(corsHeaders())) r.headers.set(k, v);
    return r;
  }
  if (path === "/oauth/register" && req.method === "POST") return handleRegisterReal(req, env, poolFn);
  if (path === "/oauth/authorize" && (req.method === "GET" || req.method === "POST")) return handleAuthorize(req, env, url, poolFn);
  if (path === "/oauth/token" && req.method === "POST") return handleToken(req, env, poolFn);
  if (path === "/mcp" || path === "/mcp/") return handleMcp(req, env, url, poolFn);
  if (path === "/privacy") return html(privacyPage());
  return null;
}

// src/index.ts
init_freeai();

// src/socialteam.ts
init_freeai();
var A = (slug, name, dept, does = "") => ({ slug, name, dept, live: false, does });
var TEAM_AGENTS = [
  // 1 Niche Research
  { slug: "researcher", name: "Researcher", dept: "Niche Research", live: true, does: "Studies your business, your customers and your area, and brings you fresh post ideas worth your time." },
  A("audience-mapper", "Audience Mapper", "Niche Research"),
  A("offer-analyst", "Offer Analyst", "Niche Research"),
  A("local-scout", "Local Market Scout", "Niche Research"),
  A("question-collector", "Question Collector", "Niche Research"),
  // 2 Competitor Tracking
  A("competitor-tracker", "Competitor Tracker", "Competitor Tracking"),
  A("ad-watcher", "Ad Watcher", "Competitor Tracking"),
  A("price-spotter", "Price Spotter", "Competitor Tracking"),
  A("review-reader", "Review Reader", "Competitor Tracking"),
  A("move-reporter", "Move Reporter", "Competitor Tracking"),
  // 3 Viral Video Research
  A("video-scout", "Video Scout", "Viral Video Research"),
  A("format-analyst", "Format Analyst", "Viral Video Research"),
  A("sound-tracker", "Sound Tracker", "Viral Video Research"),
  A("watchtime-analyst", "Watch-Time Analyst", "Viral Video Research"),
  A("trend-catcher", "Trend Catcher", "Viral Video Research"),
  // 4 Top Creator Research
  A("creator-scout", "Creator Scout", "Top Creator Research"),
  A("collab-finder", "Collab Finder", "Top Creator Research"),
  A("style-analyst", "Style Analyst", "Top Creator Research"),
  A("growth-tracker", "Growth Tracker", "Top Creator Research"),
  A("outreach-planner", "Outreach Planner", "Top Creator Research"),
  // 5 Scroll-Stopping Hooks
  A("hook-writer", "Hook Writer", "Scroll-Stopping Hooks"),
  A("first-line-tester", "First-Line Tester", "Scroll-Stopping Hooks"),
  A("curiosity-builder", "Curiosity Builder", "Scroll-Stopping Hooks"),
  A("painpoint-finder", "Pain-Point Finder", "Scroll-Stopping Hooks"),
  A("headline-polisher", "Headline Polisher", "Scroll-Stopping Hooks"),
  // 6 Content Trends & Formats
  A("trend-watcher", "Trend Watcher", "Content Trends & Formats"),
  A("format-librarian", "Format Librarian", "Content Trends & Formats"),
  A("platform-specialist", "Platform Specialist", "Content Trends & Formats"),
  A("calendar-planner", "Calendar Planner", "Content Trends & Formats"),
  A("seasonal-scout", "Seasonal Scout", "Content Trends & Formats"),
  // 7 Scriptwriting
  { slug: "writer", name: "Writer", dept: "Scriptwriting", live: true, does: "Turns the idea you pick into a ready post in your business's voice - caption, words and hashtags." },
  A("caption-writer", "Caption Writer", "Scriptwriting"),
  A("story-builder", "Story Builder", "Scriptwriting"),
  A("cta-writer", "CTA Writer", "Scriptwriting"),
  A("editor", "Editor", "Scriptwriting"),
  // 8 Viral Content Scaling
  A("repurpose-specialist", "Repurpose Specialist", "Viral Content Scaling"),
  A("series-planner", "Series Planner", "Viral Content Scaling"),
  A("format-adapter", "Format Adapter", "Viral Content Scaling"),
  A("distribution-planner", "Distribution Planner", "Viral Content Scaling"),
  A("booster", "Booster", "Viral Content Scaling"),
  // 9 Performance Reporting
  A("performance-reporter", "Performance Reporter", "Performance Reporting"),
  A("number-cruncher", "Number Cruncher", "Performance Reporting"),
  A("insight-writer", "Insight Writer", "Performance Reporting"),
  A("digest-builder", "Weekly Digest Builder", "Performance Reporting"),
  A("wins-tracker", "Wins Tracker", "Performance Reporting"),
  // 10 Content Operations
  { slug: "reviewer", name: "Reviewer", dept: "Content Operations", live: true, does: "Checks every post before you see it - facts, tone, and your rules. Nothing reaches you unchecked." },
  A("scheduler", "Scheduler", "Content Operations"),
  A("approval-chaser", "Approval Chaser", "Content Operations"),
  A("asset-organizer", "Asset Organizer", "Content Operations"),
  A("publishing-checker", "Publishing Checker", "Content Operations")
];
var LIVE_AGENTS = TEAM_AGENTS.filter((a) => a.live);
var TEAM_DEPARTMENTS = [...new Set(TEAM_AGENTS.map((a) => a.dept))];
var ensured2 = null;
function ensureSocialTeamSchema(db) {
  if (!ensured2) ensured2 = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS socialteam_idea(
    id uuid PRIMARY KEY, workspace_id uuid NOT NULL,
    title text NOT NULL, angle text NOT NULL, rationale text NOT NULL,
    status varchar(12) NOT NULL DEFAULT 'fresh',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await db.query(`CREATE TABLE IF NOT EXISTS socialteam_piece(
    id uuid PRIMARY KEY, workspace_id uuid NOT NULL, idea_id uuid,
    caption text NOT NULL DEFAULT '', hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
    review_note text NOT NULL DEFAULT '', status varchar(24) NOT NULL DEFAULT 'in_review',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
  })().catch((e) => {
    ensured2 = null;
    throw e;
  });
  return ensured2;
}
function researchPrompt(business, industry, avoid) {
  return `Business: ${business} (${industry || "local business"}, South Africa).
You are the business's content researcher. Suggest 5 social media post ideas for this business - topics real local customers care about, not generic filler.
${avoid.length ? `Already suggested (do not repeat): ${avoid.join("; ")}.` : ""}
${FACT_RULES}
Reply with JSON only: {"ideas": [{"title": "short title", "angle": "the specific angle to take", "rationale": "why this works for this business"}]}`;
}
function parseIdeas(text) {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const ideas = Array.isArray(p.ideas) ? p.ideas : [];
    const out = ideas.map((i) => ({
      title: String(i.title || "").trim().slice(0, 160),
      angle: String(i.angle || "").trim().slice(0, 400),
      rationale: String(i.rationale || "").trim().slice(0, 400)
    })).filter((i) => i.title && i.angle);
    return out.length ? out : null;
  } catch {
    return null;
  }
}
function writerPrompt(business, idea) {
  return `Business: ${business} (South Africa).
You are the business's social media writer. Write one social media post from this idea:
Title: ${idea.title}
Angle: ${idea.angle}
Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. South African English. Keep the caption under 900 characters including hashtags. ${FACT_RULES}
Reply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
}
function parseDraft(text) {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const caption = String(p.caption || "").trim();
    const hashtags = Array.isArray(p.hashtags) ? p.hashtags.map((h) => String(h).trim()).filter(Boolean).slice(0, 15) : [];
    return caption ? { caption, hashtags } : null;
  } catch {
    return null;
  }
}
function reviewPrompt(business, caption) {
  return `Business: ${business} (South Africa).
You are the business's content reviewer. Check this draft social media post before the owner sees it:
---
${caption}
---
Check: (1) no invented facts, statistics, testimonials, prices or claims the business could not verify; (2) plain simple English a customer reads in one pass; (3) sounds like the business, warm and professional; (4) no fake urgency, no mention of technology vendors or that software wrote it.
${FACT_RULES}
Reply with JSON only: {"pass": true or false, "note": "one short sentence for the owner - what you checked, or what must change"}`;
}
function parseReview(text) {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const note = String(p.note || "").trim().slice(0, 300);
    if (typeof p.pass !== "boolean" || !note) return null;
    return { pass: p.pass, note };
  } catch {
    return null;
  }
}
var BUSY = "the team is busy right now - try again shortly";
async function runResearcher(env, business, industry, avoid) {
  const prompt = researchPrompt(business, industry, avoid);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1800, temperature: 0.5 }, rejectInventedPrices(prompt, parseIdeas));
  if (!r) throw new Error(BUSY);
  return r.value.slice(0, 5);
}
async function runWriter(env, business, idea) {
  const prompt = writerPrompt(business, idea);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1500, temperature: 0.3 }, rejectInventedPrices(prompt, parseDraft));
  if (!r) throw new Error(BUSY);
  return r.value;
}
async function runReviewer(env, business, caption) {
  const prompt = reviewPrompt(business, caption);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 300, temperature: 0.1 }, parseReview);
  if (!r) throw new Error(BUSY);
  return r.value;
}
async function producePiece(env, db, ws, pieceId, business, idea) {
  let draft = await runWriter(env, business, idea);
  let review = await runReviewer(env, business, draft.caption);
  if (!review.pass) {
    draft = await runWriter(env, business, { ...idea, angle: idea.angle + " (reviewer note to fix: " + review.note + ")" });
    review = await runReviewer(env, business, draft.caption);
  }
  await db.query(
    `UPDATE socialteam_piece SET caption=$1, hashtags=$2::jsonb, review_note=$3, status=$4, updated_at=now() WHERE id=$5 AND workspace_id=$6`,
    [draft.caption, JSON.stringify(draft.hashtags), (review.pass ? "Checked: " : "Checked, needs your eye: ") + review.note, review.pass ? "ready" : "returned", pieceId, ws]
  );
}
var esc3 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var PAGE_CSS = `<style>
/* Apple-style: borderless soft cards, generous space, one accent, quiet type */
.tchips{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px}
.tchip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:5px 14px 5px 6px;font-weight:600;font-size:13px;background:#fff;box-shadow:0 1px 2px rgba(23,23,20,.05),0 6px 18px rgba(23,23,20,.06)}
.tav{width:26px;height:26px;border-radius:50%;background:var(--brand,#f47721);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
.tidea,.tpiece{border:0;border-radius:16px;background:#fff;margin:0 0 10px;overflow:hidden;box-shadow:0 1px 2px rgba(23,23,20,.05),0 10px 28px rgba(23,23,20,.06);transition:box-shadow .18s ease}
.tidea:hover,.tpiece:hover{box-shadow:0 2px 4px rgba(23,23,20,.06),0 14px 36px rgba(23,23,20,.09)}
.tidea>summary,.tpiece>summary{display:flex;align-items:center;gap:12px;padding:16px 18px;cursor:pointer;list-style:none;font-size:15px;font-weight:600;-webkit-tap-highlight-color:transparent}
.tidea>summary::-webkit-details-marker,.tpiece>summary::-webkit-details-marker{display:none}
.tidea-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tpiece-t{flex:1;min-width:0;font-weight:500;color:#3d3a33;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;line-height:1.4}
.tidea-b,.tpiece-b{padding:0 18px 16px;font-size:14px;color:#3d3a33}
.tidea-b p,.tpiece-b p{margin:6px 0}
.tlbl{font-size:12px;color:#9a958a;margin:20px 4px 8px;font-weight:500}
.tchev{color:#c9c4b8;font-size:12px;transition:transform .15s ease}
details[open] .tchev{transform:rotate(90deg)}
.tpiece .pill{flex-shrink:0}
.tfoot{color:#9a958a;font-size:12px;margin:18px 4px 0}
</style>`;
var PIECE_LABEL = {
  ready: "ready",
  returned: "your call",
  sent_for_approval: "in approvals",
  in_review: "writing"
};
function firstLine(caption) {
  const t = String(caption || "").trim();
  return t.length > 150 ? t.slice(0, 150).trimEnd() + "\u2026" : t;
}
function teamPageBody(ideas, pieces, msg = "") {
  const chips = LIVE_AGENTS.map((a) => `<span class="tchip"><span class="tav">${esc3(a.name[0])}</span>${esc3(a.name)}</span>`).join("");
  const ideaRows = ideas.slice(0, 3).map((i) => `
<details class="tidea"><summary><span class="tidea-t">${esc3(i.title)}</span><span class="tchev">&#9656;</span></summary>
<div class="tidea-b"><p>${esc3(i.angle)}</p><p class="mut">${esc3(i.rationale)}</p>
<form class="inline" method="post" action="/team/idea/${i.id}/write"><button>Write this up</button></form>
<form class="inline" method="post" action="/team/idea/${i.id}/park"><button class="link">Park</button></form></div></details>`).join("");
  const pieceRows = pieces.map((p) => {
    const tags = Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "";
    const cls = p.status === "ready" || p.status === "sent_for_approval" ? "ok" : p.status === "returned" ? "warn" : "";
    return `
<details class="tpiece"><summary><span class="pill ${cls}">${esc3(PIECE_LABEL[p.status] || p.status)}</span><span class="tpiece-t">${esc3(firstLine(p.caption))}</span><span class="tchev">&#9656;</span></summary>
<div class="tpiece-b"><p style="white-space:pre-wrap">${esc3(p.caption)}</p>${tags ? `<p class="mut">${esc3(tags)}</p>` : ""}
<p class="mut">${esc3(p.review_note)}</p>
${p.status === "ready" || p.status === "returned" ? `<form class="inline" method="post" action="/team/piece/${p.id}/send"><button>Send to approvals</button></form>` : ""}</div></details>`;
  }).join("");
  return `${PAGE_CSS}
${msg ? `<p class="ok">${esc3(msg)}</p>` : ""}
<div class="tchips">${chips}</div>
<form method="post" action="/team/research"><button>Get fresh ideas</button></form>
${ideaRows ? `<p class="tlbl">Fresh ideas</p>${ideaRows}` : ""}
${pieceRows ? `<p class="tlbl">Posts</p>${pieceRows}` : ""}
<p class="tfoot">${TEAM_AGENTS.length - LIVE_AGENTS.length} more teammates switch on as you grow. You approve every post.</p>`;
}
async function teamPage(db, ws, msg = "") {
  const [ideas, pieces] = await Promise.all([
    db.query(`SELECT id, title, angle, rationale FROM socialteam_idea WHERE workspace_id=$1 AND status='fresh' ORDER BY created_at DESC LIMIT 3`, [ws]),
    db.query(`SELECT id, caption, hashtags, review_note, status FROM socialteam_piece WHERE workspace_id=$1 AND status <> 'archived' ORDER BY created_at DESC LIMIT 4`, [ws])
  ]);
  return teamPageBody(ideas.rows, pieces.rows, msg);
}

// src/qrcodejs.ts
var QRCODE_LIB = `//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\\u0020width="';
      img += size;
      img += '"';
      img += '\\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '\u2588\u2588': '\u2588',
        '\u2588 ': '\u2580',
        ' \u2588': '\u2584',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '\u2588\u2588': '\u2580',
        '\u2588 ': '\u2580',
        ' \u2588': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '\u2588';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '\u2588';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('\u2580');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('\u2588\u2588');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));

;if (typeof window !== "undefined") { window.qrcode = qrcode; }
`;

// src/index.ts
function pool(env) {
  return new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15e3, idleTimeoutMillis: 0 });
}
async function sha256hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function md5(input) {
  return import_spark_md5.default.hash(input);
}
function esc2(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function navLinks(user) {
  const g = Array.isArray(user._goals) ? user._goals : [];
  const show = (...need) => !g.length || need.some((n) => g.includes(n));
  let h = `<a href="/">Dashboard</a>`;
  if (show("leads", "receptionist")) h += `<a href="/inbox">Inbox</a>`;
  if (show("leads")) h += `<a href="/frontdesk">Leads</a>`;
  if (show("reviews", "leads", "receptionist")) h += `<a href="/approvals">Approvals</a>`;
  if (show("social")) h += `<a href="/posts">Posts</a>`;
  if (show("social")) h += `<a href="/team">Team</a>`;
  if (show("reviews")) h += `<a href="/reviews">Reviews</a>`;
  if (show("receptionist")) h += `<a href="/receptionist">Receptionist</a>`;
  let more = "";
  if (show("social")) more += `<a href="/analytics">Analytics</a>`;
  if (show("reviews")) more += `<a href="/radar">Radar</a>`;
  if (show("social")) more += `<a href="/media">Media</a>`;
  more += `<a href="/onboarding">Onboarding</a>`;
  if (show("receptionist")) more += `<a href="/assistant">Assistant</a>`;
  if (show("receptionist")) more += `<a href="/bookings">Bookings</a>`;
  if (show("receptionist")) more += `<a href="/waitlist">Waitlist</a>`;
  if (show("receptionist")) more += `<a href="/loyalty">Loyalty</a>`;
  if (show("receptionist")) more += `<a href="/quotes">Quotes</a>`;
  if (show("receptionist")) more += `<a href="/campaigns">Campaigns</a>`;
  if (show("receptionist", "social", "leads")) more += `<a href="/pages">Pages</a>`;
  if (show("receptionist")) more += `<a href="/competitors">Competitors</a>`;
  if (show("receptionist")) more += `<a href="/support">Support</a>`;
  if (show("receptionist")) more += `<a href="/wifi-card">WiFi Card</a>`;
  more += `<a href="/billing">Billing</a>`;
  h += `<details class="nav-more"><summary>More</summary><div class="nav-more-panel">${more}</div></details>`;
  return h;
}
function layout(title, body, user) {
  const nav = user ? `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links">${navLinks(user)}${user._cur_ws ? `<a href="/switch" title="Switch business" style="border:1px solid var(--line);border-radius:8px;padding:2px 8px">${esc2(user._cur_ws)}${(user._ws_count || 0) > 1 ? " &#9662;" : ""}</a>` : ""}<form method="post" action="/logout" style="display:inline"><button class="link">Log out</button></form></div></nav>` : `<nav><a class="logo" href="/"><img src="/static/brand/revup-light.png" alt="RevUp"></a><div class="nav-links"><a class="btn btn-ghost" href="/login">Log in</a><a class="btn btn-primary" href="/signup">Get started</a></div></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc2(title)} \xB7 RevUp</title><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap" rel="stylesheet"><style>
:root{--brand:#F97316;--brand-dark:#EA580C;--brand-soft:#FFF7ED;--ink:#1C1917;--ink2:#57534E;--ink3:#A8A29E;--line:#E7E5E4;--bg:#FAFAF9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Manrope,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
a{color:var(--brand-dark);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line);margin-bottom:32px;flex-wrap:wrap;gap:12px}
.logo img{height:30px;width:auto}
.nav-links{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.nav-links a{color:var(--ink2);font-size:14px;font-weight:500}
.nav-links a:hover{color:var(--ink);text-decoration:none}
.nav-more{position:relative}
.nav-more summary{list-style:none;cursor:pointer;color:var(--ink2);font-size:14px;font-weight:500;display:flex;align-items:center;gap:4px;user-select:none}
.nav-more summary::-webkit-details-marker{display:none}
.nav-more summary::after{content:"";width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.nav-more summary:hover{color:var(--ink)}
.nav-more[open] summary{color:var(--ink)}
.nav-more-panel{position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.06);z-index:50;display:grid;gap:2px}
.nav-more-panel a{display:block;padding:6px 12px;border-radius:8px;white-space:nowrap;color:var(--ink2)}
.nav-more-panel a:hover{background:var(--bg);color:var(--ink);text-decoration:none}
@media (max-width:640px){.nav-more-panel{left:0;right:auto}}
.btn{display:inline-block;padding:10px 20px;border-radius:10px;font-weight:500;font-size:15px;text-decoration:none;transition:background .15s;border:0;cursor:pointer}
.btn-primary{background:var(--brand);color:#fff}
.btn-primary:hover{background:var(--brand-dark);text-decoration:none}
.btn-ghost{color:var(--ink);border:1px solid var(--line);background:#fff}
h1{font-size:24px;font-weight:500;margin:0 0 8px}h2{font-size:16px;font-weight:500;margin:24px 0 8px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:24px;margin:12px 0}
input,select,textarea{width:100%;box-sizing:border-box;padding:12px 16px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink);margin:4px 0 16px;font-size:14px;font-family:inherit}
input:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}
button,.btn-form{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 20px;font-weight:500;cursor:pointer;font-size:14px}
button:hover{background:var(--brand-dark)}
button.link{background:none;color:var(--ink2);padding:0;font-weight:500;font-size:14px}
button.link:hover{color:var(--ink)}
.mut{color:var(--ink3);font-size:13px}.ok{color:#16A34A}.bad{color:#DC2626}.warn{color:#B45309}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:8px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:12px;font-weight:500;color:var(--ink3)}
.pill{font-size:12px;color:var(--brand-dark);font-weight:500}
.pill.warn{color:#B45309}.pill.ok{color:#15803D}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(208px,1fr));gap:16px}
form.inline{display:inline}
.stat{font-size:28px;font-weight:500;margin:2px 0;font-variant-numeric:tabular-nums}
.stat-t{font-size:20px;font-weight:500;margin:2px 0}
label{font-size:13px;font-weight:500;color:var(--ink2)}
</style></head><body><div class="wrap">${nav}<h1>${esc2(title)}</h1>${body}</div></body></html>`;
}
function html(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}
function redirect2(to) {
  return new Response(null, { status: 303, headers: { location: to } });
}
async function getUser(req, db) {
  const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
  if (!m) return null;
  const th = await sha256hex(m[1]);
  const r = await db.query(
    `UPDATE cf_sessions SET last_seen_at=now() WHERE token_hash=$1 AND expires_at>now()
     RETURNING user_id`,
    [th]
  );
  if (!r.rows[0]) return null;
  const u = await db.query(`SELECT id,email,name,is_superuser FROM accounts_user WHERE id=$1 AND is_active`, [r.rows[0].user_id]);
  return u.rows[0] || null;
}
async function newSession(db, userId, req) {
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const th = await sha256hex(token);
  await db.query(
    `INSERT INTO cf_sessions(token_hash,user_id,device_info,expires_at) VALUES($1,$2,$3,now()+interval '14 days')`,
    [th, userId, (req.headers.get("user-agent") || "").slice(0, 200)]
  );
  return token;
}
async function rateLimited(db, bucket, req, limit) {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await db.query(
    `INSERT INTO cf_ratelimit(key,count) VALUES($1,1) ON CONFLICT (key) DO UPDATE SET count=cf_ratelimit.count+1 RETURNING count`,
    [`${bucket}:${ip}:${day}`]
  );
  return Number(r.rows[0].count) > limit;
}
async function rateLimitExceeded(db, bucket, req, limit) {
  const ip = (req.headers.get("cf-connecting-ip") || "unknown").slice(0, 64);
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const r = await db.query(`SELECT count FROM cf_ratelimit WHERE key=$1`, [`${bucket}:${ip}:${day}`]);
  return r.rows[0] ? Number(r.rows[0].count) > limit : false;
}
function sessionCookie(token) {
  return `cf_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${14 * 86400}`;
}
var VERIFY_SQL = `SELECT crypt(encode(digest($1,'sha256'),'hex'), '$2a$' || substring($2 from 5)) = '$2a$' || substring($2 from 5) AS ok`;
var MAKE_HASH_SQL = `SELECT 'bcrypt_sha256$' || '$2b$' || substring(crypt(encode(digest($1,'sha256'),'hex'), gen_salt('bf',12)) from 5) AS hash`;
async function membership(db, userId, req) {
  const r = await db.query(
    `SELECT w.id AS workspace_id, w.name AS workspace_name, w.approval_workflow_mode,
            o.id AS org_id, o.name AS org_name, o.plan, o.subscription_status, o.payment_reference,
            o.trial_started_at, o.activated_at, o.goals, m.workspace_role
     FROM members_workspace_membership m
     JOIN workspaces_workspace w ON w.id=m.workspace_id
     JOIN organizations_organization o ON o.id=w.organization_id
     WHERE m.user_id=$1 AND w.is_archived=false AND o.deleted_at IS NULL
     ORDER BY m.added_at`,
    [userId]
  );
  if (!r.rows.length) return null;
  const want = req ? (/(?:^|;\s*)cf_ws=([0-9a-f-]{36})/.exec(req.headers.get("cookie") || "") || [])[1] : null;
  const cur = want && r.rows.find((x) => x.workspace_id === want) || r.rows[0];
  cur.workspaces = r.rows.map((x) => ({ id: x.workspace_id, name: x.workspace_name, org: x.org_name, plan: x.plan, status: x.subscription_status }));
  return cur;
}
async function formData(req) {
  const fd = await req.formData();
  const o = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}
function pfUrl(env, base, plan, org) {
  const prices = { starter: 499, growth: 999, "business-pro": 1999 };
  const amount = prices[plan];
  const params = [
    ["merchant_id", env.PF_MERCHANT_ID],
    ["merchant_key", env.PF_MERCHANT_KEY],
    ["return_url", `${base}/billing?pf=return`],
    ["cancel_url", `${base}/billing?pf=cancel`],
    ["notify_url", `${base}/billing/payfast-itn`],
    ["m_payment_id", `${org.payment_reference || "RU"}-${plan}`],
    ["amount", amount.toFixed(2)],
    ["item_name", `RevUp ${plan} monthly`],
    ["subscription_type", "1"],
    ["recurring_amount", amount.toFixed(2)],
    ["frequency", "3"],
    ["cycles", "0"]
  ].filter(([, v]) => v !== "");
  const enc = (v) => encodeURIComponent(v.trim()).replace(/%20/g, "+");
  const baseStr = params.map(([k, v]) => `${k}=${enc(v)}`).join("&");
  const sig = md5(baseStr + `&passphrase=${enc(env.PF_PASSPHRASE)}`);
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`).join("&");
  return `https://sandbox.payfast.co.za/eng/process?${qs}&signature=${sig}`;
}
function pfQuotePlus(v) {
  return encodeURIComponent(v).replace(/%20/g, "+").replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
async function handlePayfastItn(db, env, req) {
  const raw = await req.text();
  const pairs = raw.split("&").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)];
  });
  const dec = (v) => decodeURIComponent(v.replace(/\+/g, " "));
  const post = {};
  for (const [k, v] of pairs) post[k] = dec(v);
  const received = post["signature"] || "";
  const baseStr = pairs.filter(([k]) => k !== "signature").map(([k, v]) => `${k}=${pfQuotePlus(dec(v).trim())}`).join("&");
  const ours = md5(baseStr + `&passphrase=${pfQuotePlus(env.PF_PASSPHRASE)}`);
  if (!received || received !== ours) return new Response("bad signature", { status: 400 });
  const check = await fetch("https://sandbox.payfast.co.za/eng/query/validate", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: raw
  });
  if ((await check.text()).trim() !== "VALID") return new Response("payfast validate-back rejected", { status: 400 });
  if (post["payment_status"] !== "COMPLETE") return new Response(`status ${post["payment_status"] || "?"}`, { status: 400 });
  const mpid = post["m_payment_id"] || "";
  const parts = mpid.split("-");
  const reference = mpid.startsWith("RU-") ? "RU-" + (parts[1] || "") : "";
  const plan = parts.slice(2).join("-");
  if (!reference || !["starter", "growth", "business-pro"].includes(plan)) return new Response("unknown reference", { status: 400 });
  const r = await db.query(
    `UPDATE organizations_organization SET plan=$1, subscription_status='active', payfast_token=$2, updated_at=now() WHERE payment_reference=$3`,
    [plan, post["token"] || "", reference]
  );
  if (!r.rowCount) return new Response("unknown reference", { status: 400 });
  return new Response("OK");
}
var DRAFT_RULES = "Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. South African English. Keep the caption under 900 characters including hashtags. " + FACT_RULES;
async function draftCaption(env, business, topic) {
  const prompt = `Business: ${business}.
Write one social media post for this business about: ${topic}.
${DRAFT_RULES}
Reply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1500, temperature: 0.2 }, rejectInventedPrices(prompt, (text) => {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) return null;
    try {
      const parsed = JSON.parse(m[0]);
      const caption = String(parsed.caption || "").trim();
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h) => String(h)) : [];
      return caption ? { caption, hashtags } : null;
    } catch {
      return null;
    }
  }));
  if (!r) throw new Error("the writing assistant is busy right now");
  return r.value;
}
async function groqFollowup(env, db, ws, business, lead) {
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  const pq = await db.query(`SELECT pricing_data FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [ws]);
  const pricing = JSON.stringify(pq.rows[0]?.pricing_data || {});
  const prompt = `Business: ${business} (South Africa).
A website visitor sent an enquiry.
Name: ${lead.name}
Contact: ${lead.contact}
Enquiry: ${lead.message}
Known prices for this business (JSON, may be empty): ${pricing}
Write one short follow-up message the business can send back (max 120 words, warm and professional, plain text, no subject line).
${FACT_RULES}
The visitor's own contact detail above is NOT the business's - never quote it back as a way to reach the business. If pricing is asked and not in the known prices, say the business will confirm the exact price directly. Sign off as the business name only. Reply with the message text only.`;
  const r = await freeAiGenerate(env, prompt, { maxTokens: 500, temperature: 0.3 }, rejectInventedPrices(prompt, (text) => {
    const v = text.trim();
    return v || null;
  }));
  if (!r) throw new Error("the writing assistant is busy right now");
  return r.value;
}
var enquiryForm = (biz, err = "") => layout(`Enquire - ${biz}`, `
<div class="card"><h2>Send ${esc2(biz)} an enquiry</h2>
${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<form method="post">
<label>Your name<input name="name" required maxlength="200"></label>
<label>WhatsApp number or email<input name="contact" required maxlength="200"></label>
<label>How can they help?<textarea name="message" rows="4" required maxlength="2000"></textarea></label>
<button>Send enquiry</button></form></div>`);
var signupPage = (err = "") => layout("Create your RevUp account", `
${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><form method="post" action="/signup">
<label>Your name<input name="name" required maxlength="150"></label>
<label>Email<input name="email" type="email" required maxlength="254"></label>
<label>Password<input name="password" type="password" required minlength="8"></label>
<label>Business name<input name="business" required maxlength="200"></label>
<button>Create account</button>
<p class="mut">One monthly price from day one - no setup fee. Choose your plan during setup and activate it with your first payment.</p>
</form></div>`);
var loginPage = (err = "") => layout("Log in to RevUp", `
${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><form method="post" action="/login">
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button>Log in</button>
</form></div>`);
function statusLabel(s) {
  return s === "active" ? "active" : "activation pending";
}
async function dashboardPage(db, user, mem, msg = "") {
  const [pending, links, clicks, posts] = await Promise.all([
    db.query(`SELECT count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 AND pp.status='pending_review'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM composer_post WHERE workspace_id=$1`, [mem.workspace_id])
  ]);
  return layout("Dashboard", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<p class="mut">${esc2(mem.org_name)}${mem.workspace_name && mem.workspace_name !== mem.org_name ? ` \xB7 ${esc2(mem.workspace_name)}` : ""} \xB7 <span class="pill">${esc2(mem.plan)}</span> <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc2(statusLabel(mem.subscription_status))}</span></p>
<div class="grid">
<div class="card"><h2>Posts</h2><p class="stat">${posts.rows[0].c}</p><p class="mut">total in this workspace</p></div>
<div class="card"><h2>Awaiting approval</h2><p class="stat">${pending.rows[0].c}</p><p class="mut"><a href="/approvals">review now \u2192</a></p></div>
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked \xB7 <a href="/reviews">manage \u2192</a></p></div>
<div class="card"><h2>Subscription</h2><p class="stat-t">${esc2(mem.plan)}</p><p class="mut"><a href="/billing">billing \u2192</a></p></div>
</div>`, user);
}
var GOALS = [
  ["receptionist", "Answer my business WhatsApp day and night"],
  ["reviews", "Turn happy customers into 5-star Google reviews"],
  ["social", "Keep my Facebook and Instagram posting"],
  ["leads", "Capture website enquiries and follow them up"]
];
var PLAN_CARDS = [
  { slug: "starter", name: "Starter", price: 499, feat: "Google review booster + enquiry inbox" },
  { slug: "growth", name: "Growth", price: 999, feat: "Everything in Starter + social posting with approvals" },
  { slug: "business-pro", name: "Business Pro", price: 1999, feat: "Everything in Growth + hands-free auto-posting, lead pipeline and follow-ups" }
];
function recommendPlan(goals) {
  if (goals.includes("leads")) return "business-pro";
  if (goals.includes("social")) return "growth";
  return "starter";
}
async function onboardingPage(db, user, mem, msg = "") {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const w = await db.query(`SELECT industry, website_url, timezone FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ws = w.rows[0] || {};
  const savedGoals = Array.isArray(b.custom_rules?.goals) ? b.custom_rules.goals : [];
  const rec = recommendPlan(savedGoals);
  const cur = mem.plan || rec;
  return layout("Onboarding", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><form method="post" action="/onboarding">
<h2 style="margin-top:0">Your business</h2>
<label>Business name<input name="business_name" value="${esc2(b.business_name || mem.org_name)}" required></label>
<label>Industry<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}"${(ws.industry || b.industry || "general") === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
<label>Website<input name="website_url" value="${esc2(ws.website_url || "")}" placeholder="https://\u2026"></label>
<label>Google review link<input name="google_review_url" value="${esc2(b.google_review_url || "")}" placeholder="https://g.page/r/\u2026"></label>
<label>Timezone<input name="timezone" value="${esc2(ws.timezone || "Africa/Johannesburg")}"></label>
<h2>What do you want RevUp to do for you?</h2>
${GOALS.map(([v, l]) => `<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="goal_${v}"${savedGoals.includes(v) ? " checked" : ""} style="width:auto"> ${l}</label>`).join("")}
<h2>Choose your plan</h2>
${PLAN_CARDS.map((p) => `<label style="display:block;border:1px solid ${cur === p.slug ? "var(--brand)" : "var(--line)"};border-radius:12px;padding:12px 14px;margin:8px 0;cursor:pointer;font-weight:400">
<input type="radio" name="plan" value="${p.slug}"${cur === p.slug ? " checked" : ""} style="width:auto"> <b>${p.name} - R${p.price.toLocaleString("en-ZA")}/month</b>${rec === p.slug ? ` <span class="pill ok recpill" style="margin-left:8px">Recommended</span>` : ""}<br>
<span class="mut">${p.feat}</span></label>`).join("")}
<script>
(function(){
  var boxes=document.querySelectorAll('input[name^="goal_"]');
  function recalc(){
    var g=[];boxes.forEach(function(b){if(b.checked)g.push(b.name.slice(5));});
    var r=g.indexOf('leads')>=0?'business-pro':(g.indexOf('social')>=0?'growth':'starter');
    document.querySelectorAll('input[name="plan"]').forEach(function(p){
      var card=p.closest('label');
      var old=card.querySelector('.recpill');if(old)old.remove();
      if(p.value===r){var sp=document.createElement('span');sp.className='pill ok recpill';sp.style.marginLeft='8px';sp.textContent='Recommended';card.querySelector('b').after(sp);}
      if(!p.dataset.touched)p.checked=(p.value===r);
      card.style.borderColor=p.checked?'var(--brand)':'var(--line)';
    });
  }
  document.querySelectorAll('input[name="plan"]').forEach(function(p){p.addEventListener('change',function(){p.dataset.touched='1';document.querySelectorAll('input[name="plan"]').forEach(function(q){q.closest('label').style.borderColor=q.checked?'var(--brand)':'var(--line)';});});});
  boxes.forEach(function(b){b.addEventListener('change',recalc);});
  recalc();
})();
</script>
<p class="mut">Plans are billed monthly from day one - no setup fee. You can change plans any time on the billing page.</p>
<button>Save and continue</button>
</form></div>`, user);
}
async function waitlistPage(db, user, mem, msg = "") {
  await waitlistExpire(db, mem.workspace_id);
  const r = await db.query(
    `SELECT w.*, c.name AS contact_name, c.wa_id FROM receptionist_waitlistentry w
     JOIN receptionist_contact c ON c.id=w.contact_id
     WHERE w.workspace_id=$1 ORDER BY CASE WHEN w.status IN ('waiting','offered') THEN 0 ELSE 1 END, w.created_at LIMIT 40`,
    [mem.workspace_id]
  );
  const badge = { waiting: "<b>waiting</b>", offered: '<span class="pill warn">offered</span>', accepted: '<span class="ok">accepted</span>', cancelled: '<span class="mut">cancelled</span>', expired: '<span class="mut">expired</span>' };
  const rows = r.rows.map((w) => `<tr>
<td><b>${esc2(w.contact_name || w.wa_id)}</b><br><span class="mut">party of ${w.party_size}${w.wanted_time ? " \xB7 " + esc2(w.wanted_time) : ""}</span></td>
<td>${badge[w.status] || esc2(w.status)}${w.status === "offered" ? `<br><span class="mut">${w.offer_minutes} min to answer</span>` : ""}</td>
<td>${w.status === "waiting" ? `<form class="inline" method="post" action="/waitlist/${w.id}/offer"><button>Offer a table</button></form>` : ""}
${w.status === "offered" ? `<form class="inline" method="post" action="/waitlist/${w.id}/accept"><button>They accepted</button></form>` : ""}
${["waiting", "offered"].includes(w.status) ? `<form class="inline" method="post" action="/waitlist/${w.id}/cancel"><button class="link">Remove</button></form>` : ""}</td></tr>`).join("");
  return layout("Waitlist", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Add a waiting party</h2>
<form method="post" action="/waitlist">
<label>Name<input name="name" maxlength="120"></label>
<label>WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27\u2026"></label>
<label>Party size<input name="party_size" type="number" min="1" max="30" value="2" style="width:90px"></label>
<label>They hoped for<input name="wanted_time" maxlength="200" placeholder="tonight around 7"></label>
<button>Add to the waitlist</button></form></div>
<div class="card">${r.rows.length ? `<table><tr><th>Party</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">Nobody waiting. When the restaurant is full, add parties here and offer tables as they open up.</p>`}</div>`, user);
}
async function loyaltyPage(db, user, mem, msg = "") {
  const s = await loyaltySettings(db, mem.workspace_id);
  const accounts = await db.query(
    `SELECT a.*, c.name AS contact_name, c.wa_id FROM receptionist_loyaltyaccount a
     JOIN receptionist_contact c ON c.id=a.contact_id WHERE a.workspace_id=$1 ORDER BY a.balance DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const vouchers = await db.query(
    `SELECT v.*, c.name AS contact_name FROM receptionist_voucher v
     JOIN receptionist_contact c ON c.id=v.contact_id WHERE v.workspace_id=$1 ORDER BY v.created_at DESC LIMIT 30`,
    [mem.workspace_id]
  );
  const aRows = accounts.rows.map((a) => `<tr><td><b>${esc2(a.contact_name || a.wa_id)}</b></td><td>${a.balance} pts</td><td class="mut">${a.lifetime_points} lifetime</td>
<td>${a.balance >= s.points_for_voucher ? `<form class="inline" method="post" action="/loyalty/vouchers/new"><input type="hidden" name="contact_id" value="${a.contact_id}"><button>Issue R${s.voucher_value_rand} voucher</button></form>` : `<span class="mut">${s.points_for_voucher - a.balance} to go</span>`}</td></tr>`).join("");
  const vRows = vouchers.rows.map((v) => `<tr><td><b>${esc2(v.code)}</b></td><td>${esc2(v.contact_name)}</td><td>R${v.amount_rand}</td>
<td>${v.status === "active" ? '<span class="ok">active</span>' : esc2(v.status)}</td>
<td class="mut">to ${new Date(v.expires_at).toLocaleDateString("en-ZA")}</td>
<td>${v.status === "active" ? `<form class="inline" method="post" action="/loyalty/vouchers/${v.id}/redeem"><button class="link">Redeem</button></form>` : ""}</td></tr>`).join("");
  return layout("Loyalty", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Rules</h2>
<form method="post" action="/loyalty/settings">
<label>Programme <select name="enabled"><option value="on" ${s.enabled ? "selected" : ""}>on</option><option value="off" ${!s.enabled ? "selected" : ""}>off</option></select></label>
<label>Points per visit<input name="points_per_visit" type="number" min="0" value="${s.points_per_visit}" style="width:100px"></label>
<label>Welcome bonus<input name="welcome_bonus" type="number" min="0" value="${s.welcome_bonus}" style="width:100px"></label>
<label>Points for a voucher<input name="points_for_voucher" type="number" min="1" value="${s.points_for_voucher}" style="width:100px"></label>
<label>Voucher value (R)<input name="voucher_value_rand" type="number" min="1" value="${s.voucher_value_rand}" style="width:100px"></label>
<label>Valid days<input name="voucher_valid_days" type="number" min="1" value="${s.voucher_valid_days}" style="width:100px"></label>
<button>Save rules</button></form>
<p class="mut">Customers earn points automatically when you mark a booking done. First visit earns the welcome bonus.</p></div>
<h2>Customers</h2>
<div class="card">${accounts.rows.length ? `<table><tr><th>Customer</th><th>Balance</th><th>Lifetime</th><th></th></tr>${aRows}</table>` : `<p class="mut">No points yet. Mark a booking done and the customer starts earning.</p>`}</div>
<h2>Vouchers</h2>
<div class="card">${vouchers.rows.length ? `<table><tr><th>Code</th><th>Customer</th><th>Value</th><th>Status</th><th>Valid</th><th></th></tr>${vRows}</table>` : `<p class="mut">No vouchers issued yet.</p>`}</div>`, user);
}
async function supportPage(db, user, mem) {
  const r = await db.query(`SELECT * FROM receptionist_supportmessage WHERE workspace_id=$1 ORDER BY created_at LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((m) => {
    const src = Array.isArray(m.sources) && m.sources.length ? `<br><span class="mut">Grounded in: ${m.sources.map((x) => esc2(x)).join(" \xB7 ")}</span>` : "";
    const conf = m.role === "assistant" ? `<br><span class="mut">Confidence ${m.confidence}%${m.escalated ? " \xB7 flagged for a human" : ""}</span>` : "";
    return m.role === "owner" ? `<div class="card" style="background:var(--brand-soft)"><b>You:</b> ${esc2(m.text)}</div>` : `<div class="card"><b>Support:</b> ${esc2(m.text)}${src}${conf}</div>`;
  }).join("");
  return layout("Support", `
<div class="card"><h2 style="margin-top:0">Ask about your numbers</h2>
<form method="post" action="/support">
<label>Question<textarea name="question" required placeholder="How many bookings do we have today?"></textarea></label>
<button>Ask</button></form>
<p class="mut">Answers come only from your own data, with confidence and sources shown. Anything it cannot ground gets flagged for a human - it never invents figures.</p></div>
${rows || `<div class="card"><p class="mut">No questions yet.</p></div>`}`, user);
}
async function competitorsPage(db, user, mem, msg = "") {
  await refreshOpportunities(db, mem.workspace_id);
  const rmq = await db.query(`SELECT revenue_mode FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const revMode = rmq.rows[0]?.revenue_mode || "suggest";
  const comps = await db.query(`SELECT * FROM receptionist_competitor WHERE workspace_id=$1 ORDER BY name`, [mem.workspace_id]);
  const menu = await db.query(`SELECT id, name, price FROM menus_item WHERE workspace_id=$1 ORDER BY position LIMIT 100`, [mem.workspace_id]);
  const opps = await db.query(
    `SELECT o.*, c.name AS competitor_name FROM receptionist_marketopportunity o
     LEFT JOIN receptionist_competitor c ON c.id=o.competitor_id
     WHERE o.workspace_id=$1 ORDER BY CASE o.status WHEN 'new' THEN 0 WHEN 'acted' THEN 1 ELSE 2 END, o.confidence DESC, o.updated_at DESC LIMIT 30`,
    [mem.workspace_id]
  );
  const kindLabel = { price_gap: "Price gap", price_advantage: "Price advantage", rating_gap: "Rating gap", promo: "Competitor promotion", demand: "Demand" };
  const compCards = [];
  for (const c of comps.rows) {
    const dishes = await db.query(
      `SELECT d.*, m.name AS own_name, m.price AS own_price FROM receptionist_competitordish d
       LEFT JOIN menus_item m ON m.id=d.own_item_id WHERE d.competitor_id=$1 ORDER BY d.name`,
      [c.id]
    );
    const promos = await db.query(`SELECT * FROM receptionist_competitorpromo WHERE competitor_id=$1 ORDER BY created_at DESC LIMIT 5`, [c.id]);
    const dishRows = dishes.rows.map((d) => `<tr><td>${esc2(d.name)}</td><td>R${Number(d.price).toFixed(2)}</td>
<td>${d.own_name ? `${esc2(d.own_name)} (yours R${Number(d.own_price).toFixed(2)})` : '<span class="mut">not mapped</span>'}</td></tr>`).join("");
    const promoRows = promos.rows.map((p) => `<li>${esc2(p.text)}${p.valid_until ? ` <span class="mut">to ${new Date(p.valid_until).toLocaleDateString("en-ZA")}</span>` : ""}</li>`).join("");
    const menuOpts = ['<option value="">(map to your menu)</option>', ...menu.rows.map((m) => `<option value="${m.id}">${esc2(m.name)} R${Number(m.price).toFixed(2)}</option>`)].join("");
    compCards.push(`<div class="card"><h3 style="margin-top:0">${esc2(c.name)} <span class="mut">${esc2(c.area || "")}${c.rating !== null ? ` \xB7 their Google ${c.rating}` : ""}</span></h3>
${dishes.rows.length ? `<table><tr><th>Their dish</th><th>Price</th><th>Mapped to</th></tr>${dishRows}</table>` : `<p class="mut">No dishes logged yet.</p>`}
<form method="post" action="/competitors/${c.id}/dishes" style="margin-top:10px">
<input name="name" required maxlength="120" placeholder="Their dish" style="width:180px">
<input name="price" type="number" min="0" step="0.01" required placeholder="R" style="width:90px">
<select name="own_item_id">${menuOpts}</select>
<button>Add dish</button></form>
${promos.rows.length ? `<ul>${promoRows}</ul>` : ""}
<form class="inline" method="post" action="/competitors/${c.id}/promos">
<input name="text" required maxlength="200" placeholder="Promotion they are running" style="width:280px">
<input name="valid_until" type="date">
<button>Log promo</button></form></div>`);
  }
  const oppRows = opps.rows.map((o) => {
    const ev = Array.isArray(o.evidence) ? o.evidence : [];
    return `<tr>
<td><b>${esc2(o.title)}</b><br><span class="mut">${kindLabel[o.kind] || esc2(o.kind)}${o.competitor_name ? " \xB7 " + esc2(o.competitor_name) : ""} \xB7 confidence ${o.confidence}%${o.impact_rand !== null ? ` \xB7 about R${Number(o.impact_rand).toLocaleString("en-ZA")}/month` : ""}</span><br>
${esc2(o.detail)}${ev.length ? `<br><span class="mut">${ev.map((e) => esc2(e)).join("<br>")}</span>` : ""}</td>
<td>${o.status === "new" ? "<b>new</b>" : o.status === "acted" ? '<span class="ok">acted on</span>' : '<span class="mut">dismissed</span>'}</td>
<td>${o.status === "new" ? `<form class="inline" method="post" action="/opportunities/${o.id}/draft"><button>Draft a campaign</button></form>
<form class="inline" method="post" action="/opportunities/${o.id}/acted"><button class="link">Acted on</button></form>
<form class="inline" method="post" action="/opportunities/${o.id}/dismissed"><button class="link">Dismiss</button></form>` : o.campaign_id ? `<a href="/campaigns">campaign</a>` : ""}</td></tr>`;
  }).join("");
  return layout("Competitors", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<h2>Opportunities</h2>
<div class="card">${opps.rows.length ? `<table><tr><th>Opportunity</th><th>Status</th><th></th></tr>${oppRows}</table>` : `<p class="mut">No opportunities right now. Log competitors, their dishes and their promos below and the board fills itself.</p>`}</div>
<h2>Competitors</h2>
<div class="card"><form method="post" action="/competitors">
<input name="name" required maxlength="120" placeholder="Competitor name" style="width:180px">
<input name="area" maxlength="120" placeholder="Area" style="width:140px">
<input name="rating" type="number" min="0" max="5" step="0.1" placeholder="Google rating" style="width:110px">
<input name="website" maxlength="200" placeholder="Website" style="width:180px">
<button>Track competitor</button></form>
<p class="mut">Adding the same name again updates it.</p></div>
${compCards.join("")}
<h2>Revenue Employee</h2>
<div class="card"><form method="post" action="/revenue-mode">
<label>Mode <select name="mode">
<option value="suggest" ${revMode === "suggest" ? "selected" : ""}>Suggest only - opportunities appear on this board</option>
<option value="draft" ${revMode === "draft" ? "selected" : ""}>Prepare drafts - strong opportunities also become campaign drafts</option>
</select></label>
<button>Save mode</button></form>
<p class="mut">You approve every send yourself, in every mode. Nothing ever sends itself.</p></div>`, user);
}
async function campaignsPage(db, user, mem, msg = "") {
  const r = await db.query(`SELECT * FROM receptionist_campaign WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 30`, [mem.workspace_id]);
  const rows = [];
  for (const c of r.rows) {
    const st = await campaignStats(db, c.id);
    const segLabel = { all: "every customer", dormant: "dormant 30+ days", vip: "VIPs" };
    const fmt = (v) => v ? `${v.sent}/${v.total} sent${Number(v.failed) ? `, ${v.failed} failed` : ""}${Number(v.skipped) ? `, ${v.skipped} skipped` : ""} \xB7 ${v.bookings} bookings \xB7 R${Number(v.revenue).toLocaleString("en-ZA")}` : "";
    const variantB = c.body_b ? `<br><span class="mut">B: ${fmt(st.b)}</span>` : "";
    rows.push(`<tr>
<td><b>${esc2(c.name)}</b><br><span class="mut">${segLabel[c.segment] || esc2(c.segment)}${c.scheduled_at ? " \xB7 " + new Date(c.scheduled_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : ""}</span></td>
<td>${c.status === "sent" ? '<span class="ok">sent</span>' : c.status === "draft" ? "<b>draft</b>" : c.status === "cancelled" ? '<span class="mut">cancelled</span>' : `<span class="pill warn">${esc2(c.status)}</span>`}</td>
<td>${fmt(st.a)}${variantB}</td>
<td>${c.status === "draft" ? `<form class="inline" method="post" action="/campaigns/${c.id}/approve"><input type="datetime-local" name="when" style="width:auto"><button>Approve & send</button></form>` : ""}
${["draft", "scheduled"].includes(c.status) ? `<form class="inline" method="post" action="/campaigns/${c.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`);
  }
  const nAll = (await segmentContacts(db, mem.workspace_id, "all")).length;
  const nDormant = (await segmentContacts(db, mem.workspace_id, "dormant")).length;
  const nVip = (await segmentContacts(db, mem.workspace_id, "vip")).length;
  return layout("Campaigns", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">New campaign</h2>
<form method="post" action="/campaigns">
<label>Name<input name="name" required maxlength="120" placeholder="November win-back"></label>
<label>Segment<select name="segment">
<option value="all">Every customer (${nAll})</option>
<option value="dormant">Dormant - no visit in 30+ days (${nDormant})</option>
<option value="vip">VIP customers (${nVip})</option>
</select></label>
<label>Message<textarea name="body_a" required placeholder="Hi {first name}, ..."></textarea></label>
<label>B version (optional - half get each)<textarea name="body_b"></textarea></label>
<button>Save draft</button></form>
<p class="mut">Use {first name} for the customer's first name. Sends start after you approve; customers who never messaged you or opted out are skipped automatically. Nothing sends itself.</p></div>
<div class="card">${r.rows.length ? `<table><tr><th>Campaign</th><th>Status</th><th>Delivery</th><th></th></tr>${rows.join("")}</table>` : `<p class="mut">No campaigns yet.</p>`}</div>`, user);
}
async function quotesPage(db, user, mem, msg = "") {
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const r = await db.query(
    `SELECT q.*, c.name AS contact_name FROM receptionist_quote q
     LEFT JOIN receptionist_contact c ON c.id=q.contact_id
     WHERE q.workspace_id=$1 ORDER BY CASE q.status WHEN 'draft' THEN 0 WHEN 'sent' THEN 1 WHEN 'won' THEN 2 ELSE 3 END, q.follow_up_on NULLS LAST, q.created_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const contacts = await db.query(`SELECT id, name, wa_id FROM receptionist_contact WHERE workspace_id=$1 ORDER BY updated_at DESC LIMIT 100`, [mem.workspace_id]);
  const opts = ['<option value="">(no linked customer)</option>', ...contacts.rows.map((c) => `<option value="${c.id}">${esc2(c.name || c.wa_id)}</option>`)].join("");
  const rows = r.rows.map((q) => {
    const chase = q.status === "sent" && q.follow_up_on && new Date(q.follow_up_on) <= /* @__PURE__ */ new Date(today + "T00:00:00");
    return `<tr${chase ? ' style="background:#fff7ed"' : ""}>
<td><b>${esc2(q.customer_name)}</b><br><span class="mut">${esc2(q.title || "Quote")}</span></td>
<td>R${(q.amount_cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
<td>${q.status === "sent" ? '<span class="pill warn">sent</span>' : q.status === "won" ? '<span class="ok">won</span>' : q.status === "lost" ? '<span class="mut">lost</span>' : "<b>draft</b>"}
${chase ? `<br><span class="bad">chase today</span>` : q.follow_up_on ? `<br><span class="mut">chase ${new Date(q.follow_up_on).toLocaleDateString("en-ZA")}</span>` : ""}</td>
<td>${q.status === "draft" ? `<form class="inline" method="post" action="/quotes/${q.id}/sent"><button>Mark sent</button></form>` : ""}
${["draft", "sent"].includes(q.status) ? `<form class="inline" method="post" action="/quotes/${q.id}/won"><button class="link">Won</button></form> <form class="inline" method="post" action="/quotes/${q.id}/lost"><button class="link">Lost</button></form>` : ""}</td></tr>`;
  }).join("");
  const won = r.rows.filter((q) => q.status === "won").reduce((t, q) => t + q.amount_cents, 0) / 100;
  return layout("Quotes", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">New quote</h2>
<form method="post" action="/quotes">
<label>Customer name<input name="customer_name" required maxlength="200"></label>
<label>Link a customer (for WhatsApp send)<select name="contact_id">${opts}</select></label>
<label>What is it for<input name="title" maxlength="200" placeholder="Geyser replacement"></label>
<label>Amount (R)<input name="amount" type="number" min="0" step="0.01" required style="width:140px"></label>
<label>Chase on<input name="follow_up_on" type="date"></label>
<button>Save quote</button></form>
<p class="mut">Mark it sent when it goes out - a linked customer gets it on WhatsApp too. Chase rows highlight when the follow-up day arrives.</p></div>
<p class="mut">Won so far: <b>R${won.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</b></p>
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Amount</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No quotes yet.</p>`}</div>`, user);
}
async function reviewsPage(db, user, mem, base, msg = "") {
  const bp = await db.query(`SELECT * FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
  const b = bp.rows[0] || {};
  const links = await db.query(
    `SELECT l.*, c.name AS contact_name FROM receptionist_reviewlink l
     JOIN receptionist_contact c ON c.id=l.contact_id
     WHERE l.workspace_id=$1 ORDER BY l.created_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const rows = links.rows.map((l) => `<tr>
<td>${esc2(l.contact_name)}</td>
<td><a href="${base}/r/${esc2(l.short_code)}" target="_blank">/r/${esc2(l.short_code)}</a></td>
<td>${l.clicked_at ? `<span class="ok">clicked ${new Date(l.clicked_at).toLocaleString("en-ZA")}</span>` : `<span class="mut">not yet</span>`}</td>
<td class="mut">${new Date(l.created_at).toLocaleDateString("en-ZA")}</td></tr>`).join("");
  const contacts = await db.query(
    `SELECT id, name, wa_id, review_status, issue_note, opted_out FROM receptionist_contact
     WHERE workspace_id=$1 AND wa_id <> '' ORDER BY updated_at DESC LIMIT 50`,
    [mem.workspace_id]
  );
  const events = await db.query(
    `SELECT e.*, c.name AS contact_name FROM receptionist_reviewevent e
     JOIN receptionist_contact c ON c.id=e.contact_id
     WHERE e.workspace_id=$1 ORDER BY e.created_at DESC LIMIT 20`,
    [mem.workspace_id]
  );
  const contactOpts = contacts.rows.filter((c) => !c.opted_out).map((c) => `<option value="${c.id}">${esc2(c.name || c.wa_id)}</option>`).join("");
  const evRows = events.rows.map((e) => `<tr>
<td>${esc2(e.contact_name)}</td><td>${esc2(e.step.replace("_", " "))}</td>
<td>${e.status === "sent" ? `<span class="ok">sent</span>` : e.status === "failed" ? `<span class="bad">failed</span>` : esc2(e.status)}</td>
<td class="mut">${new Date(e.scheduled_for).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
<td class="mut">${e.error ? esc2(e.error) : ""}</td></tr>`).join("");
  const issues = contacts.rows.filter((c) => c.review_status === "issue_flagged");
  const statusLabel2 = { new: "new", check_in_sent: "check-in sent", review_requested: "review asked", clicked: "clicked", unsubscribed: "opted out", issue_flagged: "issue" };
  return layout("Reviews", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
${b.google_review_url ? `<p>Google review destination: <a href="${esc2(b.google_review_url)}">${esc2(b.google_review_url)}</a></p>` : `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">First: where should reviews go?</h2><p class="mut">Paste your Google review link (from Google Business Profile \u2192 "Ask for reviews"). Every tracked link you create sends customers here.</p><form method="post" action="/reviews/destination"><input name="google_review_url" placeholder="https://g.page/r/\u2026" required><button>Save and continue</button></form></div>`}
${b.google_review_url ? `<h2>New review link</h2>
<div class="card"><form method="post" action="/reviews/links">
<label>Customer name<input name="name" required maxlength="200"></label>
<label>Customer WhatsApp / phone<input name="wa_id" required maxlength="32" placeholder="27\u2026"></label>
<button>Create tracked link</button>
<p class="mut">Send the /r/\u2026 link to the customer. It redirects to your Google review page and records the click.</p>
</form></div>` : ""}
<h2>Links</h2>
<div class="card">${links.rows.length ? `<table><tr><th>Customer</th><th>Link</th><th>Click</th><th>Created</th></tr>${rows}</table>` : `<p class="mut">No review links yet.</p>`}</div>

<h2>Review requests on WhatsApp</h2>
<div class="card">
<p>Automatic pipeline per finished visit: a friendly check-in 15 minutes after the job, the review request with a tracked link 2 hours later, and one reminder after 48 hours if the link was never clicked. Customers can reply STOP at any time. A negative reply to the check-in flags the customer here for a personal call first.</p>
<p><b>Status: ${b.review_requests_enabled ? '<span class="ok">ON</span>' : '<span class="bad">OFF</span>'}</b>
<form method="post" action="/reviews/toggle" style="display:inline"><button class="btn-secondary">${b.review_requests_enabled ? "Switch off" : "Switch on"}</button></form></p>
${b.review_requests_enabled && contacts.rows.length ? `<form method="post" action="/reviews/pipeline"><label>Mark a visit done<select name="contact_id">${contactOpts}</select></label><button>Start the pipeline</button></form>` : ""}
</div>

${issues.length ? `<h2>Needs a personal call</h2>
<div class="card">${issues.map((c) => `<p><b>${esc2(c.name || c.wa_id)}</b>: ${esc2(c.issue_note || "negative reply")} <form method="post" action="/reviews/resolve" style="display:inline"><input type="hidden" name="contact_id" value="${c.id}"><button class="link">Resolved</button></form></p>`).join("")}</div>` : ""}

<h2>Pipeline activity</h2>
<div class="card">${events.rows.length ? `<table><tr><th>Customer</th><th>Step</th><th>Status</th><th>When</th><th>Note</th></tr>${evRows}</table>` : `<p class="mut">Nothing yet. Mark a visit done above to start the flow.</p>`}</div>

<h2>Customers</h2>
<div class="card">${contacts.rows.length ? `<table><tr><th>Name</th><th>Phone</th><th>Review status</th></tr>${contacts.rows.map((c) => `<tr><td>${esc2(c.name || "-")}</td><td class="mut">${esc2(c.wa_id)}</td><td>${c.opted_out ? '<span class="bad">opted out</span>' : esc2(statusLabel2[c.review_status] || c.review_status || "new")}</td></tr>`).join("")}</table>` : `<p class="mut">No customers yet.</p>`}</div>`, user);
}
function newPostPage(user, mem, pre, msg = "") {
  return layout("New post", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><form method="post" action="/posts/draft">
<label>Topic<input name="topic" maxlength="200" value="${esc2(pre.topic || "")}" placeholder="e.g. teeth whitening special this month" required></label>
<button class="btn-secondary">Draft with AI</button>
</form></div>
${pre.media ? `<div class="card"><h2 style="margin-top:0">Attached image</h2><img src="/media/${esc2(pre.media)}/raw" style="max-width:280px;border-radius:8px"></div>` : ""}
<div class="card"><form method="post" action="/posts/new">
${pre.media ? `<input type="hidden" name="media_id" value="${esc2(pre.media)}">` : ""}
<label>Title<input name="title" maxlength="200" value="${esc2(pre.title || "")}" placeholder="Internal title"></label>
<label>Caption<textarea name="caption" rows="6" placeholder="What should go out?">${esc2(pre.caption || "")}</textarea></label>
<button>Save draft</button>
<p class="mut">Creates a draft for every connected channel. Scheduling and publishing run on the current pipeline.</p>
</form></div>`, user);
}
async function intakeBoards(db, mem) {
  const bp = await db.query(`SELECT industry FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
  const industry = bp.rows[0]?.industry || "";
  const board = async (table, title, cols) => {
    const r = await db.query(
      `SELECT t.*, c.name AS contact_name, c.wa_id FROM ${table} t JOIN receptionist_contact c ON c.id=t.contact_id
       WHERE t.workspace_id=$1 ORDER BY t.created_at DESC LIMIT 20`,
      [mem.workspace_id]
    );
    if (!r.rows.length) return "";
    const rows = r.rows.map((t) => `<tr><td><b>${esc2(t.contact_name || t.wa_id)}</b></td><td>${cols(t)}</td>
<td>${t.status === "resolved" ? '<span class="ok">resolved</span>' : esc2(t.status)}</td>
<td>${t.status !== "resolved" ? `<form class="inline" method="post" action="/inbox/intake/${table}/${t.id}/resolve"><button class="link">Resolve</button></form>` : ""}</td></tr>`).join("");
    return `<h2>${title}</h2><div class="card"><table><tr><th>Customer</th><th>Details</th><th>Status</th><th></th></tr>${rows}</table></div>`;
  };
  let h = "";
  if (industry === "funeral") h += await board("receptionist_funeralclaim", "Funeral claims", (t) => esc2([t.deceased_name, t.claimant_name && `claimant: ${t.claimant_name}`, t.policy_number && `policy: ${t.policy_number}`].filter(Boolean).join(" \xB7 ")));
  if (industry === "dental") h += await board("receptionist_dentalappointment", "Appointment requests", (t) => esc2([t.patient_name, t.reason].filter(Boolean).join(" \xB7 ")));
  if (industry === "trades") h += await board("receptionist_tradedispatch", "Job dispatch", (t) => esc2([t.job_type, t.address].filter(Boolean).join(" \xB7 ")));
  return h;
}
async function inboxPage(db, user, mem) {
  const r = await db.query(
    `SELECT c.id, c.name, c.wa_id, count(m.id) AS msgs, max(m.created_at) AS last_at,
            (SELECT body FROM receptionist_message m2 WHERE m2.contact_id=c.id ORDER BY m2.created_at DESC LIMIT 1) AS last_body
     FROM receptionist_contact c JOIN receptionist_message m ON m.contact_id=c.id
     WHERE c.workspace_id=$1 GROUP BY c.id ORDER BY last_at DESC NULLS LAST LIMIT 50`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((c) => `<tr>
<td><a href="/inbox/${c.id}">${esc2(c.name || c.wa_id)}</a></td>
<td class="mut">${esc2((c.last_body || "").slice(0, 80))}</td>
<td class="mut">${c.last_at ? new Date(c.last_at).toLocaleString("en-ZA") : ""}</td></tr>`).join("");
  return layout("Inbox", `
<div class="card">${r.rows.length ? `<table><tr><th>Customer</th><th>Latest</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No customer conversations yet. When customers WhatsApp the business, they appear here.</p>`}</div>
${await intakeBoards(db, mem)}`, user);
}
async function conversationPage(db, user, mem, contactId, env) {
  const dc = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15e3 });
  await dc.connect();
  let c, msgs;
  try {
    c = await dc.query(`SELECT * FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [contactId, mem.workspace_id]);
    if (!c.rows[0]) {
      await dc.end().catch(() => {
      });
      return html(layout("Not found", `<p class="bad">Unknown conversation.</p>`), 404);
    }
    msgs = await dc.query(
      `SELECT direction, sender_type, body, created_at FROM receptionist_message WHERE contact_id=$1 AND workspace_id=$2 ORDER BY created_at ASC LIMIT 200`,
      [contactId, mem.workspace_id]
    );
  } finally {
    await dc.end().catch(() => {
    });
  }
  const who = { user: "Customer", ai: "Receptionist", human_agent: "You" };
  const bubbles = msgs.rows.map((m) => {
    const out = m.direction === "outbound";
    return `<div style="display:flex;justify-content:${out ? "flex-end" : "flex-start"};margin:6px 0">
<div style="max-width:70%;padding:8px 12px;border-radius:12px;${out ? "background:var(--brand);color:#fff" : "background:#fff;border:1px solid var(--line)"}">
<div class="mut" style="font-size:11px;${out ? "color:#ffe7d6" : ""}">${esc2(who[m.sender_type] || m.sender_type)} \xB7 ${new Date(m.created_at).toLocaleString("en-ZA")}</div>
<div>${esc2(m.body)}</div></div></div>`;
  }).join("");
  return html(layout(`Chat: ${esc2(c.rows[0].name || c.rows[0].wa_id)}`, `
<p><a href="/inbox">&larr; all conversations</a></p>
<div class="card"><h2 style="margin-top:0">Customer card</h2>
<form method="post" action="/inbox/${c.rows[0].id}/card">
<label>Name<input name="name" maxlength="120" value="${esc2(c.rows[0].name || "")}"></label>
<label>Birthday<input name="birthday" type="date" value="${c.rows[0].birthday ? new Date(c.rows[0].birthday).toISOString().slice(0, 10) : ""}"></label>
<label>Dietary / preferences<input name="dietary_notes" maxlength="200" value="${esc2(c.rows[0].dietary_notes || "")}"></label>
<label>Lifetime spend (R)<input name="total_spend" inputmode="decimal" value="${esc2(String(c.rows[0].total_spend ?? "0"))}" style="width:140px"></label>
<label><input type="checkbox" name="is_vip" ${c.rows[0].is_vip ? "checked" : ""} style="width:auto"> VIP</label>
<label>Private notes<textarea name="notes">${esc2(c.rows[0].notes || "")}</textarea></label>
<button>Save card</button></form>
<p class="mut">${c.rows[0].visit_count || 0} visits${c.rows[0].opted_out ? " \xB7 opted out of automated messages" : ""}</p></div>
<div class="card">${bubbles || `<p class="mut">No messages.</p>`}</div>`, user));
}
async function radarPage(db, user, mem, msg) {
  const w = await db.query(`SELECT industry FROM workspaces_workspace WHERE id=$1`, [mem.workspace_id]);
  const ind = w.rows[0]?.industry || "general";
  const p = getPreset(ind);
  const feed = await db.query(
    `SELECT title, link, source, summary, score, published_at FROM radar_radarfeeditem WHERE workspace_id=$1 ORDER BY published_at DESC NULLS LAST, fetched_at DESC LIMIT 20`,
    [mem.workspace_id]
  );
  const items = feed.rows.map((r) => `<tr>
<td><a href="${esc2(r.link)}" target="_blank" rel="noopener">${esc2(r.title)}</a><br><span class="mut">${esc2((r.summary || "").slice(0, 120))}</span></td>
<td class="mut">${esc2(r.source || "")}</td>
<td class="mut">${r.published_at ? new Date(r.published_at).toLocaleDateString("en-ZA") : ""}</td></tr>`).join("");
  return layout("Radar", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2>Your industry</h2>
<form method="post"><label>Industry<select name="industry">${INDUSTRIES.map(([v, l]) => `<option value="${v}"${ind === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
<button>Save</button></form>
<p class="mut">Tunes your demand radar, reply tone and post ideas.</p></div>
<div class="card"><h2>Post ideas for ${esc2(industryLabel(ind))}</h2>
<ul>${(p.post_themes || []).map((t) => `<li>${esc2(t)}</li>`).join("")}</ul>
${(p.hashtags || []).length ? `<p class="mut">Default hashtags: ${esc2(p.hashtags.join(" "))}</p>` : ""}
<p class="mut">Reply tone: ${esc2(p.responder_tone || "warm and professional")}</p></div>
<div class="card"><h2>Demand signals</h2>
${feed.rows.length ? `<table><tr><th>Signal</th><th>Source</th><th>When</th></tr>${items}</table>` : `<p class="mut">No signals yet for this business. The radar collects South African news and demand signals for your industry; they appear here as they arrive.</p>`}</div>`, user);
}
async function analyticsPage(db, user, mem) {
  const [byStatus, links, clicks, contacts, msgsIn, msgsOut, clicksByDay] = await Promise.all([
    db.query(`SELECT pp.status, count(*) c FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id WHERE p.workspace_id=$1 GROUP BY pp.status ORDER BY c DESC`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_contact WHERE workspace_id=$1`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='inbound'`, [mem.workspace_id]),
    db.query(`SELECT count(*) c FROM receptionist_message WHERE workspace_id=$1 AND direction='outbound'`, [mem.workspace_id]),
    db.query(`SELECT date_trunc('day', clicked_at) d, count(*) c FROM receptionist_reviewlink WHERE workspace_id=$1 AND clicked_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 14`, [mem.workspace_id])
  ]);
  const statusRows = byStatus.rows.map((r) => `<tr><td>${esc2(r.status)}</td><td>${r.c}</td></tr>`).join("");
  const clickRows = clicksByDay.rows.map((r) => `<tr><td>${new Date(r.d).toLocaleDateString("en-ZA")}</td><td>${r.c}</td></tr>`).join("");
  return layout("Analytics", `
<div class="grid">
<div class="card"><h2>Review links</h2><p class="stat">${links.rows[0].c}</p><p class="mut">${clicks.rows[0].c} clicked</p></div>
<div class="card"><h2>Customers</h2><p class="stat">${contacts.rows[0].c}</p><p class="mut">in inbox</p></div>
<div class="card"><h2>WhatsApp messages</h2><p class="stat">${msgsIn.rows[0].c} in \xB7 ${msgsOut.rows[0].c} out</p></div>
</div>
<div class="card"><h2>Posts by status</h2>${byStatus.rows.length ? `<table><tr><th>Status</th><th>Count</th></tr>${statusRows}</table>` : `<p class="mut">No posts yet.</p>`}</div>
<div class="card"><h2>Review-link clicks by day</h2>${clicksByDay.rows.length ? `<table><tr><th>Day</th><th>Clicks</th></tr>${clickRows}</table>` : `<p class="mut">No clicks yet.</p>`}</div>`, user);
}
async function postsPage(db, user, mem) {
  const r = await db.query(
    `SELECT p.id, p.title, p.caption, p.scheduled_at, p.published_at, p.created_at,
            string_agg(DISTINCT pp.status, ', ') AS statuses,
            string_agg(DISTINCT COALESCE(sa.platform, pp.provider), ', ') AS channels
     FROM composer_post p
     LEFT JOIN composer_platform_post pp ON pp.post_id=p.id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT 100`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((x) => {
    const sts = (x.statuses || "").split(", ").filter(Boolean);
    const allDraft = sts.length > 0 && sts.every((st) => st === "draft");
    return `<tr>
<td><b>${esc2(x.title || "(untitled)")}</b><br><span class="mut">${esc2((x.caption || "").slice(0, 120))}</span></td>
<td>${sts.map((st) => `<span class="pill ${st === "approved" || st === "published" ? "ok" : ""}">${esc2(st)}</span> `).join("")}</td>
<td class="mut">${esc2(x.channels || "-")}</td>
<td class="mut">${x.scheduled_at ? new Date(x.scheduled_at).toLocaleString("en-ZA") : new Date(x.created_at).toLocaleDateString("en-ZA")}</td>
<td>${allDraft ? `<form class="inline" method="post" action="/posts/${x.id}/submit"><button>Submit for review</button></form>` : ""}</td></tr>`;
  }).join("");
  return layout("Posts", `
<p><a class="btn btn-primary" href="/posts/new">New post</a></p>
<div class="card">${r.rows.length ? `<table><tr><th>Post</th><th>Status</th><th>Channels</th><th>When</th><th></th></tr>${rows}</table>` : `<p class="mut">No posts yet.</p>`}</div>`, user);
}
var STATUS_LABELS = { approved: "approved", rejected: "rejected", changes_requested: "changes requested" };
async function approvalsPage(db, user, mem, msg = "") {
  const r = await db.query(
    `SELECT pp.id AS pp_id, pp.status, pp.provider, sa.platform, sa.account_name,
            p.id AS post_id, p.title, p.caption, p.scheduled_at, u.name AS author
     FROM composer_platform_post pp
     JOIN composer_post p ON p.id=pp.post_id
     LEFT JOIN accounts_user u ON u.id=p.author_id
     LEFT JOIN social_accounts_social_account sa ON sa.id=pp.social_account_id
     WHERE p.workspace_id=$1 AND pp.status='pending_review'
     ORDER BY p.created_at LIMIT 100`,
    [mem.workspace_id]
  );
  const rows = r.rows.map((x) => `<tr>
<td><b>${esc2(x.title || "(untitled)")}</b><br><span class="mut">${esc2((x.caption || "").slice(0, 140))}</span></td>
<td>${esc2(x.platform || x.provider || "")}<br><span class="mut">${esc2(x.account_name || "")}</span></td>
<td class="mut">${esc2(x.author || "")}</td>
<td>${x.scheduled_at ? new Date(x.scheduled_at).toLocaleString("en-ZA") : '<span class="mut">unscheduled</span>'}</td>
<td><form class="inline" method="post" action="/approvals/${x.pp_id}/approve"><button>Approve</button></form>
<form class="inline" method="post" action="/approvals/${x.pp_id}/reject" onsubmit="return confirm('Reject this post?')"><button style="background:#f87171">Reject</button></form></td></tr>`).join("");
  return layout("Approvals", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card">${r.rows.length ? `<table><tr><th>Post</th><th>Channel</th><th>Author</th><th>Scheduled</th><th></th></tr>${rows}</table>` : `<p class="ok">Nothing waiting for review.</p>`}</div>`, user);
}
async function billingPage(db, user, mem, base, env) {
  const plans = [
    { slug: "starter", name: "Starter", price: 499, feat: "1 workspace \xB7 core publishing" },
    { slug: "growth", name: "Growth", price: 999, feat: "3 workspaces \xB7 approvals \xB7 reviews" },
    { slug: "business-pro", name: "Business Pro", price: 1999, feat: "everything in Growth \xB7 lead pipeline + follow-ups \xB7 3 channels" }
  ];
  const cards = plans.map((p) => `<div class="card"><h2>${p.name}</h2>
<p style="font-size:26px;margin:0">R${p.price.toLocaleString("en-ZA")}<span class="mut">/month</span></p>
<p class="mut">${p.feat}</p>
${p.slug === mem.plan ? mem.subscription_status === "active" ? `<p class="pill">current plan</p>` : `<a class="btn btn-primary" href="${pfUrl(env, base, p.slug, mem)}">Activate with PayFast</a>` : `<a class="btn btn-primary" href="${pfUrl(env, base, p.slug, mem)}">Subscribe with PayFast</a>`}
</div>`).join("");
  return layout("Billing", `
<p>Plan <b>${esc2(mem.plan)}</b> \xB7 status <span class="pill ${mem.subscription_status === "active" ? "ok" : "warn"}">${esc2(statusLabel(mem.subscription_status))}</span>
${mem.payment_reference ? ` \xB7 ref <span class="mut">${esc2(mem.payment_reference)}</span>` : ""}</p>
${mem.activated_at ? `<p class="mut">Active since ${new Date(mem.activated_at).toLocaleDateString("en-ZA")}</p>` : ""}
<div class="grid">${cards}</div>
<p class="mut">Payments are processed by PayFast in rand. You can cancel any time.</p>`, user);
}
function withSecurity(res, path) {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!path.startsWith("/f/")) h.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
var index_default = {
  async fetch(req, env) {
    const res = await handle(req, env);
    return withSecurity(res, new URL(req.url).pathname);
  },
  async scheduled(_event, env, ctx) {
    const db = pool(env);
    try {
      ctx.waitUntil((async () => {
        await runDueReviewEvents(db, env, "https://revup.nahalabs.co.za");
        await runDueServiceReminders(db, env);
        await expireVouchers(db);
        await runDueCampaigns(db, env);
        await autoDraftOpportunities(db);
        await db.end().catch(() => {
        });
      })());
    } catch {
      await db.end().catch(() => {
      });
    }
  }
};
async function handle(req, env) {
  const url = new URL(req.url);
  const base = url.origin;
  const path = url.pathname;
  if (path.startsWith("/t/")) {
    const slug = path.slice(3).replace(/[^a-z0-9]/gi, "").slice(0, 24);
    const db2 = pool(env);
    try {
      const r = await db2.query(`UPDATE cf_prospect_link SET click_count=click_count+1, first_clicked_at=COALESCE(first_clicked_at,now()), last_clicked_at=now() WHERE lower(slug)=lower($1) RETURNING target_url`, [slug]);
      await db2.end().catch(() => {
      });
      const dest = r.rows[0]?.target_url || "https://revup.nahalabs.co.za/?ref=" + slug;
      return new Response(null, { status: 302, headers: { location: dest } });
    } catch {
      await db2.end().catch(() => {
      });
      return redirect2("/");
    }
  }
  if ((path === "/webhooks/zernio" || path === "/webhooks/zernio/") && req.method === "POST") {
    const raw = await req.text();
    const sig = req.headers.get("x-zernio-signature") || req.headers.get("x-late-signature") || "";
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false }, 400);
    }
    if (!await verifyZernioSignature(env.ZERNIO_WEBHOOK_SECRET || "", raw, sig.toLowerCase())) {
      const tdb = pool(env);
      let tenantSecret = "";
      try {
        tenantSecret = await tenantWebhookSecret(tdb, payload);
      } finally {
        await tdb.end().catch(() => {
        });
      }
      if (!tenantSecret || !await verifyZernioSignature(tenantSecret, raw, sig.toLowerCase()))
        return json({ ok: false }, 403);
    }
    const eventId = String(payload.id || req.headers.get("x-zernio-event-id") || "");
    const db2 = pool(env);
    try {
      if (eventId) {
        const ins = await db2.query(`INSERT INTO cf_webhook_event(id,event,received_at) VALUES($1,$2,now()) ON CONFLICT (id) DO NOTHING RETURNING id`, [eventId, String(payload.event || "")]);
        if (!ins.rows[0]) {
          await db2.end().catch(() => {
          });
          return json({ ok: true, deduped: true });
        }
      }
      await handleZernioWebhook(db2, env, payload);
      await db2.end().catch(() => {
      });
      return json({ ok: true });
    } catch (e) {
      await db2.end().catch(() => {
      });
      return json({ ok: false, error: String(e).slice(0, 200) }, 500);
    }
  }
  const chatAppRes = await handleChatAppRoute(req, env, url, pool);
  if (chatAppRes) return chatAppRes;
  if (path === "/health") {
    try {
      const db2 = pool(env);
      const r = await db2.query("SELECT 1 AS ok");
      await db2.end().catch(() => {
      });
      return json({ ok: true, db: r.rows[0].ok === 1, ts: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }
  const rm = /^\/r\/([A-Za-z0-9_-]{6,12})$/.exec(path);
  if (rm) {
    const db2 = pool(env);
    try {
      const r = await db2.query(
        `UPDATE receptionist_reviewlink SET clicked_at=COALESCE(clicked_at, now()) WHERE short_code=$1 RETURNING original_url, contact_id, clicked_at`,
        [rm[1]]
      );
      if (!r.rows[0]) return html(layout("Link not found", `<p class="bad">This review link doesn't exist.</p>`), 404);
      await cancelPending(db2, r.rows[0].contact_id, "reminder");
      await db2.query(`UPDATE receptionist_contact SET review_status='clicked', updated_at=now() WHERE id=$1 AND review_status NOT IN ('unsubscribed','issue_flagged') AND NOT opted_out`, [r.rows[0].contact_id]);
      return new Response(null, { status: 302, headers: { location: r.rows[0].original_url } });
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path.startsWith("/vault/c/") && req.method === "GET") {
    const token = path.split("/").pop() || "";
    if (!/^[A-Za-z0-9-]{20,80}$/.test(token)) return new Response("not found", { status: 404 });
    const { collectPage: collectPage2 } = await Promise.resolve().then(() => (init_assistant(), assistant_exports));
    return new Response(collectPage2(token), { headers: { "content-type": "text/html" } });
  }
  if (path === "/vault/save" && req.method === "POST") {
    const f = await formData(req);
    const token = String(f.token || ""), name = String(f.name || "").slice(0, 120), secret = String(f.secret || "");
    if (!token || !name || !secret) return new Response("missing fields", { status: 400 });
    const db2 = pool(env);
    try {
      const { consumeVaultLink: consumeVaultLink2, storeSecret: storeSecret2 } = await Promise.resolve().then(() => (init_assistant(), assistant_exports));
      const ws = await consumeVaultLink2(db2, token);
      if (!ws) return new Response("link used or unknown", { status: 403 });
      await storeSecret2(db2, env, ws, name, secret);
      return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;max-width:26rem;margin:3rem auto">Saved. It is write-only from here: nobody can read it back, not even you. Close this tab.</body>', { headers: { "content-type": "text/html" } });
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/billing/payfast-itn" && req.method === "POST") {
    const db2 = pool(env);
    try {
      return await handlePayfastItn(db2, env, req);
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/signup") {
    if (req.method === "GET") return html(signupPage());
    {
      const rl = pool(env);
      try {
        if (await rateLimited(rl, "signup", req, 10)) {
          await rl.end().catch(() => {
          });
          return html(signupPage("Too many signups from this network today - please try again tomorrow."), 429);
        }
        await rl.end().catch(() => {
        });
      } catch {
        await rl.end().catch(() => {
        });
      }
    }
    const f = await formData(req);
    const db2 = pool(env);
    try {
      if (!f.email || !f.password || !f.name || !f.business) return html(signupPage("All fields are required."), 400);
      if ((f.password || "").length < 8) return html(signupPage("Password must be at least 8 characters."), 400);
      const email = f.email.trim().toLowerCase();
      const dupe = await db2.query(`SELECT 1 FROM accounts_user WHERE lower(email)=$1`, [email]);
      if (dupe.rows[0]) return html(signupPage("An account with this email already exists. Log in instead."), 400);
      const h = await db2.query(MAKE_HASH_SQL, [f.password]);
      const userId = crypto.randomUUID(), orgId = crypto.randomUUID(), wsId = crypto.randomUUID();
      const ref = "RU-" + orgId.replace(/-/g, "").slice(0, 8).toUpperCase();
      const client = await db2.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `INSERT INTO accounts_user(id,password,email,name,is_superuser,is_active,is_staff,totp_enabled,totp_recovery_codes,created_at,updated_at,avatar,tos_accepted_at)
             VALUES($1,$2,$3,$4,false,true,false,false,'[]'::jsonb,now(),now(),'',now())`,
          [userId, h.rows[0].hash, email, f.name.trim()]
        );
        await client.query(
          `INSERT INTO organizations_organization(id,name,logo_url,default_timezone,plan,subscription_status,payment_reference,payfast_token,access_suspension_reason,trial_started_at,billing_email,created_at,updated_at)
             VALUES($1,$2,'','Africa/Johannesburg','starter','pending_activation',$3,'','',NULL,$4,now(),now())`,
          [orgId, f.business.trim(), ref, email]
        );
        await client.query(
          `INSERT INTO workspaces_workspace(id,name,description,organization_id,timezone,primary_color,secondary_color,default_hashtags,default_first_comment,approval_workflow_mode,is_archived,icon,industry,publish_test_mode,website_url,facebook_url,web_presence_gate_exempt,created_at,updated_at)
             VALUES($1,$2,'',$3,'Africa/Johannesburg','#0ea5e9','#0b1120','[]'::jsonb,'','required',false,'','',false,'','',false,now(),now())`,
          [wsId, f.business.trim(), orgId]
        );
        await client.query(
          `INSERT INTO members_org_membership(id,org_role,organization_id,user_id,accepted_at,invited_at) VALUES($1,'owner',$2,$3,now(),now())`,
          [crypto.randomUUID(), orgId, userId]
        );
        await client.query(
          `INSERT INTO members_workspace_membership(id,workspace_role,user_id,workspace_id,added_at) VALUES($1,'owner',$2,$3,now())`,
          [crypto.randomUUID(), userId, wsId]
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      const token = await newSession(db2, userId, req);
      return new Response(null, { status: 303, headers: { location: "/onboarding", "set-cookie": sessionCookie(token) } });
    } catch (e) {
      return html(signupPage("Signup failed: " + String(e).slice(0, 200)), 500);
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/login") {
    if (req.method === "GET") return html(loginPage());
    const f = await formData(req);
    const db2 = pool(env);
    try {
      if (await rateLimitExceeded(db2, "login", req, 20)) return html(loginPage("Too many failed attempts from this network today - please try again tomorrow."), 429);
      const r = await db2.query(`SELECT id,password FROM accounts_user WHERE lower(email)=lower($1) AND is_active`, [(f.email || "").trim()]);
      const row = r.rows[0];
      let ok = false;
      if (row && typeof row.password === "string" && row.password.startsWith("bcrypt_sha256$")) {
        const v = await db2.query(VERIFY_SQL, [f.password || "", row.password.slice("bcrypt_sha256$".length)]);
        ok = v.rows[0]?.ok === true;
      }
      if (!ok) {
        await rateLimited(db2, "login", req, 20);
        return html(loginPage("Wrong email or password."), 401);
      }
      const token = await newSession(db2, row.id, req);
      return new Response(null, { status: 303, headers: { location: "/", "set-cookie": sessionCookie(token) } });
    } finally {
      await db2.end().catch(() => {
      });
    }
  }
  if (path === "/logout" && req.method === "POST") {
    const m = /(?:^|;\s*)cf_session=([a-f0-9]{64})/.exec(req.headers.get("cookie") || "");
    const db2 = pool(env);
    if (m) await db2.query(`DELETE FROM cf_sessions WHERE token_hash=$1`, [await sha256hex(m[1])]);
    await db2.end().catch(() => {
    });
    return new Response(null, { status: 303, headers: { location: "/login", "set-cookie": "cf_session=; Path=/; Max-Age=0" } });
  }
  const fm = /^\/f\/([0-9a-f-]{36})$/.exec(path);
  if (fm) {
    const pdb = pool(env);
    try {
      const w = await pdb.query(
        `SELECT w.id, w.name, o.plan FROM workspaces_workspace w JOIN organizations_organization o ON o.id=w.organization_id WHERE w.id=$1 AND w.is_archived=false AND o.deleted_at IS NULL`,
        [fm[1]]
      );
      const biz = w.rows[0];
      if (!biz || biz.plan !== "business-pro") return html(layout("Enquiries closed", `<div class="card"><p>This business is not taking online enquiries right now.</p></div>`), 404);
      if (req.method === "POST") {
        const f = await formData(req);
        const name = (f.name || "").trim().slice(0, 200), contact = (f.contact || "").trim().slice(0, 200), message = (f.message || "").trim().slice(0, 2e3);
        if (!name || !contact || !message) return html(enquiryForm(biz.name, "Please fill in your name, contact and message."));
        const ip = req.headers.get("cf-connecting-ip") || "";
        const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const key = (await sha256hex(fm[1] + ip + day)).slice(0, 40);
        const leadId = crypto.randomUUID();
        const ins = await pdb.query(
          `INSERT INTO frontdesk_lead(id,workspace_id,name,contact,message,stage,value_cents,request_key,created_at,updated_at)
             VALUES($1,$2,$3,$4,$5,'new',0,$6,now(),now()) ON CONFLICT (workspace_id,request_key) DO NOTHING RETURNING id`,
          [leadId, fm[1], name, contact, message, key]
        );
        if (ins.rows[0]) {
          const cid = crypto.randomUUID();
          await pdb.query(
            `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
               VALUES($1,$2,$3,$4,'[]'::jsonb,true,false,'','','new','',false,'web enquiry',0,0,now(),now())`,
            [cid, fm[1], ("web:" + contact).slice(0, 32), name.slice(0, 120)]
          );
          await pdb.query(
            `INSERT INTO receptionist_message(id,direction,sender_type,body,zernio_message_id,is_draft,created_at,contact_id,workspace_id,media_urls)
               VALUES($1,'inbound','user',$2,$3,false,now(),$4,$5,'[]'::jsonb)`,
            [crypto.randomUUID(), message, "fd-" + leadId, cid, fm[1]]
          );
        }
        return html(layout("Thank you", `<div class="card"><h2>Thank you, ${esc2(name)}</h2><p>${esc2(biz.name)} has your enquiry and will get back to you shortly.</p></div>`));
      }
      return html(enquiryForm(biz.name));
    } finally {
      await pdb.end().catch(() => {
      });
    }
  }
  const pm = /^\/p\/([a-z0-9-]{4,64})(\/go)?$/.exec(path);
  if (pm) {
    const pgdb = pool(env);
    try {
      return await servePublic(pgdb, pm[1], !!pm[2], req);
    } finally {
      await pgdb.end().catch(() => {
      });
    }
  }
  if (path === "/wifi-card/sample") {
    return html(layout("Sample WiFi Card", wifiCardPage({ businessName: "Sample Dental Studio", enquiryUrl: `${base}/f/c72ce206-854d-48bc-bd56-726f53f23293`, prefill: { ssid: "SampleDental-Guest", pass: "Smile2026Guest" }, sample: true })));
  }
  const db = pool(env);
  try {
    if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    if (path === "/static/qrcode.js") return new Response(QRCODE_LIB, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=86400" } });
    const user = await getUser(req, db);
    if (!user && path === "/") return html(landingPage());
    if (!user) return redirect2("/login");
    const mem = await membership(db, user.id, req);
    if (!mem) return html(layout("No workspace", `<p>Your account has no workspace yet. <a href="/signup">Create one</a>.</p>`, user), 403);
    user._cur_ws = mem.workspace_name;
    user._ws_count = (mem.workspaces || []).length;
    user._goals = Array.isArray(mem.goals) ? mem.goals : [];
    if (path === "/pages") {
      await ensurePageTables(db);
      const msg = url.searchParams.get("msg") || "";
      return html(layout("Landing pages", await pagesListBody(db, mem, base, msg), user));
    }
    if (path === "/pages/new") {
      await ensurePageTables(db);
      if (req.method === "GET") return html(layout("New landing page", newPageBody(), user));
      const f = await formData(req);
      if (!(f.angle || "").trim()) return html(layout("New landing page", newPageBody("Tell us the one customer pain this page answers."), user), 400);
      if (await rateLimited(db, "pages", req, 40)) return html(layout("New landing page", newPageBody("Too many pages built today - please try again tomorrow."), user), 429);
      let skeleton = [{ type: "hero", words: 90 }, { type: "pains", words: 120 }, { type: "benefits", words: 160 }, { type: "how", words: 120 }, { type: "proof", words: 100 }, { type: "faq", words: 120 }, { type: "cta", words: 60 }];
      let sourceUrl = "";
      const mirrorUrl = (f.mirror_url || "").trim();
      if (mirrorUrl) {
        try {
          const src = await fetchForMirror(mirrorUrl);
          skeleton = mirrorStructure(src);
          sourceUrl = mirrorUrl.slice(0, 500);
        } catch (e) {
          return html(layout("New landing page", newPageBody("Could not read that page: " + String(e?.message || e).slice(0, 150)), user), 400);
        }
      }
      const brief = {
        business: (f.business || mem.workspace_name || "").trim().slice(0, 200),
        industry: (f.industry || "general").trim().slice(0, 40),
        angle: (f.angle || "").trim().slice(0, 200),
        offer: (f.offer || "").trim().slice(0, 300),
        area: (f.area || "").trim().slice(0, 120),
        whatsapp: (f.whatsapp || "").trim().slice(0, 20),
        cta_label: (f.cta_label || "WhatsApp us").trim().slice(0, 40)
      };
      let gen;
      try {
        gen = await generateSections(env, brief, skeleton);
      } catch {
        return html(layout("New landing page", newPageBody("The copywriter is busy right now - please try again in a minute."), user), 502);
      }
      const pageId = crypto.randomUUID();
      const slug = makeSlug(brief.business || "page");
      const title = (gen.seo_title || `${brief.business} - ${brief.angle}`).slice(0, 200);
      const brand = { business: brief.business, whatsapp: brief.whatsapp, cta_label: brief.cta_label, color: (f.color || "#F97316").slice(0, 7), area: brief.area, offer: brief.offer, link: "" };
      await db.query(
        `INSERT INTO cf_page(id,workspace_id,title,slug,angle,industry,status,brand,sections,source_url) VALUES($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9)`,
        [pageId, mem.workspace_id, title, slug, brief.angle, brief.industry, JSON.stringify(brand), JSON.stringify(gen.sections), sourceUrl]
      );
      return redirect2("/pages/" + pageId);
    }
    const pam = /^\/pages\/([0-9a-f-]{36})(?:\/(publish|unpublish|delete))?$/.exec(path);
    if (pam) {
      await ensurePageTables(db);
      const pr = await db.query(`SELECT * FROM cf_page WHERE id=$1 AND workspace_id=$2`, [pam[1], mem.workspace_id]);
      const page = pr.rows[0];
      if (!page) return html(layout("Page not found", `<p class="bad">That page does not exist.</p>`, user), 404);
      const action = pam[2] || "";
      if (req.method === "POST" && action === "publish") {
        await db.query(`UPDATE cf_page SET status='published', published_at=COALESCE(published_at,now()), updated_at=now() WHERE id=$1`, [page.id]);
        return redirect2("/pages/" + page.id);
      }
      if (req.method === "POST" && action === "unpublish") {
        await db.query(`UPDATE cf_page SET status='draft', updated_at=now() WHERE id=$1`, [page.id]);
        return redirect2("/pages/" + page.id);
      }
      if (req.method === "POST" && action === "delete") {
        await db.query(`UPDATE cf_page SET status='archived', updated_at=now() WHERE id=$1`, [page.id]);
        return redirect2("/pages?msg=Page deleted");
      }
      if (req.method === "POST") {
        const f = await formData(req);
        const sections = (page.sections || []).map((s, i) => ({
          type: s.type,
          heading: (f["h_" + i] ?? s.heading).slice(0, 140),
          body: (f["b_" + i] ?? s.body).slice(0, 800),
          items: String(f["i_" + i] ?? (s.items || []).join("\n")).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 140))
        }));
        const brand = Object.assign({}, page.brand || {}, {
          cta_label: (f.cta_label || "WhatsApp us").slice(0, 40),
          whatsapp: (f.whatsapp || "").slice(0, 20),
          link: (f.link || "").slice(0, 500),
          color: (f.color || "#F97316").slice(0, 7)
        });
        await db.query(`UPDATE cf_page SET sections=$1, brand=$2, updated_at=now() WHERE id=$3`, [JSON.stringify(sections), JSON.stringify(brand), page.id]);
        return redirect2("/pages/" + page.id);
      }
      return html(layout(page.title, await pageDetailBody(db, page, base, url.searchParams.get("msg") || ""), user));
    }
    if (path === "/switch") {
      if (req.method === "POST") {
        const f = await formData(req);
        const ok = (mem.workspaces || []).some((w) => w.id === f.workspace_id);
        if (!ok) return redirect2("/switch");
        return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `cf_ws=${f.workspace_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 86400}` } });
      }
      const rows = (mem.workspaces || []).map((w) => `<tr>
<td><b>${esc2(w.name)}</b><br><span class="mut">${esc2(w.org)}</span></td>
<td>${esc2(w.plan)} \xB7 ${esc2(statusLabel(w.status))}</td>
<td>${w.id === mem.workspace_id ? `<span class="ok">Current</span>` : `<form method="post"><input type="hidden" name="workspace_id" value="${w.id}"><button>Switch</button></form>`}</td></tr>`).join("");
      return html(layout("Switch business", `
<div class="card"><table><tr><th>Business</th><th>Plan</th><th></th></tr>${rows}</table>
<p class="mut">Each business has its own posts, inbox, reviews and billing.</p></div>`, user));
    }
    if (path === "/prospects") {
      if (req.method === "POST") {
        const f = await formData(req);
        const name = (f.prospect || "").trim().slice(0, 200);
        const target = (f.target_url || "").trim().slice(0, 500);
        if (name) {
          const slug = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => b.toString(36).padStart(2, "0")).join("").replace(/[^a-z0-9]/gi, "").slice(0, 10) || Math.random().toString(36).slice(2, 12);
          await db.query(
            `INSERT INTO cf_prospect_link(id,workspace_id,slug,prospect_name,target_url) VALUES($1,$2,$3,$4,$5)`,
            [crypto.randomUUID(), mem.workspace_id, slug, name, target || "https://revup.nahalabs.co.za/?ref=" + slug]
          );
        }
        return redirect2("/prospects");
      }
      const links = await db.query(`SELECT * FROM cf_prospect_link WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
      const rows = links.rows.map((l) => `<tr>
<td><b>${esc2(l.prospect_name)}</b></td>
<td><a href="${base}/t/${esc2(l.slug)}" target="_blank" rel="noopener">/t/${esc2(l.slug)}</a></td>
<td>${l.click_count > 0 ? `<span class="ok">${l.click_count} click${l.click_count === 1 ? "" : "s"}</span> <span class="mut">${l.last_clicked_at ? "last " + new Date(l.last_clicked_at).toLocaleString("en-ZA") : ""}</span>` : `<span class="mut">no clicks yet</span>`}</td></tr>`).join("");
      return html(layout("Prospect links", `
<div class="card"><h2 style="margin-top:0">New tracked link</h2>
<p class="mut">One unique link per prospect. When they open it, the click is recorded here and they land on your page.</p>
<form method="post"><label>Prospect name<input name="prospect" required maxlength="200" placeholder="e.g. Sipho's Plumbing"></label>
<label>Send them to (optional)<input name="target_url" maxlength="500" placeholder="https://revup.nahalabs.co.za/"></label>
<button>Create link</button></form></div>
<div class="card"><table><tr><th>Prospect</th><th>Link</th><th>Clicks</th></tr>${rows || '<tr><td colspan="3" class="mut">No links yet.</td></tr>'}</table></div>`, user));
    }
    if (path === "/receptionist/connect") {
      const connQ = await db.query(`SELECT * FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
      const conn = connQ.rows[0];
      const msg = url.searchParams.get("msg") || "", err = url.searchParams.get("err") || "";
      if (req.method === "POST") {
        const f = await formData(req);
        if (f.action === "save_key") {
          const key = (f.api_key || "").trim();
          if (!key) return redirect2("/receptionist/connect?err=" + encodeURIComponent("Paste the key from your messaging account first."));
          const v = await validateTenantKey(key, mem.workspace_id, mem.workspace_name);
          if (v.error) return redirect2("/receptionist/connect?err=" + encodeURIComponent(v.error));
          await db.query(
            `INSERT INTO receptionist_tenantmessagingconnection(id,workspace_id,api_key,profile_id,status,last_error,created_at,updated_at)
               VALUES($1,$2,$3,$4,'key_valid','',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET api_key=EXCLUDED.api_key, profile_id=EXCLUDED.profile_id, status='key_valid', last_error='', updated_at=now()`,
            [crypto.randomUUID(), mem.workspace_id, key, v.profileId]
          );
          return redirect2("/receptionist/connect?msg=" + encodeURIComponent("Key saved. Now connect your WhatsApp."));
        }
        if (f.action === "start") {
          if (!conn || !conn.profile_id) return redirect2("/receptionist/connect?err=" + encodeURIComponent("Save your API key first."));
          const cb = `${base}/receptionist/connect/callback?ws=${mem.workspace_id}&u=${user.id}&p=${conn.profile_id}`;
          let authUrl = "";
          try {
            authUrl = await tenantConnectUrl(conn.api_key, conn.profile_id, cb);
          } catch (e) {
            return redirect2("/receptionist/connect?err=" + encodeURIComponent(e.status === 402 ? "Your messaging plan covers 2 numbers. Add a card in your messaging account to connect more." : "Could not start the connection. Please try again."));
          }
          await db.query(`UPDATE receptionist_tenantmessagingconnection SET status='connecting', updated_at=now() WHERE workspace_id=$1`, [mem.workspace_id]);
          return new Response(null, { status: 303, headers: { location: authUrl } });
        }
        return redirect2("/receptionist/connect");
      }
      const step = conn ? conn.status === "connected" ? 3 : 2 : 1;
      return html(layout("Connect WhatsApp", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Connect your own WhatsApp number</h2>
<p class="mut">Three one-time steps. Your customers then chat with YOUR number, and the receptionist answers them with your business details.</p>
<h3>1. Create your messaging account ${step > 1 ? '<span class="ok">&#10003;</span>' : ""}</h3>
<p class="mut">Open a free account with our messaging partner, then copy your API key from its settings.</p>
<h3>2. Paste your API key ${step > 2 ? '<span class="ok">&#10003;</span>' : ""}</h3>
${conn && conn.status === "connected" ? `<p class="ok">Number connected: +${esc2(conn.phone_number || "")}</p>` : `<form method="post"><input type="hidden" name="action" value="save_key"><label>API key<input name="api_key" required maxlength="200" autocomplete="off"></label><button>Save key</button></form>`}
${conn && conn.status !== "connected" ? `<h3>3. Connect WhatsApp</h3><form method="post"><input type="hidden" name="action" value="start"><button class="btn btn-primary">Connect WhatsApp</button><p class="mut">You will scan a QR code with the WhatsApp app on your phone - the same way WhatsApp Web pairs.</p></form>` : ""}
${conn && conn.status === "connected" && conn.last_error ? `<p class="warn">${esc2(conn.last_error)}</p>` : ""}
</div>`, user));
    }
    if (path === "/receptionist/connect/callback") {
      const ws = url.searchParams.get("ws") || "", u = url.searchParams.get("u") || "", p = url.searchParams.get("p") || "";
      if (ws !== mem.workspace_id || u !== user.id) return html(layout("Connect WhatsApp", `<p class="bad">The connection did not match this business. Please try again.</p>`), 400);
      const connQ = await db.query(`SELECT * FROM receptionist_tenantmessagingconnection WHERE workspace_id=$1 LIMIT 1`, [ws]);
      const conn = connQ.rows[0];
      if (!conn || p !== conn.profile_id) return redirect2("/receptionist/connect?err=" + encodeURIComponent("Your connection session expired. Please try again."));
      const error = url.searchParams.get("error") || "";
      if (error) {
        await db.query(`UPDATE receptionist_tenantmessagingconnection SET status='key_valid', updated_at=now() WHERE workspace_id=$1`, [ws]);
        const msg = /already/i.test(error) ? "This number is connected somewhere else. Disconnect it there first, then try again." : "The connection was cancelled before it finished. Nothing was connected.";
        return redirect2("/receptionist/connect?err=" + encodeURIComponent(msg));
      }
      const connected = url.searchParams.get("connected") || "", profileId = url.searchParams.get("profileId") || "", accountId = url.searchParams.get("accountId") || "";
      if (connected !== "whatsapp" || !profileId || !accountId || profileId !== conn.profile_id)
        return redirect2("/receptionist/connect?err=" + encodeURIComponent("The connection came back incomplete. Please try again."));
      try {
        const r = await tenantConfirmAndBind(db, conn, profileId, accountId, `${base}/webhooks/zernio`);
        return redirect2("/receptionist/connect?" + (r.ok ? "msg" : "err") + "=" + encodeURIComponent(r.msg));
      } catch (e) {
        return redirect2("/receptionist/connect?err=" + encodeURIComponent("Your number connected, but we could not confirm it yet. Refresh in a moment."));
      }
    }
    if (path === "/receptionist") {
      const [ch, prof, usedM, planRow] = await Promise.all([
        db.query(`SELECT phone_number, label, is_sandbox, connected_at FROM receptionist_zerniochannel WHERE workspace_id=$1`, [mem.workspace_id]),
        db.query(`SELECT business_name, industry, is_active FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]),
        db.query(`SELECT count(*) c FROM receptionist_message m JOIN workspaces_workspace w ON w.id=m.workspace_id WHERE w.organization_id=$1 AND m.direction='outbound' AND m.sender_type='ai' AND m.is_draft=false AND m.created_at >= date_trunc('month', now())`, [mem.org_id]),
        db.query(`SELECT plan FROM organizations_organization WHERE id=$1`, [mem.org_id])
      ]);
      const allowance = { starter: 500, growth: 1e3, "business-pro": 2500 };
      const pl = planRow.rows[0]?.plan || "starter";
      const lim = allowance[pl] ?? 500;
      const chan = ch.rows.map((c) => `<tr><td>+${esc2(c.phone_number || "")}</td><td>${esc2(c.label || "")}</td><td>${c.is_sandbox ? "demo line" : "live"}</td></tr>`).join("");
      const p = prof.rows[0];
      return html(layout("Receptionist", `
${!ch.rows.length ? `<div class="card" style="border-color:var(--brand)"><h2 style="margin-top:0">Connect your WhatsApp</h2><p>Your receptionist answers customers on your own business WhatsApp number. <a href="/receptionist/connect">Connect it yourself in three steps</a> - it takes a few minutes.</p></div>` : ""}
<div class="card"><h2 style="margin-top:0">Your receptionist</h2>
<p>${p ? `${esc2(p.business_name || mem.org_name)} \xB7 ${esc2(p.industry || "general")} \xB7 ${p.is_active ? '<span class="ok">answering</span>' : '<span class="warn">paused</span>'}` : "Tell RevUp about your business in onboarding so the receptionist knows what to say."}</p>
<p class="mut">Business details, hours and prices come from <a href="/onboarding">onboarding</a>. Conversations live in your <a href="/inbox">inbox</a> - step in any time.</p></div>
<div class="grid">
<div class="card"><h2>AI replies this month</h2><p class="stat">${usedM.rows[0].c} / ${lim}</p><p class="mut">on the ${esc2(pl)} plan</p></div>
<div class="card"><h2>Connected numbers</h2>${ch.rows.length ? `<table><tr><th>Number</th><th>Label</th><th>Type</th></tr>${chan}</table>` : `<p class="mut">None yet.</p>`}</div>
</div>`, user));
    }
    if (path === "/assistant") {
      const { getSettings: getSettings2, upsertSettings: upsertSettings2, assistantCounts: assistantCounts2 } = await Promise.resolve().then(() => (init_assistant(), assistant_exports));
      if (mem.plan !== "business-pro") {
        return html(layout("Assistant", `<div class="card"><h2 style="margin-top:0">Your own assistant</h2>
<p>Chat with your own assistant on your business WhatsApp: it remembers your rules and decisions, keeps a task log, parks anything that sends, spends or deploys for your Go + Sure, and holds a write-only vault for your secrets.</p>
<p class="mut">The assistant is part of the Business Pro plan. <a href="/billing">Upgrade in billing -</a></p></div>`, user));
      }
      if (req.method === "POST") {
        const f = await formData(req);
        const phone = String(f.owner_phone || "").replace(/\D/g, "").slice(0, 32);
        if (!phone || phone.length < 9) return redirect2("/assistant?msg=" + encodeURIComponent("Enter your WhatsApp number with country code, e.g. 27612345678."));
        await upsertSettings2(db, mem.workspace_id, phone, f.enabled === "on");
        return redirect2("/assistant?msg=" + encodeURIComponent("Assistant settings saved."));
      }
      const [settings, counts] = await Promise.all([getSettings2(db, mem.workspace_id), assistantCounts2(db, mem.workspace_id)]);
      const msg = url.searchParams.get("msg") || "";
      return html(layout("Assistant", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Your own assistant</h2>
<p>Message your business WhatsApp number from your own phone. The assistant answers only you: it remembers your rules and decisions, keeps a task log, parks anything that sends, spends or deploys until you reply <b>Go + Sure</b>, and holds a write-only vault for your secrets.</p>
<form method="post" action="/assistant">
<label>Your WhatsApp number (country code, e.g. 27612345678)<input name="owner_phone" value="${esc2(settings?.owner_phone || "")}" maxlength="32" placeholder="27\u2026"></label>
<label><input type="checkbox" name="enabled" ${!settings || settings.enabled ? "checked" : ""}> Assistant answering</label>
<button class="btn btn-primary" type="submit">Save</button></form></div>
<div class="grid">
<div class="card"><h2>Memories kept</h2><p class="stat">${counts.memories}</p></div>
<div class="card"><h2>Waiting on Go + Sure</h2><p class="stat">${counts.pending}</p></div>
<div class="card"><h2>Tasks running</h2><p class="stat">${counts.running}</p></div>
</div>`, user));
    }
    if (path === "/") return html(await dashboardPage(db, user, mem, url.searchParams.get("msg") || ""));
    if (path === "/static/brand/revup-light.png") return new Response(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    if (path === "/onboarding") {
      if (req.method === "POST") {
        const f = await formData(req);
        const goals = GOALS.map(([v]) => v).filter((v) => f["goal_" + v]);
        const plan = ["starter", "growth", "business-pro"].includes(f.plan || "") ? f.plan : recommendPlan(goals);
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `UPDATE workspaces_workspace SET industry=$1, website_url=$2, timezone=$3, updated_at=now() WHERE id=$4`,
            [f.industry || "", f.website_url || "", f.timezone || "Africa/Johannesburg", mem.workspace_id]
          );
          await client.query(`UPDATE organizations_organization SET plan=$1, goals=$3::jsonb, updated_at=now() WHERE id=$2`, [plan, mem.org_id, JSON.stringify(goals)]);
          await client.query(
            `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
               VALUES($1,$2,$3,$4,$6::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$5,true,true,2,'reviews',now(),now())
               ON CONFLICT (workspace_id) DO UPDATE SET business_name=EXCLUDED.business_name, industry=EXCLUDED.industry,
                 google_review_url=EXCLUDED.google_review_url, custom_rules=EXCLUDED.custom_rules, updated_at=now()`,
            [crypto.randomUUID(), mem.workspace_id, f.business_name || mem.org_name, f.industry || "", f.google_review_url || "", JSON.stringify({ goals })]
          );
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
        const planName = PLAN_CARDS.find((p) => p.slug === plan)?.name || plan;
        return redirect2("/?msg=" + encodeURIComponent(`${planName} chosen - activate it with your first monthly payment on the billing page. Add your Google review link under Reviews whenever you are ready.`));
      }
      return html(await onboardingPage(db, user, mem));
    }
    if (path === "/radar") {
      if (req.method === "POST") {
        const f = await formData(req);
        const ind = (f.industry || "general").trim();
        await db.query(`UPDATE workspaces_workspace SET industry=$1, updated_at=now() WHERE id=$2`, [ind, mem.workspace_id]);
        await db.query(`UPDATE receptionist_businessprofile SET industry=$1, updated_at=now() WHERE workspace_id=$2`, [ind, mem.workspace_id]);
        return redirect2("/radar?msg=" + encodeURIComponent("Industry saved - radar, reply tone and post ideas updated."));
      }
      return html(await radarPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    if (path === "/analytics") return html(await analyticsPage(db, user, mem));
    if (path === "/frontdesk") {
      if (mem.plan !== "business-pro") return html(layout("Leads", `
<div class="card"><h2>Leads is a Business Pro feature</h2>
<p>Capture website enquiries, work a shared lead pipeline, and send considered follow-ups. <a href="/billing">Upgrade to Business Pro - R1,999/month</a>.</p></div>`, user));
      const leads = await db.query(`SELECT * FROM frontdesk_lead WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 200`, [mem.workspace_id]);
      const drafts = await db.query(`SELECT * FROM frontdesk_followup_draft WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
      const totals = await db.query(`SELECT stage, count(*) c, coalesce(sum(value_cents),0) v FROM frontdesk_lead WHERE workspace_id=$1 GROUP BY stage`, [mem.workspace_id]);
      const tmap = {};
      for (const t of totals.rows) tmap[t.stage] = t;
      const STAGES = ["new", "contacted", "quoted", "won", "lost"];
      const summary = STAGES.map((s) => `<div class="card"><h2 style="text-transform:capitalize">${s}</h2><p class="stat">${tmap[s]?.c || 0}</p><p class="mut">R${((tmap[s]?.v || 0) / 100).toLocaleString("en-ZA")}</p></div>`).join("");
      const byLead = {};
      for (const d of drafts.rows) (byLead[d.lead_id] = byLead[d.lead_id] || []).push(d);
      const rows = leads.rows.map((l) => {
        const ds = (byLead[l.id] || []).map((d) => `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0">
<div class="mut" style="font-size:11px">Follow-up draft \xB7 ${esc2(d.status)} \xB7 ${new Date(d.created_at).toLocaleString("en-ZA")}</div>
<div style="white-space:pre-wrap">${esc2(d.body)}</div>
${d.status === "draft" ? `<form method="post" action="/frontdesk/draft/${d.id}/approve" style="margin-top:6px"><button>Mark approved</button></form>` : ""}</div>`).join("");
        return `<tr>
<td><b>${esc2(l.name)}</b><br><span class="mut">${esc2(l.contact)}</span></td>
<td>${esc2(l.message.slice(0, 100))}${ds}</td>
<td><form method="post" action="/frontdesk/${l.id}/save" style="display:flex;gap:6px;align-items:center">
<select name="stage">${STAGES.map((s) => `<option${l.stage === s ? " selected" : ""}>${s}</option>`).join("")}</select>
<input name="value" type="number" min="0" step="0.01" value="${(l.value_cents / 100).toFixed(2)}" style="width:90px" title="Value (ZAR)">
<button>Save</button></form>
<form method="post" action="/frontdesk/${l.id}/draft" style="margin-top:6px"><button>Draft follow-up</button></form></td>
<td class="mut">${new Date(l.created_at).toLocaleString("en-ZA")}</td></tr>`;
      }).join("");
      return html(layout("Leads", `
<p class="mut">Your public enquiry form: <a href="/f/${mem.workspace_id}" target="_blank" rel="noopener">/f/${mem.workspace_id.slice(0, 8)}\u2026</a> - share it anywhere. Enquiries land here and in your inbox.</p>
<div class="grid">${summary}</div>
<div class="card">${leads.rows.length ? `<table><tr><th>Lead</th><th>Enquiry + follow-ups</th><th>Stage \xB7 value (ZAR)</th><th>When</th></tr>${rows}</table>` : `<p class="mut">No enquiries yet. Share your enquiry form link to start capturing leads.</p>`}</div>`, user));
    }
    const fsave = /^\/frontdesk\/([0-9a-f-]{36})\/save$/.exec(path);
    if (fsave && req.method === "POST") {
      if (mem.plan !== "business-pro") return redirect2("/frontdesk");
      const f = await formData(req);
      const stage = ["new", "contacted", "quoted", "won", "lost"].includes(f.stage) ? f.stage : "new";
      const cents = Math.max(0, Math.round(parseFloat(f.value || "0") * 100) || 0);
      await db.query(`UPDATE frontdesk_lead SET stage=$1, value_cents=$2, updated_at=now() WHERE id=$3 AND workspace_id=$4`, [stage, cents, fsave[1], mem.workspace_id]);
      return redirect2("/frontdesk");
    }
    const fdraft = /^\/frontdesk\/([0-9a-f-]{36})\/draft$/.exec(path);
    if (fdraft && req.method === "POST") {
      if (mem.plan !== "business-pro") return redirect2("/frontdesk");
      const lr = await db.query(`SELECT * FROM frontdesk_lead WHERE id=$1 AND workspace_id=$2`, [fdraft[1], mem.workspace_id]);
      if (!lr.rows[0]) return redirect2("/frontdesk");
      try {
        const body = await groqFollowup(env, db, mem.workspace_id, mem.workspace_name, lr.rows[0]);
        await db.query(
          `INSERT INTO frontdesk_followup_draft(id,lead_id,workspace_id,body,status,created_at,updated_at) VALUES($1,$2,$3,$4,'draft',now(),now())`,
          [crypto.randomUUID(), fdraft[1], mem.workspace_id, body]
        );
      } catch (e) {
        return redirect2("/frontdesk?err=" + encodeURIComponent("Drafting failed - try again."));
      }
      return redirect2("/frontdesk");
    }
    const fappr = /^\/frontdesk\/draft\/([0-9a-f-]{36})\/approve$/.exec(path);
    if (fappr && req.method === "POST") {
      if (mem.plan !== "business-pro") return redirect2("/frontdesk");
      await db.query(`UPDATE frontdesk_followup_draft SET status='approved', updated_at=now() WHERE id=$1 AND workspace_id=$2`, [fappr[1], mem.workspace_id]);
      return redirect2("/frontdesk");
    }
    if (path === "/media") {
      if (req.method === "POST") {
        const fd = await req.formData();
        const file = fd.get("file");
        if (!(file instanceof File) || !file.size) return redirect2("/media?err=" + encodeURIComponent("Choose an image first."));
        if (!(file.type || "").startsWith("image/")) return redirect2("/media?err=" + encodeURIComponent("Images only (jpg, png, webp, gif)."));
        if (file.size > 2 * 1024 * 1024) return redirect2("/media?err=" + encodeURIComponent("That image is over 2 MB - please use a smaller one."));
        const caps = await db.query(`SELECT count(*) c, COALESCE(sum(size),0) b FROM cf_media WHERE workspace_id=$1`, [mem.workspace_id]);
        if (Number(caps.rows[0].c) >= 25) return redirect2("/media?err=" + encodeURIComponent("Library full (25 images on the free library) - delete one first."));
        if (Number(caps.rows[0].b) + file.size > 50 * 1024 * 1024) return redirect2("/media?err=" + encodeURIComponent("Library storage limit reached (50 MB) - delete something first."));
        const buf = Buffer.from(await file.arrayBuffer());
        await db.query(
          `INSERT INTO cf_media(id,workspace_id,filename,mime,size,data) VALUES($1,$2,$3,$4,$5,$6)`,
          [crypto.randomUUID(), mem.workspace_id, (file.name || "image").slice(0, 200), file.type, file.size, buf]
        );
        return redirect2("/media?msg=" + encodeURIComponent("Image added to your library."));
      }
      const items = await db.query(`SELECT id, filename, mime, size, created_at FROM cf_media WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 60`, [mem.workspace_id]);
      const msg = url.searchParams.get("msg") || "", err = url.searchParams.get("err") || "";
      const cards = items.rows.map((m) => `<div class="card" style="padding:10px">
<img src="/media/${m.id}/raw" alt="${esc2(m.filename)}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:var(--line)">
<p style="margin:6px 0 2px"><b>${esc2(m.filename)}</b><br><span class="mut">${Math.round(m.size / 1024)} KB \xB7 ${new Date(m.created_at).toLocaleDateString("en-ZA")}</span></p>
<p style="margin:4px 0"><a href="/posts/new?media=${m.id}">Use in a post</a></p>
<form method="post" action="/media/${m.id}/delete" onsubmit="return confirm('Delete this image?')"><button class="link" style="color:var(--bad)">Delete</button></form>
</div>`).join("");
      return html(layout("Media library", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}${err ? `<p class="bad">${esc2(err)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Add an image</h2>
<form method="post" enctype="multipart/form-data"><input type="file" name="file" accept="image/*" required><button>Upload</button></form>
<p class="mut">Images up to 2 MB. Your library holds 25 images (50 MB) - plenty for a month of posts.</p></div>
<div class="grid">${cards || '<div class="card"><p class="mut">No images yet. Your first upload lands here.</p></div>'}</div>`, user));
    }
    const mraw = /^\/media\/([0-9a-f-]{36})\/raw$/.exec(path);
    if (mraw) {
      const r = await db.query(`SELECT mime, data FROM cf_media WHERE id=$1 AND workspace_id=$2`, [mraw[1], mem.workspace_id]);
      if (!r.rows[0]) return new Response("not found", { status: 404 });
      return new Response(new Uint8Array(r.rows[0].data), { headers: { "content-type": r.rows[0].mime, "cache-control": "private, max-age=3600" } });
    }
    const mdel = /^\/media\/([0-9a-f-]{36})\/delete$/.exec(path);
    if (mdel && req.method === "POST") {
      await db.query(`DELETE FROM cf_media WHERE id=$1 AND workspace_id=$2`, [mdel[1], mem.workspace_id]);
      return redirect2("/media?msg=" + encodeURIComponent("Image deleted."));
    }
    if (path === "/posts") {
      const msg = url.searchParams.get("msg") || "";
      return html((msg ? `<p class="ok">${esc2(msg)}</p>` : "") + await postsPage(db, user, mem));
    }
    if (path === "/posts/new") {
      if (req.method === "POST") {
        const f = await formData(req);
        if (!(f.title || "").trim() && !(f.caption || "").trim()) return redirect2("/posts/new");
        const postId = crypto.randomUUID();
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO composer_post(id,title,caption,first_comment,internal_notes,tags,workspace_id,author_id,media_id,created_at,updated_at)
               VALUES($1,$2,$3,'','','{}'::jsonb,$4,$5,$6,now(),now())`,
            [postId, (f.title || "").trim(), (f.caption || "").trim(), mem.workspace_id, user.id, /^[0-9a-f-]{36}$/.test(f.media_id || "") ? f.media_id : null]
          );
          const accs = await client.query(
            `SELECT id, provider FROM social_accounts_social_account WHERE workspace_id=$1 AND connection_status='connected'`,
            [mem.workspace_id]
          );
          for (const a of accs.rows) {
            await client.query(
              `INSERT INTO composer_platform_post(id,platform_post_id,publish_error,retry_count,created_at,updated_at,social_account_id,post_id,platform_extra,status,first_comment_error,first_comment_id,first_comment_retry_count,first_comment_status,last_provider_error,last_provider_status,provider,provider_post_id)
                 VALUES($1,'','',0,now(),now(),$2,$3,'{}'::jsonb,'draft','','',0,'none','','',$4,'')`,
              [crypto.randomUUID(), a.id, postId, a.provider || "zernio"]
            );
          }
          await client.query("COMMIT");
          return redirect2("/posts?msg=" + encodeURIComponent("Draft created."));
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      }
      return html(newPostPage(user, mem, { media: url.searchParams.get("media") || "" }, url.searchParams.get("msg") || ""));
    }
    if (path === "/posts/draft" && req.method === "POST") {
      const f = await formData(req);
      const topic = (f.topic || "").trim();
      if (!topic) return html(newPostPage(user, mem, f, "Tell me the topic first."));
      try {
        const business = mem.org_name || "local business";
        const d = await draftCaption(env, business, topic);
        const caption = d.caption + (d.hashtags.length ? "\n\n" + d.hashtags.join(" ") : "");
        return html(newPostPage(user, mem, { ...f, caption }, "Drafted - edit anything before saving."));
      } catch (e) {
        return html(newPostPage(user, mem, f, "Drafting failed (" + String(e?.message || e) + ") - write it manually or try again."));
      }
    }
    if (path === "/team") {
      await ensureSocialTeamSchema(db);
      return html(layout("Your social media team", await teamPage(db, mem.workspace_id, url.searchParams.get("msg") || ""), user));
    }
    if (path === "/team/research" && req.method === "POST") {
      await ensureSocialTeamSchema(db);
      try {
        const bp = await db.query(`SELECT business_name, industry FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
        const business = bp.rows[0]?.business_name || mem.org_name || "local business";
        const industry = bp.rows[0]?.industry || "";
        const existing = await db.query(`SELECT title FROM socialteam_idea WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 40`, [mem.workspace_id]);
        const ideas = await runResearcher(env, business, industry, existing.rows.map((r) => r.title));
        for (const i of ideas.slice(0, 3)) {
          await db.query(
            `INSERT INTO socialteam_idea(id, workspace_id, title, angle, rationale) VALUES($1,$2,$3,$4,$5)`,
            [crypto.randomUUID(), mem.workspace_id, i.title, i.angle, i.rationale]
          );
        }
        return redirect2("/team?msg=" + encodeURIComponent("Your Researcher brought " + ideas.length + " fresh ideas."));
      } catch (e) {
        return redirect2("/team?msg=" + encodeURIComponent("Research failed (" + String(e?.message || e) + ") - try again shortly."));
      }
    }
    const ideaWrite = /^\/team\/idea\/([0-9a-f-]{36})\/write$/.exec(path);
    if (ideaWrite && req.method === "POST") {
      await ensureSocialTeamSchema(db);
      const ir = await db.query(`SELECT id, title, angle, rationale, status FROM socialteam_idea WHERE id=$1 AND workspace_id=$2`, [ideaWrite[1], mem.workspace_id]);
      const idea = ir.rows[0];
      if (!idea || idea.status !== "fresh") return redirect2("/team");
      try {
        const bp = await db.query(`SELECT business_name FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
        const business = bp.rows[0]?.business_name || mem.org_name || "local business";
        const pieceId = crypto.randomUUID();
        await db.query(`INSERT INTO socialteam_piece(id, workspace_id, idea_id) VALUES($1,$2,$3)`, [pieceId, mem.workspace_id, idea.id]);
        await producePiece(env, db, mem.workspace_id, pieceId, business, idea);
        await db.query(`UPDATE socialteam_idea SET status='used', updated_at=now() WHERE id=$1`, [idea.id]);
        return redirect2("/team?msg=" + encodeURIComponent("Written and checked - ready for your eye below."));
      } catch (e) {
        return redirect2("/team?msg=" + encodeURIComponent("Writing failed (" + String(e?.message || e) + ") - try again shortly."));
      }
    }
    const ideaPark = /^\/team\/idea\/([0-9a-f-]{36})\/park$/.exec(path);
    if (ideaPark && req.method === "POST") {
      await db.query(`UPDATE socialteam_idea SET status='parked', updated_at=now() WHERE id=$1 AND workspace_id=$2`, [ideaPark[1], mem.workspace_id]);
      return redirect2("/team");
    }
    const pieceSend = /^\/team\/piece\/([0-9a-f-]{36})\/send$/.exec(path);
    if (pieceSend && req.method === "POST") {
      const pr = await db.query(`SELECT id, caption, hashtags, status FROM socialteam_piece WHERE id=$1 AND workspace_id=$2`, [pieceSend[1], mem.workspace_id]);
      const piece = pr.rows[0];
      if (!piece || piece.status !== "ready" && piece.status !== "returned") return redirect2("/team");
      const tags = Array.isArray(piece.hashtags) ? piece.hashtags.join(" ") : "";
      const caption = piece.caption + (tags ? "\n\n" + tags : "");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const postId = crypto.randomUUID();
        await client.query(
          `INSERT INTO composer_post(id,title,caption,first_comment,internal_notes,tags,workspace_id,author_id,media_id,created_at,updated_at)
             VALUES($1,$2,$3,'','','{}'::jsonb,$4,$5,NULL,now(),now())`,
          [postId, "From your social media team", caption, mem.workspace_id, user.id]
        );
        const accs = await client.query(
          `SELECT id, provider FROM social_accounts_social_account WHERE workspace_id=$1 AND connection_status='connected'`,
          [mem.workspace_id]
        );
        let moved = 0;
        for (const a of accs.rows) {
          await client.query(
            `INSERT INTO composer_platform_post(id,platform_post_id,publish_error,retry_count,created_at,updated_at,social_account_id,post_id,platform_extra,status,first_comment_error,first_comment_id,first_comment_retry_count,first_comment_status,last_provider_error,last_provider_status,provider,provider_post_id)
               VALUES($1,'','',0,now(),now(),$2,$3,'{}'::jsonb,'pending_review','','',0,'none','','',$4,'')`,
            [crypto.randomUUID(), a.id, postId, a.provider || "zernio"]
          );
          moved++;
        }
        await client.query(
          `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
             VALUES($1,$2,NULL,$3,'submitted','from the social media team',now())`,
          [crypto.randomUUID(), postId, user.id]
        );
        await client.query(`UPDATE socialteam_piece SET status='sent_for_approval', updated_at=now() WHERE id=$1`, [piece.id]);
        await client.query("COMMIT");
        return redirect2(moved ? "/approvals" : "/team?msg=" + encodeURIComponent("Saved as a post draft - connect a social account to send it for approval."));
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/inbox") return html(await inboxPage(db, user, mem));
    const cardPost = /^\/inbox\/([0-9a-f-]{36})\/card$/.exec(path);
    if (cardPost && req.method === "POST") {
      const f = await formData(req);
      const spend = Number(String(f.total_spend || "0").replace(",", "."));
      if (isNaN(spend) || spend < 0 || spend > 1e8) return redirect2("/inbox/" + cardPost[1]);
      const bday = /^\d{4}-\d{2}-\d{2}$/.test(f.birthday || "") ? f.birthday : null;
      await db.query(
        `UPDATE receptionist_contact SET name=$1, birthday=$2, dietary_notes=$3, notes=$4, total_spend=$5, is_vip=$6, updated_at=now()
           WHERE id=$7 AND workspace_id=$8`,
        [String(f.name || "").trim().slice(0, 120), bday, String(f.dietary_notes || "").trim().slice(0, 200), String(f.notes || "").trim(), spend, f.is_vip === "on", cardPost[1], mem.workspace_id]
      );
      return redirect2("/inbox/" + cardPost[1]);
    }
    const ires = /^\/inbox\/intake\/(receptionist_funeralclaim|receptionist_dentalappointment|receptionist_tradedispatch)\/([0-9a-f-]{36})\/resolve$/.exec(path);
    if (ires && req.method === "POST") {
      await db.query(`UPDATE ${ires[1]} SET status='resolved' WHERE id=$1 AND workspace_id=$2`, [ires[2], mem.workspace_id]);
      return redirect2("/inbox");
    }
    const cm = /^\/inbox\/([0-9a-f-]{36})$/.exec(path);
    if (cm) return conversationPage(db, user, mem, cm[1], env);
    const sm = /^\/posts\/([0-9a-f-]{36})\/submit$/.exec(path);
    if (sm && req.method === "POST") {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const cur = await client.query(
          `SELECT pp.id, pp.status FROM composer_platform_post pp JOIN composer_post p ON p.id=pp.post_id
             WHERE pp.post_id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`,
          [sm[1], mem.workspace_id]
        );
        let moved = 0;
        for (const pp of cur.rows) {
          if (pp.status !== "draft") continue;
          await client.query(`UPDATE composer_platform_post SET status='pending_review', updated_at=now() WHERE id=$1`, [pp.id]);
          moved++;
        }
        if (moved) {
          await client.query(
            `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
               VALUES($1,$2,NULL,$3,'submitted','',now())`,
            [crypto.randomUUID(), sm[1], user.id]
          );
        }
        await client.query("COMMIT");
        return redirect2(moved ? "/approvals" : "/posts?msg=" + encodeURIComponent("Nothing to submit (no draft channels)."));
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/bookings") {
      const bk = await db.query(
        `SELECT b.*, c.name AS contact_name, c.wa_id FROM receptionist_booking b
           JOIN receptionist_contact c ON c.id=b.contact_id
           WHERE b.workspace_id=$1 ORDER BY b.created_at DESC LIMIT 50`,
        [mem.workspace_id]
      );
      const msg = url.searchParams.get("msg") || "";
      const rows = bk.rows.map((b) => `<tr>
<td><b>${esc2(b.contact_name || b.wa_id)}</b><br><span class="mut">${esc2(b.service || "booking")}</span></td>
<td class="mut">${b.status === "confirmed" && b.scheduled_start ? new Date(b.scheduled_start).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : esc2(b.preferred_time || "to confirm")}</td>
<td>${b.status === "confirmed" ? '<span class="ok">confirmed</span>' : b.status === "done" ? "done" : b.status === "cancelled" ? '<span class="mut">cancelled</span>' : "<b>requested</b>"}</td>
<td>${b.status === "requested" ? `<form class="inline" method="post" action="/bookings/${b.id}/confirm"><input type="datetime-local" name="when" required style="width:auto"><button>Confirm</button></form>` : ""}
${b.status === "confirmed" ? `<form class="inline" method="post" action="/bookings/${b.id}/done"><button>Mark done</button></form>` : ""}
${["requested", "confirmed"].includes(b.status) ? `<form class="inline" method="post" action="/bookings/${b.id}/cancel"><button class="link">Cancel</button></form>` : ""}</td></tr>`).join("");
      return html(layout("Bookings", `
${msg ? `<p class="ok">${esc2(msg)}</p>` : ""}
<p class="mut">Booking requests land here from your WhatsApp receptionist. Confirm a time, and when the job is finished mark it done - that starts the review request flow automatically.</p>
<div class="card">${bk.rows.length ? `<table><tr><th>Customer</th><th>Time</th><th>Status</th><th></th></tr>${rows}</table>` : `<p class="mut">No bookings yet. When a customer books on WhatsApp, it shows up here.</p>`}</div>`, user));
    }
    const bact = /^\/bookings\/([0-9a-f-]{36})\/(confirm|done|cancel)$/.exec(path);
    if (bact && req.method === "POST") {
      const own = await db.query(`SELECT id, contact_id, status FROM receptionist_booking WHERE id=$1 AND workspace_id=$2`, [bact[1], mem.workspace_id]);
      const b = own.rows[0];
      if (!b) return redirect2("/bookings");
      if (bact[2] === "confirm" && b.status === "requested") {
        const f = await formData(req);
        const when = String(f.when || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(when)) return redirect2("/bookings");
        await db.query(`UPDATE receptionist_booking SET status='confirmed', scheduled_start=($1 || ':00+02')::timestamptz WHERE id=$2`, [when.slice(0, 16), b.id]);
        return redirect2("/bookings?msg=" + encodeURIComponent("Booking confirmed."));
      }
      if (bact[2] === "done" && b.status === "confirmed") {
        await db.query(`UPDATE receptionist_booking SET status='done' WHERE id=$1`, [b.id]);
        await db.query(`UPDATE receptionist_contact SET visit_count=visit_count+1, last_visit_at=now(), is_vip=(visit_count+1>=5 OR is_vip), updated_at=now() WHERE id=$1`, [b.contact_id]);
        await attributeBookingToCampaign(db, mem.workspace_id, b);
        const lacc = await awardForBooking(db, mem.workspace_id, b.id, b.contact_id);
        const loyaltyNote = lacc ? ` ${lacc.balance} loyalty points on their card.` : "";
        const evId = await startPipeline(db, mem.workspace_id, b.contact_id, b.id);
        const svc = await db.query(`SELECT service FROM receptionist_booking WHERE id=$1`, [b.id]);
        const remId = await scheduleServiceReminder(db, mem.workspace_id, b.id, b.contact_id, svc.rows[0]?.service || "");
        const extra = remId ? " A service reminder is scheduled too." : "";
        return redirect2("/bookings?msg=" + encodeURIComponent((evId ? "Marked done - the review check-in goes out in 15 minutes." : "Marked done. (This customer opted out of messages.)") + extra + loyaltyNote));
      }
      if (bact[2] === "cancel" && ["requested", "confirmed"].includes(b.status)) {
        await db.query(`UPDATE receptionist_booking SET status='cancelled' WHERE id=$1`, [b.id]);
        return redirect2("/bookings?msg=" + encodeURIComponent("Booking cancelled."));
      }
      return redirect2("/bookings");
    }
    if (path === "/waitlist") {
      if (req.method === "POST") {
        const f = await formData(req);
        const wa = String(f.wa_id || "").replace(/\D/g, "");
        if (!wa) return redirect2("/waitlist");
        await waitlistAdd(db, mem.workspace_id, wa, String(f.name || "").trim(), Number(f.party_size) || 2, String(f.wanted_time || "").trim());
        return redirect2("/waitlist?msg=" + encodeURIComponent("Added to the waitlist."));
      }
      return html(await waitlistPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const wact = /^\/waitlist\/([0-9a-f-]{36})\/(offer|accept|cancel)$/.exec(path);
    if (wact && req.method === "POST") {
      const okd = await waitlistAction(db, mem.workspace_id, wact[1], wact[2]);
      return redirect2("/waitlist?msg=" + encodeURIComponent(okd ? "Done." : "That change does not apply to this entry."));
    }
    if (path === "/loyalty") return html(await loyaltyPage(db, user, mem, url.searchParams.get("msg") || ""));
    if (path === "/loyalty/settings" && req.method === "POST") {
      const f = await formData(req);
      await loyaltySettings(db, mem.workspace_id);
      await db.query(
        `UPDATE receptionist_loyaltysettings SET enabled=$1, points_per_visit=$2, welcome_bonus=$3, points_for_voucher=$4, voucher_value_rand=$5, voucher_valid_days=$6 WHERE workspace_id=$7`,
        [f.enabled === "on", Math.max(0, Number(f.points_per_visit) || 0), Math.max(0, Number(f.welcome_bonus) || 0), Math.max(1, Number(f.points_for_voucher) || 100), Math.max(1, Number(f.voucher_value_rand) || 50), Math.max(1, Number(f.voucher_valid_days) || 90), mem.workspace_id]
      );
      return redirect2("/loyalty?msg=" + encodeURIComponent("Rules saved."));
    }
    if (path === "/loyalty/vouchers/new" && req.method === "POST") {
      const f = await formData(req);
      try {
        const v = await issueVoucher(db, mem.workspace_id, String(f.contact_id || ""));
        return redirect2("/loyalty?msg=" + encodeURIComponent(`Voucher ${v.code} issued - R${v.amount_rand}.`));
      } catch (e) {
        return redirect2("/loyalty?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const vred = /^\/loyalty\/vouchers\/([0-9a-f-]{36})\/redeem$/.exec(path);
    if (vred && req.method === "POST") {
      const okd = await redeemVoucher(db, mem.workspace_id, vred[1]);
      return redirect2("/loyalty?msg=" + encodeURIComponent(okd ? "Voucher redeemed." : "That voucher is not usable."));
    }
    if (path === "/quotes") {
      if (req.method === "POST") {
        const f = await formData(req);
        if (!String(f.customer_name || "").trim()) return redirect2("/quotes");
        await quoteCreate(db, mem.workspace_id, String(f.customer_name).trim(), /^[0-9a-f-]{36}$/.test(f.contact_id || "") ? f.contact_id : null, String(f.title || "").trim(), Number(f.amount) || 0, String(f.follow_up_on || ""));
        return redirect2("/quotes?msg=" + encodeURIComponent("Quote saved."));
      }
      return html(await quotesPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const qact = /^\/quotes\/([0-9a-f-]{36})\/(sent|won|lost)$/.exec(path);
    if (qact && req.method === "POST") {
      const out = await quoteAction(db, env, mem.workspace_id, qact[1], qact[2]);
      return redirect2("/quotes?msg=" + encodeURIComponent(out === "marked sent" ? "Marked sent (WhatsApp too, when the customer is linked and reachable)." : out === "no change" ? "That change does not apply to this quote." : `Quote ${out}.`));
    }
    if (path === "/campaigns") {
      if (req.method === "POST") {
        const f = await formData(req);
        try {
          await campaignCreate(db, mem.workspace_id, String(f.name || ""), String(f.segment || ""), String(f.body_a || ""), String(f.body_b || ""));
          return redirect2("/campaigns?msg=" + encodeURIComponent("Draft saved. Approve it when you are ready to send."));
        } catch (e) {
          return redirect2("/campaigns?msg=" + encodeURIComponent(String(e?.message || e)));
        }
      }
      return html(await campaignsPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const capp = /^\/campaigns\/([0-9a-f-]{36})\/approve$/.exec(path);
    if (capp && req.method === "POST") {
      const f = await formData(req);
      try {
        await campaignApprove(db, mem.workspace_id, capp[1], String(f.when || ""));
        return redirect2("/campaigns?msg=" + encodeURIComponent("Approved. The send starts within 15 minutes."));
      } catch (e) {
        return redirect2("/campaigns?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const ccan = /^\/campaigns\/([0-9a-f-]{36})\/cancel$/.exec(path);
    if (ccan && req.method === "POST") {
      await campaignCancel(db, mem.workspace_id, ccan[1]);
      return redirect2("/campaigns?msg=" + encodeURIComponent("Cancelled."));
    }
    if (path === "/competitors") {
      if (req.method === "POST") {
        const f = await formData(req);
        try {
          await competitorAdd(db, mem.workspace_id, String(f.name || ""), String(f.area || ""), String(f.website || ""), String(f.rating || ""), "");
          return redirect2("/competitors?msg=" + encodeURIComponent("Competitor saved."));
        } catch (e) {
          return redirect2("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
        }
      }
      return html(await competitorsPage(db, user, mem, url.searchParams.get("msg") || ""));
    }
    const cdish = /^\/competitors\/([0-9a-f-]{36})\/dishes$/.exec(path);
    if (cdish && req.method === "POST") {
      const f = await formData(req);
      try {
        await dishAdd(db, mem.workspace_id, cdish[1], String(f.name || ""), Number(f.price), String(f.own_item_id || ""));
        return redirect2("/competitors?msg=" + encodeURIComponent("Dish logged."));
      } catch (e) {
        return redirect2("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const cpromo = /^\/competitors\/([0-9a-f-]{36})\/promos$/.exec(path);
    if (cpromo && req.method === "POST") {
      const f = await formData(req);
      try {
        await promoAdd(db, mem.workspace_id, cpromo[1], String(f.text || ""), String(f.valid_until || ""));
        return redirect2("/competitors?msg=" + encodeURIComponent("Promotion logged."));
      } catch (e) {
        return redirect2("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    const oppact = /^\/opportunities\/([0-9a-f-]{36})\/(acted|dismissed|draft)$/.exec(path);
    if (oppact && req.method === "POST") {
      try {
        if (oppact[2] === "draft") {
          await opportunityDraftCampaign(db, mem.workspace_id, oppact[1]);
          return redirect2("/campaigns?msg=" + encodeURIComponent("Draft campaign ready - approve it when you are ready to send."));
        }
        await opportunityAction(db, mem.workspace_id, oppact[1], oppact[2]);
        return redirect2("/competitors?msg=" + encodeURIComponent("Marked."));
      } catch (e) {
        return redirect2("/competitors?msg=" + encodeURIComponent(String(e?.message || e)));
      }
    }
    if (path === "/support") {
      if (req.method === "POST") {
        const f = await formData(req);
        const q = String(f.question || "").trim();
        if (q) await supportHandle(db, mem.workspace_id, q.slice(0, 1e3));
        return redirect2("/support");
      }
      return html(await supportPage(db, user, mem));
    }
    if (path === "/wifi-card") {
      const bp = await db.query(`SELECT business_name FROM receptionist_businessprofile WHERE workspace_id=$1 AND is_active LIMIT 1`, [mem.workspace_id]);
      return html(layout("WiFi Card", wifiCardPage({ businessName: bp.rows[0]?.business_name || user._cur_ws || "", enquiryUrl: `${base}/f/${mem.workspace_id}` }), user));
    }
    if (path === "/revenue-mode" && req.method === "POST") {
      const f = await formData(req);
      const mode = f.mode === "draft" ? "draft" : "suggest";
      await db.query(`UPDATE receptionist_businessprofile SET revenue_mode=$1, updated_at=now() WHERE workspace_id=$2`, [mode, mem.workspace_id]);
      return redirect2("/competitors?msg=" + encodeURIComponent(mode === "draft" ? "Revenue Employee will prepare campaign drafts for strong opportunities. You still approve every send." : "Revenue Employee will suggest opportunities only."));
    }
    if (path === "/reviews") return html(await reviewsPage(db, user, mem, base, url.searchParams.get("msg") || ""));
    if (path === "/reviews/toggle" && req.method === "POST") {
      const cur = await db.query(`SELECT review_requests_enabled FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
      if (!cur.rows[0]) return redirect2("/reviews");
      await db.query(`UPDATE receptionist_businessprofile SET review_requests_enabled=$1, updated_at=now() WHERE workspace_id=$2`, [!cur.rows[0].review_requests_enabled, mem.workspace_id]);
      return redirect2("/reviews?msg=" + encodeURIComponent(!cur.rows[0].review_requests_enabled ? "Review requests are ON." : "Review requests are OFF."));
    }
    if (path === "/reviews/pipeline" && req.method === "POST") {
      const f = await formData(req);
      const id = await startPipeline(db, mem.workspace_id, f.contact_id || "", null);
      return redirect2("/reviews?msg=" + encodeURIComponent(id ? "Visit marked done - check-in goes out in 15 minutes." : "That customer has opted out, so nothing was scheduled."));
    }
    if (path === "/reviews/resolve" && req.method === "POST") {
      const f = await formData(req);
      const c = await db.query(`SELECT id FROM receptionist_contact WHERE id=$1 AND workspace_id=$2`, [f.contact_id || "", mem.workspace_id]);
      if (c.rows[0]) await resolveIssue(db, c.rows[0].id);
      return redirect2("/reviews?msg=" + encodeURIComponent("Issue marked resolved - the customer is back in the normal flow."));
    }
    if (path === "/reviews/run-due" && req.method === "POST") {
      const out = await runDueReviewEvents(db, env, base, mem.workspace_id);
      return redirect2("/reviews?msg=" + encodeURIComponent(`Ran ${out.due} due step(s): ` + Object.entries(out.results).map(([k, v]) => `${k} ${v}`).join(", ")));
    }
    if (path === "/reviews/destination" && req.method === "POST") {
      const f = await formData(req);
      if (!/^https:\/\//.test(f.google_review_url || "")) return redirect2("/reviews");
      const bp = await db.query(`SELECT 1 FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
      if (bp.rows[0]) {
        await db.query(`UPDATE receptionist_businessprofile SET google_review_url=$1, updated_at=now() WHERE workspace_id=$2`, [f.google_review_url, mem.workspace_id]);
      } else {
        await db.query(
          `INSERT INTO receptionist_businessprofile(id,workspace_id,business_name,industry,operating_hours,pricing_data,banking_details,payment_link_url,emergency_contact_phone,custom_rules,google_review_url,is_active,review_requests_enabled,service_reminder_days,revenue_mode,created_at,updated_at)
             VALUES($1,$2,$3,'','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'','','',$4,true,true,2,'reviews',now(),now())`,
          [crypto.randomUUID(), mem.workspace_id, mem.org_name, f.google_review_url]
        );
      }
      return redirect2("/reviews");
    }
    if (path === "/reviews/links" && req.method === "POST") {
      const f = await formData(req);
      const bp = await db.query(`SELECT google_review_url FROM receptionist_businessprofile WHERE workspace_id=$1 LIMIT 1`, [mem.workspace_id]);
      const dest = bp.rows[0]?.google_review_url;
      if (!dest) return redirect2("/onboarding");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const cUp = await client.query(
          `INSERT INTO receptionist_contact(id,workspace_id,wa_id,name,tags,needs_human,opted_out,zernio_conversation_id,issue_note,review_status,dietary_notes,is_vip,notes,total_spend,visit_count,created_at,updated_at)
             VALUES($1,$2,$3,$4,'[]'::jsonb,false,false,'','','new','',false,'',0,0,now(),now())
             ON CONFLICT (workspace_id, wa_id) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
             RETURNING id`,
          [crypto.randomUUID(), mem.workspace_id, (f.wa_id || "").trim(), (f.name || "").trim()]
        );
        const contactId = cUp.rows[0].id;
        const code = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
        await client.query(
          `INSERT INTO receptionist_reviewlink(id,workspace_id,contact_id,short_code,original_url,created_at)
             VALUES($1,$2,$3,$4,$5,now())`,
          [crypto.randomUUID(), mem.workspace_id, contactId, code, dest]
        );
        await client.query("COMMIT");
        return redirect2(`/reviews?created=${code}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/approvals") {
      const created = url.searchParams.get("done");
      return html(await approvalsPage(db, user, mem, created ? `Post ${STATUS_LABELS[created] || created}.` : ""));
    }
    const am = /^\/approvals\/([0-9a-f-]{36})\/(approve|reject)$/.exec(path);
    if (am && req.method === "POST") {
      const [, ppId, action] = am;
      const target = action === "approve" ? "approved" : "rejected";
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const cur = await client.query(
          `SELECT pp.id, pp.status, pp.post_id FROM composer_platform_post pp
             JOIN composer_post p ON p.id=pp.post_id
             WHERE pp.id=$1 AND p.workspace_id=$2 FOR UPDATE OF pp`,
          [ppId, mem.workspace_id]
        );
        const pp = cur.rows[0];
        if (!pp) {
          await client.query("ROLLBACK");
          return html(layout("Not found", `<p class="bad">Post not found.</p>`, user), 404);
        }
        const allowed = {
          pending_review: ["approved", "changes_requested", "rejected"],
          pending_client: ["approved", "changes_requested", "rejected"]
        };
        if (!(allowed[pp.status] || []).includes(target)) {
          await client.query("ROLLBACK");
          return redirect2(`/approvals?done=${encodeURIComponent("already " + pp.status)}`);
        }
        await client.query(`UPDATE composer_platform_post SET status=$1, updated_at=now() WHERE id=$2`, [target, ppId]);
        await client.query(
          `INSERT INTO approvals_approval_action(id,post_id,platform_post_id,user_id,action,comment,created_at)
             VALUES($1,$2,$3,$4,$5,'',now())`,
          [crypto.randomUUID(), pp.post_id, ppId, user.id, target]
        );
        await client.query("COMMIT");
        return redirect2(`/approvals?done=${target}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    if (path === "/billing") return html(await billingPage(db, user, mem, base, env));
    return html(layout("Not found", `<p class="bad">Nothing here yet.</p>`, user), 404);
  } catch (e) {
    return html(layout("Error", `<p class="bad">${esc2(String(e).slice(0, 300))}</p>`), 500);
  } finally {
    await db.end().catch(() => {
    });
  }
}
export {
  DRAFT_RULES,
  VERIFY_SQL,
  billingPage,
  dashboardPage,
  index_default as default,
  esc2 as esc,
  formData,
  getUser,
  html,
  json,
  landingPage,
  layout,
  md5,
  membership,
  navLinks,
  newSession,
  onboardingPage,
  pfUrl,
  pool,
  rateLimitExceeded,
  rateLimited,
  recommendPlan,
  redirect2 as redirect,
  sessionCookie,
  sha256hex
};
