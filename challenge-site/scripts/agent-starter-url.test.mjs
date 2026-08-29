import assert from 'node:assert/strict';
import test from 'node:test';

/** Mirrors buildAgentHref in src/lib/agent-starter.ts */
function buildAgentHref(input) {
  const params = new URLSearchParams();
  if (input.dp?.trim()) {
    const dp = input.dp.trim();
    params.set('dp', dp.toUpperCase().startsWith('DP') ? dp.toUpperCase() : `DP${dp}`);
  }
  if (input.intent?.trim()) params.set('intent', input.intent.trim());
  if (input.starter?.trim()) params.set('starter', input.starter.trim());
  if (input.slug?.trim()) params.set('slug', input.slug.trim());
  if (input.thread?.trim()) params.set('thread', input.thread.trim());
  if (input.create?.trim()) params.set('create', input.create.trim());
  if (input.from?.trim()) params.set('from', input.from.trim());
  if (input.wg?.trim()) params.set('wg', input.wg.trim());
  const qs = params.toString();
  return qs ? `/agent?${qs}` : '/agent';
}

test('submit_problem uses short dp + intent URL', () => {
  assert.equal(
    buildAgentHref({ dp: 'DP12', intent: 'submit_problem' }),
    '/agent?dp=DP12&intent=submit_problem',
  );
});

test('companion uses dp only', () => {
  assert.equal(buildAgentHref({ dp: 'dp12' }), '/agent?dp=DP12');
});

test('ai-human-agency pathway uses starter slug only', () => {
  assert.equal(
    buildAgentHref({ starter: 'ai-human-agency' }),
    '/agent?starter=ai-human-agency',
  );
});

test('alliance patch uses dp intent and org slug', () => {
  assert.equal(
    buildAgentHref({ dp: 'DP12', intent: 'alliance_patch', slug: 'project-liberty' }),
    '/agent?dp=DP12&intent=alliance_patch&slug=project-liberty',
  );
});

test('short URLs avoid embedding prompt text', () => {
  const href = buildAgentHref({ dp: 'DP12', intent: 'submit_problem' });
  assert.equal(href.includes('prompt='), false);
  assert.ok(href.length < 80);
});
