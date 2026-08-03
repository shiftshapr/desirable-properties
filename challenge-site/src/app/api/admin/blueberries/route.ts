import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  listBlueberries,
  getBlueberrySettings,
  saveBlueberrySettings,
  createBlueberry,
} from '@/lib/dp-blueberries-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const [settings, blueberries] = await Promise.all([getBlueberrySettings(), listBlueberries()]);
  return NextResponse.json({ ok: true, settings, blueberries });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (body.action === 'save_settings') {
    const result = await saveBlueberrySettings(body.settings || body);
    if (!result.ok) return jsonError('Could not save settings.', 503, result.error);
    return NextResponse.json(result);
  }

  const result = await createBlueberry(body);
  if (!result.ok) return jsonError('Could not create blueberry.', 400, result.error);
  return NextResponse.json(result);
}
