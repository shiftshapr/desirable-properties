import { NextResponse } from 'next/server';
import { landingPadsEnabled } from '@/lib/landing-pads/flag';
import { requireDpAdmin } from '@/lib/dp-admin-api';
import { getOnSettings, saveOnSettings } from '@/lib/hermes-onboard/settings';
import { isOnboardTabId } from '@/lib/hermes-onboard/tabs';

export async function GET() {
  if (!landingPadsEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  const settings = await getOnSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function PUT(request: Request) {
  if (!landingPadsEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const defaultTab = body.defaultTab;
  if (!isOnboardTabId(defaultTab)) {
    return NextResponse.json({ ok: false, error: 'Unknown tab' }, { status: 400 });
  }
  const settings = await saveOnSettings(defaultTab, auth.email);
  return NextResponse.json({ ok: true, settings });
}
