'use client';

import SendFromMyEmailButton from '@/components/workgroup/SendFromMyEmailButton';

type Props = {
  sendBusy?: boolean;
  draftBusy?: boolean;
  platformDone?: boolean;
  mailto?: string;
  subject?: string;
  body?: string;
  recipientName?: string;
  recipientEmail?: string;
  onPlatformSend: () => Promise<void>;
  onClientPrepare: () => Promise<void>;
  onEditDraft?: () => void;
};

export default function WorkgroupInviteSendConfirm({
  sendBusy,
  draftBusy,
  platformDone,
  mailto,
  subject,
  body,
  recipientName,
  recipientEmail,
  onPlatformSend,
  onClientPrepare,
  onEditDraft,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Send invitation</h3>
        {recipientName || recipientEmail ? (
          <p className="mt-2 text-sm text-slate-200">
            <span className="text-slate-500">To: </span>
            {recipientName ? <span className="font-medium text-white">{recipientName}</span> : null}
            {recipientEmail ? (
              <span className="text-slate-300">
                {recipientName ? ' ' : ''}
                &lt;{recipientEmail}&gt;
              </span>
            ) : null}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-slate-400">
          Both options create tracked join links. Platform send delivers via Desirable Properties email;
          send from your email opens your mail client.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sendBusy || draftBusy || platformDone}
              onClick={() => void onPlatformSend()}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {platformDone ? 'Invitation sent' : sendBusy ? 'Sending…' : 'Send invitation'}
            </button>
            {onEditDraft && !platformDone ? (
              <button
                type="button"
                disabled={sendBusy || draftBusy}
                onClick={onEditDraft}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
              >
                Edit draft
              </button>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            From your name via platform mail · Reply-To your address
          </p>
        </div>
        <div className="flex-1">
          <SendFromMyEmailButton
            mailto={mailto}
            subject={subject}
            body={body}
            busy={sendBusy}
            onPrepare={onClientPrepare}
          />
        </div>
      </div>
    </div>
  );
}
