import Link from 'next/link';
import OrdinalLink from '@/components/OrdinalLink';
import SatplicationEmbed from '@/components/SatplicationEmbed';
import localData from '../../data/desirable-properties.json';
import articlesData from '../../data/call-for-input-articles.json';
import submissionIndex from '../../data/submission-index.json';
import inscriptionMap from '../../data/submission-inscriptions.json';
import dpInscriptionMap from '../../data/dp-inscriptions.json';
import { inscriptionUrl, submissionLink } from '@/lib/dpProvenance';

const CALL_FOR_INPUT_INSCRIPTION =
  articlesData.meta.call_for_input_inscription;
const HOW_TO_INSCRIBE = articlesData.meta.how_to_inscribe;

export default function OnchainPage() {
  const pciEmails = articlesData.pci_emails;
  const submissions = submissionIndex.submissions;
  const inscriptionCount = Object.keys(inscriptionMap.by_source_file ?? {}).length;
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
            Meta-Layer Call for Input
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            The Second Call for Input and early PCI conversations are preserved as a BRC333
            satplication on Bitcoin Ordinals. Browse the live monument below, then use the index
            for PCI emails, community submissions, and inscribed DP drafts.
          </p>
        </div>

        <SatplicationEmbed />

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-2xl font-bold">Satplication</h2>
          <p className="mt-3 text-slate-300">
            The Meta-Layer Call for Input runs as a BRC333 satplication (
            <code className="text-cyan-300">meta-layer-call-for-input</code>). Press{' '}
            <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-xs">i</kbd> while
            viewing any inscribed article for metadata and blockchain provenance.
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

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
            Inscription author claim
          </h2>
          <p className="mt-4 text-slate-300">
            Many Second Call submissions were contributed anonymously or attributed as &quot;Anon&quot;
            during the open intake period. Contributors who inscribed their work on Bitcoin can
            claim authorship by linking a verifiable inscription to their Gov Hub identity.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
            <li>
              Confirm your inscription ID matches the content you submitted (preview on{' '}
              <a
                href="https://ordinals.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                ordinals.com
              </a>
              ).
            </li>
            <li>
              Use Gov Hub&apos;s inscription workflow to associate the ordinal with your account and
              draft record.
            </li>
            <li>
              Once claimed, authorship appears on Gov Hub and can be linked from DP provenance on
              this site.
            </li>
          </ul>
          <a
            href="https://govhub.live/immortalize/"
            className="mt-4 inline-block text-cyan-300 hover:text-cyan-200"
          >
            Claim authorship on Gov Hub →
          </a>
          {inscriptionCount === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Submission-to-inscription mapping is being populated as on-chain records are
              confirmed. Links will appear on DP pages automatically once added to{' '}
              <code className="text-slate-400">submission-inscriptions.json</code>.
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
            Early PCI conversations ({pciEmails.length})
          </h2>
          <p className="mt-3 text-slate-400">
            Meta-layer-adjacent emails from People Centered Internet community calls, inscribed as
            part of the satplication.
          </p>
          <ul className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {pciEmails.map((article) => (
              <li key={article.id} className="px-4 py-3">
                <a
                  href={inscriptionUrl(article.id) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {article.title}
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  {article.author}
                  {article.date ? ` · ${article.date}` : ''}
                </p>
                <OrdinalLink inscriptionId={article.id} className="mt-1 block" />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
            Second Call submissions ({submissions.length})
          </h2>
          <p className="mt-3 text-slate-400">
            Structured submissions from themetalayer.org that informed the Desirable Properties.
          </p>
          <ul className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {submissions.map((sub) => {
              const link = submissionLink(sub.source_file);
              const inscriptionId =
                (inscriptionMap.by_source_file as Record<string, string> | undefined)?.[
                  sub.source_file
                ];
              return (
                <li key={sub.source_file} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    {link ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-cyan-300 hover:text-cyan-200"
                      >
                        {sub.title}
                      </a>
                    ) : (
                      <span className="font-medium text-white">{sub.title}</span>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      By {sub.author}
                      {sub.dp_count > 0 ? ` · ${sub.dp_count} DP alignments` : ''}
                    </p>
                    {inscriptionId && <OrdinalLink inscriptionId={inscriptionId} className="mt-1 block" />}
                  </div>
                  <Link
                    href={`/onchain#submission-${sub.file_number}`}
                    className="shrink-0 text-xs text-slate-500"
                  >
                    {sub.source_file}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

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
                      {dp ? ` — ${dp.name}` : ''}
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
                  {dp.id} — {dp.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
    </main>
  );
}
