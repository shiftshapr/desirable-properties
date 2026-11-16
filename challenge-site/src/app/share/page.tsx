import type { Metadata } from 'next';
import Link from 'next/link';
import ShareKit from '@/components/share/ShareKit';
import { SHARE_THEMES, SHARE_VIDEOS } from '@/lib/share-kit';
import { pageOpenGraph, SHARE_IMAGE } from '@/lib/site-metadata';

const TITLE = 'Share The Layered Web';
const DESCRIPTION =
  'Ready-made images and short posts for The Layered Web, Version 1.0: the book, the launch video and Version 1.1. Post them full size on LinkedIn, X and anywhere else.';

export const metadata: Metadata = {
  title: `${TITLE} | Desirable Properties`,
  description: DESCRIPTION,
  alternates: { canonical: '/share' },
  openGraph: pageOpenGraph({ title: TITLE, description: DESCRIPTION, path: '/share' }),
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [SHARE_IMAGE] },
};

export default function SharePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Share kit</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{TITLE}</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Images and short posts anyone can use. A picture posted on its own shows full size in the feed, where a
          pasted link often shows only as a small thumbnail. Pick an image, check the text, and post it your way.
        </p>
        <ul className="mt-4 max-w-3xl list-disc space-y-1 pl-5 text-sm text-slate-400">
          <li>
            <span className="text-slate-200">On a phone:</span> Share image opens your share sheet with the picture and
            text (the text is also copied, in case the app drops it).
          </li>
          <li>
            <span className="text-slate-200">On a computer:</span> Post on LinkedIn or Post image on X copies the picture
            and opens the post box with the text and link filled in; paste the picture and post.
          </li>
        </ul>
      </header>

      <div className="mt-8">
        <ShareKit themes={SHARE_THEMES} />
      </div>

      <section aria-labelledby="share-video-heading" className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h2 id="share-video-heading" className="text-xl font-bold text-white">
          Short video
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          The Version 1.0 launch in 57 seconds. Download it and upload it as a video post; pair it with the launch
          video text above.
        </p>
        {SHARE_VIDEOS.map((v) => (
          <div key={v.src} className="mt-4 grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-center">
            <video
              controls
              preload="none"
              poster={v.poster}
              playsInline
              className="w-full rounded-xl border border-slate-800"
              aria-label={v.label}
            >
              <source src={v.src} type="video/mp4" />
            </video>
            <div>
              <p className="font-semibold text-white">{v.label}</p>
              <p className="mt-1 text-sm text-slate-400">{v.note}</p>
              <a
                href={v.src}
                download={v.download}
                className="mt-3 inline-flex items-center rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:border-slate-400 hover:bg-white/5"
              >
                Download video
              </a>
            </div>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-slate-500">
        More about the book on{' '}
        <Link href="/v1" className="text-cyan-300 hover:text-cyan-200">
          the Version 1.0 page
        </Link>
        .
      </p>
    </main>
  );
}
