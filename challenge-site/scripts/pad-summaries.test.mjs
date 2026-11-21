// Proposal pad summaries: the runtime table is read before the bundled seed, a summary shows only while its hash
// matches the current text, the generator's per-run caps, the one-line log, and the env-file reader.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { summaryInput } from '../src/lib/pads/proposal-pad-core.ts';
import {
  PAD_SUMMARY_SCHEMA_SQL,
  estimateCallCost,
  isCurrent,
  mayStart,
  parseEnvKeys,
  pickSummary,
  pickTitle,
  readSummaryRows,
  resultLine,
  seedRows,
  sourceHash,
  upsertSummary,
  usageCost,
} from '../src/lib/pads/pad-summary-core.ts';

const ID = '3275bc04-4415-467d-9b6a-f9ef7dfffcb8';
const PROPOSAL = {
  id: ID,
  status: 'pending',
  patch_mode: 'insert_after',
  original_text: 'By treating proof of humanity as an enduring capability, DP1 enables long-term defense.',
  proposed_text: 'Participants should be able to discover communities.',
  rationale: 'Reconciles two proposals.',
};
const row = (over = {}) => ({
  padId: ID,
  title: 'Table title',
  summary: 'Table summary.',
  sourceHash: 'aaaa',
  model: 'claude-opus-5-5',
  generatedAt: '2026-11-21T00:00:00.000Z',
  mlNumber: 'ML-Draft-001',
  ...over,
});

test('hash: the same 16-character sha256 prefix the seed JSON stores', () => {
  const input = summaryInput(PROPOSAL, 'DP1');
  assert.match(sourceHash(input), /^[0-9a-f]{16}$/);
  assert.equal(sourceHash(input), sourceHash(input));
  assert.notEqual(sourceHash(input), sourceHash(summaryInput({ ...PROPOSAL, proposed_text: 'Edited.' }, 'DP1')));
});

test('seed: the bundled JSON reads as rows with its hash, model and document', () => {
  const rows = seedRows({
    model: 'claude-opus-5-5',
    items: { [ID]: { title: 'Seed', summary: 'S.', inputHash: 'bbbb', generatedAt: 'x', ml: 'ML-Draft-002' } },
  });
  assert.deepEqual(rows.get(ID), {
    padId: ID, title: 'Seed', summary: 'S.', sourceHash: 'bbbb', model: 'claude-opus-5-5', generatedAt: 'x', mlNumber: 'ML-Draft-002',
  });
  // The real seed file parses, and every entry has a hash.
  const real = seedRows(JSON.parse(readFileSync(new URL('../src/data/proposal-pad-summaries.json', import.meta.url), 'utf8')));
  for (const r of real.values()) assert.match(r.sourceHash, /^[0-9a-f]{16}$/);
});

test('pick: the table first, then the seed; only a row whose hash matches the current text shows', () => {
  const db = row({ sourceHash: 'aaaa', title: 'Table' });
  const seed = row({ sourceHash: 'bbbb', title: 'Seed' });
  assert.equal(pickSummary('aaaa', db, seed)?.title, 'Table');
  assert.equal(pickSummary('bbbb', db, seed)?.title, 'Seed', 'a stale table row falls back to a matching seed row');
  assert.equal(pickSummary('cccc', db, seed), null, 'an edited proposal shows no summary until it is re-written');
  assert.equal(pickSummary('aaaa', undefined, null), null);
  assert.ok(isCurrent('bbbb', db, seed));
  assert.ok(!isCurrent('cccc', db, seed));
  assert.equal(pickTitle(db, seed), 'Table');
  assert.equal(pickTitle(undefined, seed), 'Seed');
  assert.equal(pickTitle(undefined, undefined), null);
});

function fakeDb({ exists = true } = {}) {
  const calls = [];
  const rows = new Map();
  return {
    calls,
    rows,
    async query(sql, params = []) {
      calls.push(sql.trim().split(/\s+/).slice(0, 2).join(' '));
      if (/to_regclass/.test(sql)) return { rows: [{ ok: exists }] };
      if (/^INSERT INTO dp_pad_summary/.test(sql.trim())) {
        const [pad_id, title, summary, source_hash, model, generated_at, ml_number] = params;
        rows.set(pad_id, { pad_id, title, summary, source_hash, model, generated_at: new Date(generated_at), ml_number });
        return { rows: [], rowCount: 1 };
      }
      if (/^SELECT pad_id/.test(sql.trim())) return { rows: [...rows.values()] };
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
}

test('table: reads run no DDL and return nothing when the table is absent; upsert replaces the row', async () => {
  const absent = fakeDb({ exists: false });
  assert.equal((await readSummaryRows(absent)).size, 0);
  assert.ok(!absent.calls.some((c) => c.startsWith('CREATE')));

  const db = fakeDb();
  await upsertSummary(db, row({ sourceHash: 'aaaa', title: 'First' }));
  await upsertSummary(db, row({ sourceHash: 'dddd', title: 'Second' }));
  const read = await readSummaryRows(db);
  assert.equal(read.size, 1);
  assert.equal(read.get(ID).title, 'Second');
  assert.equal(read.get(ID).sourceHash, 'dddd');
  assert.equal(read.get(ID).generatedAt, '2026-11-21T00:00:00.000Z');
  assert.equal(read.get(ID).mlNumber, 'ML-Draft-001');
  assert.ok(!db.calls.some((c) => c.startsWith('CREATE')));
});

test('schema: one lazily created table with the agreed columns', () => {
  assert.match(PAD_SUMMARY_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS dp_pad_summary/);
  for (const col of ['pad_id TEXT PRIMARY KEY', 'title', 'summary', 'source_hash', 'model', 'generated_at']) {
    assert.ok(PAD_SUMMARY_SCHEMA_SQL.includes(col), col);
  }
});

test('caps: at most --max calls, and none that would take the projected cost past --budget', () => {
  const limits = { max: 25, budget: 2 };
  const est = estimateCallCost(2000, 1200);
  assert.ok(est > 0.02 && est < 0.1, `estimate ${est}`);
  assert.ok(mayStart({ started: 0, spent: 0, finished: 0 }, est, limits));
  assert.ok(!mayStart({ started: 25, spent: 0.5, finished: 25 }, est, limits), 'item cap');
  assert.ok(!mayStart({ started: 10, spent: 1.97, finished: 10 }, est, limits), 'budget');
  // A run that turns out dearer than estimated uses its own average.
  assert.ok(!mayStart({ started: 4, spent: 1.65, finished: 4 }, est, limits));
  // Calls still in flight count against the budget.
  assert.ok(!mayStart({ started: 3, spent: 1.9, finished: 2 }, 0.06, limits));
  assert.ok(mayStart({ started: 3, spent: 1.0, finished: 2 }, 0.06, limits));

  // Simulate a run: 40 changed proposals at $0.05 each stop at the 25-item cap, at about $1.25.
  let state = { started: 0, spent: 0, finished: 0 };
  while (mayStart(state, 0.05, limits)) state = { started: state.started + 1, spent: state.spent + 0.05, finished: state.finished + 1 };
  assert.equal(state.started, 25);
  // At $0.15 each the budget stops it first, without passing $2.
  state = { started: 0, spent: 0, finished: 0 };
  while (mayStart(state, 0.15, limits)) state = { started: state.started + 1, spent: state.spent + 0.15, finished: state.finished + 1 };
  assert.equal(state.started, 13);
  assert.ok(state.spent <= 2);
});

test('cost: priced per million tokens', () => {
  assert.equal(usageCost({ input: 1e6, output: 0, cacheRead: 0, cacheWrite: 0 }), 4);
  assert.equal(usageCost({ input: 0, output: 1e6, cacheRead: 0, cacheWrite: 0 }), 20);
  assert.equal(usageCost({ input: 0, output: 0, cacheRead: 1e6, cacheWrite: 1e6 }), 5.2);
});

test('log: one line with the count and cost, and why it stopped', () => {
  const line = resultLine({ wrote: 3, pending: 40, todo: 3, failed: 0, skippedDocs: 0, cost: 0.1234, stoppedBy: null });
  assert.equal(line, 'pad-summaries: wrote 3 of 3 new or changed (40 pending checked), cost $0.1234');
  assert.ok(!line.includes('\n'));
  const capped = resultLine({ wrote: 25, pending: 60, todo: 30, failed: 1, skippedDocs: 2, cost: 1.5, stoppedBy: 'cap' });
  assert.match(capped, /wrote 25 of 30/);
  assert.match(capped, /failed 1/);
  assert.match(capped, /did not answer for 2 documents/);
  assert.match(capped, /item cap/);
  assert.ok(!capped.includes('\n'));
});

test('env file: only the wanted keys, parsed like ecosystem.config.js', () => {
  const text = [
    '# comment',
    'REVIEW_ANTHROPIC_API_KEY="sk-test"',
    "DP_DATABASE_URL='postgres://u:p#x@h/db'",
    'OTHER_SECRET=nope',
    'GOVHUB_BASE_URL=https://dev.example',
    '',
  ].join('\n');
  const got = parseEnvKeys(text, ['REVIEW_ANTHROPIC_API_KEY', 'DP_DATABASE_URL', 'GOVHUB_BASE_URL']);
  assert.deepEqual(got, {
    REVIEW_ANTHROPIC_API_KEY: 'sk-test',
    DP_DATABASE_URL: 'postgres://u:p#x@h/db',
    GOVHUB_BASE_URL: 'https://dev.example',
  });
  assert.ok(!('OTHER_SECRET' in got));
});

test('runner: the timer is every 6 hours, catches up after downtime, and the service never echoes env', () => {
  const timer = readFileSync(new URL('../ops/pad-summaries/dp-pad-summaries.timer', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../ops/pad-summaries/dp-pad-summaries.service', import.meta.url), 'utf8');
  const install = readFileSync(new URL('../ops/pad-summaries/install.sh', import.meta.url), 'utf8');
  assert.match(timer, /^OnCalendar=\*-\*-\* 00\/6:17:00 UTC$/m);
  assert.match(timer, /^Persistent=true$/m);
  assert.match(service, /--db --max 25 --budget 2 --env-file /);
  assert.ok(!/EnvironmentFile=/.test(service), 'the key is read by the script, not exported into the unit');
  assert.ok(!/(cat|source|\.)\s+\S*\.env/.test(install), 'install never reads or prints .env.local');
});
