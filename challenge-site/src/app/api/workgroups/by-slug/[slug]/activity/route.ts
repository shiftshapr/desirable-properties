import { NextResponse } from 'next/server';
import { fetchWorkgroupDpActivity } from '@/lib/activity-feed';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';
import type { WorkgroupCollabSummary } from '@/lib/workgroup-collab-types';

type Ctx = { params: Promise<{ slug: string }> };

async function fetchWorkgroupBySlug(slug: string): Promise<WorkgroupCollabSummary | null> {
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/by-slug/${encodeURIComponent(slug)}/`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as WorkgroupCollabSummary;
    if (!data?.id || !data?.name) return null;
    return { ...data, slug: data.slug || slug };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, ctx: Ctx) {
  if (!(await isWorkgroupCollabEnabled())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { slug: raw } = await ctx.params;
  const slug = String(raw || '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const workgroup = await fetchWorkgroupBySlug(slug);
  if (!workgroup) {
    return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  }

  const dpId = extractDpId(workgroup.name);
  const items = await fetchWorkgroupDpActivity({
    workgroupId: workgroup.id,
    workgroupSlug: workgroup.slug,
    workgroupName: workgroup.name,
    dpId,
    draftRef: workgroup.document_draft_ref || null,
    draftLabel: workgroup.document_label || null,
    limit: 50,
  });

  return NextResponse.json(
    {
      workgroup_slug: workgroup.slug,
      dp_id: dpId,
      items,
      filter_definition:
        'Comments & patches = Canopi discuss (comments + PATCH/INSERT), Gov Hub draft proposals/patches, workgroup chat (challenge-site UI, Gov Hub API). Excludes joins, leaves, invites, and generic draft lifecycle events.',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
