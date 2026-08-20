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

- Index: https://desirableproperties.org/onboard (staging host equivalent)
- First slug: `/onboard/alliance/project-liberty`

Public theoverweb.org proxy is not in this slice.

## Tests

```bash
npm run test:hermes-onboard
```
