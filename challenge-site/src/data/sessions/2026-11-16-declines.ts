/**
 * Why proposals were declined or deferred in Version 1.0 (asked for by Benn Konsynski in the 16 November 2026
 * session, 00:23:44). Aggregate only: no names, no proposal ids, no quotes. Claude categorised the co-editors'
 * decision notes and, where the note was the steering sweep's standard line, the steering analysis the two votes
 * acted on. Full analysis (owner only): ~/handoff/specs/v1-declines-deferrals-pathology.md.
 *
 * Not part of the draft ballot, so not time-gated.
 */

export type DeclineCategory = {
  key: string;
  label: string;
  /** Proposals with this as their main reason (the main reasons add up to the total). */
  primary: number;
  declined: number;
  deferred: number;
  /** Proposals where this reason applies at all (reasons overlap). */
  any: number;
  /** Share of all declined and deferred proposals, by main reason, in percent (rounded). */
  share: number;
  definition: string;
  examples: string[];
  helps: string;
};

export const DECLINES_AS_OF = '17 November 2026';
export const DECLINES_ROUND = '15 July to 13 November 2026';

export const DECLINES_TOTALS = {
  total: 64,
  declined: 30,
  deferred: 34,
  fromPeople: 29,
  fromStewards: 35,
  /** Proposals filed by people (not steward accounts) in the round, and what happened to them. */
  people: { filed: 240, published: 203, publishedAfterRevision: 110, declined: 18, deferred: 11 },
  /** Proposals published after a co-editor revised them, and how many of those were the same text moved. */
  revisedThenPublished: 125,
  revisedSameTextMoved: 18,
  /** Records labelled "considered" in Gov Hub, of which only `deferred` are real deferrals. */
  consideredRecords: 189,
};

export const DECLINE_CATEGORIES: DeclineCategory[] = [
  {
    "key": "late_cross_dp",
    "label": "Late cross-chapter fix",
    "primary": 10,
    "declined": 0,
    "deferred": 10,
    "any": 10,
    "share": 16,
    "definition": "A fix for a contradiction between chapters, filed after the editorial freeze. It changed what a chapter says, so it needed its own vote and was carried to Version 1.1.",
    "examples": [
      "Making one chapter's \"rules take effect immediately\" match another chapter's notice periods.",
      "Pointing a chapter to the chapter that actually holds a binding rule."
    ],
    "helps": "Raise cross-chapter contradictions early in the cycle, while there is still time to vote on them."
  },
  {
    "key": "wording",
    "label": "Word change that does not improve the text",
    "primary": 8,
    "declined": 8,
    "deferred": 0,
    "any": 8,
    "share": 12,
    "definition": "Swaps a word or phrase without a gain in meaning, or narrows or blurs what the passage says.",
    "examples": [
      "Replacing a broad term with a narrower, more personal one.",
      "A new chapter title that contradicts what the chapter says about itself."
    ],
    "helps": "Say in the rationale what the change fixes, and check that the new wording means what the chapter needs."
  },
  {
    "key": "restates",
    "label": "Already said elsewhere",
    "primary": 7,
    "declined": 5,
    "deferred": 2,
    "any": 13,
    "share": 11,
    "definition": "Repeats a point the chapter, another chapter or another proposal already makes, sometimes word for word.",
    "examples": [
      "A sentence copied from one section into another.",
      "A reference example that another chapter already carries."
    ],
    "helps": "Search the chapter and the book for the idea first. If it is there, propose a cross-reference or a sharper version."
  },
  {
    "key": "placement",
    "label": "Right idea, wrong place",
    "primary": 7,
    "declined": 2,
    "deferred": 5,
    "any": 12,
    "share": 11,
    "definition": "The text fits the chapter, but its anchor puts it in the wrong section or separates a list from the failure-mode line that closes it.",
    "examples": [
      "A new subsection inserted after a section's closing line.",
      "An insert anchored in the open-questions list instead of the section it extends."
    ],
    "helps": "Check where the insert will land, and keep each subsection's pattern (mechanism, example, failure mode) together."
  },
  {
    "key": "needs_mechanism",
    "label": "Needs a concrete mechanism",
    "primary": 7,
    "declined": 7,
    "deferred": 0,
    "any": 9,
    "share": 11,
    "definition": "States a value or concern but not how it would be enforced, checked or measured.",
    "examples": [
      "A civic feedback addition that does not say how feedback leads to a visible response.",
      "Community ownership without enforceable decision rights."
    ],
    "helps": "Say who does what, how it is checked and what happens when it fails. Add a short hypothetical example."
  },
  {
    "key": "other_dp",
    "label": "Belongs in another chapter",
    "primary": 7,
    "declined": 0,
    "deferred": 7,
    "any": 9,
    "share": 11,
    "definition": "Sound content whose home is another DP or the front matter.",
    "examples": [
      "Community discovery filed in the identity chapter, when two other chapters cover discoverability and community formation.",
      "Book-wide terms defined inside one chapter."
    ],
    "helps": "Check which DP owns the topic (each idea lives fully in one chapter) and file it there, with a pointer if needed."
  },
  {
    "key": "unsupported",
    "label": "Unsupported claim or broken reference",
    "primary": 5,
    "declined": 2,
    "deferred": 3,
    "any": 10,
    "share": 8,
    "definition": "Cites a section, framework or source that does not exist or is not given, uses an undefined term, or claims something is better without evidence.",
    "examples": [
      "A cross-reference to a pattern the other chapter does not contain.",
      "An outside framework named without a citation."
    ],
    "helps": "Link a source for each factual claim, open every cross-reference to confirm it exists, and define new terms on first use."
  },
  {
    "key": "needs_book_decision",
    "label": "Needs a book-wide decision first",
    "primary": 3,
    "declined": 0,
    "deferred": 3,
    "any": 5,
    "share": 5,
    "definition": "Acceptable on its own, but it would set a precedent for every chapter.",
    "examples": [
      "A plain-language \"in brief\" opening in one chapter only.",
      "Naming a specific implementation before the book has a policy on that."
    ],
    "helps": "Raise the general question first, or propose the change for all chapters together."
  },
  {
    "key": "stale",
    "label": "Overtaken by other changes",
    "primary": 3,
    "declined": 2,
    "deferred": 1,
    "any": 3,
    "share": 5,
    "definition": "The chapter changed under the proposal, another change already did the same thing, or the problem was fixed another way.",
    "examples": [
      "A duplicate-text cleanup whose anchors were rewritten by accepted proposals.",
      "A heading change already made by a book-wide batch."
    ],
    "helps": "Re-check proposals against the current text before decisions, and regenerate bundles after large revisions."
  },
  {
    "key": "neutrality",
    "label": "Balance and neutral language",
    "primary": 2,
    "declined": 2,
    "deferred": 0,
    "any": 4,
    "share": 3,
    "definition": "Singles out one group, model or tradition, or gives one option far more detail than its peers.",
    "examples": [
      "Detailed workings for one funding model where the others get one line each."
    ],
    "helps": "Keep examples balanced, or explain why one example stands for the general case."
  },
  {
    "key": "later_version",
    "label": "Premature for this version",
    "primary": 2,
    "declined": 2,
    "deferred": 0,
    "any": 3,
    "share": 3,
    "definition": "The reviewer saw value in it but wanted testing first or a later version.",
    "examples": [
      "An optional experiment the reviewer preferred to revisit after Version 1.0 had been tested."
    ],
    "helps": "Frame it as an open question or a pilot, and say what testing would show."
  },
  {
    "key": "form",
    "label": "Essay or programme content",
    "primary": 2,
    "declined": 0,
    "deferred": 2,
    "any": 3,
    "share": 3,
    "definition": "Long or programme-style material (pilots, events, essays) instead of a property requirement, sometimes with broken formatting.",
    "examples": [
      "A long essay inserted after a chapter's closing line."
    ],
    "helps": "Keep inserts short, state the requirement, and link longer material as a source."
  },
  {
    "key": "conflicts",
    "label": "Conflicts with the chapter's own principles",
    "primary": 1,
    "declined": 0,
    "deferred": 1,
    "any": 3,
    "share": 2,
    "definition": "Contradicts a non-goal or principle the chapter states.",
    "examples": [
      "Technology-specific requirements in a chapter that says it is technology-neutral."
    ],
    "helps": "Read the chapter's scope and non-goals before drafting."
  }
];

/** Factors that contributed but were never the main reason. */
export const DECLINE_CONTRIBUTING: Array<{ label: string; any: number }> = [
  { label: 'No rationale given', any: 5 },
  { label: 'The only evidence offered was the proposer’s own product', any: 2 },
];

export const DECLINE_PATTERNS: string[] = [
  'Deferral was mostly about timing. All 34 deferrals were decided in the steering committee’s sweep on 11 and 12 November, after the editorial freeze. 15 of them were filed on or after 8 November, and 10 were cross-chapter fixes filed on 12 November.',
  'Placement is the most fixable problem. 12 of the 64 involve placement, and at least 18 of the 125 proposals published after a co-editor revised them were the same text moved to a better place, usually because the insert split a list from the failure-mode line that closes it.',
  'Check for overlap first. 19 of the 64 restated text the book already had or belonged in another chapter.',
  'Co-editors asked for mechanisms. Of the 20 declines made by co-editors or the earlier integration release (not the sweep), 8 said the text did not say how it would be enforced, checked or measured.',
  'Give a reason and a source. 8 declines were word changes with no gain in meaning, 5 declined proposals had no rationale, and 10 of the 64 involve an unsupported claim or a cross-reference to text that does not exist.',
  'Steward accounts, such as Metaweb Academy’s, filed 35 of the 64, including 23 of the 34 deferrals. Filing their proposals earlier, with the relationship to any product stated, would make them easier to decide.',
];

export const DECLINE_DATA_NOTES: string[] = [
  'Gov Hub labels 189 records “considered”, but only 34 are real deferrals. Most of the rest are original proposals that a co-editor replaced with a revised version that was then published.',
  'For 43 of the 64, the decision note is the steering committee’s standard line (“Carried to Version 1.1” or “Declined”). Their reasons were taken from the steering analysis the two votes acted on.',
  'Three declines have notes that suggest deferring instead; they are counted as declined. Test edits and three records that were integrated but never marked published are left out.',
];
