import V1PromoShare from '@/components/v1/V1PromoShare';
import V1PromoVideo from '@/components/v1/V1PromoVideo';
import { publishedVideos, V1_PROMO_POSTS, V1_PROMO_RECORDING } from '@/data/v1-promo';

const linkClass = 'text-cyan-300 hover:text-cyan-200';

type Props = {
  id?: string;
  title?: string;
  /** One line under the title. On session pages it says the block is not part of the meeting. */
  subtitle?: string;
  /** Session pages: a separate, differently coloured panel so it does not read as part of the meeting. */
  separate?: boolean;
};

/**
 * "Share the platform": the Version 1.0 videos, our posts to reshare, and prefilled share links.
 * Data in src/data/v1-promo.ts. Reusable on /v1 and on session pages; the anchor stays #watch-v1.
 *
 * Layout: the 16:9 film fills the main column; vertical (9:16) videos sit beside it on wide screens and centred
 * under it on phones; any further 16:9 video takes a full row.
 */
export default function V1Promo({
  id = 'watch-v1',
  title = 'Share the platform',
  subtitle = 'Not specific to this meeting: The Layered Web, Version 1.0, to watch and pass on.',
  separate = false,
}: Props) {
  const [main, ...rest] = publishedVideos();
  const vertical = rest.filter((v) => v.aspect === '9:16');
  const wide = rest.filter((v) => v.aspect !== '9:16');

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-24 ${separate ? 'rounded-2xl border border-indigo-700/60 bg-indigo-950/30 px-4 py-6 sm:px-6' : ''}`}
    >
      {separate ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">Outside this meeting</p>
      ) : null}
      <h2 id={`${id}-heading`} className="text-xl font-bold text-white sm:text-2xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-base text-slate-300">{subtitle}</p> : null}

      <div
        className={`mt-5 grid gap-6 ${vertical.length ? 'md:grid-cols-[minmax(0,1fr)_13rem] md:items-start' : ''}`}
      >
        {main ? <V1PromoVideo video={main} /> : null}
        {vertical.map((v) => (
          <V1PromoVideo key={v.key} video={v} className="mx-auto w-full max-w-[13rem] md:mx-0" />
        ))}
        {wide.map((v) => (
          <V1PromoVideo key={v.key} video={v} className="md:col-span-full" />
        ))}
      </div>
      <p className="mt-4 text-sm">
        <a href={V1_PROMO_RECORDING.url} className={linkClass} target="_blank" rel="noopener noreferrer">
          {V1_PROMO_RECORDING.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-4">
        <h3 className="text-base font-semibold text-white">Share our posts</h3>
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
