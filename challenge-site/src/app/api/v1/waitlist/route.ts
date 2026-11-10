import { NextResponse } from 'next/server';
import { joinWaitlist } from '@/lib/dp-book-waitlist';

const recent = new Map<string, number[]>(); // ip → signup times, to slow down scripted signups

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; website?: string };
  if (body.website) return NextResponse.json({ ok: true }); // honeypot: bots fill every field
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const times = (recent.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  if (times.length >= 5) {
    return NextResponse.json({ ok: false, error: 'Too many sign-ups from here. Try again later.' }, { status: 429 });
  }
  recent.set(ip, [...times, now]);
  const result = await joinWaitlist(body.email, 'v1-panel');
  if (!result.ok) {
    const message = result.error === 'invalid_email' ? 'Enter a valid email address.' : 'Sign-up is unavailable right now.';
    return NextResponse.json({ ok: false, error: message }, { status: result.error === 'invalid_email' ? 400 : 503 });
  }
  return NextResponse.json({ ok: true });
}
