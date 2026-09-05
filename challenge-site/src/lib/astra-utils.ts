export function dpIdToAstraKey(dpId: string): string {
  const match = String(dpId || '').trim().match(/^DP(\d+)$/i);
  if (!match) return '';
  return `dp${match[1].padStart(2, '0')}`;
}

export function astraKeyToDpId(dpKey: string): string | null {
  const match = String(dpKey || '').trim().match(/^dp(\d+)$/i);
  if (!match) return null;
  return `DP${Number(match[1])}`;
}

export function truncateSha256(hash: string, visible = 8): string {
  const value = String(hash || '').trim();
  if (value.length <= visible * 2 + 1) return value;
  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}
