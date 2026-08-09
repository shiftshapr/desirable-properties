const DISPLAY_TZ = 'America/Los_Angeles';

export function formatSessionSchedule(
  startsAt: string | null,
  endsAt?: string | null,
): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  const datePart = start.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: DISPLAY_TZ,
  });
  const timePart = start.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DISPLAY_TZ,
    timeZoneName: 'short',
  });
  if (!endsAt) return `${datePart} · ${timePart}`;
  const end = new Date(endsAt);
  const endTime = end.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DISPLAY_TZ,
    timeZoneName: 'short',
  });
  return `${datePart} · ${timePart} – ${endTime}`;
}

export type SessionAction = {
  label: string;
  href: string;
  disabled?: boolean;
};

export function getSessionAction(session: {
  recordingUrl: string | null;
  liveUrl: string | null;
}): SessionAction | null {
  if (session.recordingUrl) {
    return { label: 'Watch now', href: session.recordingUrl };
  }
  if (session.liveUrl) {
    return { label: 'RSVP', href: session.liveUrl };
  }
  return { label: 'RSVP link coming soon', href: '', disabled: true };
}

/** `datetime-local` value from ISO (admin browser local time). */
export function isoToDatetimeLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO from `datetime-local` (admin browser local time). */
export function datetimeLocalInputToIso(local: string): string | null {
  const trimmed = local.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function formatMinutesEstimate(minutes: number): string {
  return `${minutes} mins`;
}

export function partitionPreReads<T extends { optional?: boolean | null }>(
  preReads: T[],
): { required: T[]; optional: T[] } {
  const required: T[] = [];
  const optional: T[] = [];
  for (const pr of preReads) {
    if (pr.optional) optional.push(pr);
    else required.push(pr);
  }
  return { required, optional };
}

export function sumPreReadMinutes(
  preReads: Array<{ minutesEstimate?: number | null; optional?: boolean | null }>,
): number | null {
  const values = preReads
    .filter((pr) => !pr.optional)
    .map((pr) => pr.minutesEstimate)
    .filter((minutes): minutes is number => minutes != null && minutes > 0);
  if (!values.length) return null;
  return values.reduce((sum, minutes) => sum + minutes, 0);
}
