'use client';

import { useEffect, useState } from 'react';
import CanopiInviteRecipientField from '@/components/CanopiInviteRecipientField';
import { listShareParticipantLines } from '@/lib/hermesShareActivity';
import { useThreadShares } from '@/lib/useThreadShares';
import type { CanopiShareRecipient } from '@/lib/canopi-user-search-types';
import {
  recipientEmailFromShareSelection,
  recipientLabelFromShareSelection,
  recipientLabelsFromShareSelection,
  recipientsPayloadFromShareSelection,
} from '@/lib/canopi-user-search-types';

type HermesCommunityInviteModalProps = {
  open: boolean;
  threadId: string;
  threadTitle: string;
  shareRefreshKey?: number;
  onClose: () => void;
  onInvited?: () => void;
};

export default function HermesCommunityInviteModal({
  open,
  threadId,
  threadTitle,
  shareRefreshKey = 0,
  onClose,
  onInvited,
}: HermesCommunityInviteModalProps) {
  const [recipient, setRecipient] = useState<CanopiShareRecipient>({
    users: [],
    emailHint: '',
  });
  const [inviteMessage, setInviteMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastInvitedLabels, setLastInvitedLabels] = useState<string[]>([]);
  const [emailDeliverySummary, setEmailDeliverySummary] = useState<string | null>(null);

  const { activeShares, refresh: refreshThreadShares } = useThreadShares(threadId, open);
  const invitedParticipantLines = listShareParticipantLines(activeShares);

  useEffect(() => {
    if (!open) return;
    void refreshThreadShares();
  }, [open, shareRefreshKey, refreshThreadShares]);

  useEffect(() => {
    if (!open) return;
    setRecipient({ users: [], emailHint: '' });
    setInviteMessage('');
    setError(null);
    setSuccess(null);
    setLastInvitedLabels([]);
    setEmailDeliverySummary(null);
  }, [open, threadId]);

  if (!open) return null;

  function summarizeInviteEmails(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const result = raw as {
      sent?: number;
      failed?: number;
      skippedNoEmail?: number;
      resendConfigured?: boolean;
    };
    if (result.resendConfigured === false) {
      return 'Access was added in Deepi, but invite email is not configured. Tell them to open Deepi and check Shared → With me.';
    }
    const parts: string[] = [];
    if (result.sent) {
      parts.push(`Email sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`);
    }
    if (result.skippedNoEmail) {
      parts.push(
        `${result.skippedNoEmail} ${result.skippedNoEmail === 1 ? 'person has' : 'people have'} no email on file.`,
      );
    }
    if (result.failed) {
      parts.push(`${result.failed} invite email(s) could not be delivered.`);
    }
    return parts.length ? parts.join(' ') : null;
  }

  const sendInvites = async () => {
    setBusy(true);
    setError(null);
    try {
      const pickedRecipients = recipientsPayloadFromShareSelection(recipient);
      const recipientEmail = recipientEmailFromShareSelection(recipient);
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: 'full',
          sendeeRole: 'member',
          senderRetainsWatch: true,
          expiresInHours: 168,
          recipients: pickedRecipients.length > 0 ? pickedRecipients : undefined,
          recipientEmail: pickedRecipients.length === 0 ? recipientEmail || undefined : undefined,
          shareThreadKind: 'live',
          communityInvite: true,
          chatTitle: threadTitle,
          inviteMessage: inviteMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send invites');

      const deliveredCount = Number(data.directDeliveredCount || 0);
      const label = recipientLabelFromShareSelection(recipient);
      const invitedLabels = recipientLabelsFromShareSelection(recipient);
      if (deliveredCount > 1) {
        setSuccess(`Invited ${deliveredCount} people to this Community Chat. Everyone can prompt Deepi once they open it.`);
      } else if (label) {
        setSuccess(`Invited ${label}. They can open Deepi and prompt Deepi in this Community Chat.`);
      } else {
        setSuccess('Invite sent. They can open Deepi and find this chat under Shared → With me.');
      }
      setEmailDeliverySummary(summarizeInviteEmails(data.inviteEmails));
      setLastInvitedLabels(invitedLabels);
      setRecipient({ users: [], emailHint: '' });
      setInviteMessage('');
      onInvited?.();
      void refreshThreadShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  const recipientReady = recipient.users.length > 0 || Boolean(recipient.emailHint.trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
        role="dialog"
        aria-labelledby="community-invite-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="community-invite-title" className="text-lg font-semibold text-white">
            Invite to Community Chat
          </h2>
          <p className="mt-1 text-sm text-slate-400">{threadTitle || 'Community Chat'}</p>
          <p className="mt-2 text-xs text-teal-200/90">
            Everyone you invite can prompt Deepi. This is a group collab chat, not a private share.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {success ? (
            <div className="space-y-2 rounded-lg border border-teal-800/50 bg-teal-950/30 px-3 py-3">
              <p className="text-sm text-teal-100">{success}</p>
              {lastInvitedLabels.length > 1 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {lastInvitedLabels.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
              {emailDeliverySummary ? (
                <p className="text-sm text-cyan-100/90">{emailDeliverySummary}</p>
              ) : null}
            </div>
          ) : (
            <>
              <CanopiInviteRecipientField
                value={recipient}
                onChange={setRecipient}
                disabled={busy}
              />

              <label className="block text-sm text-slate-300">
                Message for invitees
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value.slice(0, 500))}
                  disabled={busy}
                  rows={3}
                  placeholder="What is this chat about? This goes in the invite email."
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
                />
              </label>
            </>
          )}

          {invitedParticipantLines.length > 0 ? (
            <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Members invited
              </h3>
              <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto text-sm text-slate-300">
                {invitedParticipantLines.map((line) => (
                  <li key={line} className="leading-snug">
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            {success ? 'Done' : 'Close'}
          </button>
          {!success ? (
            <button
              type="button"
              disabled={busy || !recipientReady}
              onClick={() => void sendInvites()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy
                ? 'Inviting…'
                : recipient.users.length > 1
                  ? `Invite ${recipient.users.length} people`
                  : 'Invite'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
