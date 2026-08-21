'use client';

import { useCallback, useId, useRef, useState } from 'react';
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
  helperText = 'Search any Canopi member by @handle or email for direct delivery. Otherwise leave an email hint and we create a link to copy.',
  inputId,
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

  const pickUser = useCallback(
    (user: CanopiSearchUser) => {
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
        void searchCanopiUsers(searchParam)
          .then((users) => {
            const filtered = users.filter((u) => u.id !== value.user?.id);
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
    [value.user?.id],
  );

  return (
    <div className="relative">
      <label htmlFor={fieldId} className="block text-sm text-slate-300">
        {label}
        {value.user ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-700/50 bg-cyan-950/40 px-3 py-1 text-sm text-cyan-100">
              <span>{canopiUserDisplayName(value.user)}</span>
              {value.user.handle ? (
                <span className="text-cyan-300/80">@{value.user.handle}</span>
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
      </label>

      {showSuggest && suggestions.length > 0 && !value.user ? (
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
