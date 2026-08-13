const ORDINALS_ORIGIN = 'https://ordinals.com';

export function inscriptionUrl(inscriptionId: string | null | undefined): string | null {
  if (!inscriptionId) return null;
  return `${ORDINALS_ORIGIN}/inscription/${inscriptionId}`;
}

/** Readable inscription content on ordinals.com. */
export function contentUrl(inscriptionId: string | null | undefined): string | null {
  if (!inscriptionId) return null;
  return `${ORDINALS_ORIGIN}/content/${inscriptionId}`;
}

/** Inscription metadata page on ordinals.com. */
export function localInscriptionUrl(inscriptionId: string | null | undefined): string | null {
  if (!inscriptionId) return null;
  return `${ORDINALS_ORIGIN}/inscription/${inscriptionId}`;
}

export function archiveSubmissionUrl(sourceFile: string | null | undefined): string | null {
  if (!sourceFile) return null;
  const num = sourceFile.replace(/\.json$/, '');
  if (!num) return null;
  return `https://app.themetalayer.org?submission=${num}`;
}

export function submissionLink(
  sourceFile: string | null | undefined,
  inscriptionBySource: Record<string, string> = {},
): { href: string; label: string; kind: 'inscription' | 'archive' } | null {
  if (!sourceFile) return null;
  const onchainId = inscriptionBySource[sourceFile];
  const onchain = inscriptionUrl(onchainId);
  if (onchain) {
    return { href: onchain, label: 'View on-chain inscription', kind: 'inscription' };
  }
  const archive = archiveSubmissionUrl(sourceFile);
  if (archive) {
    return { href: archive, label: 'View in archive', kind: 'archive' };
  }
  return null;
}
