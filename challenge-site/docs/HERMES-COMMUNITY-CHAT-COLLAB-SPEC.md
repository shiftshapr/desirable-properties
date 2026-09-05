# Community Chat collab spec

**Status:** Product spec (no implementation). **Supersedes** the "shared Deepi thread" UX model in `HERMES-GROUP-CHAT-SCOPE.md` § "UX model (not workgroup collab split)".

**Authority:** Daveed sign-off on acceptance criteria (§10).

Related: `HERMES-GROUP-CHAT-SCOPE.md` (sidebar origin, invite backend), `HERMES-SHARE.md`, `WORKGROUP-SHARE.md`, `docs/WORKGROUP-REVIEW-TAB.md`.

---

## 1. One-line definition

**Community Chat** is workgroup Collab chat (human main thread + private Deepi right sidebar) on `/agent`, with membership from invites instead of a workgroup roster and no workgroup governance container.

---

## 2. Locked product model

| Dimension | Workgroup Chat (Collab tab) | Community Chat (correct target) | Wrong current MVP |
|-----------|----------------------------|----------------------------------|-------------------|
| **Surface** | `/workgroups/{slug}?tab=chat` | `/agent` (thread selected) | `/agent` |
| **Container** | Workgroup (Gov Hub membership) | `HermesThread` with `thread_kind: group` | Same Neo4j group thread |
| **Membership source** | Workgroup roster (`is_member`, `can_post`) | Invite email + public link (`ThreadShare` / `WATCHES`, role `member`) | Same invite model |
| **Main area** | Human-to-human messages (Postgres / Gov Hub proxy) | Human-to-human messages (new Postgres lane, same UX) | Shared Neo4j Deepi transcript; all members prompt in main |
| **Right sidebar** | `WorkgroupHermesPanel` (private Deepi: raised hands, Ask Hermes) | Same layout and behavior (`CommunityHermesPanel` or generalized panel) | **None** |
| **Main composer** | Post to member chat; draft assist + Ask Hermes in composer | Same pattern; placeholder "Message Community Chat…" | "Message Community Chat…" but sends **Deepi prompts** to shared thread |
| **Deepi prompt visibility** | Private until user shares to main chat | Private until user shares to main chat | **Public** in shared thread turns |
| **Ambient hands** | `dp_hermes_hand` keyed by `workgroup_id` | Same pipeline keyed by `community_thread_id` | Not implemented |
| **Ask Hermes** | In-panel private notes (`WorkgroupAskNote`, session state) | Same semantics, scoped to community thread | N/A (main-thread prompts only) |
| **Share Deepi note → group** | Posts attributed message to workgroup chat | Posts attributed message to community human chat | N/A |
| **Workgroup message share** | `dp_workgroup_message_share` (position-gated) | **Out of scope** (no Gov Hub positions) | N/A |
| **Sidebar entry** | N/A (lives in workgroup) | `/agent` sidebar: Community badge, `group_title` | Same |
| **Entry from workgroup** | N/A | External Chat tab → create/open on `/agent` | Same link, wrong UX on land |
| **Contribution filing** | Via `/agent` private threads | Yes – from private Deepi side panel context (not from human chat rows) | From shared main thread (wrong surface) |
| **Control / watcher** | N/A in collab | Share v2 roles still apply for **private** `/agent` thread shares; community **member** uses `canPrompt` on side panel only | Watcher vs member on main Deepi thread |

**Product lock:** Community Chat is **collab-parity**, not "group Hermes in one transcript."

---

## 3. UI layout

Must match workgroup Collab split (`WorkgroupChatPanel` + `WorkgroupHermesPanel`).

### Desktop (lg+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  /agent sidebar (260–280px)  │  Community Chat main (flex-1)  │ Deepi panel │
│  Community badge + title     │  Human message list            │ (right rail)│
│                              │  Ambient settings / queue      │ Raised hands│
│                              │  Composer + draft assist       │ Ask Hermes  │
└─────────────────────────────────────────────────────────────────────────────┘
```

Reference layout: `WorkgroupChatPanel` `lg:flex lg:min-h-[32rem]` with main column + `WorkgroupHermesPanel`.

### Mobile

Same as workgroup: main chat full width; **Deepi** button opens `WorkgroupHermesPanel` as overlay (`mobileOpen` / `onMobileClose`).

### Header (inside main column, not replacing `/agent` chrome)

Reuse `HermesCommunityCollabHeader` (Community badge, title, participant chips, Invite). Replaces private-thread Share status row when `thread_kind === 'group'`.

### When Community Chat is active on `/agent`

| Region | Behavior |
|--------|----------|
| Left sidebar | Standard `HermesThreadSidebar`; Community rows show badge + `group_title` |
| Center | **Collab layout**, not `HermesChat` turn list |
| Right | `HermesAmbientSidePanel` behavior lives inside the collab panel stack (expand/collapse rail identical to workgroup) |

### Explicit non-layout

- No full-width single Deepi transcript for group threads.
- No removal of `/agent` sidebar when viewing Community Chat.
- No embed of workgroup tabs (governance, Activity, Getting Started).

---

## 4. Membership

Mirror collab **posting** semantics; source roster from **invites**, not Gov Hub.

### Roles (Neo4j share graph, locked)

| Role | View human chat | Post human message | Private Deepi (`canPrompt`) | Invite / revoke |
|------|-----------------|--------------------|-----------------------------|-----------------|
| Owner | Yes | Yes | Yes | Yes |
| Member (`WATCHES`, `canPrompt: true`) | Per anchor / visibility | Yes | Yes | No |
| Watcher | Per visibility | No | No | No |
| Controller | Per visibility | No | Yes (single-controller semantics on **private** agent flows only; not on human chat) | No |

**Locked:** Everyone invited as **member** can use the private Deepi side panel (`canPrompt`), same intent as collab "everyone can prompt" but **in the sidebar**, not in the main transcript.

### Invite channels (locked)

| Channel | MVP |
|---------|-----|
| Direct email | `createThreadShare` with `sendeeRole: member` |
| Public invite link | Reuse share link flow; redeem grants `member` + `canPrompt` |

UI: extend `HermesCommunityInviteModal` / `HermesShareWizard` (group mode). No Gov Hub user picker in MVP.

### Access checks

- **Human chat read/post:** server validates active `WATCHES` (or owner) on `community_thread_id`.
- **Deepi side panel:** `resolveThreadAccess().canPrompt` (existing backend).
- **Not** workgroup roster APIs.

### Optional origin metadata

`ThreadShare.workgroup_id` may be set when created from External Chat tab (`from=workgroup&wg={slug}`) for provenance only. Does **not** grant workgroup roster access.

---

## 5. What reuses from workgroup collab

| Workgroup artifact | Community Chat reuse |
|--------------------|----------------------|
| `WorkgroupChatPanel` layout | **Pattern** – extract or duplicate split shell (`CommunityChatPanel`) |
| `WorkgroupChatComposer` | Reuse with `communityThreadId` instead of `workgroupSlug` |
| `WorkgroupChatAiAssist` | Reuse (`skipMemoryRecord: true`; no orphan `/agent` threads) |
| `WorkgroupHermesPanel` | Reuse or thin wrapper (`communityThreadId` props) |
| `HermesAmbientSidePanel` | Same hand open/share/dismiss flow |
| `HermesAmbientFacilitatorQueue`, `HermesAmbientHandBadge`, `HermesAmbientSettingsPanel` | Reuse; scope IDs to community thread |
| `HermesExperimentalInstructionsModal` | Reuse (community-specific copy variant) |
| `hermes-ambient-api` / `dp-hermes-ambient-store` | Extend scoping from `workgroup_id` → `community_thread_id` |
| `fetchComposeAiResponse` / `POST /api/agent/chat` | Draft assist + Ask Hermes (stateless) |
| `WorkgroupMessageBody` | Render human messages |
| `SHARED_DEEPI_MESSAGE_PREFIX` + share-to-group | Post Deepi attribution into **human** chat |
| `HermesCommunityCollabHeader` | Keep |
| `HermesCommunityInviteModal`, `HermesCommunityCreateModal` | Keep |
| `HermesThreadSidebar` + thread list APIs | Keep (`threadKind`, `groupTitle`) |
| Contribution filing | From private Deepi context only (same as `/agent` private) |

**Do not reuse:** `WorkgroupMessageShareModal`, `canMemberShareMessage`, Gov Hub message routes, workgroup join/leave panels.

---

## 6. What differs

| Topic | Workgroup Chat | Community Chat |
|-------|----------------|----------------|
| **Route** | `/workgroups/{slug}` | `/agent?thread={id}` (or sidebar select) |
| **Slug** | Required (`workgroupSlug`) | None; Neo4j `hermes:thread:{uuid}` |
| **Roster API** | `GET /api/workgroups/{id}/messages` | New `GET/POST /api/agent/community-threads/{id}/messages` (or equivalent) |
| **Membership** | Gov Hub `is_member` | `ThreadShare` / invite redeem |
| **Create flow** | Join workgroup | `HermesCommunityCreateModal` → invite wizard |
| **Workgroup entry** | Default Collab tab | `WorkgroupExternalChatPanel` → `/agent?create=community&from=workgroup&wg=…` |
| **Sidebar badge** | Workgroup (on mis-origin agent threads only) | Community |
| **Governance** | Positions, nominate, draft links | Absent |
| **Activity feed** | Workgroup Activity tab | Not in v1 (human chat is self-contained) |
| **Human message share restrictions** | Position-gated | Not in v1 |
| **Neo4j group thread turns** | N/A | **Not** the human chat log; container + access only |

### `/agent` routing rules

1. Selecting `thread_kind: group` in sidebar → render **Community collab shell**, not standard `HermesChat` message stream.
2. `?create=community` → create modal → invite modal → select new thread in collab mode.
3. Private `thread_kind: private` threads → unchanged `HermesChat` behavior.
4. Deep link `?thread={id}&invite=community` → invite redeem modal (existing).

### Copy fix (entry point)

`WorkgroupExternalChatPanel` currently says participants "prompt Deepi" in a shared thread. Update to: human chat + private Deepi panel, same as workgroup Collab.

---

## 7. Data model

### Principle

**Human chat ≠ Hermes thread turns.** The group `HermesThread` is the **room key** for membership, sidebar, and invites. The main transcript is Postgres. The right sidebar uses the same ambient + Ask patterns as workgroup, private per user until shared.

### Neo4j (existing, keep)

```text
HermesThread
  thread_kind: 'group'
  group_title: string
  id, title, surface, …

Contributor -[:OWNS_THREAD]-> HermesThread
Contributor -[:WATCHES]-> HermesThread   // member | watcher | …
HermesThread -[:HAS_SHARE]-> ThreadShare
```

- **Do not** append member human chat messages as `HAS_TURN` / `dp-chat` on the group thread.
- Optional: per-user **private** `HermesThread` linked to community room for long-running Ask Hermes persistence (v2). MVP may match workgroup: Ask notes in session state only.

### Postgres (new)

**`dp_community_chat_message`** (challenge-site `dp-db` schema):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `community_thread_id` | text | Neo4j thread id (`hermes:thread:…`) |
| `author_user_id` | text | DP session user |
| `author_name` | text | Display |
| `body` | text | Markdown/plain per workgroup parity |
| `created_at` | timestamptz | |
| `source` | text | `human` \| `deepi_shared` (attributed share from panel) |

Indexes: `(community_thread_id, created_at)`, `(community_thread_id, id)`.

**`dp_hermes_hand`** (extend existing table):

| Change | Notes |
|--------|-------|
| Add nullable `community_thread_id` | XOR with `workgroup_id` (check constraint: exactly one set) |
| Keep `owner_user_id` | Hands remain **private per user** |

**`dp_hermes_community_settings`** (optional MVP):

Mirror `dp_hermes_workgroup_settings` keyed by `community_thread_id`, or default global settings until v2.

### API surface (new)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/agent/community-threads/{threadId}/messages` | List human messages + caller access |
| POST | `/api/agent/community-threads/{threadId}/messages` | Post human message (member/owner) |
| GET/POST | `/api/agent/community-threads/{threadId}/hermes-hands/*` | Parallel to workgroup ambient routes |

Proxy auth: same session / `verifierId` as existing agent routes. Authorize via `resolveThreadAccess(threadId)`.

### What reads/writes where

| Data | Store |
|------|-------|
| Invite roster, `canPrompt` | Neo4j `thread-access.js` |
| Human chat transcript | Postgres `dp_community_chat_message` |
| Ambient hands | Postgres `dp_hermes_hand` |
| Ask Hermes notes (MVP) | Client session state (`WorkgroupAskNote` shape) |
| Draft assist | Stateless `POST /api/agent/chat` (`skipMemoryRecord: true`) |
| Sidebar list | Neo4j `listThreads` / `listSharedWithMe` |
| Contribution filing | Existing Neo4j turn on **user's private** agent thread or dedicated flow from panel (unchanged from private `/agent`) |

---

## 8. Migration from shared-Deepi-thread MVP

### Problem

Early MVP treated `thread_kind: group` as a **shared** `/agent` transcript. That contradicts collab parity and pollutes the room with public Deepi turns.

### Migration steps

1. **Ship collab UI** behind selecting group threads (feature flag acceptable).
2. **Identify affected threads:** `thread_kind = 'group'` with `HAS_TURN` count > 0.
3. **Per thread (owner-visible banner):**
   - Archive or hide pre-migration Neo4j turns from the **main** UI (keep in DB for audit).
   - Start human chat lane empty (or offer one-time "import as human messages" only for turns that were clearly user text, not assistant – default: **no import**).
4. **Update `HermesChat`:** when `isCommunityCollabThread`, never call `submitChatMessage` for main composer.
5. **Fix copy** in `WorkgroupExternalChatPanel`, `HERMES-GROUP-CHAT-SCOPE.md`, `dp-community-ai.ts` placeholders if needed.
6. **Backfill ambient:** no migration (hands did not exist for community).

### Owner communication

One-time notice in Community Chat header: "Community Chat now uses member chat + private Deepi, like workgroup Collab. Earlier Deepi messages in this room are in archive."

### Rollback

Keep archived turns addressable via admin/support query; do not delete Neo4j nodes in MVP migration.

---

## 9. Non-goals

- Workgroup governance (chairs, positions, nominations, join/leave)
- Gov Hub draft container, `dp_proposal`, Review tab
- Workgroup Activity feed inside Community Chat
- `dp_workgroup_message_share` or position-gated message sharing
- Canopi Discuss as the group container
- Single shared Deepi transcript where all members prompt ( **explicitly rejected** )
- Replacing `/agent` sidebar or merging Community into workgroup pages
- Non-contributor invite signup flow (v2 in scope doc)
- Dedicated route `/agent/g/{id}` (v2 optional)
- Public anonymous read without invite
- Email digest / push notifications (v2)

---

## 10. Acceptance criteria

Daveed sign-off when all pass on staging (two test accounts, Hermes on 8790).

### Layout and UX

- [ ] Selecting a Community thread on `/agent` shows **human main + Deepi right sidebar**, visually matching workgroup Collab at `lg` breakpoint.
- [ ] Mobile Deepi button opens the same panel overlay as workgroup.
- [ ] Main composer placeholder: "Message Community Chat…" and posts **human** messages, not Deepi turns.
- [ ] Private Ask Hermes and draft assist work from composer; replies appear in right panel only until shared.
- [ ] Sharing a Deepi note posts an attributed message to the human chat visible to all members.

### Membership

- [ ] Owner creates Community Chat from `/agent` and from workgroup External Chat tab.
- [ ] Invite by email adds `member` with `canPrompt`; invitee sees thread under Shared → With me (or owner under My conversations).
- [ ] Public invite link redeem grants `member` + `canPrompt`.
- [ ] Revoked member loses human read/post and Deepi prompt on reload.
- [ ] Watcher can read per visibility rules but cannot post human messages or prompt Deepi.

### Ambient

- [ ] After a human message, ambient assess can raise a hand (when settings enabled).
- [ ] Hand open / dismiss / share-to-group matches workgroup behavior.
- [ ] Hands are private per user until shared.

### Data integrity

- [ ] Human messages persist in Postgres, survive reload, visible to all members.
- [ ] Group `HermesThread` has **no new** `HAS_TURN` rows from human chat or side-panel Ask (MVP).
- [ ] No new orphan `/agent` private threads from community draft assist.

### Sidebar and entry

- [ ] Community badge + `group_title` in sidebar.
- [ ] External Chat link opens create/invite flow on `/agent`.
- [ ] Workgroup-origin metadata does not require workgroup membership to participate.

### Regression

- [ ] Private `/agent` threads unchanged.
- [ ] Workgroup Collab tab unchanged.
- [ ] Share v2 private thread share/watch/control unchanged.
- [ ] Contribution filing still works from appropriate Deepi contexts.

### Migration

- [ ] Existing group threads with old shared Deepi turns show migration notice; main lane uses human chat model.
- [ ] No duplicate sidebar rows for community owner (owned vs shared split).

---

## Investigation references

| Area | Path |
|------|------|
| Collab shell | `src/components/workgroup/WorkgroupChatPanel.tsx` |
| Deepi panel | `src/components/workgroup/WorkgroupHermesPanel.tsx` |
| Ambient overlay | `src/components/workgroup/HermesAmbientSidePanel.tsx` |
| Workgroup collab client | `src/app/workgroups/[slug]/WorkgroupCollabClient.tsx` |
| External Chat entry | `src/components/workgroup/WorkgroupExternalChatPanel.tsx` |
| Wrong MVP branch | `src/components/HermesChat.tsx` (`isActiveCommunityChat`) |
| Community helpers | `src/lib/hermes-community-collab.ts` |
| Thread kind backend | `neo4j-knowledge-graph/src/hermes/hermes-threads.js`, `thread-access.js` |
| Ambient store | `src/lib/dp-hermes-ambient-store.ts` |
| Scope (sidebar) | `docs/HERMES-GROUP-CHAT-SCOPE.md` |
