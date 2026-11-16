/**
 * Occurrence pages that mount the workspace (ListeningWorkspaceMount). /listening/<slug> redirects to an
 * occurrence's canonical page only when that page is listed here, so the durable URL stays the one page.
 */
export const MOUNTED_CANONICAL_PATHS: ReadonlySet<string> = new Set<string>(['/events/meta-governance-2026-11-16']);
