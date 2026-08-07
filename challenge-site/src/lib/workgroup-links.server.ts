import { headers } from 'next/headers';
import { isWorkgroupCollabEnabledFromEnv } from '@/lib/workgroup-links';

/** Request-aware collab gate for server components (host + PM2 env). */
export async function isWorkgroupCollabEnabled(): Promise<boolean> {
  if (isWorkgroupCollabEnabledFromEnv()) return true;
  if (process.env.DP_COLLAB_ENABLED === 'false') return false;
  try {
    const host = ((await headers()).get('host') || '').toLowerCase();
    return host.startsWith('staging.desirableproperties.org');
  } catch {
    return false;
  }
}
