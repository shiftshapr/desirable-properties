import type { OptionProvenance } from '@/lib/sessions/option-provenance-core';

/**
 * Who proposed, seconded or supported each ballot option, and what became of it, for every listening session so far.
 *
 * Backfilled on 24 Nov 2026 by scripts/generate-option-provenance.mjs from the ballot definitions, the drafts, the
 * transcripts, the 20 Nov walk-through pad and the published 16 Nov results (2026-11-16-results.json), then checked
 * by hand. This file is now the source of truth: edit it directly. Each new session's draft adds its options here
 * (see "Option provenance" in ~/handoff/session-drafts/brief.md); scripts/option-provenance.test.mjs checks it.
 *
 * Real names only. Seconders need evidence; "support" means someone spoke for the option without seconding it.
 */
export const OPTION_PROVENANCE: readonly OptionProvenance[] = [
  {
    "id": "meta-governance-2026-11-16/q1/yes",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q1",
    "questionN": 1,
    "questionText": "Should the community run the weekly listen, draft, verify, screen and vote cycle as a four-session pilot and evaluate it afterward?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:06:06",
      "quote": "maybe we could do a four-session pilot"
    },
    "seconders": [
      {
        "name": "Benn Konsynski",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "00:46:02",
          "quote": "You need that cadence. I agree."
        }
      }
    ],
    "status": "approved",
    "outcome": {
      "votes": 20,
      "ballots": 24,
      "abstain": 3,
      "result": "passed"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q1/no",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q1",
    "questionN": 1,
    "questionText": "Should the community run the weekly listen, draft, verify, screen and vote cycle as a four-session pilot and evaluate it afterward?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "not_approved",
    "outcome": {
      "votes": 1,
      "ballots": 24,
      "abstain": 3,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q2/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q2",
    "questionN": 2,
    "questionText": "How long should the correction window be?",
    "option": "a",
    "optionLabel": "24 hours, with a notice email about 12 hours before it opens",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:46:59",
      "quote": "is 24 h enough to, you know, verify the draft"
    },
    "contributors": [
      {
        "name": "Joel Okomoli",
        "what": "the notice email about 12 hours ahead",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:25:50",
          "quote": "maybe a warning email first"
        }
      }
    ],
    "seconders": [
      {
        "name": "Stella Alvo",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "00:47:33",
          "quote": "I think it’s a start."
        }
      }
    ],
    "status": "not_approved",
    "outcome": {
      "votes": 5,
      "ballots": 24,
      "abstain": 1,
      "result": "winner"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q2/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q2",
    "questionN": 2,
    "questionText": "How long should the correction window be?",
    "option": "b",
    "optionLabel": "48 hours",
    "origin": "drafted",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "Not recorded: nobody named 48 hours for the correction window in the meeting. The host asked \"24 hours? Or do you want to…\" (00:46:59) and the draft added 48 hours as the alternative.",
    "status": "approved",
    "outcome": {
      "votes": 18,
      "ballots": 24,
      "abstain": 1,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q3/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q3",
    "questionN": 3,
    "questionText": "How long should a voting period last?",
    "option": "a",
    "optionLabel": "48 hours",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:38:18",
      "quote": "the community would vote over, say, 48 or 72 hour period"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 3,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q3/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q3",
    "questionN": 3,
    "questionText": "How long should a voting period last?",
    "option": "b",
    "optionLabel": "72 hours",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:38:18",
      "quote": "the community would vote over, say, 48 or 72 hour period"
    },
    "status": "approved",
    "outcome": {
      "votes": 21,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q4/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q4",
    "questionN": 4,
    "questionText": "Which approval rule should community ballots use?",
    "option": "a",
    "optionLabel": "More than 50%",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:53:05",
      "quote": "I’m going to throw out 50%"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 3,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q4/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q4",
    "questionN": 4,
    "questionText": "Which approval rule should community ballots use?",
    "option": "b",
    "optionLabel": "60%",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "it could be 60%, could be 67%"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 3,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q4/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q4",
    "questionN": 4,
    "questionText": "Which approval rule should community ballots use?",
    "option": "c",
    "optionLabel": "67%",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "it could be 60%, could be 67%"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 1,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q4/d",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q4",
    "questionN": 4,
    "questionText": "Which approval rule should community ballots use?",
    "option": "d",
    "optionLabel": "Two tiers: 50% keeps the item open for review, 60% or more passes it",
    "origin": "participant",
    "proposer": "Lord M.E.G.A Zion",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:53:35",
      "quote": "it would justify a reason to be held… capable for review"
    },
    "notes": "The host restated it as 50% keeping an item open and 60% to 70% moving it forward (00:55:24); Lord M.E.G.A Zion agreed (00:55:46). Named as in the Version 1.0 acknowledgements (his Zoom name).",
    "status": "approved",
    "outcome": {
      "votes": 11,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q4/e",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q4",
    "questionN": 4,
    "questionText": "Which approval rule should community ballots use?",
    "option": "e",
    "optionLabel": "Consent: an item passes unless someone raises a reasoned objection; if an objection cannot be resolved, seek full agreement; any decision can be reopened later",
    "origin": "participant",
    "proposer": "Gael Van Weyenbergh",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:55:58",
      "quote": "I think we should strive for consent"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 6,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q5/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q5",
    "questionN": 5,
    "questionText": "What quorum should apply during the pilot?",
    "option": "a",
    "optionLabel": "No quorum",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:56:47",
      "quote": "Anyone have any thoughts on whether we should set a quorum?"
    },
    "notes": "No one answered when the host asked about quorum (00:56:47).",
    "status": "not_approved",
    "outcome": {
      "votes": 5,
      "ballots": 24,
      "abstain": 5,
      "result": "tie"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q5/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q5",
    "questionN": 5,
    "questionText": "What quorum should apply during the pilot?",
    "option": "b",
    "optionLabel": "A fixed minimum of 20 votes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "we need 20 votes"
    },
    "status": "tie",
    "outcome": {
      "votes": 6,
      "ballots": 24,
      "abstain": 5,
      "result": "tie"
    },
    "notes": "Tied 6 to 6; the quorum question went back to the 23 Nov session (draft ballot question 1).",
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q5/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q5",
    "questionN": 5,
    "questionText": "What quorum should apply during the pilot?",
    "option": "c",
    "optionLabel": "10% of the voting body",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "10% of the, the, the voting body"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 2,
      "ballots": 24,
      "abstain": 5,
      "result": "tie"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q5/d",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q5",
    "questionN": 5,
    "questionText": "What quorum should apply during the pilot?",
    "option": "d",
    "optionLabel": "25% of the voting body",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "or 25% of the voting body"
    },
    "status": "tie",
    "outcome": {
      "votes": 6,
      "ballots": 24,
      "abstain": 5,
      "result": "tie"
    },
    "notes": "Tied 6 to 6; the quorum question went back to the 23 Nov session (draft ballot question 1).",
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q6/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q6",
    "questionN": 6,
    "questionText": "Which co-editor arrangement should apply?",
    "option": "a",
    "optionLabel": "Up to 3 seats, 2 approvals needed (the current site setup)",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:49:36",
      "quote": "3 co-editors and 2 approvals needed… This is what chat suggested"
    },
    "seconders": [
      {
        "name": "Gael Van Weyenbergh",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "00:51:07",
          "quote": "Let’s try it out like this."
        }
      }
    ],
    "notes": "The setup the host had already put on the site, from the ChatGPT straw proposal.",
    "status": "approved",
    "outcome": {
      "votes": 20,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q6/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q6",
    "questionN": 6,
    "questionText": "Which co-editor arrangement should apply?",
    "option": "b",
    "optionLabel": "2 seats, both approvals needed (the Version 1.0 text)",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:49:36",
      "quote": "are there people who would prefer to stay with two co-editors"
    },
    "notes": "The Version 1.0 text. Stella Alvo raised the concern that three co-editors would be hard to fill (00:41:37).",
    "status": "not_approved",
    "outcome": {
      "votes": 2,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q7/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q7",
    "questionN": 7,
    "questionText": "What should happen when one co-editor declines?",
    "option": "a",
    "optionLabel": "Keep the current rule: the decline carries a note, and two approvals can overrule it",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:18:52",
      "quote": "having the possibility that two yeses can overrule a no"
    },
    "notes": "The current rule. Lord M.E.G.A Zion said \"I’m gonna second them\" (01:18:10) after Leandra Preston spoke against a single decline ending a proposal; it is not clear whether that seconds keeping this rule or the further-review alternative, so no seconder is recorded.",
    "status": "approved",
    "outcome": {
      "votes": 16,
      "ballots": 24,
      "abstain": 1,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q7/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q7",
    "questionN": 7,
    "questionText": "What should happen when one co-editor declines?",
    "option": "b",
    "optionLabel": "One decline ends the proposal",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:16:52",
      "quote": "we could make it so that… just one decline ends the proposal"
    },
    "notes": "A question Claude had identified, put to the room by the host. Leandra Preston, Benn Konsynski and Lord M.E.G.A Zion spoke against it (01:17:26 to 01:18:24).",
    "status": "not_approved",
    "outcome": {
      "votes": 0,
      "ballots": 24,
      "abstain": 1,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q7/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q7",
    "questionN": 7,
    "questionText": "What should happen when one co-editor declines?",
    "option": "c",
    "optionLabel": "A decline sends the proposal to further review",
    "origin": "participant",
    "proposer": "Leandra Preston",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:17:26",
      "quote": "Or one could send it to a level to be looked at"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 7,
      "ballots": 24,
      "abstain": 1,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q8/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q8",
    "questionN": 8,
    "questionText": "Who should approve a chapter title change?",
    "option": "a",
    "optionLabel": "The steering committee, or the council once one exists",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:57:35",
      "quote": "A title change to a chapter requires steering approval"
    },
    "notes": "From the ChatGPT straw proposal.",
    "status": "not_approved",
    "outcome": {
      "votes": 8,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q8/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q8",
    "questionN": 8,
    "questionText": "Who should approve a chapter title change?",
    "option": "b",
    "optionLabel": "75% of the chapter's authors and co-editors, then the steering committee or council",
    "origin": "participant",
    "proposer": "Stella Alvo",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:00:17",
      "quote": "at least 75% of the… Of the people who wrote the chapter"
    },
    "seconders": [
      {
        "name": "Leandra Preston",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:00:24",
          "quote": "Oh, yeah. And authors. Yeah, yeah. Good point."
        }
      }
    ],
    "status": "approved",
    "outcome": {
      "votes": 16,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q8/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q8",
    "questionN": 8,
    "questionText": "Who should approve a chapter title change?",
    "option": "c",
    "optionLabel": "A full community vote",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:59:06",
      "quote": "it may be that it should actually go to the entire community as a vote"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 0,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q9/yes",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q9",
    "questionN": 9,
    "questionText": "Should the community elect a council to screen ballots for readiness (not to decide them)?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:13:31",
      "quote": "that council should probably be elected"
    },
    "status": "approved",
    "outcome": {
      "votes": 17,
      "ballots": 24,
      "abstain": 4,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q9/no",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q9",
    "questionN": 9,
    "questionText": "Should the community elect a council to screen ballots for readiness (not to decide them)?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "not_approved",
    "outcome": {
      "votes": 3,
      "ballots": 24,
      "abstain": 4,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q10/yes",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q10",
    "questionN": 10,
    "questionText": "Should an interim council of Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar serve until a council is elected, and prepare the elections?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "source",
      "label": "16 Nov draft: proposal added after the meeting",
      "file": "src/data/sessions/2026-11-16-draft.json",
      "quote": "Daveed Benjamin proposes appointing an interim council that acts now and prepares for council elections.",
      "href": "/events/meta-governance-2026-11-16#draft"
    },
    "notes": "Made after the meeting, so it is not in the transcript. The council was formed in the 23 Nov meeting once Michelle Thuo confirmed in the chat (23 Nov 00:51:35).",
    "status": "approved",
    "outcome": {
      "votes": 21,
      "ballots": 24,
      "abstain": 3,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q10/no",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q10",
    "questionN": 10,
    "questionText": "Should an interim council of Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar serve until a council is elected, and prepare the elections?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "not_approved",
    "outcome": {
      "votes": 0,
      "ballots": 24,
      "abstain": 3,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q11/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q11",
    "questionN": 11,
    "questionText": "If a council is elected, how many members should it have?",
    "option": "a",
    "optionLabel": "5",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:13:31",
      "quote": "Should it be 5? Should it be 7?"
    },
    "seconders": [
      {
        "name": "Gael Van Weyenbergh",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:14:56",
          "quote": "I think five is good."
        }
      }
    ],
    "notes": "The host also read out a participant named only as Suzanne saying to start with five (01:15:13); not recorded as a supporter.",
    "status": "not_approved",
    "outcome": {
      "votes": 7,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q11/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q11",
    "questionN": 11,
    "questionText": "If a council is elected, how many members should it have?",
    "option": "b",
    "optionLabel": "7",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:13:31",
      "quote": "Should it be 5? Should it be 7?"
    },
    "status": "approved",
    "outcome": {
      "votes": 11,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q11/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q11",
    "questionN": 11,
    "questionText": "If a council is elected, how many members should it have?",
    "option": "c",
    "optionLabel": "9",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:13:31",
      "quote": "like five, seven, nine"
    },
    "status": "not_approved",
    "outcome": {
      "votes": 4,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q12/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q12",
    "questionN": 12,
    "questionText": "If a council is elected, what should its scope be?",
    "option": "a",
    "optionLabel": "The Desirable Properties only",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:15:13",
      "quote": "I’m kind of leaning towards having a council that would be specifically on the desirable properties"
    },
    "seconders": [
      {
        "name": "Renad Baomar",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:15:13",
          "quote": "Renad says yes."
        }
      }
    ],
    "notes": "Renad Baomar’s yes was in the chat; the host read it out.",
    "status": "not_approved",
    "outcome": {
      "votes": 9,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q12/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q12",
    "questionN": 12,
    "questionText": "If a council is elected, what should its scope be?",
    "option": "b",
    "optionLabel": "The Desirable Properties and the wider Meta-Layer Initiative, including Metaweb Academy",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:15:13",
      "quote": "or it could be Metalayer Council… Desirable Properties and. the Metalayer Academy"
    },
    "status": "approved",
    "outcome": {
      "votes": 15,
      "ballots": 24,
      "abstain": 0,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q13/yes",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q13",
    "questionN": 13,
    "questionText": "Should council screening use published criteria, with written reasons for every item held back?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:48:38",
      "quote": "We should probably have a published screening criteria"
    },
    "status": "approved",
    "outcome": {
      "votes": 21,
      "ballots": 24,
      "abstain": 1,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q13/no",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q13",
    "questionN": 13,
    "questionText": "Should council screening use published criteria, with written reasons for every item held back?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "not_approved",
    "outcome": {
      "votes": 2,
      "ballots": 24,
      "abstain": 1,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q14/yes",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q14",
    "questionN": 14,
    "questionText": "Should new co-editors sign a co-editor agreement?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:22:45",
      "quote": "What do you all think about having some kind of co-editor agreement?"
    },
    "seconders": [
      {
        "name": "Renad Baomar",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:22:45",
          "quote": "Renad says yes."
        }
      },
      {
        "name": "Joel Okomoli",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "meta-governance-2026-11-16",
          "at": "01:23:50",
          "quote": "Joel says yes as well."
        }
      }
    ],
    "notes": "Both yeses were in the chat and read out by the host; he also said Allison Gustavson was nodding (01:22:45).",
    "status": "approved",
    "outcome": {
      "votes": 17,
      "ballots": 23,
      "abstain": 2,
      "result": "passed"
    }
  },
  {
    "id": "meta-governance-2026-11-16/q14/no",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q14",
    "questionN": 14,
    "questionText": "Should new co-editors sign a co-editor agreement?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "not_approved",
    "outcome": {
      "votes": 4,
      "ballots": 23,
      "abstain": 2,
      "result": "passed"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q15/a",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q15",
    "questionN": 15,
    "questionText": "How should new co-editors be vetted?",
    "option": "a",
    "optionLabel": "No vetting beyond account age",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:19:28",
      "quote": "But it does not have any vetting, so how do people feel about that?"
    },
    "notes": "The current setup: any account at least 7 days old.",
    "status": "not_approved",
    "outcome": {
      "votes": 4,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q15/b",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q15",
    "questionN": 15,
    "questionText": "How should new co-editors be vetted?",
    "option": "b",
    "optionLabel": "A questionnaire that is published but not screened",
    "origin": "participant",
    "proposer": "Lord M.E.G.A Zion",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:20:57",
      "quote": "these, uh, prerequisites or questionnaires or even voluntary statements"
    },
    "notes": "The host split the questionnaire into screened and not screened (01:22:01); Lord M.E.G.A Zion answered \"Both\" (01:22:18).",
    "status": "not_approved",
    "outcome": {
      "votes": 4,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "meta-governance-2026-11-16/q15/c",
    "session": "meta-governance-2026-11-16",
    "sessionLabel": "16 Nov 2026: Meeting agreements: how we decide",
    "sessionHref": "/events/meta-governance-2026-11-16",
    "question": "q15",
    "questionN": 15,
    "questionText": "How should new co-editors be vetted?",
    "option": "c",
    "optionLabel": "A questionnaire screened against published criteria",
    "origin": "participant",
    "proposer": "Lord M.E.G.A Zion",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "01:20:57",
      "quote": "these, uh, prerequisites or questionnaires or even voluntary statements"
    },
    "notes": "The host split the questionnaire into screened and not screened (01:22:01); Lord M.E.G.A Zion answered \"Both\" (01:22:18).",
    "status": "approved",
    "outcome": {
      "votes": 14,
      "ballots": 24,
      "abstain": 2,
      "result": "winner"
    },
    "seconders": []
  },
  {
    "id": "listening-2026-11-23/q1/a",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q1",
    "questionN": 1,
    "questionText": "What quorum should apply to ballots during the four-session pilot?",
    "option": "a",
    "optionLabel": "No quorum",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "00:35:28",
      "quote": "Would people be willing to consent to no quorum for the next four weeks?"
    },
    "notes": "No one objected to the consent call (00:35:28), but the host kept the question open after Joel Okomoli spoke for 25% (00:37:04). Question 5 of the 16 Nov ballot tied on quorum.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q1/b",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q1",
    "questionN": 1,
    "questionText": "What quorum should apply to ballots during the four-session pilot?",
    "option": "b",
    "optionLabel": "A minimum of 20 votes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "we need 20 votes"
    },
    "notes": "Carried from the 16 Nov ballot, where it tied 6 to 6 with 25% of the voting body.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q1/c",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q1",
    "questionN": 1,
    "questionText": "What quorum should apply to ballots during the four-session pilot?",
    "option": "c",
    "optionLabel": "25% of the voting body",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "meta-governance-2026-11-16",
      "at": "00:51:16",
      "quote": "or 25% of the voting body"
    },
    "seconders": [
      {
        "name": "Joel Okomoli",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "00:36:09",
          "quote": "I think 25% is fair."
        }
      }
    ],
    "notes": "Carried from the 16 Nov ballot, where it tied 6 to 6 with a minimum of 20 votes.",
    "status": "on_draft_ballot",
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q1/d",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q1",
    "questionN": 1,
    "questionText": "What quorum should apply to ballots during the four-session pilot?",
    "option": "d",
    "optionLabel": "25% of the active voting body",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "00:37:04",
      "quote": "Maybe we could think about it as 25% of the active voting body"
    },
    "notes": "Defined by the host on 25 November: the people who have voted in a ballot or taken part in a session during the pilot (28 people as of 25 November).",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q2/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q2",
    "questionN": 2,
    "questionText": "Should an option need a second from another participant before it goes into the draft ballot?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "06:54",
      "quote": "It’s like being seconded. It needs to be seconded.",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:53:29",
        "quote": "Markabadi suggested that an idea only goes onto the ballot if someone seconds it."
      }
    },
    "seconders": [
      {
        "name": "Laura Del Campo",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "00:55:20",
          "quote": "I don’t have a problem with that. I think that is good."
        }
      },
      {
        "name": "Leandra Preston",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "00:55:39",
          "quote": "I think seconding before sending it to the draft seems like a good strategy."
        }
      },
      {
        "name": "Joel Okomoli",
        "kind": "support",
        "evidence": {
          "kind": "source",
          "label": "Zoom chat, 23 Nov (Deepi’s log)",
          "file": "~/layered-web-videos/dp-session-2026-11-23/deepi/transcript.jsonl",
          "at": "36:14",
          "quote": "+1"
        }
      }
    ],
    "notes": "Joel Okomoli’s +1 is in the Zoom chat (Deepi’s clock 36:14, about 00:55:35 on the recording), not in the spoken transcript.",
    "status": "on_draft_ballot",
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q2/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q2",
    "questionN": 2,
    "questionText": "Should an option need a second from another participant before it goes into the draft ballot?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q3/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q3",
    "questionN": 3,
    "questionText": "Should draft ballot options be written in plain English first, before formal wording?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "09:38",
      "quote": "So having those constrictions in your call, I think would be great.",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:55:58",
        "quote": "plain English before formal wording"
      }
    },
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q3/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q3",
    "questionN": 3,
    "questionText": "Should draft ballot options be written in plain English first, before formal wording?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q4/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q4",
    "questionN": 4,
    "questionText": "Should each session open with an optional 30-second check-in?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "09:38",
      "quote": "So having those constrictions in your call, I think would be great.",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:55:58",
        "quote": "He’d like to see a check-in"
      }
    },
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q4/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q4",
    "questionN": 4,
    "questionText": "Should each session open with an optional 30-second check-in?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q5/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q5",
    "questionN": 5,
    "questionText": "Should each session focus on one major inquiry?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "09:38",
      "quote": "So having those constrictions in your call, I think would be great.",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:55:58",
        "quote": "He also suggested one major inquiry per session"
      }
    },
    "notes": "The host said this needs clarification from Markabadi (00:55:58).",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q5/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q5",
    "questionN": 5,
    "questionText": "Should each session focus on one major inquiry?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q6/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q6",
    "questionN": 6,
    "questionText": "Should Deepi, the meeting assistant, raise its hand when it notices something to add?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "10:45",
      "quote": "We could have the AI raise its hand.",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:55:58",
        "quote": "it would be great if the AI could raise its hand"
      }
    },
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q6/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q6",
    "questionN": 6,
    "questionText": "Should Deepi, the meeting assistant, raise its hand when it notices something to add?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q7/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q7",
    "questionN": 7,
    "questionText": "Should the Desirable Properties offer opt-in text reminders?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "participant",
    "proposer": "Markabadi",
    "proposerEvidence": {
      "kind": "source",
      "label": "20 Nov walk-through with Markabadi",
      "file": "src/data/meeting-pads/2026-11-20-session-page-review.ts",
      "at": "31:52",
      "quote": "Just a simple text reminder",
      "href": "/pads/meetings/2026-11-20-session-page-review"
    },
    "presentedBy": {
      "name": "Daveed Benjamin",
      "evidence": {
        "kind": "transcript",
        "session": "listening-2026-11-23",
        "at": "00:58:17",
        "quote": "Text reminders: opt-in texts that skip people who have already voted."
      }
    },
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q7/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q7",
    "questionN": 7,
    "questionText": "Should the Desirable Properties offer opt-in text reminders?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q8/yes",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q8",
    "questionN": 8,
    "questionText": "Should session transcripts be published on the session page and kept?",
    "option": "yes",
    "optionLabel": "Yes",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "00:47:17",
      "quote": "Do people have any issues with the transcripts being put on the session page and retained?"
    },
    "seconders": [
      {
        "name": "Laura Del Campo",
        "kind": "support",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "00:49:15",
          "quote": "being able to see the transcript, would be great. I agree with it."
        }
      }
    ],
    "status": "on_draft_ballot",
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q8/no",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q8",
    "questionN": 8,
    "questionText": "Should session transcripts be published on the session page and kept?",
    "option": "no",
    "optionLabel": "No",
    "origin": "standard",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "The standard \"No\" of a Yes/No question; nobody proposes it.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q9/a",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q9",
    "questionN": 9,
    "questionText": "After the front matter, how should the book club choose what to read?",
    "option": "a",
    "optionLabel": "In book order, from DP1 onward",
    "origin": "drafted",
    "proposer": null,
    "proposerEvidence": null,
    "notes": "Not recorded: nobody proposed reading in book order after the front matter. The draft wrote it as the alternative to Joel Okomoli’s option.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/q9/b",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "q9",
    "questionN": 9,
    "questionText": "After the front matter, how should the book club choose what to read?",
    "option": "b",
    "optionLabel": "Chapters the group picks by interest or background",
    "origin": "participant",
    "proposer": "Joel Okomoli",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "01:14:01",
      "quote": "we have to look at chapters that are of interest to us"
    },
    "notes": "Joel Okomoli’s \"I second that\" (01:14:45) seconds putting the cadence on next week’s agenda, not this option.",
    "status": "on_draft_ballot",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/decided/book-club-front-matter",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "decided",
    "questionN": null,
    "questionText": "Decided in the meeting",
    "option": "book-club-front-matter",
    "optionLabel": "A 30-minute book club in the 30 Nov session, on the front matter",
    "origin": "participant",
    "proposer": "Salwa El Mais",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "01:12:48",
      "quote": "let’s go ahead, and the next session will start the book club with the first part"
    },
    "contributors": [
      {
        "name": "Daveed Benjamin",
        "what": "floated the plan",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "01:11:39",
          "quote": "Should we just go ahead and say that next week we’ll have a book club section of 30 minutes?"
        }
      }
    ],
    "seconders": [
      {
        "name": "Leandra Preston",
        "kind": "second",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "01:13:25",
          "quote": "I’ll second."
        }
      }
    ],
    "status": "decided_in_meeting",
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/decided/book-club-cadence-agenda",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "decided",
    "questionN": null,
    "questionText": "Decided in the meeting",
    "option": "book-club-cadence-agenda",
    "optionLabel": "Put the book club cadence on the 30 Nov agenda",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "01:14:38",
      "quote": "So maybe that’s the decision we’d want to put in for next week: the cadence of the book club."
    },
    "contributors": [
      {
        "name": "Joel Okomoli",
        "what": "raised the cadence question",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "01:14:01",
          "quote": "After that, I think we have to look at chapters that are of interest to us"
        }
      }
    ],
    "seconders": [
      {
        "name": "Joel Okomoli",
        "kind": "second",
        "evidence": {
          "kind": "transcript",
          "session": "listening-2026-11-23",
          "at": "01:14:45",
          "quote": "Yes. I second that."
        }
      }
    ],
    "status": "decided_in_meeting",
    "notes": "Deepi’s seconded list names Daveed Benjamin as the seconder; the transcript has Joel Okomoli seconding (01:14:45), which this record follows.",
    "outcome": null
  },
  {
    "id": "listening-2026-11-23/raised/daily-review-sprints",
    "session": "listening-2026-11-23",
    "sessionLabel": "23 Nov 2026: Ballot results and the first weekly cycle",
    "sessionHref": "/events/listening-2026-11-23",
    "question": "raised",
    "questionN": null,
    "questionText": "Raised, not on the draft ballot",
    "option": "daily-review-sprints",
    "optionLabel": "Daily sprints as the review cadence",
    "origin": "participant",
    "proposer": "Mike McGuire",
    "proposerEvidence": {
      "kind": "transcript",
      "session": "listening-2026-11-23",
      "at": "00:49:30",
      "quote": "Mike McGuire suggested daily sprints as a review cadence"
    },
    "status": "proposed",
    "notes": "Raised by email and read out by the host. Held for Mike McGuire to explain it during this cycle.",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-30/agenda/v11-december-nautilus",
    "session": "listening-2026-11-30",
    "sessionLabel": "30 Nov 2026: Co-editors and the council",
    "sessionHref": "/roundups/2026-11-30",
    "question": "agenda",
    "questionN": null,
    "questionText": "Proposals on the agenda",
    "option": "v11-december-nautilus",
    "optionLabel": "Publish Version 1.1 by the end of December, put it on sale, and enter it for the Nautilus Book Awards",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "source",
      "label": "30 Nov agenda",
      "file": "src/lib/dp-roundups.ts",
      "quote": "Publish Version 1.1 by the end of December, put it on sale, and enter it for the Nautilus Book Awards",
      "href": "/roundups/2026-11-30"
    },
    "status": "on_agenda",
    "seconders": [],
    "outcome": null
  },
  {
    "id": "listening-2026-11-30/agenda/book-revenue",
    "session": "listening-2026-11-30",
    "sessionLabel": "30 Nov 2026: Co-editors and the council",
    "sessionHref": "/roundups/2026-11-30",
    "question": "agenda",
    "questionN": null,
    "questionText": "Proposals on the agenda",
    "option": "book-revenue",
    "optionLabel": "Where should any revenue from the book go?",
    "origin": "host",
    "proposer": "Daveed Benjamin",
    "proposerEvidence": {
      "kind": "source",
      "label": "30 Nov agenda",
      "file": "src/lib/dp-roundups.ts",
      "quote": "Where should any revenue from the book go?",
      "href": "/roundups/2026-11-30"
    },
    "status": "on_agenda",
    "notes": "Options to be gathered in the session for the ballot.",
    "seconders": [],
    "outcome": null
  }
];
