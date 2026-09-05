import Link from 'next/link';
import EditorialSynthesisIndex from '@/components/astra/EditorialSynthesisIndex';
import { readAstraReleaseManifest } from '@/lib/astra-corpus.server';

export const metadata = {
  title: 'Editorial synthesis – Desirable Properties',
  description:
    'Astra editorial synthesis index: twenty-three coherent chapters with traceable change records.',
};

export const dynamic = 'force-dynamic';

export default function EditorialSynthesisPage() {
  let manifest;
  try {
    manifest = readAstraReleaseManifest();
  } catch {
    return (
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to home
        </Link>
        <p className="mt-8 rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          Astra release manifest is not available yet.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to home
      </Link>
      <div className="mt-8">
        <EditorialSynthesisIndex manifest={manifest} />
      </div>
    </main>
  );
}
