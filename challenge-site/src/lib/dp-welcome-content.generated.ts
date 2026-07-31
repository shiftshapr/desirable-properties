// This file is generated from docs/dp-welcome-messages.md. Do not edit manually.

export const DP_WELCOME_SUBJECT_MEMBER = "Welcome to the Desirable Properties Challenge";
export const DP_WELCOME_SUBJECT_COORDINATOR = "Welcome to the Desirable Properties Challenge — Workgroup coordinator";

export const MESSAGE_A_SECTIONS = {
  "arcIntro": "The properties you help refine today become the requirements and architectural decisions that guide how the Overweb—and the broader Meta-Layer—gets built:",
  "arcImage": {
    "alt": "Desirable Properties → Requirements → ADRs → Build Overweb",
    "src": "/images/challenge-arc-placeholder.svg"
  },
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
    "July 16, 2026 — Community review begins. Plan 1–3 hours per Desirable Property for a thorough review.",
    "September 1, 2026 — Workgroup synthesis (v1.0 editorial window).",
    "September 16, 2026 — The book and monument launch."
  ],
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

export const MESSAGE_B_COORDINATOR = {
  "title": "As workgroup coordinator",
  "intro": "You're approved as workgroup coordinator. In addition to the member duties above:",
  "items": [
    "Coordinate at least one workgroup sync during the review window (late July–August). Rooms in Canopi or another tool your group prefers is fine.",
    "Facilitate discussion so every proposal gets consideration.",
    "Maintain the shared working document and help the group reach rough consensus on recommended revisions.",
    "Prepare synthesis drafts for the editorial process by September 1, 2026."
  ]
} as const;

export type DpWelcomeVariant = 'member' | 'coordinator';
