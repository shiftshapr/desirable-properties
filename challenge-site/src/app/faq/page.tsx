import Link from 'next/link';
import FaqList from '@/components/FaqList';
import { SITE_FAQ_COUNT, SITE_FAQ_SECTIONS } from '@/data/site-faq';
import { getCurrentMilestones } from '@/lib/challengeTimeline';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ – Desirable Properties Challenge',
  description:
    'Frequently asked questions about the Desirable Properties Challenge, Meta-Layer, workgroups, Discuss / Patch / Insert on the book, and the Interface Governance Hub.',
};

export default function FaqPage() {
  const now = new Date();
  const currentMilestones = getCurrentMilestones(now);

  const sections = SITE_FAQ_SECTIONS.map((section) => {
    if (section.id !== 'timeline') return section;

    return {
      ...section,
      items: section.items.map((item) => {
        if (item.q !== "What's happening right now?") return item;

        return {
          ...item,
          a: (
            <>
              {currentMilestones.length > 0 ? (
                <p>
                  Current {currentMilestones.length > 1 ? 'phases' : 'phase'}:{' '}
                  {currentMilestones.map((m, i) => (
                    <span key={m.id}>
                      {i > 0 ? '; ' : ''}
                      <strong className="font-semibold text-white">{m.title}</strong> (
                      {m.dateLabel})
                    </span>
                  ))}
                  .{' '}
                  {currentMilestones.length === 1
                    ? currentMilestones[0].description
                    : currentMilestones.map((m) => m.description).join(' ')}
                </p>
              ) : (
                <p>
                  See the live phase on the{' '}
                  <Link href="/challenge#timeline">Challenge timeline</Link>.
                </p>
              )}
              <p>
                Key upcoming milestones include Community Review Draft preparation in early
                September and the{' '}
                <Link href="/challenge#timeline">September 16 Community Review Draft milestone</Link>
                , with Version 1.0 targeted for November 13, 2026.
              </p>
            </>
          ),
        };
      }),
    };
  });

  return (
    <main className="border-b border-slate-800">
      <section className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Link href="/about" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← About
          </Link>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Desirable Properties Challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            Answers about the Challenge, the Meta-Layer, participating on the book (Discuss, Patch,
            and Insert), the Interface Governance Hub, workgroups, badges, and timeline.
          </p>
          <p className="mt-4 text-sm text-slate-500">{SITE_FAQ_COUNT} questions</p>
        </div>
      </section>

      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-20 border-b border-slate-800"
        >
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-white">{section.title}</h2>
            <div className="mt-8">
              <FaqList items={section.items} defaultOpenIndex={-1} />
            </div>
          </div>
        </section>
      ))}

      <section className="bg-slate-900/40">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white">Still have a question?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Submit a support request for challenge, workgroup, technical, or content questions.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Contact support
            </Link>
            <Link
              href="/participate"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Ways to participate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
