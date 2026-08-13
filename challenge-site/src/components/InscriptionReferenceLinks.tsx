'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { bindInscriptionPreviews, loadBrc333Ui } from '@/lib/brc333-preview';
import { inscriptionUrl, localInscriptionUrl } from '@/lib/ordinalLinks';

type Props = {
  inscriptionId: string | null | undefined;
  /** Modal title and hover preview context (submission / PCI title). */
  previewTitle: string;
  children: ReactNode;
  metadataClassName?: string;
};

export default function InscriptionReferenceLinks({
  inscriptionId,
  previewTitle,
  children,
  metadataClassName = 'text-xs text-slate-500 hover:text-cyan-300',
}: Props) {
  const previewScopeRef = useRef<HTMLSpanElement>(null);
  const pillHref = inscriptionUrl(inscriptionId);
  const metadataHref = localInscriptionUrl(inscriptionId);

  useEffect(() => {
    const scope = previewScopeRef.current;
    if (!scope || !pillHref) return;

    let cancelled = false;
    loadBrc333Ui()
      .then(() => {
        if (!cancelled) bindInscriptionPreviews(scope);
      })
      .catch(() => {
        /* Fall back to ordinals navigation if the shared script fails. */
      });

    return () => {
      cancelled = true;
    };
  }, [pillHref, previewTitle]);

  if (!pillHref) {
    return <span className="font-medium text-cyan-300">{children}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span ref={previewScopeRef} className="inline">
        <a
          href={pillHref}
          className="dp-inscription-pill sat-graph-inscription-link"
          data-preview-title={previewTitle}
          title={previewTitle}
        >
          {children}
        </a>
      </span>
      {metadataHref ? (
        <a
          href={metadataHref}
          target="_blank"
          rel="noopener noreferrer"
          className={metadataClassName}
        >
          (metadata)
        </a>
      ) : null}
    </span>
  );
}
