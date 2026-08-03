import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  getSiteModal,
  updateSiteModal,
  duplicateSiteModal,
  deleteSiteModal,
} from '@/lib/dp-site-modals-store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const modal = await getSiteModal(id);
  if (!modal) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, modal });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.action === 'duplicate') {
    const result = await duplicateSiteModal(id, auth.email);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
    return NextResponse.json(result);
  }

  const result = await updateSiteModal(id, body, auth.email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.error === 'not_found' ? 404 : 400 });
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteSiteModal(id);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  return NextResponse.json(result);
}
