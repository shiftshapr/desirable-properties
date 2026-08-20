# Hermes group chat and sidebar origin scope

Product and engineering scope for (1) fixing `/agent` sidebar duplicates and missing origin links for workgroup-adjacent threads, and (2) **Community Chat**: invite-based Hermes group threads with the private sidebar UX, without a workgroup container.

**Status:** Phase 0 complete. Community Chat MVP in progress (backend foundations landed). **Locked decisions:** see [Decisions (locked)](#decisions-locked).

Related: `HERMES-SHARE.md` (agent thread sharing), `WORKGROUP-SHARE.md` (workgroup chat share restrictions), `docs/WORKGROUP-REVIEW-TAB.md` (workgroup Hermes integration patterns), `docs/DP-COMMUNITY-AI-BRIEFING.md` if present.

---

## Problem statement

Users opening **Hermes at `/agent`** see sidebar entries that feel like private conversations but were created from **workgroup collab** (Ask Hermes, Draft assist, shares) or from **one-off assist calls** that never became a real agent chat. There is no badge or link back to `/workgroups/{slug}`. The same logical conversation can appear **more than once** (ghost threads, fork copies, Shared vs My split confusion).

Separately, the product wants **Community Chat**: invite several people into one shared Hermes thread with the same sidebar UX as `/agent`, similar to workgroup Hermes collaboration, but **without** workgroup governance, positions, Gov Hub draft container, or ambient hand Postgres stack.

---

## Naming (locked)

| Product name | What it is | UI label |
|--------------|------------|----------|
| **Workgroup Chat** | Existing collab member chat inside a workgroup container | Collab tab (default) |
| **Community Chat** | New invite-based group Hermes (`thread_kind: group`), no workgroup container | "Community Chat" in product copy |
| **External Chat** | Collab tab entry point for Community Chat threads tied to a workgroup context | Tab label in workgroup collab only |

Community Chat threads use `thread_kind: group`, support multi-member prompt, and are reachable from `/agent` plus the **External Chat** tab in workgroup collab.

---

## Decisions (locked)

Daveed locked the following on 2026-08-19:

| # | Question | Decision |
|---|----------|----------|
| 1 | Sidebar sections | **Badge + link per row** (not split Collab & shared vs Private agent sections) |
| 2 | Workgroup assist orphans | **Archive** existing orphans (not delete); stop new orphans via Phase 0 assist fix |
| 3 | Group chat prompt model | **Everyone can prompt** (same as collab workgroup chat semantics, but invitees instead of collab roster) |
| 4 | Entry points | **`/agent`** plus new collab tab **External Chat** |
| 5 | Public invite links | **Both** direct email and public invite links |
| 6 | Contribution filing | **Yes** – group threads can file to Canopi like private `/agent` |
| 7 | Workgroup Hermes | Create as many **named Neo4j collab group threads** as needed (like individual threads), not panel-only |
| 8 | Naming | **Workgroup Chat** (existing collab), **Community Chat** (new invite-based group Hermes), collab tab = **External Chat** |

---

## Current state

### How the `/agent` sidebar loads threads

| Layer | Behavior |
|-------|----------|
| **UI** | `HermesChat.tsx` loads owned threads via `GET /api/agent/threads` and shared threads via `GET /api/agent/shares`. It passes three lists into `HermesThreadSidebar.tsx`: `threads` (owned, minus shared-out), `sharedWithMeThreads`, `sharedByMeThreads`. |
| **Owned list** | Neo4j `listThreads()` in `neo4j-knowledge-graph/src/hermes/hermes-threads.js`: `Contributor -[:OWNS_THREAD]-> HermesThread`, optional active share count, ordered by pin then `updated_at`. |
| **Shared with me** | `listSharedWithMe()` in `thread-access.js`: `Contributor -[:WATCHES]-> HermesThread` where role is not `owner_watch` and user does not `OWNS_THREAD`. |
| **Shared by me** | **Client-side only:** owned threads where `activeShareCount > 0`, split out of "My conversations" into Shared > By me (`HermesChat.tsx` `sharedByMeThreads` / `ownedSidebarThreads`). |
| **Select thread** | `GET /api/agent/threads/:id` loads turns + `access` (owner, watcher, controller, member, etc.). |

Proxy chain: challenge-site `src/app/api/agent/threads/*` and `shares/*` → Hermes server `scripts/hermes-server.js` on port 8790.

### HermesThread data model today (Neo4j)

`HermesThread` nodes are created by `createThread()` with:

- `id`, `title`, `surface` (string, max 80 chars), `created_at`, `updated_at`
- `thread_kind`: `'private'` (default) or `'group'` (Community Chat)
- `group_title`: optional display name for group threads
- Optional: `pinned`, `archived`, `share_anchor_turn_id`, `controller_contributor_id`, `contribution_sets_json`

Workgroup context still appears on **`ThreadShare.workgroup_id`** when shares are created with `workgroupId`.

Relationships:

- `Contributor -[:OWNS_THREAD]-> HermesThread` (exactly one owner per thread in normal flows)
- `HermesThread -[:HAS_TURN]-> MemoryArtifact` (turns; `kind`: `dp-chat`, `contribution-record`, etc.)
- `HermesThread -[:HAS_SHARE]-> ThreadShare` → `ShareGrant`, recipient `WATCHES` / `CONTROLS`

See `HERMES-SHARE.md` for share modes (live vs fork snapshot), roles, anchor floor.

### Workgroup Hermes vs `/agent` Hermes (two runtimes)

| Surface | Where | Thread storage | Sidebar |
|---------|--------|----------------|---------|
| **`/agent`** | `HermesChat` full page | Neo4j `HermesThread` + sidebar | Yes |
| **Workgroup collab** | `WorkgroupChatPanel` + `WorkgroupHermesPanel` | **Member chat:** Gov Hub/Postgres messages. **Private panel:** Postgres `dp_hermes_hand`, in-memory `WorkgroupAskNote` (Ask Hermes). **Not** the `/agent` sidebar. | Workgroup private panel only |
| **Workgroup AI assist** | `WorkgroupChatAiAssist` → `fetchComposeAiResponse` → `POST /api/agent/chat` | **Side effect (fixed):** no longer auto-creates Neo4j threads when `skipMemoryRecord: true` | N/A after Phase 0 |
| **Workgroup chat share** | `WorkgroupMessageShareModal` → `dp_workgroup_message_share` | Postgres; not Neo4j | N/A |
| **Agent thread share in WG context** | `POST /api/agent/threads/:id/shares` with optional `workgroupId` | Neo4j `ThreadShare`; recipient sees thread under `/agent` Shared | Yes for recipients |

Workgroup **does not** embed `HermesChat` today. Collab Hermes is hands + Ask notes + composer assist, not a persisted multi-turn agent sidebar inside the workgroup page.

### Root cause: workgroup (and assist) threads in the private sidebar

**Primary cause (fixed in Phase 0):** `handleDpChat()` in `neo4j-knowledge-graph/src/hermes/dp-chat.js` previously auto-created a new owned thread whenever `verifierId` was set and `threadId` was omitted. Workgroup assist now uses `skipMemoryRecord: true` by default; compose assist passes active `threadId` when present.

**Secondary duplicate sources** (unchanged):

| Mechanism | Effect |
|-----------|--------|
| **`forkThreadFromTurn` / `forkThreadThroughTurn`** | New owned thread (title suffix `(fork)` or `(snapshot)`); intentional copy for edit/fork or fork snapshot share. |
| **Fork snapshot share** | `createThreadShare` with `shareThreadKind: fork_snapshot` creates a **new** owned fork for recipients; source thread unchanged. |
| **Shared section split** | Same thread id should **not** appear in both My conversations and Shared > By me (client filters `activeShareCount`). |

**Surface string inconsistency (fixed in Phase 0):** `/agent` page now normalizes thread create surface.

---

## Phase 0: Sidebar fix (DONE)

**Commits:**

| Repo | SHA | Summary |
|------|-----|---------|
| `desirable-properties` | `6c4f943` | Stateless compose assist uses `skipMemoryRecord`; agent compose passes active `threadId`; sidebar Workgroup badge + collab link |
| `neo4j-knowledge-graph` | `b026262` | Skip auto-thread create for stateless assist in `dp-chat.js` |

**Delivered:**

1. Stop assist orphan threads (P0).
2. Surface badge + link to workgroup collab from sidebar (badge per row, not split sections).
3. Normalize `surface` on thread create (`/agent` page).

**Orphan backfill (2026-08-19):**

Script: `neo4j-knowledge-graph/scripts/archive-assist-orphan-threads.js`

Criteria: owned threads where `surface` contains `workgroups/`, zero active shares, 0–1 turns, not already archived.

**Result:** 3 threads archived (all single-turn assist orphans on `desirableproperties.org/workgroups/dp-discovery`, owner `daveed@bridgit.io`). Log: `scripts/archive-assist-orphan-threads-apply-*.json`.

---

## Sidebar origin UX (locked)

Badge + outbound link per row (not separate sections):

| Origin | Sidebar treatment | On select |
|--------|-------------------|-----------|
| `surface` contains `/workgroups/` | Badge: **Workgroup**; subtitle: parsed slug or name if cached | Primary action stays open thread in `/agent`; secondary **Open in collab** → `/workgroups/{slug}` |
| `thread_kind: group` | Badge: **Community**; show `group_title` or thread title | Open in `/agent`; manage members via share UI |
| Shared with me (existing) | Keep Shared > With me; show owner | Unchanged |
| Shared by me (existing) | Keep Shared > By me | Unchanged |
| Pure `/agent` private | No badge | Current behavior |

---

## Community Chat (invite-based group Hermes)

### User stories

1. As a signed-in user, I can **create a Community Chat** from `/agent` or workgroup **External Chat** tab and invite **multiple people by email or public link**.
2. As an invitee, I receive a **direct in-app** appearance under Shared (like share v2) or redeem a **public link**.
3. As a member, I can **read history** according to share visibility and anchor rules, and **send prompts** (all members can prompt in MVP).
4. As the creator, I can **add/remove members**, **revoke access**, and manage invites.
5. As a member, I see **group context** in the sidebar (Community badge, group title, member count when available).

### Explicitly out of scope (MVP)

- Workgroup **governance** (chairs, positions, nominations, join/leave panels)
- Gov Hub **draft**, `dp_proposal`, passage review, Review tab
- Workgroup **member chat** (Postgres/Gov Hub message thread) as the group container
- **Ambient hand** pipeline (`dp_hermes_hand`, facilitator queue)
- Workgroup **message share** (`dp_workgroup_message_share`)
- Canopi Discuss embed as the group container

### Data model (Option A, locked)

Extend `HermesThread` + share invites:

```text
HermesThread.thread_kind: 'private' | 'group'   (default 'private')
HermesThread.group_title: string | null
ThreadShare / WATCHES.role: 'member' with canPrompt true
```

Backend foundations (2026-08-19):

- `createThread()` accepts `threadKind` / `groupTitle`; defaults to `private`
- `listThreads()` returns `threadKind`, `groupTitle`
- `resolveThreadAccess()` grants `canPrompt` for `WATCHES.role = member`
- `mapShareWatchRole('member')` → `member`
- `createThreadShare()` accepts `sendeeRole: 'member'`

### Invite flow

| Step | MVP | v2 |
|------|-----|-----|
| Create group | Owner creates thread with `thread_kind: group`, sets title / `group_title` | + room avatar, description |
| Invite | Email → direct share with `intended_role: member`; public link for non-users | + pending invites table, signup then redeem |
| Roster | Contributor graph only | + Gov Hub user picker |
| Accept | Auto on direct delivery | + explicit accept for link invites |

Workgroup shares restrict recipients to **workgroup roster** (`WORKGROUP-SHARE.md`). Community Chat invites allow **any Contributor email** (or DP-signed-in users only), not tied to a workgroup id.

### Permissions (locked: multi-prompt)

| Role | View | Prompt | Share invite | Revoke others |
|------|------|--------|--------------|---------------|
| Owner | Yes | Yes | Yes | Yes |
| Member | Per visibility anchor | **Yes** | No | No |
| Watcher (existing) | Yes | No | No | No |
| Controller (existing) | Yes | Yes (single) | No | Request handoff |

### Reuse matrix

| Component | Reuse for Community Chat |
|-----------|-------------------------|
| `HermesChat.tsx` + `HermesThreadSidebar.tsx` | Yes, primary UI |
| `HermesShareWizard.tsx` | Extend for multi-invite, group title, role=member |
| `thread-access.js` share/create/revoke | Yes (member role landed) |
| `listThreads` / `listSharedWithMe` | Yes (`threadKind`, `groupTitle` in API) |
| Workgroup collab pages | External Chat tab entry only |
| Workgroup Hermes panel | Evolve to named Neo4j threads per workgroup (not panel-only) |
| Contribution pipeline | **Yes** – same thread turns, file to Canopi |
| `dp_workgroup_message_share` | **No** |

### Phased rollout

#### Phase 0: Sidebar fix – **DONE** (see above)

#### Community Chat MVP (in progress)

- [x] `thread_kind` on `createThread` (default `private`)
- [x] `canPrompt` for `member` role in `resolveThreadAccess`
- [x] Orphan backfill script + 3 threads archived
- [ ] Create group from `/agent` ("New Community Chat" action)
- [ ] External Chat tab in workgroup collab
- [ ] Invite 2+ members by email (direct share, role `member`)
- [ ] Public invite links for Community Chat (reuse share link flow)
- [ ] Sidebar Community badge + group title
- [ ] Owner manage members via share revoke + new invite
- [ ] Same anchor/visibility rules as share v2
- [ ] Contribution filing to Canopi (reuse existing flow)

#### v2 (6+ weeks)

- Invite links for non-contributors (signup then redeem) with pending state
- Room list / "My groups" sidebar section
- Optional: dedicated route `/agent/g/{threadId}`
- Group-level settings (retention, who can invite)
- Notification hooks (email digest) if product wants
- Workgroup Hermes: persist named Neo4j threads per workgroup with collab link

---

## Rough effort and dependencies

| Workstream | Effort | Status |
|------------|--------|--------|
| **P0 assist thread fix** | 2–4 dev days | Done (`6c4f943`, `b026262`) |
| **Sidebar origin UX** | 3–5 dev days | Done (`6c4f943`) |
| **Orphan backfill script** | 1–2 dev days | Done (3 archived) |
| **Community Chat MVP (model + roles)** | 2–3 weeks | Backend foundations done; UI next |
| **Community Chat MVP (UI polish)** | 1 week | Not started |
| **QA** | Cross-cutting | Staging Hermes on 8790, two test accounts, workgroup collab regression |

**Blockers:** Hermes server restart for backend changes; no Gov Hub schema required for MVP (Neo4j only).

**Testing checklist (sidebar fix):**

1. Ask Hermes in workgroup → no new row in `/agent` My conversations (after fix). ✓
2. Full `/agent` chat → single thread, compose assist appends to same thread. ✓
3. Share thread to workgroup member → one row in recipient Shared with me; owner sees Shared by me only.
4. Workgroup-origin thread shows badge + link; link opens correct collab slug. ✓

**Testing checklist (Community Chat MVP):**

1. Create group, invite two emails, both prompt Hermes, turns visible to all.
2. Revoke one member; access denied on reload.
3. Anchor floor on partial visibility share still enforced.
4. Public invite link redeem grants member role with canPrompt.
5. Contribution filing from group thread works like private `/agent`.

---

## Investigation references (code)

| Area | Path |
|------|------|
| Sidebar UI | `challenge-site/src/components/HermesThreadSidebar.tsx` |
| Thread load / split | `challenge-site/src/components/HermesChat.tsx` (`loadThreads`, `sharedByMeThreads`) |
| listThreads | `neo4j-knowledge-graph/src/hermes/hermes-threads.js` |
| listSharedWithMe | `neo4j-knowledge-graph/src/hermes/thread-access.js` |
| Auto-create thread (fixed) | `neo4j-knowledge-graph/src/hermes/dp-chat.js` |
| Workgroup assist surface | `challenge-site/src/components/workgroup/WorkgroupChatAiAssist.tsx` |
| Stateless assist fetch | `challenge-site/src/lib/compose-ai-prompts.ts` |
| Share create | `thread-access.js` `createThreadShare` |
| Orphan archive script | `neo4j-knowledge-graph/scripts/archive-assist-orphan-threads.js` |
| API proxy | `challenge-site/src/app/api/agent/threads/route.ts`, `shares/route.ts` |
| Hermes server routes | `neo4j-knowledge-graph/scripts/hermes-server.js` |
