'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AstraChapterReader from '@/components/workgroup/AstraChapterReader';
import WorkgroupCanopiStrip from '@/components/workgroup/WorkgroupCanopiStrip';
import WorkgroupChapterEditor from '@/components/workgroup/WorkgroupChapterEditor';
import WorkgroupMemberChapterView from '@/components/workgroup/WorkgroupMemberChapterView';
import { ASTRA_OPERATION_LABELS } from '@/lib/astra-types';
import type { AstraChapterBundle, AstraChange, AstraReleaseManifest } from '@/lib/astra-types';
import { fetchAstraChapter, fetchAstraReleaseManifest } from '@/lib/astra-api';
import { fetchAstraApplauseClient } from '@/lib/astra-applause-api';
import {
  fetchAstraRevocationsClient,
  setAstraRevocationClient,
} from '@/lib/astra-revocation-api';
import { fetchWorkgroupChapterEditsClient } from '@/lib/workgroup-chapter-edit-api';
import type { WorkgroupChapterEditList } from '@/lib/workgroup-chapter-edit-types';
import { dpIdToAstraKey } from '@/lib/astra-utils';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import { govhubUrl, isDpDiscoveryWorkgroup } from '@/lib/govhub';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  canEdit: boolean;
  isMember: boolean;
  signedIn: boolean;
};

const DISCOVERY_DPS = Array.from({ length: 23 }, (_, index) => `DP${index + 1}`);

const EMPTY_EDIT_STATE: WorkgroupChapterEditList = {
  edits: [],
  effectiveMarkdown: '',
  baseMarkdown: '',
  hasMemberEdits: false,
};

function mlDraftLabel(dpId: string): string {
  const mlByDp = dpMlDraftMap.map as Record<string, { mlNumber?: string }>;
  return mlByDp[dpId]?.mlNumber || 'ML-Draft';
}

export default function WorkgroupEditPanel({
  workgroupId,
  workgroupSlug,
  dpId,
  canEdit,
  isMember,
  signedIn,
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
  const [editState, setEditState] = useState<WorkgroupChapterEditList>(EMPTY_EDIT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set());
  const [revokeBusy, setRevokeBusy] = useState<string | null>(null);
  const [pinnedChangeId, setPinnedChangeId] = useState<string | null>(null);
  const [previewChangeId, setPreviewChangeId] = useState<string | null>(null);
  const [applauseTotals, setApplauseTotals] = useState<Record<string, number>>({});
  const [applauseMine, setApplauseMine] = useState<Record<string, number>>({});
  const [editRevision, setEditRevision] = useState(0);

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
      setEditState(EMPTY_EDIT_STATE);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setBundle(null);
      setEditState(EMPTY_EDIT_STATE);
      setRevokedIds(new Set());

      if (chapterIndex?.status !== 'available') {
        setLoading(false);
        return;
      }

      try {
        const [loaded, edits] = await Promise.all([
          fetchAstraChapter(dpKey),
          fetchWorkgroupChapterEditsClient(workgroupId, dpKey),
        ]);
        if (cancelled) return;
        setBundle(loaded);
        setEditState(edits);

        const changeIds = loaded.manifest.changes.map((c) => c.id);
        if (changeIds.length) {
          const snapshot = await fetchAstraRevocationsClient(workgroupId, changeIds);
          if (!cancelled) {
            setRevokedIds(new Set(Object.keys(snapshot.revoked)));
          }
        }
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
  }, [releaseManifest, dpKey, chapterIndex?.status, workgroupId]);

  const allChanges = bundle?.manifest.changes || [];
  const activeChanges = useMemo(
    () => allChanges.filter((change) => !revokedIds.has(change.id)),
    [allChanges, revokedIds],
  );
  const revokedChanges = useMemo(
    () => allChanges.filter((change) => revokedIds.has(change.id)),
    [allChanges, revokedIds],
  );
  const changeIdsKey = useMemo(
    () => allChanges.map((change) => change.id).join('\u0000'),
    [allChanges],
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

  const handleEditUpdate = useCallback((next: WorkgroupChapterEditList) => {
    setEditState(next);
    if (next.hasMemberEdits) {
      setEditRevision((value) => value + 1);
      window.requestAnimationFrame(() => {
        document.getElementById('read-chapter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  const handleRevokeToggle = useCallback(
    async (change: AstraChange, restore: boolean) => {
      if (!canEdit || revokeBusy) return;
      setRevokeBusy(change.id);
      try {
        const snapshot = await setAstraRevocationClient(
          workgroupId,
          change.id,
          restore ? 'restore' : 'revoke',
        );
        const next = new Set(revokedIds);
        if (snapshot.revoked[change.id]) {
          next.add(change.id);
        } else {
          next.delete(change.id);
        }
        setRevokedIds(next);
        if (restore && pinnedChangeId === change.id) {
          setPinnedChangeId(null);
        }
      } catch (toggleError) {
        setError(toggleError instanceof Error ? toggleError.message : 'Could not update patch');
      } finally {
        setRevokeBusy(null);
      }
    },
    [canEdit, revokeBusy, workgroupId, revokedIds, pinnedChangeId],
  );

  const jumpToChange = useCallback((changeId: string) => {
    setPinnedChangeId(changeId);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-astra-change-id="${changeId}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
  }, []);

  if (!selectedDpId && !isDiscovery) {
    return (
      <p className="text-sm text-slate-400">
        Chapter editing is available on numbered DP workgroups.
      </p>
    );
  }

  const showAstraHighlights = !editState.hasMemberEdits;

  return (
    <div className="space-y-5">
      <WorkgroupCanopiStrip workgroupSlug={workgroupSlug} dpId={selectedDpId} compact />

      <header className="space-y-3 border-b border-slate-800 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">Edit</p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Effective chapter
              {selectedDpId ? ` · ${selectedDpId}` : ''}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Astra recommendation plus workgroup edits. Coordinators revoke Astra patches or member
              edits below. Members propose markdown edits once joined.
            </p>
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

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/workgroups/${encodeURIComponent(workgroupSlug)}?tab=astra`}
            className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500"
          >
            Open Astra tab (full audit)
          </Link>
          <a
            href={govhubUrl(`/workgroups/${workgroupSlug}/`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-slate-500"
          >
            Gov Hub workgroup
          </a>
        </div>

        {bundle && releaseManifest ? (
          <nav
            aria-label="Edit tab sections"
            className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur-sm"
          >
            <a
              href="#read-chapter"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-700 hover:text-cyan-100"
            >
              Read effective chapter
            </a>
            <a
              href="#propose-edit"
              className="rounded-lg border border-cyan-800/60 bg-cyan-950/30 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:border-cyan-600"
            >
              Propose edit
            </a>
            {canEdit && allChanges.length > 0 ? (
              <a
                href="#astra-patches"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500"
              >
                Astra patches
              </a>
            ) : null}
          </nav>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-slate-400">Loading chapter…</p> : null}
      {error ? (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && chapterIndex?.status !== 'available' ? (
        <p className="text-sm text-slate-400">
          No Astra chapter available for {selectedDpId} in this release yet.
        </p>
      ) : null}

      {bundle && releaseManifest ? (
        <div className="space-y-4">
          <article
            id="read-chapter"
            className="min-w-0 scroll-mt-24 rounded-xl border border-slate-800 bg-slate-950/40 p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-slate-200">
              {showAstraHighlights ? 'Effective chapter (Astra highlights)' : 'Effective chapter (member edits)'}
            </h3>

            {showAstraHighlights ? (
              <>
                {activeChanges.length === 0 && allChanges.length > 0 ? (
                  <p className="mb-4 text-sm text-amber-200/90">
                    All Astra patches for this chapter are revoked.
                  </p>
                ) : null}
                <AstraChapterReader
                  markdown={bundle.markdown}
                  changes={activeChanges}
                  pinnedChangeId={pinnedChangeId}
                  previewChangeId={previewChangeId}
                  onPinChange={setPinnedChangeId}
                  onPreviewChange={setPreviewChangeId}
                  workgroupId={workgroupId}
                  applauseTotals={applauseTotals}
                  applauseMine={applauseMine}
                  onApplauseUpdate={handleApplauseUpdate}
                />
              </>
            ) : (
              <WorkgroupMemberChapterView editState={editState} editRevision={editRevision} />
            )}
          </article>

          <div id="propose-edit" className="scroll-mt-24">
            <WorkgroupChapterEditor
              workgroupId={workgroupId}
              dpKey={dpKey}
              astraReleaseId={releaseManifest.releaseId}
              editState={editState}
              canEdit={canEdit}
              isMember={isMember}
              signedIn={signedIn}
              onUpdate={handleEditUpdate}
            />
          </div>

          {canEdit && allChanges.length > 0 ? (
            <section
              id="astra-patches"
              className="scroll-mt-24 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <h3 className="text-sm font-semibold text-slate-200">Manage Astra patches</h3>
              <p className="mt-1 text-xs text-slate-500">
                {activeChanges.length} active · {revokedChanges.length} revoked
              </p>
              <ul className="mt-3 space-y-2">
                {allChanges.map((change, index) => {
                  const revoked = revokedIds.has(change.id);
                  return (
                    <li
                      key={change.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                    >
                      <button
                        type="button"
                        className="text-left text-slate-200 hover:text-cyan-200"
                        onClick={() => jumpToChange(change.id)}
                      >
                        {index + 1}. {ASTRA_OPERATION_LABELS[change.operation]}
                        <span className="ml-2 text-xs text-slate-500">{change.id}</span>
                      </button>
                      <button
                        type="button"
                        disabled={revokeBusy === change.id}
                        onClick={() => void handleRevokeToggle(change, revoked)}
                        className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                          revoked
                            ? 'border-emerald-800/60 text-emerald-200 hover:border-emerald-600'
                            : 'border-rose-800/60 text-rose-200 hover:border-rose-600'
                        } disabled:opacity-50`}
                      >
                        {revokeBusy === change.id
                          ? 'Saving…'
                          : revoked
                            ? 'Restore patch'
                            : 'Revoke patch'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
