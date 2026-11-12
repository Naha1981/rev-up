// Social media team: a per-business team of specialist members that researches,
// writes and reviews social posts. The owner makes the final call on every post
// through the existing approvals queue. All named specialists have a bounded,
// evidence-driven workflow. They never claim external action from a draft.
// Customer copy: "your social media team". Never vendor names, never lead with
// "AI" - these are team members working for the business.

import type { Pool } from "pg";
import { freeAiGenerate, rejectInventedPrices, FACT_RULES } from "./freeai";

export interface TeamAgentDef { slug: string; name: string; dept: string; live: boolean; does: string; }

const A = (slug: string, name: string, dept: string, does = ""): TeamAgentDef => ({ slug, name, dept, live: true, does });

export const TEAM_AGENTS: TeamAgentDef[] = [
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
  A("publishing-checker", "Publishing Checker", "Content Operations"),
];

export const SPECIALIST_JOBS: Record<string, {task:string; output:string; needs:string}> = {
  "researcher": {
    "task": "Find three distinct post ideas from the business facts and supplied customer questions.",
    "output": "Three titled ideas, an angle and a reason for each.",
    "needs": "business"
  },
  "audience-mapper": {
    "task": "Map likely customer needs only from the supplied enquiries or audience notes. Do not invent demographics.",
    "output": "Customer groups, their stated needs and a useful message for each.",
    "needs": "brief"
  },
  "offer-analyst": {
    "task": "Assess the supplied offer against business facts and identify unclear terms or unsupported claims.",
    "output": "Offer strengths, missing terms and a safer offer draft.",
    "needs": "brief"
  },
  "local-scout": {
    "task": "Summarise supplied local evidence and link each opportunity to its source. No claim of live research.",
    "output": "Local opportunities with source references, or a missing-evidence checklist.",
    "needs": "external"
  },
  "question-collector": {
    "task": "Group the supplied customer questions, remove duplicates and propose plain answers using only the business facts.",
    "output": "Grouped FAQ questions and grounded answer drafts.",
    "needs": "brief"
  },
  "competitor-tracker": {
    "task": "Compare supplied competitor records with the business information. Do not claim you visited or monitored a site.",
    "output": "Evidence-linked competitor differences and actions to consider.",
    "needs": "external"
  },
  "ad-watcher": {
    "task": "Analyse supplied advert text or observations. Do not claim access to an ad library or targeting data.",
    "output": "Advert message breakdown, claims needing evidence and a distinct draft angle.",
    "needs": "external"
  },
  "price-spotter": {
    "task": "Compare only the explicitly supplied prices and explain differences. Never invent a price or margin.",
    "output": "Comparable price table in words, source references and missing comparison terms.",
    "needs": "external"
  },
  "review-reader": {
    "task": "Summarise the supplied review excerpts without inventing review counts or ratings.",
    "output": "Repeated strengths, complaints and response themes with evidence references.",
    "needs": "external"
  },
  "move-reporter": {
    "task": "Describe changes only where dated before-and-after evidence is supplied.",
    "output": "A dated change brief and its possible implication, or the exact missing comparison.",
    "needs": "external"
  },
  "video-scout": {
    "task": "Assess supplied video transcripts or notes for useful content ideas. Do not claim to have watched a video from its URL alone.",
    "output": "Video ideas tied to the supplied transcript or observations.",
    "needs": "external"
  },
  "format-analyst": {
    "task": "Break the supplied content example into its hook, structure, pacing and call to action.",
    "output": "A reusable format outline without copied wording.",
    "needs": "brief"
  },
  "sound-tracker": {
    "task": "Assess supplied audio notes or trend evidence. No claim of current sound popularity, licensing or platform access.",
    "output": "Sound-fit brief, rights questions and alternatives needing no licensed sound.",
    "needs": "external"
  },
  "watchtime-analyst": {
    "task": "Analyse only supplied watch-time or retention figures, never assume missing metrics.",
    "output": "Observed drop-off points, cautious hypotheses and a test plan.",
    "needs": "metrics"
  },
  "trend-catcher": {
    "task": "Distinguish supplied dated trend evidence from guesses and adapt only relevant facts.",
    "output": "Dated trend shortlist, source references and a safe adaptation.",
    "needs": "external"
  },
  "creator-scout": {
    "task": "Assess creators only from supplied profiles or evidence, not imagined followers or contact details.",
    "output": "Evidence-based creator shortlist and missing checks.",
    "needs": "external"
  },
  "collab-finder": {
    "task": "Match supplied collaboration candidates to the stated business goals. Do not contact anyone.",
    "output": "Fit comparison, collaboration concepts and checks before outreach.",
    "needs": "external"
  },
  "style-analyst": {
    "task": "Describe the supplied creator or brand sample without copying distinctive wording or inventing its performance.",
    "output": "Voice and structure notes plus an original business-specific adaptation.",
    "needs": "brief"
  },
  "growth-tracker": {
    "task": "Compare supplied dated audience/content measurements without making up growth.",
    "output": "Period comparison, limits and one measurable experiment.",
    "needs": "metrics"
  },
  "outreach-planner": {
    "task": "Plan a collaboration approach from supplied recipient facts. Do not invent contacts or send anything.",
    "output": "A personalised draft approach and permission/contact checks.",
    "needs": "brief"
  },
  "hook-writer": {
    "task": "Write five distinct opening lines for the supplied topic using only supported claims.",
    "output": "Five short hooks with the angle for each.",
    "needs": "brief"
  },
  "first-line-tester": {
    "task": "Compare supplied opening lines for clarity and fit. This is an editorial comparison, not a measured A/B test.",
    "output": "Ranked lines with reasons and a fair experiment plan.",
    "needs": "brief"
  },
  "curiosity-builder": {
    "task": "Create curiosity from a real customer question without clickbait or hidden essential terms.",
    "output": "Three honest curiosity-led openings and the fact each promises to answer.",
    "needs": "brief"
  },
  "painpoint-finder": {
    "task": "Identify customer problems only from supplied notes or evidence. No invented customer quotations.",
    "output": "Problems, evidence references and a helpful content response.",
    "needs": "brief"
  },
  "headline-polisher": {
    "task": "Improve supplied headlines without exaggerating claims or inventing urgency.",
    "output": "Before/after headlines and concise edit reasons.",
    "needs": "brief"
  },
  "trend-watcher": {
    "task": "Review supplied dated feed signals for relevance. Never represent old evidence as current.",
    "output": "Relevant signals, dates, sources and a content plan.",
    "needs": "external"
  },
  "format-librarian": {
    "task": "Organise the supplied content examples or topics into reusable format templates.",
    "output": "A small format library with when to use each format.",
    "needs": "brief"
  },
  "platform-specialist": {
    "task": "Adapt supplied content to the requested platform without inventing current platform rules, dimensions or limits.",
    "output": "Platform-ready copy variants and any current rules needing checking.",
    "needs": "brief"
  },
  "calendar-planner": {
    "task": "Plan content dates only from the requested date range, business hours and supplied events. Do not invent holidays.",
    "output": "An editorial calendar proposal, not a saved posting schedule.",
    "needs": "brief"
  },
  "seasonal-scout": {
    "task": "Use only the supplied dates, season and business context to plan timely content.",
    "output": "Seasonal ideas with the supplied date anchors and fact checks.",
    "needs": "brief"
  },
  "writer": {
    "task": "Write a plain social caption for the supplied topic, grounded in business facts.",
    "output": "One caption and optional hashtags, clearly a draft.",
    "needs": "brief"
  },
  "caption-writer": {
    "task": "Write two caption lengths for the supplied topic with no unsupported claims.",
    "output": "Short caption, longer caption and optional relevant hashtags.",
    "needs": "brief"
  },
  "story-builder": {
    "task": "Build a short story only from supplied events. Do not invent customers, quotations or outcomes.",
    "output": "Beginning, turning point and close, with missing facts marked.",
    "needs": "brief"
  },
  "cta-writer": {
    "task": "Write calls to action using only the real contact/action details supplied. Do not invent links.",
    "output": "Five direct calls to action appropriate to the stated goal.",
    "needs": "brief"
  },
  "editor": {
    "task": "Edit supplied copy for simple language and remove unsupported factual claims.",
    "output": "Edited copy and a list of facts needing confirmation.",
    "needs": "brief"
  },
  "repurpose-specialist": {
    "task": "Turn supplied original content into different useful pieces while preserving its facts.",
    "output": "Three distinct repurposed drafts with formats labelled.",
    "needs": "brief"
  },
  "series-planner": {
    "task": "Plan a coherent content series from the supplied topic and business facts.",
    "output": "Episode topics, purpose and next-step links between episodes.",
    "needs": "brief"
  },
  "format-adapter": {
    "task": "Adapt the supplied draft to the requested format without inventing new facts.",
    "output": "A format-specific draft plus any production inputs still needed.",
    "needs": "brief"
  },
  "distribution-planner": {
    "task": "Plan distribution to the supplied owned channels and permitted audiences. Never send or post.",
    "output": "Channel plan, owner checks and a practical order of work.",
    "needs": "brief"
  },
  "booster": {
    "task": "Suggest organic improvements to supplied content and results. No paid ad spend, guaranteed reach or fake engagement.",
    "output": "A bounded organic improvement plan and measurement checks.",
    "needs": "brief"
  },
  "performance-reporter": {
    "task": "Report only supplied actual counts and statuses. Drafts or clicks are not sales.",
    "output": "A plain performance report with source labels, period and limits.",
    "needs": "metrics"
  },
  "number-cruncher": {
    "task": "Calculate comparisons only from supplied figures, show arithmetic and avoid invented denominators.",
    "output": "Calculations, inputs used and missing measurements.",
    "needs": "metrics"
  },
  "insight-writer": {
    "task": "Explain the supplied figures cautiously, separating observations from hypotheses.",
    "output": "What happened, what it may mean and a testable next step.",
    "needs": "metrics"
  },
  "digest-builder": {
    "task": "Build a concise weekly digest from supplied dated records. Do not claim a week when no period is provided.",
    "output": "Wins, work awaiting approval, failures and next actions with period limits.",
    "needs": "metrics"
  },
  "wins-tracker": {
    "task": "Identify verified progress from supplied statuses, never count estimated revenue or test activity as sales.",
    "output": "Evidence-backed wins and the exact proof still needed for uncertain outcomes.",
    "needs": "metrics"
  },
  "reviewer": {
    "task": "Review the supplied draft for unsupported facts, tone, simple language, consent and business rules.",
    "output": "Pass/change recommendation with specific corrections.",
    "needs": "brief"
  },
  "scheduler": {
    "task": "Prepare a posting schedule from supplied dates and approved content only. Do not claim anything was scheduled.",
    "output": "A proposed schedule and the exact approval/scheduling steps for the owner.",
    "needs": "brief"
  },
  "approval-chaser": {
    "task": "Summarise supplied pending-review records and draft one polite reminder. Do not send it.",
    "output": "Pending items, owner decisions and a reminder draft.",
    "needs": "operations"
  },
  "asset-organizer": {
    "task": "Organise supplied asset descriptions by campaign/use and identify missing assets. Do not claim to inspect an image from its name.",
    "output": "A naming/tagging plan and a production checklist.",
    "needs": "brief"
  },
  "publishing-checker": {
    "task": "Check supplied post statuses and failure records. A scheduled/approved status is not published.",
    "output": "Published/awaiting/failed checklist and safe next steps without retrying a post.",
    "needs": "operations"
  }
};
for(const agent of TEAM_AGENTS) agent.does=SPECIALIST_JOBS[agent.slug].task;

export const LIVE_AGENTS = TEAM_AGENTS.filter((a) => a.live);
export const TEAM_DEPARTMENTS = [...new Set(TEAM_AGENTS.map((a) => a.dept))];

// ---------- schema ----------
let ensured: Promise<void> | null = null;
export function ensureSocialTeamSchema(db: Pool): Promise<void> {
  if (!ensured) ensured = (async () => {
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
  })().catch((e) => { ensured = null; throw e; });
  return ensured;
}

// ---------- prompts + parsers (pure, unit-tested) ----------
export interface Idea { title: string; angle: string; rationale: string; }
export interface Draft { caption: string; hashtags: string[]; }
export interface Review { pass: boolean; note: string; }

export function researchPrompt(business: string, industry: string, avoid: string[]): string {
  return `Business: ${business} (${industry || "local business"}, South Africa).
You are the business's content researcher. Suggest 5 social media post ideas for this business - topics real local customers care about, not generic filler.
${avoid.length ? `Already suggested (do not repeat): ${avoid.join("; ")}.` : ""}
${FACT_RULES}
Reply with JSON only: {"ideas": [{"title": "short title", "angle": "the specific angle to take", "rationale": "why this works for this business"}]}`;
}

export function parseIdeas(text: string): Idea[] | null {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const ideas = Array.isArray(p.ideas) ? p.ideas : [];
    const out = ideas.map((i: any) => ({
      title: String(i.title || "").trim().slice(0, 160),
      angle: String(i.angle || "").trim().slice(0, 400),
      rationale: String(i.rationale || "").trim().slice(0, 400),
    })).filter((i: Idea) => i.title && i.angle);
    return out.length ? out : null;
  } catch { return null; }
}

export function writerPrompt(business: string, idea: Idea): string {
  return `Business: ${business} (South Africa).
You are the business's social media writer. Write one social media post from this idea:
Title: ${idea.title}
Angle: ${idea.angle}
Rules: write for a real local business. NEVER invent statistics, customer testimonials, review counts, awards, or claims the business could not verify. No fake urgency. South African English. Keep the caption under 900 characters including hashtags. ${FACT_RULES}
Reply with JSON only: {"caption": "...", "hashtags": ["#tag", ...]}`;
}

export function parseDraft(text: string): Draft | null {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const caption = String(p.caption || "").trim();
    const hashtags = Array.isArray(p.hashtags) ? p.hashtags.map((h: any) => String(h).trim()).filter(Boolean).slice(0, 15) : [];
    return caption ? { caption, hashtags } : null;
  } catch { return null; }
}

export function reviewPrompt(business: string, caption: string): string {
  return `Business: ${business} (South Africa).
You are the business's content reviewer. Check this draft social media post before the owner sees it:
---
${caption}
---
Check: (1) no invented facts, statistics, testimonials, prices or claims the business could not verify; (2) plain simple English a customer reads in one pass; (3) sounds like the business, warm and professional; (4) no fake urgency, no mention of technology vendors or that software wrote it.
${FACT_RULES}
Reply with JSON only: {"pass": true or false, "note": "one short sentence for the owner - what you checked, or what must change"}`;
}

export function parseReview(text: string): Review | null {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]);
    const note = String(p.note || "").trim().slice(0, 300);
    if (typeof p.pass !== "boolean" || !note) return null;
    return { pass: p.pass, note };
  } catch { return null; }
}

// ---------- pipeline ----------
type Env = { GROQ_API_KEY?: string; OPENROUTER_API_KEY?: string; OPENROUTER_FREE_ONLY?: string; OPENROUTER_DATA_USE_APPROVED?: string };
const BUSY = "the team is busy right now - try again shortly";

export async function runResearcher(env: Env, business: string, industry: string, avoid: string[]): Promise<Idea[]> {
  const prompt = researchPrompt(business, industry, avoid);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1800, temperature: 0.5 }, rejectInventedPrices(prompt, parseIdeas));
  if (!r) throw new Error(BUSY);
  return r.value.slice(0, 5);
}

export async function runWriter(env: Env, business: string, idea: Idea): Promise<Draft> {
  const prompt = writerPrompt(business, idea);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 1500, temperature: 0.3 }, rejectInventedPrices(prompt, parseDraft));
  if (!r) throw new Error(BUSY);
  return r.value;
}

export async function runReviewer(env: Env, business: string, caption: string): Promise<Review> {
  const prompt = reviewPrompt(business, caption);
  const r = await freeAiGenerate(env, prompt, { maxTokens: 300, temperature: 0.1 }, parseReview);
  if (!r) throw new Error(BUSY);
  return r.value;
}

// Writer -> Reviewer -> at most one Writer rewrite with the review note.
// The owner always makes the final call in the approvals queue after this.
export async function producePiece(env: Env, db: Pool, ws: string, pieceId: string, business: string, idea: Idea): Promise<void> {
  let draft = await runWriter(env, business, idea);
  let review = await runReviewer(env, business, draft.caption);
  if (!review.pass) {
    draft = await runWriter(env, business, { ...idea, angle: idea.angle + " (reviewer note to fix: " + review.note + ")" });
    review = await runReviewer(env, business, draft.caption);
  }
  await db.query(
    `UPDATE socialteam_piece SET caption=$1, hashtags=$2::jsonb, review_note=$3, status=$4, updated_at=now() WHERE id=$5 AND workspace_id=$6`,
    [draft.caption, JSON.stringify(draft.hashtags), (review.pass ? "Checked: " : "Checked, needs your eye: ") + review.note, review.pass ? "ready" : "returned", pieceId, ws]);
}

// ---------- page ----------
// Premium low-text UI, mobile first: titles only, everything else behind a tap.
// <details>/<summary> gives tap-to-expand with no JavaScript.
const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const PAGE_CSS = `<style>
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

const PIECE_LABEL: Record<string, string> = {
  ready: "ready", returned: "your call", sent_for_approval: "in approvals", in_review: "writing",
};

export function pieceReviewState(p: any): { label: string; note: string; href: string } {
  if (p.status !== "sent_for_approval" && p.status !== "draft_saved")
    return { label: PIECE_LABEL[p.status] || p.status, note: "", href: "" };
  if (!p.linked_post_id) return {
    label: "handoff recorded", href: "/posts",
    note: "This earlier handoff has no linked approval state. Check saved posts; it is not confirmed to be waiting for review.",
  };
  const statuses: string[] = Array.isArray(p.platform_statuses) ? [...new Set<string>(p.platform_statuses)] : [];
  if (!statuses.length) return {
    label: "saved draft", href: "/posts",
    note: "Saved as a draft with no channel selected. Connect a social account, then submit the saved post for review.",
  };
  return {
    label: statuses.map(s => s === "pending_review" ? "in approvals" : s.replaceAll("_", " ")).join(", "),
    href: statuses.includes("pending_review") ? "/approvals" : "/posts",
    note: "Current status of the linked saved post. Nothing is published by this page.",
  };
}

function firstLine(caption: string): string {
  const t = String(caption || "").trim();
  return t.length > 150 ? t.slice(0, 150).trimEnd() + "…" : t;
}

export function teamPageBody(ideas: any[], pieces: any[], msg = ""): string {
  const chips = LIVE_AGENTS.filter(a=>["researcher","writer","reviewer"].includes(a.slug)).map((a) =>
    `<span class="tchip"><span class="tav">${esc(a.name[0])}</span>${esc(a.name)}</span>`).join("");
  const ideaRows = ideas.slice(0, 3).map((i: any) => `
<details class="tidea"><summary><span class="tidea-t">${esc(i.title)}</span><span class="tchev">&#9656;</span></summary>
<div class="tidea-b"><p>${esc(i.angle)}</p><p class="mut">${esc(i.rationale)}</p>
<form class="inline" method="post" action="/team/idea/${i.id}/write"><button>Write this up</button></form>
<form class="inline" method="post" action="/team/idea/${i.id}/park"><button class="link">Park</button></form></div></details>`).join("");
  const pieceRows = pieces.map((p: any) => {
    const tags = Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "";
    const state = pieceReviewState(p);
    const cls = p.status === "ready" || state.label === "in approvals" ? "ok" : p.status === "returned" || state.label === "handoff recorded" ? "warn" : "";
    return `
<details class="tpiece"><summary><span class="pill ${cls}">${esc(state.label)}</span><span class="tpiece-t">${esc(firstLine(p.caption))}</span><span class="tchev">&#9656;</span></summary>
<div class="tpiece-b"><p style="white-space:pre-wrap">${esc(p.caption)}</p>${tags ? `<p class="mut">${esc(tags)}</p>` : ""}
<p class="mut">${esc(p.review_note)}</p>
${state.note ? `<p class="mut">${esc(state.note)}</p><p><a href="${state.href}">${state.href === "/approvals" ? "Review linked post" : "Open saved posts"}</a></p>` : ""}
${p.status === "ready" || p.status === "returned" ? `<form class="inline" method="post" action="/team/piece/${p.id}/send"><button>Send to approvals</button></form>` : ""}</div></details>`;
  }).join("");
  return `${PAGE_CSS}
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="tchips">${chips}</div>
<form method="post" action="/team/research"><button>Get fresh ideas</button></form><p><a href="/team/specialists">Work with a specialist</a></p>
${ideaRows ? `<p class="tlbl">Fresh ideas</p>${ideaRows}` : ""}
${pieceRows ? `<p class="tlbl">Posts</p>${pieceRows}` : ""}
<p class="tfoot">All 50 specialists are available for evidence-based briefs. You approve every post.</p>`;
}

export async function teamPage(db: Pool, ws: string, msg = ""): Promise<string> {
  const [ideas, pieces] = await Promise.all([
    db.query(`SELECT id, title, angle, rationale FROM socialteam_idea WHERE workspace_id=$1 AND status='fresh' ORDER BY created_at DESC LIMIT 3`, [ws]),
    db.query(`SELECT s.id, s.caption, s.hashtags, s.review_note, s.status,
      p.id AS linked_post_id,
      (SELECT array_agg(DISTINCT pp.status ORDER BY pp.status) FROM composer_platform_post pp WHERE pp.post_id=p.id) AS platform_statuses
      FROM socialteam_piece s
      LEFT JOIN LATERAL (SELECT id FROM composer_post WHERE workspace_id=s.workspace_id AND internal_notes='socialteam_piece:' || s.id::text ORDER BY created_at DESC LIMIT 1) p ON true
      WHERE s.workspace_id=$1 AND s.status <> 'archived' ORDER BY s.created_at DESC LIMIT 4`, [ws]),
  ]);
  return teamPageBody(ideas.rows, pieces.rows, msg);
}
