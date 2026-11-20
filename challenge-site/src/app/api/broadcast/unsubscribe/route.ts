import { NextResponse } from 'next/server';
import {
  findByUnsubscribeToken,
  optOutEmail,
  setDoNotSendBroadcast,
} from '@/lib/dp-broadcast-preferences-store';
import {
  planUnsubscribe,
  UNSUBSCRIBE_FLOW_HEADER,
  UNSUBSCRIBE_FLOW_VERSION,
} from '@/lib/dp-broadcast-unsubscribe-plan';

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

/** Applies the token. Returns true only when an opt-out was actually recorded. */
async function applyUnsubscribe(token: string): Promise<boolean> {
  const plan = planUnsubscribe(await findByUnsubscribeToken(token));
  if (plan.kind === 'user') {
    const res = await setDoNotSendBroadcast(plan.userId, true, { email: plan.email, viaUnsubscribe: true });
    return res.ok;
  }
  if (plan.kind === 'email') {
    const res = await optOutEmail(plan.email, { token, source: 'unsubscribe_link' });
    return res.ok;
  }
  return false;
}

const FLOW_HEADERS = { [UNSUBSCRIBE_FLOW_HEADER]: UNSUBSCRIBE_FLOW_VERSION };
const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...FLOW_HEADERS };

async function tokenFrom(request: Request) {
  const { searchParams } = new URL(request.url);
  return String(searchParams.get('token') || '').trim();
}

export async function GET(request: Request) {
  const token = await tokenFrom(request);
  if (!token) {
    return new NextResponse(
      unsubscribeHtmlPage({ success: false, message: 'Missing unsubscribe token.' }),
      { status: 400, headers: HTML_HEADERS },
    );
  }

  const applied = await applyUnsubscribe(token);
  if (!applied) {
    return new NextResponse(
      unsubscribeHtmlPage({
        success: false,
        message: 'This unsubscribe link is invalid or expired.',
      }),
      { status: 404, headers: HTML_HEADERS },
    );
  }

  return new NextResponse(
    unsubscribeHtmlPage({
      success: true,
      message: 'You will no longer receive Desirable Properties challenge email updates.',
    }),
    { status: 200, headers: HTML_HEADERS },
  );
}

/** RFC 8058 one-click unsubscribe (POST from the email client, token in the query string). */
export async function POST(request: Request) {
  const token = await tokenFrom(request);
  if (!token) {
    return new NextResponse(null, { status: 400, headers: FLOW_HEADERS });
  }
  const applied = await applyUnsubscribe(token);
  return new NextResponse(null, { status: applied ? 200 : 404, headers: FLOW_HEADERS });
}
