import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ClaimStatusStore } from '@/lib/onchainClaimStatus';

const STATUS_FILE = path.join(process.cwd(), 'data/inscription-claim-status.json');

export async function readClaimStatuses(): Promise<ClaimStatusStore> {
  try {
    const raw = await readFile(STATUS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ClaimStatusStore>;
    return {
      pci_emails: parsed.pci_emails ?? {},
      submissions: parsed.submissions ?? {},
    };
  } catch {
    return { pci_emails: {}, submissions: {} };
  }
}

export async function writeClaimStatuses(store: ClaimStatusStore): Promise<void> {
  await writeFile(STATUS_FILE, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}
