/**
 * Edition labels for API answers that return or cite book chapter text (docs/EDITIONS.md).
 *
 * Reads the book's edition record (desirableproperties-book/json/editions.json, generated from Gov Hub
 * by the rail sync); never computes or hard-codes an edition. With no edition named, an answer is the
 * live text labelled with its edition: the latest released edition whose list holds the live revision,
 * else the edition in progress. `?edition=<id>` resolves that edition's revision.
 */

export type EditionStatus = 'released' | 'in_progress';

export type EditionRail = {
  railKey: string;
  mlNumber: string | null;
  revision: string | null;
  submissionId: string | null;
  sha256: string | null;
  revisionEdition: string | null;
};

export type BookEdition = {
  editionId: string;
  label: string;
  status: EditionStatus;
  predecessorEditionId: string | null;
  rails: EditionRail[];
};

export type EditionsManifest = { currentEdition: string; editions: BookEdition[] };

/** The fields an API answer adds. */
export type EditionFields = {
  edition: string;
  editionStatus: EditionStatus;
  editionLabel: string;
  revision: string | null;
  revisionEdition: string | null;
  submissionId: string | null;
};

export type EditionResolution =
  | { ok: true; fields: EditionFields; isLive: boolean }
  | { ok: false; status: number; error: string };

export function editionChain(manifest: EditionsManifest): BookEdition[] {
  const byPred = new Map<string | null, BookEdition>();
  for (const e of manifest.editions || []) byPred.set(e.predecessorEditionId ?? null, e);
  const out: BookEdition[] = [];
  let cur = byPred.get(null);
  while (cur && out.length <= manifest.editions.length) {
    out.push(cur);
    cur = byPred.get(cur.editionId);
  }
  return out;
}

function railFor(edition: BookEdition | undefined, ml: string): EditionRail | undefined {
  const want = ml.toLowerCase();
  return edition?.rails.find((r) => (r.mlNumber || '').toLowerCase() === want || r.railKey.toLowerCase() === want);
}

function fields(edition: BookEdition, rail: EditionRail): EditionFields {
  return {
    edition: edition.editionId,
    editionStatus: edition.status,
    editionLabel: edition.status === 'in_progress' ? `${edition.label}, in progress` : edition.label,
    revision: rail.revision,
    revisionEdition: rail.revisionEdition,
    submissionId: rail.submissionId,
  };
}

/** Label for the live text of a document (ML number or rail key). Null when the book has no such rail. */
export function liveEdition(manifest: EditionsManifest, ml: string): EditionFields | null {
  const chain = editionChain(manifest);
  const current = chain.find((e) => e.status === 'in_progress');
  const live = railFor(current, ml);
  if (!current || !live) return null;
  for (const e of [...chain].reverse()) {
    if (e.status !== 'released') continue;
    const row = railFor(e, ml);
    if (!row) continue;
    const same = live.submissionId ? row.submissionId === live.submissionId : !!row.sha256 && row.sha256 === live.sha256;
    if (same) return fields(e, live);
  }
  return fields(current, live);
}

/**
 * What to answer for `?edition=<id>` (or none). `isLive` says whether the live text is that edition's text;
 * when it is not, the caller must get that exact revision (Gov Hub `?edition=`) or refuse.
 */
export function resolveEdition(manifest: EditionsManifest | null, ml: string, editionId: string | null): EditionResolution | null {
  if (!manifest) {
    return editionId ? { ok: false, status: 404, error: 'Editions are not available here yet' } : null;
  }
  if (!editionId) {
    const f = liveEdition(manifest, ml);
    return f ? { ok: true, fields: f, isLive: true } : null;
  }
  const edition = manifest.editions.find((e) => e.editionId === editionId);
  if (!edition) return { ok: false, status: 404, error: `Unknown edition ${editionId}` };
  const row = railFor(edition, ml);
  if (!row) return { ok: false, status: 404, error: `${ml} is not part of ${edition.label}` };
  const current = manifest.editions.find((e) => e.status === 'in_progress');
  const live = railFor(current, ml);
  const isLive = !!live && (row.submissionId ? row.submissionId === live.submissionId : !!row.sha256 && row.sha256 === live.sha256);
  return { ok: true, fields: fields(edition, row), isLive };
}

