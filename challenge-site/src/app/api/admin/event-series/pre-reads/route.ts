import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createPreRead,
  deletePreRead,
  updatePreRead,
} from '@/lib/dp-event-series-store';

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createPreRead({
    sessionId: String(body.sessionId || ''),
    label: String(body.label || ''),
    url: String(body.url || ''),
    sortOrder: body.sortOrder,
  });
  if (!result.ok) return jsonError('Could not create pre-read.', 400, result.error);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Pre-read id required.', 400);

  const result = await updatePreRead(id, body);
  if (!result.ok) return jsonError('Could not update pre-read.', 400, result.error);
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Pre-read id required.', 400);

  const result = await deletePreRead(id);
  if (!result.ok) return jsonError('Could not delete pre-read.', 400, result.error);
  return NextResponse.json(result);
}
