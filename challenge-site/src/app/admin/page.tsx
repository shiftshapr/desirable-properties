import { Suspense } from 'react';
import type { Metadata } from 'next';
import DpAdminClient from './DpAdminClient';

export const metadata: Metadata = {
  title: 'Admin · Desirable Properties Challenge',
  robots: { index: false, follow: false },
};

export default function DpAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-slate-400 sm:px-6">Loading admin…</div>
      }
    >
      <DpAdminClient />
    </Suspense>
  );
}
