'use client';

import { useCallback, useEffect, useState } from 'react';
import { DpDialog } from '@/components/DpDialog';
import {
  acceptThreadControl,
  listThreadControlRequests,
  requestThreadControl,
  resolveControlRequest,
  type ControlRequestSummary,
} from '@/lib/hermesThreadControl';

type HermesControlPanelProps = {
  threadId: string;
  controlInvitePending?: boolean;
  isWatchingOnly?: boolean;
  canModerateRequests?: boolean;
  onControlChanged?: () => void;
};

export default function HermesControlPanel({
  threadId,
  controlInvitePending = false,
  isWatchingOnly = false,
  canModerateRequests = false,
  onControlChanged,
}: HermesControlPanelProps) {
  const [requests, setRequests] = useState<ControlRequestSummary[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!canModerateRequests) return;
    const list = await listThreadControlRequests(threadId);
    setRequests(list);
  }, [canModerateRequests, threadId]);

  useEffect(() => {
    void refresh();
    if (!canModerateRequests) return undefined;
    const timer = window.setInterval(() => {
      void refresh();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [canModerateRequests, refresh]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await acceptThreadControl(threadId);
      await DpDialog.alert({
        title: 'Control accepted',
        message: 'You can now send prompts in this conversation.',
        variant: 'success',
      });
      onControlChanged?.();
    } catch (err) {
      await DpDialog.alert({
        title: 'Could not accept control',
        message: err instanceof Error ? err.message : 'Try again.',
        variant: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = async () => {
    setBusy(true);
    try {
      await requestThreadControl(threadId);
      await DpDialog.alert({
        title: 'Control requested',
        message: 'The owner or current controller will be notified when they open this thread.',
        variant: 'info',
      });
    } catch (err) {
      await DpDialog.alert({
        title: 'Could not request control',
        message: err instanceof Error ? err.message : 'Try again.',
        variant: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'deny') => {
    setBusy(true);
    try {
      await resolveControlRequest(threadId, requestId, action);
      await refresh();
      onControlChanged?.();
    } catch (err) {
      await DpDialog.alert({
        title: action === 'approve' ? 'Could not grant control' : 'Could not deny request',
        message: err instanceof Error ? err.message : 'Try again.',
        variant: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!controlInvitePending && !isWatchingOnly && !requests.length) return null;

  return (
    <div className="shrink-0 border-b border-slate-800 bg-slate-950/80 px-4 py-2">
      {controlInvitePending ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-amber-100">
            Control invitation
          </span>
          <span className="text-slate-400">Accept to send prompts in this thread.</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAccept()}
            className="rounded-md bg-cyan-700 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            Accept control
          </button>
        </div>
      ) : null}

      {isWatchingOnly && !controlInvitePending ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">You are watching. Request control to send prompts.</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRequest()}
            className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Request control
          </button>
        </div>
      ) : null}

      {canModerateRequests && requests.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-[11px]"
            >
              <span className="text-slate-300">
                {req.requesterName || req.requesterEmail || 'Someone'} requested control
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleResolve(req.id, 'approve')}
                className="rounded border border-cyan-700/60 px-2 py-0.5 text-cyan-200 hover:bg-cyan-950/40 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleResolve(req.id, 'deny')}
                className="rounded border border-slate-600 px-2 py-0.5 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Deny
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
