'use client';

import { useEffect, useState } from 'react';
import { DpDialog } from '@/components/DpDialog';

export type ThreadShareVisibility = 'full' | 'from_share_point';
export type ThreadShareRole = 'watcher' | 'controller';
export type ThreadShareKind = 'live' | 'fork_snapshot';

type HermesShareWizardProps = {
  open: boolean;
  threadId: string;
  threadTitle: string;
  /** When set, share history starts at this turn (per-message share). */
  anchorTurnId?: string | null;
  /** Short label for the anchor point shown in the modal. */
  anchorLabel?: string | null;
  onClose: () => void;
  onShared?: (result: { linkUrl?: string; shareId: string; directDelivered?: boolean }) => void;
};

export default function HermesShareWizard({
  open,
  threadId,
  threadTitle,
  anchorTurnId = null,
  anchorLabel = null,
  onClose,
  onShared,
}: HermesShareWizardProps) {
  const [visibility, setVisibility] = useState<ThreadShareVisibility>(
    anchorTurnId ? 'from_share_point' : 'full',
  );
  const [sendeeRole, setSendeeRole] = useState<ThreadShareRole>('watcher');
  const [senderRetainsWatch, setSenderRetainsWatch] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareThreadKind, setShareThreadKind] = useState<ThreadShareKind>('live');
  const [directDelivered, setDirectDelivered] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisibility(anchorTurnId ? 'from_share_point' : 'full');
    setRecipient('');
    setError(null);
    setLinkUrl(null);
    setShareId(null);
    setCopied(false);
    setDirectDelivered(false);
    setShareThreadKind(anchorTurnId ? 'live' : 'live');
  }, [open, anchorTurnId, threadId]);

  if (!open) return null;

  const fullLink = linkUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${linkUrl}`
    : null;

  const createShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility,
          sendeeRole,
          senderRetainsWatch,
          expiresInHours,
          anchorTurnId: visibility === 'from_share_point' ? anchorTurnId : undefined,
          recipientEmail: recipient.trim() || undefined,
          shareThreadKind: anchorTurnId && shareThreadKind === 'fork_snapshot' ? 'fork_snapshot' : 'live',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create share');
      setLinkUrl(data.linkUrl || null);
      setShareId(data.share?.id || null);
      setDirectDelivered(Boolean(data.directDelivered));
      onShared?.({
        linkUrl: data.linkUrl,
        shareId: data.share?.id,
        directDelivered: Boolean(data.directDelivered),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setBusy(false);
    }
  };

  const revokeShare = async () => {
    if (!shareId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/shares/${encodeURIComponent(shareId)}/revoke`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not revoke share');
      await DpDialog.alert({
        title: 'Share revoked',
        message: 'This link no longer grants access to the thread.',
        variant: 'success',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
        role="dialog"
        aria-labelledby="hermes-share-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="hermes-share-title" className="text-lg font-semibold text-white">
            Share conversation
          </h2>
          <p className="mt-1 text-sm text-slate-400">{threadTitle || 'Hermes thread'}</p>
          {anchorTurnId && anchorLabel ? (
            <p className="mt-2 rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100">
              Share point: {anchorLabel}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 px-5 py-4">
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {!shareId ? (
            <>
              <label className="block text-sm text-slate-300">
                Share with
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Email or username"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  autoComplete="off"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Known Hermes users receive the share directly. Otherwise we create a link for you to copy.
                </span>
              </label>

              {anchorTurnId ? (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Thread mode
                  </legend>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                    <input
                      type="radio"
                      name="shareKind"
                      checked={shareThreadKind === 'live'}
                      onChange={() => setShareThreadKind('live')}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm text-white">Live thread</span>
                      <span className="block text-xs text-slate-400">Recipient follows new messages as you continue.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                    <input
                      type="radio"
                      name="shareKind"
                      checked={shareThreadKind === 'fork_snapshot'}
                      onChange={() => setShareThreadKind('fork_snapshot')}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm text-white">Fork snapshot</span>
                      <span className="block text-xs text-slate-400">Frozen copy through the share point. Your live thread stays private.</span>
                    </span>
                  </label>
                </fieldset>
              ) : null}

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  History visibility
                </legend>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'full'}
                    onChange={() => setVisibility('full')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm text-white">Full thread</span>
                    <span className="block text-xs text-slate-400">Recipient sees the entire conversation.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700 p-3 hover:border-slate-600">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === 'from_share_point'}
                    onChange={() => setVisibility('from_share_point')}
                    className="mt-1"
                    disabled={!anchorTurnId}
                  />
                  <span>
                    <span className="block text-sm text-white">From share point forward</span>
                    <span className="block text-xs text-slate-400">
                      {anchorTurnId
                        ? 'Hides earlier turns from this message. Sets the anchor floor for edits.'
                        : 'Open share from a specific message to anchor here.'}
                    </span>
                  </span>
                </label>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Recipient permissions
                </legend>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="role"
                    checked={sendeeRole === 'watcher'}
                    onChange={() => setSendeeRole('watcher')}
                  />
                  Watch only (read-only)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                  <input
                    type="radio"
                    name="role"
                    checked={sendeeRole === 'controller'}
                    onChange={() => setSendeeRole('controller')}
                  />
                  Control (can send prompts after accepting)
                </label>
              </fieldset>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={senderRetainsWatch}
                  onChange={(e) => setSenderRetainsWatch(e.target.checked)}
                />
                Keep my watch access after sharing
              </label>

              <label className="block text-sm text-slate-300">
                Link expires in
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="ml-2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                >
                  <option value={1}>1 hour</option>
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                </select>
              </label>

              <p className="text-xs text-slate-500">
                No one can truncate or regenerate turns before the share anchor. To change earlier history, fork instead.
              </p>
            </>
          ) : directDelivered ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Shared directly with {recipient.trim()}.
                {sendeeRole === 'controller'
                  ? ' They must accept control before sending prompts.'
                  : ' They can open it from Shared with me.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Share link created.
                {recipient.trim() ? ` Intended for ${recipient.trim()}.` : ' Copy and send it to your recipient.'}
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={fullLink || ''}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="shrink-0 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-600"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
          {shareId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void revokeShare()}
              className="rounded-lg border border-rose-800/60 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/40 disabled:opacity-50"
            >
              Revoke share
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void createShare()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy ? 'Sharing…' : 'Share'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
