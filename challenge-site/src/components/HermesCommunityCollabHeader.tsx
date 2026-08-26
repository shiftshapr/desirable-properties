'use client';

import type { CommunityCollabParticipant } from '@/lib/hermes-community-collab';

type HermesCommunityCollabHeaderProps = {
  title: string;
  participants: CommunityCollabParticipant[];
  isOwner: boolean;
  isMember: boolean;
  onInvite?: () => void;
};

export default function HermesCommunityCollabHeader({
  title,
  participants,
  isOwner,
  isMember,
  onInvite,
}: HermesCommunityCollabHeaderProps) {
  const memberCount = participants.length;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="shrink-0 rounded-full border border-teal-700/60 bg-teal-950/40 px-2 py-0.5 text-[11px] font-medium text-teal-200">
          Community Chat
        </span>
        {isMember && !isOwner ? (
          <span className="shrink-0 rounded-full border border-cyan-700/60 bg-cyan-950/40 px-2 py-0.5 text-[11px] text-cyan-200">
            Member
          </span>
        ) : null}
        <p className="min-w-0 truncate text-sm font-medium text-white">{title}</p>
      </div>
      {memberCount > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>
            {memberCount} participant{memberCount === 1 ? '' : 's'}
          </span>
          {participants.slice(0, 6).map((participant) => (
            <span
              key={`${participant.label}-${participant.role}`}
              className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-300"
              title={participant.role}
            >
              {participant.label}
            </span>
          ))}
          {memberCount > 6 ? (
            <span className="text-slate-500">+{memberCount - 6} more</span>
          ) : null}
        </div>
      ) : isOwner ? (
        <p className="text-[11px] text-slate-500">
          Invite people to join. Everyone you invite can prompt Deepi.
          {onInvite ? (
            <>
              {' '}
              <button
                type="button"
                onClick={onInvite}
                className="text-cyan-400 underline decoration-cyan-600/50 underline-offset-2 hover:text-cyan-200"
              >
                Invite now
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
