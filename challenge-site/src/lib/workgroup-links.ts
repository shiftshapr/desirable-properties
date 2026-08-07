import { govhubUrl } from '@/lib/govhub';

/** Env-only check — safe to import from isomorphic code (no request headers). */
export function isWorkgroupCollabEnabledFromEnv(): boolean {
  const flag = process.env.DP_COLLAB_ENABLED;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  const base = process.env.DP_PUBLIC_BASE || '';
  return base.includes('staging.desirableproperties.org');
}

export function workgroupGovHubHref(slug: string, action?: 'join' | 'nominate'): string {
  const base = govhubUrl(`/workgroups/${encodeURIComponent(slug)}/`);
  if (action === 'join') return `${base}?action=join`;
  if (action === 'nominate') return `${base}?action=nominate`;
  return base;
}

/** Collab page when env enables it; otherwise Gov Hub workgroup page. */
export function workgroupPrimaryHref(slug: string): string {
  if (isWorkgroupCollabEnabledFromEnv()) {
    return `/workgroups/${encodeURIComponent(slug)}`;
  }
  return workgroupGovHubHref(slug);
}

export function workgroupActivityHref(slug: string): string {
  return workgroupPrimaryHref(slug);
}
