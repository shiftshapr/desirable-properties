import { NextResponse } from 'next/server';
import { allAdminEmails, requireDpAdmin } from '@/lib/dp-admin-api';
import { isDpDatabaseConfigured } from '@/lib/dp-db';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    isAdmin: true,
    email: auth.email,
    adminEmails: await allAdminEmails(),
    databaseConfigured: isDpDatabaseConfigured(),
  });
}
