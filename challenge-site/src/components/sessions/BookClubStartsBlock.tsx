import Link from 'next/link';
import { bookClubHref } from '@/data/book-club';

const linkClass = 'text-cyan-300 hover:text-cyan-200';

/**
 * "Book club starts Monday 30 November": the block on the 23 November session page (where the club was decided)
 * and on the 30 November session pad (/roundups/2026-11-30), where it sits at the top until that meeting is over
 * and lower down afterwards (owner, 27 Nov 2026). It links to the Book Club pad.
 *
 * `on` is the page it is shown on: the wording that points at "this meeting" and "the next session" differs.
 */
export default function BookClubStartsBlock({ on, className = 'mt-8' }: { on: 'decided' | 'session'; className?: string }) {
  const decided = on === 'decided';
  return (
    <section id="book-club" aria-labelledby="book-club-heading" className={`${className} scroll-mt-24 rounded-2xl border border-cyan-500/60 bg-cyan-950/30 px-5 py-5 sm:px-6`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {decided ? 'Decided in this meeting' : 'Decided on 23 November'}
      </p>
      <h2 id="book-club-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">Book club starts Monday 30 November</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-100">
        {decided ? 'The next session' : 'This session'} opens with a 30-minute book club on <em>The Layered Web</em>. We start with the front matter:
        About this digital monument, the Foreword, the Introduction and the Acknowledgements. Read them before the
        session if you can, and bring a question or insight. Everyone is welcome, whether or not you
        contributed to the book.
      </p>
      <p className="mt-2 text-sm text-slate-300">
        Monday 30 November, 10:00 a.m. Pacific (6:00 p.m. UTC). Salwa El Mais moved it and Leandra Preston seconded.
        How the club picks what to read next is on {decided ? 'that' : 'this'} session&apos;s agenda.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href="https://book.desirableproperties.org/viewer/book_cover?ref=pad-1124-bookclub" className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200">
          Read the front matter →
        </a>
        <Link href={bookClubHref('2026-11-30')} className="inline-flex rounded-lg border border-cyan-300 px-5 py-2.5 font-semibold text-cyan-200 no-underline hover:bg-cyan-300/10">
          Book Club pad →
        </Link>
        <a href="https://luma.com/gra1xda9" className={linkClass} rel="noopener noreferrer">Register on Luma</a>
        {decided ? (
          <Link href="/roundups/2026-11-30" className={linkClass}>The 30 November session</Link>
        ) : (
          <Link href="/events/listening-2026-11-23#decided-in-meeting" className={linkClass}>The 23 November decision</Link>
        )}
      </div>
    </section>
  );
}
