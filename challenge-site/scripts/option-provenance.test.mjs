// Ballot option provenance (src/data/sessions/option-provenance.ts): outcomes match the published 16 Nov results,
// real names only, every claim has evidence that exists, and no seconder without evidence.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { test } from 'node:test';
import { BALLOT_2026_11_16 } from '../src/data/sessions/2026-11-16-ballot.ts';
import { BALLOT_2026_11_23 } from '../src/data/sessions/2026-11-23-ballot.ts';
import { OPTION_PROVENANCE as R } from '../src/data/sessions/option-provenance.ts';
import { draftOptionKey, namesOn, outcomeText, seconds, withScreening } from '../src/lib/sessions/option-provenance-core.ts';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const results = JSON.parse(read('src/data/sessions/2026-11-16-results.json')).results;
const draft23 = JSON.parse(read('src/data/sessions/2026-11-23-draft.json'));
const TX = {
  'meta-governance-2026-11-16': JSON.parse(read('src/data/meta-governance-2026-11-16-transcript.json')),
  'listening-2026-11-23': JSON.parse(read('src/data/listening-2026-11-23-transcript.json')),
};
const speakers = new Set(Object.values(TX).flatMap((t) => t.turns.map((x) => x.speaker)));
/** Named without speaking in a transcript: Markabadi (20 Nov walk-through, consented), Mike McGuire (by email). */
const NOT_SPEAKERS = new Set(['Markabadi', 'Mike McGuire']);

function evidenceOf(r) {
  return [
    r.proposerEvidence,
    r.presentedBy?.evidence,
    ...(r.contributors ?? []).map((c) => c.evidence),
    ...r.seconders.map((s) => s.evidence),
  ].filter(Boolean);
}

test('every 16 Nov ballot option has a record with the published outcome', () => {
  for (const q of BALLOT_2026_11_16.questions) {
    const res = results.questions.find((x) => x.key === q.key);
    for (const o of q.options.filter((x) => x.key !== 'abstain')) {
      const r = R.find((x) => x.id === `meta-governance-2026-11-16/${q.key}/${o.key}`);
      assert.ok(r, `${q.key}/${o.key} missing`);
      assert.equal(r.outcome.votes, res.options.find((x) => x.key === o.key).votes, r.id);
      assert.equal(r.outcome.ballots, res.ballots, r.id);
      const out = res.outcome;
      const expected =
        q.kind === 'yes_no'
          ? (out.result === 'passed') === (o.key === 'yes') ? 'approved' : 'not_approved'
          : out.result === 'winner'
            ? out.option === o.key ? 'approved' : 'not_approved'
            : out.options.includes(o.key) ? 'tie' : 'not_approved';
      assert.equal(r.status, expected, r.id);
    }
  }
  assert.deepEqual(R.filter((r) => r.status === 'tie').map((r) => r.id), [
    'meta-governance-2026-11-16/q5/b',
    'meta-governance-2026-11-16/q5/d',
  ]);
  assert.equal(outcomeText(R.find((r) => r.id === 'meta-governance-2026-11-16/q4/d')), 'Approved · 11 of 24 votes');
});

test('every 23 Nov draft ballot option has a record on the draft ballot', () => {
  for (const q of draft23.ballot.questions)
    q.options.forEach((label, i) => {
      const key = draftOptionKey(label, i);
      if (!key) return;
      const r = R.find((x) => x.id === `listening-2026-11-23/q${q.n}/${key}`);
      assert.ok(r, `q${q.n}/${key}`);
      assert.equal(r.status, 'on_draft_ballot');
      assert.equal(r.optionLabel, label);
    });
});

test('names are real names: speakers in the transcripts (or the known exceptions), no emails, handles or "Laura Sanchez"', () => {
  for (const r of R)
    for (const n of namesOn(r)) {
      assert.ok(!/@|\.com|\bSanchez\b|Marco Botti|bitracer|Phahsa Ras/i.test(n), `${r.id}: ${n}`);
      assert.ok(speakers.has(n) || NOT_SPEAKERS.has(n), `${r.id}: ${n} is not a transcript speaker`);
    }
  const text = read('src/data/sessions/option-provenance.ts');
  assert.ok(!/Laura Sanchez|@[a-z0-9-]+\.[a-z]/i.test(text), 'no "Laura Sanchez" or email anywhere in the data');
});

test('every piece of evidence points to a transcript turn or to a source that exists', () => {
  for (const r of R) {
    if (r.origin === 'standard') assert.equal(r.proposer, null, r.id);
    if (!r.proposer) assert.ok(r.notes && (r.origin === 'standard' || /Not recorded/.test(r.notes)), `${r.id}: no proposer needs a note`);
    else assert.ok(r.proposerEvidence, `${r.id}: proposer without evidence`);
    for (const e of evidenceOf(r)) {
      if (e.kind === 'transcript') {
        assert.ok(TX[e.session].turns.some((t) => t.t === seconds(e.at)), `${r.id}: no turn at ${e.session} ${e.at}`);
        if (e.quote) {
          const turn = TX[e.session].turns.find((t) => t.t === seconds(e.at));
          const words = e.quote.replace(/[’']/g, "'").split(/…|\.\s/)[0].trim().slice(0, 25).replace(/[’']/g, "'");
          assert.ok(turn.text.replace(/[’']/g, "'").includes(words), `${r.id}: quote not in turn ${e.at}: ${words}`);
        }
      } else {
        assert.ok(e.label && e.file, r.id);
        const path = e.file.startsWith('~/') ? `${homedir()}/${e.file.slice(2)}` : new URL(`../${e.file}`, import.meta.url);
        if (e.file.startsWith('~/') && !existsSync(`${homedir()}/layered-web-videos`)) continue; // records kept off this machine
        assert.ok(existsSync(path), `${r.id}: ${e.file} missing`);
        if (e.quote) assert.ok(readFileSync(path, 'utf8').includes(e.quote.replace(/’/g, "\\'").slice(0, 20)) || readFileSync(path, 'utf8').includes(e.quote.slice(0, 20)), `${r.id}: quote not in ${e.file}`);
      }
    }
  }
});

test('no seconder or supporter without evidence; "seconded" status needs a second', () => {
  for (const r of R) {
    for (const s of r.seconders) {
      assert.ok(s.evidence && (s.evidence.kind === 'transcript' ? s.evidence.at : s.evidence.file), `${r.id}: ${s.name}`);
      assert.ok(['second', 'support'].includes(s.kind));
      assert.notEqual(s.name, r.proposer, `${r.id}: proposer cannot second their own option`);
    }
    if (r.status === 'seconded') assert.ok(r.seconders.some((s) => s.kind === 'second'), r.id);
  }
  // Known case: the book club cadence was seconded by Joel Okomoli, not Daveed Benjamin (transcript over Deepi).
  const cadence = R.find((r) => r.id === 'listening-2026-11-23/decided/book-club-cadence-agenda');
  assert.deepEqual(cadence.seconders.map((s) => [s.name, s.kind]), [['Joel Okomoli', 'second']]);
  const club = R.find((r) => r.id === 'listening-2026-11-23/decided/book-club-front-matter');
  assert.equal(club.proposer, 'Salwa El Mais');
  assert.deepEqual(club.seconders.map((s) => s.name), ['Leandra Preston']);
});

test('ids are unique, and council screening moves a draft option on or off the ballot', () => {
  assert.equal(new Set(R.map((r) => r.id)).size, R.length);
  const r = R.find((x) => x.id === 'listening-2026-11-23/q2/yes');
  assert.equal(withScreening(r, 'pending').status, 'on_draft_ballot');
  assert.equal(withScreening(r, 'goes_to_ballot').status, 'on_ballot');
  assert.equal(withScreening(r, 'held_back').status, 'screened_out');
  const approved = R.find((x) => x.id === 'meta-governance-2026-11-16/q1/yes');
  assert.equal(withScreening(approved, 'held_back').status, 'approved');
});

test('every 23 Nov ballot option has its record: same key, same label, same question (the page shows it beside the option)', () => {
  for (const q of BALLOT_2026_11_23.questions)
    for (const o of q.options.filter((x) => x.key !== 'abstain')) {
      const r = R.find((x) => x.id === `${BALLOT_2026_11_23.slug}/${q.key}/${o.key}`);
      assert.ok(r, `${q.key}/${o.key} missing`);
      assert.equal(r.optionLabel, o.label, r.id);
      assert.equal(r.questionN, q.n, r.id);
      assert.equal(r.status, 'on_draft_ballot', `${r.id}: until the screening outcome moves it on or off the ballot`);
    }
});
