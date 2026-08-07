import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import WorkgroupCollabClient from '@/app/workgroups/[slug]/WorkgroupCollabClient';
import { fetchWorkgroupDpActivity } from '@/lib/activity-feed';
import { getRequestedWorkgroupSlug } from '@/lib/dp-welcome-workgroup';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';
import { workgroupGovHubHref } from '@/lib/workgroup-links';
import type { WorkgroupCollabSummary, WorkgroupMessage } from '@/lib/workgroup-collab-types';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchWorkgroup(slug: string): Promise<WorkgroupCollabSummary | null> {
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/by-slug/${encodeURIComponent(slug)}/`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as WorkgroupCollabSummary;
    if (!data?.id || !data?.name) return null;
    return {
      ...data,
      slug: data.slug || slug,
    };
  } catch {
    return null;
  }
}

async function fetchTeaserMessages(workgroupId: string): Promise<WorkgroupMessage[]> {
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/messages/`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: WorkgroupMessage[] };
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = getRequestedWorkgroupSlug(raw);
  if (!slug) return { title: 'Workgroup · Desirable Properties Challenge' };
  const wg = await fetchWorkgroup(slug);
  return {
    title: wg ? `${wg.name} · Workgroup` : 'Workgroup · Desirable Properties Challenge',
    description: wg?.description
      ? String(wg.description).slice(0, 160)
      : 'Collaborate on a Desirable Properties workgroup — chat and invite members.',
  };
}

export default async function WorkgroupCollabPage({ params }: PageProps) {
  const { slug: raw } = await params;
  const slug = getRequestedWorkgroupSlug(raw);
  if (!slug) notFound();

  if (!(await isWorkgroupCollabEnabled())) {
    redirect(workgroupGovHubHref(slug));
  }

  const workgroup = await fetchWorkgroup(slug);
  if (!workgroup) notFound();

  const initialMessages = await fetchTeaserMessages(workgroup.id);
  const joinHref = workgroupGovHubHref(workgroup.slug, 'join');
  const dpId = extractDpId(workgroup.name);
  const dpDetailHref = dpId ? `/dp/${dpId.toLowerCase()}` : null;
  const initialActivity = await fetchWorkgroupDpActivity({
    workgroupId: workgroup.id,
    workgroupSlug: workgroup.slug,
    workgroupName: workgroup.name,
    dpId,
    draftRef: workgroup.document_draft_ref || null,
    draftLabel: workgroup.document_label || null,
    limit: 40,
  });

  return (
    <main className="border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <WorkgroupCollabClient
          workgroup={workgroup}
          initialMessages={initialMessages}
          joinHref={joinHref}
          dpId={dpId}
          dpDetailHref={dpDetailHref}
          initialActivity={initialActivity}
        />
      </div>
    </main>
  );
}
