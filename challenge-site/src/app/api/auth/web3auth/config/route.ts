import { NextResponse } from 'next/server';
import { getWeb3AuthPublicConfig } from '@/lib/web3auth-config';

export async function GET() {
  return NextResponse.json(getWeb3AuthPublicConfig());
}
