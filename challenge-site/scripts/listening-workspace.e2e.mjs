/**
 * Listening workspace, Phase 1 acceptance (spec §15): two signed-in participants contribute at the same time and
 * both see updates without losing their work; every substantive card has a source or is labelled a suggestion.
 *
 * Runs against a server you start (local build on a scratch database, or staging). It signs browsers in by minting
 * the site's own session cookie, so the server must use the same AUTH_SESSION_SECRET you pass here; use a throwaway
 * secret with a local server, never a real one.
 *
 *   LW_BASE=http://127.0.0.1:3941 LW_SESSION_SECRET=<test secret> LW_PAGE=/listening/meta-governance-2026-11-16 \
 *   LW_FACILITATOR_EMAIL=facilitator.test@example.org LW_SHOTS=<dir> PLAYWRIGHT_DIR=<dir with node_modules/playwright-core> \
 *   node scripts/listening-workspace.e2e.mjs
 *
 * playwright-core is not a site dependency: install it anywhere and point PLAYWRIGHT_DIR at that folder.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { EncryptJWT } from 'jose';

const BASE = process.env.LW_BASE || 'http://127.0.0.1:3941';
const PAGE = process.env.LW_PAGE || '/listening/meta-governance-2026-11-16';
const SLUG = process.env.LW_SLUG || 'meta-governance-2026-11-16';
const SECRET = process.env.LW_SESSION_SECRET || '';
const FAC_EMAIL = process.env.LW_FACILITATOR_EMAIL || 'facilitator.test@example.org';
const SHOTS = process.env.LW_SHOTS || '';
if (!SECRET) throw new Error('LW_SESSION_SECRET is required (the test server’s throwaway secret)');

const req = createRequire(process.env.PLAYWRIGHT_DIR ? path.join(process.env.PLAYWRIGHT_DIR, 'x.js') : import.meta.url);
const { chromium } = req('playwright-core');

const key = /^[0-9a-f]{64}$/i.test(SECRET) ? Buffer.from(SECRET, 'hex') : createHash('sha256').update(SECRET).digest();
async function sessionCookie(user) {
  const value = await new EncryptJWT({ verifierId: `test:${user.id}`, idToken: 'test-token', ...user })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('3600s')
    .encrypt(key);
  const url = new URL(BASE);
  return { name: 'hermes_session', value, domain: url.hostname, path: '/', httpOnly: true, sameSite: 'Lax' };
}

const USERS = {
  a: { userId: 'lw-test-a', username: 'test-a', displayName: 'Test Participant A', email: 'participant.a@example.org' },
  b: { userId: 'lw-test-b', username: 'test-b', displayName: 'Test Participant B', email: 'participant.b@example.org' },
  f: { userId: 'lw-test-f', username: 'test-f', displayName: 'Test Facilitator', email: FAC_EMAIL },
  c: { userId: 'lw-test-c', username: 'test-c', displayName: 'Test Participant C', email: 'participant.c@example.org' },
  d: { userId: 'lw-test-d', username: 'test-d', displayName: 'Test Participant D', email: 'participant.d@example.org' },
};

const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`PASS ${name} (${Date.now() - t0} ms)`);
  } catch (err) {
    results.push({ name, ok: false, error: String(err && err.message) });
    console.log(`FAIL ${name}: ${err && err.stack}`);
  }
}

async function shot(page, name, opts = {}) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), ...opts });
}

async function openAs(browser, who, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  if (who) {
    const id = USERS[who].userId;
    await context.addCookies([await sessionCookie({ ...USERS[who], id, userId: id })]);
  }
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[${who}] pageerror: ${e.message}`));
  await page.goto(`${BASE}${PAGE}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="stream-status"][data-status="live"]').waitFor({ timeout: 30000 });
  return { context, page };
}

async function api(page, type, payload) {
  return page.evaluate(
    async ({ slug, type, payload }) => {
      const r = await fetch(`/api/listening/${slug}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    },
    { slug: SLUG, type, payload },
  );
}

async function snapshot(page) {
  return page.evaluate(async (slug) => (await fetch(`/api/listening/${slug}`)).json(), SLUG);
}

/** Post through the real composer (meeting target unless a target was chosen). */
async function compose(page, kind, text) {
  await page.locator(`[data-testid="compose-${kind}"]`).click();
  await page.locator('[data-testid="composer-text"]').fill(text);
  await page.locator('[data-testid="composer-submit"]').click();
}

const run = randomUUID().slice(0, 6);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const A = await openAs(browser, 'a');
  const B = await openAs(browser, 'b');
  const F = await openAs(browser, 'f');
  const C = await openAs(browser, 'c');

  await step('roles resolve on the server (participant, participant, administrator)', async () => {
    assert.equal((await snapshot(A.page)).viewer.role, 'participant');
    assert.equal((await snapshot(B.page)).viewer.role, 'participant');
    assert.equal((await snapshot(F.page)).viewer.role, 'administrator');
  });

  await step('every substantive card has a source or a suggestion label (record and page)', async () => {
    const snap = await snapshot(A.page);
    assert.ok(snap.cards.length >= 60, `expected the imported cards, got ${snap.cards.length}`);
    const bad = snap.cards.filter((c) => {
      const r = c.revs.find((x) => x.rev === c.currentRev);
      return !(r.sourceRefs.length > 0 || ['claude_synthesis', 'added_after_meeting'].includes(r.label));
    });
    assert.deepEqual(bad.map((c) => c.id), []);
    const cards = A.page.locator('[data-testid="group-topics"] [data-testid="card"], [data-testid="group-summary"] [data-testid="card"], [data-testid="group-open"] [data-testid="card"]');
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const sourced = await card.locator(':scope > div [data-testid="card-sources"] button').count();
      const label = (await card.locator(':scope > div > [data-testid="card-label"]').allTextContents()).join(' ');
      assert.ok(sourced > 0 || /Claude synthesis|Proposal added after the meeting/.test(label), `card ${i} has neither a source nor a suggestion label`);
    }
    const interim = A.page.locator('[data-testid="card-title"]', { hasText: 'Interim council now' });
    await interim.first().waitFor();
    const t = await interim.first().textContent();
    assert.ok(t.includes('Phahsa'), 'Phahsa named exactly');
  });

  await A.page.locator('[data-testid="listening-workspace"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await A.page.evaluate(() => window.scrollBy(0, -70));
  await shot(A.page, '01-desktop-workspace', { fullPage: false });

  await step('A keeps draft, open thread, scroll and the meeting stage while B posts', async () => {
    const p = A.page;
    // Open a thread on the first topic, scroll the page to it, open and scroll the transcript drawer.
    const topic = p.locator('[data-testid="group-topics"] > div > [data-testid="card"]').first();
    await topic.locator(':scope > div > [data-testid="card-thread-toggle"]').click();
    await topic.locator(':scope > [data-testid="card-thread"]').waitFor();
    await p.locator('[data-testid="toggle-transcript"]').click();
    await p.locator('[data-testid="transcript-list"]').evaluate((el) => (el.scrollTop = 1500));
    await p.locator('[data-testid="compose-comment"]').click();
    await p.locator('[data-testid="composer-text"]').fill(`Draft from A, not posted yet (${run})`);
    await topic.scrollIntoViewIfNeeded();
    await p.evaluate(() => window.scrollBy(0, 120));
    await p.locator('[data-testid="meeting-stage"]').evaluate((el) => (el.dataset.marker = 'mounted-once'));
    const before = await p.evaluate(() => ({
      y: window.scrollY,
      t: document.querySelector('[data-testid="transcript-list"]').scrollTop,
    }));

    const text = `Comment from B (${run})`;
    await compose(B.page, 'comment', text);
    await p.locator('[data-testid="feed-list"]', { hasText: text }).waitFor({ timeout: 15000 });

    assert.equal(await p.locator('[data-testid="composer-text"]').inputValue(), `Draft from A, not posted yet (${run})`);
    assert.equal(await topic.locator(':scope > [data-testid="card-thread"]').count(), 1, 'thread still open');
    const after = await p.evaluate(() => ({
      y: window.scrollY,
      t: document.querySelector('[data-testid="transcript-list"]').scrollTop,
    }));
    assert.ok(Math.abs(after.y - before.y) <= 2, `page scroll moved ${before.y} -> ${after.y}`);
    assert.ok(Math.abs(after.t - before.t) <= 2, `transcript scroll moved ${before.t} -> ${after.t}`);
    assert.equal(await p.locator('[data-testid="meeting-stage"]').getAttribute('data-marker'), 'mounted-once', 'meeting stage was remounted');
    await shot(p, '02-a-draft-kept-after-b-posts', { fullPage: false });
  });

  await step('B keeps a draft while A asks a shared question about a card; B sees it queued for Claude', async () => {
    await B.page.locator('[data-testid="compose-suggested_option"]').click();
    await B.page.locator('[data-testid="composer-text"]').fill(`B is still writing an option (${run})`);
    const opt = A.page.locator('[data-testid="card"][data-card-type="proposed_option"]').first();
    await opt.locator(':scope > div > [data-testid="card-respond"]').click();
    await A.page.locator('[data-testid="compose-question"]').click();
    await A.page.locator('[data-testid="questions-shared-note"]').waitFor();
    await A.page.locator('[data-testid="composer-text"]').fill(`Question from A about this option (${run})`);
    await A.page.locator('[data-testid="composer-submit"]').click();
    const item = B.page.locator('[data-testid="queue-item"]', { hasText: `Question from A about this option (${run})` });
    await item.waitFor({ timeout: 15000 });
    assert.match(await item.locator('[data-testid="queue-status"]').textContent(), /Queued for Claude/);
    assert.equal(await B.page.locator('[data-testid="composer-text"]').inputValue(), `B is still writing an option (${run})`);
    await B.page.locator('[data-testid="listening-workspace"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await item.scrollIntoViewIfNeeded();
    await shot(B.page, '03-b-sees-question-queued', { fullPage: false });
  });

  await step('A and B post at the same moment; both see both', async () => {
    const ta = `Simultaneous from A (${run})`;
    const tb = `Simultaneous from B (${run})`;
    await A.page.locator('[data-testid="composer-target"] button').click().catch(() => {});
    await A.page.locator('[data-testid="compose-comment"]').click();
    await A.page.locator('[data-testid="composer-text"]').fill(ta);
    await B.page.locator('[data-testid="compose-comment"]').click();
    await B.page.locator('[data-testid="composer-text"]').fill(tb);
    await Promise.all([
      A.page.locator('[data-testid="composer-submit"]').click(),
      B.page.locator('[data-testid="composer-submit"]').click(),
    ]);
    for (const p of [A.page, B.page]) {
      await p.locator('[data-testid="feed-list"]', { hasText: ta }).waitFor({ timeout: 15000 });
      await p.locator('[data-testid="feed-list"]', { hasText: tb }).waitFor({ timeout: 15000 });
      assert.equal(await p.locator('[data-testid="contribution"]', { hasText: ta }).count(), 1);
      assert.equal(await p.locator('[data-testid="contribution"]', { hasText: tb }).count(), 1);
    }
  });

  await step('streams recycle and reconnect from the cursor: nothing missed, nothing twice', async () => {
    // Run the server with LISTENING_STREAM_MAX_MS=4000: every stream ends after 4 s and the browser
    // reconnects with Last-Event-ID, so posts land before, during and after reconnects.
    const connects = async () => Number(await A.page.locator('[data-testid="stream-status"]').getAttribute('data-connects'));
    const n0 = await connects();
    const texts = [];
    for (let i = 0; i < 5; i++) {
      const t = `Across reconnects ${i} (${run})`;
      texts.push(t);
      await compose(C.page, 'comment', t);
      await C.page.locator('[data-testid="feed-list"]', { hasText: t }).waitFor();
      await C.page.waitForTimeout(1500);
    }
    await A.page.locator('[data-testid="feed-list"]', { hasText: texts[4] }).waitFor({ timeout: 30000 });
    for (const t of texts) assert.equal(await A.page.locator('[data-testid="contribution"]', { hasText: t }).count(), 1, t);
    const n1 = await connects();
    console.log(`    reconnects during this step: ${n1 - n0}`);
    assert.ok(n1 - n0 >= 2 || !process.env.LW_EXPECT_RECYCLE, `expected reconnects, saw ${n1 - n0}`);
  });

  await step('rate limit: a 7th contribution within a minute is refused with a clear message', async () => {
    const D = await openAs(browser, 'd');
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await api(D.page, 'contribution.add', { kind: 'comment', body: `Rate test ${i} (${run})` })).status);
    assert.deepEqual(statuses, [201, 201, 201, 201, 201, 201, 429]);
    await D.page.locator('[data-testid="compose-comment"]').click();
    await D.page.locator('[data-testid="composer-text"]').fill(`Kept after a refusal (${run})`);
    await D.page.locator('[data-testid="composer-submit"]').click();
    await D.page.locator('[data-testid="composer-msg"]', { hasText: 'very quickly' }).waitFor();
    assert.equal(await D.page.locator('[data-testid="composer-text"]').inputValue(), `Kept after a refusal (${run})`);
    await D.context.close();
  });

  await step('stream resumes from Last-Event-ID with no duplicates', async () => {
    const snap = await snapshot(A.page);
    const from = snap.cursor - 3;
    const ids = await A.page.evaluate(
      async ({ slug, from }) =>
        new Promise((resolve) => {
          const seen = [];
          const es = new EventSource(`/api/listening/${slug}/stream?cursor=${from}`);
          es.addEventListener('update', (e) => seen.push(Number(e.lastEventId)));
          es.addEventListener('ready', () => {
            es.close();
            resolve(seen);
          });
        }),
      { slug: SLUG, from },
    );
    assert.deepEqual(ids, [from + 1, from + 2, from + 3]);
  });

  await step('server refuses: signed out, participant moderation, council phase, reserved role, stale revision', async () => {
    const anon = await browser.newContext();
    const ap = await anon.newPage();
    await ap.goto(`${BASE}${PAGE}`, { waitUntil: 'domcontentloaded' });
    assert.equal((await api(ap, 'contribution.add', { kind: 'comment', body: 'x' })).status, 401);
    await anon.close();
    const snap = await snapshot(A.page);
    const q = snap.contributions.find((c) => c.kind === 'question');
    assert.equal((await api(A.page, 'moderation.add', { contributionId: q.id, action: 'defer' })).status, 403);
    assert.equal((await api(A.page, 'phase.set', { to: 'live' })).status, 403);
    assert.equal((await api(F.page, 'phase.set', { to: 'council_screening' })).status, 403);
    assert.equal((await api(F.page, 'role.grant', { userId: 'someone', role: 'council' })).status, 403);
    assert.equal((await api(F.page, 'card.create', { cardType: 'proposed_option', title: 'No source, no label' })).status, 400);
    assert.equal((await api(F.page, 'card.create', { cardType: 'confirmed_outcome', title: 'x', label: 'council_decision' })).status, 403);
    const card = snap.cards.find((c) => c.cardType === 'proposed_option');
    const cur = card.revs.find((r) => r.rev === card.currentRev);
    const body = { cardId: card.id, title: `${cur.title} (wording clarified)`, body: cur.body, label: cur.label, sourceRefs: cur.sourceRefs, reason: 'Test: clarify wording' };
    const ok = await api(F.page, 'card.revise', { ...body, baseRev: card.currentRev });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const stale = await api(F.page, 'card.revise', { ...body, title: 'Overwrite attempt', baseRev: card.currentRev });
    assert.equal(stale.status, 409);
    // A sees the revision arrive; history keeps both.
    await A.page.locator(`[data-card-id="${card.id}"] [data-testid="card-title"]`).first().filter({ hasText: '(wording clarified)' }).waitFor({ timeout: 15000 });
  });

  await step('facilitator moderates the queue without deleting; A sees it', async () => {
    const snap = await snapshot(F.page);
    const q = snap.contributions.find((c) => c.kind === 'question' && c.body.includes(run));
    const r = await api(F.page, 'moderation.add', { contributionId: q.id, action: 'prioritize' });
    assert.equal(r.status, 201);
    await A.page.locator(`[data-testid="queue-item"][data-contribution-id="${q.id}"]`, { hasText: 'prioritized' }).waitFor({ timeout: 15000 });
    assert.ok((await snapshot(A.page)).contributions.some((c) => c.id === q.id), 'original kept');
  });

  await step('correction request on a transcript line, accepted; original kept beside it', async () => {
    const p = A.page;
    const seg = p.locator('[data-testid="segment"]').nth(5);
    const segId = await seg.getAttribute('data-segment-id');
    const original = await seg.locator('[data-testid="segment-text"]').textContent();
    await seg.hover();
    await seg.locator('[data-testid="segment-correct"]').click();
    assert.equal(await p.locator('[data-testid="compose-correction_request"]').getAttribute('aria-selected'), 'true');
    await p.locator('[data-testid="composer-text"]').fill(`Misheard word in this line (${run})`);
    await p.locator('textarea[aria-label="Corrected wording"]').fill(`${original} [corrected ${run}]`);
    await p.locator('[data-testid="composer-submit"]').click();
    await p.locator('[data-testid="composer-msg"]', { hasText: 'Posted' }).waitFor();
    const snap = await snapshot(F.page);
    const c = snap.contributions.find((k) => k.kind === 'correction_request' && k.body.includes(run));
    const r = await api(F.page, 'correction.decide', { contributionId: c.id, accepted: true, note: 'Matches the audio' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    await p.locator(`[data-segment-id="${segId}"] [data-testid="segment-text"]`, { hasText: `[corrected ${run}]` }).waitFor({ timeout: 15000 });
    const after = (await snapshot(A.page)).segments.find((s) => s.id === segId);
    assert.equal(after.revs[0].text, original, 'original revision kept');
    assert.equal(after.revs[after.revs.length - 1].kind, 'correction');
    await p.locator(`[data-segment-id="${segId}"]`).scrollIntoViewIfNeeded();
    await shot(p, '04-transcript-correction', { fullPage: false });
  });

  await step('option-comparison view renders with labels and sources', async () => {
    await A.page.locator('[data-testid="toggle-transcript"]').click(); // close the drawer
    await A.page.locator('[data-testid="view-compare"]').click();
    const n = await A.page.locator('[data-testid="compare-topic"]').count();
    assert.equal(n, 8);
    await A.page.locator('[data-testid="compare-view"]').scrollIntoViewIfNeeded();
    await shot(A.page, '05-compare-options', { fullPage: false });
    await A.page.locator('[data-testid="view-cards"]').click();
  });

  await step('phase change by a facilitator is recorded with who and when; both see it', async () => {
    const r = await api(F.page, 'phase.set', { to: 'verification_open', note: 'Test run: review opened' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    for (const p of [A.page, B.page]) {
      await p.locator('[data-testid="current-phase"]', { hasText: 'Community verification open' }).waitFor({ timeout: 15000 });
      await p.locator('[data-testid="phase-history"]', { hasText: 'Test Facilitator (administrator)' }).waitFor();
    }
    await api(F.page, 'phase.set', { to: 'preparing_draft', note: 'Test run: back to drafting' });
    await A.page.locator('[data-testid="phase-panel"]').scrollIntoViewIfNeeded();
    await shot(A.page, '06-phase-history', { fullPage: false });
  });

  await step('small screen: tabs keep the draft across tab switches and incoming updates', async () => {
    const M = await openAs(browser, 'a', { width: 390, height: 844 });
    await M.page.locator('[data-testid="listening-workspace"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const overflow = await M.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `page scrolls sideways by ${overflow}px on a phone`);
    await M.page.locator('[data-testid="tab-participate"]').click();
    await M.page.locator('[data-testid="compose-comment"]').click();
    await M.page.locator('[data-testid="composer-text"]').fill(`Phone draft (${run})`);
    await M.page.locator('[data-testid="tab-understanding"]').click();
    await shot(M.page, '07-mobile-understanding-tab', { fullPage: false });
    const t = `Posted while the phone was on another tab (${run})`;
    await compose(C.page, 'comment', t);
    await M.page.locator('[data-testid="tab-participate"]').click();
    await M.page.locator('[data-testid="feed-list"]', { hasText: t }).waitFor({ timeout: 15000 });
    assert.equal(await M.page.locator('[data-testid="composer-text"]').inputValue(), `Phone draft (${run})`);
    await shot(M.page, '08-mobile-participate-tab', { fullPage: false });
    await M.page.locator('[data-testid="tab-transcript"]').click();
    await shot(M.page, '09-mobile-transcript-tab', { fullPage: false });
    await M.context.close();
  });

  await shot(B.page, '10-desktop-participant-b', { fullPage: false });
  await A.context.close();
  await B.context.close();
  await F.context.close();
  await C.context.close();
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
