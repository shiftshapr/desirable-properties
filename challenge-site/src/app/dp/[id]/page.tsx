import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import CivicChallengeCampaign from '@/components/CivicChallengeCampaign';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import DpPageQuickActions from '@/components/dp/DpPageQuickActions';
import DPProvenanceSection from '@/components/DPProvenanceSection';
import RelatedPathway from '@/components/pathways/RelatedPathway';
import PCIProvenanceSection from '@/components/PCIProvenanceSection';
import { AI_HUMAN_AGENCY_RELATED_DP_IDS } from '@/data/pathways/ai-human-agency';
import localData from '../../../data/desirable-properties.json';
import {
  bookDiscussHref,
  extractDpId,
  fetchChallengeWorkgroups,
  GOVHUB_DP_PATCHES_URL,
  govhubDraftReadHref,
  govhubUrl,
} from '@/lib/govhub';
import { getCivicChallenge } from '@/lib/civic-challenges';
import { dpFullImageSrc, dpImageAlt } from '@/lib/dp-images';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';
import { readSessionMemberWorkgroupIds } from '@/lib/workgroup-membership.server';
import { workgroupGovHubHref, workgroupPrimaryHref } from '@/lib/workgroup-links';
import {
  loadDpProvenance,
  dpInscriptionUrl,
  dpGovHubDraftUrl,
  dpPdfDownloadUrl,
  dpPdfDownloadFilename,
  loadPciProvenanceForDp,
} from '@/lib/dpProvenance';
import { resolveBackPath, sanitizeRelativePath } from '@/lib/dp-links';
import { notFound } from 'next/navigation';

export const revalidate = 300;

type LocalDp = (typeof localData.desirable_properties)[number];

export function generateStaticParams() {
  return localData.desirable_properties.map((dp) => ({
    id: dp.id.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dp = localData.desirable_properties.find(
    (d) => d.id.toLowerCase() === id.toLowerCase(),
  );
  if (!dp) return { title: 'Desirable Property' };
  const challenge = getCivicChallenge(dp.id);
  if (challenge) {
    return {
      title: `${dp.id} – ${challenge.title}`,
      description: `${challenge.guidingQuestion} ${challenge.humanIssue}`,
    };
  }
  return {
    title: `${dp.id} – ${dp.name}`,
    description: dp.landing_subtitle || dp.description,
  };
}

function tabHref(dpId: string, view: 'campaign' | 'spec', from?: string | null): string {
  const base = `/dp/${dpId.toLowerCase()}`;
  const qs = new URLSearchParams();
  if (view === 'spec') qs.set('view', 'spec');
  const safeFrom = sanitizeRelativePath(from);
  if (safeFrom) qs.set('from', safeFrom);
  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}

function SpecView({
  dp,
  workgroup,
  draftHref,
  readHref,
  collabEnabled,
  workgroupHref,
  workgroupJoinHref,
  workgroupNominateHref,
  isWorkgroupMember,
  onchainDraftHref,
  govhubDraftHref,
  pdfDownloadHref,
  pdfDownloadName,
  provenance,
  pciLinks,
}: {
  dp: LocalDp;
  workgroup: Awaited<ReturnType<typeof fetchChallengeWorkgroups>>[number] | undefined;
  draftHref: string | null;
  readHref: string | null;
  collabEnabled: boolean;
  workgroupHref: string | null;
  workgroupJoinHref: string | null;
  workgroupNominateHref: string | null;
  isWorkgroupMember: boolean;
  onchainDraftHref: string | null;
  govhubDraftHref: string | null;
  pdfDownloadHref: string | null;
  pdfDownloadName: string | null;
  provenance: ReturnType<typeof loadDpProvenance>;
  pciLinks: ReturnType<typeof loadPciProvenanceForDp>;
}) {
  return (
    <>
      <section className="mt-8">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Overview</h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">{dp.description}</p>
      </section>

      {dp.landing_text ? (
        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Why It Matters</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{dp.landing_text}</p>
        </section>
      ) : null}

      {dp.elements?.length > 0 ? (
        <section className="mt-10">
          <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">Key Elements</h2>
          <div className="mt-4 space-y-3">
            {dp.elements.map((el) => (
              <div key={el.name} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="font-semibold text-cyan-300">{el.name}</h3>
                <p className="mt-2 text-slate-300">{el.description}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {AI_HUMAN_AGENCY_RELATED_DP_IDS.includes(
        dp.id as (typeof AI_HUMAN_AGENCY_RELATED_DP_IDS)[number],
      ) ? (
        <RelatedPathway dpId={dp.id} />
      ) : null}

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-bold">Current Draft</h2>
          {(() => {
            const rawLabel = workgroup?.document_label || '';
            const match = rawLabel.match(/^(.*?)\s*\((ML-Draft-\d+)\)\s*$/);
            const draftTitle = match ? match[1].trim() : rawLabel || null;
            const draftRef = match ? match[2] : null;
            return (
              <div className="mt-3 flex flex-col items-start gap-2 text-sm">
                {draftTitle ? <p className="text-slate-300">{draftTitle}</p> : null}
                {draftHref && draftRef ? (
                  <a href={draftHref} className="font-mono text-cyan-300 hover:text-cyan-200">
                    {draftRef}
                  </a>
                ) : null}
                {(readHref || (collabEnabled && workgroupHref)) && (
                  <div
                    className={`grid w-full grid-cols-1 gap-2 ${
                      collabEnabled && workgroupHref ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                    }`}
                  >
                    <DiscussPatchLink
                      href={bookDiscussHref({ dpId: dp.id })}
                      className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
                    >
                      Read & discuss on the book
                    </DiscussPatchLink>
                    {readHref ? (
                      <a
                        href={readHref}
                        className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                      >
                        Patch on Gov Hub
                      </a>
                    ) : (
                      <a
                        href={GOVHUB_DP_PATCHES_URL}
                        className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                      >
                        Patch on Gov Hub
                      </a>
                    )}
                    {collabEnabled && workgroupHref ? (
                      <Link
                        href={workgroupHref}
                        className="inline-flex items-center justify-center rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                      >
                        Collaborate
                      </Link>
                    ) : null}
                  </div>
                )}
                {!readHref && !pdfDownloadHref && !draftHref ? (
                  <a
                    href={GOVHUB_DP_PATCHES_URL}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
                  >
                    Browse drafts on Gov Hub
                  </a>
                ) : null}
                {pdfDownloadHref ? (
                  <a
                    href={pdfDownloadHref}
                    download={pdfDownloadName || undefined}
                    className="inline-flex items-center text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Download PDF ({pdfDownloadName || 'composite'}) →
                  </a>
                ) : null}
                {onchainDraftHref ? (
                  <a
                    href={onchainDraftHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    View on-chain inscription →
                  </a>
                ) : null}
                {!onchainDraftHref && govhubDraftHref ? (
                  <a
                    href={govhubDraftHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Read ML-Draft on Gov Hub →
                  </a>
                ) : null}
              </div>
            );
          })()}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-bold">Workgroup</h2>
          <p className="mt-3 text-slate-400">
            {workgroup?.description ||
              'Join the active workgroup stewarding this property and participate in its evolution.'}
          </p>
          {workgroupHref ? (
            <div
              className={`mt-4 grid grid-cols-1 gap-2 ${collabEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
            >
              {collabEnabled ? (
                <Link
                  href={workgroupHref}
                  className="inline-flex items-center justify-center rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Collaborate
                </Link>
              ) : null}
              {isWorkgroupMember ? (
                <span className="inline-flex items-center justify-center rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-200">
                  Member
                </span>
              ) : (
                <a
                  href={workgroupJoinHref || workgroupHref}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Join WG
                </a>
              )}
              <a
                href={workgroupNominateHref || workgroupHref}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                Nominate to WG
              </a>
            </div>
          ) : (
            <a
              href={govhubUrl('/layers/the-metaweb/')}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              View workgroups on Gov Hub
            </a>
          )}
        </div>
      </section>

      {provenance ? (
        <DPProvenanceSection
          meta={provenance.meta}
          alignments={provenance.alignments}
          clarifications={provenance.clarifications}
          extensions={provenance.extensions}
        />
      ) : null}

      <PCIProvenanceSection links={pciLinks} />
    </>
  );
}

export default async function DPPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; view?: string }>;
}) {
  const { id } = await params;
  const { from, view } = await searchParams;
  const backHref = resolveBackPath(from);
  const dp = localData.desirable_properties.find(
    (d) => d.id.toLowerCase() === id.toLowerCase(),
  );

  if (!dp) {
    notFound();
  }

  const challenge = getCivicChallenge(dp.id);
  const showCampaign = Boolean(challenge);
  const activeView = showCampaign && view === 'spec' ? 'spec' : showCampaign ? 'campaign' : 'spec';

  const [workgroups, provenance, memberWorkgroupIds] = await Promise.all([
    fetchChallengeWorkgroups(),
    Promise.resolve(loadDpProvenance(dp.id)),
    readSessionMemberWorkgroupIds(),
  ]);
  const pciLinks = loadPciProvenanceForDp(dp.id);

  const workgroup = workgroups.find((wg) => extractDpId(wg.name) === dp.id);
  const draftHref = workgroup?.document_href ? govhubUrl(workgroup.document_href) : null;
  const readHref = govhubDraftReadHref(workgroup?.document_href);
  const collabEnabled = await isWorkgroupCollabEnabled();
  const workgroupHref = workgroup?.slug ? workgroupPrimaryHref(workgroup.slug) : null;
  const workgroupJoinHref = workgroup?.slug
    ? workgroupGovHubHref(workgroup.slug, 'join')
    : null;
  const workgroupNominateHref = workgroup?.slug
    ? workgroupGovHubHref(workgroup.slug, 'nominate')
    : null;
  const isWorkgroupMember = Boolean(workgroup?.id && memberWorkgroupIds.has(workgroup.id));
  const onchainDraftHref = dpInscriptionUrl(dp.id);
  const govhubDraftHref = dpGovHubDraftUrl(dp.id);
  const pdfDownloadHref = dpPdfDownloadUrl(dp.id);
  const pdfDownloadName = dpPdfDownloadFilename(dp.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={backHref} className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back
      </Link>

      {showCampaign ? (
        <nav className="mt-6 flex gap-1 border-b border-slate-800" aria-label="DP views">
          <Link
            href={tabHref(dp.id, 'campaign', from)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              activeView === 'campaign'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Campaign
          </Link>
          <Link
            href={tabHref(dp.id, 'spec', from)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              activeView === 'spec'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Spec
          </Link>
        </nav>
      ) : null}

      <DpPageQuickActions
        dpId={dp.id}
        readHref={readHref}
        pdfDownloadHref={pdfDownloadHref}
        pdfDownloadName={pdfDownloadName}
        workgroupHref={workgroupHref}
        collabEnabled={collabEnabled}
      />

      {activeView === 'campaign' && challenge ? (
        <div className="mt-8">
          {dpFullImageSrc(dp.id) ? (
            <figure className="mb-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-lg shadow-cyan-950/20">
              <Image
                src={dpFullImageSrc(dp.id)!}
                alt={dpImageAlt(dp.id, challenge.title)}
                width={1200}
                height={1200}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width: 896px) 100vw, 896px"
              />
            </figure>
          ) : null}
          <CivicChallengeCampaign
            challenge={challenge}
            catalogId={dp.id}
            workgroupSlug={workgroup?.slug}
          />
        </div>
      ) : (
        <>
          <div className="mt-8">
            <div className="flex items-center gap-3">
              <span className="rounded bg-cyan-950 px-2 py-1 text-xs font-semibold text-cyan-300">
                {dp.id}
              </span>
              {workgroup ? (
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {workgroup.state || workgroup.status}
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-4xl font-bold text-white">{dp.name}</h1>
            {dp.landing_subtitle ? (
              <p className="mt-3 text-lg text-cyan-300">{dp.landing_subtitle}</p>
            ) : null}
            {dpFullImageSrc(dp.id) ? (
              <figure className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-lg shadow-cyan-950/20">
                <Image
                  src={dpFullImageSrc(dp.id)!}
                  alt={dpImageAlt(dp.id, dp.name)}
                  width={1200}
                  height={1200}
                  className="h-auto w-full object-cover"
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </figure>
            ) : null}
            {provenance ? (
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <p className="text-cyan-300">
                  <span className="font-semibold">{provenance.meta.total_alignments}</span> Second
                  Call alignments
                </p>
                <p className="text-amber-300">
                  <span className="font-semibold">{provenance.meta.total_extensions}</span>{' '}
                  extensions
                </p>
                <p className="text-yellow-300">
                  <span className="font-semibold">{provenance.meta.total_clarifications}</span>{' '}
                  clarifications
                </p>
              </div>
            ) : null}
          </div>

          <SpecView
            dp={dp}
            workgroup={workgroup}
            draftHref={draftHref}
            readHref={readHref}
            collabEnabled={collabEnabled}
            workgroupHref={workgroupHref}
            workgroupJoinHref={workgroupJoinHref}
            workgroupNominateHref={workgroupNominateHref}
            isWorkgroupMember={isWorkgroupMember}
            onchainDraftHref={onchainDraftHref}
            govhubDraftHref={govhubDraftHref}
            pdfDownloadHref={pdfDownloadHref}
            pdfDownloadName={pdfDownloadName}
            provenance={provenance}
            pciLinks={pciLinks}
          />
        </>
      )}
    </main>
  );
}
