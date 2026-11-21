import type { PhaseTone } from '@/lib/sessions/session-phases';

/** Phase colours shared by the tracker, the sticky header and the call to action. */
export const PHASE_TONE: Record<PhaseTone, { pill: string; panel: string; button: string; dot: string; text: string }> = {
  draft: {
    pill: 'border-violet-500/60 bg-violet-950/60 text-violet-100',
    panel: 'border-violet-500/60 bg-violet-950/30',
    button: 'bg-violet-300 text-slate-950 hover:bg-violet-200',
    dot: 'bg-violet-400 text-slate-950',
    text: 'text-violet-200',
  },
  review: {
    pill: 'border-amber-500/60 bg-amber-950/60 text-amber-100',
    panel: 'border-amber-500/60 bg-amber-950/25',
    button: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
    dot: 'bg-amber-300 text-slate-950',
    text: 'text-amber-200',
  },
  screen: {
    pill: 'border-sky-500/60 bg-sky-950/60 text-sky-100',
    panel: 'border-sky-500/60 bg-sky-950/30',
    button: 'bg-sky-300 text-slate-950 hover:bg-sky-200',
    dot: 'bg-sky-300 text-slate-950',
    text: 'text-sky-200',
  },
  vote: {
    pill: 'border-cyan-400/70 bg-cyan-950/60 text-cyan-100',
    panel: 'border-cyan-400/70 bg-cyan-950/35',
    button: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
    dot: 'bg-cyan-300 text-slate-950',
    text: 'text-cyan-200',
  },
  decided: {
    pill: 'border-emerald-500/60 bg-emerald-950/60 text-emerald-100',
    panel: 'border-emerald-500/60 bg-emerald-950/30',
    button: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200',
    dot: 'bg-emerald-300 text-slate-950',
    text: 'text-emerald-200',
  },
};
