/**
 * How people arrive: the message tag (?ref=<channel>-<mmdd>-<message>, see ~/handoff/dp-ref-tracking/README.md; pad
 * invites use ?ref=inv-<channel>) and any Canopi referral on the link. Pure (no runtime imports beyond the invite ref
 * parser), so scripts/attribution.test.mjs drives it directly and middleware.ts can run it on the edge.
 *
 * Canopi's referral links (canopi routes/share.js, utils/shareRefToken.js) carry:
 *   ref_token     signed share token "<base64url payload>.<base64url hmac>" (payload names the referrer and the share)
 *   ch            the share channel (copy, x, linkedin, email, profile, ...)
 *   utm_source / utm_medium / utm_campaign   (utm_content is the referrer's account id on profile links: not kept)
 * and embed links carry a legacy code: referralCode=ref_<12 hex> (canopi routes/embeds.js deriveReferralCode).
 * Canopi's sign-in (routes/web3auth.js) takes { canopiId, referralCode } and records them in
 * canopi_signup_attributions; the token is passed as refToken too, for when Canopi reads it there.
 *
 * The cookie (dp_arrival, first-party, 30 days, SameSite=Lax, HttpOnly) holds only these values and two timestamps:
 * nothing about the visitor. A tag names a message, never a person.
 */
import { parseRef as parseInviteRef } from '@/lib/pads/pad-invite-core';

export const ARRIVAL_COOKIE = 'dp_arrival';
export const ARRIVAL_MAX_AGE_S = 30 * 24 * 3600;

export type Arrival = {
  v: 1;
  /** First message tag seen, and when (ISO). */
  ft: string | null;
  fa: string | null;
  /** Latest message tag seen, and when. */
  lt: string | null;
  la: string | null;
  /** Canopi referral: legacy code (ref_..., or a referrer account UUID) and/or signed share token. First seen wins. */
  rc: string | null;
  rt: string | null;
  /** Canopi share channel and utm fields that came with the referral. */
  ch: string | null;
  us: string | null;
  um: string | null;
  uc: string | null;
  /** When the cookie was first written. */
  at: string;
};

export type Touch = {
  tag: string | null;
  referralCode: string | null;
  refToken: string | null;
  channel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

const TAG_RE = /^([a-z]{1,6})-(\d{2})(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_CODE_RE = /^ref_[a-z0-9]{6,32}$/i;
const CODE_RE = /^[A-Za-z0-9_-]{3,64}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,700}\.[A-Za-z0-9_-]{8,100}$/;
const WORD_RE = /^[A-Za-z0-9_.-]{1,40}$/;

/** A message tag (em-1122-closes, wa-1122-lastcall, inv-email), lower-cased, or null. */
export function parseTag(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s.length > 48) return null;
  if (parseInviteRef(s)) return s;
  const m = TAG_RE.exec(s);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return s;
}

/** A Canopi legacy referral code (ref_<hex>, a referrer account UUID or another short code), or null. */
export function parseReferralCode(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (UUID_RE.test(s)) return s.toLowerCase();
  return CODE_RE.test(s) ? s : null;
}

export function parseRefToken(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  return TOKEN_RE.test(s) ? s : null;
}

function word(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  return WORD_RE.test(s) ? s.toLowerCase() : null;
}

type Params = { get(name: string): string | null };

/** What a landing URL's query says, or null when it carries nothing we keep. */
export function touchFromParams(params: Params): Touch | null {
  const rawRef = params.get('ref');
  const tag = parseTag(rawRef);
  // Canopi also accepts its legacy code as ?ref=; ours are tags, so only a ref_... code or a UUID counts as one.
  const refAsCode = !tag && rawRef && (LEGACY_CODE_RE.test(rawRef.trim()) || UUID_RE.test(rawRef.trim())) ? rawRef : null;
  const referralCode = parseReferralCode(params.get('referralCode') ?? params.get('referral_code') ?? refAsCode);
  const refToken = parseRefToken(params.get('ref_token'));
  if (!tag && !referralCode && !refToken) return null;
  const fromCanopi = Boolean(referralCode || refToken);
  return {
    tag,
    referralCode,
    refToken,
    channel: fromCanopi ? word(params.get('ch')) : null,
    utmSource: fromCanopi ? word(params.get('utm_source')) : null,
    utmMedium: fromCanopi ? word(params.get('utm_medium')) : null,
    utmCampaign: fromCanopi ? word(params.get('utm_campaign')) : null,
  };
}

/** The cookie after a touch: first tag kept, last tag replaced, the first referral kept. */
export function mergeArrival(prev: Arrival | null, touch: Touch, now: Date): Arrival {
  const at = now.toISOString();
  const base: Arrival = prev ?? { v: 1, ft: null, fa: null, lt: null, la: null, rc: null, rt: null, ch: null, us: null, um: null, uc: null, at };
  const next: Arrival = { ...base };
  if (touch.tag) {
    if (!next.ft) {
      next.ft = touch.tag;
      next.fa = at;
    }
    next.lt = touch.tag;
    next.la = at;
  }
  if ((touch.referralCode || touch.refToken) && !next.rc && !next.rt) {
    next.rc = touch.referralCode;
    next.rt = touch.refToken;
    next.ch = touch.channel;
    next.us = touch.utmSource;
    next.um = touch.utmMedium;
    next.uc = touch.utmCampaign;
  }
  return next;
}

export function encodeArrival(a: Arrival): string {
  return encodeURIComponent(JSON.stringify(a));
}

const isoOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.length > 40) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
};

/** Reads the cookie back, re-checking every field (it is client-held). Null when missing or unreadable. */
export function decodeArrival(raw: string | null | undefined): Arrival | null {
  if (!raw || raw.length > 3000) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object' || obj.v !== 1) return null;
  const a: Arrival = {
    v: 1,
    ft: parseTag(obj.ft),
    fa: isoOrNull(obj.fa),
    lt: parseTag(obj.lt),
    la: isoOrNull(obj.la),
    rc: parseReferralCode(obj.rc),
    rt: parseRefToken(obj.rt),
    ch: word(obj.ch),
    us: word(obj.us),
    um: word(obj.um),
    uc: word(obj.uc),
    at: isoOrNull(obj.at) || new Date(0).toISOString(),
  };
  if (!a.ft && !a.lt && !a.rc && !a.rt) return null;
  return a;
}

/**
 * The referral as one short label for counting: the legacy code, else "token:<first 12 chars of the token's
 * signature>" (one label per share; the token itself stays out of the table and the readout).
 */
export function referralLabel(a: Pick<Arrival, 'rc' | 'rt'> | null): string | null {
  if (!a) return null;
  if (a.rc) return a.rc;
  if (a.rt) return `token:${a.rt.split('.')[1].slice(0, 12)}`;
  return null;
}

/** The row stored with a first ballot submission (dp_ballot_vote_attribution). */
export type VoteAttribution = {
  firstRef: string | null;
  lastRef: string | null;
  referralCode: string | null;
  referralChannel: string | null;
  utmCampaign: string | null;
  landedAt: string | null;
};

export function voteAttribution(a: Arrival | null): VoteAttribution {
  return {
    firstRef: a?.ft ?? null,
    lastRef: a?.lt ?? null,
    referralCode: referralLabel(a),
    referralChannel: a?.ch ?? null,
    utmCampaign: a?.uc ?? null,
    landedAt: a ? a.fa || a.at : null,
  };
}

/** Extra fields for Canopi's POST /api/auth/web3auth (routes/web3auth.js): the embed instance and the referral. */
export function canopiSignupFields(a: Arrival | null, canopiId: string): Record<string, string> {
  const out: Record<string, string> = { canopiId };
  if (a?.rc) out.referralCode = a.rc;
  if (a?.rt) out.refToken = a.rt;
  return out;
}
