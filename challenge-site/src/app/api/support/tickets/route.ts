import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { sendSupportTicketAlert } from '@/lib/support-notify';
import {
  createTicket,
  publicTicketSummary,
  searchTickets,
  supportDataDir,
} from '@/lib/support-store';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_urgency: 'Choose urgency: critical, blocking, or non_blocking.',
  invalid_category: 'Choose a valid category.',
  subject_required: 'Subject is required.',
  body_required: 'Message body is required.',
  screenshot_ack_required:
    'For technical support, confirm the screenshot acknowledgement or attach a screenshot.',
};

export async function GET() {
  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json(
      { ok: false, error: 'auth_required', message: 'Sign in to view your support requests.' },
      { status: 401 },
    );
  }

  const dataDir = supportDataDir();
  const result = searchTickets(dataDir, { userId: session.userId, limit: 50 });
  return NextResponse.json({
    ok: true,
    tickets: result.tickets.map(publicTicketSummary),
    total: result.total,
  });
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json(
      { ok: false, error: 'auth_required', message: 'Sign in before submitting a support request.' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const dataDir = supportDataDir();
  const result = createTicket(dataDir, {
    subject: String(body.subject || ''),
    body: String(body.body || ''),
    urgency: String(body.urgency || 'non_blocking'),
    category: String(body.category || 'general'),
    screenshotAcknowledged: Boolean(body.screenshotAcknowledged),
    userId: session.userId,
    email: session.email || String(body.email || ''),
    handle: session.displayName || session.username || String(body.handle || ''),
    screenshots: Array.isArray(body.screenshots) ? body.screenshots : [],
    pageUrl: String(body.pageUrl || ''),
    browser: String(body.browser || ''),
    os: String(body.os || ''),
    canopiMode: String(body.canopiMode || ''),
    stepsToReproduce: String(body.stepsToReproduce || ''),
    expectedBehavior: String(body.expectedBehavior || ''),
    actualBehavior: String(body.actualBehavior || ''),
    triedAlready: String(body.triedAlready || ''),
    diagnosticBundle:
      body.diagnosticBundle && typeof body.diagnosticBundle === 'object'
        ? (body.diagnosticBundle as Record<string, unknown>)
        : null,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        message: ERROR_MESSAGES[result.error] || 'Could not create ticket.',
      },
      { status: 400 },
    );
  }

  try {
    await sendSupportTicketAlert(dataDir, result.ticket);
  } catch (err) {
    console.warn('[dp-support] alert failed', err);
  }

  return NextResponse.json({
    ok: true,
    ticket: publicTicketSummary(result.ticket),
  });
}
