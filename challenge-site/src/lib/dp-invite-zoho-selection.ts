const SELECTION_PREFIX = 'dp-invite-zoho-selection:';

export type ZohoInviteSelection = {
  emails: string[];
  savedAt: number;
};

function selectionKey(adminEmail: string): string {
  return `${SELECTION_PREFIX}${adminEmail.trim().toLowerCase()}`;
}

function normalizeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

function loadZohoInviteSelectionFromLocalStorage(adminEmail: string): string[] {
  if (typeof window === 'undefined' || !adminEmail.trim()) return [];
  try {
    const raw = window.localStorage.getItem(selectionKey(adminEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ZohoInviteSelection>;
    return normalizeEmails(Array.isArray(parsed.emails) ? parsed.emails.map(String) : []);
  } catch {
    return [];
  }
}

function clearZohoInviteSelectionLocalStorage(adminEmail: string): void {
  if (typeof window === 'undefined' || !adminEmail.trim()) return;
  try {
    window.localStorage.removeItem(selectionKey(adminEmail));
  } catch {
    /* ignore */
  }
}

async function parseSelectionResponse(res: Response): Promise<string[]> {
  const data = (await res.json().catch(() => ({}))) as {
    emails?: string[];
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    const err =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return normalizeEmails(Array.isArray(data.emails) ? data.emails.map(String) : []);
}

export async function fetchZohoInviteSelection(adminEmail: string): Promise<string[]> {
  if (!adminEmail.trim()) return [];
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseSelectionResponse(res);
}

export async function saveZohoInviteSelection(adminEmail: string, emails: string[]): Promise<void> {
  if (!adminEmail.trim()) return;
  const normalized = normalizeEmails(emails);
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails: normalized }),
  });
  await parseSelectionResponse(res);
}

export async function removeZohoInviteSelectionEmails(
  adminEmail: string,
  emails: string[],
): Promise<void> {
  if (!adminEmail.trim() || !emails.length) return;
  const remove = normalizeEmails(emails);
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remove: remove }),
  });
  await parseSelectionResponse(res);
}

export async function migrateZohoInviteSelectionFromLocalStorage(adminEmail: string): Promise<void> {
  const local = loadZohoInviteSelectionFromLocalStorage(adminEmail);
  if (!local.length) return;
  const server = await fetchZohoInviteSelection(adminEmail);
  if (server.length) {
    clearZohoInviteSelectionLocalStorage(adminEmail);
    return;
  }
  await saveZohoInviteSelection(adminEmail, local);
  clearZohoInviteSelectionLocalStorage(adminEmail);
}

export function zohoIdsForEmails(
  contacts: Array<{ id: string; email: string }>,
  emails: string[],
): string[] {
  const wanted = new Set(normalizeEmails(emails));
  return contacts.filter((row) => wanted.has(row.email.trim().toLowerCase())).map((row) => row.id);
}

export function zohoEmailsForIds(
  contacts: Array<{ id: string; email: string }>,
  ids: string[],
): string[] {
  const wanted = new Set(ids);
  return normalizeEmails(
    contacts.filter((row) => wanted.has(row.id)).map((row) => row.email),
  );
}
