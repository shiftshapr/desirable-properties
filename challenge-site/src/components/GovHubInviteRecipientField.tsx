'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  fetchConnectedGovHubUsers,
  searchGovHubUsers,
} from '@/lib/govhub-user-search-api';
import type { GovHubSearchUser, GovHubShareRecipient } from '@/lib/govhub-user-search-types';

type GovHubInviteRecipientFieldProps = {
  value: GovHubShareRecipient;
  onChange: (next: GovHubShareRecipient) => void;
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

function emailTokenBeforeCursor(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s,;\n]+)?([a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*)$/);
  if (!match?.[1] || match[1].indexOf('@') < 1) return null;
  const local = match[1].split('@')[0];
  if (!local || local.length < 2) return null;
  return match[1];
}

function userHandle(user: GovHubSearchUser): string {
  return user.handle || user.username || user.email.split('@')[0] || '';
}

function userMatchesQuery(user: GovHubSearchUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    user.display_name.toLowerCase().includes(q)
    || user.email.toLowerCase().includes(q)
    || userHandle(user).toLowerCase().includes(q)
  );
}

export default function GovHubInviteRecipientField({
  value,
  onChange,
  disabled = false,
  label = 'Share with',
  helperText = 'Pick a Gov Hub member (@handle) for direct delivery, or leave an email hint for a link.',
  inputId,
}: GovHubInviteRecipientFieldProps) {
  const autoId = useId();
  const fieldId = inputId || autoId;
  const listboxId = `${fieldId}-suggest`;

  const [connected, setConnected] = useState<GovHubSearchUser[]>([]);
  const [connectedLoading, setConnectedLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<GovHubSearchUser[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConnectedLoading(true);
    void fetchConnectedGovHubUsers()
      .then((users) => {
        if (!cancelled) setConnected(users);
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
  }, []);

  const pickUser = useCallback(
    (user: GovHubSearchUser) => {
      onChange({ user, emailHint: '' });
      setSuggestions([]);
      setShowSuggest(false);
      setActiveIdx(-1);
      setSearchError(null);
    },
    [onChange],
  );

  const clearPicked = useCallback(() => {
    onChange({ user: null, emailHint: value.emailHint });
    inputRef.current?.focus();
  }, [onChange, value.emailHint]);

  const runSearch = useCallback(
    (raw: string, cursor: number) => {
      const handleQ = atQuery(raw, cursor);
      const emailTok = handleQ === null ? emailTokenBeforeCursor(raw, cursor) : null;
      const searchParam = handleQ !== null ? `@${handleQ}` : emailTok;

      if (!searchParam || searchParam.replace('@', '').length < 2) {
        setSuggestions([]);
        setSearchError(null);
        setShowSuggest(false);
        return;
      }

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void searchGovHubUsers(searchParam)
          .then((users) => {
            const filtered = users.filter((u) => u.id !== value.user?.id);
            setSuggestions(filtered);
            setSearchError(null);
            setShowSuggest(filtered.length > 0);
            setActiveIdx(filtered.length ? 0 : -1);
          })
          .catch((err) => {
            setSuggestions([]);
            setShowSuggest(false);
            setSearchError(err instanceof Error ? err.message : 'Search failed');
          });
      }, 200);
    },
    [value.user?.id],
  );

  const connectedSuggestions = useMemo(() => {
    if (value.user) return [];
    const q = value.emailHint.trim();
    return connected
      .filter((u) => userMatchesQuery(u, q))
      .slice(0, 8);
  }, [connected, value.emailHint, value.user]);

  const visibleSuggestions = suggestions.length ? suggestions : connectedSuggestions;
  const showConnectedSection = !suggestions.length && connectedSuggestions.length > 0 && !value.user;

  useEffect(() => {
    if (value.user) {
      setShowSuggest(false);
      return;
    }
    if (visibleSuggestions.length && (value.emailHint.trim().length >= 2 || showConnectedSection)) {
      setShowSuggest(true);
    }
  }, [value.user, value.emailHint, visibleSuggestions.length, showConnectedSection]);

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="block text-sm text-slate-300">
        {label}
        {value.user ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-700/50 bg-cyan-950/40 px-3 py-1 text-sm text-cyan-100">
              <span>{value.user.display_name}</span>
              {userHandle(value.user) ? (
                <span className="text-cyan-300/80">@{userHandle(value.user)}</span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={clearPicked}
                className="ml-1 rounded px-1 text-cyan-200/80 hover:bg-cyan-900/50 hover:text-white disabled:opacity-50"
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
            value={value.emailHint}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value;
              onChange({ user: null, emailHint: next });
              runSearch(next, e.target.selectionStart ?? next.length);
            }}
            onFocus={() => {
              if (connectedSuggestions.length) setShowSuggest(true);
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
                pickUser(visibleSuggestions[activeIdx]);
              } else if (e.key === 'Escape') {
                setShowSuggest(false);
              }
            }}
            placeholder="Type @handle or email"
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
        {!connectedLoading && connected.length > 0 && !value.user && !value.emailHint.trim() ? (
          <span className="mt-1 block text-xs text-slate-500">
            {connected.length} Gov Hub connection{connected.length === 1 ? '' : 's'} available to pick.
          </span>
        ) : null}
      </label>

      {showSuggest && visibleSuggestions.length > 0 && !value.user ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-lg"
        >
          {showConnectedSection ? (
            <li className="border-b border-slate-800 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Connected on Gov Hub
            </li>
          ) : null}
          {visibleSuggestions.map((user, index) => (
            <li key={user.id} role="option" aria-selected={index === activeIdx}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === activeIdx ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickUser(user);
                }}
              >
                <span className="font-medium">{user.display_name}</span>
                {userHandle(user) ? (
                  <span className="ml-2 text-xs text-slate-400">@{userHandle(user)}</span>
                ) : null}
                <span className="mt-0.5 block text-xs text-slate-500">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
