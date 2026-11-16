'use client';

/**
 * Listening workspace (Phase 1): the meeting record on the occurrence's own page.
 * Layout: Meeting | Shared understanding | Participation, plus a transcript drawer; tabs on small screens.
 * Panels stay mounted (hidden with CSS) so switching tabs or receiving updates never discards text being
 * written, open threads or scroll position. The meeting stage (future Zoom embed) is rendered once and
 * never re-rendered or remounted by updates.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { applyEvent, initState, type WorkspaceState } from '@/lib/listening/reducer';
import type { Snapshot, WorkspaceEvent } from '@/lib/listening/types';
import MeetingColumn, { MeetingStage } from '@/components/listening/MeetingColumn';
import Participation from '@/components/listening/Participation';
import SharedUnderstanding from '@/components/listening/SharedUnderstanding';
import TranscriptDrawer from '@/components/listening/TranscriptDrawer';
import { WorkspaceContext, type ActResult, type Target, type WorkspaceApi } from '@/components/listening/ui';

type Action = { type: 'events'; events: WorkspaceEvent[] } | { type: 'reset'; snap: Snapshot };

function reducer(state: WorkspaceState | null, action: Action): WorkspaceState | null {
  if (action.type === 'reset') return initState(action.snap);
  if (!state) return state;
  let s = state;
  for (const e of action.events) s = applyEvent(s, e);
  return s;
}

type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';
type Tab = 'meeting' | 'understanding' | 'participate' | 'transcript';

const TABS: { id: Tab; label: string }[] = [
  { id: 'meeting', label: 'Meeting' },
  { id: 'understanding', label: 'Shared understanding' },
  { id: 'participate', label: 'Participate' },
  { id: 'transcript', label: 'Transcript' },
];

export default function ListeningWorkspace({
  slug,
  pagePhaseTracker = false,
  pageTranscriptAnchor,
}: {
  slug: string;
  pagePhaseTracker?: boolean;
  pageTranscriptAnchor?: string;
}) {
  const pointerOnly = Boolean(pageTranscriptAnchor);
  const [state, dispatch] = useReducer(reducer, null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [connects, setConnects] = useState(0);
  const [tab, setTab] = useState<Tab>('understanding');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [target, setTargetState] = useState<Target>({ type: 'meeting', id: null, label: 'The whole meeting' });
  const [focus, setFocus] = useState<{ segmentId: string; n: number } | null>(null);
  const cursorRef = useRef<number | null>(null);
  const { user, login } = useAuth();

  const load = useCallback(async () => {
    const res = await fetch(`/api/listening/${encodeURIComponent(slug)}`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 404 ? 'This meeting record is not available.' : `Could not load (${res.status})`);
    const snap = (await res.json()) as Snapshot;
    dispatch({ type: 'reset', snap });
    cursorRef.current = snap.cursor;
  }, [slug]);

  // Snapshot once (and again when the signed-in account changes, for the viewer's role).
  useEffect(() => {
    load().catch((e: Error) => setLoadError(e.message));
  }, [load, user?.id]);

  // Update stream. EventSource reconnects by itself and sends Last-Event-ID; when we rebuild it
  // after an error we pass our own cursor, so nothing is missed or applied twice.
  const ready = state !== null;
  useEffect(() => {
    if (!ready) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const open = () => {
      if (stopped) return;
      const cursor = cursorRef.current ?? 0;
      es = new EventSource(`/api/listening/${encodeURIComponent(slug)}/stream?cursor=${cursor}`, { withCredentials: true });
      es.addEventListener('update', (ev) => {
        const e = JSON.parse((ev as MessageEvent).data) as WorkspaceEvent;
        if (cursorRef.current !== null && e.seq <= cursorRef.current) return;
        cursorRef.current = e.seq;
        dispatch({ type: 'events', events: [e] });
      });
      es.addEventListener('ready', () => {
        setStatus('live');
        setConnects((n) => n + 1);
      });
      es.onerror = () => {
        if (stopped) return;
        setStatus('reconnecting');
        if (es && es.readyState === EventSource.CLOSED) {
          es = null;
          retry = setTimeout(open, 3000);
        }
      };
    };
    open();
    const onOnline = () => {
      if (!es) open();
    };
    window.addEventListener('online', onOnline);
    return () => {
      stopped = true;
      window.removeEventListener('online', onOnline);
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, [ready, slug]);

  const act = useCallback(
    async (type: string, payload: Record<string, unknown>): Promise<ActResult> => {
      try {
        const res = await fetch(`/api/listening/${encodeURIComponent(slug)}/actions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, ...payload }),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          return { ok: false, status: res.status, message: String(data.message || data.error || `Error ${res.status}`) };
        }
        return { ok: true, data };
      } catch {
        return { ok: false, status: 0, message: 'Network error. Your text is kept; try again.' };
      }
    },
    [slug],
  );

  const setTarget = useCallback((t: Target) => {
    setTargetState(t);
    setTab('participate');
  }, []);

  const showSegment = useCallback((segmentId: string) => {
    setDrawerOpen(true);
    setTab('transcript');
    setFocus((f) => ({ segmentId, n: (f?.n ?? 0) + 1 }));
  }, []);

  const showCard = useCallback((cardId: string) => {
    setTab('understanding');
    requestAnimationFrame(() => {
      document.getElementById(`card-${cardId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const api: WorkspaceApi | null = useMemo(
    () => (state ? { state, act, setTarget, showSegment, showCard, login: () => void login() } : null),
    [state, act, setTarget, showSegment, showCard, login],
  );

  const panel = (id: Tab, extra = '') => `${tab === id ? 'block' : 'hidden'} min-w-0 lg:block ${extra}`;
  // Side columns stay in view on desktop while the shared understanding scrolls (the Zoom slot too).
  const sticky = 'lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1';

  return (
    <div data-testid="listening-workspace" className="mt-10 w-full min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-2">
        <h2 className="text-2xl font-bold text-white">Meeting workspace</h2>
        <p className="text-xs text-slate-500">Staging preview · Phase 1: replayed record, no live Zoom or Claude yet</p>
      </div>

      <StatusStrip
        state={state}
        status={status}
        connects={connects}
        drawerOpen={drawerOpen}
        pointerOnly={pointerOnly}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
      />

      {loadError && !state ? <p className="mt-4 text-sm text-rose-300">{loadError}</p> : null}

      <nav aria-label="Workspace sections" className="mt-4 flex gap-1 overflow-x-auto lg:hidden" role="tablist">
        {TABS.map((t) => ({ ...t, label: t.id === 'transcript' && pointerOnly ? 'Transcript lines' : t.label })).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-testid={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? 'bg-cyan-500 font-semibold text-slate-950' : 'border border-slate-700 text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,23rem)]">
        {/* The meeting stage is a fixed slot: it never depends on record state. */}
        <section aria-label="Meeting" data-panel="meeting" className={panel('meeting', `space-y-4 ${sticky}`)}>
          <MeetingStage />
          {api ? (
            <WorkspaceContext.Provider value={api}>
              <MeetingColumn pagePhaseTracker={pagePhaseTracker} />
            </WorkspaceContext.Provider>
          ) : null}
        </section>

        <section aria-label="Shared understanding" data-panel="understanding" className={panel('understanding')}>
          {api ? (
            <WorkspaceContext.Provider value={api}>
              <SharedUnderstanding />
            </WorkspaceContext.Provider>
          ) : (
            <p className="text-sm text-slate-500">Loading the meeting record…</p>
          )}
        </section>

        <section aria-label="Participation" data-panel="participate" className={panel('participate', sticky)}>
          {api ? (
            <WorkspaceContext.Provider value={api}>
              <Participation target={target} onClearTarget={() => setTargetState({ type: 'meeting', id: null, label: 'The whole meeting' })} />
            </WorkspaceContext.Provider>
          ) : null}
        </section>
      </div>

      <section
        aria-label="Transcript"
        data-panel="transcript"
        className={`${tab === 'transcript' ? 'block' : 'hidden'} ${drawerOpen ? 'lg:block' : 'lg:hidden'} mt-4 lg:fixed lg:inset-x-0 lg:bottom-0 lg:z-40 lg:mt-0 lg:px-6 lg:pb-3`}
      >
        {api ? (
          <WorkspaceContext.Provider value={api}>
            <TranscriptDrawer focus={focus} onClose={() => setDrawerOpen(false)} pageTranscriptAnchor={pageTranscriptAnchor} />
          </WorkspaceContext.Provider>
        ) : null}
      </section>
    </div>
  );
}

function StatusStrip({
  state,
  status,
  connects,
  drawerOpen,
  pointerOnly,
  onToggleDrawer,
}: {
  pointerOnly: boolean;
  state: WorkspaceState | null;
  status: StreamStatus;
  connects: number;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}) {
  const mode = state?.meeting.transcriptMode;
  const transcriptText =
    mode === 'replaying'
      ? 'Transcript: replaying a recorded meeting'
      : mode === 'imported'
        ? 'Transcript: imported from Zoom’s automatic transcript (not live)'
        : mode === 'live'
          ? 'Transcript: live'
          : 'Transcript: none yet';
  const dot = status === 'live' ? 'bg-emerald-400' : status === 'offline' ? 'bg-rose-400' : 'bg-amber-400';
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400" data-testid="status-strip">
      <span className="inline-flex items-center gap-1.5" data-testid="stream-status" data-status={status} data-connects={connects}>
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        Updates: {status === 'live' ? 'connected' : status === 'connecting' ? 'connecting…' : 'reconnecting…'}
      </span>
      <span>{transcriptText}</span>
      <span>Claude: not connected yet (Phase 2); questions wait in the queue</span>
      <span>Zoom: not connected in this preview</span>
      <button type="button" onClick={onToggleDrawer} className="ml-auto hidden rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-cyan-600 lg:inline-block" data-testid="toggle-transcript">
        {pointerOnly ? (drawerOpen ? 'Hide transcript lines' : 'Point at a transcript line') : drawerOpen ? 'Hide transcript' : 'Show transcript'}
      </button>
    </div>
  );
}
