'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { AstraChange, AstraChapterManifest, AstraOmittedProposal } from '@/lib/astra-types';
import { ASTRA_OPERATION_LABELS } from '@/lib/astra-types';
import { resolveChangeDisplayTexts } from '@/lib/astra-highlights';
import { useAuth } from '@/lib/auth-context';
import AstraApplauseButton from '@/components/workgroup/AstraApplauseButton';

type Props = {
  change: AstraChange | null;
  onClose: () => void;
  markdown?: string;
  workgroupId?: string | null;
  applauseTotal?: number;
  applauseMine?: number;
  onApplauseUpdate?: (next: { total: number; mine: number }) => void;
};

function SourceList({ change }: { change: AstraChange }) {
  if (!change.sources.length) {
    return <p className="text-sm text-slate-500">No external sources linked.</p>;
  }
  return (
    <ul className="space-y-2">
      {change.sources.map((source) => (
        <li key={`${source.type}-${source.id}`} className="text-sm">
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
            >
              {source.label}
            </a>
          ) : (
            <span className="text-slate-200">{source.label}</span>
          )}
          <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{source.type}</span>
          <span className="ml-2 font-mono text-xs text-slate-500">{source.id}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AstraChangeDetail({
  change,
  onClose,
  markdown = '',
  workgroupId = null,
  applauseTotal = 0,
  applauseMine = 0,
  onApplauseUpdate,
}: Props) {
  const { user, checked } = useAuth();
  const signedIn = Boolean(user);

  const displayTexts = useMemo(() => {
    if (!change || !markdown) {
      return { beforeText: change?.beforeText || '', afterText: change?.afterText || '' };
    }
    return resolveChangeDisplayTexts(markdown, change);
  }, [change, markdown]);

  if (!change) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
        Dwell on a highlighted passage (desktop) or tap a highlight to inspect a change.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">Change detail</p>
          <h3 className="mt-1 text-base font-semibold text-white">
            {ASTRA_OPERATION_LABELS[change.operation]}
          </h3>
          <p className="mt-1 font-mono text-xs text-slate-500">{change.id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500"
        >
          Close
        </button>
      </div>

      {workgroupId ? (
        <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Applaud this change
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Show support for this Astra recommendation. Totals are visible to everyone.
          </p>
          {checked && !signedIn ? (
            <p className="mt-2 text-sm text-slate-300">
              <Link href="/login" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                Sign in to applaud
              </Link>
              {' '}this change.
            </p>
          ) : onApplauseUpdate ? (
            <div className="mt-2">
              <AstraApplauseButton
                workgroupId={workgroupId}
                changeId={change.id}
                total={applauseTotal}
                mine={applauseMine}
                onUpdate={onApplauseUpdate}
                prominent
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              {applauseTotal} applaud{applauseTotal === 1 ? '' : 's'} so far.
            </p>
          )}
        </section>
      ) : null}

      {change.contextAnchor ? (
        <p className="text-xs text-slate-500">
          Anchor: <span className="font-mono text-slate-400">{change.contextAnchor}</span>
        </p>
      ) : null}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rationale</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{change.rationale}</p>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attribution</h4>
        <p className="mt-2 text-sm text-slate-200">{change.attribution.join(' · ')}</p>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Provenance</h4>
        <div className="mt-2">
          <SourceList change={change} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Specific change</h4>
        {displayTexts.beforeText ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Before</p>
            <p className="mt-1 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
              {displayTexts.beforeText}
            </p>
          </div>
        ) : null}
        {displayTexts.afterText ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">After</p>
            <p className="mt-1 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-slate-200">
              {displayTexts.afterText}
            </p>
          </div>
        ) : null}
        {change.operation === 'delete' && displayTexts.beforeText ? (
          <p className="text-xs text-rose-300/90">
            This passage was removed in the Astra recommendation. The marker shows where it attached.
          </p>
        ) : null}
      </section>
    </div>
  );
}

export function AstraProvenanceSummary({
  manifest,
  releaseId,
  verified,
  onToggleOmitted,
  showOmitted,
}: {
  manifest: AstraChapterManifest;
  releaseId: string;
  verified?: boolean;
  onToggleOmitted: () => void;
  showOmitted: boolean;
}) {
  return (
    <details className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-slate-200">Provenance &amp; verification</summary>
      <dl className="mt-3 space-y-2 text-xs text-slate-400">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-500">Release</dt>
          <dd className="font-mono text-slate-300">{releaseId}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-500">Baseline hash</dt>
          <dd className="font-mono text-slate-300">{manifest.baselineSha256}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-500">Final hash</dt>
          <dd className="font-mono text-slate-300">{manifest.finalSha256}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-slate-500">Replay verified</dt>
          <dd className={verified ? 'text-emerald-300' : 'text-slate-400'}>
            {verified ? 'Yes (CI)' : 'Not verified for this release'}
          </dd>
        </div>
      </dl>
      {manifest.omitted.length > 0 ? (
        <button
          type="button"
          onClick={onToggleOmitted}
          className="mt-3 text-xs text-cyan-300 hover:text-cyan-200"
        >
          {showOmitted ? 'Hide' : 'Show'} {manifest.omitted.length} omitted proposal
          {manifest.omitted.length === 1 ? '' : 's'}
        </button>
      ) : null}
    </details>
  );
}

export function AstraOmittedList({ omitted }: { omitted: AstraOmittedProposal[] }) {
  if (!omitted.length) return null;
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Omitted proposals</h4>
      <ul className="mt-3 space-y-3">
        {omitted.map((entry) => (
          <li key={entry.sourceId} className="text-sm">
            <p className="font-mono text-xs text-slate-500">{entry.sourceId}</p>
            {entry.label ? <p className="text-slate-200">{entry.label}</p> : null}
            <p className="mt-1 text-slate-400">{entry.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
