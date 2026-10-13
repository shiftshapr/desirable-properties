import Link from 'next/link';
import type { Metadata } from 'next';
import { shortDate } from '@/data/dp-process';
import { STYLE_GUIDE, STYLE_GUIDE_UPDATED, STYLE_GUIDE_VERSION } from '@/data/dp-style-guide';

export const metadata: Metadata = {
  title: 'Style guide – Desirable Properties',
  description:
    'How the Desirable Properties book is written: readers, voice, requirement language, structure, terms, formatting, sources, and how to write a patch or insert.',
};

export default function StyleGuidePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/process" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← How Version 1.0 gets made
      </Link>
      <header className="mt-6 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          Desirable Properties · Version 1.0
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Style guide</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
          Twenty-three workgroups write one book. This guide keeps it reading as one book: who we write
          for, the voice, how requirements are worded, and how to write a patch or insert that fits.
          Most rules record what the chapters already do; the rest settle where chapters disagree.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Version {STYLE_GUIDE_VERSION} · updated {shortDate(STYLE_GUIDE_UPDATED)}
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Style guide sections">
          {STYLE_GUIDE.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-cyan-300 hover:text-cyan-200">
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      {STYLE_GUIDE.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-20 border-b border-slate-800 py-10">
          <h2 className="text-2xl font-bold text-white">{section.title}</h2>
          <p className="mt-3 max-w-3xl text-slate-300">{section.lead}</p>
          <ol className="mt-6 space-y-4">
            {section.rules.map((r, i) => (
              <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-slate-100">{r.rule}</p>
                {r.why ? <p className="mt-1 text-sm text-slate-400">{r.why}</p> : null}
                {r.do || r.dont ? (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {r.do ? (
                      <p className="rounded-md border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-emerald-100">
                        <span className="mr-1 font-semibold text-emerald-300">Do:</span>
                        {r.do}
                      </p>
                    ) : null}
                    {r.dont ? (
                      <p className="rounded-md border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-rose-100">
                        <span className="mr-1 font-semibold text-rose-300">Don’t:</span>
                        {r.dont}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className="mt-10 text-sm text-slate-400">
        Questions or a rule that does not work for your chapter? Raise it at the Monday session or in your
        workgroup chat; changes to this guide are agreed there and dated above.
      </p>
    </main>
  );
}
