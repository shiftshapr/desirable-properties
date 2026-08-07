'use client';

import WorkgroupJoinPanel from '@/components/workgroup/WorkgroupJoinPanel';
import WorkgroupNominatePanel from '@/components/workgroup/WorkgroupNominatePanel';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  workgroupSlug?: string;
  joinFallbackHref?: string;
  nominateFallbackHref?: string;
  /** When true (from server membership check), hide the join control. */
  isMember?: boolean;
};

/** Compact join + nominate controls for collab-enabled join cards. */
export default function WorkgroupJoinNominateActions({
  workgroupId,
  workgroupName,
  workgroupSlug,
  joinFallbackHref,
  nominateFallbackHref,
  isMember = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {isMember ? (
        <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          You are a member
        </span>
      ) : (
        <WorkgroupJoinPanel
          workgroupId={workgroupId}
          workgroupName={workgroupName}
          workgroupSlug={workgroupSlug}
          fallbackHref={joinFallbackHref}
        />
      )}
      <WorkgroupNominatePanel
        workgroupId={workgroupId}
        fallbackHref={nominateFallbackHref}
      />
    </div>
  );
}
