import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminEmailFromRequest } from '@/lib/dp-admin-auth';
import { isClaimStatus, type ClaimStatus } from '@/lib/onchainClaimStatus';
import { readClaimStatuses, writeClaimStatuses } from '@/lib/onchainClaimStore';

export async function GET(request: NextRequest) {
  if (!(await adminEmailFromRequest(request.cookies))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const statuses = await readClaimStatuses();
  return NextResponse.json(statuses);
}

export async function PATCH(request: NextRequest) {
  if (!(await adminEmailFromRequest(request.cookies))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    kind?: 'pci-email' | 'submission';
    key?: string;
    status?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { kind, key, status } = body;
  if (!kind || !key || !status) {
    return NextResponse.json({ error: 'kind, key, and status are required' }, { status: 400 });
  }
  if (!isClaimStatus(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const store = await readClaimStatuses();
  if (kind === 'pci-email') {
    store.pci_emails[key] = status as ClaimStatus;
  } else if (kind === 'submission') {
    store.submissions[key] = status as ClaimStatus;
  } else {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  await writeClaimStatuses(store);
  return NextResponse.json(store);
}
