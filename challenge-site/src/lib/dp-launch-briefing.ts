/** Pre-launch briefing page – Sept 16 Community Review Draft milestone. */

export function isLaunchBriefingEnabled(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_DP_LAUNCH_BRIEFING_ENABLED ??
    process.env.DP_LAUNCH_BRIEFING_ENABLED;
  return flag !== 'false';
}

export function launchBriefingHref(workgroupSlug?: string | null): string {
  const base = '/launch-briefing';
  const slug = String(workgroupSlug || '').trim();
  if (!slug) return base;
  return `${base}?wg=${encodeURIComponent(slug)}`;
}
