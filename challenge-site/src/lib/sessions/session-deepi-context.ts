import type { BallotDefinition } from '@/lib/ballots/ballot-core';
import { meetingLabel, type MeetingRef } from '@/lib/sessions/session-labels';

type Turn = { t: number; speaker: string; text: string };

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/**
 * Context for Deepi on a session page ({ title, text }, the HermesChat `context` shape): the meeting's summary,
 * decisions, open questions, ballot and transcript, as plain Markdown.
 */
export function sessionDeepiContext(input: {
  meeting: MeetingRef;
  pagePath: string;
  summary: readonly string[];
  decisions?: readonly string[];
  openQuestions?: readonly string[];
  ballot?: Pick<BallotDefinition, 'questions'> | null;
  turns: readonly Turn[];
}): { title: string; text: string } {
  const { meeting } = input;
  const parts: string[] = [
    `Community session: ${meetingLabel(meeting)}. Series: ${meeting.seriesTitle}. Page: https://desirableproperties.org${input.pagePath}`,
    'Answer questions about this meeting from the material below. Cite transcript timestamps (hh:mm:ss) where you can. Say so when the material does not answer the question.',
    '## Summary (drafted by Claude, participants can correct it)',
    ...input.summary.map((s) => `- ${s}`),
  ];
  if (input.decisions?.length) parts.push('## Decisions coming up', ...input.decisions.map((d, i) => `${i + 1}. ${d}`));
  if (input.openQuestions?.length) parts.push('## Open questions', ...input.openQuestions.map((q) => `- ${q}`));
  if (input.ballot?.questions.length) {
    parts.push('## Ballot');
    for (const q of input.ballot.questions) {
      const opts = q.options.map((o) => o.label);
      parts.push(`${q.n}. ${q.question} (Context: ${q.context}) Options: ${opts.join('; ')}.`);
    }
  }
  parts.push('## Transcript (Zoom automatic transcript, lightly cleaned)', ...input.turns.map((t) => `[${clock(t.t)}] ${t.speaker}: ${t.text}`));
  return { title: `${meeting.meetingTitle} (${meeting.date})`, text: parts.join('\n') };
}
