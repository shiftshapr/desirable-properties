import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { CHALLENGE_KEY_DATES } from '@/lib/dp-welcome-content.generated';
import { challengeMeta } from '@/lib/challengeTimeline';
import { bookDiscussHref } from '@/lib/govhub';

type Props = {
  workgroupSlug?: string | null;
  workgroupName?: string | null;
};

function BriefingSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="border-b border-slate-800 pb-2 text-xl font-bold text-white sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function LaunchBriefingPanel({ workgroupSlug, workgroupName }: Props) {
  const launchLabel = CHALLENGE_KEY_DATES.bookLaunch.label;
  const v1Label = CHALLENGE_KEY_DATES.v1Release.label;
  const launchTitle = challengeMeta.book_launch_title;
  const coordinatorHref = workgroupSlug
    ? `/welcome/coordinator?wg=${encodeURIComponent(workgroupSlug)}`
    : '/welcome/coordinator';

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 sm:p-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-amber-300">
          Why this page exists
        </p>
        <p className="mt-3 text-base leading-relaxed text-slate-200">
          The {launchLabel} launch is new. The latest AI model enabled editorial synthesis across
          hundreds of community proposals. This milestone delivers a scoped Community Review Draft,
          not the complete Version {challengeMeta.target_version} book.
        </p>
      </section>

      <BriefingSection id="what-happened" title="What happened">
        <p>
          More than 300 community proposals were reconciled by{' '}
          <strong className="font-semibold text-white">Astra</strong>, the editorial synthesis
          workflow. The result is{' '}
          <strong className="font-semibold text-white">117 traceable changes</strong> across{' '}
          <strong className="font-semibold text-white">22 chapters</strong>, each with full
          provenance in Canopi and Astra change records.
        </p>
        <p>
          <strong className="font-semibold text-white">DP23</strong> was reviewed and left unchanged
          for this release.
        </p>
        <p className="text-sm text-slate-400">
          Public milestone: {launchTitle} ({launchLabel}).
        </p>
      </BriefingSection>

      <BriefingSection id="what-this-is-not" title="What this is not">
        <ul className="list-disc space-y-2 pl-5 marker:text-amber-500">
          <li>
            <strong className="font-semibold text-white">
              Not Desirable Properties Version {challengeMeta.target_version}
            </strong>{' '}
            – the mature edition remains targeted for {v1Label}.
          </li>
          <li>
            <strong className="font-semibold text-white">Not every valid proposal integrated</strong>{' '}
            – many strong ideas are preserved for future editorial cycles rather than forced into
            this launch window.
          </li>
          <li>
            <strong className="font-semibold text-white">
              Not replacing Gov Hub ML-Draft baselines or Canopi patching
            </strong>{' '}
            – workgroups continue to patch and steward drafts on Gov Hub and Canopi; Astra synthesis
            sits alongside that workflow.
          </li>
        </ul>
      </BriefingSection>

      <BriefingSection id="members" title="What members can do">
        <ul className="list-disc space-y-2 pl-5 marker:text-cyan-500">
          <li>
            Read the <strong className="font-semibold text-white">Astra</strong> tab in your
            workgroup to see synthesized chapter text and individual change records.
          </li>
          <li>
            Propose chapter edits on the <strong className="font-semibold text-white">Edit</strong>{' '}
            tab once you join the workgroup. Saved edits show with track-changes (green add / red
            strikeout) or clean read, with your name on the attribution banner.
          </li>
          <li>Discuss proposals and reactions in workgroup chat.</li>
          <li>
            Comment on chapters on the book (
            <DiscussPatchLink href={bookDiscussHref()} className="text-cyan-300 hover:text-cyan-200">
              book.desirableproperties.org
            </DiscussPatchLink>
            ).
          </li>
          <li>Suggest improvements through chat, book comments, Gov Hub patches, and Edit tab markdown.</li>
        </ul>
      </BriefingSection>

      <BriefingSection id="coordinators" title="What coordinators and leads can do">
        <ul className="list-disc space-y-2 pl-5 marker:text-violet-500">
          <li>
            Revoke misfit Astra patches on the{' '}
            <strong className="font-semibold text-white">Edit</strong> tab when a change does not
            fit your chapter.
          </li>
          <li>
            Revoke member chapter edits that miss the mark; members can propose new versions from
            the effective chapter baseline.
          </li>
          <li>Curate the most effective chapter text for your Desirable Property.</li>
          <li>Invite members and co-leads through workgroup invite tools.</li>
        </ul>
      </BriefingSection>

      <BriefingSection id="links" title="Related links">
        <ul className="space-y-3">
          <li>
            <Link
              href="/editorial-synthesis"
              className="font-medium text-cyan-300 hover:text-cyan-200"
            >
              Editorial synthesis index →
            </Link>
            <span className="mt-1 block text-sm text-slate-500">
              Cross-chapter view of Astra synthesis and provenance.
            </span>
          </li>
          <li>
            <Link href="/challenge#timeline" className="font-medium text-cyan-300 hover:text-cyan-200">
              Challenge timeline →
            </Link>
            <span className="mt-1 block text-sm text-slate-500">
              Full milestone history including the {launchLabel} launch and {v1Label} Version{' '}
              {challengeMeta.target_version} target.
            </span>
          </li>
          <li>
            <Link href={coordinatorHref} className="font-medium text-cyan-300 hover:text-cyan-200">
              Coordinator welcome guide →
            </Link>
            <span className="mt-1 block text-sm text-slate-500">
              Combined member and coordinator orientation for workgroup leads.
            </span>
          </li>
          <li>
            <Link href="/welcome/member" className="font-medium text-cyan-300 hover:text-cyan-200">
              Member welcome guide →
            </Link>
          </li>
        </ul>
      </BriefingSection>

      {workgroupName ? (
        <p className="border-t border-slate-800 pt-6 text-sm text-slate-400">
          Viewing in context of workgroup{' '}
          <span className="font-medium text-slate-200">{workgroupName}</span>
          {workgroupSlug ? (
            <>
              {' '}
              (
              <Link
                href={`/workgroups/${encodeURIComponent(workgroupSlug)}`}
                className="text-cyan-300 hover:text-cyan-200"
              >
                return to workgroup
              </Link>
              )
            </>
          ) : null}
          .
        </p>
      ) : null}
    </div>
  );
}
