import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  deleteInviteGlobalEvent,
  updateInviteGlobalEvent,
} from '@/lib/dp-invite-content-store';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const result = await updateInviteGlobalEvent(id, body, auth.email);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return jsonError('Could not update event.', status, result.error);
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await deleteInviteGlobalEvent(id);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return jsonError('Could not delete event.', status, result.error);
  }
  return NextResponse.json(result);
}
