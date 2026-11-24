import Link from 'next/link';

/**
 * Consent wording for Desirable Properties and Canopi alerts. One source for the public proof page (/text-alerts,
 * what Twilio reviewed) and the phone setting on /account: change it here, never copy it.
 */
export const CONSENT_ALERTS =
  'Text me alerts and reminders: one-time codes, reminders about votes and listening sessions, and a weekly summary of activity on things I follow, including Canopi replies. Up to 4 msgs a week. Msg & data rates may apply. Reply HELP for help, STOP to opt out.';
export const CONSENT_ANNOUNCEMENTS =
  'Also text me occasional announcements and invitations to new sessions and features. Msg & data rates may apply. Reply STOP to opt out.';

/** The agree box's label: "I agree to the Terms of Service and Privacy Policy." with both linked. */
export function TextAlertsAgreeLabel() {
  return (
    <span>
      I agree to the{' '}
      <Link href="/terms" className="text-cyan-300 hover:text-cyan-200">Terms of Service</Link>{' '}
      and{' '}
      <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">Privacy Policy</Link>.
    </span>
  );
}
