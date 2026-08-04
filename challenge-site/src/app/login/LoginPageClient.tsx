'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

function safeReturnPath(raw: string | null) {
  const path = (raw || '').trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

function ensureApexDomain() {
  if (typeof window === 'undefined') return;
  if (window.location.hostname !== 'www.desirableproperties.org') return;
  window.location.replace(
    `https://desirableproperties.org${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked, login, loginBusy, loginError } = useAuth();
  const nextPath = safeReturnPath(searchParams.get('next'));
  const isAdminLogin =
    nextPath === '/admin' ||
    nextPath.startsWith('/admin/') ||
    nextPath.startsWith('/onchain/admin') ||
    nextPath.startsWith('/support/admin') ||
    nextPath.startsWith('/agent/admin');

  useEffect(() => {
    ensureApexDomain();
  }, []);

  useEffect(() => {
    if (checked && user) {
      router.replace(nextPath);
    }
  }, [checked, user, nextPath, router]);

  useEffect(() => {
    if (!isAdminLogin || !checked || user || loginBusy) return;
    void login().catch(() => {
      // loginError set in auth context
    });
  }, [isAdminLogin, checked, user, loginBusy, login]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300/90">
        {isAdminLogin ? 'Admin sign in' : 'Sign in'}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white">Desirable Properties</h1>
      <p className="mt-4 text-slate-300">
        {isAdminLogin
          ? 'Sign in with the same Web3Auth account used across the site. Only allowlisted admin emails can access admin tools after sign-in.'
          : 'Sign in to submit support requests, save agent threads, and track your contributions.'}
      </p>

      {loginError ? (
        <p className="mt-6 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {loginError}
        </p>
      ) : null}

      <div className="mt-8">
        <button
          type="button"
          disabled={loginBusy}
          onClick={() => {
            void login().catch(() => {
              // loginError set in auth context
            });
          }}
          className="flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
        >
          {loginBusy ? 'Signing in…' : 'Sign In'}
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        <Link href={nextPath} className="text-cyan-300 hover:text-cyan-200">
          ← Back
        </Link>
      </p>
    </div>
  );
}
