import Link from 'next/link';
import EcosystemMap from '@/components/ecosystem/EcosystemMap';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meta-Layer Ecosystem Map – Desirable Properties Challenge',
  description:
    'Explore the Desirable Properties Challenge and the wider Meta-Layer stack: where we are today, fast and slow layers, and the living governance loop.',
};

export default function EcosystemMapPage() {
  return (
    <main className="border-b border-slate-800">
      <section className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Back to the Challenge
          </Link>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Desirable Properties Challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Meta-Layer ecosystem map
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            The Meta-Layer is not one product. It is a stack of community governance, living drafts,
            monuments, learning, and tools you can use now. Toggle between three experimental views
            of the same nodes to see how the pieces connect.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <EcosystemMap />
      </section>
    </main>
  );
}
