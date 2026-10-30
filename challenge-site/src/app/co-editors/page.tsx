import Link from 'next/link';
import type { Metadata } from 'next';
import CoEditorGuideSteps from '@/components/workgroup/CoEditorGuideSteps';

export const metadata: Metadata = {
  title: 'Co-editor guide – Desirable Properties',
  description:
    'Step by step: how a DP co-editor reviews proposals on the Review tab, asks Deepi when unsure, and approves, revises or declines each one.',
};

export default function CoEditorGuidePage() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">Co-editor guide</p>
      <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">How to review proposals</h1>
      <p className="mt-4 text-lg text-slate-300">
        Each DP has two co-editors. You read every proposal for your DP on the Review tab and approve, revise or decline
        it. These steps take you through one session.
      </p>

      <CoEditorGuideSteps />

      <section className="mt-10 space-y-3 text-sm leading-relaxed text-slate-400">
        <h2 className="text-lg font-semibold text-white">Good to know</h2>
        <p>
          You may approve your own proposals. You can withdraw your own proposal while it is open.
        </p>
        <p>
          Judge substance first. Do not decline a sound idea for style alone: revise it, and cite the rule when style is
          the reason. See the{' '}
          <Link href="/style-guide#co-editors" className="text-cyan-300 hover:text-cyan-200">
            style guide’s notes for co-editors
          </Link>
          .
        </p>
        <p>
          Roles and the full process are on{' '}
          <Link href="/process#roles" className="text-cyan-300 hover:text-cyan-200">
            How Version 1.0 gets made
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
