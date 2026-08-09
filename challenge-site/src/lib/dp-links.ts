/** Default back target when no valid `from` query param is present. */
export const DP_BACK_DEFAULT_PATH = '/#dps';

/**
 * Build href to a DP detail page, optionally recording where the user came from.
 */
export function dpDetailHref(dpId: string, fromPath?: string): string {
  const id = dpId.toLowerCase();
  const base = `/dp/${id}`;
  if (!fromPath) return base;

  const safeFrom = sanitizeRelativePath(fromPath);
  if (!safeFrom) return base;

  return `${base}?from=${encodeURIComponent(safeFrom)}`;
}

/**
 * Validate a `from` query param for use as a back-link target.
 * Only same-origin relative paths starting with `/` (not `//`).
 */
export function sanitizeRelativePath(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let path = raw.trim();
  if (!path) return null;

  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }

  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  if (path.includes('://')) return null;
  if (/[\x00-\x1f\x7f]/.test(path)) return null;

  return path;
}

/** Resolve the back-link href from an optional `from` search param. */
export function resolveBackPath(from: string | undefined | null): string {
  return sanitizeRelativePath(from) ?? DP_BACK_DEFAULT_PATH;
}
