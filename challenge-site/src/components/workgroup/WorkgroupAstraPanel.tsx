'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AstraChapterReader from '@/components/workgroup/AstraChapterReader';
import WorkgroupCanopiStrip from '@/components/workgroup/WorkgroupCanopiStrip';
import {
  AstraOmittedList,
  AstraProvenanceSummary,
} from '@/components/workgroup/AstraChangeDetail';
import { ASTRA_OPERATION_LABELS } from '@/lib/astra-types';
import type { AstraChapterBundle, AstraReleaseManifest } from '@/lib/astra-types';
import { fetchAstraApplauseClient } from '@/lib/astra-applause-api';
import { fetchAstraChapter, fetchAstraReleaseManifest } from '@/lib/astra-api';
import { findAstraChangeById, findAstraChangesByProposalId } from '@/lib/astra-highlights';
import { astraBookPdfHref, astraChapterPdfHref } from '@/lib/astra-pdf';
import { trackWorkgroupDownloadClient } from '@/lib/workgroup-download-track';
import { dpIdToAstraKey, truncateSha256 } from '@/lib/astra-utils';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import { govhubUrl, isDpDiscoveryWorkgroup } from '@/lib/govhub';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  deepLinkChangeId?: string | null;
  deepLinkProposalId?: string | null;
  onDeepLinkHandled?: () => void;
};

const DISCOVERY_DPS = Array.from({ length: 23 }, (_, index) => `DP${index + 1}`);

function mlDraftLabel(dpId: string): string {
  const mlByDp = dpMlDraftMap.map as Record<string, { mlNumber?: string }>;
  return mlByDp[dpId]?.mlNumber || 'ML-Draft';
}

function mlDraftReadHref(mlNumber: string): string {
  return govhubUrl(`/doc/draft/${mlNumber}/read/`);
}

export default function WorkgroupAstraPanel({
  workgroupId,
  workgroupSlug,
  dpId,
  deepLinkChangeId = null,
  deepLinkProposalId = null,
  onDeepLinkHandled,
}: Props) {
  const searchParams = useSearchParams();
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const queryDp = searchParams.get('dp')?.trim().toUpperCase() || null;

  const [selectedDpId, setSelectedDpId] = useState<string | null>(() => {
    if (dpId) return dpId;
    if (queryDp && /^DP\d+$/.test(queryDp)) return queryDp;
    return isDiscovery ? 'DP1' : null;
  });

  const [releaseManifest, setReleaseManifest] = useState<AstraReleaseManifest | null>(null);
  const [bundle, setBundle] = useState<AstraChapterBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedChangeId, setPinnedChangeId] = useState<string | null>(null);
  const [previewChangeId, setPreviewChangeId] = useState<string | null>(null);
  const [pulseChangeId, setPulseChangeId] = useState<string | null>(null);
  const [showOmitted, setShowOmitted] = useState(false);
  const [applauseTotals, setApplauseTotals] = useState<Record<string, number>>({});
  const [applauseMine, setApplauseMine] = useState<Record<string, number>>({});

  const dpKey = selectedDpId ? dpIdToAstraKey(selectedDpId) : '';
  const chapterIndex = releaseManifest?.chapters.find((entry) => entry.dpKey === dpKey) || null;

  useEffect(() => {
    if (dpId) setSelectedDpId(dpId);
  }, [dpId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const manifest = await fetchAstraReleaseManifest();
        if (cancelled) return;
        setReleaseManifest(manifest);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load Astra release');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!releaseManifest || !dpKey) {
      setBundle(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setBundle(null);
      setPinnedChangeId(null);
      setPreviewChangeId(null);

      if (chapterIndex?.status !== 'available') {
        setLoading(false);
        return;
      }

      try {
        const loaded = await fetchAstraChapter(dpKey);
        if (cancelled) return;
        setBundle(loaded);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load chapter');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [releaseManifest, dpKey, chapterIndex?.status]);

  const changes = bundle?.manifest.changes || [];
  const changeIdsKey = useMemo(
    () => changes.map((change) => change.id).join('\u0000'),
    [changes],
  );

  useEffect(() => {
    setApplauseTotals({});
    setApplauseMine({});
  }, [workgroupId]);

  useEffect(() => {
    if (!changeIdsKey || !workgroupId) return;
    const changeIds = changeIdsKey.split('\u0000');
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await fetchAstraApplauseClient(workgroupId, changeIds);
        if (cancelled) return;
        setApplauseTotals(snapshot.totals);
        setApplauseMine(snapshot.mine);
      } catch {
        /* keep prior totals on transient fetch errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workgroupId, changeIdsKey]);

  const handleApplauseUpdate = useCallback((changeId: string, next: { total: number; mine: number }) => {
    setApplauseTotals((prev) => ({ ...prev, [changeId]: next.total }));
    setApplauseMine((prev) => ({ ...prev, [changeId]: next.mine }));
  }, []);

  const handlePinChange = useCallback((changeId: string | null) => {
    setPinnedChangeId(changeId);
    if (changeId) setPreviewChangeId(null);
  }, []);

  const jumpToChange = useCallback((changeId: string) => {
    handlePinChange(changeId);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-astra-change-id="${changeId}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, [handlePinChange]);

  useEffect(() => {
    if (!bundle || !deepLinkChangeId) return;
    const match = findAstraChangeById(bundle.manifest.changes, deepLinkChangeId);
    if (!match) return;
    setPinnedChangeId(match.id);
    setPulseChangeId(match.id);
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-astra-change-id="${match.id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      setPulseChangeId(null);
      onDeepLinkHandled?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [bundle, deepLinkChangeId, onDeepLinkHandled]);

  useEffect(() => {
    if (!bundle || deepLinkChangeId || !deepLinkProposalId) return;
    const matches = findAstraChangesByProposalId(bundle.manifest.changes, deepLinkProposalId);
    if (!matches.length) return;
    const match = matches[0];
    setPinnedChangeId(match.id);
    setPulseChangeId(match.id);
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-astra-change-id="${match.id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      setPulseChangeId(null);
      onDeepLinkHandled?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [bundle, deepLinkChangeId, deepLinkProposalId, onDeepLinkHandled]);

  const headerMeta = useMemo(() => {
    if (!selectedDpId || !chapterIndex || !releaseManifest) return null;
    return {
      dpId: selectedDpId,
      mlDraft: chapterIndex.baselineMlDraft || mlDraftLabel(selectedDpId),
      releaseId: releaseManifest.releaseId,
      changeCount: chapterIndex.changeCount,
      omittedCount: chapterIndex.omittedCount,
      verified: Boolean(releaseManifest.verified && bundle?.manifest.verified),
    };
  }, [selectedDpId, chapterIndex, releaseManifest, bundle?.manifest.verified]);

  if (!selectedDpId && !isDiscovery) {
    return (
      <p className="text-sm text-slate-400">
        Astra recommendations are available on numbered DP workgroups.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <WorkgroupCanopiStrip workgroupSlug={workgroupSlug} dpId={selectedDpId} compact />

      <header className="space-y-3 border-b border-slate-800 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Astra recommendation</p>
            {headerMeta ? (
              <>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Compared to {headerMeta.mlDraft}
                  {headerMeta.dpId ? ` · ${headerMeta.dpId}` : ''}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Release {headerMeta.releaseId} · {headerMeta.changeCount} change
                  {headerMeta.changeCount === 1 ? '' : 's'}
                  {headerMeta.omittedCount > 0
                    ? ` · ${headerMeta.omittedCount} omitted proposal${headerMeta.omittedCount === 1 ? '' : 's'}`
                    : ''}
                  {headerMeta.verified ? (
                    <span className="ml-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
                      Replay verified
                    </span>
                  ) : null}
                </p>
              </>
            ) : (
              <h2 className="mt-1 text-xl font-semibold text-white">Astra editorial synthesis</h2>
            )}
          </div>

          {isDiscovery ? (
            <label className="flex min-w-[12rem] flex-col gap-1 text-sm text-slate-300">
              Chapter
              <select
                value={selectedDpId || 'DP1'}
                onChange={(event) => setSelectedDpId(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {DISCOVERY_DPS.map((id) => (
                  <option key={id} value={id}>
                    {id} · {mlDraftLabel(id)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {headerMeta ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href={astraBookPdfHref(headerMeta.releaseId)}
              download
              onClick={() =>
                trackWorkgroupDownloadClient(workgroupId, {
                  resourceLabel: 'Astra PDF (full book)',
                  resourceHref: astraBookPdfHref(headerMeta.releaseId),
                  resourceType: 'astra_book_pdf',
                })
              }
              className="rounded-lg bg-violet-800 px-4 py-2 font-medium text-white hover:bg-violet-700"
            >
              Download Astra PDF (full book)
            </a>
            {dpKey ? (
              <a
                href={astraChapterPdfHref(dpKey)}
                download
                onClick={() =>
                  trackWorkgroupDownloadClient(workgroupId, {
                    dpKey,
                    resourceLabel: `Astra chapter PDF (${dpKey.toUpperCase()})`,
                    resourceHref: astraChapterPdfHref(dpKey),
                    resourceType: 'astra_chapter_pdf',
                  })
                }
                className="rounded-lg border border-violet-700/60 bg-violet-950/40 px-4 py-2 font-medium text-violet-100 hover:border-violet-500"
              >
                Download this chapter (PDF)
              </a>
            ) : null}
            <Link
              href="/editorial-synthesis"
              className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-3 py-2 text-violet-200 hover:border-violet-600"
            >
              Editorial synthesis index
            </Link>
            <a
              href={mlDraftReadHref(headerMeta.mlDraft)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500"
            >
              Open baseline on Gov Hub
            </a>
            {bundle ? (
              <a
                href={`/api/astra/chapters/${encodeURIComponent(dpKey)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500"
              >
                View manifest JSON
              </a>
            ) : null}
          </div>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-slate-400">Loading Astra chapter…</p> : null}
      {error ? (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && chapterIndex?.status !== 'available' ? (
        <p className="text-sm text-slate-400">
          Astra has not published a recommendation for {selectedDpId} in release{' '}
          {releaseManifest?.releaseId || 'yet'}.
        </p>
      ) : null}

      {bundle ? (
        <div className="space-y-4">
          {changes.length > 0 ? (
            <details className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-200">
                Jump to change ({changes.length})
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {changes.map((change, index) => (
                  <button
                    key={change.id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      pinnedChangeId === change.id
                        ? 'border-cyan-500 bg-cyan-950/50 text-cyan-200'
                        : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                    }`}
                    onClick={() => jumpToChange(change.id)}
                  >
                    {index + 1}. {ASTRA_OPERATION_LABELS[change.operation]}
                  </button>
                ))}
              </div>
            </details>
          ) : (
            <p className="text-sm text-slate-400">No editorial changes in this chapter.</p>
          )}

          <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <AstraChapterReader
              markdown={bundle.markdown}
              changes={bundle.manifest.changes}
              pinnedChangeId={pinnedChangeId}
              previewChangeId={previewChangeId}
              pulseChangeId={pulseChangeId}
              onPinChange={handlePinChange}
              onPreviewChange={setPreviewChangeId}
              workgroupId={workgroupId}
              applauseTotals={applauseTotals}
              applauseMine={applauseMine}
              onApplauseUpdate={handleApplauseUpdate}
            />
          </article>

          <AstraProvenanceSummary
            manifest={bundle.manifest}
            releaseId={releaseManifest?.releaseId || bundle.manifest.releaseId}
            verified={Boolean(releaseManifest?.verified && bundle.manifest.verified)}
            showOmitted={showOmitted}
            onToggleOmitted={() => setShowOmitted((value) => !value)}
          />
          {showOmitted ? <AstraOmittedList omitted={bundle.manifest.omitted} /> : null}
        </div>
      ) : null}
    </div>
  );
}

export function truncateAstraHash(hash: string): string {
  return truncateSha256(hash);
}
