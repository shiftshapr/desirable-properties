import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Sign in – Desirable Properties Challenge',
};

function LoginFallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-slate-400">Loading sign-in…</div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
