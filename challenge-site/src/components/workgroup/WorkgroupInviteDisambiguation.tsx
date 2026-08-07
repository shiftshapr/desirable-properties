'use client';

import type { InviteCandidate } from '@/lib/workgroup-collab-types';

type Props = {
  candidates: InviteCandidate[];
  busy?: boolean;
  onSelect: (index: number) => void;
};

export default function WorkgroupInviteDisambiguation({ candidates, busy, onSelect }: Props) {
  if (!candidates.length) {
    return (
      <p className="text-sm text-slate-400">
        Research was ambiguous but no candidates were returned. Try adding a LinkedIn URL or extra links.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        Multiple people may match. Choose the correct person to continue.
      </p>
      <ul className="space-y-3">
        {candidates.map((c, index) => (
          <li
            key={`${c.name || 'candidate'}-${index}`}
            className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
          >
            <p className="font-medium text-white">{c.name || `Candidate ${index + 1}`}</p>
            {c.headline ? <p className="mt-1 text-sm text-slate-400">{c.headline}</p> : null}
            {c.source_urls?.length ? (
              <ul className="mt-2 space-y-1 text-xs text-cyan-300/90">
                {c.source_urls.slice(0, 3).map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(index)}
              className="mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-100 hover:border-cyan-600 disabled:opacity-50"
            >
              This is the right person
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
