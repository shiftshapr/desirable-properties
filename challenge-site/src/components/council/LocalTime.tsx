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
export default function LocalTime({ iso, showPacific = true }: { iso: string; showPacific?: boolean }) {
  const date = new Date(iso);
  // '' on the server and during hydration; the browser's zone afterwards.
  const zone = useSyncExternalStore(noopSubscribe, browserZone, serverZone);

  if (Number.isNaN(date.getTime())) return <span>–</span>;
  const local = zone ? { text: fmt(date), zone } : null;
  const pacific = fmt(date, PACIFIC);
  const isPacificViewer = local?.zone === PACIFIC;

  return (
    <span className="inline-flex flex-col">
      <time dateTime={iso} className="text-slate-100">
        {local ? local.text : fmt(date, 'UTC')}
        {local?.zone ? <span className="text-slate-500"> · your time ({local.zone.replace(/_/g, ' ')})</span> : null}
      </time>
      {showPacific && !isPacificViewer ? <span className="text-xs text-slate-500">{pacific} (Pacific)</span> : null}
    </span>
  );
}
