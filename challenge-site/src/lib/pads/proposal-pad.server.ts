/**
 * Proposal pads: live data for /pads/proposals/<id>, read from Gov Hub's public APIs (no sign-in, nothing private):
 * the document's proposal list, its current chapter blocks, its co-editor seats, and the closed steering stages.
 * The pure shaping is in proposal-pad-core.ts. Plain-language summaries are stored, not generated here
 * (src/data/proposal-pad-summaries.json, written by scripts/generate-proposal-pad-summaries.mjs).
 */
import 'server-only';
import { createHash } from 'node:crypto';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import summaries from '@/data/proposal-pad-summaries.json';
import { FRONT_MATTER } from '@/lib/dp-steering';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import {
  buildProposalPad,
  normalizePadId,
  padIdMatches,
  summaryInput,
  type ProposalPad,
  type RawProposal,
  type RawSteeringItem,
} from '@/lib/pads/proposal-pad-core';

export const PAD_REVALIDATE_SECONDS = 120;

export type PadDoc = { key: string; label: string; mlNumber: string; dpId: string | null };

const MAP = (dpMlDraftMap as { map: Record<string, { mlNumber: string; label: string }> }).map;

export const PAD_DOCS: PadDoc[] = [
  ...FRONT_MATTER.map((f) => ({ key: f.title, label: f.title, mlNumber: f.ml, dpId: null })),
  ...Object.entries(MAP)
    .map(([dpId, e]) => ({ key: dpId, label: e.label, mlNumber: e.mlNumber, dpId }))
    .sort((a, b) => Number(a.key.slice(2)) - Number(b.key.slice(2))),
];

export const ML_TO_DP: Record<string, string> = Object.fromEntries(Object.entries(MAP).map(([dp, e]) => [e.mlNumber, dp]));

/**
 * In-process memo in front of Next's fetch cache: concurrent requests for one path share a single Gov Hub call, and a
 * failure is remembered for FAILURE_TTL_MS so a slow Gov Hub is not hit again on every pad view (the lists are large:
 * Gov Hub works out each proposal's applicability on every uncached call).
 */
const FAILURE_TTL_MS = 30_000;
const memo = new Map<string, { at: number; ttl: number; value: Promise<unknown> }>();

async function getJson<T>(path: string, revalidate = PAD_REVALIDATE_SECONDS): Promise<T | null> {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < hit.ttl) return (await hit.value) as T | null;
  const entry = { at: Date.now(), ttl: revalidate * 1000, value: Promise.resolve(null) as Promise<unknown> };
  entry.value = (async () => {
    try {
      const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}${path}`, {
        headers: { Accept: 'application/json' },
        next: { revalidate },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as T;
    } catch {
      entry.ttl = FAILURE_TTL_MS;
      return null;
    }
  })();
  memo.set(path, entry);
  if (memo.size > 500) {
    for (const [k, v] of memo) if (Date.now() - v.at >= v.ttl) memo.delete(k);
  }
  return (await entry.value) as T | null;
}

export async function fetchDocProposals(mlNumber: string): Promise<RawProposal[] | null> {
  const body = await getJson<{ proposals?: RawProposal[] }>(`/api/doc/draft/${encodeURIComponent(mlNumber)}/proposals/`);
  return body ? body.proposals || [] : null;
}

async function fetchPassages(mlNumber: string): Promise<string[]> {
  const body = await getJson<{ passages?: unknown[] }>(`/api/doc/draft/${encodeURIComponent(mlNumber)}/chapter-passages/`);
  return (body?.passages || []).filter((p): p is string => typeof p === 'string');
}

/** Co-editor approvals a proposal needs on this DP (Gov Hub's approvals_needed; two on most DPs). */
async function fetchApprovalsNeeded(dpId: string | null): Promise<{ needed: number; workgroupId: string | null }> {
  const slug = dpWorkgroupSlug(dpId);
  if (!slug) return { needed: 2, workgroupId: null };
  const wg = await getJson<{ id?: string }>(`/api/workgroups/by-slug/${encodeURIComponent(slug)}/`, 600);
  if (!wg?.id) return { needed: 2, workgroupId: null };
  const seats = await getJson<{ approvals_needed?: number; seats_total?: number }>(
    `/api/workgroups/${encodeURIComponent(wg.id)}/co-editors/`,
  );
  return { needed: Number(seats?.approvals_needed ?? seats?.seats_total) || 2, workgroupId: wg.id };
}

type StageList = { stages?: Array<{ key: string; title: string; status: string; position?: number }> };
type StageDoc = {
  items?: Array<RawSteeringItem & { proposal_id?: string }>;
};

/** This proposal's records in the closed steering stages (public once a stage is closed). */
async function fetchSteering(mlNumber: string, proposalId: string): Promise<RawSteeringItem[]> {
  const list = await getJson<StageList>('/api/doc/steering/stages/', 600);
  // Proposal analyses live in the first two stages (proposal review, cross-DP); the style and final-read stages are
  // large and hold only their own edits, so they are not read.
  const closed = (list?.stages || []).filter((s) => s.status === 'closed' && (s.position ?? 99) <= 2);
  const docs = await Promise.all(
    closed.map(async (s) => ({
      stage: s,
      doc: await getJson<StageDoc>(
        `/api/doc/steering/stages/${encodeURIComponent(s.key)}/documents/${encodeURIComponent(mlNumber)}/`,
        600,
      ),
    })),
  );
  const out: RawSteeringItem[] = [];
  for (const { stage, doc } of docs) {
    for (const item of doc?.items || []) {
      if (item.proposal_id !== proposalId) continue;
      out.push({
        stageKey: stage.key,
        stageTitle: stage.title.replace(/^Stage \d+:\s*/, 'Steering, '),
        analysis: item.analysis || null,
        outcome: item.outcome || null,
        votes: item.votes || null,
      });
    }
  }
  return out;
}

/** Which document a proposal id was last seen on (this process), so a pad reads one list, not all 28. */
const seenOn = new Map<string, string>();

function indexedMl(rawId: string): string | null {
  const want = String(rawId || '').toLowerCase();
  const items = (summaries as SummaryFile).items || {};
  for (const [id, row] of Object.entries(items)) if (row.ml && padIdMatches(want, id)) return row.ml;
  for (const [id, ml] of seenOn) if (padIdMatches(want, id)) return ml;
  return null;
}

export class GovHubUnavailableError extends Error {}

/**
 * Find the proposal behind a pad id (full id or 8+ character prefix). Tries the document hint (from the page), then
 * the stored index, then the other documents a few at a time, stopping at the first match. Throws
 * GovHubUnavailableError when it is not found and some document did not answer (unknown, not missing).
 */
export async function findPadProposal(
  rawId: string,
  mlHint?: string | null,
): Promise<{ doc: PadDoc; proposal: RawProposal; all: RawProposal[] } | null> {
  if (!normalizePadId(rawId)) return null;
  const first = [mlHint, indexedMl(rawId)].filter((m): m is string => Boolean(m && PAD_DOCS.some((d) => d.mlNumber === m)));
  const order = [
    ...first.map((m) => PAD_DOCS.find((d) => d.mlNumber === m) as PadDoc),
    ...PAD_DOCS.filter((d) => !first.includes(d.mlNumber)),
  ];
  let unanswered = 0;
  const tryDoc = async (doc: PadDoc) => {
    const all = await fetchDocProposals(doc.mlNumber);
    if (!all) {
      unanswered += 1;
      return null;
    }
    for (const p of all) seenOn.set(p.id, doc.mlNumber);
    const proposal = all.find((p) => padIdMatches(rawId, p.id));
    return proposal ? { doc, proposal, all } : null;
  };
  for (const doc of order.slice(0, first.length)) {
    const found = await tryDoc(doc);
    if (found) return found;
  }
  const rest = order.slice(first.length);
  for (let i = 0; i < rest.length; i += 4) {
    const batch = await Promise.all(rest.slice(i, i + 4).map(tryDoc));
    const found = batch.find(Boolean);
    if (found) return found;
  }
  if (unanswered) throw new GovHubUnavailableError(`Gov Hub did not answer for ${unanswered} documents`);
  return null;
}

export type PadSummary = { title: string; summary: string; generatedAt: string; model: string };

type SummaryFile = {
  model: string;
  items: Record<string, { title: string; summary: string; inputHash: string; generatedAt: string; ml?: string }>;
};

export function summaryHash(p: RawProposal, docLabel: string): string {
  return createHash('sha256').update(summaryInput(p, docLabel)).digest('hex').slice(0, 16);
}

/** The stored plain-language summary, only while the proposal's text is the one it was written from. */
export function storedSummary(p: RawProposal, docLabel: string): PadSummary | null {
  const file = summaries as SummaryFile;
  const row = file.items?.[p.id];
  if (!row || row.inputHash !== summaryHash(p, docLabel)) return null;
  return { title: row.title, summary: row.summary, generatedAt: row.generatedAt, model: file.model };
}

export type LoadedPad = {
  pad: ProposalPad;
  summary: PadSummary | null;
  workgroupId: string | null;
  workgroupSlug: string | null;
};

export async function loadProposalPad(rawId: string): Promise<LoadedPad | null> {
  const found = await findPadProposal(rawId);
  if (!found) return null;
  const { doc, proposal, all } = found;
  const [passages, seats, steering] = await Promise.all([
    fetchPassages(doc.mlNumber),
    fetchApprovalsNeeded(doc.dpId),
    fetchSteering(doc.mlNumber, proposal.id),
  ]);
  const pad = buildProposalPad({
    proposal,
    all,
    passages,
    steering,
    dpId: doc.dpId,
    docLabel: doc.label,
    mlNumber: doc.mlNumber,
    approvalsNeeded: seats.needed,
    mlToDp: ML_TO_DP,
  });
  return {
    pad,
    summary: storedSummary(proposal, doc.label),
    workgroupId: seats.workgroupId,
    workgroupSlug: dpWorkgroupSlug(doc.dpId),
  };
}

/** The proposal pad's current status for the follow sweep (one list fetch per document). */
export async function currentStatuses(mlNumber: string): Promise<Map<string, RawProposal> | null> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${encodeURIComponent(mlNumber)}/proposals/`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { proposals?: RawProposal[] };
    return new Map((body.proposals || []).map((p) => [p.id, p]));
  } catch {
    return null;
  }
}

/** The stored short title for a proposal (for lists; the pad itself checks the summary is current). */
export function storedTitle(id: string): string | null {
  return (summaries as SummaryFile).items?.[id]?.title || null;
}
