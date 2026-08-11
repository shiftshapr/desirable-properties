import { Suspense } from 'react';
import type { Metadata } from 'next';
import SupportPageClient from './SupportPageClient';

export const metadata: Metadata = {
  title: 'Support – Desirable Properties Challenge',
  description:
    'Submit a support request about the Desirable Properties Challenge, workgroups, the book, or technical issues.',
};

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-10 text-slate-400 sm:px-6">Loading support…</div>
      }
    >
      <SupportPageClient />
    </Suspense>
  );
}
