import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CanopiWebEmbed from '@/components/canopi/CanopiWebEmbed';
import PerspectiveBody from '@/components/perspectives/PerspectiveBody';
import PerspectiveCTA from '@/components/perspectives/PerspectiveCTA';
import PerspectiveHeader from '@/components/perspectives/PerspectiveHeader';
import { FORK_IN_THE_WEB } from '@/data/perspectives/a-fork-in-the-web';

const article = FORK_IN_THE_WEB;

export const metadata: Metadata = {
  title: article.seoTitle,
  description: article.seoDescription,
  openGraph: {
    title: article.seoTitle,
    description: article.seoDescription,
    url: `https://desirableproperties.org/perspectives/${article.slug}`,
    type: 'article',
  },
};

export default function ForkInTheWebPage() {
  return (
    <>
      <CanopiWebEmbed />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/pathways/ai-human-agency" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← AI &amp; Human Agency pathway
      </Link>

      <div className="mt-8">
        <PerspectiveHeader
          title={article.title}
          subtitle={article.subtitle}
          deck={article.deck}
        />
        <figure className="mt-10">
          <Image
            src="/images/perspectives/a-fork-in-the-web/the-fork-in-the-web-hero-draft.webp"
            alt="A luminous digital road forks above a glowing web, with one path narrowing into an AI gate and the other opening into shared human-centered layers."
            width={1586}
            height={992}
            className="w-full rounded-lg border border-slate-800"
            priority
          />
        </figure>
        <PerspectiveBody markdown={article.bodyMarkdown} />
        <div className="mt-10 rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-400">Workshops</p>
          <h2 className="mt-2 text-xl font-bold text-white">Fork in the Web Workshops</h2>
          <p className="mt-2 text-sm text-slate-400">
            Four standalone online sessions with reflection questions and a series badge.
          </p>
          <Link
            href="/series/fork-in-the-web-workshops"
            className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            View workshop series →
          </Link>
        </div>
        <PerspectiveCTA perspectiveSlug={article.slug} />
      </div>
    </main>
    </>
  );
}
