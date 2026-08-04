'use client';

import Link from 'next/link';
import type { AdminAuthState } from '@/lib/use-admin-auth-gate';

type Props = {
  authState: AdminAuthState;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
};

export default function AdminAuthShell({ authState, error, onRetry, children }: Props) {
  if (authState === 'loading' || authState === 'signing-in') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Desirable Properties</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Site admin</h1>
        <p className="mt-4 text-slate-400">
          {authState === 'loading' ? 'Verifying admin access…' : 'Complete sign-in to continue…'}
        </p>
        {error ? (
          <p className="mt-4 rounded-md border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {authState === 'signing-in' && onRetry ? (
          <button
            type="button"
            onClick={() => {
              void onRetry();
            }}
            className="mt-6 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Sign in
          </button>
        ) : null}
      </div>
    );
  }

  if (authState === 'forbidden') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Desirable Properties</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Not authorized</h1>
        <p className="mt-4 text-slate-300">
          You are signed in, but this account is not on the site admin allowlist. Contact an
          existing admin if you need access.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Back to site
          </Link>
          {onRetry ? (
            <button
              type="button"
              onClick={() => {
                void onRetry();
              }}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Sign in with another account
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
