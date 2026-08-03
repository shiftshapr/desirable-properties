import fs from 'fs';
import { NextResponse } from 'next/server';
import { hermesAuthorized } from '@/lib/support-hermes-auth';
import { attachmentAbsPath, readTicket, supportDataDir } from '@/lib/support-store';

type RouteContext = { params: Promise<{ id: string; filename: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!hermesAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id, filename } = await context.params;
  const dataDir = supportDataDir();
  const abs = await attachmentAbsPath(dataDir, id, filename);
  if (!abs || !fs.existsSync(abs)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const ticket = await readTicket(dataDir, id);
  const att = ticket?.attachments.find((a) => a.filename === filename);
  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    headers: {
      'Content-Type': att?.mimeType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
