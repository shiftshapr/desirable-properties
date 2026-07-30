import Link from 'next/link';
import { govhubUrl } from '@/lib/govhub';
import {
  DP_WELCOME_SUBJECT_LEAD,
  DP_WELCOME_SUBJECT_MEMBER,
  MESSAGE_A_SECTIONS,
  MESSAGE_B_LEAD,
  type DpWelcomeVariant,
} from '@/lib/dp-welcome-content';

type Props = {
  variant: DpWelcomeVariant;
  workgroupName?: string | null;
  workgroupSlug?: string | null;
};

export default function DpWelcomeView({ variant, workgroupName, workgroupSlug }: Props) {
  const subject = variant === 'lead' ? DP_WELCOME_SUBJECT_LEAD : DP_WELCOME_SUBJECT_MEMBER;
  const wgHref = workgroupSlug ? govhubUrl(`/workgroups/${workgroupSlug}/`) : null;
  const a = MESSAGE_A_SECTIONS;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-400">Desirable Properties Challenge</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{subject}</h1>
        {workgroupName ? (
          <p className="mt-3 text-lg text-slate-300">
            Workgroup: <span className="font-semibold text-white">{workgroupName}</span>
          </p>
        ) : null}
      </header>

      <section className="prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300">
        <h2 className="text-xl font-semibold text-white">{a.missionTitle}</h2>
        <p>{a.missionBody}</p>
        <p>{a.missionDetail}</p>

        <h2 className="mt-8 text-xl font-semibold text-white">{a.askTitle}</h2>
        <ul>
          {a.askItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-white">{a.timeTitle}</h2>
        <ul>
          {a.timeItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-white">{a.whyTitle}</h2>
        <p>{a.whyBody}</p>
        <p className="font-mono text-sm text-cyan-200">{a.arc}</p>

        <p className="mt-8 text-slate-300">
          <strong className="text-white">Questions?</strong> {a.support.prefix}{' '}
          <a href={a.support.site.href} className="text-cyan-300 hover:text-cyan-200">
            {a.support.site.label}
          </a>{' '}
          or{' '}
          <a
            href={a.support.hub.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            {a.support.hub.label}
          </a>
          .
        </p>

        <p className="mt-6 text-lg font-medium text-white">{a.closing}</p>

        {variant === 'lead' ? (
          <section className="mt-10 rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-6">
            <h2 className="mt-0 text-xl font-semibold text-cyan-100">{MESSAGE_B_LEAD.title}</h2>
            <p>{MESSAGE_B_LEAD.intro}</p>
            <ul>
              {MESSAGE_B_LEAD.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-wrap gap-3 border-t border-slate-800 pt-8">
        {wgHref ? (
          <a
            href={wgHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Open workgroup on Gov Hub
          </a>
        ) : null}
        <Link
          href="/workgroups/join"
          className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
        >
          Browse workgroups
        </Link>
      </footer>
    </article>
  );
}
