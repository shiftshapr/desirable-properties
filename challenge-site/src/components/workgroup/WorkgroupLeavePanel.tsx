'use client';

import { useEffect, useId, useRef, useState } from 'react';
import WorkgroupLeaveConfirmModal from '@/components/workgroup/WorkgroupLeaveConfirmModal';
import { useAuth } from '@/lib/auth-context';
import { leaveWorkgroup } from '@/lib/workgroup-collab-api';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  onLeft?: () => void;
  className?: string;
};

/** Subtle kebab menu with leave action for authenticated workgroup members. */
export default function WorkgroupLeavePanel({
  workgroupId,
  workgroupName,
  onLeft,
  className = '',
}: Props) {
  const { user, checked } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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

  function openLeaveConfirm() {
    setMenuOpen(false);
    setError(null);
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmLeave() {
    setBusy(true);
    try {
      await leaveWorkgroup(workgroupId);
      setConfirmOpen(false);
      onLeft?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Leave failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={busy || !checked}
        aria-label="Workgroup actions"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setMenuOpen((value) => !value)}
        className="rounded-md px-1.5 py-1 text-lg leading-none text-slate-500 hover:bg-slate-800/60 hover:text-slate-300 disabled:opacity-40"
      >
        ⋮
      </button>
      {menuOpen ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[168px] overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={openLeaveConfirm}
              className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-200 disabled:opacity-50"
            >
              {busy ? 'Leaving…' : 'Leave workgroup'}
            </button>
          </li>
        </ul>
      ) : null}
      {error ? (
        <p className="absolute right-0 top-full z-40 mt-12 w-max max-w-xs text-xs text-rose-300">
          {error}
        </p>
      ) : null}
      <WorkgroupLeaveConfirmModal
        open={confirmOpen}
        workgroupName={workgroupName}
        busy={busy}
        onConfirm={() => void confirmLeave()}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
      />
    </div>
  );
}
