import Link from 'next/link';

const CONTACT =
  'mailto:info@bridgit.io?subject=' + encodeURIComponent('A collective north star for our group');

/** Home page, below Version 1.0: the Desirable Properties method as a service for any group or field. */
export default function NorthStarServicesPanel() {
  return (
    <section aria-labelledby="north-star-services-heading" className="border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">For any group, in any field</p>
        <h2 id="north-star-services-heading" className="mt-2 text-3xl font-bold text-white">
          Find your group&apos;s collective north star
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          Desirable Properties is how hundreds of people agreed on what a better web must do: open calls for input,
          proposals anyone can make, co-editors who decide in the open, and a steering committee that signs off. The
          same method helps any community, organization or field turn many voices into a shared set of properties to
          build toward.
        </p>
        <p className="mt-3 max-w-3xl text-slate-300">
          We provide the facilitation and the tooling: the calls for input, Gov Hub for proposals and review, analysis
          that maps every contribution, and a published book of your properties.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={CONTACT}
            className="inline-flex rounded-lg border-2 border-cyan-300 bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Talk to us about your field
          </a>
          <Link href="/process" className="inline-flex rounded-lg bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700">
            How Version 1.0 was made →
          </Link>
        </div>
      </div>
    </section>
  );
}
