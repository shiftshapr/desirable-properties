import Link from 'next/link';
import { launchBriefingHref } from '@/lib/dp-launch-briefing';

type Props = {
  workgroupSlug?: string | null;
  className?: string;
  label?: string;
};

const DEFAULT_LABEL = 'Pre-launch briefing';

export default function LaunchBriefingLink({
  workgroupSlug,
  className,
  label = DEFAULT_LABEL,
}: Props) {
  return (
    <Link
      href={launchBriefingHref(workgroupSlug)}
      className={
        className ??
        'rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600'
      }
    >
      {label}
    </Link>
  );
}
