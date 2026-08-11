import Link from 'next/link';
import DpSealBadge from '@/components/badges/DpSealBadge';
import type { SeriesProgress } from '@/lib/dp-event-series-store';
import {
  FORK_PEARL_BADGE_CENTER,
  forkSeriesBadgeTopLabel,
} from '@/lib/dp-series-badges';

type Props = {
  seriesSlug: string;
  seriesTitle: string;
  badgeImageUrl: string | null;
  pearlBadgeImageUrl: string | null;
  progress?: SeriesProgress | null;
  showSeriesBadgeAnchor?: boolean;
};

export default function SeriesBadgeCards({
  seriesSlug,
  seriesTitle,
  badgeImageUrl,
  pearlBadgeImageUrl,
  progress = null,
  showSeriesBadgeAnchor = true,
}: Props) {
  const topLabel = forkSeriesBadgeTopLabel(seriesSlug, seriesTitle);
  const pearlOverlay = pearlBadgeImageUrl || FORK_PEARL_BADGE_CENTER;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div
        {...(showSeriesBadgeAnchor ? { id: 'series-badge' } : {})}
        className={`rounded-xl border border-slate-800 bg-slate-900/50 p-5 ${showSeriesBadgeAnchor ? 'scroll-mt-24' : ''}`}
      >
        <p className="text-sm font-medium text-slate-300">Series badge</p>
        {badgeImageUrl ? (
          <div className="mt-3">
            <DpSealBadge
              centerSrc={badgeImageUrl}
              topLabel={topLabel}
              size={96}
              alt={`${topLabel} series badge`}
            />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Complete the session question set (attend/watch + submit) for all four sessions.
        </p>
      </div>
      <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-5">
        <p className="text-sm font-medium text-violet-200">PEARL badge</p>
        {badgeImageUrl ? (
          <div className="mt-3">
            <DpSealBadge
              centerSrc={badgeImageUrl}
              pearlOverlaySrc={pearlOverlay}
              topLabel={topLabel}
              size={96}
              alt={`${topLabel} PEARL badge`}
              variant="pearl"
            />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-slate-400">
          Patch idea → socialize → feedback → verified patch → reflect.
        </p>
        <Link
          href={`/series/${seriesSlug}/pearl`}
          className="mt-3 inline-block text-sm text-violet-300 hover:text-violet-200"
        >
          PEARL track →
        </Link>
        {progress?.pearlBadgeGranted ? (
          <p className="mt-2 text-sm text-emerald-300">PEARL badge earned!</p>
        ) : null}
      </div>
    </div>
  );
}
