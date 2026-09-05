import type { AstraRevocationSnapshot } from '@/lib/astra-revocation-store';

export async function fetchAstraRevocationsClient(
  workgroupId: string,
  changeIds: string[],
): Promise<AstraRevocationSnapshot> {
  const ids = [...new Set(changeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return { revoked: {} };

  const params = new URLSearchParams({ changeIds: ids.join(',') });
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/astra/revocations?${params.toString()}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error('Failed to load revocations');
  }
  return res.json() as Promise<AstraRevocationSnapshot>;
}

export async function setAstraRevocationClient(
  workgroupId: string,
  changeId: string,
  action: 'revoke' | 'restore',
): Promise<AstraRevocationSnapshot> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/astra/revocations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId, action }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as AstraRevocationSnapshot & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to update revocation');
  }
  return payload;
}
