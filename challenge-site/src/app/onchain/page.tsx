import Link from 'next/link';
import OrdinalLink from '@/components/OrdinalLink';
import OnchainClaimableLists from '@/components/OnchainClaimableLists';
import SatplicationEmbed from '@/components/SatplicationEmbed';
import localData from '../../data/desirable-properties.json';
import articlesData from '../../data/call-for-input-articles.json';
import submissionIndex from '../../data/submission-index.json';
import inscriptionMap from '../../data/submission-inscriptions.json';
import dpInscriptionMap from '../../data/dp-inscriptions.json';
import { inscriptionUrl } from '@/lib/ordinalLinks';

const CALL_FOR_INPUT_INSCRIPTION =
  articlesData.meta.call_for_input_inscription;
const HOW_TO_INSCRIBE = articlesData.meta.how_to_inscribe;

export default function OnchainPage() {
  const pciEmails = articlesData.pci_emails;
  const submissions = submissionIndex.submissions;
  const dpInscriptions = Object.entries(dpInscriptionMap.by_dp_id ?? {}).sort(
    ([a], [b]) => parseInt(a.replace('DP', ''), 10) - parseInt(b.replace('DP', ''), 10),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to Desirable Properties Challenge
        </Link>

        <div className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Memory Layer · On-Chain
          </p>
          <h1 className="mt-4 text-4xl font-bold text-white">
            Desirable Properties of a Meta-Layer
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            The <em>Desirable Properties</em> satplication is a BRC333 book inscribed on
            Bitcoin Ordinals. Browse the live monument below, then use the index for PCI
            emails, community submissions, and inscribed DP drafts.
          </p>
        </div>

        <section className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Work in progress
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            The viewer below is the canonical local preview of the Desirable Properties
            book reader. We&apos;re iterating on the chapter index and provenance overlay
            — it&apos;s wired up but rough. Explore the rest of the project in the meantime:
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a
              href="https://app.brc333.xyz/projects/desirableproperties-book-ordinal/learning.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-amber-100 hover:bg-amber-400/20"
            >
              Learning tour
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href="https://app.brc333.xyz/projects/desirableproperties-book-ordinal/satplication-graph.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-amber-100 hover:bg-amber-400/20"
            >
              Sat-graph
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <SatplicationEmbed />

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-2xl font-bold">Call for Input inscription</h2>
          <p className="mt-3 text-slate-300">
            The original <em>Meta-Layer Call for Input</em> satplication (
            <code className="text-cyan-300">meta-layer-call-for-input</code>) is preserved as
            a sibling artifact on Bitcoin Ordinals. The iframe above renders the new
            Desirable Properties book satplication; the references below point at the
            historical Call for Input and the <em>how-to-inscribe</em> guidance.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {inscriptionUrl(CALL_FOR_INPUT_INSCRIPTION) && (
              <a
                href={inscriptionUrl(CALL_FOR_INPUT_INSCRIPTION)!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-cyan-700 px-4 py-2 font-medium text-white hover:bg-cyan-600"
              >
                Call for Input inscription
              </a>
            )}
            {inscriptionUrl(HOW_TO_INSCRIBE) && (
              <a
                href={inscriptionUrl(HOW_TO_INSCRIBE)!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
              >
                How to inscribe
              </a>
            )}
            <a
              href="https://brc333.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
            >
              BRC333 protocol
            </a>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Call for Input ordinal</dt>
              <dd className="mt-0.5">
                <OrdinalLink inscriptionId={CALL_FOR_INPUT_INSCRIPTION} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">How to inscribe ordinal</dt>
              <dd className="mt-0.5">
                <OrdinalLink inscriptionId={HOW_TO_INSCRIBE} />
              </dd>
            </div>
          </dl>
        </section>

        <OnchainClaimableLists
          pciEmails={pciEmails}
          submissions={submissions}
          inscriptionBySource={(inscriptionMap.by_source_file ?? {}) as Record<string, string>}
        />

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
            Inscribed DP drafts ({dpInscriptions.length})
          </h2>
          <p className="mt-3 text-slate-400">
            ML-Draft text inscriptions for Desirable Properties stewarded on Gov Hub.
          </p>
          <ul className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {dpInscriptions.map(([dpId, inscriptionId]) => {
              const dp = localData.desirable_properties.find((d) => d.id === dpId);
              return (
                <li key={dpId} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/dp/${dpId.toLowerCase()}`} className="font-medium text-white hover:text-cyan-200">
                      {dpId}
                      {dp ? ` – ${dp.name}` : ''}
                    </Link>
                    <OrdinalLink inscriptionId={inscriptionId} className="mt-1 block" />
                  </div>
                  <a
                    href={inscriptionUrl(inscriptionId) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    ordinals.com →
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
            Desirable Properties ({localData.desirable_properties.length})
          </h2>
          <p className="mt-3 text-slate-400">
            Canonical properties stewarded on Gov Hub, with Second Call provenance on each DP page.
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {localData.desirable_properties.map((dp) => (
              <li key={dp.id}>
                <Link
                  href={`/dp/${dp.id.toLowerCase()}`}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  {dp.id} – {dp.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
    </main>
  );
}
