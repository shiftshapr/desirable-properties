import V1PromoShare from '@/components/v1/V1PromoShare';
import V1PromoVideo from '@/components/v1/V1PromoVideo';
import { publishedVideos, V1_PROMO_POSTS, V1_PROMO_RECORDING } from '@/data/v1-promo';

const linkClass = 'text-cyan-300 hover:text-cyan-200';

/**
 * "Watch and share Version 1.0": the launch videos, our posts to reshare, and prefilled share links.
 * Data in src/data/v1-promo.ts. Reusable on /v1 and the current-session page.
 */
export default function V1Promo({ id = 'watch-v1' }: { id?: string }) {
  const [main, ...rest] = publishedVideos();

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="border-b border-slate-800 pb-2 text-xl font-bold text-white sm:text-2xl">
        Watch and share Version 1.0
      </h2>
      <p className="mt-4 text-base text-slate-300">
        The Layered Web, Version 1.0 is out. Watch the film, then pass it on.
      </p>

      <div className="mt-5 space-y-6">
        {main ? <V1PromoVideo video={main} /> : null}
        {rest.length ? (
          <div className="flex flex-wrap items-start gap-6">
            {rest.map((v) => (
              <V1PromoVideo
                key={v.key}
                video={v}
                className={v.aspect === '9:16' ? 'w-44 shrink-0 sm:w-52' : 'min-w-[16rem] flex-1'}
              />
            ))}
          </div>
        ) : null}
        <p className="text-sm">
          <a href={V1_PROMO_RECORDING.url} className={linkClass} target="_blank" rel="noopener noreferrer">
            {V1_PROMO_RECORDING.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
        <h3 className="text-base font-semibold text-white">Share our posts</h3>
        <p className="mt-1 text-sm text-slate-400">Open a post and repost or share it from there.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {V1_PROMO_POSTS.map((p) => (
            <li key={p.url}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-500/70 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {p.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-base font-semibold text-white">Or post your own</h3>
        <div className="mt-2">
          <V1PromoShare />
        </div>
      </div>
    </section>
  );
}
