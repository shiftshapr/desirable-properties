/**
 * Lookups Ask Deepi can make on the steering pages while it answers: search the current text of
 * every document in the book, read a range of blocks, and list or open the proposals on any
 * document (with their analysis and steering votes). Everything is read with the asking member's
 * token, so Gov Hub decides what they may see; nothing here writes.
 */
import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { normalizeOverview, normalizeSteeringDocument, DECISION_LABEL, STATE_LABEL, normalizeMl } from '@/lib/dp-steering';
import { fetchSteeringDocument, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';
import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

const BOOK_TTL_MS = 5 * 60 * 1000;
const SEARCH_HITS = 12;
const HIT_CHARS = 700;
const READ_MAX_BLOCKS = 30;
const LIST_MAX_ITEMS = 60;
const FIELD_CHARS = 1500;

export type BookDoc = { ml: string; title: string; passages: string[] };
let bookCache: { at: number; docs: BookDoc[] } | null = null;

const clip = (s: string | null | undefined, n: number) => {
  const t = String(s || '').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

/** Every document's current text, cached for a few minutes (the book does not change between questions). */
async function loadBook(idToken: string): Promise<BookDoc[]> {
  if (bookCache && Date.now() - bookCache.at < BOOK_TTL_MS) return bookCache.docs;
  const overview = await steeringFetch(steeringPaths.overview(), idToken);
  if (!overview.ok) throw new Error(String(overview.data.error || `Book list unavailable (${overview.status})`));
  const rows = normalizeOverview(overview.data).filter((r) => r.mlNumber);
  const docs = await Promise.all(
    rows.map(async (r) => ({ ml: r.mlNumber, title: r.title, passages: await fetchChapterPassages(r.mlNumber).catch(() => []) })),
  );
  bookCache = { at: Date.now(), docs };
  return docs;
}

function findDoc(docs: BookDoc[], ref: string): BookDoc | undefined {
  const ml = normalizeMl(ref);
  if (ml) return docs.find((d) => d.ml === ml);
  // Also accept "DP13" or a title fragment.
  const r = ref.trim().toLowerCase();
  return docs.find((d) => d.title.toLowerCase().startsWith(`${r} `) || d.title.toLowerCase().startsWith(`${r}–`) || d.title.toLowerCase() === r)
    ?? docs.find((d) => d.title.toLowerCase().includes(r));
}

const label = (d: BookDoc) => `${d.ml} (${d.title})`;

export function searchBook(docs: BookDoc[], query: string, ref?: string): string {
  const q = query.trim().toLowerCase();
  const terms = [...new Set(q.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3))];
  if (!terms.length) return 'Give a query of at least one word of three letters or more.';
  const scope = ref ? [findDoc(docs, ref)].filter((d): d is BookDoc => Boolean(d)) : docs;
  if (ref && !scope.length) return `No document matches "${ref}".`;
  const hits: Array<{ score: number; doc: BookDoc; i: number }> = [];
  for (const doc of scope) {
    doc.passages.forEach((p, i) => {
      const t = p.toLowerCase();
      const matched = terms.filter((term) => t.includes(term)).length;
      if (!matched) return;
      // Whole-phrase matches first, then the share of terms present.
      const score = (q.length > 3 && t.includes(q) ? 10 : 0) + matched / terms.length;
      if (matched / terms.length >= 0.5 || score >= 10) hits.push({ score, doc, i });
    });
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length) return `No passages match "${query}"${ref ? ` in ${ref}` : ' anywhere in the book'}.`;
  return [
    `${hits.length} matching blocks${hits.length > SEARCH_HITS ? `, best ${SEARCH_HITS} shown` : ''}:`,
    ...hits.slice(0, SEARCH_HITS).map((h) => `${label(h.doc)} [${h.i}] ${clip(h.doc.passages[h.i], HIT_CHARS)}`),
  ].join('\n\n');
}

export function readBlocks(docs: BookDoc[], ref: string, from: number, to: number): string {
  const doc = findDoc(docs, ref);
  if (!doc) return `No document matches "${ref}".`;
  const start = Math.max(0, Math.floor(from));
  const end = Math.min(doc.passages.length - 1, Math.floor(to), start + READ_MAX_BLOCKS - 1);
  if (start > end) return `${label(doc)} has blocks [0] to [${doc.passages.length - 1}].`;
  return [`${label(doc)}, blocks [${start}] to [${end}] of ${doc.passages.length}:`,
    ...doc.passages.slice(start, end + 1).map((p, k) => `[${start + k}] ${p}`)].join('\n\n');
}

type SteeringLookup = { error: string } | { doc: BookDoc; steering: ReturnType<typeof normalizeSteeringDocument> };

async function steeringDoc(docs: BookDoc[], ref: string, idToken: string): Promise<SteeringLookup> {
  const doc = findDoc(docs, ref);
  if (!doc) return { error: `No document matches "${ref}".` };
  const res = await fetchSteeringDocument(doc.ml, idToken);
  if (!res.ok) return { error: String(res.data.error || `Proposals unavailable (${res.status})`) };
  return { doc, steering: normalizeSteeringDocument(doc.ml, res.data) };
}

async function listProposals(docs: BookDoc[], ref: string, idToken: string): Promise<string> {
  const r = await steeringDoc(docs, ref, idToken);
  if ('error' in r) return r.error;
  const items = r.steering.items;
  if (!items.length) return `${label(r.doc)} has no open proposals.`;
  return [
    `${label(r.doc)}: ${items.length} open proposals${items.length > LIST_MAX_ITEMS ? `, first ${LIST_MAX_ITEMS} shown` : ''}.`,
    ...items.slice(0, LIST_MAX_ITEMS).map((it) => {
      const p = it.proposal;
      const rec = it.analysis?.recommendation ? DECISION_LABEL[it.analysis.recommendation] || it.analysis.recommendation : 'no analysis';
      return `- ${it.proposalId} · ${p.patch_mode || 'change'} · ${STATE_LABEL[it.state] || it.state} · analysis: ${rec}\n  original: ${clip(p.original_text, 200) || '(none)'}\n  proposed: ${clip(p.proposed_text, 300) || '(none)'}`;
    }),
  ].join('\n');
}

async function getProposal(docs: BookDoc[], ref: string, proposalId: string, idToken: string): Promise<string> {
  const r = await steeringDoc(docs, ref, idToken);
  if ('error' in r) return r.error;
  const it = r.steering.items.find((i) => i.proposalId === proposalId.trim() || i.proposalId.startsWith(proposalId.trim()));
  if (!it) return `No open proposal ${proposalId} on ${label(r.doc)}.`;
  const p = it.proposal;
  const a = it.analysis;
  return [
    `${label(r.doc)} proposal ${it.proposalId} (${p.patch_mode || 'change'}, by ${p.author_name || 'unknown'}), steering state: ${STATE_LABEL[it.state] || it.state}.`,
    `Original: ${clip(p.original_text, FIELD_CHARS) || '(none)'}`,
    `Proposed: ${clip(p.proposed_text, FIELD_CHARS) || '(none)'}`,
    `Rationale: ${clip(p.rationale, FIELD_CHARS) || '(none)'}`,
    a ? `Analysis: ${DECISION_LABEL[a.recommendation || ''] || a.recommendation || 'none'} (${a.confidence || '?'} confidence). ${clip(a.summary, FIELD_CHARS)}${a.revisedText ? `\nRevised text: ${clip(a.revisedText, FIELD_CHARS)}` : ''}` : 'No analysis.',
    it.votes.length ? `Votes: ${it.votes.map((v) => `${v.voterName || 'member'}: ${DECISION_LABEL[v.decision] || v.decision}`).join('; ')}` : 'No votes yet.',
  ].join('\n');
}

export const STEERING_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'search_book',
    description:
      'Search the current text of every document in the book (all 24 chapters plus Introduction, About, Acknowledgements, Cover) for passages about a phrase or idea. Use it to check whether another chapter already covers, repeats or contradicts what a proposal says. Returns matching blocks as "<ML number> (<title>) [<block>] <text>". Optionally limit to one document.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words or a phrase to look for, e.g. "kill switch" or "reality anchors".' },
        document: { type: 'string', description: 'Optional: an ML number (ML-Draft-013), a DP number (DP6) or a title.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_blocks',
    description: `Read consecutive blocks of any document, e.g. to see the context around a search hit. At most ${READ_MAX_BLOCKS} blocks per call.`,
    input_schema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'An ML number, DP number or title.' },
        from: { type: 'integer', description: 'First block number.' },
        to: { type: 'integer', description: 'Last block number.' },
      },
      required: ['document', 'from', 'to'],
    },
  },
  {
    name: 'list_proposals',
    description: 'List the open proposals on any document, with their steering state and the analysis recommendation. Use it to find related or competing changes filed on other documents.',
    input_schema: {
      type: 'object',
      properties: { document: { type: 'string', description: 'An ML number, DP number or title.' } },
      required: ['document'],
    },
  },
  {
    name: 'get_proposal',
    description: 'Open one proposal on any document in full: original and proposed text, rationale, the analysis and the steering votes.',
    input_schema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'An ML number, DP number or title.' },
        proposal_id: { type: 'string', description: 'The proposal id (the first 8 characters are enough).' },
      },
      required: ['document', 'proposal_id'],
    },
  },
];

/** Runs one tool call for the asking member. Errors come back as text so Deepi can say what it could not check. */
export function steeringToolRunner(idToken: string) {
  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    try {
      const docs = await loadBook(idToken);
      const s = (k: string) => String(input[k] ?? '');
      switch (name) {
        case 'search_book':
          return searchBook(docs, s('query'), s('document') || undefined);
        case 'read_blocks':
          return readBlocks(docs, s('document'), Number(input.from), Number(input.to));
        case 'list_proposals':
          return await listProposals(docs, s('document'), idToken);
        case 'get_proposal':
          return await getProposal(docs, s('document'), s('proposal_id'), idToken);
        default:
          return `Unknown tool ${name}.`;
      }
    } catch (err) {
      return `Lookup failed: ${err instanceof Error ? err.message : 'error'}`;
    }
  };
}
