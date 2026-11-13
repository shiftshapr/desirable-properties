import { V1_LAUNCH_AT } from '@/lib/dp-v1-release';

/** The launch gathering ends at 11am PT (Friday 13 November 2026). */
export const V1_EVENT_END_AT = new Date('2026-11-13T19:00:00Z');

/** before: until 10am PT · during: the launch gathering, 10–11am PT · after: from 11am PT. */
export type V1Phase = 'before' | 'during' | 'after';

export function v1Phase(now: Date = new Date()): V1Phase {
  const t = now.getTime();
  if (t < V1_LAUNCH_AT.getTime()) return 'before';
  if (t < V1_EVENT_END_AT.getTime()) return 'during';
  return 'after';
}

/** Staging only: ?v1phase=before|during|after previews a phase. Production ignores it. */
export function previewPhase(hostname: string, search: string): V1Phase | null {
  if (!/^(staging\.|localhost|127\.)/.test(hostname)) return null;
  const p = new URLSearchParams(search).get('v1phase');
  return p === 'before' || p === 'during' || p === 'after' ? p : null;
}
