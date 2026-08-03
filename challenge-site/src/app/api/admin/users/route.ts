import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { listAdmins, addAdmin, removeAdmin } from '@/lib/dp-admin-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  const admins = await listAdmins();
  return NextResponse.json({ ok: true, admins });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const emails = Array.isArray(body.emails)
    ? body.emails
    : body.email
      ? [body.email]
      : [];

  if (!emails.length) return jsonError('Provide at least one admin email.', 400, 'no_emails');

  const results = [];
  for (const raw of emails) {
    results.push(await addAdmin(String(raw), auth.email));
  }

  return NextResponse.json({
    ok: true,
    results,
    admins: await listAdmins(),
  });
}

export async function DELETE(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  if (!email) return jsonError('Provide email to remove.', 400, 'no_email');

  const result = await removeAdmin(email);
  if (!result.ok) {
    const status = result.error === 'protected_admin' ? 403 : 404;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({ ok: true, email: result.email, admins: await listAdmins() });
}
