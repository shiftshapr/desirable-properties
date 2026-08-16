'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SignInPanel from '@/components/SignInPanel';
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
  const { user, checked } = useAuth();
  const rawNext = safeReturnPath(searchParams.get('next'));
  const nextPath = rawNext.startsWith('/support/admin') ? '/admin?tab=support' : rawNext;
  const isAdminLogin =
    nextPath === '/admin' ||
    nextPath.startsWith('/admin/') ||
    nextPath.startsWith('/admin?') ||
    nextPath.startsWith('/onchain/admin') ||
    rawNext.startsWith('/support/admin') ||
    nextPath.startsWith('/agent/admin');

  useEffect(() => {
    ensureApexDomain();
  }, []);

  useEffect(() => {
    if (checked && user) {
      router.replace(nextPath);
    }
  }, [checked, user, nextPath, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300/90">
        {isAdminLogin ? 'Admin sign in' : 'Sign in'}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white">Desirable Properties</h1>
      <p className="mt-4 text-slate-300">
        {isAdminLogin
          ? 'Sign in with the same Web3Auth account used across the site. Only allowlisted admin emails can access admin tools after sign-in.'
          : 'Sign in with Google or the email you want to use for this account. Hotmail, Outlook, and other non-Google addresses should use Continue with email.'}
      </p>

      <div className="mt-8">
        <SignInPanel />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        <Link href={nextPath} className="text-cyan-300 hover:text-cyan-200">
          ← Back
        </Link>
      </p>
    </div>
  );
}
