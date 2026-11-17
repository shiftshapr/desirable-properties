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

// ---------------------------------------------------------------------------
// Images (owner, 2026-11-17): up to three, JPEG, PNG or WebP, 5 MB each. Gov Hub checks the bytes
// again, strips metadata (EXIF, GPS) and re-encodes; only reviewers can open them.

export const ACK_IMAGE_MAX = 3;
export const ACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ACK_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** The file input's accept list. Naming these types makes iPhones hand over HEIC photos as JPEG. */
export const ACK_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

export const ACK_IMAGE_MESSAGES = {
  type: 'Please attach a JPEG, PNG or WebP image.',
  heic: 'This looks like an HEIC photo, which we cannot read. Please attach it as JPEG or PNG (on an iPhone, choose the photo from the library on this page and it is converted; or set Camera > Formats to Most Compatible).',
  size: 'Each image must be 5 MB or smaller.',
  count: `You can attach up to ${ACK_IMAGE_MAX} images.`,
  empty: 'This file is empty.',
};

/** Why a chosen file cannot be attached (by its name, type and size), or null. The browser's check only. */
export function checkAckImage(file: { name: string; type: string; size: number }): string | null {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (/\.(heic|heif)$/.test(name) || type === 'image/heic' || type === 'image/heif') return ACK_IMAGE_MESSAGES.heic;
  const okType = (ACK_IMAGE_TYPES as readonly string[]).includes(type) || (!type && /\.(jpe?g|png|webp)$/.test(name));
  if (!okType) return ACK_IMAGE_MESSAGES.type;
  if (!file.size) return ACK_IMAGE_MESSAGES.empty;
  if (file.size > ACK_IMAGE_MAX_BYTES) return ACK_IMAGE_MESSAGES.size;
  return null;
}

/** The image type from a file's first bytes: a content type, 'heic', or null. */
export function sniffAckImage(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && ascii(4, 8) === 'ftyp'
    && ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'avif'].includes(ascii(8, 12))) return 'heic';
  return null;
}

// ---------------------------------------------------------------------------
// Seeing your own requests (owner, 2026-11-17): see ack-request-access.ts (server).

/** A view token as Gov Hub issues it (URL-safe base64); anything else is ignored. */
export function cleanViewToken(value: string | undefined | null): string | null {
  const v = String(value || '').trim();
  return /^[A-Za-z0-9_-]{20,200}$/.test(v) ? v : null;
}

/** Gov Hub ids are UUIDs; anything else is refused before an upstream path is built. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/** The view token from a Cookie header, or null. */
export function viewTokenFromCookieHeader(header: string | null | undefined, name: string): string | null {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return cleanViewToken(decodeURIComponent(part.slice(i + 1).trim()));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** The one-time link token from the emailed link's #fragment ("#token=..."), or null. */
export function linkTokenFromHash(hash: string | null | undefined): string | null {
  const m = /(?:^#|&)token=([^&]+)/.exec(String(hash || ''));
  if (!m) return null;
  try {
    return cleanViewToken(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/** "ack-q4r4zz", "ACK Q4R4ZZ" or "Q4R4ZZ" -> "ACK-Q4R4ZZ"; null if it cannot be a code. */
export function normalizeAckReference(value: string): string | null {
  const raw = String(value || '').replace(/\s+/g, '').toUpperCase();
  for (const t of [raw.replace(/^ACK-?/, ''), raw]) {
    if (/^[2-9A-HJKMNP-TV-Z]{6}$/.test(t)) return `ACK-${t}`;
  }
  return null;
}

/** One of the viewer's own requests, as Gov Hub returns it (GET .../requests/mine). */
export type AckRequestView = {
  id: string;
  reference: string;
  kind: string;
  kind_label: string;
  requested_name: string | null;
  current_name: string | null;
  affiliation: string | null;
  target_list: string | null;
  target_list_label: string | null;
  call_for_input_label: string | null;
  role: string | null;
  contribution: string | null;
  contribution_url: string | null;
  note: string | null;
  status: string;
  status_label: string;
  created_at: string | null;
  status_changed_at: string | null;
  attachments: { id: string; width: number | null; height: number | null; size: number; has_thumb: boolean }[];
};

/**
 * What each review status means, said plainly. These are the steering committee's decisions on an
 * Acknowledgements request, not support ticket states.
 */
export const ACK_STATUS_INFO: Record<string, { label: string; meaning: string }> = {
  new: { label: 'New', meaning: 'Not reviewed yet. The steering committee reads every request.' },
  accepted: {
    label: 'Accepted',
    meaning: 'The steering committee agreed. The change is made in the next version of the book (Version 1.1).',
  },
  declined: {
    label: 'Declined',
    meaning: 'The steering committee did not make this change. If we need to explain, we write to the email you gave.',
  },
  done: { label: 'Done', meaning: 'The change is in the Acknowledgements for the next version of the book.' },
};

export function ackStatusInfo(status: string, fallbackLabel?: string) {
  return ACK_STATUS_INFO[status] || { label: fallbackLabel || status, meaning: '' };
}

/** One line saying what the person asked for. */
export function ackRequestSummary(r: Pick<AckRequestView, 'kind' | 'requested_name' | 'current_name' | 'affiliation' | 'target_list_label' | 'note'>): string {
  const want = r.requested_name || r.current_name || 'your entry';
  const q = (s: string) => `“${s}”`;
  switch (r.kind) {
    case 'add':
      return `Add ${q(want)} to the Acknowledgements`;
    case 'correct_name':
      return r.current_name && r.requested_name
        ? `Change ${q(r.current_name)} to ${q(r.requested_name)}`
        : `Correct the name ${q(want)}`;
    case 'affiliation':
      return r.affiliation ? `Show ${q(want)} with the affiliation ${q(r.affiliation)}` : `Change the affiliation for ${q(want)}`;
    case 'move':
      return `Move ${q(r.current_name || want)} to ${r.target_list_label || 'a different list'}`;
    case 'remove':
      return `Remove ${q(r.current_name || want)}`;
    default: {
      const note = (r.note || '').replace(/\s+/g, ' ').trim();
      return note ? (note.length > 140 ? `${note.slice(0, 139)}…` : note) : 'Something else';
    }
  }
}
