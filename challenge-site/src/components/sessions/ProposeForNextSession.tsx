import NextSessionProposals from '@/components/sessions/NextSessionProposals';
import { upcomingTarget } from '@/lib/next-proposals/store.server';

/** "30 November" from YYYY-MM-DD. */
export function sessionDayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * "Propose for the next session": on every session page (owner, 25 Nov 2026). Targets the next community session that
 * has not started; renders nothing when none is announced yet. `pagePath` is this page, for the sign-in return.
 */
export default function ProposeForNextSession({ pagePath }: { pagePath: string }) {
  const target = upcomingTarget();
  if (!target) return null;
  const label = `the ${sessionDayLabel(target.date)} session`;
  return (
    <section id="propose-next" aria-labelledby="propose-next-heading" className="mt-8 scroll-mt-24 rounded-2xl border border-emerald-700/60 bg-emerald-950/20 px-5 py-5 sm:px-6">
      <h2 id="propose-next-heading" className="text-2xl font-semibold text-white">
        Propose something for the next session ({sessionDayLabel(target.date)})
      </h2>
      <div className="mt-3">
        <NextSessionProposals
          date={target.date}
          variant="box"
          sessionLabel={label}
          signInHref={`/login?next=${encodeURIComponent(`${pagePath}#propose-next`)}`}
        />
      </div>
    </section>
  );
}
