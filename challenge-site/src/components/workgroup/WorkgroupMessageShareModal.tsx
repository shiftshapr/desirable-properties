'use client';

import { useEffect, useState } from 'react';
import WorkgroupRosterRecipientField from '@/components/workgroup/WorkgroupRosterRecipientField';
import { DpDialog } from '@/components/DpDialog';
import {
  fetchWorkgroupMemberRoster,
  shareWorkgroupMessage,
  type WorkgroupRosterMember,
} from '@/lib/workgroup-collab-api';
import {
  recipientLabelFromWorkgroupShare,
  recipientTokenFromWorkgroupShare,
  type WorkgroupShareRecipient,
} from '@/lib/workgroup-share-recipient-types';
import type { WorkgroupShareRole } from '@/lib/workgroup-share-restrictions';

type WorkgroupMessageShareModalProps = {
  open: boolean;
  workgroupId: string;
  workgroupName: string;
  messageId: string;
  messagePreview: string;
  messageAuthorUserId: string;
  sharerUserId: string;
  sharerPositions: string[];
  onClose: () => void;
  onShared?: () => void;
};

function isShareFacilitator(positions: string[]): boolean {
  return positions.some((p) => ['chair', 'co_lead', 'facilitator'].includes(p));
}

function canShareMessage(
  messageAuthorUserId: string,
  sharerUserId: string,
  messagePreview: string,
  positions: string[],
): boolean {
  if (isShareFacilitator(positions)) return true;
  if (messageAuthorUserId === sharerUserId) return true;
  return /^✋\s+\*Hermes \([^)]+\)\*/.test(String(messagePreview ?? '').trimStart());
}

function canGrantControl(
  messageAuthorUserId: string,
  sharerUserId: string,
  positions: string[],
): boolean {
  if (isShareFacilitator(positions)) return true;
  return messageAuthorUserId === sharerUserId;
}

/**
 * Workgroup chat share: internal member-to-member only (no public links).
 * See WORKGROUP-SHARE.md for restriction rules.
 */
export default function WorkgroupMessageShareModal({
  open,
  workgroupId,
  workgroupName,
  messageId,
  messagePreview,
  messageAuthorUserId,
  sharerUserId,
  sharerPositions,
  onClose,
  onShared,
}: WorkgroupMessageShareModalProps) {
  const [members, setMembers] = useState<WorkgroupRosterMember[]>([]);
  const [recipient, setRecipient] = useState<WorkgroupShareRecipient>({
    member: null,
    queryHint: '',
  });
  const [sendeeRole, setSendeeRole] = useState<WorkgroupShareRole>('watcher');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const allowShare = canShareMessage(
    messageAuthorUserId,
    sharerUserId,
    messagePreview,
    sharerPositions,
  );
  const allowControl = canGrantControl(messageAuthorUserId, sharerUserId, sharerPositions);

  useEffect(() => {
    if (!open) return;
    setRecipient({ member: null, queryHint: '' });
    setSendeeRole('watcher');
    setNote('');
    setError(null);
    setRosterError(null);
    void fetchWorkgroupMemberRoster(workgroupId)
      .then((data) => setMembers(data.members || []))
      .catch((err) => {
        setMembers([]);
        setRosterError(err instanceof Error ? err.message : 'Could not load members');
      });
  }, [open, workgroupId]);

  if (!open) return null;

  const preview = messagePreview.split('\n')[0].trim();
  const anchorLabel = preview.length > 80 ? `${preview.slice(0, 77)}…` : preview || 'This message';

  const recipientReady = Boolean(recipient.member || recipient.queryHint.trim());

  const submitShare = async () => {
    const token = recipientTokenFromWorkgroupShare(recipient);
    if (!token) {
      setError('Choose a workgroup member');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await shareWorkgroupMessage(workgroupId, messageId, {
        recipient: recipient.member ? recipient.member.user_name : token,
        recipientUserId: recipient.member?.user_id,
        sendeeRole,
        note: note.trim() || undefined,
      });
      const label = recipientLabelFromWorkgroupShare(recipient);
      await DpDialog.alert({
        title: 'Shared with member',
        message: `This thread point was shared with ${label}. They receive watch access from this message forward.`,
        variant: 'success',
      });
      onShared?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
        role="dialog"
        aria-labelledby="wg-share-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="wg-share-title" className="text-lg font-semibold text-white">
            Share message
          </h2>
          <p className="mt-1 text-sm text-slate-400">{workgroupName}</p>
          <p className="mt-2 rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-100">
            From: {anchorLabel}
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!allowShare ? (
            <p className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
              You can only share messages you authored or Hermes messages marked shareable.
              Facilitators may share any visible message.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {rosterError ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {rosterError}
            </p>
          ) : null}

          <WorkgroupRosterRecipientField
            members={members}
            sharerUserId={sharerUserId}
            value={recipient}
            onChange={setRecipient}
            disabled={!allowShare || busy}
            label="Share with (workgroup member)"
            helperText="Pick someone on this workgroup roster (@handle or name). External emails are not allowed."
          />

          <fieldset className="space-y-2" disabled={!allowShare || busy}>
            <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Recipient permissions
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                name="wg-share-role"
                checked={sendeeRole === 'watcher'}
                onChange={() => setSendeeRole('watcher')}
              />
              Watch only (default)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                name="wg-share-role"
                checked={sendeeRole === 'controller'}
                onChange={() => setSendeeRole('controller')}
                disabled={!allowControl}
              />
              Control (can post from this anchor)
            </label>
            {!allowControl ? (
              <p className="text-xs text-slate-500">
                Control is limited to facilitators or the message author.
              </p>
            ) : null}
          </fieldset>

          <label className="block text-sm text-slate-300">
            Optional note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              placeholder="Why you are sharing this point in the thread"
              disabled={!allowShare || busy}
            />
          </label>
        </div>

        <div className="space-y-2 border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-500">
            Internal workgroup collab only. Recipients must be active members. Public expiring
            links are disabled. History starts at this message (anchor floor enforced).
            Private Hermes notes stay within the workgroup roster.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!allowShare || busy || !recipientReady}
              onClick={() => void submitShare()}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              {busy ? 'Sharing…' : 'Share with member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
