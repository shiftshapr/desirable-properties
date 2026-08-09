import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createQuestionSection,
  deleteQuestionSection,
  updateQuestionSection,
} from '@/lib/dp-event-series-store';

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createQuestionSection({
    sessionId: String(body.sessionId || ''),
    sectionKey: String(body.sectionKey || ''),
    title: String(body.title || ''),
    pearlStage: body.pearlStage != null ? String(body.pearlStage) : null,
    sortOrder: body.sortOrder,
  });
  if (!result.ok) return jsonError('Could not create section.', 400, result.error);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Section id required.', 400);

  const result = await updateQuestionSection(id, body);
  if (!result.ok) return jsonError('Could not update section.', 400, result.error);
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Section id required.', 400);

  const result = await deleteQuestionSection(id);
  if (!result.ok) return jsonError('Could not delete section.', 400, result.error);
  return NextResponse.json(result);
}
