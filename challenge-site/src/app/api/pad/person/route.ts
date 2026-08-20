import { NextResponse } from 'next/server';
import { uploadPersonPadDoc } from '@/lib/hermes-onboard/person-pad-docs';
import { createPersonPad } from '@/lib/hermes-onboard/person-pad-store';
import type { PersonPadCreateInput, PersonPadSelectedSource } from '@/lib/hermes-onboard/person-pad-lookup';

function parseSelectedSources(raw: unknown): PersonPadSelectedSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const id = String(item.id || '').trim();
      const url = String(item.url || '').trim();
      if (!id || !url) return null;
      return {
        id,
        url,
        title: String(item.title || url).trim(),
        source: String(item.source || 'unknown').trim(),
        snippet: String(item.snippet || '').trim(),
      };
    })
    .filter(Boolean) as PersonPadSelectedSource[];
}

function buildCreateInput(body: Record<string, unknown>): PersonPadCreateInput {
  return {
    linkedinUrl: String(body.linkedinUrl || '').trim() || undefined,
    cvUrl: String(body.cvUrl || '').trim() || undefined,
    displayName: String(body.displayName || '').trim() || undefined,
    orgAffiliation: String(body.orgAffiliation || '').trim() || undefined,
    workLinks: Array.isArray(body.workLinks)
      ? body.workLinks.map((row) => String(row).trim()).filter(Boolean)
      : undefined,
    perspectiveLinks: Array.isArray(body.perspectiveLinks)
      ? body.perspectiveLinks.map((row) => String(row).trim()).filter(Boolean)
      : undefined,
    bioText: String(body.bioText || '').trim() || undefined,
    profilePaste: String(body.profilePaste || '').trim() || undefined,
    selectedSources: parseSelectedSources(body.selectedSources),
  };
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const linkedinUrl = String(form.get('linkedinUrl') || '').trim();
    const cvUrl = String(form.get('cvUrl') || '').trim();
    const displayName = String(form.get('displayName') || '').trim();
    const orgAffiliation = String(form.get('orgAffiliation') || '').trim();
    const bioText = String(form.get('bioText') || '').trim();
    const profilePaste = String(form.get('profilePaste') || '').trim();
    const workLinks = form
      .getAll('workLinks')
      .map((row) => String(row).trim())
      .filter(Boolean);
    const perspectiveLinks = form
      .getAll('perspectiveLinks')
      .map((row) => String(row).trim())
      .filter(Boolean);
    const selectedSourcesRaw = String(form.get('selectedSources') || '').trim();
    let selectedSources: PersonPadSelectedSource[] = [];
    if (selectedSourcesRaw) {
      try {
        selectedSources = parseSelectedSources(JSON.parse(selectedSourcesRaw));
      } catch {
        selectedSources = [];
      }
    }

    const uploadedDocs = [];
    for (const entry of form.getAll('papers')) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const bytes = Buffer.from(await entry.arrayBuffer());
      uploadedDocs.push(
        await uploadPersonPadDoc({
          filename: entry.name,
          mime: entry.type || 'application/octet-stream',
          bytes,
        }),
      );
    }

    try {
      const result = await createPersonPad(
        {
          linkedinUrl,
          cvUrl,
          displayName,
          orgAffiliation,
          workLinks,
          perspectiveLinks,
          bioText,
          profilePaste,
          selectedSources,
        },
        uploadedDocs,
      );
      return NextResponse.json({
        slug: result.record.slug,
        href: result.href,
        created: result.created,
        record: result.record,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create person pad';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const result = await createPersonPad(buildCreateInput(body));
    return NextResponse.json({
      slug: result.record.slug,
      href: result.href,
      created: result.created,
      record: result.record,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create person pad';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
