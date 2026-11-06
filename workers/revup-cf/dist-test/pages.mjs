// src/presets.ts
var INDUSTRIES = [["plumber", "Plumbing"], ["electrician", "Electrical"], ["security", "Security"], ["solar", "Solar / inverters"], ["auto-workshop", "Auto workshop"], ["panel-beater", "Panel beater / body shop"], ["auto-electrician", "Auto electrician"], ["mobile-mechanic", "Mobile mechanic"], ["towing", "Towing / roadside"], ["hvac", "Aircon / refrigeration"], ["roofing", "Roofing / waterproofing"], ["gates-access", "Gates / fencing / access control"], ["pest-control", "Pest control"], ["property-maintenance", "Property maintenance"], ["container-transport", "Container transport"], ["pool", "Pool services"], ["aesthetics", "Aesthetics / cosmetic clinic"], ["real-estate", "Real estate"], ["property-management", "Property management"], ["legal", "Law firm"], ["financial-broker", "Financial / insurance broker"], ["funeral", "Funeral services"], ["dental", "Dental practice"], ["restaurant", "Restaurant / cafe / takeaway"], ["catering", "Catering / food truck"], ["trades", "Trades (general building & repairs)"], ["general", "General local service"]];
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
function industryLabel(k) {
  const f = INDUSTRIES.find(([v]) => v === k);
  return f ? f[1] : PRESETS[k]?.label || k || "General local service";
}

// src/pages.ts
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
NEVER invent facts: no phone numbers, no prices, no guarantees, no qualifications, no years of experience, no claims the business did not state. Only use details given in this brief. For contact, always point to the button (e.g. "tap the button below"), never write a phone number or email in the copy.`;
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
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  let lastErr = "no model replied";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${env.GROQ_API_KEY}` },
          body: JSON.stringify({ model, temperature: 0.4, max_tokens: 3e3, reasoning_effort: "low", messages: [{ role: "user", content: prompt }] })
        });
        if (!resp.ok) {
          lastErr = `groq ${resp.status}`;
          continue;
        }
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content || "";
        const m = /\{[\s\S]*\}/.exec(text);
        if (!m) {
          lastErr = "no JSON in reply";
          continue;
        }
        const parsed = JSON.parse(m[0]);
        const raw = Array.isArray(parsed.sections) ? parsed.sections : [];
        const sections = raw.slice(0, 14).map((s) => ({
          type: String(s.type || "benefits").slice(0, 20),
          heading: String(s.heading || "").slice(0, 140),
          body: String(s.body || "").slice(0, 800),
          items: Array.isArray(s.items) ? s.items.slice(0, 8).map((x) => String(x).slice(0, 140)) : []
        })).filter((s) => s.heading || s.body);
        if (!sections.length) {
          lastErr = "empty sections";
          continue;
        }
        if (!sections.some((s) => s.type === "cta")) sections.push({ type: "cta", heading: "Ready when you are", body: "Send a message now and get a straight answer.", items: [] });
        return { seo_title: String(parsed.seo_title || brief.business).slice(0, 120), sections };
      } catch (e) {
        lastErr = String(e?.message || e);
      }
    }
  }
  throw new Error(lastErr);
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
.btn{display:inline-block;background:var(--b);color:#fff;padding:14px 28px;border-radius:12px;font-weight:700;text-decoration:none;font-size:1.05rem}
.btn:hover{filter:brightness(0.92);text-decoration:none}
section{margin:34px 0}
h2{font-size:1.35rem;letter-spacing:-0.01em;margin-bottom:10px}
ul{margin:10px 0 0 0;list-style:none}
li{padding:7px 0 7px 26px;position:relative}
li:before{content:"\\2713";position:absolute;left:0;color:var(--b);font-weight:700}
blockquote{border-left:3px solid var(--b);padding:6px 14px;margin:10px 0;color:#44403C;font-style:italic}
details{border:1px solid #E7E5E4;border-radius:10px;padding:10px 14px;margin:8px 0}
summary{font-weight:600;cursor:pointer}
.cta{background:var(--b);color:#fff;border-radius:16px;padding:30px 22px;text-align:center}
.cta .btn{background:#fff;color:var(--b)}
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
async function pagesListBody(db, mem, base, msg = "") {
  await ensurePageTables(db);
  const r = await db.query(`SELECT * FROM cf_page WHERE workspace_id=$1 AND status!='archived' ORDER BY created_at DESC LIMIT 100`, [mem.workspace_id]);
  const rows = r.rows.map((p) => `<tr>
<td><b>${pesc(p.title)}</b><br><span class="mut">${pesc(p.angle || p.industry)}</span></td>
<td>${p.status === "published" ? `<span class="ok">Live</span> <a href="${base}/p/${pesc(p.slug)}" target="_blank" rel="noopener">/p/${pesc(p.slug)}</a>` : `<span class="mut">${pesc(p.status)}</span>`}</td>
<td>${p.views} view${p.views === 1 ? "" : "s"} \xB7 ${p.cta_clicks} tap${p.cta_clicks === 1 ? "" : "s"}</td>
<td><a href="/pages/${p.id}">Open</a></td></tr>`).join("");
  return `${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">Landing pages <a class="btn btn-primary" style="float:right" href="/pages/new">New page</a></h2>
<p class="mut">One page per customer problem. Send each advert or campaign to the page that speaks to that exact problem - it converts far better than one general page.</p>
<table><tr><th>Page</th><th>Status &amp; link</th><th>Results</th><th></th></tr>${rows || '<tr><td colspan="4" class="mut">No pages yet. Create your first one.</td></tr>'}</table></div>`;
}
function newPageBody(err = "") {
  return `<div class="card"><h2 style="margin-top:0">New landing page</h2>
${err ? `<p class="bad">${pesc(err)}</p>` : ""}
<form method="post" action="/pages/new">
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
  return `${msg ? `<p class="ok">${pesc(msg)}</p>` : ""}
<div class="card"><h2 style="margin-top:0">${pesc(page.title)}</h2>
<p class="mut">Pain: ${pesc(page.angle)} \xB7 Status: ${pesc(page.status)}${page.status === "published" ? ` \xB7 Live at <a href="${base}/p/${pesc(page.slug)}" target="_blank" rel="noopener">${base}/p/${pesc(page.slug)}</a>` : ""}${page.source_url ? ` \xB7 Structure mirrored from ${pesc(page.source_url)}` : ""}</p>
<p>${page.views} views \xB7 ${page.cta_clicks} button taps</p>
<form method="post" action="/pages/${page.id}/publish" style="display:inline">${page.status === "published" ? "" : "<button>Publish</button>"}</form>
<form method="post" action="/pages/${page.id}/unpublish" style="display:inline">${page.status === "published" ? '<button class="link">Unpublish</button>' : ""}</form>
<form method="post" action="/pages/${page.id}/delete" style="display:inline" onsubmit="return confirm('Delete this page?')"><button class="link" style="color:#B91C1C">Delete</button></form>
</div>
<form method="post" action="/pages/${page.id}">
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
export {
  ctaTarget,
  ensurePageTables,
  fetchForMirror,
  generateSections,
  makeSlug,
  mirrorStructure,
  newPageBody,
  pageDetailBody,
  pagesListBody,
  renderPublicPage,
  servePublic
};
