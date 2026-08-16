import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { uploadBroadcastImage, broadcastImageMaxBytes } from '@/lib/dp-broadcast-images';

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError('Expected multipart form data.', 415, 'expected_multipart');

  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonError('Image file is required.', 400, 'file_required');
  }

  const maxBytes = broadcastImageMaxBytes();
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    return jsonError(
      `Image must be ${maxMb} MB or smaller before optimization.`,
      413,
      'file_too_large',
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadBroadcastImage({
    mime: file.type,
    bytes,
    adminEmail: auth.email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.status || 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    fileId: result.fileId,
    url: result.url,
    mime: result.mime,
    sizeBytes: result.sizeBytes,
    originalSizeBytes: result.originalSizeBytes,
    width: result.width,
    height: result.height,
    originalWidth: result.originalWidth,
    originalHeight: result.originalHeight,
    webpQuality: result.webpQuality,
    uploadedAt: result.uploadedAt,
  });
}
