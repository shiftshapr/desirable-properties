'use client';

import SendFromMyEmailButton from '@/components/workgroup/SendFromMyEmailButton';

type Props = {
  busy?: boolean;
  platformDone?: boolean;
  mailto?: string;
  subject?: string;
  body?: string;
  onPlatformSend: () => Promise<void>;
  onClientPrepare: () => Promise<void>;
};

export default function WorkgroupInviteSendConfirm({
  busy,
  platformDone,
  mailto,
  subject,
  body,
  onPlatformSend,
  onClientPrepare,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Send invitation</h3>
        <p className="mt-1 text-sm text-slate-400">
          Both options create tracked join links. Platform send delivers via Desirable Properties email;
          send from your email opens your mail client.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <button
            type="button"
            disabled={busy || platformDone}
            onClick={() => void onPlatformSend()}
            className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50 sm:w-auto"
          >
            {platformDone ? 'Invitation sent' : busy ? 'Sending…' : 'Send invitation'}
          </button>
          <p className="text-xs text-slate-500">
            From your name via platform mail · Reply-To your address
          </p>
        </div>
        <div className="flex-1">
          <SendFromMyEmailButton
            mailto={mailto}
            subject={subject}
            body={body}
            busy={busy}
            onPrepare={onClientPrepare}
          />
        </div>
      </div>
    </div>
  );
}
