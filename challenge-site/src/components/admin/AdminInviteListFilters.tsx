'use client';

import type { ReactNode } from 'react';
import {
  PROPOSED_ORG_HIDE_COUNT,
  PROPOSED_ORG_HIDE_GENERATED_AT,
  type InviteListFilterOptions,
} from '@/lib/dp-invite-contact-filters';

type Props = {
  excludeRecentSends: boolean;
  recentSendDays: number;
  hideOrgAddresses: boolean;
  compactView: boolean;
  onExcludeRecentSendsChange: (value: boolean) => void;
  onRecentSendDaysChange: (value: number) => void;
  onHideOrgAddressesChange: (value: boolean) => void;
  onCompactViewChange: (value: boolean) => void;
  filteredCount?: number;
  totalCount?: number;
  disabled?: boolean;
};

export default function AdminInviteListFilters({
  excludeRecentSends,
  recentSendDays,
  hideOrgAddresses,
  compactView,
  onExcludeRecentSendsChange,
  onRecentSendDaysChange,
  onHideOrgAddressesChange,
  onCompactViewChange,
  filteredCount,
  totalCount,
  disabled = false,
}: Props) {
  const showCounts =
    filteredCount != null && totalCount != null && filteredCount !== totalCount;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={excludeRecentSends}
            onChange={(e) => onExcludeRecentSendsChange(e.target.checked)}
            disabled={disabled}
          />
          Exclude emailed within
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="number"
            min={1}
            max={3650}
            value={recentSendDays}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onRecentSendDaysChange(Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
            }}
            disabled={disabled || !excludeRecentSends}
            className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 disabled:opacity-50"
          />
          days
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hideOrgAddresses}
            onChange={(e) => onHideOrgAddressesChange(e.target.checked)}
            disabled={disabled}
          />
          Hide org/non-person addresses
          <span className="text-xs text-slate-500">({PROPOSED_ORG_HIDE_COUNT} proposed)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={compactView}
            onChange={(e) => onCompactViewChange(e.target.checked)}
            disabled={disabled}
          />
          Compact view
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Org-hide list from{' '}
        <code className="text-slate-400">meta-console/docs/EMAIL-INVITES-PROPOSED-HIDES.md</code>
        {' '}(generated {PROPOSED_ORG_HIDE_GENERATED_AT}). Review before relying on the toggle.
        {showCounts ? (
          <>
            {' '}
            Showing {filteredCount} of {totalCount} contacts after filters.
          </>
        ) : null}
      </p>
    </div>
  );
}

type CompactListShellProps = {
  compactView: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  checkbox: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  actions?: ReactNode;
  details?: ReactNode;
};

export function AdminInviteCompactListRow({
  compactView,
  expanded,
  onToggleExpanded,
  checkbox,
  primary,
  secondary,
  actions,
  details,
}: CompactListShellProps) {
  const showDetails = !compactView || expanded;

  return (
    <li className="text-sm transition-colors">
      <div className="flex items-center gap-2 px-3 py-2">
        {compactView ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : null}
        {checkbox}
        <div className="min-w-0 flex-1">
          {primary}
          {compactView && !expanded && secondary ? (
            <div className="truncate text-xs text-slate-500">{secondary}</div>
          ) : null}
        </div>
        {actions}
      </div>
      {showDetails && details ? (
        <div className="border-t border-slate-800/80 px-4 py-2 pl-11 text-xs text-slate-500">
          {details}
        </div>
      ) : null}
    </li>
  );
}

export type { InviteListFilterOptions };
