/**
 * Version 1.0 leftovers in Version 1.1 (owner, 20 Nov 2026: "Yes, co-editors decide").
 *
 * The steering sweep closed its 34 deferrals as `considered` with a note starting "Carried to Version 1.1".
 * On 20 Nov they were reopened (status `pending`, note starting "Reopened for Version 1.1") so co-editors
 * decide them through the normal flow. Gov Hub sends `version_marker`; older Gov Hub builds do not, so the
 * marker is also read from the status and the review note. Client-safe.
 */
export type VersionMarker = 'reopened_v11' | 'carried_v11';

export const VERSION_MARKER_LABEL: Record<VersionMarker, string> = {
  reopened_v11: 'Reopened for Version 1.1',
  carried_v11: 'Carried to Version 1.1',
};

export function versionMarkerOf(p: {
  status?: string | null;
  review_note?: string | null;
  version_marker?: string | null;
}): VersionMarker | null {
  const given = String(p.version_marker || '');
  if (given === 'reopened_v11' || given === 'carried_v11') return given;
  const status = String(p.status || '').toLowerCase();
  const note = String(p.review_note || '').trimStart();
  if (status === 'pending' && note.startsWith('Reopened for Version 1.1')) return 'reopened_v11';
  if (status === 'considered' && note.startsWith('Carried to Version 1.1')) return 'carried_v11';
  return null;
}
