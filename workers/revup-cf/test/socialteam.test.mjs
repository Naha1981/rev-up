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
test('registry: phase 1 live members are Researcher, Writer, Reviewer', () => {
  assert.deepEqual(LIVE_AGENTS.map(a => a.slug).sort(), ['researcher', 'reviewer', 'writer']);
  assert.equal(LIVE_AGENTS.length, 3);
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

// --- customer-facing copy rules ---
test('page: team framing, no AI lead, no vendor names, no forbidden wording', () => {
  const html = teamPageBody(
    [{ id: '11111111-1111-1111-1111-111111111111', title: 'Idea', angle: 'Angle', rationale: 'Why' }],
    [{ id: '22222222-2222-2222-2222-222222222222', caption: 'Caption body', hashtags: ['#x'], review_note: 'Checked: clean', status: 'ready' }]);
  assert.ok(html.includes('A full social media team for your business'));
  assert.ok(html.includes('Researcher') && html.includes('Writer') && html.includes('Reviewer'));
  assert.ok(html.includes('every post still waits for your approval'));
  assert.ok(html.includes('50-member team'));
  assert.ok(!/\bAI\b/.test(html), 'never the word AI in customer copy');
  for (const bad of ['Groq', 'OpenRouter', 'Zernio', 'FrontDesk', 'Radar', 'Not Yet Built', 'not yet built'])
    assert.ok(!html.includes(bad), bad);
  assert.ok(html.includes('/team/research'), 'research action');
  assert.ok(html.includes('/team/idea/11111111-1111-1111-1111-111111111111/write'), 'write action');
  assert.ok(html.includes('/team/piece/22222222-2222-2222-2222-222222222222/send'), 'send action');
});
test('page: XSS escaping on idea and piece fields', () => {
  const html = teamPageBody([{ id: '1', title: '<script>x</script>', angle: 'a', rationale: 'r' }], []);
  assert.ok(!html.includes('<script>x</script>'));
});
test('page: wider team lists departments without promising them live', () => {
  const html = teamPageBody([], []);
  assert.ok(html.includes('switches on as your business grows'));
  assert.ok(!html.includes('Coming soon') && !html.includes('Not Yet Built'));
});
