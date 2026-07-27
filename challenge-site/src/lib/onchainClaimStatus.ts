export type ClaimStatus = 'pending' | 'denied' | 'accepted' | 'delivered';

export type ClaimStatusStore = {
  pci_emails: Record<string, ClaimStatus>;
  submissions: Record<string, ClaimStatus>;
};

export const CLAIM_STATUS_OPTIONS: ClaimStatus[] = [
  'pending',
  'denied',
  'accepted',
  'delivered',
];

export function isClaimStatus(value: string): value is ClaimStatus {
  return CLAIM_STATUS_OPTIONS.includes(value as ClaimStatus);
}
