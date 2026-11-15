import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site-metadata';
import AckRequestForm from './AckRequestForm';

const TITLE = 'Ask for a change to the Acknowledgements';
const DESCRIPTION =
  'Ask to be added to the Acknowledgements of The Layered Web, to correct how your name appears, to change an affiliation or list, or to be removed.';

export const metadata: Metadata = {
  title: `${TITLE} – Desirable Properties`,
  description: DESCRIPTION,
  openGraph: pageOpenGraph({ title: TITLE, description: DESCRIPTION, path: '/acknowledgements/request' }),
};

export default function AckRequestPage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-violet-300">The Layered Web · Acknowledgements</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{TITLE}</h1>
      <div className="mt-4 space-y-3 text-base text-slate-300">
        <p>
          The <a href="/viewer/acknowledgements" className="text-cyan-300 underline hover:text-cyan-200">Acknowledgements</a>{' '}
          thank everyone who helped make the book: the First Call for Input (2024), the Second Call for Input
          (2025), the Desirable Properties Challenge, and the co-editors and steering committee. Names are listed
          as people&apos;s real names.
        </p>
        <p>
          If you are missing, your name is wrong, or you would rather not be listed, tell us here. You do not
          need an account. The steering committee reads every request. Changes go into the next version of the
          book (Version 1.1); the published Version 1.0 does not change.
        </p>
        <p className="text-sm text-slate-400">
          We use your email only to reach you about this request. Requests are private: they are not published
          and are not used for search or AI.
        </p>
      </div>
      <Suspense fallback={<p className="mt-8 text-slate-400">Loading the form…</p>}>
        <AckRequestForm />
      </Suspense>
    </main>
  );
}
