'use client';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { correctionDecisions, type CorrectionDecision } from '@/lib/listening/reducer';
import { clockFromMs, currentSegmentRev, type Contribution, type Segment, type Speaker } from '@/lib/listening/types';
import { ContributionLine } from '@/components/listening/SharedUnderstanding';
import { buttonClass, panelClass, useWorkspace } from '@/components/listening/ui';

export default function TranscriptDrawer({
  focus,
  onClose,
  pageTranscriptAnchor,
}: {
  focus: { segmentId: string; n: number } | null;
  onClose: () => void;
  /** Set when the page has its own reading transcript: this list is then compact and only for pointing at lines. */
  pageTranscriptAnchor?: string;
}) {
  const compact = Boolean(pageTranscriptAnchor);
  const { state } = useWorkspace();
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const speakers = useMemo(() => new Map(state.speakers.map((s) => [s.id, s])), [state.speakers]);
  const notes = useMemo(() => {
    const m = new Map<string, Contribution[]>();
    for (const k of state.contributions) {
      if (k.targetType === 'segment' && k.targetId) {
        const list = m.get(k.targetId) ?? [];
        list.push(k);
        m.set(k.targetId, list);
      }
    }
    return m;
  }, [state.contributions]);
  const decisions = useMemo(() => correctionDecisions(state), [state]);
  const q = query.trim().toLowerCase();
  const segments = q
    ? state.segments.filter((s) => {
        const sp = s.speakerId ? speakers.get(s.speakerId)?.zoomDisplayName ?? '' : '';
        return currentSegmentRev(s).text.toLowerCase().includes(q) || sp.toLowerCase().includes(q);
      })
    : state.segments;

  // Jump to a segment only when the reader asked (a source chip or a link).
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`seg-${focus.segmentId}`);
    const list = listRef.current;
    if (!el || !list) return;
    // Scroll only the transcript list, never the page around it.
    list.scrollTo({ top: Math.max(0, el.offsetTop - list.clientHeight / 2), behavior: 'smooth' });
    el.classList.add('ring-1', 'ring-cyan-500');
    const t = setTimeout(() => el.classList.remove('ring-1', 'ring-cyan-500'), 2500);
    return () => clearTimeout(t);
  }, [focus]);

  // During a replay, follow new lines only if the reader is already at the bottom.
  const count = state.segments.length;
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || state.meeting.transcriptMode !== 'replaying' || q) return;
    if (atBottom.current) el.scrollTop = el.scrollHeight;
  }, [count, state.meeting.transcriptMode, q]);

  return (
    <div className={`${panelClass} p-3 lg:mx-auto lg:max-w-[96rem] lg:bg-slate-950 lg:shadow-2xl lg:shadow-black/60`} data-testid="transcript-drawer">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-semibold text-white">{compact ? 'Point at a transcript line' : 'Transcript'}</h3>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the transcript"
          className="w-48 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
          aria-label="Search the transcript"
        />
        <button type="button" onClick={onClose} className={`${buttonClass} hidden lg:inline-block`}>
          Close
        </button>
      </div>
      {compact ? (
        <p className="mt-1 text-xs text-slate-400" data-testid="transcript-pointer-note">
          To read the transcript, use the{' '}
          <a href={pageTranscriptAnchor} className="text-cyan-300 hover:text-cyan-200">
            Transcript section
          </a>{' '}
          on this page. This list is only for pointing a comment or a correction at a line, and for seeing corrections.
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-slate-500">
        {state.meeting.transcriptSource ?? 'Transcript source not recorded.'} Speaker names are Zoom display names; they
        are not linked to site accounts. Corrections are kept next to the original, never in place of it.
      </p>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="relative mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1 [overflow-anchor:auto] lg:max-h-[34vh]"
        data-testid="transcript-list"
      >
        {segments.length === 0 ? <p className="text-sm text-slate-500">{q ? 'No matches.' : 'No transcript yet.'}</p> : null}
        {segments.map((s, i) => {
          const header = !q && s.section && s.section !== segments[i - 1]?.section ? s.section : null;
          return (
            <div key={s.id}>
              {header ? <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</p> : null}
              <SegmentRow segment={s} speaker={s.speakerId ? speakers.get(s.speakerId) : undefined} notes={notes.get(s.id)} decisions={decisions} compact={compact} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SegmentRow = memo(function SegmentRow({
  segment,
  speaker,
  notes,
  decisions,
  compact,
}: {
  compact: boolean;
  segment: Segment;
  speaker: Speaker | undefined;
  notes: Contribution[] | undefined;
  decisions: Map<string, CorrectionDecision>;
}) {
  const { setTarget, state } = useWorkspace();
  const [showOriginal, setShowOriginal] = useState(false);
  const rev = currentSegmentRev(segment);
  const original = segment.revs[0];
  const label = `${clockFromMs(segment.startMs)} ${speaker?.zoomDisplayName ?? 'Unknown speaker'}`;
  const facilitator = state.viewer.role === 'facilitator' || state.viewer.role === 'administrator';
  return (
    <div id={`seg-${segment.id}`} className="group rounded-lg px-2 py-1.5 hover:bg-slate-800/40" data-testid="segment" data-segment-id={segment.id}>
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="font-mono tabular-nums text-slate-500">{clockFromMs(segment.startMs)}</span>
        <span className="font-medium text-slate-200" title="Zoom display name, not linked to an account">
          {speaker?.zoomDisplayName ?? 'Unknown speaker'}
        </span>
        {segment.currentRev > 1 ? (
          <button type="button" className="text-[11px] text-amber-300" onClick={() => setShowOriginal((o) => !o)}>
            corrected · {showOriginal ? 'hide original' : 'show original'}
          </button>
        ) : null}
        <span className="ml-auto flex gap-1 opacity-70 group-hover:opacity-100">
          <button type="button" className="text-[11px] text-cyan-300 hover:text-cyan-200" data-testid="segment-comment" onClick={() => setTarget({ type: 'segment', id: segment.id, label, kind: 'comment' })}>
            Comment
          </button>
          <span className="text-slate-600">·</span>
          <button type="button" className="text-[11px] text-cyan-300 hover:text-cyan-200" data-testid="segment-correct" onClick={() => setTarget({ type: 'segment', id: segment.id, label, kind: 'correction_request' })}>
            Request a correction
          </button>
        </span>
      </div>
      <p className={`mt-0.5 leading-relaxed text-slate-300 ${compact ? 'line-clamp-1 text-xs' : 'text-sm'}`} data-testid="segment-text" title={compact ? rev.text : undefined}>
        {rev.text}
      </p>
      {showOriginal && original && original.rev !== rev.rev ? (
        <p className="mt-0.5 text-xs text-slate-500">Original transcript: {original.text}</p>
      ) : null}
      {notes?.length ? (
        <div className="mt-1 space-y-1 border-l border-slate-700 pl-2">
          {notes.map((k) => (
            <div key={k.id}>
              <ContributionLine k={k} />
              {k.kind === 'correction_request' ? <CorrectionStatus k={k} decision={decisions.get(k.id)} facilitator={facilitator} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

function CorrectionStatus({ k, decision, facilitator }: { k: Contribution; decision: CorrectionDecision | undefined; facilitator: boolean }) {
  const { act } = useWorkspace();
  const [text, setText] = useState(k.proposedText ?? '');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  if (decision) {
    return (
      <p className="text-[11px] text-slate-400" data-testid="correction-status">
        {decision.accepted ? 'Accepted' : 'Not accepted'} by {decision.actorName ?? 'a facilitator'}
        {decision.note ? `: ${decision.note}` : ''}
      </p>
    );
  }
  if (!facilitator) return <p className="text-[11px] text-slate-500" data-testid="correction-status">Awaiting a facilitator’s decision</p>;
  return (
    <div className="mt-1 space-y-1">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Corrected text" className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the author" className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs" />
      <div className="flex gap-1">
        <button
          type="button"
          className={buttonClass}
          onClick={async () => {
            const r = await act('correction.decide', { contributionId: k.id, accepted: true, correctedText: text, note });
            if (!r.ok) setMsg(r.message);
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={async () => {
            const r = await act('correction.decide', { contributionId: k.id, accepted: false, note });
            if (!r.ok) setMsg(r.message);
          }}
        >
          Not accepted
        </button>
      </div>
      {msg ? <p className="text-[11px] text-rose-300">{msg}</p> : null}
    </div>
  );
}
