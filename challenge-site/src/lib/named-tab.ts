/** Reuse one browser tab per destination instead of spawning endless _blank tabs. */
export const NAMED_TAB_TARGETS = {
  DEEPI_AGENT: 'dp-deepi-agent',
  DP_BOOK: 'dp-layered-web-book',
} as const;

export type NamedTabTarget = (typeof NAMED_TAB_TARGETS)[keyof typeof NAMED_TAB_TARGETS];

const DP_SITE_HOSTS = new Set([
  'desirableproperties.org',
  'www.desirableproperties.org',
  'staging.desirableproperties.org',
  'localhost',
  '127.0.0.1',
]);

const DP_BOOK_HOSTS = new Set([
  'book.desirableproperties.org',
  'staging.book.desirableproperties.org',
]);

export function resolveNamedTabTarget(href: string): NamedTabTarget | null {
  const raw = String(href || '').trim();
  if (!raw) return null;

  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://')
      ? new URL(raw)
      : new URL(raw, 'https://desirableproperties.org');
    const host = url.hostname.toLowerCase();

    if (DP_BOOK_HOSTS.has(host)) {
      return NAMED_TAB_TARGETS.DP_BOOK;
    }

    if (
      DP_SITE_HOSTS.has(host) &&
      (url.pathname === '/agent' || url.pathname.startsWith('/agent/'))
    ) {
      return NAMED_TAB_TARGETS.DEEPI_AGENT;
    }
  } catch {
    return null;
  }

  return null;
}

/** Open or focus a named tab. Do not pass noopener/noreferrer features (breaks reuse). */
export function openNamedTab(url: string, tabName: NamedTabTarget): void {
  if (typeof window === 'undefined') return;
  const win = window.open(url, tabName);
  win?.focus();
}
