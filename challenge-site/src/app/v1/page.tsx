import type { Metadata } from 'next';
import LayeredWebVideoCarousel from '@/components/LayeredWebVideoCarousel';
import V1BookPanel from '@/components/V1BookPanel';
import { layeredWebVideosAt } from '@/data/layered-web-videos';
import { V1_LAUNCH_LABEL, V1_LAUNCH_REGISTER_URL, V1_PDF_HREF, V1_READ_ONLINE_HREF, v1Released } from '@/lib/dp-v1-release';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Version 1.0 | Desirable Properties',
  description: 'The Desirable Properties of a Meta-Layer, Version 1.0: read it online or download the PDF.',
};

export default function V1Page() {
  const now = new Date();
  const released = v1Released(now);
  return (
    <main>
      <V1BookPanel now={now} heading="h1" />

      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-white">The Layered Web</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Short videos on why the web needs a layer above the page, and what the 24 properties are for.
          </p>
          <div className="mt-6">
            <LayeredWebVideoCarousel videos={layeredWebVideosAt(now)} />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-white">{released ? 'Get the book' : 'The launch'}</h2>
          <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-slate-300">
            {released ? (
              <>
                <li>
                  <a href={V1_PDF_HREF} download className="text-cyan-300 hover:text-cyan-200">Download the PDF</a>{' '}
                  to read offline or print.
                </li>
                <li>
                  <a href={V1_READ_ONLINE_HREF} className="text-cyan-300 hover:text-cyan-200">Read it online</a>, where every
                  page has a discussion layer for questions and proposals toward Version 1.1.
                </li>
              </>
            ) : (
              <>
                <li>
                  {V1_LAUNCH_LABEL}.{' '}
                  <a href={V1_LAUNCH_REGISTER_URL} className="text-cyan-300 hover:text-cyan-200">Register free</a>.
                </li>
                <li>The PDF is available here from the start of the launch.</li>
                <li>
                  Until then, <a href={V1_READ_ONLINE_HREF} className="text-cyan-300 hover:text-cyan-200">read the book online</a>.
                </li>
              </>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
