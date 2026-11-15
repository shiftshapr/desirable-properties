/**
 * Acknowledgements adjustment requests: the choices and the checks the form makes before it
 * sends. Gov Hub (routes/dp_ack_requests.py) stores the request and checks everything again; this
 * file only keeps the form helpful. No imports, so the node tests can load it directly.
 */

export type AckRequestKind = 'add' | 'correct_name' | 'affiliation' | 'move' | 'remove' | 'other';

export const ACK_REQUEST_KINDS: { value: AckRequestKind; label: string; hint: string }[] = [
  { value: 'add', label: 'Add me', hint: 'You contributed and are not listed.' },
  { value: 'correct_name', label: 'Correct how my name appears', hint: 'Spelling, a fuller name, or a different form of it.' },
  { value: 'affiliation', label: 'Change or add an affiliation', hint: 'An organisation to show with your name.' },
  { value: 'move', label: 'Move me to a different list', hint: 'For example from Contributors to Editors.' },
  { value: 'remove', label: 'Remove me', hint: 'Take my name off the Acknowledgements.' },
  { value: 'other', label: 'Something else', hint: 'Tell us in the note.' },
];

export const ACK_CALLS: { value: string; label: string }[] = [
  { value: 'first_2024', label: 'First Call for Input (2024)' },
  { value: 'second_2025', label: 'Second Call for Input (2025)' },
  { value: 'both', label: 'Both Calls for Input (2024 and 2025)' },
  { value: 'challenge_2026', label: 'Desirable Properties Challenge on Gov Hub (2026)' },
  { value: 'none', label: 'None of these, or not sure' },
];

export const ACK_LISTS: { value: string; label: string }[] = [
  { value: 'contributors', label: 'Contributors' },
  { value: 'editors', label: 'Editors (co-editors and steering committee)' },
  { value: 'other', label: 'Somewhere else (explain in the note)' },
];

export const ACK_NAME_MAX = 80;
export const ACK_TEXT_MAX = 2000;

export type AckRequestForm = {
  kind: AckRequestKind | '';
  requestedName: string;
  currentName: string;
  callForInput: string;
  contribution: string;
  contributionUrl: string;
  role: string;
  affiliation: string;
  targetList: string;
  email: string;
  note: string;
  /** Honeypot: hidden from people, filled by scripts. */
  website: string;
};

export const EMPTY_ACK_REQUEST: AckRequestForm = {
  kind: '',
  requestedName: '',
  currentName: '',
  callForInput: '',
  contribution: '',
  contributionUrl: '',
  role: '',
  affiliation: '',
  targetList: '',
  email: '',
  note: '',
  website: '',
};

/** Which optional groups of fields the form shows for a kind. */
export function ackFieldsFor(kind: AckRequestForm['kind']) {
  return {
    requestedName: kind !== 'remove',
    currentName: kind !== 'add',
    contribution: kind === 'add' || kind === 'move' || kind === 'other' || kind === 'correct_name',
    affiliation: kind === 'affiliation',
    targetList: kind === 'move',
  };
}

/** First problem a person can fix before sending, keyed by field; {} when it can go. */
export function checkAckRequest(f: AckRequestForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const has = (s: string) => s.trim().length > 0;
  if (!f.kind) errors.kind = 'Please choose what you would like us to change.';
  if (f.kind === 'remove') {
    if (!has(f.currentName) && !has(f.requestedName)) {
      errors.currentName = 'Please give your name as it appears now, so we know which entry to remove.';
    }
  } else if (f.kind && !has(f.requestedName)) {
    errors.requestedName = 'Please give your name as it should appear.';
  }
  if (f.kind === 'correct_name' && !has(f.currentName)) errors.currentName = 'Please give the name as it appears now.';
  if (f.kind === 'affiliation' && !has(f.affiliation)) errors.affiliation = 'Please give the affiliation as it should appear.';
  if (f.kind === 'move' && !f.targetList) errors.targetList = 'Please choose the list you should be in.';
  if (f.kind === 'add' && !has(f.contribution) && !has(f.contributionUrl) && !f.callForInput && !has(f.role)) {
    errors.contribution = 'Please tell us what you contributed and where.';
  }
  if (f.kind === 'other' && !has(f.note)) errors.note = 'Please tell us what you would like changed.';
  for (const key of ['requestedName', 'currentName'] as const) {
    if (f[key].trim().length > ACK_NAME_MAX) errors[key] = `Please keep the name to ${ACK_NAME_MAX} characters or fewer.`;
  }
  if (has(f.contributionUrl) && !/^https?:\/\/[^/\s]+\.[^/\s]+\S*$/i.test(f.contributionUrl.trim())) {
    errors.contributionUrl = 'Please give a full link starting with https://, or leave it empty.';
  }
  const email = f.email.trim();
  if (!email) errors.email = 'Please give an email address so we can reach you about this request.';
  else if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) errors.email = 'Please check the email address.';
  return errors;
}

/** The JSON Gov Hub expects (snake_case). Fields hidden for the chosen kind are left out. */
export function ackRequestPayload(f: AckRequestForm, elapsedMs: number) {
  const show = ackFieldsFor(f.kind);
  const t = (s: string) => s.trim();
  return {
    kind: f.kind,
    requested_name: show.requestedName ? t(f.requestedName) : '',
    current_name: show.currentName ? t(f.currentName) : '',
    call_for_input: show.contribution ? f.callForInput : '',
    contribution: show.contribution ? t(f.contribution) : '',
    contribution_url: show.contribution ? t(f.contributionUrl) : '',
    role: show.contribution ? t(f.role) : '',
    affiliation: show.affiliation ? t(f.affiliation) : '',
    target_list: show.targetList ? f.targetList : '',
    email: t(f.email),
    note: t(f.note),
    website: f.website,
    elapsed_ms: Math.max(0, Math.round(elapsedMs)),
  };
}

/** The browser's address as nginx saw it (X-Real-IP, else the last X-Forwarded-For hop). */
export function clientIpFromHeaders(h: { get(name: string): string | null }): string {
  const real = (h.get('x-real-ip') || '').trim();
  if (real) return real.slice(0, 64);
  const hops = (h.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return (hops[hops.length - 1] || '').slice(0, 64);
}
