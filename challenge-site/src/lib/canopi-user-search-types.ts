export type CanopiSearchUser = {
  id: string;
  handle: string;
  name: string | null;
  displayName: string;
  email: string | null;
};

export type CanopiShareRecipient = {
  user: CanopiSearchUser | null;
  emailHint: string;
};

export function canopiUserDisplayName(user: CanopiSearchUser): string {
  return user.displayName || user.name || user.handle || user.email || user.id;
}

export function recipientEmailFromShareSelection(selection: CanopiShareRecipient): string {
  const picked = selection.user?.email?.trim();
  if (picked && picked.includes('@')) return picked;
  return selection.emailHint.trim();
}

/** Hermes verifierId: email when AppUser has one, else AppUser UUID. */
export function recipientVerifierIdFromShareSelection(
  selection: CanopiShareRecipient,
): string | undefined {
  if (selection.user) {
    const email = selection.user.email?.trim().toLowerCase();
    if (email && email.includes('@')) return email;
    return selection.user.id;
  }
  const hint = selection.emailHint.trim().toLowerCase();
  if (hint.includes('@')) return hint;
  return undefined;
}

export function recipientLabelFromShareSelection(selection: CanopiShareRecipient): string {
  if (selection.user) {
    return canopiUserDisplayName(selection.user);
  }
  return selection.emailHint.trim();
}
