import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { readSession } from '@/lib/auth-session';
import { steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** The 28 Version 1.0 documents, in book order. */
const DOCS: Array<[string, string]> = [
  ['Cover', 'ML-Draft-033'], ['About', 'ML-Draft-031'], ['Acknowledgements', 'ML-Draft-032'], ['Introduction', 'ML-Draft-026'],
  ['DP1', 'ML-Draft-008'], ['DP2', 'ML-Draft-009'], ['DP3', 'ML-Draft-010'], ['DP4', 'ML-Draft-011'], ['DP5', 'ML-Draft-012'],
  ['DP6', 'ML-Draft-013'], ['DP7', 'ML-Draft-014'], ['DP8', 'ML-Draft-015'], ['DP9', 'ML-Draft-016'], ['DP10', 'ML-Draft-017'],
  ['DP11', 'ML-Draft-002'], ['DP12', 'ML-Draft-003'], ['DP13', 'ML-Draft-004'], ['DP14', 'ML-Draft-018'], ['DP15', 'ML-Draft-019'],
  ['DP16', 'ML-Draft-020'], ['DP17', 'ML-Draft-021'], ['DP18', 'ML-Draft-022'], ['DP19', 'ML-Draft-023'], ['DP20', 'ML-Draft-024'],
  ['DP21', 'ML-Draft-025'], ['DP22', 'ML-Draft-028'], ['DP23', 'ML-Draft-030'], ['DP24', 'ML-Draft-056'],
];
const TTL = 60_000;

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : '');
let cache: { at: number; rows: Raw[] } | null = null;
let analysesCache: { at: number; byId: Record<string, Raw> } | null = null;

async function loadProposals(): Promise<Raw[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const lists = await Promise.all(
    DOCS.map(async ([key, ml]) => {
      const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${ml}/proposals/`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const body = (await res.json().catch(() => ({}))) as { proposals?: Raw[] } | Raw[];
      const list = Array.isArray(body) ? body : body.proposals || [];
      return list.map((p) => ({ ...p, doc_key: key, ml_number: ml }));
    }),
  );
  const rows = lists.flat();
  cache = { at: Date.now(), rows };
  return rows;
}

/** Latest generated analysis per proposal (steering members only; Gov Hub checks). */
async function loadAnalyses(idToken: string): Promise<Record<string, Raw>> {
  if (analysesCache && Date.now() - analysesCache.at < TTL * 5) return analysesCache.byId;
  const res = await steeringFetch(steeringPaths.audit(), idToken);
  if (!res.ok) return {};
  const runs = new Map<string, string>();
  for (const r of (res.data.runs as Raw[]) || []) runs.set(s(r.id), s(r.label));
  const byId: Record<string, Raw> = {};
  for (const a of (res.data.analyses as Raw[]) || []) {
    byId[s(a.proposal_id)] = { recommendation: s(a.recommendation), summary: s(a.summary), run: runs.get(s(a.run_id)) || '' };
  }
  analysesCache = { at: Date.now(), byId };
  return byId;
}

/** Every proposal on the 28 Version 1.0 documents, for the Proposals tab (anyone signed in). */
export async function GET() {
  const session = await readSession();
  if (!session?.userId) return Response.json({ error: 'Sign in required', code: 'sign_in' }, { status: 401 });
  const [rows, analyses] = await Promise.all([loadProposals(), session.idToken ? loadAnalyses(session.idToken) : Promise.resolve({})]);
  const proposals = rows.map((p) => {
    const a = (analyses as Record<string, Raw>)[s(p.id)];
    const channel = s(p.source_channel);
    return {
      id: s(p.id),
      docKey: s(p.doc_key),
      mlNumber: s(p.ml_number),
      status: s(p.status),
      statusLabel: s(p.status_label) || s(p.status),
      author: s(p.author_name) || 'Unknown',
      coEditor: s(p.reviewed_by_name) || null,
      createdAt: s(p.created_at) || null,
      reviewedAt: s(p.reviewed_at) || null,
      source: channel === 'steering-repair' ? 'repair' : p.agent_assisted ? 'agent' : 'community',
      rationale: s(p.rationale),
      reviewNote: s(p.review_note) || null,
      section: s((p.context_anchor as Raw | null)?.section) || null,
      originalText: s(p.original_text),
      proposedText: s(p.proposed_text),
      patchMode: s(p.patch_mode),
      analysis: a ? { recommendation: s(a.recommendation), summary: s(a.summary), run: s(a.run) } : null,
    };
  });
  return Response.json({ proposals, docs: DOCS.map(([key, ml]) => ({ key, ml })) });
}
