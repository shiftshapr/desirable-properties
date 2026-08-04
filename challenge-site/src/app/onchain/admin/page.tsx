import OnchainAdminClient from './OnchainAdminClient';
import { readClaimStatuses } from '@/lib/onchainClaimStore';
import articlesData from '../../../data/call-for-input-articles.json';
import submissionIndex from '../../../data/submission-index.json';
import inscriptionMap from '../../../data/submission-inscriptions.json';

export default async function OnchainAdminPage() {
  const pciEmails = articlesData.pci_emails;
  const submissions = submissionIndex.submissions;
  const initialStatuses = await readClaimStatuses();

  return (
    <OnchainAdminClient
      pciEmails={pciEmails}
      submissions={submissions}
      inscriptionBySource={(inscriptionMap.by_source_file ?? {}) as Record<string, string>}
      initialStatuses={initialStatuses}
    />
  );
}
