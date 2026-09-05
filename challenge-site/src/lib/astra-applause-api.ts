import type { AstraApplauseSnapshot } from '@/lib/astra-applause-constants';

export async function fetchAstraApplauseClient(
  workgroupId: string,
  changeIds: string[],
): Promise<AstraApplauseSnapshot> {
  const ids = [...new Set(changeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return { totals: {}, mine: {} };

  const params = new URLSearchParams({ changeIds: ids.join(',') });
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/astra/applause?${params.toString()}`,
    { cache: 'no-store', credentials: 'include' },
  );
  if (!res.ok) {
    throw new Error('Failed to load applause');
  }
  return res.json() as Promise<AstraApplauseSnapshot>;
}

export async function applaudAstraChangeClient(
  workgroupId: string,
  changeId: string,
): Promise<{
  ok: boolean;
  total: number;
  mine: number;
  reason?: string;
}> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/astra/applause`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId }),
      credentials: 'include',
    },
  );
  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    total?: number;
    mine?: number;
    reason?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to applaud');
  }
  return {
    ok: Boolean(payload.ok),
    total: Number(payload.total) || 0,
    mine: Number(payload.mine) || 0,
    reason: payload.reason,
  };
}
