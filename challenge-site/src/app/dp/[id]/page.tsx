import Link from 'next/link';
import DPProvenanceSection from '@/components/DPProvenanceSection';
import PCIProvenanceSection from '@/components/PCIProvenanceSection';
import localData from '../../../data/desirable-properties.json';
import {
  extractDpId,
  fetchChallengeWorkgroups,
  govhubUrl,
} from '@/lib/govhub';
import { loadDpProvenance, dpInscriptionUrl, loadPciProvenanceForDp } from '@/lib/dpProvenance';
import { notFound } from 'next/navigation';

export const revalidate = 300;

export function generateStaticParams() {
  return localData.desirable_properties.map((dp) => ({
    id: dp.id.toLowerCase(),
  }));
}

export default async function DPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dp = localData.desirable_properties.find(
    (d) => d.id.toLowerCase() === id.toLowerCase(),
  );

  if (!dp) {
    notFound();
  }

  const [workgroups, provenance] = await Promise.all([
    fetchChallengeWorkgroups(),
    Promise.resolve(loadDpProvenance(dp.id)),
  ]);
  const pciLinks = loadPciProvenanceForDp(dp.id);

  const workgroup = workgroups.find((wg) => extractDpId(wg.name) === dp.id);
  const draftHref = workgroup?.document_href ? govhubUrl(workgroup.document_href) : null;
  const workgroupHref = workgroup?.slug ? govhubUrl(`/workgroups/${workgroup.slug}/`) : null;
  const onchainDraftHref = dpInscriptionUrl(dp.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/#dps" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to all Desirable Properties
        </Link>

        <div className="mt-8">
          <div className="flex items-center gap-3">
            <span className="rounded bg-cyan-950 px-2 py-1 text-xs font-semibold text-cyan-300">
              {dp.id}
            </span>
            {workgroup && (
              <span className="text-xs uppercase tracking-wide text-slate-500">
                {workgroup.state || workgroup.status}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white">{dp.name}</h1>
          {dp.landing_subtitle && (
            <p className="mt-3 text-lg text-cyan-300">{dp.landing_subtitle}</p>
          )}
          {provenance && (
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <p className="text-cyan-300">
                <span className="font-semibold">{provenance.meta.total_alignments}</span> Second
                Call alignments
              </p>
              <p className="text-amber-300">
                <span className="font-semibold">{provenance.meta.total_extensions}</span>{' '}
                extensions
              </p>
              <p className="text-yellow-300">
                <span className="font-semibold">{provenance.meta.total_clarifications}</span>{' '}
                clarifications
              </p>
            </div>
          )}
        </div>

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Overview</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{dp.description}</p>
        </section>

        {dp.landing_text && (
          <section className="mt-10">
            <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Why It Matters</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">{dp.landing_text}</p>
          </section>
        )}

        {dp.elements?.length > 0 && (
          <section className="mt-10">
            <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Key Elements</h2>
            <div className="mt-4 space-y-3">
              {dp.elements.map((el) => (
                <div key={el.name} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="font-semibold text-cyan-300">{el.name}</h3>
                  <p className="mt-2 text-slate-300">{el.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-bold">Current Draft</h2>
            <p className="mt-3 text-slate-400">
              {workgroup?.document_label ||
                'Review the latest draft, open issues, and pending proposals on Gov Hub.'}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {draftHref ? (
                <a
                  href={draftHref}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  View draft on Gov Hub
                </a>
              ) : (
                <a
                  href={govhubUrl('/doc/all/')}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
                >
                  Browse drafts on Gov Hub
                </a>
              )}
              {onchainDraftHref && (
                <a
                  href={onchainDraftHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center text-sm text-cyan-300 hover:text-cyan-200"
                >
                  View on-chain inscription →
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-bold">Workgroup</h2>
            <p className="mt-3 text-slate-400">
              {workgroup?.description ||
                'Join the active workgroup stewarding this property and participate in its evolution.'}
            </p>
            {workgroupHref ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={workgroupHref}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Join WG
                </a>
                <a
                  href={`${workgroupHref}?action=nominate`}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Nominate to WG
                </a>
              </div>
            ) : (
              <a
                href={govhubUrl('/layers/the-metaweb/')}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                View workgroups on Gov Hub
              </a>
            )}
          </div>
        </section>

        {provenance && (
          <DPProvenanceSection
            meta={provenance.meta}
            alignments={provenance.alignments}
            clarifications={provenance.clarifications}
            extensions={provenance.extensions}
          />
        )}

        <PCIProvenanceSection links={pciLinks} />
    </main>
  );
}
