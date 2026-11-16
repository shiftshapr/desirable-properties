'use client';

import { memo, useState } from 'react';
import {
  GOVERNANCE_SETTINGS,
  PHASES,
  PHASE_TEXT,
  type Phase,
} from '@/lib/listening/types';
import { buttonClass, formatWhen, panelClass, useWorkspace } from '@/components/listening/ui';

/**
 * Fixed slot for the embedded Zoom meeting (Meeting SDK, Phase 4). It takes no props and never
 * re-renders, so record updates can never remount whatever is mounted inside it.
 */
export const MeetingStage = memo(
  function MeetingStage() {
    return (
      <div className={`${panelClass} p-4`} data-testid="meeting-stage" id="listening-meeting-stage">
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-center text-sm text-slate-500">
          The Zoom meeting will appear here when live sessions are connected. This page is a replay of the recorded
          meeting.
        </div>
      </div>
    );
  },
  () => true,
);

export default function MeetingColumn({ pagePhaseTracker = false }: { pagePhaseTracker?: boolean }) {
  const { state } = useWorkspace();
  const { meeting, phaseHistory, viewer } = state;
  const facilitator = viewer.role === 'facilitator' || viewer.role === 'administrator';

  return (
    <>
      <div className={`${panelClass} p-4`} data-testid="phase-panel">
        <p className="text-xs uppercase tracking-wide text-slate-500">{pagePhaseTracker ? 'Workspace record phase' : 'Phase'}</p>
        <p className="mt-1 text-lg font-semibold text-white" data-testid="current-phase">
          {PHASE_TEXT[meeting.phase]}
        </p>
        <ol className="mt-3 space-y-1.5 text-xs text-slate-400" data-testid="phase-history">
          {phaseHistory.length === 0 ? <li>No phase changes recorded yet.</li> : null}
          {phaseHistory.map((p) => (
            <li key={p.seq}>
              <span className="text-slate-200">{PHASE_TEXT[p.to]}</span>
              {' · '}
              {p.actorName ?? 'system'}
              {p.actorRole ? ` (${p.actorRole})` : ''}
              {' · '}
              {formatWhen(p.createdAt)}
              {p.note ? <span className="block text-slate-500">{p.note}</span> : null}
            </li>
          ))}
        </ol>
        {pagePhaseTracker ? (
          <p className="mt-3 text-[11px] text-amber-200/90" data-testid="phase-page-note">
            On this page, “Where this session is” above is the phase record for now. The workspace’s own phase only marks
            contributions as before, during or after the meeting; joining the two is a follow-up.
          </p>
        ) : facilitator ? (
          <PhaseControl current={meeting.phase} />
        ) : null}
      </div>

      <div className={`${panelClass} p-4 text-sm text-slate-300`}>
        <p className="text-xs uppercase tracking-wide text-slate-500">Your role</p>
        <p className="mt-1" data-testid="viewer-role">
          {viewer.signedIn ? `${viewer.name ?? 'Signed in'}: ${viewer.role}` : 'Not signed in: you can read; sign in to take part.'}
        </p>
        {viewer.role === 'administrator' ? <RoleGrant /> : null}
      </div>

      <div className={`${panelClass} p-4`}>
        <p className="text-xs uppercase tracking-wide text-slate-500">Governance settings</p>
        <ul className="mt-2 space-y-1.5 text-xs" data-testid="governance-settings">
          {GOVERNANCE_SETTINGS.map((s) => (
            <li key={s.key} className="flex justify-between gap-3">
              <span className="text-slate-300">{s.label}</span>
              <span className="shrink-0 text-amber-300">not yet adopted</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">
          Nothing on this page decides these. They stay open until the community adopts a rule.
        </p>
      </div>
    </>
  );
}

function PhaseControl({ current }: { current: Phase }) {
  const { act, state } = useWorkspace();
  const [to, setTo] = useState<Phase>(current);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 border-t border-slate-800 pt-3">
      <label className="block text-xs text-slate-400">
        Move to phase
        <select
          value={to}
          onChange={(e) => setTo(e.target.value as Phase)}
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
          data-testid="phase-select"
        >
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {PHASE_TEXT[p]}
            </option>
          ))}
        </select>
      </label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
      />
      <button
        type="button"
        className={`${buttonClass} mt-2`}
        disabled={busy || to === state.meeting.phase}
        data-testid="phase-submit"
        onClick={async () => {
          setBusy(true);
          const r = await act('phase.set', { to, note });
          setBusy(false);
          setMsg(r.ok ? 'Phase changed.' : r.message);
          if (r.ok) setNote('');
        }}
      >
        Record phase change
      </button>
      {msg ? <p className="mt-1 text-xs text-slate-400" data-testid="phase-msg">{msg}</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">
        Facilitators: before, live, preparing the draft. Administrators: open or close verification. Council phases
        need a council role, which does not exist yet.
      </p>
    </div>
  );
}

function RoleGrant() {
  const { act } = useWorkspace();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <p className="text-xs text-slate-400">Make an account a facilitator for this meeting (Gov Hub user id).</p>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User id" className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm" />
      <button
        type="button"
        className={`${buttonClass} mt-2`}
        onClick={async () => {
          const r = await act('role.grant', { userId, name, role: 'facilitator' });
          setMsg(r.ok ? 'Granted.' : r.message);
        }}
      >
        Grant facilitator
      </button>
      {msg ? <p className="mt-1 text-xs text-slate-400">{msg}</p> : null}
    </div>
  );
}
