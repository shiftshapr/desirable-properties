'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Collapsible, searchable meeting transcript: one <details> per section, a speaker and timestamp per turn.
 * Links to `#t-<seconds>` (from the summary, or shared) open the turn's section and scroll to it.
 */

type Turn = { id: string; t: number; speaker: string; text: string };
type Section = { t: number; title: string };

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: React.ReactNode[] = [];
  let at = 0;
  for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, at)) {
    if (i > at) out.push(text.slice(at, i));
    out.push(
      <mark key={i} className="rounded bg-cyan-300/30 px-0.5 text-white">
        {text.slice(i, i + q.length)}
      </mark>,
    );
    at = i + q.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

export default function SessionTranscript({ sections, turns }: { sections: Section[]; turns: Turn[] }) {
  const groups = useMemo(
    () =>
      sections.map((section, i) => {
        const end = sections[i + 1]?.t ?? Infinity;
        return { section, turns: turns.filter((turn) => turn.t >= section.t && turn.t < end) };
      }),
    [sections, turns],
  );
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [query, setQuery] = useState('');
  const q = query.trim();

  const openForHash = useCallback(() => {
    const m = /^#(t-\d+[a-h]?)$/.exec(window.location.hash);
    if (!m) return;
    const id = m[1];
    const group = groups.find((g) => g.turns.some((turn) => turn.id === id));
    if (!group) return;
    setQuery('');
    setOpen((prev) => new Set(prev).add(group.section.t));
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-400/70');
      window.setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400/70'), 2500);
    });
  }, [groups]);

  useEffect(() => {
    // A shared link with #t-… opens its section once the page has hydrated.
    const frame = window.requestAnimationFrame(openForHash);
    window.addEventListener('hashchange', openForHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', openForHash);
    };
  }, [openForHash]);

  const matches = useMemo(() => {
    if (!q) return null;
    const lq = q.toLowerCase();
    return turns.filter((turn) => turn.text.toLowerCase().includes(lq) || turn.speaker.toLowerCase().includes(lq));
  }, [q, turns]);

  const allOpen = open.size === sections.length;

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Search the transcript</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the transcript (words or a speaker’s name)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map((s) => s.t)))}
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-700 hover:text-white"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {matches ? (
        <div className="mt-5" aria-live="polite">
          <p className="text-sm text-slate-400">
            {matches.length} {matches.length === 1 ? 'turn matches' : 'turns match'} “{q}”.
          </p>
          <div className="mt-4 space-y-4">
            {matches.map((turn) => (
              <p key={turn.id} className="text-base leading-relaxed text-slate-300">
                <span className="mr-2 inline-flex gap-2 align-baseline">
                  <a
                    href={`#${turn.id}`}
                    className="font-mono text-sm tabular-nums text-cyan-300 hover:text-cyan-200 hover:underline"
                  >
                    {clock(turn.t)}
                  </a>
                  <strong className="text-slate-100">{highlight(turn.speaker, q)}:</strong>
                </span>
                {highlight(turn.text, q)}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {groups.map(({ section, turns: list }) => (
            <details
              key={section.t}
              open={open.has(section.t)}
              onToggle={(e) => {
                const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                setOpen((prev) => {
                  if (prev.has(section.t) === isOpen) return prev;
                  const next = new Set(prev);
                  if (isOpen) next.add(section.t);
                  else next.delete(section.t);
                  return next;
                });
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/40"
            >
              <summary className="flex cursor-pointer gap-3 px-4 py-3 text-base font-medium text-slate-100 hover:bg-slate-900/60">
                <span className="font-mono text-sm tabular-nums text-cyan-300">{clock(section.t)}</span>
                <span>{section.title}</span>
                <span className="ml-auto shrink-0 text-sm font-normal text-slate-500">{list.length}</span>
              </summary>
              <div className="space-y-4 px-4 pb-5 pt-2 sm:px-6">
                {list.map((turn) => (
                  <p
                    key={turn.id}
                    id={turn.id}
                    className="scroll-mt-24 rounded text-base leading-relaxed text-slate-300 transition"
                  >
                    <span className="mr-2 inline-flex gap-2 align-baseline">
                      <a
                        href={`#${turn.id}`}
                        className="font-mono text-sm tabular-nums text-cyan-300 hover:text-cyan-200 hover:underline"
                        aria-label={`Link to ${clock(turn.t)}`}
                      >
                        {clock(turn.t)}
                      </a>
                      <strong className="text-slate-100">{turn.speaker}:</strong>
                    </span>
                    {turn.text}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
