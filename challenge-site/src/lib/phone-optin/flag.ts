/**
 * Phone setting on /account (add number, one-time code, alert choices) and the /api/me/phone* proxy routes.
 *
 * Server side only. Off unless PHONE_OPTIN is "on" (default off; spec: ~/handoff/specs/phone-optin-and-check.md).
 * Off: /account is a 404, every /api/me/phone* route returns 404 without calling Gov Hub, the account menu has no
 * Account entry and /text-alerts shows no "Turn on text alerts" link. Read at request time, never at build time.
 */
export function phoneOptinEnabled(): boolean {
  const flag = (process.env.PHONE_OPTIN || '').trim().toLowerCase();
  return flag === 'on' || flag === '1' || flag === 'true';
}

/** Path of the phone setting on the account page. */
export const PHONE_SETTING_HREF = '/account#phone';
