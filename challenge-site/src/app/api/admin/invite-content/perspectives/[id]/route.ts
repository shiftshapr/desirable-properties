import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  deleteInvitePerspective,
  updateInvitePerspective,
} from '@/lib/dp-invite-content-store';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const result = await updateInvitePerspective(id, body, auth.email);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return jsonError('Could not update perspective.', status, result.error);
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await deleteInvitePerspective(id);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return jsonError('Could not delete perspective.', status, result.error);
  }
  return NextResponse.json(result);
}
