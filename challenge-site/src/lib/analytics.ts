/**
 * Lightweight funnel analytics. No vendor is wired yet; events are emitted as
 * CustomEvents and pushed to window.dataLayer when present so a future tag
 * manager / analytics script can subscribe without changing call sites.
 */

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(name: string, payload: AnalyticsPayload = {}): void {
  if (typeof window === 'undefined') return;

  const detail = { event: name, ...payload, ts: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent('dp-analytics', { detail }));
  } catch {
    /* ignore */
  }

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
  } catch {
    /* ignore */
  }
}
