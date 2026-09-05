import type { WorkgroupChapterEditList } from '@/lib/workgroup-chapter-edit-types';

export async function fetchWorkgroupChapterEditsClient(
  workgroupId: string,
  dpKey: string,
): Promise<WorkgroupChapterEditList> {
  const params = new URLSearchParams({ dpKey });
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/chapter-edits?${params.toString()}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error('Failed to load chapter edits');
  }
  return res.json() as Promise<WorkgroupChapterEditList>;
}

export async function submitWorkgroupChapterEditClient(
  workgroupId: string,
  input: {
    dpKey: string;
    astraReleaseId: string;
    markdown: string;
    rationale?: string;
  },
): Promise<WorkgroupChapterEditList> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/chapter-edits`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as WorkgroupChapterEditList & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to save chapter edit');
  }
  return payload;
}

export async function setWorkgroupChapterEditStatusClient(
  workgroupId: string,
  editId: string,
  action: 'revoke' | 'restore',
  dpKey: string,
): Promise<WorkgroupChapterEditList> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/chapter-edits`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editId, action, dpKey }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as WorkgroupChapterEditList & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to update chapter edit');
  }
  return payload;
}
