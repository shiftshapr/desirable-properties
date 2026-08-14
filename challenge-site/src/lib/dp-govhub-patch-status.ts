import dpInscriptions from '@/data/dp-inscriptions.json';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { govhubInternalApiSecret } from '@/lib/support-hermes-auth';

export type GovHubPatchStatusEntry = {
  patchCount: number;
  mlNumbers: string[];
};

export type BroadcastPatchStatusByUser = Map<
  string,
  {
    patchCount: number;
    patchDpIds: string[];
  }
>;

const mlToDpId = new Map<string, string>();

for (const [dpId, entry] of Object.entries(dpMlDraftMap.map || {})) {
  const ml = String((entry as { mlNumber?: string }).mlNumber || '').trim().toUpperCase();
  if (ml) mlToDpId.set(ml, dpId.toUpperCase());
}

for (const [dpId, draftOnly] of Object.entries(dpInscriptions.draft_only || {})) {
  const ml = String((draftOnly as { ml_number?: string }).ml_number || '').trim().toUpperCase();
  if (ml) mlToDpId.set(ml, dpId.toUpperCase());
}

export function dpIdFromMlNumber(mlNumber: string | null | undefined): string | null {
  const ml = String(mlNumber || '').trim().toUpperCase();
  if (!ml) return null;
  return mlToDpId.get(ml) || null;
}

export function mapPatchStatusUsers(
  users: Record<string, GovHubPatchStatusEntry> | null | undefined,
): BroadcastPatchStatusByUser {
  const out: BroadcastPatchStatusByUser = new Map();
  if (!users || typeof users !== 'object') return out;

  for (const [userId, raw] of Object.entries(users)) {
    const patchCount = Number(raw?.patchCount) || 0;
    const mlNumbers = Array.isArray(raw?.mlNumbers) ? raw.mlNumbers : [];
    const patchDpIds = [
      ...new Set(
        mlNumbers
          .map((ml) => dpIdFromMlNumber(ml))
          .filter((dpId): dpId is string => Boolean(dpId)),
      ),
    ];
    out.set(userId, { patchCount, patchDpIds });
  }
  return out;
}

export async function fetchGovHubPatchStatus(): Promise<BroadcastPatchStatusByUser> {
  const secret = govhubInternalApiSecret();
  if (!secret) return new Map();

  try {
    const base = GOVHUB_PUBLIC_BASE_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/api/internal/dp/broadcast-patch-status`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    if (!data?.ok) return new Map();
    return mapPatchStatusUsers(data.users as Record<string, GovHubPatchStatusEntry>);
  } catch {
    return new Map();
  }
}
