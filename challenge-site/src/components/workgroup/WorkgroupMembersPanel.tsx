'use client';

import { formatWorkgroupRoleBadges } from '@/lib/workgroup-role-labels';
import { canopiAvatarSrc } from '@/lib/canopi-public-profile';
import type { WorkgroupRosterMember } from '@/lib/workgroup-collab-api';

type Props = {
  workgroupName: string;
  members: WorkgroupRosterMember[];
  coordinatorId?: string | null;
  coordinatorName?: string | null;
};

function formatJoinedAt(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MemberIdentity({ member }: { member: WorkgroupRosterMember }) {
  const avatar = canopiAvatarSrc(member.canopi_avatar_url);
  const profileUrl = member.canopi_profile_url;
  const label = member.user_name;

  const inner = (
    <span className="flex items-center gap-3">
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
            {label.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className={`font-medium ${profileUrl ? 'text-cyan-200' : 'text-slate-100'}`}>
        {label}
      </span>
    </span>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="transition hover:text-cyan-200"
      >
        {inner}
      </a>
    );
  }

  return inner;
}

export default function WorkgroupMembersPanel({
  workgroupName,
  members,
  coordinatorId,
  coordinatorName,
}: Props) {
  const sorted = [...members].sort((a, b) => {
    const aCoord = coordinatorId && a.user_id === coordinatorId ? 0 : 1;
    const bCoord = coordinatorId && b.user_id === coordinatorId ? 0 : 1;
    if (aCoord !== bCoord) return aCoord - bCoord;
    const aLead = a.positions.length > 0 ? 0 : 1;
    const bLead = b.positions.length > 0 ? 0 : 1;
    if (aLead !== bLead) return aLead - bLead;
    return a.user_name.localeCompare(b.user_name, undefined, { sensitivity: 'base' });
  });

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">Roster</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{workgroupName} members</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Active workgroup members and approved leadership roles from Gov Hub.
          {coordinatorName ? (
            <>
              {' '}
              Coordinator: <span className="text-slate-200">{coordinatorName}</span>.
            </>
          ) : null}
        </p>
      </header>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No members listed yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sorted.map((member) => {
                const roleLabels = formatWorkgroupRoleBadges(member, coordinatorId);
                return (
                  <tr key={member.user_id} className="bg-slate-950/20">
                    <td className="px-4 py-3">
                      <MemberIdentity member={member} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {roleLabels.map((label) => (
                          <span
                            key={`${member.user_id}-${label}`}
                            className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-0.5 text-xs text-slate-200"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatJoinedAt(member.joined_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
