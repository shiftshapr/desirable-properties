/**
 * Pad settings. Client-safe (no secrets): the decision rule is read on the server and passed to the page.
 *
 * PAD_DECISION_RULE (owner, 20 Nov 2026: "co-editors decide"):
 *   co_editors      (default) the DP's co-editors decide; the community's Support / Concern is advisory.
 *   community_vote  reserved for a future rule where the community vote counts. Switching it changes the wording on
 *                   every pad; no code decides a proposal from community votes yet (that needs its own rule first).
 *
 * PAD_FOLLOW_EMAILS: "on" lets the follow sweep email followers when a pad's status changes. Off by default, so no
 * email goes out until the owner turns it on (src/lib/pads/pad-follow-sweep.server.ts).
 */
export type PadDecisionRule = 'co_editors' | 'community_vote';

export function padDecisionRule(raw: string | undefined | null): PadDecisionRule {
  return String(raw || '').trim().toLowerCase() === 'community_vote' ? 'community_vote' : 'co_editors';
}

export const DECISION_RULE_COPY: Record<PadDecisionRule, { badge: string; line: string }> = {
  co_editors: {
    badge: 'Advisory: co-editors decide.',
    line: "Support and Concern tell the co-editors what readers think. They do not decide the proposal: this DP's co-editors do.",
  },
  community_vote: {
    badge: 'Community vote.',
    line: 'Support and Concern are counted under the community vote rule set for Version 1.1.',
  },
};

export function padFollowEmailsOn(raw: string | undefined | null): boolean {
  return String(raw || '').trim().toLowerCase() === 'on';
}

/** One line, at most this many characters. */
export const ADVISORY_REASON_MAX = 200;
