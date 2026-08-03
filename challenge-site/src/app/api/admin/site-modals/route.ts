import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  listSiteModals,
  createSiteModal,
} from '@/lib/dp-site-modals-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const modals = await listSiteModals(true);
  return NextResponse.json({ ok: true, modals, count: modals.length });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createSiteModal(body, auth.email);
  if (!result.ok) return jsonError('Could not create site message.', 400, result.error);
  return NextResponse.json(result);
}
