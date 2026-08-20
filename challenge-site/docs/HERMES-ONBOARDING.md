# Hermes Onboarding (Project Liberty Alliance wedge)

Living org briefings at `/onboard` and `/onboard/alliance/{slug}`.

## What shipped

- Curated Alliance directory: `src/data/alliance-directory.json` (Project Liberty, Institute, Labs). Not the full 200+ roster.
- Deterministic generate: top three moves (own + collaborative), values mappings, primitives, next steps. Hypothesis until sources are confirmed.
- Persist: Postgres `hermes_onboard_session` / `hermes_onboard_event` when `DP_DATABASE_URL` is set; otherwise `data/hermes-onboard/*.json`.
- Consent: public read, session memory, cross-subject learning. Writes require sign-in and session memory (except consent + claim).
- Community Chat: creates a Hermes `thread_kind: group` with surface `desirableproperties.org/onboard/alliance/{slug}`. Sidebar shows Alliance briefing badge.
- Claim: first signed-in user; records whether email domain matches `claimDomains`.

## URLs

Tabs are query-param links (copy/paste for email):

- Index: `/onboard`
- Brief: `/onboard/alliance/project-liberty?tab=brief`
- Desirable Properties (email lead-in): `/onboard/alliance/project-liberty?tab=dp`
- Community Chat: `/onboard/alliance/project-liberty?tab=community`

Same pattern for `project-liberty-institute` and `project-liberty-labs`. Pitch copy is per org in `alliance-directory.json` so it can change without a new layout.

## PLA email sketch (adjust per recipient)

Subject: We started a page for [org] and we need to know if we have your concerns right

We created a working page from your public corpus, not a score of your work:

https://desirableproperties.org/onboard/alliance/[slug]?tab=dp

The Desirable Properties tab is the invitation: follow the interest that matches what you already publish until it becomes a specific patch idea. We also want sources we missed.

This is a limited window to write community rules for the coordination space Alliance members already defend, then invite commercial players to operate inside those rules. The open internet did not get that pause, and it was captured.

Each member page has a different pitch because we are experimenting. Tell us what to change.

Public theoverweb.org proxy is not in this slice.

## Tests

```bash
npm run test:hermes-onboard
```
