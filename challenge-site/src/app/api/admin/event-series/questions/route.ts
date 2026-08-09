import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createQuestion,
  deleteQuestion,
  updateQuestion,
} from '@/lib/dp-event-series-store';

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createQuestion({
    sectionId: String(body.sectionId || ''),
    fieldKey: String(body.fieldKey || ''),
    label: String(body.label || ''),
    helpText: body.helpText != null ? String(body.helpText) : null,
    fieldType: String(body.fieldType || 'textarea'),
    required: Boolean(body.required),
    aiAssist: Boolean(body.aiAssist),
    sortOrder: body.sortOrder,
  });
  if (!result.ok) return jsonError('Could not create question.', 400, result.error);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Question id required.', 400);

  const result = await updateQuestion(id, body);
  if (!result.ok) return jsonError('Could not update question.', 400, result.error);
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return jsonError('Question id required.', 400);

  const result = await deleteQuestion(id);
  if (!result.ok) return jsonError('Could not delete question.', 400, result.error);
  return NextResponse.json(result);
}
