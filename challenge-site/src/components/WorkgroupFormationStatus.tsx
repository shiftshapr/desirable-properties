import Image from 'next/image';
import Link from 'next/link';
import localData from '@/data/desirable-properties.json';
import { extractDpId, govhubUrl, type GovHubWorkgroup } from '@/lib/govhub';
import { dpBadgeImageSrc, dpImageAlt } from '@/lib/dp-images';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';
import { workgroupGovHubHref, workgroupPrimaryHref } from '@/lib/workgroup-links';

type Props = {
  workgroups: GovHubWorkgroup[];
  memberWorkgroupIds?: Set<string>;
};

type Row = {
  dp: (typeof localData.desirable_properties)[number];
  wg: GovHubWorkgroup | undefined;
  active: boolean;
};

function WorkgroupCard({
  dp,
  wg,
  active,
  collabEnabled,
  isMember,
}: Row & { collabEnabled: boolean; isMember: boolean }) {
  const badgeSrc = dpBadgeImageSrc(dp.id);
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
        active
          ? 'border-emerald-900/50 bg-emerald-950/20'
          : 'border-amber-900/40 bg-amber-950/10'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2 font-medium text-slate-200">
        {badgeSrc ? (
          <Image
            src={badgeSrc}
            alt={dpImageAlt(dp.id, dp.name)}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-md border border-slate-700/80 object-cover"
          />
        ) : null}
        <span className="min-w-0 truncate">
          <span className="mr-2 text-xs text-slate-500">{dp.id}</span>
          {dp.name.length > 32 ? `${dp.name.slice(0, 30)}…` : dp.name}
        </span>
      </span>
      <span className="ml-2 flex shrink-0 flex-col items-end gap-1">
        {active && wg ? (
          <>
            {collabEnabled ? (
              <Link
                href={workgroupPrimaryHref(wg.slug)}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                Collaborate
              </Link>
            ) : null}
            {isMember ? (
              <span className="text-xs text-emerald-300">Member</span>
            ) : (
              <a
                href={workgroupGovHubHref(wg.slug, 'join')}
                className="text-xs text-cyan-300 hover:text-cyan-200"
              >
                Join
              </a>
            )}
            <a
              href={workgroupGovHubHref(wg.slug, 'nominate')}
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              Nominate
            </a>
          </>
        ) : (
          <>
            <span className="text-xs text-amber-400/90">Needs group</span>
            <a
              href={govhubUrl('/layers/the-metaweb/#workgroups')}
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              Nominate
            </a>
          </>
        )}
      </span>
    </div>
  );
}

export default async function WorkgroupFormationStatus({
  workgroups,
  memberWorkgroupIds = new Set(),
}: Props) {
  const collabEnabled = await isWorkgroupCollabEnabled();
  const dpWorkgroups = new Map<string, GovHubWorkgroup>();
  for (const wg of workgroups) {
    const dpId = extractDpId(wg.name);
    if (dpId) dpWorkgroups.set(dpId, wg);
  }

  const rows: Row[] = localData.desirable_properties.map((dp) => {
    const wg = dpWorkgroups.get(dp.id);
    const active = wg?.status === 'active';
    return { dp, wg, active };
  });

  const activeCount = rows.filter((r) => r.active).length;
  const total = rows.length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Workgroup formation</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Each Desirable Property needs a workgroup with coordinators and contributors. Join an
            existing group or help stand one up before August 30.
          </p>
        </div>
        <p className="shrink-0 text-sm text-slate-400">
          <span className="text-2xl font-semibold text-white">{activeCount}</span>
          <span className="text-slate-500"> / {total}</span>
          <span className="ml-1">active workgroups</span>
        </p>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <WorkgroupCard
            key={row.dp.id}
            {...row}
            collabEnabled={collabEnabled}
            isMember={Boolean(row.wg && memberWorkgroupIds.has(row.wg.id))}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/workgroups/join"
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
        >
          Join or coordinate a workgroup
        </Link>
        <a
          href={govhubUrl('/layers/the-metaweb/#workgroups')}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Nominate
        </a>
        <Link
          href="/#dps"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Browse all DPs
        </Link>
      </div>
    </div>
  );
}
