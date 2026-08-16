import type { BroadcastCohortKey } from '@/data/dp-broadcast-cohorts';
import type { BroadcastDpScope, BroadcastPatchFilter } from '@/lib/dp-broadcast-audience-filter';

export type BroadcastDraftRecipientView = 'members' | 'workgroups';

export type BroadcastDraft = {
  subject: string;
  html: string;
  fontId: string;
  testMode: boolean;
  testEmail: string;
  availableInArchive: boolean;
  recipientView: BroadcastDraftRecipientView;
  selected: string[];
  selectedWorkgroups: string[];
  memberSearch: string;
  cohortFilter: BroadcastCohortKey;
  patchFilter: BroadcastPatchFilter;
  dpScope: BroadcastDpScope;
  dpId: string;
  savedAt: number;
};

export type BroadcastDraftInput = Omit<BroadcastDraft, 'savedAt'>;

export const DP_BROADCAST_DRAFT_KEY = 'dp-broadcast-draft';

const EMPTY_HTML = ['', '<p><br></p>', '<p></p>', '<p><br/></p>'];

const COHORT_KEYS = new Set<BroadcastCohortKey>([
  'all',
  'cfi1_pci',
  'cfi1_zoom',
  'cfi2_submitters',
  'isoc_nevada',
  'dp_challenge',
]);

const PATCH_FILTERS = new Set<BroadcastPatchFilter>(['all', 'submitted', 'not_submitted']);
const DP_SCOPES = new Set<BroadcastDpScope>(['all', 'specific']);

export function isBroadcastDraftEmpty(subject: string, html: string): boolean {
  const subj = subject.trim();
  const body = html.trim();
  return !subj && (!body || EMPTY_HTML.includes(body));
}

function normalizeCohortFilter(raw: unknown): BroadcastCohortKey {
  const key = String(raw || 'all') as BroadcastCohortKey;
  return COHORT_KEYS.has(key) ? key : 'all';
}

function normalizePatchFilter(raw: unknown): BroadcastPatchFilter {
  const key = String(raw || 'all') as BroadcastPatchFilter;
  return PATCH_FILTERS.has(key) ? key : 'all';
}

function normalizeDpScope(raw: unknown): BroadcastDpScope {
  const key = String(raw || 'all') as BroadcastDpScope;
  return DP_SCOPES.has(key) ? key : 'all';
}

export function hasBroadcastDraftPrefs(draft: Partial<BroadcastDraftInput>): boolean {
  return Boolean(
    String(draft.testEmail || '').trim() ||
      (Array.isArray(draft.selected) && draft.selected.length > 0) ||
      (Array.isArray(draft.selectedWorkgroups) && draft.selectedWorkgroups.length > 0) ||
      String(draft.memberSearch || '').trim() ||
      (draft.cohortFilter && draft.cohortFilter !== 'all') ||
      (draft.patchFilter && draft.patchFilter !== 'all') ||
      (draft.dpScope && draft.dpScope !== 'all') ||
      String(draft.dpId || '').trim(),
  );
}

function hasBroadcastDraftContent(draft: Partial<BroadcastDraftInput>): boolean {
  const subject = String(draft.subject || '');
  const html = String(draft.html || '');
  const fontId = String(draft.fontId || 'default');
  return !isBroadcastDraftEmpty(subject, html) || fontId !== 'default';
}

export function shouldPersistBroadcastDraft(draft: BroadcastDraftInput): boolean {
  return hasBroadcastDraftContent(draft) || hasBroadcastDraftPrefs(draft);
}

function normalizeDraft(draft: Partial<BroadcastDraft>): BroadcastDraft {
  return {
    subject: String(draft.subject || ''),
    html: String(draft.html || ''),
    fontId: String(draft.fontId || 'default'),
    testMode: draft.testMode !== false,
    testEmail: String(draft.testEmail || ''),
    availableInArchive: Boolean(draft.availableInArchive),
    recipientView: draft.recipientView === 'members' ? 'members' : 'workgroups',
    selected: Array.isArray(draft.selected) ? draft.selected.map(String) : [],
    selectedWorkgroups: Array.isArray(draft.selectedWorkgroups)
      ? draft.selectedWorkgroups.map(String)
      : [],
    memberSearch: String(draft.memberSearch || ''),
    cohortFilter: normalizeCohortFilter(draft.cohortFilter),
    patchFilter: normalizePatchFilter(draft.patchFilter),
    dpScope: normalizeDpScope(draft.dpScope),
    dpId: String(draft.dpId || '').trim(),
    savedAt: Number(draft.savedAt) || Date.now(),
  };
}

export function readBroadcastDraft(): BroadcastDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DP_BROADCAST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = normalizeDraft(JSON.parse(raw) as Partial<BroadcastDraft>);
    if (!shouldPersistBroadcastDraft(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBroadcastDraft(draft: BroadcastDraftInput): void {
  if (typeof window === 'undefined') return;
  try {
    if (!shouldPersistBroadcastDraft(draft)) {
      localStorage.removeItem(DP_BROADCAST_DRAFT_KEY);
      return;
    }
    localStorage.setItem(
      DP_BROADCAST_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** Clear compose content and recipient picks; keep test email, filters, and search. */
export function clearBroadcastComposeAfterSend(draft: BroadcastDraftInput): void {
  writeBroadcastDraft({
    ...draft,
    subject: '',
    html: '',
    fontId: 'default',
    availableInArchive: false,
    selected: [],
    selectedWorkgroups: [],
  });
}

export function clearBroadcastDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DP_BROADCAST_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function fixBroadcastEmDashes(subject: string, html: string): {
  subject: string;
  html: string;
  count: number;
} {
  const emDash = '\u2014';
  const enDash = '\u2013';
  let count = 0;

  const subjectParts = subject.split(emDash);
  const nextSubject =
    subjectParts.length > 1 ? (count += subjectParts.length - 1, subjectParts.join(enDash)) : subject;

  const htmlParts = html.split(emDash);
  const nextHtml =
    htmlParts.length > 1 ? (count += htmlParts.length - 1, htmlParts.join(enDash)) : html;

  return { subject: nextSubject, html: nextHtml, count };
}
