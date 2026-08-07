export const DISCUSS_PATCH_HELP_DISMISSED_KEY = 'dp-discuss-patch-help-dismissed';

export function isDiscussPatchHelpDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISCUSS_PATCH_HELP_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function dismissDiscussPatchHelp(): void {
  try {
    localStorage.setItem(DISCUSS_PATCH_HELP_DISMISSED_KEY, 'true');
  } catch {
    /* ignore */
  }
}
