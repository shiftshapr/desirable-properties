import Link from 'next/link';
import TrackedLink from '@/components/TrackedLink';

type Cta = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
  eventName?: string;
  external?: boolean;
};

type Props = {
  eyebrow: string;
  /** Page / pathway name (h1). */
  title: string;
  subtitle?: string;
  /** Prominent lead under the title (h2). */
  lead?: string;
  body: string[];
  highlight?: string;
  ctas?: Cta[];
};

export default function PathwayHero({
  eyebrow,
  title,
  subtitle,
  lead,
  body,
  highlight,
  ctas = [],
}: Props) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/40">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-lg text-slate-400 sm:text-xl">{subtitle}</p>
        ) : null}
        {lead ? (
          <h2 className="mt-8 text-2xl font-semibold leading-snug text-slate-100 sm:text-3xl">
            {lead}
          </h2>
        ) : null}
        <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          {body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
        {highlight ? (
          <p className="mt-6 border-l-2 border-cyan-600/70 pl-4 text-base font-medium leading-relaxed text-slate-100 sm:text-lg">
            {highlight}
          </p>
        ) : null}
        {ctas.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {ctas.map((cta) => {
              const className =
                cta.variant === 'secondary'
                  ? 'inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400'
                  : 'inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600';

              if (cta.eventName) {
                return (
                  <TrackedLink
                    key={cta.href + cta.label}
                    href={cta.href}
                    eventName={cta.eventName}
                    className={className}
                  >
                    {cta.label}
                  </TrackedLink>
                );
              }

              if (cta.href.startsWith('#')) {
                return (
                  <a key={cta.href + cta.label} href={cta.href} className={className}>
                    {cta.label}
                  </a>
                );
              }

              return (
                <Link key={cta.href + cta.label} href={cta.href} className={className}>
                  {cta.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </header>
  );
}
