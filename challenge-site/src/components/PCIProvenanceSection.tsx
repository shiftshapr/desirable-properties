import type { PciDpLink } from '@/lib/dpProvenance';
import { inscriptionUrl } from '@/lib/ordinalLinks';

type Props = {
  links: PciDpLink[];
};

const RELATIONSHIP_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  informed: { label: 'Informed', bg: 'bg-emerald-900/60', text: 'text-emerald-300' },
  aligned: { label: 'Aligned', bg: 'bg-sky-900/50', text: 'text-sky-300' },
  context: { label: 'Context', bg: 'bg-slate-800/80', text: 'text-slate-400' },
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-emerald-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
};

function RelBadge({ relationship }: { relationship: string }) {
  const style = RELATIONSHIP_STYLES[relationship] ?? RELATIONSHIP_STYLES.context;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

export default function PCIProvenanceSection({ links }: Props) {
  if (!links.length) return null;

  const informed = links.filter((l) => l.relationship === 'informed');
  const aligned = links.filter((l) => l.relationship === 'aligned');
  const context = links.filter((l) => l.relationship === 'context');

  return (
    <section className="mt-10">
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
        Early PCI Conversations
      </h2>
      <p className="mt-4 text-slate-300">
        People Centered Internet email threads (Sep–Nov 2023) that contributed to this
        property&rsquo;s development. Each is permanently inscribed on Bitcoin via Ordinals.
      </p>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        {informed.length > 0 && (
          <span>
            <span className="font-semibold text-emerald-300">{informed.length}</span> informed
          </span>
        )}
        {aligned.length > 0 && (
          <span>
            <span className="font-semibold text-sky-300">{aligned.length}</span> aligned
          </span>
        )}
        {context.length > 0 && (
          <span>
            <span className="font-semibold text-slate-300">{context.length}</span> context
          </span>
        )}
      </div>

      <ul className="mt-6 space-y-3">
        {links.map((link) => {
          const href = inscriptionUrl(link.pci_id);
          const dotColor = CONFIDENCE_DOT[link.confidence] ?? CONFIDENCE_DOT.low;
          return (
            <li
              key={link.pci_id}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <RelBadge relationship={link.relationship} />
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} title={`${link.confidence} confidence`} />
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white hover:text-cyan-200"
                  >
                    {link.title}
                  </a>
                ) : (
                  <span className="font-medium text-white">{link.title}</span>
                )}
              </div>
              {link.summary && (
                <p className="mt-1.5 text-sm text-slate-400">{link.summary}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-sm text-slate-500">
        <a href="/onchain" className="text-cyan-300 hover:text-cyan-200">
          View all inscribed PCI conversations →
        </a>
      </p>
    </section>
  );
}
