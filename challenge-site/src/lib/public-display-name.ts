/** True when `raw` looks like an email address (local @ domain.tld). */
export function isEmailLike(raw: string | null | undefined): boolean {
  const value = String(raw ?? '').trim();
  if (!value.includes('@')) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at >= value.length - 1) return false;
  const domain = value.slice(at + 1);
  if (!domain || domain.includes('@')) return false;
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function labelFromEmailLocalPart(email: string): string {
  const local = email.split('@')[0] ?? '';
  const normalized = local.replace(/[._-]+/g, ' ').trim();
  if (!normalized || /^[\d]+$/.test(normalized)) return 'Member';
  return titleCaseWords(normalized);
}

export type PublicDisplayNameOpts = {
  /** Prefer this when the primary field is email-like or empty. */
  alt?: string | null;
  fallback?: string;
};

/**
 * Public-safe person label. Never returns a raw email; real names pass through.
 */
export function publicDisplayName(
  raw: string | null | undefined,
  opts?: PublicDisplayNameOpts,
): string {
  const fallback = opts?.fallback ?? 'Member';
  const primary = String(raw ?? '').trim();
  const alt = String(opts?.alt ?? '').trim();

  if (primary && !isEmailLike(primary)) return primary;
  if (alt && !isEmailLike(alt)) return alt;
  if (primary && isEmailLike(primary)) return labelFromEmailLocalPart(primary);
  if (alt && isEmailLike(alt)) return labelFromEmailLocalPart(alt);
  return fallback;
}
