'use client';

import { useEffect, useState } from 'react';
import CanopiInviteRecipientField from '@/components/CanopiInviteRecipientField';
import { DpDialog } from '@/components/DpDialog';
import { listShareParticipantLines } from '@/lib/hermesShareActivity';
import { useThreadShares } from '@/lib/useThreadShares';
import type { CanopiShareRecipient } from '@/lib/canopi-user-search-types';
import {
  recipientEmailFromShareSelection,
  recipientLabelFromShareSelection,
  recipientLabelsFromShareSelection,
  recipientsPayloadFromShareSelection,
} from '@/lib/canopi-user-search-types';

export type ThreadShareVisibility = 'full' | 'from_share_point';
export type ThreadShareRole = 'watcher' | 'controller' | 'member';
export type ThreadShareKind = 'live' | 'fork_snapshot';

type HermesShareWizardProps = {
  open: boolean;
  threadId: string;
  threadTitle: string;
  /** When set, share history starts at this turn (per-message share). */
  anchorTurnId?: string | null;
  /** Short label for the anchor point shown in the modal. */
  anchorLabel?: string | null;
  /** Community Chat invite flow: default member role, simplified copy. */
  communityInvite?: boolean;
  /** Bump after creating a share so the invite roster refreshes. */
  shareRefreshKey?: number;
  onClose: () => void;
  onShared?: (result: {
    linkUrl?: string;
    shareId: string;
    directDelivered?: boolean;
    directDeliveredCount?: number;
  }) => void;
};

export default function HermesShareWizard({
  open,
  threadId,
  threadTitle,
  anchorTurnId = null,
  anchorLabel = null,
  communityInvite = false,
  shareRefreshKey = 0,
  onClose,
  onShared,
}: HermesShareWizardProps) {
  const [visibility, setVisibility] = useState<ThreadShareVisibility>(
    anchorTurnId ? 'from_share_point' : 'full',
  );
  const [sendeeRole, setSendeeRole] = useState<ThreadShareRole>(
    communityInvite ? 'member' : 'watcher',
  );
  const [senderRetainsWatch, setSenderRetainsWatch] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [recipient, setRecipient] = useState<CanopiShareRecipient>({
    users: [],
    emailHint: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareThreadKind, setShareThreadKind] = useState<ThreadShareKind>('live');
  const [directDelivered, setDirectDelivered] = useState(false);
  const [directDeliveredCount, setDirectDeliveredCount] = useState(0);
  const [inviteMessage, setInviteMessage] = useState('');
  const [emailDeliverySummary, setEmailDeliverySummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { activeShares, refresh: refreshThreadShares } = useThreadShares(threadId, open);
  const invitedParticipantLines = listShareParticipantLines(activeShares);

  useEffect(() => {
    if (!open) return;
    void refreshThreadShares();
  }, [open, shareRefreshKey, refreshThreadShares]);

  function summarizeInviteEmails(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const result = raw as {
      sent?: number;
      failed?: number;
      skippedNoEmail?: number;
      resendConfigured?: boolean;
    };
    if (result.resendConfigured === false) {
      return 'Access was added in Deepi, but invite email is not configured on the server. Tell them to open Deepi and check Shared → With me.';
    }
    const parts: string[] = [];
    if (result.sent) {
      parts.push(
        `Email sent to ${result.sent} ${result.sent === 1 ? 'person' : 'people'}.`,
      );
    }
    if (result.skippedNoEmail) {
      parts.push(
        `${result.skippedNoEmail} ${result.skippedNoEmail === 1 ? 'person has' : 'people have'} no email on file – mention Deepi to them directly.`,
      );
    }
    if (result.failed) {
      parts.push(`${result.failed} invite email(s) could not be delivered.`);
    }
    if (!parts.length && result.resendConfigured) {
      return 'They can open Deepi and find this chat under Shared → With me.';
    }
    return parts.length ? parts.join(' ') : null;
  }

  useEffect(() => {
    if (!open) return;
    setVisibility(anchorTurnId ? 'from_share_point' : 'full');
    setSendeeRole(communityInvite ? 'member' : 'watcher');
    setRecipient({ users: [], emailHint: '' });
    setError(null);
    setLinkUrl(null);
    setShareId(null);
    setCopied(false);
    setDirectDelivered(false);
    setDirectDeliveredCount(0);
    setInviteMessage('');
    setEmailDeliverySummary(null);
    setShareThreadKind(anchorTurnId ? 'live' : 'live');
  }, [open, anchorTurnId, threadId, communityInvite]);

  if (!open) return null;

  const fullLink = linkUrl
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${linkUrl}`
    : null;

  /** Community invite from the chat header: pick people and send. No link/anchor UX. */
  const simplifiedCommunityInvite = communityInvite && !anchorTurnId;

  const createShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const pickedRecipients = recipientsPayloadFromShareSelection(recipient);
      const recipientEmail = recipientEmailFromShareSelection(recipient);
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility,
          sendeeRole,
          senderRetainsWatch,
          expiresInHours,
          anchorTurnId: visibility === 'from_share_point' ? anchorTurnId : undefined,
          recipients: pickedRecipients.length > 0 ? pickedRecipients : undefined,
          recipientEmail: pickedRecipients.length === 0 ? recipientEmail || undefined : undefined,
          shareThreadKind: anchorTurnId && shareThreadKind === 'fork_snapshot' ? 'fork_snapshot' : 'live',
          communityInvite: simplifiedCommunityInvite || communityInvite,
          chatTitle: threadTitle,
          inviteMessage: inviteMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create share');
      const deliveredCount = Number(data.directDeliveredCount || 0);
      setLinkUrl(data.linkUrl || null);
      setShareId(data.share?.id || null);
      setDirectDelivered(Boolean(data.directDelivered));
      setDirectDeliveredCount(deliveredCount);
      setEmailDeliverySummary(summarizeInviteEmails(data.inviteEmails));
      onShared?.({
        linkUrl: data.linkUrl,
        shareId: data.share?.id,
        directDelivered: Boolean(data.directDelivered),
        directDeliveredCount: deliveredCount,
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
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl flex flex-col"
        role="dialog"
        aria-labelledby="hermes-share-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="hermes-share-title" className="text-lg font-semibold text-white">
            {communityInvite ? 'Invite to Community Chat' : 'Share conversation'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{threadTitle || 'Deepi thread'}</p>
          {anchorTurnId && anchorLabel ? (
            <p className="mt-2 rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100">
              Share point: {anchorLabel}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4 flex-1">
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {!shareId ? (
            <>
              <CanopiInviteRecipientField
                value={recipient}
                onChange={setRecipient}
                disabled={busy}
              />

              {simplifiedCommunityInvite ? (
                <label className="block text-sm text-slate-300">
                  Message for invitees
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value.slice(0, 500))}
                    disabled={busy}
                    rows={3}
                    placeholder="What is this chat about? This goes in the invite email and helps people know why to join."
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
                  />
                  <span className="mt-1 block text-xs text-slate-500">
                    Included in the invite email. They also get access in Deepi under Shared → With me.
                  </span>
                </label>
              ) : null}

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

              {!simplifiedCommunityInvite ? (
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
              ) : null}

              {!simplifiedCommunityInvite ? (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Recipient permissions
                  </legend>
                  {communityInvite ? (
                    <p className="text-sm text-slate-300">
                      Invitees join as members and can prompt Deepi in this Community Chat.
                    </p>
                  ) : (
                    <>
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
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                        <input
                          type="radio"
                          name="role"
                          checked={sendeeRole === 'member'}
                          onChange={() => setSendeeRole('member')}
                        />
                        Member (can prompt without taking control)
                      </label>
                    </>
                  )}
                </fieldset>
              ) : null}

              {!simplifiedCommunityInvite ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={senderRetainsWatch}
                    onChange={(e) => setSenderRetainsWatch(e.target.checked)}
                  />
                  Keep my watch access after sharing
                </label>
              ) : null}

              {!simplifiedCommunityInvite ? (
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
              ) : null}

              {!simplifiedCommunityInvite ? (
                <p className="text-xs text-slate-500">
                  No one can truncate or regenerate turns before the share anchor. To change earlier history, fork instead.
                </p>
              ) : null}

              {communityInvite && !shareId && invitedParticipantLines.length > 0 ? (
                <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Already invited
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
            </>
          ) : directDelivered ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {directDeliveredCount > 1
                  ? `Shared directly with ${directDeliveredCount} people: ${recipientLabelFromShareSelection(recipient)}.`
                  : `Shared directly with ${recipientLabelFromShareSelection(recipient)}.`}
                {sendeeRole === 'controller'
                  ? ' They must accept control before sending prompts.'
                  : sendeeRole === 'member'
                    ? ' They can open it from Shared with me and prompt Deepi.'
                    : ' They can open it from Shared with me.'}
              </p>
              {recipient.users.length > 1 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {recipientLabelsFromShareSelection(recipient).map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
              {emailDeliverySummary ? (
                <p className="text-sm text-cyan-100/90">{emailDeliverySummary}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Share link created.
                {recipientEmailFromShareSelection(recipient)
                  ? ` Intended for ${recipientLabelFromShareSelection(recipient)}.`
                  : ' Copy and send it to your recipient.'}
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
              {busy
                ? 'Sharing…'
                : communityInvite
                  ? recipient.users.length > 1
                    ? `Invite ${recipient.users.length} people`
                    : 'Invite'
                  : recipient.users.length > 1
                    ? `Share with ${recipient.users.length} people`
                    : 'Share'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
