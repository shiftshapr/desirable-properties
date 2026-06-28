import type {
  DpAlignment,
  DpClarification,
  DpExtension,
  DpProvenanceMeta,
} from '@/lib/dpProvenance';
import { submissionLink } from '@/lib/dpProvenance';

type Props = {
  meta: DpProvenanceMeta;
  alignments: DpAlignment[];
  clarifications: DpClarification[];
  extensions: DpExtension[];
};

function ProvenanceStats({ meta }: { meta: DpProvenanceMeta }) {
  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <p className="text-cyan-300">
        <span className="font-semibold">{meta.total_alignments}</span> alignments
      </p>
      <p className="text-amber-300">
        <span className="font-semibold">{meta.total_extensions}</span> extensions
      </p>
      <p className="text-yellow-300">
        <span className="font-semibold">{meta.total_clarifications}</span> clarifications
      </p>
    </div>
  );
}

function SubmissionLink({
  sourceFile,
  title,
}: {
  sourceFile: string;
  title: string;
}) {
  const link = submissionLink(sourceFile);
  if (!link) {
    return <span className="font-medium text-cyan-300">{title}</span>;
  }
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-cyan-300 hover:text-cyan-200"
    >
      {title}
      {link.kind === 'inscription' && (
        <span className="ml-2 text-xs text-slate-500">on-chain</span>
      )}
    </a>
  );
}

export default function DPProvenanceSection({
  meta,
  alignments,
  clarifications,
  extensions,
}: Props) {
  const hasContent =
    alignments.length > 0 || clarifications.length > 0 || extensions.length > 0;

  return (
    <section className="mt-10">
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
        Second Call for Input
      </h2>
      <p className="mt-4 text-slate-300">
        Community submissions from the Second Meta-Layer Call for Input that aligned with,
        clarified, or extended this property. These are historical provenance—not live
        governance votes or comments.
      </p>
      <div className="mt-4">
        <ProvenanceStats meta={meta} />
      </div>

      {!hasContent ? (
        <p className="mt-6 text-slate-500">
          No Second Call submissions are mapped to this property yet.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {alignments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white">Aligned submissions</h3>
              <ul className="mt-4 space-y-4">
                {alignments.map((item) => (
                  <li
                    key={`${item.source_file}-${item.submission_title}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <SubmissionLink
                      sourceFile={item.source_file}
                      title={item.submission_title}
                    />
                    <p className="mt-1 text-xs text-slate-500">By {item.submitter_name}</p>
                    <p className="mt-2 text-sm text-amber-200">{item.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {clarifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white">Clarifications</h3>
              <ul className="mt-4 space-y-4">
                {clarifications.map((item) => (
                  <li
                    key={`${item.source_file}-cl-${item.title}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      From{' '}
                      <SubmissionLink
                        sourceFile={item.source_file}
                        title={item.submission_title}
                      />
                    </p>
                    <p className="mt-2 text-sm italic text-amber-200">{item.clarification}</p>
                    <p className="mt-2 text-xs text-amber-300">
                      Why it matters: {item.why_it_matters}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extensions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white">Extensions</h3>
              <ul className="mt-4 space-y-4">
                {extensions.map((item) => (
                  <li
                    key={`${item.source_file}-ex-${item.title}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      From{' '}
                      <SubmissionLink
                        sourceFile={item.source_file}
                        title={item.submission_title}
                      />
                    </p>
                    <p className="mt-2 text-sm text-amber-200">{item.extension}</p>
                    <p className="mt-2 text-xs text-amber-300">
                      Why it matters: {item.why_it_matters}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-sm text-slate-500">
        <a href="/onchain" className="text-cyan-300 hover:text-cyan-200">
          Explore the on-chain Call for Input archive
        </a>
      </p>
    </section>
  );
}
