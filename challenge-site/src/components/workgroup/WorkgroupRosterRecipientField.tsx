'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  fetchConnectedGovHubUsers,
  searchGovHubUsers,
} from '@/lib/govhub-user-search-api';
import type { GovHubSearchUser } from '@/lib/govhub-user-search-types';
import type { WorkgroupRosterMember } from '@/lib/workgroup-collab-api';
import type { WorkgroupShareRecipient } from '@/lib/workgroup-share-recipient-types';

type WorkgroupRosterRecipientFieldProps = {
  members: WorkgroupRosterMember[];
  sharerUserId: string;
  value: WorkgroupShareRecipient;
  onChange: (next: WorkgroupShareRecipient) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  inputId?: string;
};

function atQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s,;\n])@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  return match[1];
}

function userHandle(user: GovHubSearchUser): string {
  return user.handle || user.username || user.email.split('@')[0] || '';
}

function rosterMatchesQuery(member: WorkgroupRosterMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return member.user_name.toLowerCase().includes(q);
}

function memberFromGovHubUser(
  user: GovHubSearchUser,
  rosterById: Map<string, WorkgroupRosterMember>,
): WorkgroupRosterMember | null {
  return rosterById.get(user.id) ?? null;
}

export default function WorkgroupRosterRecipientField({
  members,
  sharerUserId,
  value,
  onChange,
  disabled = false,
  label = 'Share with',
  helperText = 'Pick a workgroup member (@handle or name). Only active roster members qualify.',
  inputId,
}: WorkgroupRosterRecipientFieldProps) {
  const autoId = useId();
  const fieldId = inputId || autoId;
  const listboxId = `${fieldId}-suggest`;

  const [connected, setConnected] = useState<GovHubSearchUser[]>([]);
  const [connectedLoading, setConnectedLoading] = useState(true);
  const [remoteSuggestions, setRemoteSuggestions] = useState<WorkgroupRosterMember[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rosterPool = useMemo(
    () => members.filter((m) => m.user_id !== sharerUserId),
    [members, sharerUserId],
  );

  const rosterById = useMemo(() => {
    const map = new Map<string, WorkgroupRosterMember>();
    for (const member of rosterPool) map.set(member.user_id, member);
    return map;
  }, [rosterPool]);

  useEffect(() => {
    let cancelled = false;
    setConnectedLoading(true);
    void fetchConnectedGovHubUsers()
      .then((users) => {
        if (cancelled) return;
        const filtered = users
          .map((user) => memberFromGovHubUser(user, rosterById))
          .filter((member): member is WorkgroupRosterMember => Boolean(member));
        const seen = new Set<string>();
        setConnected(
          filtered
            .filter((member) => {
              if (seen.has(member.user_id)) return false;
              seen.add(member.user_id);
              return true;
            })
            .map((member) => ({
              id: member.user_id,
              username: member.user_name,
              handle: null,
              display_name: member.user_name,
              email: '',
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setConnected([]);
      })
      .finally(() => {
        if (!cancelled) setConnectedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rosterById]);

  const pickMember = useCallback(
    (member: WorkgroupRosterMember) => {
      onChange({ member, queryHint: '' });
      setRemoteSuggestions([]);
      setShowSuggest(false);
      setActiveIdx(-1);
      setSearchError(null);
    },
    [onChange],
  );

  const clearPicked = useCallback(() => {
    onChange({ member: null, queryHint: value.queryHint });
    inputRef.current?.focus();
  }, [onChange, value.queryHint]);

  const runSearch = useCallback(
    (raw: string, cursor: number) => {
      const handleQ = atQuery(raw, cursor);
      const plainQ = handleQ === null ? raw.trim() : handleQ;

      if (!plainQ || plainQ.length < 1) {
        setRemoteSuggestions([]);
        setSearchError(null);
        setShowSuggest(false);
        return;
      }

      const localMatches = rosterPool
        .filter((member) => rosterMatchesQuery(member, plainQ))
        .slice(0, 8);

      if (handleQ === null) {
        setRemoteSuggestions(localMatches);
        setSearchError(null);
        setShowSuggest(localMatches.length > 0);
        setActiveIdx(localMatches.length ? 0 : -1);
        return;
      }

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void searchGovHubUsers(`@${handleQ}`)
          .then((users) => {
            const rosterMatches = users
              .map((user) => memberFromGovHubUser(user, rosterById))
              .filter((member): member is WorkgroupRosterMember => Boolean(member))
              .filter((member) => member.user_id !== value.member?.user_id);
            const merged = rosterMatches.length ? rosterMatches : localMatches;
            setRemoteSuggestions(merged.slice(0, 8));
            setSearchError(null);
            setShowSuggest(merged.length > 0);
            setActiveIdx(merged.length ? 0 : -1);
          })
          .catch((err) => {
            setRemoteSuggestions(localMatches);
            setSearchError(err instanceof Error ? err.message : 'Search failed');
            setShowSuggest(localMatches.length > 0);
            setActiveIdx(localMatches.length ? 0 : -1);
          });
      }, 200);
    },
    [rosterById, rosterPool, value.member?.user_id],
  );

  const connectedMembers = useMemo(() => {
    if (value.member) return [] as WorkgroupRosterMember[];
    const q = value.queryHint.trim();
    return connected
      .map((user) => rosterById.get(user.id))
      .filter((member): member is WorkgroupRosterMember => Boolean(member))
      .filter((member) => rosterMatchesQuery(member, q))
      .slice(0, 8);
  }, [connected, rosterById, value.member, value.queryHint]);

  const visibleSuggestions = remoteSuggestions.length ? remoteSuggestions : connectedMembers;
  const showConnectedSection =
    !remoteSuggestions.length && connectedMembers.length > 0 && !value.member;

  useEffect(() => {
    if (value.member) {
      setShowSuggest(false);
      return;
    }
    if (visibleSuggestions.length && (value.queryHint.trim().length >= 1 || showConnectedSection)) {
      setShowSuggest(true);
    }
  }, [value.member, value.queryHint, visibleSuggestions.length, showConnectedSection]);

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="block text-sm text-slate-300">
        {label}
        {value.member ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-700/50 bg-violet-950/40 px-3 py-1 text-sm text-violet-100">
              <span>{value.member.user_name}</span>
              {value.member.is_facilitator ? (
                <span className="text-xs text-violet-300/90">facilitator</span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={clearPicked}
                className="ml-1 rounded px-1 text-violet-200/80 hover:bg-violet-900/50 hover:text-white disabled:opacity-50"
                aria-label="Remove recipient"
              >
                ×
              </button>
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={value.queryHint}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              onChange({ member: null, queryHint: next });
              runSearch(next, e.target.selectionStart ?? next.length);
            }}
            onFocus={() => {
              if (connectedMembers.length || value.queryHint.trim()) setShowSuggest(true);
            }}
            onBlur={() => {
              window.setTimeout(() => setShowSuggest(false), 150);
            }}
            onKeyDown={(e) => {
              if (!showSuggest || !visibleSuggestions.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((idx) => Math.min(idx + 1, visibleSuggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((idx) => Math.max(idx - 1, 0));
              } else if (e.key === 'Enter' && activeIdx >= 0) {
                e.preventDefault();
                pickMember(visibleSuggestions[activeIdx]!);
              } else if (e.key === 'Escape') {
                setShowSuggest(false);
              }
            }}
            placeholder="Type @handle or member name"
            className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggest}
            aria-controls={listboxId}
          />
        )}
        <span className="mt-1 block text-xs text-slate-500">{helperText}</span>
        {searchError ? (
          <span className="mt-1 block text-xs text-rose-300">{searchError}</span>
        ) : null}
        {!connectedLoading && connectedMembers.length > 0 && !value.member && !value.queryHint.trim() ? (
          <span className="mt-1 block text-xs text-slate-500">
            {connectedMembers.length} workgroup connection
            {connectedMembers.length === 1 ? '' : 's'} available to pick.
          </span>
        ) : null}
      </label>

      {showSuggest && visibleSuggestions.length > 0 && !value.member ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-lg"
        >
          {showConnectedSection ? (
            <li className="border-b border-slate-800 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Workgroup members you know
            </li>
          ) : null}
          {visibleSuggestions.map((member, index) => (
            <li key={member.user_id} role="option" aria-selected={index === activeIdx}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === activeIdx ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMember(member);
                }}
              >
                <span className="font-medium">{member.user_name}</span>
                {member.is_facilitator ? (
                  <span className="ml-2 text-xs text-violet-300">facilitator</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
