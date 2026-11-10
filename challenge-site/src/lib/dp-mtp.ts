/**
 * Massive Transformational Purpose (MTP) lines in DP chapters (owner, 2026-11-04).
 *
 * Each chapter carries two lines under its tagline, "**Massive Transformational Purpose:** …" and
 * "**In plain words:** …" (Gov Hub services/dp_mtp.py). The label is spelled out (owner, 2026-11-05);
 * the first proposals used "**MTP:**", which is still read. They change only through proposals that
 * every co-editor approves (one steering approval after the freeze); the MTP tab shows those
 * proposals, the current lines and the history of approved wordings.
 */
import type { GovHubDraftProposal } from '@/lib/govhub';

export const MTP_PREFIX = '**Massive Transformational Purpose:**';
export const LEGACY_MTP_PREFIX = '**MTP:**';
const MTP_PREFIXES = [MTP_PREFIX, LEGACY_MTP_PREFIX];

/** The MTP label a line starts with (spelled out or legacy), or null. */
function mtpPrefixOf(line: string): string | null {
  return MTP_PREFIXES.find((prefix) => line.startsWith(prefix)) ?? null;
}
export const PLAIN_PREFIX = '**In plain words:**';

export type MtpLines = { mtp: string; plain: string | null };

export type MtpHistoryEntry = {
  proposalId: string;
  mtp: string;
  plain: string | null;
  status: string;
  authorName: string | null;
  proposedAt: string | null;
  decidedAt: string | null;
  approvers: string[];
  note: string | null;
};

export type MtpResponse = {
  current: MtpLines | null;
  history: MtpHistoryEntry[];
  pendingCount: number;
};

export function isMtpText(text: string | null | undefined): boolean {
  return mtpPrefixOf(String(text || '').trimStart()) !== null;
}

/** A review item that adds or changes a chapter's MTP. MTPs are held for Version 1.1 and decided
 *  by the steering committee alone (owner, 2026-11-09; Gov Hub services/dp_mtp.py). */
export function isMtpItem(item: { proposedText?: string | null; insertText?: string | null; originalText?: string | null }): boolean {
  return isMtpText(item.proposedText) || isMtpText(item.insertText) || isMtpText(item.originalText);
}

/** The MTP and plain-words lines in a block of chapter text (a passage or a proposal). */
export function parseMtp(text: string | null | undefined): MtpLines | null {
  let mtp: string | null = null;
  let plain: string | null = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const prefix = mtpPrefixOf(line);
    if (mtp === null && prefix) mtp = line.slice(prefix.length).trim();
    else if (plain === null && line.startsWith(PLAIN_PREFIX)) plain = line.slice(PLAIN_PREFIX.length).trim();
  }
  return mtp ? { mtp, plain } : null;
}

/** Current lines from the chapter's Markdown blocks (Gov Hub chapter-passages). */
export function currentMtpFromPassages(passages: string[]): MtpLines | null {
  return parseMtp(passages.filter((p) => isMtpText(p) || p.trimStart().startsWith(PLAIN_PREFIX)).join('\n'));
}

/** Approved and declined MTP proposals, newest decision first: the record of how the MTP changed. */
export function mtpHistory(proposals: GovHubDraftProposal[]): MtpHistoryEntry[] {
  return proposals
    .filter((p) => isMtpText(p.proposed_text) && String(p.status).toLowerCase() !== 'pending')
    .map((p) => {
      const lines = parseMtp(p.proposed_text);
      return {
        proposalId: p.id,
        mtp: lines?.mtp || '',
        plain: lines?.plain || null,
        status: String(p.status).toLowerCase(),
        authorName: p.author_name || null,
        proposedAt: p.created_at || null,
        decidedAt: p.reviewed_at || null,
        approvers: (p.approvals || []).map((a) => a.user_name || 'Co-editor'),
        note: p.review_note || null,
      };
    })
    .sort((a, b) => String(b.decidedAt || '').localeCompare(String(a.decidedAt || '')));
}
