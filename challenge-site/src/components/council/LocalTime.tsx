'use client';

import { useSyncExternalStore } from 'react';

const PACIFIC = 'America/Los_Angeles';

const noopSubscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
const serverZone = () => '';

function fmt(d: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(d);
}

/**
 * A Gov Hub timestamp (ISO 8601, UTC) in the visitor's own time zone, with the zone named, and the
 * same moment in Pacific time. The server render shows UTC until the browser knows the zone.
 */
export default function LocalTime({
  iso,
  showPacific = true,
  inline = false,
}: {
  iso: string;
  showPacific?: boolean;
  /** One line, for use inside a sentence (zone abbreviation only). */
  inline?: boolean;
}) {
  const date = new Date(iso);
  // '' on the server and during hydration; the browser's zone afterwards.
  const zone = useSyncExternalStore(noopSubscribe, browserZone, serverZone);

  if (Number.isNaN(date.getTime())) return <span>–</span>;
  const local = zone ? { text: fmt(date), zone } : null;
  if (inline) {
    return (
      <time dateTime={iso} className="whitespace-nowrap font-medium text-slate-100">
        {local ? local.text : fmt(date, 'UTC')}
      </time>
    );
  }
  const pacific = fmt(date, PACIFIC);
  const isPacificViewer = local?.zone === PACIFIC;

  return (
    <span className="inline-flex flex-col">
      <time dateTime={iso} className="text-slate-100">
        {local ? local.text : fmt(date, 'UTC')}
      </time>
      {showPacific && !isPacificViewer ? <span className="text-xs text-slate-500">{pacific} (Pacific)</span> : null}
    </span>
  );
}

/** "Times are in your time zone (…)", once above a list of LocalTime rows. */
export function ZoneNote() {
  const zone = useSyncExternalStore(noopSubscribe, browserZone, serverZone);
  return (
    <p className="text-xs text-slate-500">
      {zone
        ? `Times are in your time zone (${zone.replace(/_/g, ' ')}), with Pacific time below each.`
        : 'Times are in UTC, with Pacific time below each.'}
    </p>
  );
}
