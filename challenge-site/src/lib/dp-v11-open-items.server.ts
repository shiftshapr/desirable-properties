/**
 * Version 1.1 open items: every pending proposal on the 28 documents, read live from Gov Hub's public
 * proposal API (/api/doc/draft/<ML>/proposals/), grouped by document. Co-editors decide them.
 */
import 'server-only';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import { FRONT_MATTER } from '@/lib/dp-steering';
import { versionMarkerOf, type VersionMarker } from '@/lib/dp-v11';
import { GOVHUB_PUBLIC_BASE_URL, type GovHubDraftProposal } from '@/lib/govhub';

export type OpenItem = {
  id: string;
  patchMode: string;
  originalText: string;
  proposedText: string;
  rationale: string;
  authorName: string;
  createdAt: string | null;
  applicability: string;
  marker: VersionMarker | null;
  approvals: number;
};

export type OpenItemsDoc = {
  key: string;
  label: string;
  mlNumber: string;
  dpId: string | null;
  items: OpenItem[];
  /** False when Gov Hub did not answer for this document (its items are unknown, not zero). */
  loaded: boolean;
};

const DP_DOCS: Array<{ key: string; label: string; mlNumber: string; dpId: string | null }> = Object.entries(
  (dpMlDraftMap as { map: Record<string, { mlNumber: string; label: string }> }).map,
)
  .map(([dpId, e]) => ({ key: dpId, label: e.label, mlNumber: e.mlNumber, dpId }))
  .sort((a, b) => Number(a.key.slice(2)) - Number(b.key.slice(2)));

const DOCS = [
  ...FRONT_MATTER.map((f) => ({ key: f.title, label: f.title, mlNumber: f.ml, dpId: null })),
  ...DP_DOCS,
];

const str = (v: unknown) => (typeof v === 'string' ? v : '');

async function loadDoc(doc: (typeof DOCS)[number]): Promise<OpenItemsDoc> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${encodeURIComponent(doc.mlNumber)}/proposals/`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ...doc, items: [], loaded: false };
    const body = (await res.json().catch(() => ({}))) as { proposals?: GovHubDraftProposal[] };
    const items = (body.proposals || [])
      .filter((p) => String(p.status || '').toLowerCase() === 'pending')
      .map((p) => ({
        id: p.id,
        patchMode: str(p.patch_mode) || 'replace',
        originalText: str(p.original_text),
        proposedText: str(p.proposed_text),
        rationale: str(p.rationale),
        authorName: str(p.author_name) || 'Someone',
        createdAt: str(p.created_at) || null,
        applicability: str(p.applicability) || 'applies',
        marker: versionMarkerOf(p),
        approvals: (p.approvals || []).length,
      }))
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return { ...doc, items, loaded: true };
  } catch {
    return { ...doc, items: [], loaded: false };
  }
}

export async function loadOpenItems(): Promise<OpenItemsDoc[]> {
  return Promise.all(DOCS.map(loadDoc));
}
