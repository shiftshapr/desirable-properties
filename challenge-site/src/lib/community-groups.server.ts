import 'server-only';
import { readSession } from '@/lib/auth-session';

/**
 * The Desirable Properties WhatsApp group and the Meta-Layer Guild Signal group.
 *
 * The invite links are private to signed-in people: they are never in the repo (it is public), never in public HTML
 * and never in metadata. They come from server-only env vars set on each box (challenge-site/.env.local, read by
 * `next start`):
 *
 *   DP_GROUP_WHATSAPP_URL   https://chat.whatsapp.com/...
 *   DP_GROUP_SIGNAL_URL     https://signal.group/#...
 *
 * Read them only through communityGroupsForViewer(), which checks the session first. An unset or malformed value
 * leaves that group out; with neither set, nothing about the groups is shown anywhere.
 */

export type CommunityGroup = {
  key: 'whatsapp' | 'signal';
  label: string;
  name: string;
  url: string;
};

const GROUPS: Array<{ key: CommunityGroup['key']; env: string; host: string; label: string; name: string }> = [
  {
    key: 'whatsapp',
    env: 'DP_GROUP_WHATSAPP_URL',
    host: 'chat.whatsapp.com',
    label: 'WhatsApp',
    name: 'Desirable Properties WhatsApp group',
  },
  {
    key: 'signal',
    env: 'DP_GROUP_SIGNAL_URL',
    host: 'signal.group',
    label: 'Signal',
    name: 'Meta-Layer Guild Signal group',
  },
];

function configuredUrl(env: string, host: string): string | null {
  const raw = (process.env[env] || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === host ? url.toString() : null;
  } catch {
    return null;
  }
}

function configuredGroups(): CommunityGroup[] {
  const out: CommunityGroup[] = [];
  for (const g of GROUPS) {
    const url = configuredUrl(g.env, g.host);
    if (url) out.push({ key: g.key, label: g.label, name: g.name, url });
  }
  return out;
}

export type CommunityGroupsView =
  | { state: 'off' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; groups: CommunityGroup[] };

/** What this request may see. Links are returned only when the request carries a valid session. */
export async function communityGroupsForViewer(): Promise<CommunityGroupsView> {
  if (configuredGroups().length === 0) return { state: 'off' };
  const session = await readSession();
  if (!session) return { state: 'signed-out' };
  return { state: 'signed-in', groups: configuredGroups() };
}
