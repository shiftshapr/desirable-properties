import {
  buildPersonPadHref,
  isPersonSlug,
  resolvePersonPadLookup as resolveLookup,
  resolvePersonPadSlug as resolveSlug,
  slugFromCvUrl,
  slugFromLinkedInUrl,
  validatePersonPadCreateInput as validateCreate,
} from '@/lib/hermes-onboard/person-pad-lookup.mjs';

export type PersonPadLookupResult = {
  slug: string;
  href: string;
  displayName: string | null;
};

export type PersonPadSelectedSource = {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
};

export type PersonPadCreateInput = {
  linkedinUrl?: string;
  cvUrl?: string;
  displayName?: string;
  orgAffiliation?: string;
  workLinks?: string[];
  perspectiveLinks?: string[];
  bioText?: string;
  profilePaste?: string;
  selectedSources?: PersonPadSelectedSource[];
  uploadedDocIds?: string[];
};

export {
  buildPersonPadHref,
  isPersonSlug,
  slugFromCvUrl,
  slugFromLinkedInUrl,
};

export function resolvePersonPadSlug(input: PersonPadCreateInput): string | null {
  return resolveSlug(input);
}

export function resolvePersonPadLookup(input: string): PersonPadLookupResult | null {
  return resolveLookup(input);
}

export function validatePersonPadCreateInput(input: PersonPadCreateInput) {
  return validateCreate(input);
}
