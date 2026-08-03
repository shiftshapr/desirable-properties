import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { updateBlueberry, deleteBlueberry, reorderBlueberries } from '@/lib/dp-blueberries-store';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action === 'reorder' && Array.isArray(body.ids)) {
    const result = await reorderBlueberries(body.ids);
    if (!result.ok) return jsonError('Could not reorder.', 503, result.error);
    return NextResponse.json(result);
  }

  const result = await updateBlueberry(id, body);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteBlueberry(id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
