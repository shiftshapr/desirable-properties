export type CanopiSearchUser = {
  id: string;
  handle: string;
  name: string | null;
  displayName: string;
  email: string | null;
};

export type CanopiShareRecipient = {
  users: CanopiSearchUser[];
  emailHint: string;
};

export function canopiUserDisplayName(user: CanopiSearchUser): string {
  return user.displayName || user.name || user.handle || user.email || user.id;
}

function safeTrim(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

export function canopiUserVerifierId(user: CanopiSearchUser): string {
  const email = safeTrim(user.email).toLowerCase();
  if (email && email.includes('@')) return email;
  return user.id;
}

export function recipientEmailFromShareSelection(selection: CanopiShareRecipient): string {
  if (selection.users.length === 1) {
    const picked = safeTrim(selection.users[0]?.email);
    if (picked && picked.includes('@')) return picked;
  }
  return safeTrim(selection.emailHint);
}

/** Hermes verifierId: email when AppUser has one, else AppUser UUID. */
export function recipientVerifierIdFromShareSelection(
  selection: CanopiShareRecipient,
): string | undefined {
  if (selection.users.length === 1) {
    return canopiUserVerifierId(selection.users[0]);
  }
  const hint = safeTrim(selection.emailHint).toLowerCase();
  if (hint.includes('@')) return hint;
  return undefined;
}

export function recipientsPayloadFromShareSelection(
  selection: CanopiShareRecipient,
): Array<{ recipientEmail?: string; recipientVerifierId: string }> {
  return selection.users.map((user) => {
    const email = safeTrim(user.email);
    return {
      recipientEmail: email.includes('@') ? email : undefined,
      recipientVerifierId: canopiUserVerifierId(user),
    };
  });
}

export function recipientLabelsFromShareSelection(selection: CanopiShareRecipient): string[] {
  if (selection.users.length > 0) {
    return selection.users.map((user) => canopiUserDisplayName(user));
  }
  const hint = safeTrim(selection.emailHint);
  return hint ? [hint] : [];
}

export function recipientLabelFromShareSelection(selection: CanopiShareRecipient): string {
  const labels = recipientLabelsFromShareSelection(selection);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}
