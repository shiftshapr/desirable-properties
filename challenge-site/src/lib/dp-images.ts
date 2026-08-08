/** Optimized DP artwork from agent-drop final-dp-set (WebP). */

export function normalizeDpNumber(dpId: string | null | undefined): number | null {
  if (!dpId) return null;
  const m = String(dpId).trim().match(/^DP\s*0*(\d+)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 23 ? n : null;
}

/** Full illustration for DP / workgroup hero (~1200px). */
export function dpFullImageSrc(dpId: string | null | undefined): string | null {
  const n = normalizeDpNumber(dpId);
  return n ? `/images/dps/full/DP${n}.webp` : null;
}

/** Compact art for cards / grids (~480px). */
export function dpCardImageSrc(dpId: string | null | undefined): string | null {
  const n = normalizeDpNumber(dpId);
  return n ? `/images/dps/card/DP${n}.webp` : null;
}

/** Badge-sized center art (~300px). */
export function dpBadgeImageSrc(dpId: string | null | undefined): string | null {
  const n = normalizeDpNumber(dpId);
  return n ? `/images/dps/badge/dp${String(n).padStart(2, '0')}.webp` : null;
}

export function dpImageAlt(dpId: string, name?: string | null): string {
  const label = name?.trim() ? `${dpId}: ${name.trim()}` : dpId;
  return `Illustration for Desirable Property ${label}`;
}
