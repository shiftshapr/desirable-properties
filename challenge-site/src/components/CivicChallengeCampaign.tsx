import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { capabilityLabel } from '@/data/civic-challenges/capabilities';
import type { CivicChallenge } from '@/data/civic-challenges/schema';
import {
  resolveCivicChallengeActions,
  type ResolvedCivicAction,
} from '@/lib/civic-challenge-actions';

type Props = {
  challenge: CivicChallenge;
  catalogId: string;
  workgroupSlug?: string | null;
};

function ActionLink({ action }: { action: ResolvedCivicAction }) {
  const className =
    'inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm font-medium text-slate-100 hover:border-cyan-700 hover:text-cyan-200';

  if (action.external || action.href.startsWith('http')) {
    if (action.id === 'improve') {
      return (
        <DiscussPatchLink href={action.href} className={className}>
          {action.label}
        </DiscussPatchLink>
      );
    }
    return (
      <a href={action.href} className={className} target="_blank" rel="noopener noreferrer">
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export default function CivicChallengeCampaign({
  challenge,
  catalogId,
  workgroupSlug,
}: Props) {
  const actions = resolveCivicChallengeActions(challenge, { workgroupSlug });
  const resources = challenge.resources.filter((r) => r.href);
  const accent = challenge.presentation?.themeColor;

  return (
    <div className="space-y-10">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded bg-cyan-950 px-2 py-1 text-xs font-semibold text-cyan-300"
            style={accent ? { color: accent, backgroundColor: `${accent}22` } : undefined}
          >
            {catalogId}
          </span>
          <span className="text-xs uppercase tracking-wide text-slate-500">{challenge.status}</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{challenge.title}</h1>
        <p className="mt-4 text-xl font-medium leading-snug text-cyan-300 sm:text-2xl">
          {challenge.guidingQuestion}
        </p>
        <p className="mt-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          {challenge.humanIssue}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-white">{challenge.hero.headline}</h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">{challenge.hero.text}</p>
      </section>

      {challenge.problemStory.stakes && challenge.problemStory.stakes.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {challenge.problemStory.title || 'Why this matters'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            {challenge.problemStory.scenario}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {challenge.problemStory.stakes.map((stake) => (
              <li
                key={stake}
                className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs text-slate-300"
              >
                {stake}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {challenge.problemStory.title || 'Why this matters'}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            {challenge.problemStory.scenario}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Today&apos;s challenges
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {challenge.currentChallenges.map((item) => (
            <li
              key={item}
              className="rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-200"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-base font-semibold text-white">
            {challenge.webLimitations.title || "Why today's Web struggles"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {challenge.webLimitations.text}
          </p>
          <p className="mt-3 text-xs text-slate-500">{challenge.webProblem}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-base font-semibold text-white">
            {challenge.futureVision.title || 'Imagine instead'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{challenge.futureVision.text}</p>
          {challenge.futureVision.bullets && challenge.futureVision.bullets.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
              {challenge.futureVision.bullets.slice(0, 4).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-cyan-400/80">{challenge.opportunity}</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Why this matters to everyone
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {challenge.audiences.map((aud) => (
            <li
              key={aud.id}
              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <span className="text-sm font-medium text-cyan-300">{aud.label}</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{aud.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Meta-Layer capabilities
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {challenge.capabilities.map((id) => (
            <li
              key={id}
              className="rounded-full border border-cyan-900/60 bg-cyan-950/30 px-3 py-1 text-xs font-medium text-cyan-200"
            >
              {capabilityLabel(id)}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Real-world examples
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {challenge.exampleDomains.map((ex) => (
            <li
              key={ex.label}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <span className="text-sm font-medium text-white">{ex.label}</span>
              <p className="mt-1 text-xs text-slate-400">{ex.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5">
        <h2 className="text-lg font-semibold text-white">Join the challenge</h2>
        <p className="mt-2 text-sm text-slate-400">Choose how you&apos;d like to contribute.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <ActionLink key={action.id} action={action} />
          ))}
        </div>
      </section>

      {resources.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Resources</h2>
          <ul className="mt-3 space-y-2">
            {resources.map((r) => (
              <li key={`${r.kind}-${r.title}`}>
                <a
                  href={r.href}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
