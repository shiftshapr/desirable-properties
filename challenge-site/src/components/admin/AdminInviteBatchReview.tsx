'use client';

import WorkgroupInviteDraftEditor from '@/components/workgroup/WorkgroupInviteDraftEditor';
import WorkgroupInviteSendConfirm from '@/components/workgroup/WorkgroupInviteSendConfirm';
import type { MessageStrategy, ZohoContactCandidate } from '@/lib/admin-invite-api';
import type { PriorInvitation, WorkgroupCatalogEntry } from '@/lib/workgroup-collab-types';

function strategyLabel(strategy: MessageStrategy) {
  if (strategy === 'long_gap_reconnect') return 'Long-gap reconnection';
  if (strategy === 'recent_follow_up') return 'Recent follow-up';
  return 'Custom';
}

type Props = {
  batchQueue: ZohoContactCandidate[];
  batchIndex: number;
  messageStrategy: MessageStrategy;
  strategyConfirmed: boolean;
  draft: string;
  tone: string;
  length: string;
  primaryWorkgroupId: string;
  selectedExtraIds: string[];
  workgroupCatalog: WorkgroupCatalogEntry[];
  priorInvitations: PriorInvitation[];
  platformDone: boolean;
  sendBusy: boolean;
  draftBusy: boolean;
  mailto: string;
  mailSubject: string;
  mailBody: string;
  onMessageStrategyChange: (strategy: MessageStrategy) => void;
  onStrategyConfirmedChange: (confirmed: boolean) => void;
  onDraft: (draft: string) => void;
  onTone: (tone: string) => void;
  onLength: (length: string) => void;
  onPrimaryWorkgroupChange: (id: string) => void;
  onToggleExtra: (id: string) => void;
  onRegenerate: (tone: string, length: string) => void;
  onGenerateDraft: () => void;
  onPlatformSend: () => Promise<void>;
  onClientPrepare: () => Promise<void>;
  onSkip: () => void;
  onFocusDraft: () => void;
};

export default function AdminInviteBatchReview({
  batchQueue,
  batchIndex,
  messageStrategy,
  strategyConfirmed,
  draft,
  tone,
  length,
  primaryWorkgroupId,
  selectedExtraIds,
  workgroupCatalog,
  priorInvitations,
  platformDone,
  sendBusy,
  draftBusy,
  mailto,
  mailSubject,
  mailBody,
  onMessageStrategyChange,
  onStrategyConfirmedChange,
  onDraft,
  onTone,
  onLength,
  onPrimaryWorkgroupChange,
  onToggleExtra,
  onRegenerate,
  onGenerateDraft,
  onPlatformSend,
  onClientPrepare,
  onSkip,
  onFocusDraft,
}: Props) {
  const contact = batchQueue[batchIndex];
  const anyBusy = sendBusy || draftBusy;
  const hasDraft = Boolean(draft.trim());
  const recipientLabel = contact?.name?.trim() || contact?.email || 'Recipient';
  const recipientEmail = contact?.email?.trim() || '';
  const suggestedStrategy =
    contact?.message_strategy || contact?.suggested_strategy || 'long_gap_reconnect';
  const canSendGeneric = !primaryWorkgroupId && messageStrategy === 'long_gap_reconnect';
  const canSend = hasDraft && (Boolean(primaryWorkgroupId) || canSendGeneric);
  const needsWorkgroupForDraft =
    !hasDraft && !primaryWorkgroupId && messageStrategy !== 'long_gap_reconnect';

  return (
    <div
      id="batch-invite-panel"
      className="mt-4 space-y-5 rounded-xl border border-cyan-900/50 bg-cyan-950/15 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-100">
            Batch review {batchIndex + 1} of {batchQueue.length}
          </p>
          {contact ? (
            <p className="mt-1 text-xs text-cyan-200/80">
              {contact.message_count != null ? (
                <span>{contact.message_count} prior emails</span>
              ) : null}
              {contact.last_contact ? (
                <>
                  {contact.message_count != null ? ' · ' : null}
                  <span>
                    Last contact {new Date(contact.last_contact).toLocaleDateString()}
                  </span>
                </>
              ) : null}
              {contact.communication_style?.labels?.length ? (
                <>
                  {' · '}
                  <span>Style: {contact.communication_style.labels.join(', ')}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={anyBusy}
            onClick={onSkip}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-600 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={anyBusy || !canSend}
            onClick={onPlatformSend}
            className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {sendBusy ? 'Sending…' : 'Send & next'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/25 px-3 py-2.5">
        <p className="text-sm text-cyan-50/95">
          <span className="text-cyan-200/70">Inviting </span>
          <span className="font-medium text-white">{recipientLabel}</span>
          {recipientEmail ? (
            <>
              {' '}
              <span className="text-cyan-100/80">&lt;{recipientEmail}&gt;</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="text-cyan-100/90">Message approach</span>
          <select
            value={messageStrategy}
            onChange={(e) => onMessageStrategyChange(e.target.value as MessageStrategy)}
            disabled={anyBusy}
            className="mt-1 w-full rounded-lg border border-cyan-900/60 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="long_gap_reconnect">Long-gap reconnection</option>
            <option value="recent_follow_up">Recent follow-up</option>
            <option value="custom">Custom</option>
          </select>
          <span className="mt-1 block text-xs text-cyan-200/70">
            Suggested: {strategyLabel(suggestedStrategy)}
            {suggestedStrategy !== messageStrategy ? ' (overridden)' : ''}
          </span>
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm text-cyan-50">
          <input
            type="checkbox"
            checked={strategyConfirmed}
            onChange={(e) => onStrategyConfirmedChange(e.target.checked)}
            disabled={anyBusy || hasDraft}
          />
          Confirm message approach
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <label className="block text-sm">
          <span className="text-slate-300">Primary workgroup</span>
          <select
            value={primaryWorkgroupId}
            onChange={(e) => onPrimaryWorkgroupChange(e.target.value)}
            disabled={anyBusy}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">— No specific DP (generic reconnect) —</option>
            {workgroupCatalog.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        {!primaryWorkgroupId ? (
          <p className="mt-2 text-xs text-cyan-200/75">
            Generic reconnect — no workgroup join link. Pick a workgroup above if you want one in
            this send.
          </p>
        ) : null}
        {primaryWorkgroupId && workgroupCatalog.length > 1 ? (
          <fieldset className="mt-3">
            <legend className="text-sm text-slate-300">Also mention</legend>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {workgroupCatalog
                .filter((entry) => entry.id !== primaryWorkgroupId)
                .map((entry) => (
                  <li key={entry.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedExtraIds.includes(entry.id)}
                        onChange={() => onToggleExtra(entry.id)}
                        disabled={anyBusy}
                      />
                      {entry.name}
                    </label>
                  </li>
                ))}
            </ul>
          </fieldset>
        ) : null}
        {!hasDraft ? (
          <div className="mt-3">
            <button
              type="button"
              disabled={
                anyBusy || !strategyConfirmed || needsWorkgroupForDraft
              }
              onClick={onGenerateDraft}
              className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              {draftBusy ? 'Drafting…' : 'Generate email draft'}
            </button>
            {!strategyConfirmed ? (
              <p className="mt-2 text-xs text-amber-200/90">
                Confirm the message approach before generating a draft.
              </p>
            ) : needsWorkgroupForDraft ? (
              <p className="mt-2 text-xs text-amber-200/90">
                Select a workgroup or use generic reconnect (no specific DP) for long-gap drafts.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-cyan-200/80">
            Draft loaded — review and edit below, then send or skip.
          </p>
        )}
      </div>

      <WorkgroupInviteDraftEditor
        tone={tone}
        length={length}
        draft={draft}
        suggested={[]}
        selectedExtraIds={selectedExtraIds}
        priorInvitations={priorInvitations}
        busy={draftBusy}
        onTone={onTone}
        onLength={onLength}
        onDraft={onDraft}
        onToggleExtra={onToggleExtra}
        onRegenerate={onRegenerate}
      />

      <WorkgroupInviteSendConfirm
        sendBusy={sendBusy}
        draftBusy={draftBusy}
        platformDone={platformDone}
        mailto={mailto}
        subject={mailSubject}
        body={mailBody}
        recipientName={recipientLabel}
        recipientEmail={recipientEmail}
        onPlatformSend={onPlatformSend}
        onClientPrepare={onClientPrepare}
        onEditDraft={onFocusDraft}
      />
    </div>
  );
}
