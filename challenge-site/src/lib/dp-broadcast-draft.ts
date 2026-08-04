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
  savedAt: number;
};

export const DP_BROADCAST_DRAFT_KEY = 'dp-broadcast-draft';

const EMPTY_HTML = ['', '<p><br></p>', '<p></p>'];

export function isBroadcastDraftEmpty(subject: string, html: string): boolean {
  const subj = subject.trim();
  const body = html.trim();
  return !subj && (!body || EMPTY_HTML.includes(body));
}

export function readBroadcastDraft(): BroadcastDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DP_BROADCAST_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<BroadcastDraft>;
    const subject = String(draft.subject || '');
    const html = String(draft.html || '');
    const fontId = String(draft.fontId || 'default');
    if (isBroadcastDraftEmpty(subject, html) && fontId === 'default') return null;
    return {
      subject,
      html,
      fontId,
      testMode: draft.testMode !== false,
      testEmail: String(draft.testEmail || ''),
      availableInArchive: Boolean(draft.availableInArchive),
      recipientView: draft.recipientView === 'members' ? 'members' : 'workgroups',
      selected: Array.isArray(draft.selected) ? draft.selected.map(String) : [],
      selectedWorkgroups: Array.isArray(draft.selectedWorkgroups)
        ? draft.selectedWorkgroups.map(String)
        : [],
      memberSearch: String(draft.memberSearch || ''),
      savedAt: Number(draft.savedAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeBroadcastDraft(draft: Omit<BroadcastDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    if (
      isBroadcastDraftEmpty(draft.subject, draft.html) &&
      draft.fontId === 'default' &&
      !draft.testEmail.trim() &&
      draft.selected.length === 0 &&
      draft.selectedWorkgroups.length === 0
    ) {
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
