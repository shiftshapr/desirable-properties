# Fork in the Web — Event Series Page & Learning Flow (Spec)

**Status:** Planning / staging target  
**Companion doc:** [`fork-in-the-web-workshop-briefings.md`](./fork-in-the-web-workshop-briefings.md)  
**Do not implement from this doc without explicit go-ahead** — this is the product + technical spec for a future build.

---

## Summary

Build a **public event series experience** on staging for the four *Fork in the Web* workshops, plus:

1. A **series landing page** and **per-session pages** (placeholder images initially).
2. **Session Questions** on each session — structured reflection + artifact capture, using the **Metaweb book session-questions UX** (multi-field form + **✦ AI assist** per field via `ComposeFieldAiAssist`).
3. **Admin** to create and edit **event series** generically (not hard-coded to Fork).
4. **Badge offers** for participants who **attend** (or register) and **complete session questions**.
5. **PEARL enhancement track** for participants who **create something**, **receive feedback**, and **reflect** — earning a richer credential aligned with DP10.

**Staging URL target (proposed):**

- Series: `https://staging.desirableproperties.org/series/fork-in-the-web-workshops`
- Session: `https://staging.desirableproperties.org/series/fork-in-the-web-workshops/session/1` (etc.)

---

## Goals

| Goal | Success signal |
|------|----------------|
| Discoverability | Fork readers and pathway visitors find workshops from perspective, pathway, and nav |
| Standalone sessions | Any session page works without attending others |
| Capture learning | Submitted session questions feed workgroup / DP discovery |
| Recognition | Session badge per workshop; series completion badge; optional PEARL badge |
| Reuse | Admin can clone pattern for future series (e.g. other pathways) |

---

## User journeys

### Journey A — Attend + reflect (session badge)

1. Land on series page → pick a session (or arrive from invite with `?session=2`).
2. Sign in (Gov Hub / existing DP auth — required to save answers and claim badge).
3. Optional: mark **“I attended”** (honor checkbox + optional external Zoom registrant match later).
4. Complete **Session Questions** (Prepare → Engage → Reflect).
5. Submit → **session badge offer** unlocked (preview + claim / mint when BRC333 flow ready).

### Journey B — PEARL enhancement (deeper badge)

After Journey A (or in parallel):

1. **Leverage** — publish or link an artifact (workshop template output, Discuss post, patch draft, workgroup doc).
2. **Feedback** — receive at least one structured feedback (peer, coordinator, or DP18-style prompt).
3. **Reflect again** — short reflection on feedback + revision intent.
4. Submit PEARL evidence bundle → **PEARL-tier badge offer** (or overlay on session badge).

### Journey C — Admin

1. `/admin?tab=event-series` → list series.
2. Create/edit series metadata, sessions, question sets, badge config, images.
3. Preview session page as admin.
4. Export submissions CSV / link to workgroup review queue (phase 2).

---

## Information architecture

```
/series                                    → optional index of all public series
/series/[seriesSlug]                       → series landing (hero, 4 session cards, badges explained)
/series/[seriesSlug]/session/[n]           → session detail + Session Questions form
/series/[seriesSlug]/session/[n]/pearl     → PEARL enhancement flow (gated: session questions submitted)
/api/series/[seriesSlug]                   → public read (series + sessions, no drafts)
/api/series/[seriesSlug]/session/[n]/responses → POST save/submit (auth)
/api/admin/event-series/...                → CRUD (admin auth)
```

**Fork seed data** (`seriesSlug`: `fork-in-the-web-workshops`):

| Session | Title | Image (initial) |
|---------|-------|-----------------|
| 1 | The First Fork: You → AI → Everything Else | Placeholder or `you-ai-everything-else.webp` when ready |
| 2 | Concierge vs. Commons | Placeholder |
| 3 | Designing the Human-Centered Layered Web | Placeholder |
| 4 | Sovereignty, Subsidiarity & the Second Fork | Placeholder |

Use **placeholder** cards on series landing until final art is wired; session pages can use Fork illustration paths from `challenge-site/public/images/perspectives/the-fork-in-the-web/` when available.

---

## Series landing page (UI spec)

### Above the fold

- Eyebrow: `Event series`
- Title: **Fork in the Web Workshops**
- Deck: one sentence from perspective subtitle
- Hero image: placeholder 16:9 (`/images/series/fork-in-the-web-workshops/hero-placeholder.webp`)
- CTAs: **Choose a session** (anchor) · **Read the perspective** · **AI & Human Agency pathway**

### Series meta block

- Format: Online · 75 min · Standalone sessions
- Badge line: “Complete session questions to earn a workshop badge; PEARL track for creators”
- Link to [`fork-in-the-web-workshop-briefings.md`](./fork-in-the-web-workshop-briefings.md) (facilitator PDF later)

### Session cards (grid)

Each card:

- Placeholder or illustration thumb
- Session number + title
- Date/time (from admin, or “Coming soon”)
- Status chip: `Upcoming` | `Live` | `On demand` (questions open)
- Links: **Session page** · **Join live** (external URL from admin) · **Session questions**

### Progress strip (signed-in user)

- 0/4 session badges
- Optional: PEARL progress indicator

### Footer CTAs

- Discuss the Fork perspective (Canopi)
- Join a workgroup
- humanstatement.org

**Visual:** Match pathway / perspective pages (`max-w-6xl`, slate/cyan palette, same header nav).

---

## Session page (UI spec)

### Layout

1. **Breadcrumb:** Series → Session N  
2. **Hero:** image + title + date + live link button  
3. **Facilitator blurb** (admin markdown, 2–3 sentences)  
4. **Pre-read links** (from workshop briefings)  
5. **Session Questions** (primary interactive block)  
6. **Sidebar (desktop):** badge offer preview, PEARL track teaser, related DPs  

### Session Questions — Metaweb book pattern

Reuse the **compose-field AI pattern** already in challenge-site:

- Component: `ComposeFieldAiAssist` (`challenge-site/src/components/compose/ComposeFieldAiAssist.tsx`)
- Behavior: focus textarea → **✦ AI** FAB → prompt chips → Insert / Replace / Stop / Regenerate
- **Not** a separate Hermes panel; **not** a persistent chat sidebar

Wrap in a **SessionQuestionsForm** (new) that:

- Renders sections as accordion or stepped wizard (mobile-friendly).
- One `textarea` (or rich text later) per question; each wired to AI assist.
- Autosaves draft to API on blur / debounce.
- **Submit** locks Reflect section (editable until submit; admin can reopen).

#### AI prompt chips (default set — overridable per question in admin)

| Chip | Use |
|------|-----|
| Help me get started | Empty field |
| Clarify my thinking | Draft exists |
| Connect to a Desirable Property | Engage / Leverage |
| Strengthen this for submission | Before submit |
| Shorter version | Length cap |

**Context injected server-side for generation** (like workgroup chat assist):

- Series title, session title, session number
- Workshop “today’s slice” one-liner
- Related DP ids/names
- User’s other answers in this session (prior sections only)
- Optional: excerpt from Fork perspective section (admin-configured)

**API:** extend existing Hermes/agent route or add `/api/series/.../ai-assist` with rate limits + auth.

---

## Session Questions content (Fork seed)

Map workshop **artifacts** from briefings into form fields. Three layers per session:

### Layer 1 — Prepare (PEARL: Prepare)

| Field | Type | Required |
|-------|------|----------|
| I reviewed the pre-read (or attended live) | checkbox | yes |
| What I hope to explore | textarea + AI | yes |

### Layer 2 — Engage (PEARL: Engage)

Session-specific fields from briefing artifacts (all textarea + AI):

**Session 1 — Human Place Requirements**

- Scenario
- What AI path optimizes for
- What direct-human path preserves
- Must not become only an AI tunnel
- Human place requirements (pick 2+)
- Optional DP hook

**Session 2 — Minimum Viable Commons**

- Shared resource
- Who can speak for themselves
- What persists
- Where dissent accumulates
- One-week experiment
- Optional DP hook

**Session 3 — Layered Web Stack**

- Substrate + 4 environments + portable + protocols + AI role
- Draft desirable property paragraph
- Optional DP hook

**Session 4 — Second Fork Statement**

- Scenario, sovereignty, delegation split, subsidiarity rule
- Human place worth defending
- The second fork for me (one sentence)
- One action in 7 days
- Optional DP hook

### Layer 3 — Reflect (PEARL: Reflect)

| Field | Type | Required |
|-------|------|----------|
| What shifted in my thinking? | textarea + AI | yes |
| One tension I still hold | textarea + AI | no |
| Would I share this with my community? | yes/no + why | no |

**Submit** → triggers session badge eligibility.

---

## PEARL enhancement flow

Gated: **session questions submitted** for that session (or series policy: any 1+ session).

### PEARL stages (DP10-aligned)

| Stage | UI | Evidence |
|-------|-----|----------|
| **Prepare** | Already done in session Prepare section | — |
| **Engage** | Already done in Engage section | — |
| **Reflect** | Already done in Reflect section | — |
| **Leverage** | New page section | **Create** — link or upload description |

### Leverage page fields

| Field | Notes |
|-------|--------|
| What I created | Link (Discuss, workgroup, GitHub, doc) or text description |
| How it applies the workshop | textarea + AI |
| Which DP(s) it touches | multi-select or free text |

### Feedback (PEARL + DP18)

| Field | Notes |
|-------|--------|
| Feedback received | textarea (paste or summarize) |
| From whom | peer / coordinator / public / self-review |
| What I will change | textarea + AI |

**Phase 1:** self-attested feedback + optional coordinator endorsement flag.  
**Phase 2:** integrate workgroup comment thread or DP18 feedback objects.

### PEARL submit

- Evidence bundle stored JSON-sidecar on response row.
- Unlocks **PEARL badge offer** (distinct art or “PEARL” overlay on session badge).

---

## Badge offers

### Types

| Badge | Code (proposed) | Criteria |
|-------|-----------------|----------|
| Session 1–4 | `fork-ws-01` … `fork-ws-04` | Signed in + session questions submitted (+ attend checkbox honor) |
| Series completer | `fork-ws-series` | All 4 session badges |
| PEARL per session | `fork-ws-01-pearl` … | Session submit + Leverage + feedback + PEARL reflect |
| PEARL series | `fork-ws-series-pearl` | All 4 PEARL session tracks (stretch) |

### Offer UX

- **Preview card** on session page (placeholder badge image initially — grey “Fork Workshop 1” template).
- After submit: **Badge unlocked** state with:
  - Congratulations copy (GhDialog on next visit if applicable)
  - Link to BRC333 mint preview when `badge_mint_url` set in admin
  - Share text for invite flow

### Implementation notes

- **Phase 1 (staging):** DB tracks eligibility + shows on-site “earned” state; mint URL optional manual.
- **Phase 2:** BRC333 badges project issues from eligibility API; link to existing `BRC333_BADGES_MINT_PREVIEW_BASE` pattern on `/badges`.

Badge metadata per series/session in admin:

- `badge_code`, `title`, `description`, `image_url`, `mint_preview_url`, `pearl_variant_code`

---

## Admin — Event series

**New admin tab:** `event-series` (alongside `invite-content` in `dp-admin-tabs.ts`).

### Admin capabilities

**Series CRUD**

| Field | Notes |
|-------|--------|
| `slug` | URL segment |
| `title`, `subtitle`, `description` (markdown) |
| `hero_image_url` | placeholder ok |
| `perspective_url`, `pathway_url` | optional cross-links |
| `active`, `sort_order` |
| `badge_series_code` | series completion badge |

**Session CRUD** (child of series)

| Field | Notes |
|-------|--------|
| `session_number` | 1-based, unique per series |
| `title`, `slug` | |
| `image_url` | placeholder |
| `starts_at`, `ends_at` | optional |
| `live_url` | Zoom etc. |
| `facilitator_blurb` | markdown |
| `pre_read_links` | JSON array `{label, url}` |
| `fork_section_anchor` | optional link into perspective |
| `related_dp_ids` | e.g. `["DP2","DP8"]` |
| `questions_schema` | JSON — see below |
| `badge_code`, `pearl_badge_code` | |
| `active` | |

**Question schema** (admin-friendly)

Option A: JSON editor (v1).  
Option B: Form builder (v2).

```json
{
  "sections": [
    {
      "id": "prepare",
      "title": "Prepare",
      "pearl_stage": "prepare",
      "questions": [
        {
          "id": "pre_read",
          "type": "checkbox",
          "label": "I reviewed the pre-read or attended live",
          "required": true
        },
        {
          "id": "hope",
          "type": "textarea",
          "label": "What I hope to explore",
          "required": true,
          "ai_assist": true,
          "ai_prompts": ["help_start", "clarify", "connect_dp"]
        }
      ]
    }
  ]
}
```

**Seed:** import Fork 4-session question sets from this spec + workshop briefings on first deploy.

**Submissions viewer (admin)**

- Filter by series / session / user
- View response JSON + PEARL bundle
- Export CSV
- Manually grant/revoke badge eligibility (support)

### Pattern parity with invite-content

Mirror `dp-invite-content-store.ts`:

- Postgres tables via `ensureDpSchema()` in `dp-db.ts`
- Admin API routes under `/api/admin/event-series/`
- Public read under `/api/series/[slug]`
- Auth: same admin allowlist as invite-content

---

## Data model (proposed tables)

```
dp_event_series
  id, slug, title, subtitle, description_md, hero_image_url,
  perspective_url, pathway_url, badge_series_code,
  active, sort_order, created_at, updated_at, created_by, updated_by

dp_event_series_session
  id, series_id, session_number, slug, title, image_url,
  starts_at, ends_at, live_url, facilitator_blurb_md,
  pre_read_links_json, questions_schema_json,
  badge_code, pearl_badge_code, related_dp_ids_json,
  active, sort_order, created_at, updated_at

dp_event_series_response
  id, session_id, user_id, user_email,
  attended_confirmed, status (draft|submitted),
  answers_json, pearl_json,
  badge_session_eligible, badge_pearl_eligible,
  submitted_at, created_at, updated_at

dp_event_series_badge_grant (optional denormalized)
  id, user_id, badge_code, series_id, session_id, granted_at, revoked_at
```

Unique constraint: `(session_id, user_id)` on responses.

---

## Integrations & cross-links

| Surface | Link |
|---------|------|
| Fork perspective | CTA “Join a workshop” → series landing |
| AI & Human Agency pathway | Featured card or inline link |
| Invite with Email | New invite-content type: `event_series_session` (phase 2) |
| Workgroups | Session submit → suggest `dp-discovery` or pathway workgroup |
| Discuss / Canopi | Leverage step deep-links to Fork discuss with prefill |
| `/badges` | New subsection “Workshop badges” when live |

---

## Staging rollout plan (phased)

### Phase 0 — Content only (no DB)

- Static series + session pages from TS seed file
- Placeholder images
- External Google Form for questions (optional bridge)

### Phase 1 — MVP (target)

- DB + admin CRUD
- Session Questions with AI assist + auth
- Badge eligibility flags + on-site earned UI
- Fork series seeded

### Phase 2

- PEARL flow + feedback attestation
- BRC333 mint integration
- Invite picker + email templates
- Facilitator export of submissions

### Phase 3

- Zoom registrant webhook → auto `attended_confirmed`
- Public gallery of anonymized Leverage artifacts
- Series template clone in admin

**Deploy:** `feat/ai-human-agency-pathway` → `./deploy-staging.sh` (never from `main`).

---

## Open decisions (need product sign-off)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Attendance proof | Honor checkbox v1; webhook v2 |
| 2 | Must sign in to view questions? | View public; submit requires auth |
| 3 | Edit after submit? | No user edit after submit; admin reopen |
| 4 | PEARL feedback | Self-attested v1 |
| 5 | Series index at `/series` | Yes, but only list `active` series |
| 6 | Question wizard vs long page | Wizard on mobile, single scroll on desktop |

---

## Acceptance criteria (staging)

- [ ] Series landing renders 4 sessions with placeholder images
- [ ] Each session page loads questions from DB (admin-editable)
- [ ] ✦ AI assist works on each textarea field (ComposeFieldAiAssist pattern)
- [ ] Signed-in user can save draft and submit
- [ ] Submit shows session badge offer state
- [ ] PEARL path accessible after submit with Leverage + feedback + reflect
- [ ] Admin can create a **second** test series without code change
- [ ] Mobile layout usable for full question flow

---

## Related repo assets

| Asset | Path |
|-------|------|
| Workshop briefings | `docs/fork-in-the-web-workshop-briefings.md` |
| Fork perspective | `challenge-site/src/data/perspectives/the-fork-in-the-web.ts` |
| AI compose assist | `challenge-site/src/components/compose/ComposeFieldAiAssist.tsx` |
| Invite admin pattern | `challenge-site/src/app/admin/InviteContentAdminPanel.tsx` |
| PEARL definition | `desirableproperties-book/content/local/dp10.md` §11 |
| Badges page | `challenge-site/src/app/badges/page.tsx` |
| Fork images | `challenge-site/public/images/perspectives/the-fork-in-the-web/` |

---

*Last updated: 2026-08-09. Spec only — implementation not started.*
