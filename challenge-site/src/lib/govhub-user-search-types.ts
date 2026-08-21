export type GovHubSearchUser = {
  id: string;
  username: string;
  handle?: string | null;
  display_name: string;
  email: string;
};

export type GovHubShareRecipient = {
  user: GovHubSearchUser | null;
  emailHint: string;
};

export function recipientEmailFromShareSelection(selection: GovHubShareRecipient): string {
  const picked = selection.user?.email?.trim();
  if (picked) return picked;
  return selection.emailHint.trim();
}

export function recipientVerifierIdFromShareSelection(selection: GovHubShareRecipient): string | undefined {
  const email = recipientEmailFromShareSelection(selection);
  if (!email || !email.includes('@')) return undefined;
  return email;
}

export function recipientLabelFromShareSelection(selection: GovHubShareRecipient): string {
  if (selection.user) {
    const handle = selection.user.handle || selection.user.username;
    return selection.user.display_name || handle || selection.user.email;
  }
  return selection.emailHint.trim();
}
