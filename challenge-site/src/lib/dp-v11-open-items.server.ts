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
  /** False when Gov Hub has not answered for this document since the process started (items unknown, not zero). */
  loaded: boolean;
  /** True when this fetch failed and the items are the last good copy kept in memory. */
  stale: boolean;
  /** When the items shown were fetched (ISO), or null when never loaded. */
  fetchedAt: string | null;
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

/**
 * Gov Hub answers these lists one after another (1-5 s each, it works out each proposal's applicability), so firing
 * all ~28 at once let the later ones pass the timeout and get cancelled. Fetch a few at a time instead.
 */
const CONCURRENCY = 4;
const TIMEOUT_MS = 20_000;
/** Documents that failed get one more try, two at a time and with longer to answer (Gov Hub is quieter by then). */
const RETRY_CONCURRENCY = 2;
const RETRY_TIMEOUT_MS = 30_000;

/** Last good items per document since process start: served (marked stale) when a later fetch fails or times out. */
const lastGood = new Map<string, { items: OpenItem[]; fetchedAt: string }>();

async function fetchDocItems(mlNumber: string, timeoutMs: number): Promise<OpenItem[] | null> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${encodeURIComponent(mlNumber)}/proposals/`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as { proposals?: GovHubDraftProposal[] } | null;
    if (!body || !Array.isArray(body.proposals)) return null;
    return body.proposals
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
  } catch {
    return null;
  }
}

async function loadDoc(doc: (typeof DOCS)[number], timeoutMs = TIMEOUT_MS): Promise<OpenItemsDoc> {
  const items = await fetchDocItems(doc.mlNumber, timeoutMs);
  if (items) {
    const fetchedAt = new Date().toISOString();
    lastGood.set(doc.mlNumber, { items, fetchedAt });
    return { ...doc, items, loaded: true, stale: false, fetchedAt };
  }
  const prev = lastGood.get(doc.mlNumber);
  if (prev) return { ...doc, items: prev.items, loaded: true, stale: true, fetchedAt: prev.fetchedAt };
  return { ...doc, items: [], loaded: false, stale: false, fetchedAt: null };
}

/** Map with at most `limit` calls in flight; results keep the input order. */
async function mapLimited<T, R>(list: readonly T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await fn(list[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}

let inFlight: Promise<OpenItemsDoc[]> | null = null;

/** Every document's open items. Concurrent callers (the pads index, the open items list) share one sweep. */
export async function loadOpenItems(): Promise<OpenItemsDoc[]> {
  if (!inFlight) {
    inFlight = (async () => {
      const docs = await mapLimited(DOCS, CONCURRENCY, (d) => loadDoc(d));
      const failed = DOCS.filter((_, i) => docs[i].stale || !docs[i].loaded);
      const retried = await mapLimited(failed, RETRY_CONCURRENCY, (d) => loadDoc(d, RETRY_TIMEOUT_MS));
      return docs.map((d) => retried.find((r) => r.mlNumber === d.mlNumber && r.loaded && !r.stale) ?? d);
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
