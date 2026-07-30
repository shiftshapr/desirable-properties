// This file is generated from docs/dp-welcome-messages.md. Do not edit manually.

export const DP_WELCOME_SUBJECT_MEMBER = "Welcome to the Desirable Properties Challenge";
export const DP_WELCOME_SUBJECT_LEAD = "Welcome to the Desirable Properties Challenge — Workgroup lead";

export const MESSAGE_A_SECTIONS = {
  "missionTitle": "Your mission",
  "missionBody": "We are glad you are here. You bring experience and a critical lens that this challenge needs.",
  "missionDetail": "Your workgroup is helping refine one or more Desirable Properties—the community-defined qualities a trustworthy Meta-Layer must possess before we lock in protocols. Getting the “what” right is the community’s first and most important architectural decision.",
  "askTitle": "What we ask of you",
  "askItems": [
    "Read your assigned Desirable Property chapter(s) in the current v0.77 draft.",
    "Review for clarity, context, and completeness.",
    "Submit specific suggested text revisions—not just general feedback. Show what clearer wording would look like.",
    "Participate in workgroup discussion as community patches and comments arrive."
  ],
  "timeTitle": "Time & deadline",
  "timeItems": [
    "Plan 1–3 hours per Desirable Property for a thorough review.",
    "Workgroup synthesis targets September 1, 2026 (v1.0 editorial window); the book and monument launch follow on September 16, 2026."
  ],
  "whyTitle": "Why this matters (the bigger picture)",
  "whyBody": "The properties you help refine today become the requirements and architectural decisions that guide how the Overweb—and the broader Meta-Layer—gets built:",
  "arc": "Desirable Properties → Requirements → ADRs → Build Overweb",
  "support": {
    "prefix": "Submit a support request at",
    "site": {
      "label": "desirableproperties.org/support",
      "href": "https://desirableproperties.org/support"
    },
    "hub": {
      "label": "hub.themetalayer.org/support",
      "href": "https://hub.themetalayer.org/support"
    }
  },
  "closing": "Welcome to the challenge."
} as const;

export const MESSAGE_B_LEAD = {
  "title": "As workgroup lead",
  "intro": "You're approved as workgroup lead. In addition to the member duties above:",
  "items": [
    "Coordinate at least one workgroup sync during the review window (late July–August). Rooms in Canopi or another tool your group prefers is fine.",
    "Facilitate discussion so every proposal gets consideration.",
    "Maintain the shared working document and help the group reach rough consensus on recommended revisions.",
    "Prepare synthesis drafts for the editorial process by September 1, 2026."
  ]
} as const;

export type DpWelcomeVariant = 'member' | 'lead';
