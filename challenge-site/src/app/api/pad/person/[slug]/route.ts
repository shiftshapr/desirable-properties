import { NextResponse } from 'next/server';
import { isPersonSlug } from '@/lib/hermes-onboard/person-pad-lookup';
import { loadPersonPad, personPadPublicPayload } from '@/lib/hermes-onboard/person-pad-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!isPersonSlug(slug)) {
    return NextResponse.json({ error: 'Invalid person pad slug' }, { status: 400 });
  }

  const record = await loadPersonPad(slug);
  if (!record) {
    return NextResponse.json({ error: 'Person pad not found' }, { status: 404 });
  }

  return NextResponse.json({ record: personPadPublicPayload(record) });
}
