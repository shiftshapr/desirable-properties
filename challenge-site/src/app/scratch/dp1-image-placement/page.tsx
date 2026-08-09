import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import localData from '@/data/desirable-properties.json';
import { dpFullImageSrc, dpImageAlt } from '@/lib/dp-images';
import { dpDetailHref } from '@/lib/dp-links';

export const metadata: Metadata = {
  title: 'Throwaway: DP1 image placement mockup',
  robots: { index: false, follow: false },
};

/**
 * Temporary page to compare ML-Draft chapter image placement.
 * Delete after deciding above-title vs below-title for book drafts.
 */
export default function Dp1ImagePlacementMockupPage() {
  const dp = localData.desirable_properties.find((d) => d.id === 'DP1');
  if (!dp) {
    return <main className="p-8 text-white">DP1 not found</main>;
  }
  const src = dpFullImageSrc(dp.id)!;
  const alt = dpImageAlt(dp.id, dp.name);

  return (
    <main className="mx-auto max-w-3xl space-y-16 px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
        <p className="font-semibold">Throwaway mockup – not linked from nav</p>
        <p className="mt-1 text-amber-200/90">
          Compare image above vs below the chapter title for ML-Drafts. Delete this route once you
          decide.
        </p>
        <p className="mt-2">
          <Link href={dpDetailHref(dp.id, '/scratch/dp1-image-placement')} className="text-cyan-300 hover:text-cyan-200">
            Live DP1 page →
          </Link>
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Option A – image above the title
        </h2>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 sm:p-8">
          <figure className="overflow-hidden rounded-xl border border-slate-800">
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1200}
              className="h-auto w-full"
              priority
            />
          </figure>
          <p className="mt-6 text-xs font-mono uppercase tracking-wide text-slate-500">{dp.id}</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{dp.name}</h1>
          {dp.landing_subtitle ? (
            <p className="mt-3 text-lg text-cyan-300">{dp.landing_subtitle}</p>
          ) : null}
          <p className="mt-6 text-slate-300 leading-relaxed">{dp.description}</p>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Option B – image below the title
        </h2>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 sm:p-8">
          <p className="text-xs font-mono uppercase tracking-wide text-slate-500">{dp.id}</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{dp.name}</h1>
          {dp.landing_subtitle ? (
            <p className="mt-3 text-lg text-cyan-300">{dp.landing_subtitle}</p>
          ) : null}
          <figure className="mt-8 overflow-hidden rounded-xl border border-slate-800">
            <Image src={src} alt={alt} width={1200} height={1200} className="h-auto w-full" />
          </figure>
          <p className="mt-6 text-slate-300 leading-relaxed">{dp.description}</p>
        </article>
      </section>
    </main>
  );
}
