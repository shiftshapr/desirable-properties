export type UserDateFormatMode = 'datetime' | 'date';

export function parseUserDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Format for display in the viewer's local timezone and locale. */
export function formatUserDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  const date = parseUserDate(value);
  if (!date) return '';
  return date.toLocaleString(undefined, options);
}

/** Date-only variant for the viewer's local timezone and locale. */
export function formatUserDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = parseUserDate(value);
  if (!date) return '';
  return date.toLocaleDateString(undefined, options);
}

/** Compact chat-style timestamp (local timezone). */
export function formatUserDateTimeShort(value: string | Date | null | undefined): string {
  return formatUserDateTime(value, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Compact date-only label (local timezone). */
export function formatUserDateShort(value: string | Date | null | undefined): string {
  return formatUserDate(value, { month: 'short', day: 'numeric' });
}
