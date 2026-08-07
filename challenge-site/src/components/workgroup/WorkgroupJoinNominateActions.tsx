'use client';

import WorkgroupJoinPanel from '@/components/workgroup/WorkgroupJoinPanel';
import WorkgroupNominatePanel from '@/components/workgroup/WorkgroupNominatePanel';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  joinFallbackHref?: string;
  nominateFallbackHref?: string;
};

/** Compact join + nominate controls for collab-enabled join cards. */
export default function WorkgroupJoinNominateActions({
  workgroupId,
  workgroupName,
  joinFallbackHref,
  nominateFallbackHref,
}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <WorkgroupJoinPanel
        workgroupId={workgroupId}
        workgroupName={workgroupName}
        fallbackHref={joinFallbackHref}
      />
      <WorkgroupNominatePanel
        workgroupId={workgroupId}
        fallbackHref={nominateFallbackHref}
      />
    </div>
  );
}
