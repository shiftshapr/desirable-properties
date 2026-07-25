import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
      verifierId: session.verifierId,
    },
  });
}
