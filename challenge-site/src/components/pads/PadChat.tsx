'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';

const HermesChat = dynamic(() => import('@/components/HermesChat'), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-slate-400">Opening Deepi…</p>,
});

type Props = {
  padId: string;
  dpNumber: number | null;
  /** The proposal, its chapter passage and record, as Markdown: sent with every message. */
  context: string;
  starters: string[];
  /** Defaults are for proposal pads; other pads (meeting pads) pass their own. */
  surface?: string;
  contextTitle?: string;
  intro?: string;
  starterLabel?: string;
};

/** Deepi (the site's HermesChat), scoped to this proposal: the pad's text goes with each message as page context. */
export default function PadChat({ padId, dpNumber, context, starters, surface, contextTitle, intro, starterLabel }: Props) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <p className="min-w-0 flex-1 text-sm text-slate-300">
          {intro ?? 'Ask Deepi about this proposal. It reads the proposal, its passage in the chapter and the record above.'}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Ask Deepi
        </button>
      </div>
    );
  }
  return (
    <div className="h-[620px] overflow-hidden rounded-xl border border-slate-800">
      <Suspense fallback={null}>
        <HermesChat
          compact
          surface={surface ?? `desirableproperties.org/pads/proposals/${padId}`}
          dpFocus={dpNumber}
          starterPrompts={starters}
          starterLabel={starterLabel ?? 'About this proposal'}
          context={{ title: contextTitle ?? `Proposal pad ${padId}`, text: context }}
        />
      </Suspense>
    </div>
  );
}
