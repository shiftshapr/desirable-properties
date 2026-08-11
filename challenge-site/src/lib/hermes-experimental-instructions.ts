export const HERMES_EXPERIMENTAL_INSTRUCTIONS_DISMISSED_KEY =
  'dp-hermes-experimental-instructions-dismissed';

export function isHermesExperimentalInstructionsDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HERMES_EXPERIMENTAL_INSTRUCTIONS_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissHermesExperimentalInstructions(): void {
  try {
    localStorage.setItem(HERMES_EXPERIMENTAL_INSTRUCTIONS_DISMISSED_KEY, 'true');
  } catch {
    /* ignore */
  }
}
