/** User-facing message when Web3Auth popup is blocked (Safari, etc.). */
export function formatAuthError(message: string): string {
  if (/popup.*block/i.test(message)) {
    return (
      'Sign-in popup was blocked. Allow popups for desirableproperties.org ' +
      '(Safari: address bar → Website Settings → Pop-up Windows → Allow), then click Sign in again.'
    );
  }
  return message;
}

export function isUserDismissedAuthError(message: string): boolean {
  return /user closed|closed popup|user rejected/i.test(message);
}
