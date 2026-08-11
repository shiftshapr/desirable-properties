const SESSION_PREFIX = 'dp-compose-session:';
const PEARL_PREFIX = 'dp-compose-pearl:';

export type SessionComposeDraft = {
  attended: boolean;
  answers: Record<string, { valueText?: string | null; valueBool?: boolean | null }>;
  aiAssistUsed: boolean;
  savedAt: number;
};

export type PearlComposeDraft = {
  patchIdea: string;
  socializeUrl: string;
  socializeNote: string;
  feedbackSummary: string;
  feedbackFrom: string;
  reflection: string;
  savedAt: number;
};

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function sessionDraftKey(seriesSlug: string, sessionNumber: number): string {
  return `${SESSION_PREFIX}${seriesSlug}:${sessionNumber}`;
}

export function pearlDraftKey(seriesSlug: string): string {
  return `${PEARL_PREFIX}${seriesSlug}`;
}

function sessionDraftHasContent(draft: SessionComposeDraft): boolean {
  if (draft.attended) return true;
  if (draft.aiAssistUsed) return true;
  return Object.values(draft.answers).some((answer) => {
    if (answer.valueBool) return true;
    return Boolean(String(answer.valueText || '').trim());
  });
}

function pearlDraftHasContent(draft: PearlComposeDraft): boolean {
  return Boolean(
    draft.patchIdea.trim()
      || draft.socializeUrl.trim()
      || draft.socializeNote.trim()
      || draft.feedbackSummary.trim()
      || draft.feedbackFrom.trim()
      || draft.reflection.trim(),
  );
}

export function loadSessionDraft(
  seriesSlug: string,
  sessionNumber: number,
): SessionComposeDraft | null {
  const draft = readJson<SessionComposeDraft>(sessionDraftKey(seriesSlug, sessionNumber));
  if (!draft || !sessionDraftHasContent(draft)) return null;
  return {
    attended: Boolean(draft.attended),
    answers: draft.answers && typeof draft.answers === 'object' ? draft.answers : {},
    aiAssistUsed: Boolean(draft.aiAssistUsed),
    savedAt: Number(draft.savedAt) || Date.now(),
  };
}

export function saveSessionDraft(
  seriesSlug: string,
  sessionNumber: number,
  draft: Omit<SessionComposeDraft, 'savedAt'>,
): void {
  const key = sessionDraftKey(seriesSlug, sessionNumber);
  const next: SessionComposeDraft = { ...draft, savedAt: Date.now() };
  if (!sessionDraftHasContent(next)) {
    removeKey(key);
    return;
  }
  writeJson(key, next);
}

export function clearSessionDraft(seriesSlug: string, sessionNumber: number): void {
  removeKey(sessionDraftKey(seriesSlug, sessionNumber));
}

export function loadPearlDraft(seriesSlug: string): PearlComposeDraft | null {
  const draft = readJson<PearlComposeDraft>(pearlDraftKey(seriesSlug));
  if (!draft || !pearlDraftHasContent(draft)) return null;
  return {
    patchIdea: String(draft.patchIdea || ''),
    socializeUrl: String(draft.socializeUrl || ''),
    socializeNote: String(draft.socializeNote || ''),
    feedbackSummary: String(draft.feedbackSummary || ''),
    feedbackFrom: String(draft.feedbackFrom || ''),
    reflection: String(draft.reflection || ''),
    savedAt: Number(draft.savedAt) || Date.now(),
  };
}

export function savePearlDraft(
  seriesSlug: string,
  draft: Omit<PearlComposeDraft, 'savedAt'>,
): void {
  const key = pearlDraftKey(seriesSlug);
  const next: PearlComposeDraft = { ...draft, savedAt: Date.now() };
  if (!pearlDraftHasContent(next)) {
    removeKey(key);
    return;
  }
  writeJson(key, next);
}

export function clearPearlDraft(seriesSlug: string): void {
  removeKey(pearlDraftKey(seriesSlug));
}
