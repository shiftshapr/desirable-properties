import { NextResponse } from 'next/server';
import {
  findByUnsubscribeToken,
  lookupUnsubscribeToken,
  setDoNotSendBroadcast,
} from '@/lib/dp-broadcast-preferences-store';

function publicBase() {
  return (
    process.env.DP_PUBLIC_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://desirableproperties.org'
  ).replace(/\/$/, '');
}

function unsubscribeHtmlPage({ success, message }: { success: boolean; message: string }) {
  const title = success ? 'Unsubscribed' : 'Could not unsubscribe';
  const base = publicBase();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} – Desirable Properties</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 48px auto; padding: 0 20px; color: #1a2332; }
    h1 { font-size: 1.5rem; }
    a { color: #0369a1; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
  <p><a href="${base}/">Return to Desirable Properties</a></p>
</body>
</html>`;
}

async function applyUnsubscribe(token: string) {
  let pref = await findByUnsubscribeToken(token);
  if (!pref) {
    const indexed = await lookupUnsubscribeToken(token);
    if (indexed?.userId) {
      await setDoNotSendBroadcast(indexed.userId, true, {
        email: indexed.email,
        viaUnsubscribe: true,
      });
      pref = await findByUnsubscribeToken(token);
    }
  } else if (pref.userId) {
    await setDoNotSendBroadcast(pref.userId, true, {
      email: pref.email,
      viaUnsubscribe: true,
    });
  }
  return pref;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  if (!token) {
    return new NextResponse(
      unsubscribeHtmlPage({ success: false, message: 'Missing unsubscribe token.' }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const pref = await applyUnsubscribe(token);
  if (!pref) {
    return new NextResponse(
      unsubscribeHtmlPage({
        success: false,
        message: 'This unsubscribe link is invalid or expired.',
      }),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  return new NextResponse(
    unsubscribeHtmlPage({
      success: true,
      message: 'You will no longer receive Desirable Properties challenge email updates.',
    }),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

/** RFC 8058 one-click unsubscribe (POST from email client). */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get('token') || '').trim();
  if (!token) {
    return new NextResponse(null, { status: 400 });
  }
  await applyUnsubscribe(token);
  return new NextResponse(null, { status: 200 });
}
