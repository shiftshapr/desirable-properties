'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { resolveAvatarUrl } from '@/lib/avatar';
import { govhubUrl } from '@/lib/govhub';

export default function SiteAuthNav() {
  const { user, checked, login, loginBusy, loginError, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (!checked) {
    return (
      <span
        className="inline-block h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-800"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => {
            void login().catch(() => {
              // loginError is set in auth context
            });
          }}
          disabled={loginBusy}
          className="shrink-0 text-sm text-slate-300 hover:text-white disabled:opacity-60"
          title="Sign in with Web3Auth"
        >
          {loginBusy ? 'Signing in…' : 'Sign In'}
        </button>
        {loginError ? (
          <span className="max-w-[220px] text-right text-xs text-red-300" role="alert">
            {loginError}
          </span>
        ) : null}
      </div>
    );
  }

  const displayName = user.displayName || user.username;
  const avatarSrc = resolveAvatarUrl(user.profileImage, 40);
  const profileHref = govhubUrl(`/profile/${encodeURIComponent(user.username)}/`);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center rounded-full"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={displayName}
        aria-label={displayName}
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc}
            alt=""
            className="h-7 w-7 rounded-full border border-slate-700 object-cover"
            onError={(event) => {
              event.currentTarget.src = govhubUrl('/static/images/default-avatar.png');
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={govhubUrl('/static/images/default-avatar.png')}
            alt=""
            className="h-7 w-7 rounded-full border border-slate-700 object-cover"
          />
        )}
      </button>
      {menuOpen ? (
        <ul
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          <li role="none" className="border-b border-slate-800 px-4 py-2">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-slate-400">@{user.username}</p>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href={profileHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </a>
          </li>
          <li role="none">
            <a
              role="menuitem"
              href="/agent"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              DP Community AI
            </a>
          </li>
          <li role="none" className="border-t border-slate-800">
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={async () => {
                setMenuOpen(false);
                await logout();
              }}
            >
              Logout
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
