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
4. **One series badge** (not per-session) for participants who **attend or watch** and **respond to session questions** across the series.
5. **PEARL badge** (series-level) for participants who complete the **patch pipeline**: create patch idea → socialize → get feedback → submit patch → reflect.

**Database:** Yes — challenge-site already uses **Postgres** via `DP_DATABASE_URL` / `DATABASE_URL`, with schema managed in `challenge-site/src/lib/dp-db.ts` (`ensureDpSchema()`). Questions, answers, and PEARL progress use **normalized relational tables**, not JSON blobs.

**Staging URL target (proposed):**

- Series: `https://staging.desirableproperties.org/series/fork-in-the-web-workshops`
- Session: `https://staging.desirableproperties.org/series/fork-in-the-web-workshops/session/1` (etc.)
- PEARL track: `https://staging.desirableproperties.org/series/fork-in-the-web-workshops/pearl`

---

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Per-session badges | **No** — single **series badge** only |
| Series badge criteria | Attend or watch **and** submit session questions (progress tracked per session; badge granted when series requirements met — see below) |
| PEARL criteria | Patch idea → socialize → feedback → submit patch → reflect (self-attested feedback OK) |
| Attendance proof | Honor checkbox or external registrant match — **either is fine** |
| Auth | **Required** to save answers, submit questions, and claim badges |
| Edit after submit | **Allowed** — users may update responses and PEARL steps after submit |
| PEARL feedback | **Self-attested** in v1 |
| Storage | **Relational Postgres tables** — no JSON schema for questions/answers |

### Series badge eligibility (proposed rule)

Grant **one series badge** when the signed-in user has, for **each active session** in the series:

- Confirmed attend/watch (`attended_confirmed = true`), **and**
- Submitted session questions (`status = submitted` on that session’s response)

All four Fork sessions required for `fork-ws-series`. Admin can configure `sessions_required_count` on the series if a future series differs.

---

## Goals

| Goal | Success signal |
|------|----------------|
| Discoverability | Fork readers and pathway visitors find workshops from perspective, pathway, and nav |
| Standalone sessions | Any session page works without attending others |
| Capture learning | Session answers stored in DB; feed workgroup / DP discovery |
| Recognition | **One series badge** + optional **one PEARL series badge** |
| Reuse | Admin can create another series without code changes |

---

## User journeys

### Journey A — Watch + respond (series badge)

1. Land on series page → pick a session (or `?session=2` from invite).
2. **Sign in** (required).
3. Mark **“I attended or watched”** (honor checkbox; Zoom match optional later).
4. Complete **Session Questions** (Prepare → Engage → Reflect) for that session.
5. Repeat for other sessions (standalone order OK).
6. When **all sessions** meet attend + submitted criteria → **series badge offer** unlocked.

### Journey B — PEARL (patch pipeline)

Available once user has **at least one** submitted session response (recommend: after series badge or in parallel once engaged).

1. **Patch idea** — draft a concrete DP-oriented patch concept (textarea + AI).
2. **Socialize** — link where they shared it (Discuss, workgroup chat, office hours, etc.).
3. **Feedback** — summarize feedback received (self-attested).
4. **Submit patch** — link to submitted patch on **Gov Hub** or **Canopi** (passage-level patch or discuss thread).
5. **Reflect** — what changed after feedback; what they learned (textarea + AI).

Submit PEARL track → **PEARL series badge offer** unlocked.

PEARL aligns with DP10 (Prepare/Engage/Reflect/Leverage) but **Leverage** here is explicitly **patch contribution**, not a generic artifact link.

### Journey C — Admin

1. `/admin?tab=event-series` → list series.
2. CRUD series, sessions, question sections/fields, pre-reads, badge config.
3. Preview session page.
4. View submissions and PEARL progress; export CSV.

---

## Information architecture

```
/series                                    → index of active series
/series/[seriesSlug]                       → series landing
/series/[seriesSlug]/session/[n]           → session + Session Questions (auth)
/series/[seriesSlug]/pearl                 → PEARL patch pipeline (auth)
/api/series/[seriesSlug]                   → public read (metadata only)
/api/series/.../responses                  → auth: save/load answers
/api/series/.../pearl                      → auth: save/load PEARL steps
/api/admin/event-series/...                → admin CRUD
```

---

## Database (existing + new tables)

### Existing infrastructure

Challenge-site Postgres is already used for admin users, site modals, blueberries, broadcast, support tickets, and invite content (`dp_invite_global_event`, `dp_invite_perspective`). New tables extend `SCHEMA_SQL` in `dp-db.ts` the same way.

Connection: `DP_DATABASE_URL` or `DATABASE_URL`. If unset, feature degrades gracefully (same pattern as invite-content).

### New tables (relational — no JSON for Q&A)

```sql
-- Series
dp_event_series (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description_md TEXT,
  hero_image_url TEXT,
  perspective_url TEXT,
  pathway_url TEXT,
  sessions_required_count INTEGER,  -- NULL = all active sessions
  badge_code TEXT NOT NULL,       -- e.g. fork-ws-series
  pearl_badge_code TEXT,          -- e.g. fork-ws-series-pearl
  badge_image_url TEXT,
  badge_mint_preview_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at, updated_at, created_by, updated_by
)

-- Sessions
dp_event_series_session (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  live_url TEXT,
  facilitator_blurb_md TEXT,
  perspective_section_anchor TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (series_id, session_number),
  UNIQUE (series_id, slug)
)

-- Pre-read links (per session)
dp_event_series_pre_read (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
)

-- Related DPs (per session)
dp_event_series_session_dp (
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  dp_id TEXT NOT NULL,  -- e.g. DP2
  PRIMARY KEY (session_id, dp_id)
)

-- Question sections (Prepare / Engage / Reflect)
dp_event_series_question_section (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,   -- prepare | engage | reflect
  title TEXT NOT NULL,
  pearl_stage TEXT,            -- prepare | engage | reflect (nullable for reflect-only UI)
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, section_key)
)

-- Individual questions (admin-editable fields)
dp_event_series_question (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES dp_event_series_question_section(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,     -- stable key, e.g. hope_to_explore
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL,    -- checkbox | textarea | select | dp_hook
  required BOOLEAN NOT NULL DEFAULT false,
  ai_assist BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (section_id, field_key)
)

-- One response header per user per session
dp_event_series_response (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  attended_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | submitted
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
)

-- One row per question answer (editable after submit)
dp_event_series_answer (
  id UUID PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES dp_event_series_response(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES dp_event_series_question(id) ON DELETE CASCADE,
  value_text TEXT,
  value_bool BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
)

-- PEARL patch pipeline (one row per user per series)
dp_event_series_pearl (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  patch_idea TEXT,
  socialize_url TEXT,
  socialize_note TEXT,
  feedback_summary TEXT,
  feedback_from TEXT,          -- peer | coordinator | public | other
  patch_submit_url TEXT,       -- Gov Hub or Canopi URL
  patch_submit_source TEXT,    -- govhub | canopi (optional; infer from URL host if null)
  patch_submit_note TEXT,
  reflection TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | submitted
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, user_id)
)

-- Badge grants (denormalized for display / mint API)
dp_event_series_badge_grant (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  badge_code TEXT NOT NULL,
  grant_type TEXT NOT NULL,    -- series | pearl
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (series_id, user_id, badge_code)
)
```

**Why not JSON:** Admin edits questions as rows; answers join on `question_id`; exports are straightforward SQL; Fork seed is a migration/seed script inserting rows, not a schema file.

---

## Series landing page (UI spec)

### Above the fold

- Eyebrow: `Event series`
- Title: **Fork in the Web Workshops**
- Deck: perspective subtitle
- Hero: placeholder 16:9
- CTAs: **Choose a session** · **Read the perspective** · **AI & Human Agency pathway**

### Series meta

- Online · 75 min · Standalone sessions
- Badge line: **“Complete all session question sets to earn the Fork Workshop series badge. PEARL track for patch contributors.”**

### Session cards

- Thumb (placeholder or Fork art)
- Session number + title + date
- Status: `Upcoming` | `Live` | `On demand`
- For signed-in users: chip `Not started` | `In progress` | `Submitted`
- Links: **Session page** · **Join live** · **Session questions** (auth)

### Progress strip (signed-in)

- `2/4 sessions submitted` · `Series badge: 50%` (not 4 separate badges)
- PEARL track status if started

---

## Session page (UI spec)

1. Breadcrumb: Series → Session N  
2. Hero: image, title, date, **Join live**  
3. Facilitator blurb + pre-read links (from `dp_event_series_pre_read`)  
4. **Session Questions** (auth required)  
5. Sidebar: series badge progress, link to **PEARL track**

### Session Questions — Metaweb book pattern

- `ComposeFieldAiAssist` on each `textarea` where `ai_assist = true`
- Load sections/questions from DB ordered by `sort_order`
- Autosave answers to `dp_event_series_answer` on debounce
- **Submit** sets `response.status = submitted` (user may edit answers afterward)
- Attend/watch checkbox on response header

### AI prompt chips (per question type, configured in code or small lookup table later)

| Chip | Use |
|------|-----|
| Help me get started | Empty field |
| Clarify my thinking | Draft exists |
| Connect to a Desirable Property | Engage fields |
| Strengthen this for submission | Before submit |
| Shorter version | Length cap |

---

## Session Questions seed (Fork — Engage field keys)

Admin seeds these rows for each session. Engage fields match [`fork-in-the-web-workshop-briefings.md`](./fork-in-the-web-workshop-briefings.md).

**All sessions — Prepare + Reflect (shared structure)**

| section_key | field_key | field_type | required | ai_assist |
|-------------|-----------|------------|----------|-----------|
| prepare | pre_read_confirmed | checkbox | yes | no |
| prepare | hope_to_explore | textarea | yes | yes |
| reflect | thinking_shifted | textarea | yes | yes |
| reflect | tension_held | textarea | no | yes |
| reflect | would_share | textarea | no | yes |

**Session 1 Engage** — `scenario`, `ai_path_optimizes`, `direct_human_preserves`, `not_ai_tunnel`, `human_place_requirements`, `dp_hook`

**Session 2 Engage** — `shared_resource`, `who_speaks`, `what_persists`, `where_dissent`, `one_week_experiment`, `dp_hook`

**Session 3 Engage** — `substrate`, `environment_1`…`environment_4`, `portable`, `open_protocols`, `ai_role`, `draft_dp_paragraph`, `dp_hook`

**Session 4 Engage** — `scenario`, `sovereignty`, `tasks_stay_human`, `tasks_delegate_ai`, `subsidiarity_rule`, `human_place`, `second_fork_for_me`, `action_7_days`, `dp_hook`

---

## PEARL enhancement flow

**Route:** `/series/[seriesSlug]/pearl`  
**Gate:** Signed in; recommend copy “Best after at least one session submitted.”

### Steps (ordered UI wizard)

| Step | DB column(s) | Notes |
|------|----------------|-------|
| 1. Patch idea | `patch_idea` | Concrete suggested change to a DP or book passage; textarea + AI |
| 2. Socialize | `socialize_url`, `socialize_note` | Link to Discuss, workgroup, office hours, etc. |
| 3. Feedback | `feedback_summary`, `feedback_from` | Self-attested |
| 4. Submit patch | `patch_submit_url`, `patch_submit_note` | **Gov Hub** or **Canopi** URL to the submitted patch (passage patch, discuss post, or annotation) |
| 5. Reflect | `reflection` | What changed; what you learned; textarea + AI |

**Submit** sets `dp_event_series_pearl.status = submitted`. User may **edit any step after submit**.

**Submit patch URL:** Accept **Gov Hub** or **Canopi** links. Optional soft validation: host matches known Gov Hub / Canopi / desirableproperties domains; show helper text with examples for both flows.

**Deep links in UI:**

- Discuss & Patch modal / book discuss (Canopi)
- Gov Hub submit patch (`GOVHUB_DP_PATCHES_URL`)
- Canopi discuss or annotation URL on book / perspective
- Relevant workgroup (e.g. dp-discovery)

### PEARL vs session questions

| | Session questions | PEARL |
|--|-------------------|--------|
| Scope | Per session | Per series |
| Badge | Contributes to **series badge** | **PEARL series badge** |
| DP10 stages | Prepare, Engage, Reflect in questions | Leverage = patch pipeline |

---

## Badge offers

### Types (series-level only)

| Badge | Code (proposed) | Criteria |
|-------|-----------------|----------|
| Fork Workshop Series | `fork-ws-series` | All sessions: attend/watch + questions submitted |
| Fork Workshop PEARL | `fork-ws-series-pearl` | PEARL pipeline submitted (all 5 steps) |

**No** `fork-ws-01` … `fork-ws-04` session badges.

### Offer UX

- Series landing shows **one** badge preview (placeholder art OK).
- Progress: “3 of 4 sessions complete toward series badge.”
- When eligible: congratulations + mint preview link when configured.
- PEARL badge shown as separate card on `/pearl` and series landing once PEARL submitted.

---

## Admin — Event series

**Tab:** `event-series` in `dp-admin-tabs.ts`.

### Series CRUD

Slug, title, subtitle, description, hero image, perspective/pathway URLs, `sessions_required_count`, `badge_code`, `pearl_badge_code`, badge image/mint URLs, active, sort order.

### Session CRUD

Session number, slug, title, image, schedule, live URL, blurb, perspective anchor, active, sort.

### Question admin

- Manage **sections** per session (add/reorder/rename).
- Manage **questions** per section: label, field_key, type, required, ai_assist, sort.
- Manage **pre-reads** and **session_dp** rows.

**No JSON editor** for question schemas in v1 — use structured admin forms backed by the tables above.

### Submissions viewer

- Filter by series / session / user
- Join `response` → `answer` → `question` for readable export
- PEARL table viewer per user
- Manual revoke badge grant (support)

---

## Integrations

| Surface | Link |
|---------|------|
| Fork perspective | CTA → series landing |
| AI & Human Agency pathway | Inline link |
| Discuss & Patch / Canopi | PEARL socialize + patch submit (Canopi URL) |
| Gov Hub patches | PEARL patch submit (Gov Hub URL) |
| Workgroups | Post-session CTA; socialize target |
| `/badges` | “Workshop series badges” subsection |

---

## Staging rollout

| Phase | Scope |
|-------|--------|
| **0** | Static pages + placeholder images (optional) |
| **1** | Postgres tables + admin + session Q&A + series badge progress |
| **2** | PEARL wizard + PEARL badge + BRC333 mint link |
| **3** | Zoom attendance webhook, invite picker, CSV export |

Deploy from `feat/ai-human-agency-pathway` via `./deploy-staging.sh`.

---

## Resolved decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Attendance proof | Honor checkbox **or** webhook — either OK |
| 2 | Auth | **Required** for questions, PEARL, badges |
| 3 | Edit after submit | **User edit allowed** |
| 4 | PEARL feedback | **Self-attested** v1 |
| 5 | Series index at `/series` | Yes — active series only |
| 6 | Question UX | Wizard on mobile; scroll on desktop |

---

## Acceptance criteria (staging)

- [ ] Series landing: 4 sessions, placeholder images, **one** series badge preview
- [ ] Questions loaded from **relational tables** (admin-editable)
- [ ] Auth required to answer; drafts autosave; **edit after submit works**
- [ ] Progress: N/4 sessions toward series badge (not per-session badges)
- [ ] Series badge unlocks when all sessions attend + submitted
- [ ] PEARL page: patch idea → socialize → feedback → submit patch → reflect
- [ ] PEARL badge unlocks on PEARL submit
- [ ] Admin can create a second test series without code change
- [ ] Mobile-friendly question flow

---

## Related repo assets

| Asset | Path |
|-------|------|
| Workshop briefings | `docs/fork-in-the-web-workshop-briefings.md` |
| Postgres schema home | `challenge-site/src/lib/dp-db.ts` |
| Invite-content store pattern | `challenge-site/src/lib/dp-invite-content-store.ts` |
| Fork perspective | `challenge-site/src/data/perspectives/the-fork-in-the-web.ts` |
| AI compose assist | `challenge-site/src/components/compose/ComposeFieldAiAssist.tsx` |
| Discuss & Patch | `challenge-site/src/lib/govhub.ts`, `DiscussPatchLink` |
| PEARL definition | `desirableproperties-book/content/local/dp10.md` §11 |
| Badges page | `challenge-site/src/app/badges/page.tsx` |

---

*Last updated: 2026-08-09. Spec only — implementation not started.*
