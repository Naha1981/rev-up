import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAM_AGENTS, LIVE_AGENTS, TEAM_DEPARTMENTS,
  researchPrompt, parseIdeas, writerPrompt, parseDraft, reviewPrompt, parseReview,
  teamPageBody,
} from '../dist-test/socialteam.mjs';

// --- registry: exactly 50 members, 10 departments, 3 live in phase 1 ---
test('registry: 50 members across 10 departments', () => {
  assert.equal(TEAM_AGENTS.length, 50);
  assert.equal(TEAM_DEPARTMENTS.length, 10);
});
test('registry: all 50 members have bounded usable workflows', () => {
  assert.equal(LIVE_AGENTS.length, 50);
  assert.ok(LIVE_AGENTS.every(a => a.does.length > 30));
});
test('registry: every department has exactly 5 members', () => {
  for (const d of TEAM_DEPARTMENTS)
    assert.equal(TEAM_AGENTS.filter(a => a.dept === d).length, 5, d);
});

// --- prompts carry the fact rules and never vendor names ---
test('prompts: research/writer/review carry rules, no vendor names, no AI mention', () => {
  const ps = [researchPrompt('Sizwe Salon', 'beauty', []), writerPrompt('Sizwe Salon', { title: 't', angle: 'a' }), reviewPrompt('Sizwe Salon', 'caption')];
  for (const p of ps) {
    assert.ok(p.includes('Never invent'), 'fact rules');
    assert.ok(p.includes('South Africa'), 'local');
    for (const bad of ['groq', 'openrouter', 'zernio', 'FrontDesk', 'Radar']) assert.ok(!p.toLowerCase().includes(bad.toLowerCase()), bad);
  }
});

// --- parsers round-trip and reject junk ---
test('parseIdeas: valid JSON yields clean ideas', () => {
  const out = parseIdeas('noise {"ideas":[{"title":"Winter specials","angle":"warm up regulars","rationale":"seasonal"}]} tail');
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'Winter specials');
});
test('parseIdeas: rejects non-JSON and empty arrays', () => {
  assert.equal(parseIdeas('no json here'), null);
  assert.equal(parseIdeas('{"ideas":[]}'), null);
  assert.equal(parseIdeas('{"ideas":[{"title":"","angle":""}]}'), null);
});
test('parseDraft: caption + hashtags', () => {
  const d = parseDraft('{"caption":"Come hungry.","hashtags":["#local","#food"]}');
  assert.equal(d.caption, 'Come hungry.');
  assert.deepEqual(d.hashtags, ['#local', '#food']);
  assert.equal(parseDraft('{"hashtags":[]}'), null);
});
test('parseReview: pass boolean + note required', () => {
  assert.deepEqual(parseReview('{"pass":true,"note":"clean"}'), { pass: true, note: 'clean' });
  assert.equal(parseReview('{"pass":"yes","note":"clean"}'), null);
  assert.equal(parseReview('{"pass":true}'), null);
});

// --- customer-facing copy rules + premium low-text UI ---
test('page: compact chips, one primary button, tap-to-expand, no vendor names', () => {
  const ideas = Array.from({length: 5}, (_, n) => ({ id: `i${n}`, title: `Idea ${n}`, angle: 'Angle', rationale: 'Why' }));
  const pieces = [{ id: '22222222-2222-2222-2222-222222222222', caption: 'Line one\nLine two\nLine three\nLine four', hashtags: ['#x'], review_note: 'Checked: clean', status: 'ready' }];
  const html = teamPageBody(ideas, pieces);
  // three members as compact chips
  assert.ok(html.includes('tchip') && html.includes('Researcher') && html.includes('Writer') && html.includes('Reviewer'));
  // exactly one primary button (the research action); write/send live behind a tap
  const outside = html.replace(/<details[\s\S]*?<\/details>/g, '');
  assert.equal((outside.match(/<button>/g) || []).length, 1, 'only one always-visible primary button');
  assert.ok(html.includes('/team/research'));
  // 3 ideas max, titles only in the closed row, why-it-works behind a tap
  assert.equal((html.match(/class="tidea"/g) || []).length, 3, '3 ideas max');
  assert.ok(html.includes('<details class="tidea">'), 'idea expands on tap');
  assert.ok(html.includes('/team/idea/i0/write') && html.includes('/team/idea/i0/park'));
  // post card: 3-line clamp, expand on tap, reviewer note + send inside
  assert.ok(html.includes('-webkit-line-clamp:2'));
  assert.ok(html.includes('<details class="tpiece">'));
  assert.ok(html.includes('/team/piece/22222222-2222-2222-2222-222222222222/send'));
  // wider team collapsed to one line
  assert.ok(html.includes('/team/specialists'));
  assert.ok(!html.includes('switch on as you grow'));
  assert.ok(html.includes('You approve every post'));
  // no long explainer paragraphs / forbidden wording
  assert.ok(!html.includes('50-member team'));
  for (const bad of ['Groq', 'OpenRouter', 'Zernio', 'FrontDesk', 'Radar', 'Not Yet Built', 'not yet built'])
    assert.ok(!html.includes(bad), bad);
  assert.ok(!/\bAI\b/.test(html), 'never the word AI in customer copy');
});
test('page: XSS escaping on idea and piece fields', () => {
  const html = teamPageBody([{ id: '1', title: '<script>x</script>', angle: 'a', rationale: 'r' }], []);
  assert.ok(!html.includes('<script>x</script>'));
});
