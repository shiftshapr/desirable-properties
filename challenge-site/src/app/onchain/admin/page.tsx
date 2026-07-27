import Link from 'next/link';
import OnchainAdminClaimLists from '@/components/OnchainAdminClaimLists';
import { readClaimStatuses } from '@/lib/onchainClaimStore';
import articlesData from '../../../data/call-for-input-articles.json';
import submissionIndex from '../../../data/submission-index.json';
import inscriptionMap from '../../../data/submission-inscriptions.json';

export default async function OnchainAdminPage() {
  const pciEmails = articlesData.pci_emails;
  const submissions = submissionIndex.submissions;
  const initialStatuses = await readClaimStatuses();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/onchain" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to public on-chain page
      </Link>

      <OnchainAdminClaimLists
        pciEmails={pciEmails}
        submissions={submissions}
        inscriptionBySource={(inscriptionMap.by_source_file ?? {}) as Record<string, string>}
        initialStatuses={initialStatuses}
      />
    </main>
  );
}
