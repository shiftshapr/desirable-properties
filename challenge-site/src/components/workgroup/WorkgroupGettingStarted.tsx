import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import LaunchBriefingLink from '@/components/workgroup/LaunchBriefingLink';
import WorkgroupCanopiStrip from '@/components/workgroup/WorkgroupCanopiStrip';
import { MESSAGE_A_SECTIONS } from '@/lib/dp-welcome-content';
import { CHALLENGE_KEY_DATES } from '@/lib/dp-welcome-content.generated';
import {
  bookDiscussHref,
  bookIntroDiscussHref,
  DP_DISCOVERY_ASK_ITEMS,
  govhubDraftReadHref,
  govhubUrl,
  isDpDiscoveryWorkgroup,
} from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

type Props = {
  workgroupName: string;
  workgroupSlug: string;
  dpId: string | null;
  dpDetailHref: string | null;
  documentHref?: string | null;
  showLaunchBriefing?: boolean;
};

export default function WorkgroupGettingStarted({
  workgroupName,
  workgroupSlug,
  dpId,
  dpDetailHref,
  documentHref,
  showLaunchBriefing = false,
}: Props) {
  const welcomeHref = `/welcome/member?wg=${encodeURIComponent(workgroupSlug)}`;
  const govHubHref = govhubUrl(`/workgroups/${workgroupSlug}/`);
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const discussHref = isDiscovery
    ? bookIntroDiscussHref()
    : bookDiscussHref(dpId ? { dpId } : undefined);
  const patchHref = isDiscovery ? null : govhubDraftReadHref(documentHref);
  const a = MESSAGE_A_SECTIONS;
  const askItems = isDiscovery ? [...DP_DISCOVERY_ASK_ITEMS] : a.askItems.slice(0, 4);

  const launchLabel = CHALLENGE_KEY_DATES.bookLaunch.label;

  return (
    <div>
      {showLaunchBriefing ? (
        <div className="mb-8 rounded-xl border border-amber-800/50 bg-amber-950/25 p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
            {launchLabel} Community Review Draft
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Astra editorial synthesis integrated 117 traceable changes across 22 chapters ahead of
            the public launch. Members can now propose chapter edits on the Edit tab; coordinators
            can revoke Astra patches or member edits. Read what is included and how to participate
            before September 16.
          </p>
          <div className="mt-4">
            <LaunchBriefingLink
              workgroupSlug={workgroupSlug}
              label="About this launch"
              className="inline-flex rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
            />
          </div>
        </div>
      ) : null}

      <WorkgroupCanopiStrip workgroupSlug={workgroupSlug} dpId={dpId} compact />

      <p className="mt-8 max-w-3xl text-sm text-slate-400">
        This page adds chat and AI invites on top of the existing Desirable Properties workgroup
        experience – welcome guide, DP detail, and Gov Hub drafting all remain available.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {dpDetailHref ? (
          <Link
            href={dpDetailHref}
            className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            {dpId ? `${dpId} detail page` : 'DP detail page'}
          </Link>
        ) : null}
        <Link
          href={welcomeHref}
          className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Member welcome guide
        </Link>
        <DiscussPatchLink
          href={discussHref}
          className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          {isDiscovery ? 'Discuss →' : 'Discuss & patch this chapter →'}
        </DiscussPatchLink>
        {patchHref ? (
          <a
            href={patchHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Patch draft on Gov Hub
          </a>
        ) : null}
        <a
          href={govHubHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Open on Gov Hub
        </a>
        <Link
          href={WORKGROUPS_LIST_HREF}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          All workgroups
        </Link>
        {dpId ? (
          <Link
            href="/editorial-synthesis"
            className="rounded-lg border border-violet-800/60 bg-violet-950/30 px-4 py-2 text-sm text-violet-200 hover:border-violet-600"
          >
            Editorial synthesis index
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
            {a.missionTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{a.missionBody}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
            {a.askTitle}
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300 marker:text-cyan-500">
            {askItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Workgroup: <span className="font-medium text-slate-200">{workgroupName}</span>
      </p>
    </div>
  );
}
