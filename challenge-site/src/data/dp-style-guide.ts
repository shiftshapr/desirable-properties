/**
 * Style guide for the Desirable Properties book (Version 1.1). One source for the
 * /style-guide page and for AI checks of patches and inserts (styleGuideAsText).
 *
 * Rules codify what most chapters already do, measured across the 23 chapters on
 * 13 October 2026, and settle the points where chapters disagree. Update
 * STYLE_GUIDE_UPDATED whenever a rule changes.
 */

export const STYLE_GUIDE_VERSION = '1.1';
export const STYLE_GUIDE_UPDATED = '2026-10-30';

export type StyleRule = {
  rule: string;
  /** Why the rule exists, when it is not obvious. */
  why?: string;
  do?: string;
  dont?: string;
};

export type StyleSection = {
  id: string;
  title: string;
  lead: string;
  rules: StyleRule[];
};

export const STYLE_GUIDE: ReadonlyArray<StyleSection> = [
  {
    id: 'readers',
    title: 'Who we write for',
    lead:
      'Community members, builders, designers and policymakers read the same chapter. Many are technical, many are not, and many read English as a second language. Write so each of them can follow the argument.',
    rules: [
      {
        rule: 'Use plain words. When a technical term is the right word, define it the first time it appears in the chapter.',
        do: 'Sybil attacks – one person running many fake accounts – are cheap at web scale.',
        dont: 'Sybil resistance is required.',
      },
      {
        rule: 'Spell out an abbreviation on first use in each chapter, then use the short form.',
        do: 'Reinforcement Learning and Adaptive Dynamic Programming (RLADP) …',
      },
      {
        rule: 'One idea per paragraph. Keep most sentences under 25 words; split any sentence over 35.',
        why: 'Half the sentences in the book are 14 words or fewer. The long ones are where readers get lost.',
      },
      {
        rule: 'Give a concrete example for each abstract mechanism. Say when an example is hypothetical.',
        do: 'For example, a neighborhood forum could require proof of humanity to post but not to read.',
      },
    ],
  },
  {
    id: 'voice',
    title: 'Voice',
    lead:
      'The book speaks in one voice: calm, precise, third person, present tense. A reader should not be able to tell where one contributor’s text ends and another’s begins.',
    rules: [
      {
        rule: 'Write in the third person. Do not use “I”, “we” or “you” in chapter text.',
        do: 'Participants can leave a zone and take their history with them.',
        dont: 'We believe you should be able to leave and take your history with you.',
      },
      {
        rule: 'Say “participants” for people who use the Meta-Layer. Use “users” only when quoting or describing another system’s users.',
        why: 'The book already says participants more than five times as often as users; the word signals agency.',
      },
      {
        rule: 'Use the present tense for what the Meta-Layer does or requires.',
        do: 'Authentication answers the question of who may enter.',
        dont: 'Authentication will answer the question of who may enter.',
      },
      {
        rule: 'State limits honestly. Prefer a qualified claim to a confident one that overreaches.',
        do: 'Containment may be partial, contextual, and imperfect, but it must never be misrepresented as stronger than it is.',
      },
      {
        rule: 'No marketing language: avoid words such as revolutionary, seamless, game-changing, unprecedented and cutting-edge.',
      },
    ],
  },
  {
    id: 'requirements',
    title: 'Requirements: MUST, SHOULD, MAY',
    lead:
      'Version 1.0 feeds the ML-REQs in December, so the book must make clear which sentences are requirements. The keywords follow RFC 2119 and RFC 8174.',
    rules: [
      {
        rule: 'Use capital MUST, MUST NOT, SHOULD, SHOULD NOT and MAY only for requirements. Lowercase must, should and may are ordinary English.',
        why: 'Today the book has 241 capital MUSTs and 652 lowercase ones, and readers cannot tell which are binding.',
      },
      {
        rule: 'Each requirement names who it applies to and can be checked. If it cannot be checked, make it guidance in lowercase.',
        do: 'A zone MUST publish its access rules before it admits participants.',
        dont: 'Systems MUST be trustworthy.',
      },
      {
        rule: 'One requirement per sentence.',
      },
      {
        rule: 'Requirements belong in Primary Mechanisms and Structural Conditions and in Minimum DPn Alignment. A section marked “(Non-Normative)” contains no capital keywords.',
        why: 'Twelve chapters use capital keywords 115 times inside sections headed “(Non-Normative)”, which contradicts the heading.',
      },
      {
        rule: 'Do not change a requirement’s strength (MUST to SHOULD, or the reverse) without saying so in the proposal’s rationale.',
      },
    ],
  },
  {
    id: 'structure',
    title: 'Chapter structure',
    lead:
      'Every chapter follows the DP chapter template, so a reader who knows one chapter can find their way in any other.',
    rules: [
      {
        rule: 'Keep the template’s order: Purpose of This Draft, Problem Statement, Threats and Failure Modes, Core Principle, Primary Mechanisms and Structural Conditions, then the optional and DP-specific sections, then the six closing sections.',
      },
      {
        rule: 'The six closing sections are required in every chapter: Relationship to Other Desirable Properties, Non-Goals and Explicit Boundaries, Minimum DPn Alignment, Open Questions and Future Work, Path Toward ML-RFC, and Closing Orientation.',
      },
      {
        rule: 'Under the title, keep a one-line italic tagline written for participants.',
        do: '*The Conditions for Trust – strong, federated authentication and decentralized accountability are the foundations for real trust, safe interaction, and meaningful community.*',
      },
      {
        rule: 'Number every section (## 7.) and subsection (### 7.2). A new section takes the next number in its place and the sections after it are renumbered.',
      },
      {
        rule: 'Put new material where it belongs once. If an idea already appears elsewhere in the chapter, extend that passage instead of adding a second one.',
        why: 'Synthesis, not stacking: restating a point in several places weakens the book.',
      },
    ],
  },
  {
    id: 'headings',
    title: 'Headings',
    lead: 'Section headings use title case; subsection headings use sentence case, as most chapters already do.',
    rules: [
      {
        rule: 'Section headings (##) in title case.',
        do: '## 7. Sociotechnical Zones as Trust Contexts',
      },
      {
        rule: 'Subsection headings (###) in sentence case: capitalize the first word and proper nouns only.',
        do: '### 7.5 Privacy-preserving community discovery',
        dont: '### 7.5 Privacy-Preserving Community Discovery',
      },
      {
        rule: 'Keep headings short and descriptive. No full stop at the end, and no question marks unless the section answers that question.',
      },
    ],
  },
  {
    id: 'terms',
    title: 'Terms and spelling',
    lead: 'Use one spelling for each term across the book. American English.',
    rules: [
      {
        rule: 'American spelling: behavior, organization, center, license (noun and verb).',
      },
      {
        rule: '“the Meta-Layer” is a proper noun when it means the layer this book describes; “a meta-layer” is the general idea.',
        do: 'Data sovereignty in the Meta-Layer requires that …',
        dont: 'Data sovereignty in the meta-layer requires that …',
      },
      {
        rule: 'Desirable Property, capitalized; spell it out with the number on first use in a chapter, then use the short form with no space.',
        do: 'Desirable Property 4 (DP4) … DP4 …',
        dont: 'DP 4, Dp4, desirable property 4',
      },
      {
        rule: 'Fixed forms: AI; AI agent; human and AI agents; sociotechnical; decision-making; online; email; the web (lowercase); ML-Draft; ML-RFC; ML-REQ; Gov Hub; Canopi.',
      },
      {
        rule: 'Hyphenate compound terms only when they come before a noun.',
        do: 'Zones may require proof of humanity. A proof-of-humanity check …',
      },
    ],
  },
  {
    id: 'punctuation',
    title: 'Punctuation and formatting',
    lead: 'Formatting should help a reader scan, not shout.',
    rules: [
      {
        rule: 'Use a spaced en dash ( – ) for an aside or a break in a sentence. Not an em dash (—) or two hyphens (--).',
        why: 'The book mixes the two about equally (91 en dashes, 103 em dashes). Titles and the site already use the en dash.',
      },
      {
        rule: 'Use the serial (Oxford) comma.',
        do: 'identity, accountability, and governance',
      },
      {
        rule: 'Bold a term where it is defined, or the one key claim of a section. At most one bold phrase per paragraph.',
        why: 'The book has more than 2,100 bold phrases; when everything is bold, nothing stands out.',
      },
      {
        rule: 'Italics for the chapter tagline, section taglines and words used as words. Not for emphasis.',
      },
      {
        rule: 'Bulleted list items are parallel in form. Fragments take no full stop; full sentences do.',
      },
      {
        rule: 'Numbers: spell out one to nine; use numerals from 10. Dates as November 13, 2026.',
      },
    ],
  },
  {
    id: 'references',
    title: 'Cross-references',
    lead: 'Point to other passages instead of repeating them.',
    rules: [
      {
        rule: 'Refer to a section in the same chapter as “Section 7.2”. Do not use §.',
        do: 'Anonymous participation remains subject to the zone boundaries in Sections 7 and 18.',
      },
      {
        rule: 'Refer to another chapter as “DP4, Section 5”, and summarize the point in a few words rather than restating it.',
      },
      {
        rule: 'When two DPs both cover an idea, it lives fully in one. The other chapter gives one or two sentences and the cross-reference.',
      },
    ],
  },
  {
    id: 'evidence',
    title: 'Evidence and sources',
    lead:
      'A chapter mixes two kinds of claim: what the Meta-Layer should do (design), and what is true of the world (fact). Facts need sources.',
    rules: [
      {
        rule: 'Support every factual claim about the world – a statistic, an incident, a law, a study – with a source.',
        why: 'The chapters currently cite no sources; reviewers have asked where claims come from.',
      },
      {
        rule: 'Cite with an inline link on descriptive text. No bare URLs.',
        do: '[EU AI Act, Article 50](https://…) requires providers to disclose …',
        dont: 'See https://… for details.',
      },
      {
        rule: 'Design statements need no citation, but should say why. Mark an example as hypothetical when it is.',
      },
    ],
  },
  {
    id: 'proposals',
    title: 'Writing a patch or insert',
    lead:
      'A proposal is read twice: by co-editors deciding on it, and later by readers who never see that it was a proposal. Write the text exactly as it should appear in the book.',
    rules: [
      {
        rule: 'Match the voice and terms of the surrounding passage, so the result reads as one text.',
      },
      {
        rule: 'The proposed text stands on its own. Do not write “this patch adds”, “as suggested above” or “I propose”.',
        dont: 'I propose adding that zones should publish their rules.',
        do: 'A zone MUST publish its access rules before it admits participants.',
      },
      {
        rule: 'Put the reasons, sources and context in the rationale field, not in the proposed text.',
      },
      {
        rule: 'One proposal for each place in the chapter. Changes that go in different places are separate proposals; changes that go in one place stay one proposal, even when they make more than one point.',
        why: 'Each proposal has one anchor, and co-editors can approve one place and decline another.',
      },
      {
        rule: 'Check the chapter first. If the idea is already there, patch that passage instead of inserting a new one.',
      },
      {
        rule: 'Keep a proposal in proportion to the passage it changes. A long insert into a short section usually belongs in its own subsection.',
      },
      {
        rule: 'If an AI tool drafted the wording, say so in the rationale. A person is still responsible for it.',
        why: 'AI assists; people decide, and AI-drafted text is labelled.',
      },
    ],
  },
  {
    id: 'co-editors',
    title: 'For co-editors',
    lead: 'The guide helps you decide; it is not a reason to turn down a good idea.',
    rules: [
      {
        rule: 'Judge a proposal first on substance: is it right, does it belong in this DP, does it duplicate something?',
      },
      {
        rule: 'Do not decline a sound proposal for style alone. Fix the style when you integrate it, or ask the author to revise, and say which rule applies.',
      },
      {
        rule: 'When you decline, name the reason in a sentence the author can act on. Cite the rule by its section here when style is part of it.',
        do: 'Declined: this restates DP14, Section 6. A one-line cross-reference there would cover it (style guide: Cross-references).',
      },
    ],
  },
];

/** Plain-text form of the guide for AI review prompts. */
export function styleGuideAsText(): string {
  const lines: string[] = [
    `Desirable Properties book – style guide v${STYLE_GUIDE_VERSION} (updated ${STYLE_GUIDE_UPDATED})`,
  ];
  for (const section of STYLE_GUIDE) {
    lines.push('', `## ${section.title}`, section.lead);
    for (const r of section.rules) {
      lines.push(`- ${r.rule}`);
      if (r.do) lines.push(`  Do: ${r.do}`);
      if (r.dont) lines.push(`  Don't: ${r.dont}`);
    }
  }
  return lines.join('\n');
}
