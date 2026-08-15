'use client';

import { useEffect, useMemo, useState } from 'react';
import BroadcastRecipientHistoryModal from '@/components/BroadcastRecipientHistoryModal';

export const BROADCAST_RECIPIENT_PAGE_SIZE = 50;

export type BroadcastRecipientListRow = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  workgroups: string[];
  hasSubmittedPatch?: boolean;
  patchCount?: number;
  cohortOnly?: boolean;
};

type Props = {
  rows: BroadcastRecipientListRow[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  onToggleAllVisible: (checked: boolean) => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  highlightKey?: string | null;
  workgroupIdByLabel: Map<string, string>;
  onNavigateWorkgroup: (wgId: string) => void;
  emptyMessage?: string;
};

export default function BroadcastRecipientList({
  rows,
  selected,
  onToggle,
  onToggleAllVisible,
  allVisibleSelected,
  someVisibleSelected,
  highlightKey,
  workgroupIdByLabel,
  onNavigateWorkgroup,
  emptyMessage = 'No recipients match the current filters.',
}: Props) {
  const [compactView, setCompactView] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [historyEmail, setHistoryEmail] = useState<string | null>(null);
  const [historyName, setHistoryName] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [rows.length, compactView]);

  const pageCount = Math.max(1, Math.ceil(rows.length / BROADCAST_RECIPIENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * BROADCAST_RECIPIENT_PAGE_SIZE;
  const pageRows = useMemo(
    () => rows.slice(pageStart, pageStart + BROADCAST_RECIPIENT_PAGE_SIZE),
    [rows, pageStart],
  );

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openHistory(row: BroadcastRecipientListRow) {
    const email = row.email?.trim();
    if (!email) return;
    setHistoryEmail(email);
    setHistoryName(row.userName);
  }

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = someVisibleSelected;
            }}
            onChange={(e) => onToggleAllVisible(e.target.checked)}
          />
          Select all visible ({rows.length})
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={compactView}
            onChange={(e) => setCompactView(e.target.checked)}
          />
          Compact view
        </label>
      </div>

      <ul className="mt-2 max-h-[min(32rem,60vh)] overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
        {pageRows.map((row) => {
          const expanded = !compactView || expandedKeys.has(row.key);
          const label = row.userName || row.userId || row.email || row.key;
          return (
            <li
              key={row.key}
              id={`member-${row.key}`}
              className={`text-sm transition-colors ${
                highlightKey === row.key ? 'bg-cyan-950/40' : ''
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                {compactView ? (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(row.key)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse details' : 'Expand details'}
                  >
                    {expanded ? '▼' : '▶'}
                  </button>
                ) : null}
                <input
                  type="checkbox"
                  checked={selected.has(row.key)}
                  onChange={() => onToggle(row.key)}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{label}</p>
                  {compactView && !expanded ? (
                    <p className="truncate text-xs text-slate-500">
                      {row.email || 'No email'}
                      {row.cohortOnly ? ' · Cohort only' : ''}
                    </p>
                  ) : null}
                </div>
                {row.email ? (
                  <button
                    type="button"
                    onClick={() => openHistory(row)}
                    className="shrink-0 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    History
                  </button>
                ) : null}
              </div>
              {expanded ? (
                <div className="border-t border-slate-800/80 px-4 py-2 pl-11 text-xs text-slate-500">
                  <p>
                    {row.workgroups.length ? (
                      row.workgroups.map((wgName, i) => {
                        const wgId = workgroupIdByLabel.get(wgName);
                        return (
                          <span key={`${row.key}-${wgName}`}>
                            {i > 0 ? ', ' : null}
                            {wgId ? (
                              <button
                                type="button"
                                onClick={() => onNavigateWorkgroup(wgId)}
                                className="text-slate-500 hover:text-cyan-300 hover:underline"
                              >
                                {wgName}
                              </button>
                            ) : (
                              wgName
                            )}
                          </span>
                        );
                      })
                    ) : (
                      'No workgroups'
                    )}
                    {row.hasSubmittedPatch
                      ? ` · ${row.patchCount || 1} patch${(row.patchCount || 1) === 1 ? '' : 'es'}`
                      : ' · No patch'}
                    {row.email ? ' · Receives email' : ' · No email on file'}
                    {row.cohortOnly ? ' · Not in DP challenge (cohort email only)' : ''}
                  </p>
                  {row.email ? <p className="mt-1 text-slate-400">{row.email}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {pageCount > 1 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
          <span>
            Showing {pageStart + 1}–{Math.min(pageStart + BROADCAST_RECIPIENT_PAGE_SIZE, rows.length)} of{' '}
            {rows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs">
              Page {safePage} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          {rows.length} recipient{rows.length === 1 ? '' : 's'}
          {rows.length > BROADCAST_RECIPIENT_PAGE_SIZE
            ? ` · ${BROADCAST_RECIPIENT_PAGE_SIZE} per page`
            : ''}
        </p>
      )}

      <BroadcastRecipientHistoryModal
        open={Boolean(historyEmail)}
        email={historyEmail}
        displayName={historyName}
        onClose={() => {
          setHistoryEmail(null);
          setHistoryName(null);
        }}
      />
    </>
  );
}
