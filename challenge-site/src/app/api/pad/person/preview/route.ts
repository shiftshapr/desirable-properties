import { NextResponse } from 'next/server';
import {
  discoverPersonPadCandidates,
  type PersonPadDiscoveryInput,
} from '@/lib/hermes-onboard/person-pad-discovery';
import { validatePersonPadCreateInput } from '@/lib/hermes-onboard/person-pad-lookup';

function parseDiscoveryInput(body: Record<string, unknown>): PersonPadDiscoveryInput {
  return {
    displayName: String(body.displayName || '').trim() || undefined,
    linkedinUrl: String(body.linkedinUrl || '').trim() || undefined,
    orgAffiliation: String(body.orgAffiliation || '').trim() || undefined,
    workLinks: Array.isArray(body.workLinks)
      ? body.workLinks.map((row) => String(row).trim()).filter(Boolean)
      : undefined,
    perspectiveLinks: Array.isArray(body.perspectiveLinks)
      ? body.perspectiveLinks.map((row) => String(row).trim()).filter(Boolean)
      : undefined,
    bioText: String(body.bioText || '').trim() || undefined,
    profilePaste: String(body.profilePaste || '').trim() || undefined,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = parseDiscoveryInput(body);

  const validation = validatePersonPadCreateInput({
    linkedinUrl: input.linkedinUrl,
    cvUrl: String(body.cvUrl || '').trim() || undefined,
    displayName: input.displayName,
    workLinks: input.workLinks,
    perspectiveLinks: input.perspectiveLinks,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const candidates = await discoverPersonPadCandidates(input);
  return NextResponse.json({
    candidates,
    limits: {
      maxCandidates: 15,
      openGraphWorkLinks: 4,
      linkedInBlocked: true,
    },
  });
}
