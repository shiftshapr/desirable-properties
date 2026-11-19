import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { Blocks, Inline } from './DraftText';
import SessionLabel from './SessionLabel';

/** The process text with suggested insertions and deletions marked. Nothing in it is in force. */
export default function ProcessTextDraft({ text, turns }: { text: SessionDraft['processText']; turns: MetaGovTurn[] }) {
  return (
    <div id="draft-process-text" className="scroll-mt-24">
      <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
        Corrected process text, for community review <SessionLabel kind="Claude synthesis" />
      </h3>
      <p className="mt-3 text-base">
        <Inline text={text.intro} turns={turns} />
      </p>
      <p className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
        <span>Key:</span>
        <ins className="rounded bg-emerald-500/15 px-1 text-emerald-200 no-underline">suggested insertion</ins>
        <del className="rounded bg-rose-500/10 px-1 text-rose-300/90">suggested deletion</del>
      </p>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-base">
        <Blocks text={text.body} turns={turns} />
      </div>
    </div>
  );
}
