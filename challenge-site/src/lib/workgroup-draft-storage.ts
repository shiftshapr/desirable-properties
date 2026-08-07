const CHAT_PREFIX = 'dp-wg-chat-draft:';
const INVITE_PREFIX = 'dp-wg-invite:';

export type WorkgroupInviteDraft = {
  name: string;
  email: string;
  linkedinUrl: string;
  previousInteraction: string;
  extraLinks: string;
  tone: string;
  length: string;
  draft: string;
  step: 'research' | 'disambiguate' | 'draft' | 'done';
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

export function chatDraftKey(slug: string): string {
  return `${CHAT_PREFIX}${slug}`;
}

export function inviteDraftKey(slug: string): string {
  return `${INVITE_PREFIX}${slug}`;
}

export function loadChatDraft(slug: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(chatDraftKey(slug)) || '';
  } catch {
    return '';
  }
}

export function saveChatDraft(slug: string, body: string): void {
  if (typeof window === 'undefined') return;
  const key = chatDraftKey(slug);
  try {
    if (body.trim()) {
      window.localStorage.setItem(key, body);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function clearChatDraft(slug: string): void {
  removeKey(chatDraftKey(slug));
}

export function loadInviteDraft(slug: string): Partial<WorkgroupInviteDraft> | null {
  return readJson<WorkgroupInviteDraft>(inviteDraftKey(slug));
}

export function saveInviteDraft(slug: string, draft: WorkgroupInviteDraft): void {
  const hasContent =
    draft.name.trim()
    || draft.email.trim()
    || draft.linkedinUrl.trim()
    || draft.previousInteraction.trim()
    || draft.extraLinks.trim()
    || draft.draft.trim();
  if (!hasContent) {
    clearInviteDraft(slug);
    return;
  }
  writeJson(inviteDraftKey(slug), draft);
}

export function clearInviteDraft(slug: string): void {
  removeKey(inviteDraftKey(slug));
}
