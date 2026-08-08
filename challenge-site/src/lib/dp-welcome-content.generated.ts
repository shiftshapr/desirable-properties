// This file is generated from docs/dp-welcome-messages.md. Do not edit manually.

export const DP_WELCOME_SUBJECT_MEMBER = "Welcome to the Desirable Properties Challenge";
export const DP_WELCOME_SUBJECT_COORDINATOR = "Welcome to the Desirable Properties Challenge – Workgroup coordinator";

export const CHALLENGE_KEY_DATES = {
  "communityReviewBegins": {
    "title": "Community review begins",
    "label": "August 10, 2026",
    "iso": "2026-08-10",
    "note": null
  },
  "workgroupSynthesis": {
    "title": "Workgroup synthesis target",
    "label": "September 1, 2026",
    "iso": "2026-09-01",
    "note": "v1.0 editorial window"
  },
  "bookLaunch": {
    "title": "Book and monument launch",
    "label": "September 16, 2026",
    "iso": "2026-09-16",
    "note": null
  }
} as const;

export const MESSAGE_A_SECTIONS = {
  "arcIntro": "The properties you help refine today become the requirements and architectural decisions that guide how the Overweb – and the broader Meta-Layer – gets built:",
  "arcImage": {
    "alt": "We are here to define the next level of the internet: Desirable Properties Challenge → Requirements → Architecture Decision Records → Build Overweb",
    "src": "/images/dp-challenge-arc.jpg"
  },
  "missionTitle": "Your mission",
  "missionBody": "We are glad you are here. You bring experience and a critical lens that this challenge needs.",
  "missionDetail": "Your workgroup is helping refine one or more Desirable Properties – the community-defined qualities a trustworthy Meta-Layer must possess before we lock in protocols. Getting the “what” right is the community’s first and most important architectural decision.",
  "askTitle": "What we ask of you",
  "askItems": [
    "Read your assigned Desirable Property chapter(s) on the book (book.desirableproperties.org).",
    "Review for clarity, context, and completeness.",
    "Discuss on the book – chapter comments are live now (Canopi on each chapter).",
    "Patch on Gov Hub – select a passage in the draft and submit specific suggested text revisions, not just general feedback. (Passage-level patching on the book is coming; use Gov Hub for patches today.)",
    "Participate in workgroup discussion as community feedback arrives from the book and Gov Hub."
  ],
  "timeTitle": "Time & deadline",
  "timeItems": [
    "August 10, 2026 – Community review begins. Plan 1–3 hours per Desirable Property for a thorough review.",
    "September 1, 2026 – Workgroup synthesis (v1.0 editorial window).",
    "September 16, 2026 – The Layered Web and monument launch."
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

export const PROFILE_WELCOME_MEMBER = {
  "title": "Welcome to the Desirable Properties Challenge",
  "body": "Help refine Desirable Properties v0.77 into v1.0 by reviewing for clarity, context, and completeness – and submitting suggested text revisions. Plan 1–3 hours per DP. Synthesis deadline: Sept 1, 2026. Your work defines what the Overweb must enable – before requirements, ADRs, and implementation. Questions? Submit a support request.",
  "linkLabel": "Open your welcome guide"
} as const;

export const PROFILE_WELCOME_COORDINATOR = {
  "title": "Welcome to the Desirable Properties Challenge – Workgroup coordinator",
  "body": "You're approved as workgroup coordinator. In addition to the member duties above:",
  "linkLabel": "Open your combined welcome guide"
} as const;

export type DpWelcomeVariant = 'member' | 'coordinator';
