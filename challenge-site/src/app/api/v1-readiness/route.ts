import { NextResponse } from 'next/server';
import { fetchReadinessBoard } from '@/lib/v1-readiness.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const board = await fetchReadinessBoard();
  return NextResponse.json(board, { status: board.error ? 503 : 200 });
}
