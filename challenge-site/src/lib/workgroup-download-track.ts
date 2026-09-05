/** Fire-and-forget download tracking for workgroup Activity tab. */
export function trackWorkgroupDownloadClient(
  workgroupId: string,
  input: {
    dpKey?: string;
    resourceType?: string;
    resourceLabel: string;
    resourceHref: string;
  },
): void {
  const wgId = String(workgroupId || '').trim();
  if (!wgId || !input.resourceLabel) return;

  void fetch(`/api/workgroups/${encodeURIComponent(wgId)}/activity/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  }).catch(() => {
    /* non-blocking */
  });
}
