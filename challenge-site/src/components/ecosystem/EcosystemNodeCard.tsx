'use client';

import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import {
  ECOSYSTEM_STATUS_LABELS,
  type EcosystemNode,
} from '@/data/ecosystem-map';

type Props = {
  node: EcosystemNode;
  highlighted?: boolean;
  compact?: boolean;
};

function statusChipClass(status: EcosystemNode['status']): string {
  if (status === 'live') return 'border-emerald-800/60 bg-emerald-950/50 text-emerald-200';
  if (status === 'in_progress') return 'border-amber-800/60 bg-amber-950/40 text-amber-200';
  return 'border-slate-700 bg-slate-900/80 text-slate-400';
}

function NodeInner({ node, highlighted, compact }: Props) {
  const statusLabel = node.statusNote
    ? `${ECOSYSTEM_STATUS_LABELS[node.status]} · ${node.statusNote}`
    : ECOSYSTEM_STATUS_LABELS[node.status];

  const titleParts = [node.caption, node.timeline ? `Timeline: ${node.timeline}` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
          {node.label}
        </p>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusChipClass(node.status)}`}
        >
          {statusLabel}
        </span>
      </div>
      {node.detail ? (
        <p className={`mt-1 text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>{node.detail}</p>
      ) : null}
      {!node.href && node.caption ? (
        <p className={`mt-2 leading-snug text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>
          {node.caption}
          {node.timeline ? (
            <>
              {' '}
              <span className="text-slate-400">({node.timeline})</span>
            </>
          ) : null}
        </p>
      ) : null}
      {highlighted ? (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-cyan-300">
          We are here
        </p>
      ) : null}
      {titleParts && node.href ? (
        <span className="sr-only">{titleParts}</span>
      ) : null}
    </>
  );
}

export default function EcosystemNodeCard({ node, highlighted = false, compact = false }: Props) {
  const baseClass = [
    'relative block rounded-xl border p-4 text-left transition',
    compact ? 'min-h-[5.5rem]' : 'min-h-[6.5rem]',
    highlighted
      ? 'border-cyan-500/70 bg-cyan-950/30 shadow-lg shadow-cyan-950/30 ring-2 ring-cyan-400/40'
      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600',
    node.href ? 'cursor-pointer hover:bg-slate-900/80' : 'cursor-default',
  ].join(' ');

  const hoverTitle = [node.caption, node.timeline ? `Timeline: ${node.timeline}` : '']
    .filter(Boolean)
    .join(' · ');

  if (!node.href) {
    return (
      <div className={baseClass} title={hoverTitle || undefined}>
        <NodeInner node={node} highlighted={highlighted} compact={compact} />
      </div>
    );
  }

  if (node.discussPatch) {
    return (
      <DiscussPatchLink href={node.href} className={baseClass}>
        <NodeInner node={node} highlighted={highlighted} compact={compact} />
      </DiscussPatchLink>
    );
  }

  if (node.external || node.href.startsWith('http')) {
    return (
      <a
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
        title={hoverTitle || undefined}
      >
        <NodeInner node={node} highlighted={highlighted} compact={compact} />
      </a>
    );
  }

  return (
    <Link href={node.href} className={baseClass} title={hoverTitle || undefined}>
      <NodeInner node={node} highlighted={highlighted} compact={compact} />
    </Link>
  );
}
