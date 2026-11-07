// Social media team: a per-business team of specialist members that researches,
// writes and reviews social posts. The owner makes the final call on every post
// through the existing approvals queue. Phase 1 ships three members
// (Researcher, Writer, Reviewer); the registry below already names the full
// 50-member, 10-department team so the rest can switch on without a rebuild.
// Customer copy: "your social media team". Never vendor names, never lead with
// "AI" - these are team members working for the business.

import type { Pool } from "pg";
import { freeAiGenerate, rejectInventedPrices, FACT_RULES } from "./freeai";

export interface TeamAgentDef { slug: string; name: string; dept: string; live: boolean; does: string; }

const A = (slug: string, name: string, dept: string, does = ""): TeamAgentDef => ({ slug, name, dept, live: false, does });

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

function firstLine(caption: string): string {
  const t = String(caption || "").trim();
  return t.length > 150 ? t.slice(0, 150).trimEnd() + "…" : t;
}

export function teamPageBody(ideas: any[], pieces: any[], msg = ""): string {
  const chips = LIVE_AGENTS.map((a) =>
    `<span class="tchip"><span class="tav">${esc(a.name[0])}</span>${esc(a.name)}</span>`).join("");
  const ideaRows = ideas.slice(0, 3).map((i: any) => `
<details class="tidea"><summary><span class="tidea-t">${esc(i.title)}</span><span class="tchev">&#9656;</span></summary>
<div class="tidea-b"><p>${esc(i.angle)}</p><p class="mut">${esc(i.rationale)}</p>
<form class="inline" method="post" action="/team/idea/${i.id}/write"><button>Write this up</button></form>
<form class="inline" method="post" action="/team/idea/${i.id}/park"><button class="link">Park</button></form></div></details>`).join("");
  const pieceRows = pieces.map((p: any) => {
    const tags = Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "";
    const cls = p.status === "ready" || p.status === "sent_for_approval" ? "ok" : p.status === "returned" ? "warn" : "";
    return `
<details class="tpiece"><summary><span class="pill ${cls}">${esc(PIECE_LABEL[p.status] || p.status)}</span><span class="tpiece-t">${esc(firstLine(p.caption))}</span><span class="tchev">&#9656;</span></summary>
<div class="tpiece-b"><p style="white-space:pre-wrap">${esc(p.caption)}</p>${tags ? `<p class="mut">${esc(tags)}</p>` : ""}
<p class="mut">${esc(p.review_note)}</p>
${p.status === "ready" || p.status === "returned" ? `<form class="inline" method="post" action="/team/piece/${p.id}/send"><button>Send to approvals</button></form>` : ""}</div></details>`;
  }).join("");
  return `${PAGE_CSS}
${msg ? `<p class="ok">${esc(msg)}</p>` : ""}
<div class="tchips">${chips}</div>
<form method="post" action="/team/research"><button>Get fresh ideas</button></form>
${ideaRows ? `<p class="tlbl">Fresh ideas</p>${ideaRows}` : ""}
${pieceRows ? `<p class="tlbl">Posts</p>${pieceRows}` : ""}
<p class="tfoot">${TEAM_AGENTS.length - LIVE_AGENTS.length} more teammates switch on as you grow. You approve every post.</p>`;
}

export async function teamPage(db: Pool, ws: string, msg = ""): Promise<string> {
  const [ideas, pieces] = await Promise.all([
    db.query(`SELECT id, title, angle, rationale FROM socialteam_idea WHERE workspace_id=$1 AND status='fresh' ORDER BY created_at DESC LIMIT 3`, [ws]),
    db.query(`SELECT id, caption, hashtags, review_note, status FROM socialteam_piece WHERE workspace_id=$1 AND status <> 'archived' ORDER BY created_at DESC LIMIT 4`, [ws]),
  ]);
  return teamPageBody(ideas.rows, pieces.rows, msg);
}
