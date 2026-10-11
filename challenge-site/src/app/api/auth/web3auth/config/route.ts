import { NextResponse } from 'next/server';
import { getWeb3AuthPublicConfig } from '@/lib/web3auth-config';

export async function GET() {
  try {
    return NextResponse.json(getWeb3AuthPublicConfig());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[web3auth] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
