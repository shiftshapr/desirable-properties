// One-off backfill: writes src/data/sessions/option-provenance.ts from the ballot definitions, the drafts, the
// published 16 Nov results and the attributions below (read from the transcripts by hand, 24 Nov 2026).
//
// The generated file is the source of truth once committed: edit it directly. This script refuses to overwrite it
// unless run with --force, so a later run cannot silently undo hand corrections.
//
// Usage (from challenge-site/):
//   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs scripts/generate-option-provenance.mjs [--force]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BALLOT_2026_11_16 } from '../src/data/sessions/2026-11-16-ballot.ts';
import { draftOptionKey, provenanceId, seconds } from '../src/lib/sessions/option-provenance-core.ts';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = `${ROOT}src/data/sessions/option-provenance.ts`;
const readJson = (rel) => JSON.parse(readFileSync(`${ROOT}${rel}`, 'utf8'));

const results16 = readJson('src/data/sessions/2026-11-16-results.json').results;
const draft23 = readJson('src/data/sessions/2026-11-23-draft.json');
const tx = {
  'meta-governance-2026-11-16': readJson('src/data/meta-governance-2026-11-16-transcript.json'),
  'listening-2026-11-23': readJson('src/data/listening-2026-11-23-transcript.json'),
};

const S16 = { session: 'meta-governance-2026-11-16', sessionLabel: '16 Nov 2026: Meeting agreements: how we decide', sessionHref: '/events/meta-governance-2026-11-16' };
const S23 = { session: 'listening-2026-11-23', sessionLabel: '23 Nov 2026: Ballot results and the first weekly cycle', sessionHref: '/events/listening-2026-11-23' };
const S30 = { session: 'listening-2026-11-30', sessionLabel: '30 Nov 2026: Co-editors and the council', sessionHref: '/roundups/2026-11-30' };

/** Transcript evidence; the time must be the start of a speaker turn. */
function T(session, at, quote) {
  const t = seconds(at);
  if (!tx[session].turns.some((x) => x.t === t)) throw new Error(`${session}: no turn starts at ${at}`);
  return { kind: 'transcript', session, at, ...(quote ? { quote } : {}) };
}
const T16 = (at, quote) => T('meta-governance-2026-11-16', at, quote);
const T23 = (at, quote) => T('listening-2026-11-23', at, quote);
const PAD20 = (at, quote) => ({
  kind: 'source',
  label: '20 Nov walk-through with Markabadi',
  file: 'src/data/meeting-pads/2026-11-20-session-page-review.ts',
  at,
  quote,
  href: '/pads/meetings/2026-11-20-session-page-review',
});
const DAVEED = 'Daveed Benjamin';
const host = (evidence) => ({ origin: 'host', proposer: DAVEED, proposerEvidence: evidence });
const person = (name, evidence) => ({ origin: 'participant', proposer: name, proposerEvidence: evidence });
const support = (name, evidence) => ({ name, kind: 'support', evidence });
const second = (name, evidence) => ({ name, kind: 'second', evidence });
const STANDARD = {
  origin: 'standard',
  proposer: null,
  proposerEvidence: null,
  notes: 'The standard "No" of a Yes/No question; nobody proposes it.',
};

/** 16 Nov ballot, by question and option key. */
const A16 = {
  q1: {
    yes: {
      ...host(T16('00:06:06', 'maybe we could do a four-session pilot')),
      seconders: [support('Benn Konsynski', T16('00:46:02', 'You need that cadence. I agree.'))],
    },
  },
  q2: {
    a: {
      ...host(T16('00:46:59', 'is 24 h enough to, you know, verify the draft')),
      contributors: [{ name: 'Joel Okomoli', what: 'the notice email about 12 hours ahead', evidence: T16('01:25:50', 'maybe a warning email first') }],
      seconders: [support('Stella Alvo', T16('00:47:33', 'I think it’s a start.'))],
    },
    b: {
      origin: 'drafted',
      proposer: null,
      proposerEvidence: null,
      notes: 'Not recorded: nobody named 48 hours for the correction window in the meeting. The host asked "24 hours? Or do you want to…" (00:46:59) and the draft added 48 hours as the alternative.',
    },
  },
  q3: {
    a: host(T16('00:38:18', 'the community would vote over, say, 48 or 72 hour period')),
    b: host(T16('00:38:18', 'the community would vote over, say, 48 or 72 hour period')),
  },
  q4: {
    a: host(T16('00:53:05', 'I’m going to throw out 50%')),
    b: host(T16('00:51:16', 'it could be 60%, could be 67%')),
    c: host(T16('00:51:16', 'it could be 60%, could be 67%')),
    d: {
      ...person('Lord M.E.G.A Zion', T16('00:53:35', 'it would justify a reason to be held… capable for review')),
      notes: 'The host restated it as 50% keeping an item open and 60% to 70% moving it forward (00:55:24); Lord M.E.G.A Zion agreed (00:55:46). Named as in the Version 1.0 acknowledgements (his Zoom name).',
    },
    e: person('Gael Van Weyenbergh', T16('00:55:58', 'I think we should strive for consent')),
  },
  q5: {
    a: { ...host(T16('00:56:47', 'Anyone have any thoughts on whether we should set a quorum?')), notes: 'No one answered when the host asked about quorum (00:56:47).' },
    b: host(T16('00:51:16', 'we need 20 votes')),
    c: host(T16('00:51:16', '10% of the, the, the voting body')),
    d: host(T16('00:51:16', 'or 25% of the voting body')),
  },
  q6: {
    a: {
      ...host(T16('00:49:36', '3 co-editors and 2 approvals needed… This is what chat suggested')),
      seconders: [support('Gael Van Weyenbergh', T16('00:51:07', 'Let’s try it out like this.'))],
      notes: 'The setup the host had already put on the site, from the ChatGPT straw proposal.',
    },
    b: {
      ...host(T16('00:49:36', 'are there people who would prefer to stay with two co-editors')),
      notes: 'The Version 1.0 text. Stella Alvo raised the concern that three co-editors would be hard to fill (00:41:37).',
    },
  },
  q7: {
    a: {
      ...host(T16('01:18:52', 'having the possibility that two yeses can overrule a no')),
      notes: 'The current rule. Lord M.E.G.A Zion said "I’m gonna second them" (01:18:10) after Leandra Preston spoke against a single decline ending a proposal; it is not clear whether that seconds keeping this rule or the further-review alternative, so no seconder is recorded.',
    },
    b: {
      ...host(T16('01:16:52', 'we could make it so that… just one decline ends the proposal')),
      notes: 'A question Claude had identified, put to the room by the host. Leandra Preston, Benn Konsynski and Lord M.E.G.A Zion spoke against it (01:17:26 to 01:18:24).',
    },
    c: person('Leandra Preston', T16('01:17:26', 'Or one could send it to a level to be looked at')),
  },
  q8: {
    a: { ...host(T16('00:57:35', 'A title change to a chapter requires steering approval')), notes: 'From the ChatGPT straw proposal.' },
    b: {
      ...person('Stella Alvo', T16('01:00:17', 'at least 75% of the… Of the people who wrote the chapter')),
      seconders: [support('Leandra Preston', T16('01:00:24', 'Oh, yeah. And authors. Yeah, yeah. Good point.'))],
    },
    c: host(T16('00:59:06', 'it may be that it should actually go to the entire community as a vote')),
  },
  q9: { yes: host(T16('01:13:31', 'that council should probably be elected')) },
  q10: {
    yes: {
      origin: 'host',
      proposer: DAVEED,
      proposerEvidence: {
        kind: 'source',
        label: '16 Nov draft: proposal added after the meeting',
        file: 'src/data/sessions/2026-11-16-draft.json',
        quote: 'Daveed Benjamin proposes appointing an interim council that acts now and prepares for council elections.',
        href: '/events/meta-governance-2026-11-16#draft',
      },
      notes: 'Made after the meeting, so it is not in the transcript. The council was formed in the 23 Nov meeting once Michelle Thuo confirmed in the chat (23 Nov 00:51:35).',
    },
  },
  q11: {
    a: {
      ...host(T16('01:13:31', 'Should it be 5? Should it be 7?')),
      seconders: [support('Gael Van Weyenbergh', T16('01:14:56', 'I think five is good.'))],
      notes: 'The host also read out a participant named only as Suzanne saying to start with five (01:15:13); not recorded as a supporter.',
    },
    b: host(T16('01:13:31', 'Should it be 5? Should it be 7?')),
    c: host(T16('01:13:31', 'like five, seven, nine')),
  },
  q12: {
    a: {
      ...host(T16('01:15:13', 'I’m kind of leaning towards having a council that would be specifically on the desirable properties')),
      seconders: [support('Renad Baomar', T16('01:15:13', 'Renad says yes.'))],
      notes: 'Renad Baomar’s yes was in the chat; the host read it out.',
    },
    b: host(T16('01:15:13', 'or it could be Metalayer Council… Desirable Properties and. the Metalayer Academy')),
  },
  q13: { yes: host(T16('00:48:38', 'We should probably have a published screening criteria')) },
  q14: {
    yes: {
      ...host(T16('01:22:45', 'What do you all think about having some kind of co-editor agreement?')),
      seconders: [
        support('Renad Baomar', T16('01:22:45', 'Renad says yes.')),
        support('Joel Okomoli', T16('01:23:50', 'Joel says yes as well.')),
      ],
      notes: 'Both yeses were in the chat and read out by the host; he also said Allison Gustavson was nodding (01:22:45).',
    },
  },
  q15: {
    a: { ...host(T16('01:19:28', 'But it does not have any vetting, so how do people feel about that?')), notes: 'The current setup: any account at least 7 days old.' },
    b: {
      ...person('Lord M.E.G.A Zion', T16('01:20:57', 'these, uh, prerequisites or questionnaires or even voluntary statements')),
      notes: 'The host split the questionnaire into screened and not screened (01:22:01); Lord M.E.G.A Zion answered "Both" (01:22:18).',
    },
    c: {
      ...person('Lord M.E.G.A Zion', T16('01:20:57', 'these, uh, prerequisites or questionnaires or even voluntary statements')),
      notes: 'The host split the questionnaire into screened and not screened (01:22:01); Lord M.E.G.A Zion answered "Both" (01:22:18).',
    },
  },
};

const MARKABADI = (padAt, padQuote, presentedAt, presentedQuote) => ({
  origin: 'participant',
  proposer: 'Markabadi',
  proposerEvidence: PAD20(padAt, padQuote),
  presentedBy: { name: DAVEED, evidence: T23(presentedAt, presentedQuote) },
});

/** 23 Nov draft ballot, by question number and option key. */
const A23 = {
  1: {
    a: {
      ...host(T23('00:35:28', 'Would people be willing to consent to no quorum for the next four weeks?')),
      notes: 'No one objected to the consent call (00:35:28), but the host kept the question open after Joel Okomoli spoke for 25% (00:37:04). Question 5 of the 16 Nov ballot tied on quorum.',
    },
    b: { ...host(T16('00:51:16', 'we need 20 votes')), notes: 'Carried from the 16 Nov ballot, where it tied 6 to 6 with 25% of the voting body.' },
    c: {
      ...host(T16('00:51:16', 'or 25% of the voting body')),
      seconders: [support('Joel Okomoli', T23('00:36:09', 'I think 25% is fair.'))],
      notes: 'Carried from the 16 Nov ballot, where it tied 6 to 6 with a minimum of 20 votes.',
    },
    d: { ...host(T23('00:37:04', 'Maybe we could think about it as 25% of the active voting body')), notes: '"Active voting body" needs a definition before the vote.' },
  },
  2: {
    yes: {
      ...MARKABADI('06:54', 'It’s like being seconded. It needs to be seconded.', '00:53:29', 'Markabadi suggested that an idea only goes onto the ballot if someone seconds it.'),
      seconders: [
        support('Laura Del Campo', T23('00:55:20', 'I don’t have a problem with that. I think that is good.')),
        support('Leandra Preston', T23('00:55:39', 'I think seconding before sending it to the draft seems like a good strategy.')),
        support('Joel Okomoli', {
          kind: 'source',
          label: 'Zoom chat, 23 Nov (Deepi’s log)',
          file: '~/layered-web-videos/dp-session-2026-11-23/deepi/transcript.jsonl',
          at: '36:14',
          quote: '+1',
        }),
      ],
      notes: 'Joel Okomoli’s +1 is in the Zoom chat (Deepi’s clock 36:14, about 00:55:35 on the recording), not in the spoken transcript.',
    },
  },
  3: { yes: MARKABADI('09:38', 'So having those constrictions in your call, I think would be great.', '00:55:58', 'plain English before formal wording') },
  4: { yes: MARKABADI('09:38', 'So having those constrictions in your call, I think would be great.', '00:55:58', 'He’d like to see a check-in') },
  5: {
    yes: {
      ...MARKABADI('09:38', 'So having those constrictions in your call, I think would be great.', '00:55:58', 'He also suggested one major inquiry per session'),
      notes: 'The host said this needs clarification from Markabadi (00:55:58).',
    },
  },
  6: { yes: MARKABADI('10:45', 'We could have the AI raise its hand.', '00:55:58', 'it would be great if the AI could raise its hand') },
  7: { yes: MARKABADI('31:52', 'Just a simple text reminder', '00:58:17', 'Text reminders: opt-in texts that skip people who have already voted.') },
  8: {
    yes: {
      ...host(T23('00:47:17', 'Do people have any issues with the transcripts being put on the session page and retained?')),
      seconders: [support('Laura Del Campo', T23('00:49:15', 'being able to see the transcript, would be great. I agree with it.'))],
    },
  },
  9: {
    a: {
      origin: 'drafted',
      proposer: null,
      proposerEvidence: null,
      notes: 'Not recorded: nobody proposed reading in book order after the front matter. The draft wrote it as the alternative to Joel Okomoli’s option.',
    },
    b: {
      ...person('Joel Okomoli', T23('01:14:01', 'we have to look at chapters that are of interest to us')),
      notes: 'Joel Okomoli’s "I second that" (01:14:45) seconds putting the cadence on next week’s agenda, not this option.',
    },
  },
};

function base(s, question, questionN, questionText, option, optionLabel) {
  return { id: provenanceId(s.session, question, option), ...s, question, questionN, questionText, option, optionLabel };
}

function finish(rec) {
  return {
    ...rec,
    seconders: rec.seconders ?? [],
    outcome: rec.outcome ?? null,
  };
}

const records = [];

// 16 Nov: the corrected ballot, with the published outcome.
for (const q of BALLOT_2026_11_16.questions) {
  const r = results16.questions.find((x) => x.key === q.key);
  if (!r) throw new Error(`16 Nov ${q.key}: no published result`);
  for (const o of q.options) {
    if (o.key === 'abstain') continue;
    const a = A16[q.key]?.[o.key] ?? (o.key === 'no' ? STANDARD : null);
    if (!a) throw new Error(`16 Nov ${q.key}/${o.key}: no attribution`);
    const votes = r.options.find((x) => x.key === o.key)?.votes ?? 0;
    const res = r.outcome.result;
    let status;
    if (q.kind === 'yes_no') status = (res === 'passed') === (o.key === 'yes') ? 'approved' : 'not_approved';
    else if (res === 'winner') status = r.outcome.option === o.key ? 'approved' : 'not_approved';
    else if (res === 'tie') status = r.outcome.options.includes(o.key) ? 'tie' : 'not_approved';
    else status = 'not_approved';
    const tieNote = res === 'tie' && status === 'tie' ? 'Tied 6 to 6; the quorum question went back to the 23 Nov session (draft ballot question 1).' : null;
    records.push(
      finish({
        ...base(S16, q.key, q.n, q.question, o.key, o.label),
        ...a,
        status,
        outcome: { votes, ballots: r.ballots, abstain: r.abstain, result: res },
        notes: [a.notes, tieNote].filter(Boolean).join(' ') || undefined,
      }),
    );
  }
}

// 23 Nov: the draft ballot (voting not open yet). Council screening is applied live on the pages.
for (const q of draft23.ballot.questions) {
  q.options.forEach((label, i) => {
    const key = draftOptionKey(label, i);
    if (!key) return;
    const a = A23[q.n]?.[key] ?? (key === 'no' ? STANDARD : null);
    if (!a) throw new Error(`23 Nov q${q.n}/${key}: no attribution`);
    records.push(finish({ ...base(S23, `q${q.n}`, q.n, q.question, key, label), ...a, status: 'on_draft_ballot' }));
  });
}

// 23 Nov: decided in the room, not by ballot.
records.push(
  finish({
    ...base(S23, 'decided', null, 'Decided in the meeting', 'book-club-front-matter', 'A 30-minute book club in the 30 Nov session, on the front matter'),
    ...person('Salwa El Mais', T23('01:12:48', 'let’s go ahead, and the next session will start the book club with the first part')),
    contributors: [{ name: DAVEED, what: 'floated the plan', evidence: T23('01:11:39', 'Should we just go ahead and say that next week we’ll have a book club section of 30 minutes?') }],
    seconders: [second('Leandra Preston', T23('01:13:25', 'I’ll second.'))],
    status: 'decided_in_meeting',
  }),
  finish({
    ...base(S23, 'decided', null, 'Decided in the meeting', 'book-club-cadence-agenda', 'Put the book club cadence on the 30 Nov agenda'),
    ...host(T23('01:14:38', 'So maybe that’s the decision we’d want to put in for next week: the cadence of the book club.')),
    contributors: [{ name: 'Joel Okomoli', what: 'raised the cadence question', evidence: T23('01:14:01', 'After that, I think we have to look at chapters that are of interest to us') }],
    seconders: [second('Joel Okomoli', T23('01:14:45', 'Yes. I second that.'))],
    status: 'decided_in_meeting',
    notes: 'Deepi’s seconded list names Daveed Benjamin as the seconder; the transcript has Joel Okomoli seconding (01:14:45), which this record follows.',
  }),
  finish({
    ...base(S23, 'raised', null, 'Raised, not on the draft ballot', 'daily-review-sprints', 'Daily sprints as the review cadence'),
    origin: 'participant',
    proposer: 'Mike McGuire',
    proposerEvidence: T23('00:49:30', 'Mike McGuire suggested daily sprints as a review cadence'),
    status: 'proposed',
    notes: 'Raised by email and read out by the host. Held for Mike McGuire to explain it during this cycle.',
  }),
);

// 30 Nov: proposals on the agenda (src/lib/dp-roundups.ts).
const AGENDA30 = (quote) => ({ kind: 'source', label: '30 Nov agenda', file: 'src/lib/dp-roundups.ts', quote, href: '/roundups/2026-11-30' });
records.push(
  finish({
    ...base(S30, 'agenda', null, 'Proposals on the agenda', 'v11-december-nautilus', 'Publish Version 1.1 by the end of December, put it on sale, and enter it for the Nautilus Book Awards'),
    ...host(AGENDA30('Publish Version 1.1 by the end of December, put it on sale, and enter it for the Nautilus Book Awards')),
    status: 'on_agenda',
  }),
  finish({
    ...base(S30, 'agenda', null, 'Proposals on the agenda', 'book-revenue', 'Where should any revenue from the book go?'),
    ...host(AGENDA30('Where should any revenue from the book go?')),
    status: 'on_agenda',
    notes: 'Options to be gathered in the session for the ballot.',
  }),
);

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${OUT} exists and is the source of truth; edit it directly (or pass --force to overwrite).`);
  process.exit(1);
}

const body = `import type { OptionProvenance } from '@/lib/sessions/option-provenance-core';

/**
 * Who proposed, seconded or supported each ballot option, and what became of it, for every listening session so far.
 *
 * Backfilled on 24 Nov 2026 by scripts/generate-option-provenance.mjs from the ballot definitions, the drafts, the
 * transcripts, the 20 Nov walk-through pad and the published 16 Nov results (2026-11-16-results.json), then checked
 * by hand. This file is now the source of truth: edit it directly. Each new session's draft adds its options here
 * (see "Option provenance" in ~/handoff/session-drafts/brief.md); scripts/option-provenance.test.mjs checks it.
 *
 * Real names only. Seconders need evidence; "support" means someone spoke for the option without seconding it.
 */
export const OPTION_PROVENANCE: readonly OptionProvenance[] = ${JSON.stringify(records, null, 2)};
`;
writeFileSync(OUT, body);
console.log(`Wrote ${records.length} records to ${OUT}`);
