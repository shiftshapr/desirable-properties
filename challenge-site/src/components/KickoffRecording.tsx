'use client';

import { useId, useState } from 'react';
import { KICKOFF_AUDIO_SRC, KICKOFF_TRANSCRIPT } from '@/data/kickoff-transcript';

export default function KickoffRecording() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section id="recording" className="scroll-mt-20">
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">Recording</h2>
      <div className="mt-5 space-y-4">
        <p className="text-lg leading-relaxed text-slate-300">
          Audio from the September 16, 2024 Zoom (~96 minutes). The camera feed was not kept; this
          recording and the transcript are the archival record.
        </p>
        <audio
          className="w-full accent-cyan-400"
          controls
          preload="metadata"
          src={KICKOFF_AUDIO_SRC}
        >
          <a href={KICKOFF_AUDIO_SRC} className="text-cyan-300 hover:text-cyan-200">
            Download the kickoff audio (MP3)
          </a>
        </audio>
        <p className="text-sm text-slate-500">
          <a href={KICKOFF_AUDIO_SRC} className="text-cyan-300 hover:text-cyan-200">
            Download MP3
          </a>
          {' · '}
          Transcript below is automatic, with names corrected where the audio is clear.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-900/60"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            <span>{open ? 'Hide transcript' : 'Show transcript'}</span>
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <path
                d="M5 7l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {open ? (
            <div
              id={panelId}
              className="max-h-[min(32rem,70vh)] space-y-6 overflow-y-auto border-t border-slate-800 px-4 py-4 text-sm leading-relaxed text-slate-300"
            >
              {KICKOFF_TRANSCRIPT.map((block) => (
                <div key={block.startLabel}>
                  <p className="mb-2 font-medium tabular-nums text-cyan-400">{block.startLabel}</p>
                  {block.paragraphs.map((paragraph, index) => (
                    <p key={`${block.startLabel}-${index}`} className="mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
