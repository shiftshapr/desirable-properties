# Workgroup Review tab (passage deliberation)

Product and UX plan for a **Review** tab on DP workgroup collab pages: passage-anchored proposals, preference voting, conflict sets, cross-DP implications, and Hermes as clerk (not decider). Phased MVP through v3.

**Status:** Planning (no code yet). **Open decisions:** see [Open questions for Daveed](#open-questions-for-daveed).

## Why this doc

- **Repo-local source of truth** for a multi-section plan (IA, objects, workflows, phases, risks, open questions) that agents and humans can grep, diff, and link from PRs.
- **Jau memory** (see estate Jau) holds a short recall hook with tags and pending decisions; use it to find this doc fast across VPS sessions. The doc carries the full narrative; Jau carries discovery and status.

Related: `WORKGROUP-SHARE.md` (chat share restrictions), `HERMES-SHARE.md` (agent thread sharing), `docs/DP-COMMUNITY-AI-BRIEFING.md` (Hermes in workgroups).

---

## Problem statement

DP workgroup members need a single place to deliberate on **specific passages** in the draft: patches, inserts, and anchored comments from Gov Hub, Canopi Discuss, and Hermes filings. Today those artifacts are scattered across Activity (chronological), the external Gov Hub draft editor, and book Discuss, with no structured way to **compare conflicting edits**, signal preference, or see **downstream effects** on other passages or DPs. The collab tab should make review painless while keeping **human judgment authoritative** and AI in a supporting role.

## What exists today

**Challenge-site workgroup collab (shipped):**

- Tabs: Getting Started, Workgroup Chat, Activity, Invite with Email (`workgroup-collab-tabs.ts`, `WorkgroupCollabClient.tsx`).
- Member chat on Gov Hub; AI invite flow; message share with **anchor floor** (history cannot be truncated before share point).
- Workgroup Hermes: Draft my message, Ask Hermes (private side panel), ambient raised hand (never auto-posts), Share/Adopt patterns.

**Activity feed (partial review surface):**

- `WorkgroupActivityFeed` merges workgroup chat, Gov Hub `dp_proposal` events, and Canopi Discuss for the DP chapter.
- `ActivityPatchPreview` shows diff vs as-updated for patches/inserts.
- Filter for comments and patches exists; no passage grouping, voting, or conflict resolution.

**Gov Hub proposal layer:**

- `dp_proposal` table: `anchor_hash`, `context_anchor` (TextQuote-style), `patch_mode` (replace|insert), `rationale`, `reference_url`, statuses (pending/accepted/declined/etc.), `source_channel` (gov-hub/canopi sync).
- `proposal_counts()` groups by `anchor_hash` (foundation for conflict sets).
- Passage-anchored `Comment` model with `comment_scope=passage`, `CommentLike` for document comments (not yet wired to workgroup review UX).

**Canopi Discuss:**

- Chapter conversation on `book.desirableproperties.org` via embed; patches/inserts in message bodies.
- `PatchesTabManager` supports upvote/downvote and accept/reject governance actions on patches (extension-side, not workgroup-scoped).

**Hermes contribution pipeline:**

- Readiness detection, contribution draft (anchor + original/proposed), stage/submit to Canopi or Gov Hub, fingerprinted ledger sets.
- Neo4j retrieval: DP nodes, `DEPENDS_ON` edges, synced proposals, book passages.

**Architectural boundary (intentional):**

- Book Discuss = social/contextual; Hermes = AI advisory on challenge-site. Review tab should **aggregate** both without collapsing them into one chat runtime.

## Tab information architecture

Add a fifth tab: **Review** (between Chat and Activity).

```
┌─────────────────────────────────────────────────────────────┐
│  Getting Started │ Chat │ Review │ Activity │ Invite        │
└─────────────────────────────────────────────────────────────┘

Review tab layout (desktop):
┌──────────────────┬──────────────────────────────────────────┐
│ Passage queue    │  Selected passage workspace               │
│ (left rail)      │  ┌─ Passage excerpt + link to draft/book  │
│                  │  ├─ Proposals (grouped)                   │
│ • Needs decision │  ├─ Comments thread                       │
│ • Has conflicts  │  ├─ Your preference / vote               │
│ • Open           │  ├─ Implications (collapsed tiers)        │
│ • Resolved       │  └─ Hermes brief (expandable, labeled AI) │
└──────────────────┴──────────────────────────────────────────┘
```

| Tab | Role |
|-----|------|
| **Review** | Deliberation workspace (passage-centric, decision-oriented) |
| **Activity** | Chronological audit log; link rows into Review with `?passage=<anchor_hash>` |
| **Chat** | Free-form coordination; Review items referenced via deep links |

Default queue sort: **conflicts first**, then **unreviewed by you**, then recency.

## Core objects

| Object | Definition | Source of truth |
|--------|------------|-----------------|
| **Passage anchor** | Stable `anchor_hash` + `context_anchor` (TextQuote exact/prefix/suffix) + `passage_excerpt` + document ref (ML draft / DP chapter) | Gov Hub `dp_proposal` / `Comment`; mirrored from Canopi via `external_id` |
| **Proposal** | Patch (replace), Insert, or anchored Comment; includes author, rationale, status, `patch_mode`, source channel | Gov Hub `dp_proposal` + passage `Comment`; Canopi overlay sync |
| **Preference vote** | Per-member signal on a proposal: +1 / −1 / neutral; one active vote per member per proposal | **New** workgroup-scoped table (distinct from Canopi patch votes and Gov Hub editorial accept/decline) |
| **Conflict set** | All **pending** proposals sharing the same `anchor_hash` on the same document revision (replace-mode patches mutually exclusive; inserts may partially coexist) | Derived view; `proposal_counts.by_anchor` is the seed |
| **Implication link** | Typed edge: `same_passage`, `same_dp_adjacent`, `cross_dp_depends_on`, `terminology_drift`, `contradicts_claim`; carries confidence + citation | Neo4j `DEPENDS_ON` + LLM-assisted scan cached as `ImplicationBrief` rows |
| **Review decision** | Workgroup record: chosen proposal(s), dissent notes, facilitator override flag, timestamp; **advisory** until chair/editor acts in Gov Hub | **New** `workgroup_passage_decision` (or layer decision artifact) |

**Normalization rule:** Canopi Discuss posts and Gov Hub proposals that fingerprint to the same anchor + near-identical proposed text should **dedupe in UI** (one card, badge both sources).

## Human workflow

1. **Land on Review** after joining a DP workgroup; queue shows passages with open proposals for *this* DP's draft (and optionally cross-DP flags).
2. **Pick a passage** from the left rail; center pane shows excerpt in context (2–3 sentences before/after), with links: Open in Gov Hub draft, Open in book Discuss.
3. **Scan proposals** side by side (diff + as-updated toggle, already proven in Activity).
4. **Vote preference** (+/−) on each; optional short comment per proposal (threaded, passage-scoped).
5. **If conflict set (2+ replace patches):** UI prompts **Pick one** (radio) or **Defer**; inserts shown as compatible unless AI/human flags overlap.
6. **Check implications** panel (collapsed by default): "If we accept A, these 2 other passages / DP7 may need updates" with one-click jump.
7. **Ask Hermes** (private): "Summarize tradeoffs", "Draft merge of B and C", "What does DP4 say about this?" User may Share labeled Hermes note to chat or attach to passage review (never auto-post).
8. **Facilitator/chair** sees **Ready for decision** queue when conflict set has clear preference plurality or discussion quiet period; records advisory decision.
9. **Editorial action** still happens in Gov Hub (accept/decline/merge) or Canopi governance; Review tab shows outcome and moves passage to Resolved.

**Painless defaults:** auto-mark passages "seen" on open; email/activity digest only for **Needs your review**; bulk "I have no opinion" on low-salience passages.

## AI vs human roles

| AI should do (clerk + analyst) | Humans must decide |
|-------------------------------|-------------------|
| Cluster proposals by anchor; detect duplicates across Canopi/Gov Hub | Which wording becomes canonical |
| Generate **passage brief**: who proposed what, vote tallies, open questions | Accept/decline in Gov Hub editorial workflow |
| Suggest **merge candidates** when patches overlap partially (show diff of merged text) | Whether merge preserves intent of authors |
| Run **implication scan** against Neo4j `DEPENDS_ON`, claims, and book index; rank by severity | Whether cross-DP changes are in scope for this workgroup |
| Steelman each side in conflict sets (facilitator/devil's advocate modes) | Final pick among mutually exclusive replacements |
| Draft rationale text for the group's chosen option (participant edits before post) | Attribution and whether to credit Hermes-assisted text |
| Nudge: "3 members prefer B; 2 haven't reviewed" (no vote weights shown as binding) | Facilitator override when process stalls or gaming suspected |
| Pre-fill comment from Hermes thread via existing contribution draft API | Publishing anything to Discuss or Gov Hub |

**Hard rule:** Hermes output in Review is always labeled **AI-assisted** and never counts as a member vote. No auto-resolution from vote totals.

## Conflict resolution UX

**Detection:** `anchor_hash` match + `patch_mode=replace` + `status=pending` → conflict set.

**Presentation:**

- Header: "3 competing patches for this sentence" with applicability badges (orphaned if draft moved).
- **Compare mode:** 2-column (or 3-column) diff against current draft text; toggle unified vs side-by-side.
- **Preference strip:** net score per proposal; avatars of voters (not raw counts until hover, reduces pile-on).
- **Pick one control:** radio group for mutually exclusive set; selecting one does **not** auto-submit to Gov Hub, it records **workgroup preference**.
- **Merge path (optional):** "Combine ideas" opens Hermes-suggested merge editor; merged result becomes a **new proposal** linked to parents (`revision_of` / contribution ledger pattern).
- **Defer / needs discussion:** bumps passage to facilitator queue; one-click "Share conflict summary to Chat" with anchor link.
- **Insert vs replace:** inserts listed below conflict block; compatible inserts can be multi-selected.

**Resolution states:** `open` → `preference_emerging` (plurality) → `facilitator_ready` → `decided_advisory` → `editorially_closed` (Gov Hub status change).

## Cross-DP implications (tiers)

**Three tiers (always collapsed except tier 1 when non-empty):**

1. **Same passage / same conflict set** (always visible): direct competition.
2. **Same DP, other passages** (expandable): terminology consistency, duplicate definitions, section cross-refs. Show max 3 with "N more".
3. **Other DPs** (collapsed, badge count only): from Neo4j `DEPENDS_ON` and synced claims; e.g. "DP7 Security may conflict if you accept this privacy wording."

**UX patterns:**

- Traffic-light severity: `info` (related), `watch` (possible tension), `block` (explicit contradiction in graph).
- Each link: one-sentence **why** + cite source DP passage + "Open in Review" if that workgroup passage is in scope.
- **Snooze implication** per member ("not relevant to our sprint") to reduce noise; facilitator sees snooze counts.
- No global implication firehose on first load; run scan **on passage select** (cache 24h).

## Integration points

| System | Integration |
|--------|-------------|
| **Gov Hub** | Primary store for `dp_proposal`, passage `Comment`, editorial status; new APIs: list proposals by workgroup DP, record preference votes, advisory decisions |
| **Canopi Discuss** | Ingest via existing sync (`source_channel`, `external_id`); deep link `bookDiscussHref(dpId)?discuss=1`; surface Discuss comments in same passage card |
| **Hermes** | Private brief + merge draft via `/api/hermes/contributions/draft` and workgroup Ask Hermes; implication scan as new Hermes tool calling Neo4j `graph_traverse_bridges` / `DEPENDS_ON` queries |
| **Workgroup chat** | Share passage link, conflict summary, labeled Hermes share; do not duplicate full proposal UI in chat |
| **Neo4j** | Hourly proposal sync + on-demand traverse for implications; optional `graph_add_bridge` when facilitators confirm a real cross-DP dependency |
| **Activity feed** | Bi-directional links; new event types: `workgroup_preference_recorded`, `workgroup_passage_decided_advisory` |

Keep **Discuss vs Hermes separation** on the book; Review tab on challenge-site is the **deliberation hub** that points outward.

## Phased rollout

### MVP (4–6 weeks, staging first)

- Review tab: passage queue for workgroup's DP draft.
- Unified list: Gov Hub proposals + Canopi patches/comments (deduped).
- Preference upvote/downvote; conflict set detection; pick-one UI (advisory only).
- Passage excerpt + diff/as-updated + external links.
- Basic facilitator "mark ready" flag.
- Activity links into Review.

### v2 (6–10 weeks)

- Implication panel (tier 2–3) with Neo4j-backed scan + cache.
- Hermes passage brief + merge draft + share-to-chat.
- Threaded comments on proposals; digest notifications.
- Facilitator dashboard: stalled conflicts, low participation passages.
- Vote analytics (without binding automation).

### v3 (10+ weeks)

- Formal advisory decision records exportable to Gov Hub decision log.
- Cross-workgroup ripple alerts ("DP4 workgroup accepted wording that affects your DP").
- Book-side deep link `?review=passage` that opens challenge-site Review (not Hermes-in-embed).
- Optional binding workflow if governance rules allow (layer vote artifact).

## Risks and guardrails

| Risk | Guardrail |
|------|-----------|
| Vote brigading | One vote per verified member; no public leaderboard; show distributions only after N≥3 or to facilitators |
| AI consensus illusion | Never display Hermes as a voter; label all AI text; no auto-merge from AI |
| Anchor drift (draft revised) | Show `orphaned` / `applicability` from existing Gov Hub logic; re-anchor flow |
| Duplicate filings across channels | Fingerprint dedupe; prefer Gov Hub as editorial record |
| Facilitator capture | Override requires reason text + visible audit entry; optional second chair confirm |
| Chat vs Review confusion | Review = structured; chat = informal; share links not full state sync |
| Message share anchor floor | Reuse workgroup share restriction pattern: shared review context cannot rewrite earlier deliberation |
| Privacy | Preference votes visible to members; aggregate public only if workgroup charter allows |
| Scope creep | MVP limited to single DP per workgroup page; cross-DP is read-only implications in v2 |

## Open questions for Daveed

1. **Binding vs advisory:** Should workgroup preference votes ever auto-accept a Gov Hub proposal, or always remain input for chairs/editors only?
2. **Canonical conflict rule:** Is "one winner per `anchor_hash`" always true for replace patches, or can chairs accept a hybrid merge as the official proposal?
3. **Canopi vote parity:** Should workgroup preference votes sync back to Canopi patch upvotes, or stay a separate deliberation layer?
4. **Cross-DP scope:** When implications point to another DP's workgroup, do we notify that workgroup, or only show links to members who wear both hats?
5. **Comment inclusion:** Are passage-level Discuss comments first-class in conflict sets, or only patches/inserts in MVP?
6. **Public transparency:** Should advisory decisions and vote distributions be visible to non-members (open governance), or members-only?
7. **Hermes in Review:** Is private Ask Hermes sufficient, or do you want labeled "Hermes brief" posts visible to all members on each passage by default?
8. **Activity tab fate:** Keep both Activity and Review long term, or eventually fold Activity into Review's "History" subview?
9. **Timeline vs Challenge:** Is Review tab required before mid-Challenge facilitation sprints, or acceptable as v2 after chat/invite stabilization?
10. **Editorial authority:** Who may mark a passage "editorially closed" in the Review UI: layer admin only, workgroup chair, or any member when Gov Hub status already changed?
