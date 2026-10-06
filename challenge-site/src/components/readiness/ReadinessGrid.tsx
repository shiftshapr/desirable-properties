'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { shortDate, type ReadinessItem } from '@/data/dp-process';
import type { DpReadiness, ReadinessCheck } from '@/lib/v1-readiness.server';

type Props = {
  items: ReadinessItem[];
  dps: DpReadiness[];
  signedIn: boolean;
  generatedAt: string;
};

function cellGlyph(check: ReadinessCheck | undefined) {
  if (!check || check.pass === null) return { glyph: '–', cls: 'text-slate-500', title: check?.detail || 'not computed' };
  if (check.pass) return { glyph: '✓', cls: 'bg-emerald-950/60 text-emerald-300', title: check.detail };
  return { glyph: '✗', cls: 'bg-rose-950/40 text-rose-300', title: check.detail };
}

export default function ReadinessGrid({ items, dps, signedIn, generatedAt }: Props) {
  const [rows, setRows] = useState(dps);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totals = useMemo(() => {
    const ready = rows.filter((r) => r.passed === items.length).length;
    const seats = rows.filter((r) => r.checks.co_editors?.pass).length;
    const pending = rows.reduce((n, r) => n + (r.pending_proposals || 0), 0);
    return { ready, seats, pending };
  }, [rows, items.length]);

  const tick = useCallback(
    async (dp: DpReadiness, item: ReadinessItem) => {
      const current = dp.checks[item.key];
      const nextChecked = !(current?.pass === true);
      let note = current?.note || '';
      if (nextChecked) {
        const entered = window.prompt(`${item.label}\n\nOptional note (who checked what):`, note);
        if (entered === null) return;
        note = entered;
      }
      const key = `${dp.acronym}:${item.key}`;
      setBusy(key);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/v1-readiness/${encodeURIComponent(dp.acronym)}/${encodeURIComponent(item.key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checked: nextChecked, note }),
          },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          checked?: boolean;
          note?: string | null;
          checked_by?: string | null;
          checked_at?: string | null;
        };
        if (!res.ok) {
          setMessage(data.error || `Could not update (${res.status})`);
          return;
        }
        setRows((prev) =>
          prev.map((r) => {
            if (r.acronym !== dp.acronym) return r;
            const checks = {
              ...r.checks,
              [item.key]: {
                pass: Boolean(data.checked),
                detail: data.checked
                  ? `checked by ${data.checked_by || 'you'}`
                  : 'not checked',
                note: data.note ?? null,
                checked_by: data.checked_by ?? null,
                checked_at: data.checked_at ?? null,
              },
            };
            const passed = Object.values(checks).filter((c) => c.pass === true).length;
            return { ...r, checks, passed };
          }),
        );
      } catch {
        setMessage('Network error. Please try again.');
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="DPs ready for V1" value={`${totals.ready} of ${rows.length}`} />
        <Stat label="DPs with both co-editors" value={`${totals.seats} of ${rows.length}`} />
        <Stat label="Proposals pending" value={String(totals.pending)} />
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Automatic items update from Gov Hub and Canopi every time this page loads (last computed{' '}
        {new Date(generatedAt).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT).
        Manual items are ticked by a DP&apos;s co-editors or coordinator: click a cell.
        {!signedIn ? ' Sign in to tick.' : ''}
      </p>
      {message ? (
        <p className="mt-3 rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {message}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-3">DP</th>
              {items.map((item, i) => (
                <th key={item.key} className="px-1 py-3 text-center" title={`${item.label} · ${item.check} · due ${shortDate(item.due)}`}>
                  <span className="block font-semibold text-slate-300">{i + 1}</span>
                  <span className={`block text-[10px] ${item.check === 'manual' ? 'text-violet-300' : 'text-slate-500'}`}>
                    {item.check === 'manual' ? 'manual' : 'auto'}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3 text-right">Ready</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((dp) => {
              const isOpen = open === dp.acronym;
              return (
                <ReadinessRow
                  key={dp.acronym}
                  dp={dp}
                  items={items}
                  isOpen={isOpen}
                  onToggle={() => setOpen(isOpen ? null : dp.acronym)}
                  onTick={tick}
                  busyKey={busy}
                  signedIn={signedIn}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <ol className="mt-6 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={item.key} className="flex gap-2">
            <span className="w-5 shrink-0 font-semibold text-slate-300">{i + 1}</span>
            <span>
              {item.label}{' '}
              <span className={item.check === 'manual' ? 'text-violet-300' : 'text-slate-500'}>
                · {item.check === 'manual' ? 'manual' : 'automatic'} · due {shortDate(item.due)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ReadinessRow({
  dp,
  items,
  isOpen,
  onToggle,
  onTick,
  busyKey,
  signedIn,
}: {
  dp: DpReadiness;
  items: ReadinessItem[];
  isOpen: boolean;
  onToggle: () => void;
  onTick: (dp: DpReadiness, item: ReadinessItem) => void;
  busyKey: string | null;
  signedIn: boolean;
}) {
  return (
    <>
      <tr className="border-t border-slate-800 hover:bg-slate-900/40">
        <td className="sticky left-0 z-10 bg-slate-950/95 px-3 py-2">
          <button type="button" onClick={onToggle} className="text-left">
            <span className="font-semibold text-cyan-300">{dp.dp}</span>
            <span className="ml-2 hidden text-slate-400 lg:inline">{dp.name.replace(/^DP\d+\s*[-–:]\s*/, '')}</span>
          </button>
        </td>
        {items.map((item) => {
          const check = dp.checks[item.key];
          const { glyph, cls, title } = cellGlyph(check);
          const manual = item.check === 'manual';
          const key = `${dp.acronym}:${item.key}`;
          return (
            <td key={item.key} className="px-1 py-1 text-center" title={title}>
              {manual ? (
                <button
                  type="button"
                  disabled={!signedIn || busyKey === key}
                  onClick={() => onTick(dp, item)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-violet-900/60 ${cls} disabled:cursor-not-allowed disabled:opacity-60`}
                  aria-label={`${dp.dp}: ${item.label} (${check?.pass ? 'checked' : 'not checked'})`}
                >
                  {busyKey === key ? '…' : glyph}
                </button>
              ) : (
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${cls}`}>{glyph}</span>
              )}
            </td>
          );
        })}
        <td className="px-3 py-2 text-right font-semibold text-slate-200">
          {dp.passed}/{items.length}
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-t border-slate-800/60 bg-slate-900/40">
          <td colSpan={items.length + 2} className="px-4 py-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold text-white">{dp.name}</span>
              {dp.draft_ref ? <span className="text-slate-400">{dp.draft_ref}</span> : null}
              <span className="text-slate-400">{dp.members} members</span>
              <span className="text-slate-400">{dp.pending_proposals} pending</span>
              {dp.slug ? (
                <Link href={`/workgroups/${dp.slug}`} className="text-cyan-300 hover:text-cyan-200">
                  Workgroup →
                </Link>
              ) : null}
              <Link href={`/dp/${dp.dp.toLowerCase()}`} className="text-cyan-300 hover:text-cyan-200">
                Chapter →
              </Link>
            </div>
            <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {items.map((item, i) => {
                const check = dp.checks[item.key];
                const { glyph, cls } = cellGlyph(check);
                return (
                  <li key={item.key} className="flex gap-2">
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${cls}`}>{glyph}</span>
                    <span className="text-slate-300">
                      <span className="text-slate-500">{i + 1}.</span> {item.label}
                      <span className="text-slate-500"> — {check?.detail}</span>
                      {check?.note ? <span className="block text-xs text-slate-400">“{check.note}”</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}
