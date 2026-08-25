'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { searchCanopiUsers } from '@/lib/canopi-user-search-api';
import type { CanopiSearchUser, CanopiShareRecipient } from '@/lib/canopi-user-search-types';
import { canopiUserDisplayName } from '@/lib/canopi-user-search-types';

type CanopiInviteRecipientFieldProps = {
  value: CanopiShareRecipient;
  onChange: (next: CanopiShareRecipient) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  inputId?: string;
  maxRecipients?: number;
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

export default function CanopiInviteRecipientField({
  value,
  onChange,
  disabled = false,
  label = 'Share with',
  helperText = 'Search any Canopi member by @handle or email for direct delivery. Add multiple people, or leave an email hint and we create a link to copy.',
  inputId,
  maxRecipients = 20,
}: CanopiInviteRecipientFieldProps) {
  const autoId = useId();
  const fieldId = inputId || autoId;
  const listboxId = `${fieldId}-suggest`;

  const [suggestions, setSuggestions] = useState<CanopiSearchUser[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickedIdSet = useMemo(() => new Set(value.users.map((user) => user.id)), [value.users]);
  const atCapacity = value.users.length >= maxRecipients;

  const pickUser = useCallback(
    (user: CanopiSearchUser) => {
      if (pickedIdSet.has(user.id) || value.users.length >= maxRecipients) return;
      onChange({
        users: [...value.users, user],
        emailHint: '',
      });
      setSuggestions([]);
      setShowSuggest(false);
      setActiveIdx(-1);
      setSearchError(null);
      inputRef.current?.focus();
    },
    [maxRecipients, onChange, value.users],
  );

  const removePicked = useCallback(
    (userId: string) => {
      onChange({
        users: value.users.filter((user) => user.id !== userId),
        emailHint: value.emailHint,
      });
      inputRef.current?.focus();
    },
    [onChange, value.emailHint, value.users],
  );

  const runSearch = useCallback(
    (raw: string, cursor: number) => {
      if (atCapacity) {
        setSuggestions([]);
        setShowSuggest(false);
        return;
      }

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
        void searchCanopiUsers(searchParam)
          .then((users) => {
            const filtered = users.filter((user) => !pickedIdSet.has(user.id));
            setSuggestions(filtered);
            setSearchError(null);
            setShowSuggest(filtered.length > 0);
            setActiveIdx(-1);
          })
          .catch((err) => {
            setSuggestions([]);
            setShowSuggest(false);
            setSearchError(err instanceof Error ? err.message : 'Search failed');
          });
      }, 200);
    },
    [atCapacity, pickedIdSet],
  );

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="block text-sm text-slate-300">
        {label}
        <div className="mt-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 focus-within:border-cyan-700/60">
          {value.users.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {value.users.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-700/50 bg-cyan-950/40 px-3 py-1 text-sm text-cyan-100"
                >
                  <span>{canopiUserDisplayName(user)}</span>
                  {user.handle ? (
                    <span className="text-cyan-300/80">@{user.handle}</span>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removePicked(user.id)}
                    className="ml-1 rounded px-1 text-cyan-200/80 hover:bg-cyan-900/50 hover:text-white disabled:opacity-50"
                    aria-label={`Remove ${canopiUserDisplayName(user)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={value.emailHint}
            disabled={disabled || atCapacity}
            onChange={(e) => {
              const next = e.target.value;
              onChange({ users: value.users, emailHint: next });
              runSearch(next, e.target.selectionStart ?? next.length);
            }}
            onKeyUp={(e) => {
              const el = e.currentTarget;
              runSearch(el.value, el.selectionStart ?? el.value.length);
            }}
            onBlur={() => {
              window.setTimeout(() => setShowSuggest(false), 150);
            }}
            onKeyDown={(e) => {
              if (!showSuggest || !suggestions.length) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((idx) => Math.min(idx + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((idx) => Math.max(idx - 1, 0));
              } else if (e.key === 'Enter' && activeIdx >= 0 && showSuggest) {
                e.preventDefault();
                pickUser(suggestions[activeIdx]);
              } else if (e.key === 'Escape') {
                setShowSuggest(false);
                setActiveIdx(-1);
              }
            }}
            placeholder={
              atCapacity
                ? `Maximum ${maxRecipients} recipients`
                : value.users.length > 0
                  ? 'Add another @handle or email'
                  : 'Type @handle or email'
            }
            className="w-full border-0 bg-transparent px-1 py-1 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggest}
            aria-controls={listboxId}
          />
        </div>
        <span className="mt-1 block text-xs text-slate-500">{helperText}</span>
        {searchError ? (
          <span className="mt-1 block text-xs text-rose-300">{searchError}</span>
        ) : null}
      </label>

      {showSuggest && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-lg"
        >
          {suggestions.map((user, index) => (
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
                <span className="font-medium">{canopiUserDisplayName(user)}</span>
                {user.handle ? (
                  <span className="ml-2 text-xs text-slate-400">@{user.handle}</span>
                ) : null}
                {user.email ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{user.email}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
