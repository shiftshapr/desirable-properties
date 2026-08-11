'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InviteLeadType } from '@/lib/workgroup-collab-types';

export type InviteContentOption = {
  id: string;
  title: string;
  url: string;
  eventDate?: string | null;
  description?: string | null;
  slug?: string;
};

export type InviteSeriesContentOption = InviteContentOption & {
  kind: 'single' | 'series' | 'session';
  subtitle?: string | null;
};

type Props = {
  selectedEventIds: string[];
  selectedPerspectiveIds: string[];
  lead: InviteLeadType;
  onChange: (patch: {
    selectedEventIds?: string[];
    selectedPerspectiveIds?: string[];
    lead?: InviteLeadType;
  }) => void;
};

function formatEventDate(eventDate: string | null | undefined) {
  if (!eventDate) return null;
  return new Date(eventDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventCheckboxRow({
  id,
  title,
  eventDate,
  description,
  subtitle,
  kindLabel,
  checked,
  onToggle,
}: {
  id: string;
  title: string;
  eventDate?: string | null;
  description?: string | null;
  subtitle?: string | null;
  kindLabel?: string | null;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const dateLabel = formatEventDate(eventDate);
  return (
    <label
      key={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 px-3 py-2 hover:border-slate-700"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(id)}
        className="mt-1"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-100">{title}</span>
        {subtitle ? (
          <span className="block text-xs text-slate-500">{subtitle}</span>
        ) : null}
        {dateLabel ? <span className="block text-xs text-slate-500">{dateLabel}</span> : null}
        {kindLabel ? (
          <span className="mt-0.5 block text-xs text-slate-500">{kindLabel}</span>
        ) : null}
        {description ? (
          <span className="mt-1 block text-xs text-slate-400">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function WorkgroupInviteContentPicker({
  selectedEventIds,
  selectedPerspectiveIds,
  lead,
  onChange,
}: Props) {
  const [globalEvents, setGlobalEvents] = useState<InviteContentOption[]>([]);
  const [seriesEvents, setSeriesEvents] = useState<InviteSeriesContentOption[]>([]);
  const [perspectives, setPerspectives] = useState<InviteContentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/invite-content', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || 'Failed to load invite content');
        if (cancelled) return;
        setGlobalEvents(data.events || []);
        setSeriesEvents(data.seriesEvents || []);
        setPerspectives(data.perspectives || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invite content');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasEvents = selectedEventIds.length > 0;
  const hasPerspectives = selectedPerspectiveIds.length > 0;
  const showLeadSelector = hasEvents && hasPerspectives;

  const effectiveLead = useMemo<InviteLeadType>(() => {
    if (hasEvents && !hasPerspectives) return 'events';
    if (hasPerspectives && !hasEvents) return 'perspectives';
    return lead;
  }, [hasEvents, hasPerspectives, lead]);

  useEffect(() => {
    if (!showLeadSelector && effectiveLead !== lead) {
      onChange({ lead: effectiveLead });
    }
  }, [effectiveLead, lead, onChange, showLeadSelector]);

  function toggleEvent(id: string) {
    onChange({
      selectedEventIds: selectedEventIds.includes(id)
        ? selectedEventIds.filter((x) => x !== id)
        : [...selectedEventIds, id],
    });
  }

  function togglePerspective(id: string) {
    onChange({
      selectedPerspectiveIds: selectedPerspectiveIds.includes(id)
        ? selectedPerspectiveIds.filter((x) => x !== id)
        : [...selectedPerspectiveIds, id],
    });
  }

  const upcomingSeries = seriesEvents.filter((event) => event.kind === 'series' || event.kind === 'single');
  const upcomingSessions = seriesEvents.filter((event) => event.kind === 'session');

  if (loading) {
    return <p className="text-sm text-slate-500">Loading events and perspectives…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!globalEvents.length && !seriesEvents.length && !perspectives.length) {
    return (
      <p className="text-sm text-slate-500">
        No invite content configured yet. Upcoming events come from{' '}
        <span className="text-cyan-300">/admin?tab=event-series</span>; add manual links at{' '}
        <span className="text-cyan-300">/admin?tab=invite-content</span>.
      </p>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Include in invite email</h3>
        <p className="mt-1 text-xs text-slate-400">
          Optional: mention upcoming events and site perspectives before the workgroup invitation.
        </p>
      </div>

      {upcomingSeries.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Upcoming events
          </legend>
          {upcomingSeries.map((event) => (
            <EventCheckboxRow
              key={event.id}
              id={event.id}
              title={event.title}
              eventDate={event.eventDate}
              description={event.description}
              kindLabel={
                event.kind === 'single'
                  ? event.description || 'Single event'
                  : 'Event series'
              }
              checked={selectedEventIds.includes(event.id)}
              onToggle={toggleEvent}
            />
          ))}
        </fieldset>
      ) : null}

      {upcomingSessions.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Upcoming sessions
          </legend>
          {upcomingSessions.map((event) => (
            <EventCheckboxRow
              key={event.id}
              id={event.id}
              title={event.title}
              eventDate={event.eventDate}
              subtitle={event.subtitle}
              kindLabel="Session"
              checked={selectedEventIds.includes(event.id)}
              onToggle={toggleEvent}
            />
          ))}
        </fieldset>
      ) : null}

      {globalEvents.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Global events
          </legend>
          {globalEvents.map((event) => (
            <EventCheckboxRow
              key={event.id}
              id={event.id}
              title={event.title}
              eventDate={event.eventDate}
              description={event.description}
              checked={selectedEventIds.includes(event.id)}
              onToggle={toggleEvent}
            />
          ))}
        </fieldset>
      ) : null}

      {perspectives.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Perspectives
          </legend>
          {perspectives.map((perspective) => (
            <label
              key={perspective.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 px-3 py-2 hover:border-slate-700"
            >
              <input
                type="checkbox"
                checked={selectedPerspectiveIds.includes(perspective.id)}
                onChange={() => togglePerspective(perspective.id)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-100">
                  {perspective.title}
                </span>
                <span className="block text-xs text-slate-500">{perspective.url}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {showLeadSelector ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Lead with
          </legend>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="invite-lead"
              checked={effectiveLead === 'events'}
              onChange={() => onChange({ lead: 'events' })}
            />
            Event leads
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="radio"
              name="invite-lead"
              checked={effectiveLead === 'perspectives'}
              onChange={() => onChange({ lead: 'perspectives' })}
            />
            Perspective leads
          </label>
        </fieldset>
      ) : null}
    </div>
  );
}
