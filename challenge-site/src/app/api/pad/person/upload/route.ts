import { NextResponse } from 'next/server';
import { landingPadsEnabled } from '@/lib/landing-pads/flag';
import { uploadPersonPadDoc, personPadDocUploadMaxBytes } from '@/lib/hermes-onboard/person-pad-docs';

export async function POST(request: Request) {
  if (!landingPadsEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await uploadPersonPadDoc({
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      bytes,
    });
    return NextResponse.json({ doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message, maxBytes: personPadDocUploadMaxBytes() }, { status: 400 });
  }
}
