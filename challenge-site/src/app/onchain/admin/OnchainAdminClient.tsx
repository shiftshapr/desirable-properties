'use client';

import Link from 'next/link';
import OnchainAdminClaimLists from '@/components/OnchainAdminClaimLists';
import AdminAuthShell from '@/components/AdminAuthShell';
import { useAdminAuthGate } from '@/lib/use-admin-auth-gate';
import type { ClaimStatusStore } from '@/lib/onchainClaimStatus';

type PciEmail = {
  id: string;
  title: string;
  author?: string;
  date?: string;
};

type Submission = {
  source_file: string;
  file_number?: number;
  title: string;
  author: string;
  dp_count: number;
};

type Props = {
  pciEmails: PciEmail[];
  submissions: Submission[];
  inscriptionBySource: Record<string, string>;
  initialStatuses: ClaimStatusStore;
};

export default function OnchainAdminClient({
  pciEmails,
  submissions,
  inscriptionBySource,
  initialStatuses,
}: Props) {
  const { authState, error, retry } = useAdminAuthGate();

  return (
    <AdminAuthShell authState={authState} error={error} onRetry={retry}>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href="/onchain" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to public on-chain page
        </Link>

        <OnchainAdminClaimLists
          pciEmails={pciEmails}
          submissions={submissions}
          inscriptionBySource={inscriptionBySource}
          initialStatuses={initialStatuses}
          onSignOut={retry}
        />
      </main>
    </AdminAuthShell>
  );
}
