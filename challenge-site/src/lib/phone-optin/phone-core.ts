/**
 * Phone setting on /account: pure rules and payload shapes shared by the form and the /api/me/phone* proxy routes.
 * Gov Hub (interface-gov-hub routes/phone.py, docs/PHONE-OPTIN.md) stores the number and the choices; this site
 * never stores a phone number.
 *
 * Three separate boxes, all unticked to start (wording: src/lib/text-alerts-consent.tsx, as on /text-alerts):
 *   alerts        -> Gov Hub alert channels (text message, WhatsApp, Signal)
 *   announcements -> Gov Hub alerts_sms_promo_at (added on the Gov Hub feature/sms-sending branch; until it lands
 *                    Gov Hub ignores the field and the status has no announcements value)
 *   agree         -> Terms of Service and Privacy Policy; required whenever alerts or announcements is ticked
 */

export const ALERT_CHANNELS = ['sms', 'whatsapp', 'signal'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const CHANNEL_LABELS: Record<AlertChannel, string> = {
  sms: 'Text message',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
};

/** Version of the /text-alerts wording the person agreed to (src/lib/text-alerts-consent.tsx, 22 Nov 2026). */
export const DP_TEXT_ALERTS_CONSENT_VERSION = 'dp-text-alerts-2026-11-22';

export type PhoneChoices = {
  alerts: boolean;
  channels: readonly AlertChannel[];
  announcements: boolean;
  agree: boolean;
};

export const MSG_AGREE_REQUIRED = 'Tick the box agreeing to the Terms of Service and Privacy Policy to get texts.';
export const MSG_PICK_CHANNEL = 'Choose how to get alerts: text message, WhatsApp or Signal.';
export const MSG_ALERTS_BOX = 'Tick the alerts and reminders box to choose how to get them.';
export const MSG_PHONE_REQUIRED = 'Enter your phone number with the country code, for example +1 415 555 0123.';
export const MSG_CODE_REQUIRED = 'Enter the code from the text.';

export function parseChannels(raw: unknown): AlertChannel[] {
  const wanted = new Set(
    (Array.isArray(raw) ? raw : []).map((c) => String(c).trim().toLowerCase()),
  );
  return ALERT_CHANNELS.filter((c) => wanted.has(c));
}

/** Reads the form's choices from a request body; anything missing is unticked. */
export function parseChoices(body: Record<string, unknown>): PhoneChoices {
  return {
    alerts: body.alerts === true,
    channels: parseChannels(body.channels),
    announcements: body.announcements === true,
    agree: body.agree === true,
  };
}

/** Null when the choices can be saved, else what to fix, in plain words. */
export function choicesError(c: PhoneChoices): string | null {
  if (c.channels.length > 0 && !c.alerts) return MSG_ALERTS_BOX;
  if (c.alerts && c.channels.length === 0) return MSG_PICK_CHANNEL;
  if ((c.alerts || c.announcements) && !c.agree) return MSG_AGREE_REQUIRED;
  return null;
}

/** Choice fields sent to Gov Hub on start and on a channel change. */
function govHubChoiceFields(c: PhoneChoices) {
  const texts = c.alerts || c.announcements;
  return {
    channels: c.alerts ? [...c.channels] : [],
    // Gov Hub's consent flag: the person ticked the agree box for the texts they chose.
    consent: texts && c.agree,
    // alerts_sms_promo_at on Gov Hub (feature/sms-sending). Both names are sent; Gov Hub ignores unknown fields.
    announcements: c.announcements,
    alerts_sms_promo: c.announcements,
    consent_version: texts ? DP_TEXT_ALERTS_CONSENT_VERSION : null,
    consent_source: 'desirableproperties.org/account',
  };
}

export function normalizePhoneInput(raw: unknown): string {
  return String(raw ?? '').trim().slice(0, 32);
}

/** POST /api/me/phone/start on Gov Hub. */
export function govHubStartPayload(phone: string, c: PhoneChoices) {
  return { phone, send_channel: 'sms', ...govHubChoiceFields(c) };
}

/** PUT /api/me/phone/channels on Gov Hub. */
export function govHubChannelsPayload(c: PhoneChoices) {
  return govHubChoiceFields(c);
}

/** Code as typed: digits only, at most 10. */
export function normalizeCode(raw: unknown): string {
  return String(raw ?? '').replace(/\D+/g, '').slice(0, 10);
}

/** Gov Hub GET /api/me/phone (status_payload). Phone fields are only ever the signed-in person's own. */
export type GovHubPhoneStatus = {
  enabled?: boolean;
  available?: boolean;
  message?: string | null;
  verified?: boolean;
  phone_masked?: string | null;
  phone_country?: string | null;
  phone_line_type?: string | null;
  phone_check?: string | null;
  phone_verified_at?: string | null;
  channels?: Partial<Record<AlertChannel | 'announcements' | 'promo', boolean>>;
  announcements?: boolean;
  alerts_sms_promo?: boolean;
  alerts_sms_promo_at?: string | null;
  pending?: { phone_masked?: string | null; expires_at?: string; attempts_left?: number } | null;
  error?: string;
};

/**
 * The announcements choice from a Gov Hub status, or null when this Gov Hub does not have the field yet
 * (alerts_sms_promo_at lands with Gov Hub feature/sms-sending).
 */
export function readAnnouncements(s: GovHubPhoneStatus | null | undefined): boolean | null {
  if (!s) return null;
  if (typeof s.announcements === 'boolean') return s.announcements;
  if (typeof s.alerts_sms_promo === 'boolean') return s.alerts_sms_promo;
  if ('alerts_sms_promo_at' in s) return Boolean(s.alerts_sms_promo_at);
  if (typeof s.channels?.announcements === 'boolean') return s.channels.announcements;
  if (typeof s.channels?.promo === 'boolean') return s.channels.promo;
  return null;
}

export function readChannels(s: GovHubPhoneStatus | null | undefined): AlertChannel[] {
  return ALERT_CHANNELS.filter((c) => Boolean(s?.channels?.[c]));
}

/** The phone check result in plain words, for the person who owns the number. */
export function phoneCheckInWords(s: Pick<GovHubPhoneStatus, 'phone_check' | 'phone_line_type'>): string {
  switch (s.phone_check) {
    case 'passed':
      return 'Checked: a mobile number that can get texts.';
    case 'voip':
      return 'Confirmed, but this is an internet (VoIP) number, so it does not count as a mobile phone check.';
    case 'other':
      return s.phone_line_type
        ? `Confirmed, but the line type (${lineTypeInWords(s.phone_line_type)}) is not a mobile phone, so it does not count as a mobile phone check.`
        : 'Confirmed, but we could not tell the line type, so it does not count as a mobile phone check.';
    default:
      return 'Not confirmed yet.';
  }
}

function lineTypeInWords(t: string): string {
  const map: Record<string, string> = {
    mobile: 'mobile',
    landline: 'landline',
    fixedVoip: 'fixed internet phone',
    nonFixedVoip: 'internet phone',
    tollFree: 'toll-free',
    premium: 'premium rate',
    sharedCost: 'shared cost',
    uan: 'business number',
    voicemail: 'voicemail',
    pager: 'pager',
    personal: 'personal number',
  };
  return map[t] ?? 'other';
}
