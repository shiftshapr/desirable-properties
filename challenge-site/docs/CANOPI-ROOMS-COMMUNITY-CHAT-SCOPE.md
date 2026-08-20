# Canopi Rooms + Community Hermes Chat scope

Product and engineering scope for binding **page-scoped Canopi Rooms** to **DP Community Chat (Hermes `thread_kind: group`)**, optionally via a **community room URL** that loads a target page and opens conversation in the Canopi sidebar.

**Status:** Discussion doc only. No implementation committed here.

**Related:** `HERMES-GROUP-CHAT-SCOPE.md` (Community Chat MVP on `/agent`), Canopi `docs-site/guide/sidebar-tabs.md` (Rooms tab), `challenge-site/src/components/canopi/CanopiWebEmbed.tsx` (Discuss embed on DP pages).

---

## What you are describing (plain language)

You want a visitor to land on a **page or meta-domain**, read or interact with that page, and have **community conversation happen inside Canopi** rather than leaving the page for `/agent`.

Specifically:

1. **Canopi Rooms** become the in-sidebar container for that conversation (not only DMs and ad hoc group chats).
2. Each room can carry a **personal in-tab sidebar** like `/agent`: thread list, Community badge, invite flow, contribution filing.
3. A **Canopi room URL** (or equivalent deep link) means: load the underlying page, boot Canopi embed, then open **Rooms** (or a dedicated community room type) once the page is ready.
4. Significant **UI work** is required because a full `/agent` layout does not fit the ~360px Canopi sidebar.
5. Optionally, users can **detach conversation into a collapsible floating panel** (PiP-style) when the page or room chrome needs more space.

This is a **cross-product integration**: Canopi (Supabase Rooms + embed sidebar) plus Desirable Properties Hermes (Neo4j group threads + `/agent` UX).

---

## Current state

### Canopi Rooms today

| Layer | What exists |
|-------|-------------|
| **API** | `GET/POST /v1/rooms`, messages, members, discover, join (`canopi/routes/rooms.js`, `canopi/services/roomsService.js`) |
| **Storage** | Supabase `rooms`, `room_members`, `room_messages` (not Neo4j) |
| **Page binding** | `rooms.page_id`, optional `anchor_content_hash` / `anchor_excerpt`; messages may set `context_page_id` |
| **UI** | `canopi/presence/src/features/RoomsModule.ts` in sidebar tab `rooms-tab` |
| **Navigation** | In-room page chips call `CANOPI_NAVIGATE_HOST_PAGE` with `preserveSidebar: true` (in-place host navigation, not a new tab) |
| **Deep open** | `openRoomById(roomId)` from notifications only; **no public `share.canopi.live/room/{id}` landing** |
| **Default visibility** | Rooms tab is **not** in first-run tab set; users enable it in **Manage** (`docs-site/guide/sidebar-tabs.md`) |

Rooms are **page-linked group chat**, separate from Discuss threads and separate from Hermes. They support attachments, roles (owner/admin/member), public discover + open join policy, and DM-style two-member rooms via `find-or-create`.

### Hermes / Community Chat today (DP challenge-site)

| Layer | What exists |
|-------|-------------|
| **Full agent UI** | `/agent` → `HermesChat.tsx` + fixed `HermesThreadSidebar` (260–280px desktop column) |
| **Community Chat model** | Neo4j `HermesThread.thread_kind: 'group'`, `group_title`, member role with `canPrompt` (`HERMES-GROUP-CHAT-SCOPE.md`) |
| **MVP UI (partial)** | `HermesCommunityCreateModal`, `HermesShareWizard` community mode, Community badge in sidebar, External Chat tab entry in workgroup collab |
| **Embed Hermes (Discuss assist)** | `POST /api/embed/hermes/agent`, `POST /api/embed/hermes/assist/generate` → Hermes `/api/dp/chat` with proxy secret |
| **Embed auth bridge** | `GET /api/auth/canopi/embed-session` mints Canopi embed JWT from DP Web3Auth session |
| **Canopi Discuss embed** | `CanopiWebEmbed.tsx` loads `api.canopi.live/embed/v1.js` with `data-canopi-auth-session` |

Community Chat MVP is scoped to **`/agent` and workgroup External Chat`**, explicitly **out of scope**: "Canopi Discuss embed as the group container" (`HERMES-GROUP-CHAT-SCOPE.md`).

### Canopi Agent tab today (not DP Hermes)

The Canopi sidebar **Agent** tab (`AgentModule.ts`) calls **`POST /api/agent` on the Canopi API** (OpenAI/DeepSeek page Q&A). It is **not** wired to DP Hermes, Neo4j threads, or Community Chat. Do not conflate this with `/agent` on desirableproperties.org.

### Canopi web embed today

| Capability | Status |
|------------|--------|
| Embed loader | `app.canopi.live` / `api.canopi.live/embed/v1.js` |
| Sidebar iframe | `embed-sidepanel.html` (generated from extension sidepanel; includes Discuss, Rooms, Agent tabs when enabled) |
| Layout modes | **Push** (body margin) vs **overlay** (`sidebarLayout` in embed config) |
| Page context | `pageUrl`, `communityId`, `__CANOPI_PAGE_URL__`, publisher `updatePageContext()` |
| Auto-open | DP embed uses `data-canopi-auto-open="discuss"` today, not Rooms |
| Proxy target page | **No** server-side reverse proxy; embed runs **on** the customer origin in an iframe sidebar |

### Registry / deploy map (relevant)

| Project | Domains / ports |
|---------|-----------------|
| **canopi** | `app.canopi.live` (4000), `api.canopi.live` (3002), `share.canopi.live`, `view.canopi.live` |
| **desirable-properties** | `desirableproperties.org` (3005), staging (3006), `book.desirableproperties.org` |
| **Hermes** | challenge-site proxies to Hermes server (~8790); not part of Canopi PM2 units |

---

## Gap analysis

| Your vision | Gap |
|-------------|-----|
| Community conversation **in Canopi** on arbitrary pages | Community Chat lives on **`/agent`** (full-page React), not in Canopi sidebar |
| **Hermes sidebar inside Rooms** | Rooms UI is custom HTML in `RoomsModule.ts`; Hermes is ~2800-line React with no embed bundle for Canopi iframe |
| **Room URL loads page + opens Rooms** | No room landing URL; embed opens Discuss by default on DP; `openRoomById` is extension-internal |
| **Proxy underlying page URL** | Canopi embed expects to run on the **real page origin** (CORS, cookies, pageId). Full-page proxy is a **new product surface** (iframe shell or SSR gateway) |
| **Personal sidebar in tab** | `/agent` sidebar is viewport-fixed **outside** Canopi chrome; Rooms tab has **no** secondary sidebar column |
| **Floating / PiP Hermes** | Embed has overlay layout and floating **anchor widget**, not a draggable Hermes chat window |
| **Single thread model** | **Two stores**: Supabase room messages vs Neo4j Hermes turns; no `hermes_thread_id` on `rooms` row today |
| **Meta-domain binding** | Gov Hub / BRC333 meta-domain is **ordinal namespace**, not wired to Canopi `page_id` or Hermes `surface` automatically |

**Bottom line:** The **pieces exist in parallel**. The **glue** (room type, auth, UI fit, URL routing, thread linkage) is greenfield.

---

## Architecture options

### A) Canopi room URL wraps target page + Hermes sidebar panel in room chrome

**Idea:** A first-party route (e.g. `app.canopi.live/community/r/{roomId}?page=https://…`) renders:

- Main pane: iframe or redirect to the bound page URL
- Canopi embed with Rooms tab forced active and room opened
- Inner **Hermes panel** (iframe to DP `/agent` or a new `/embed/hermes/room` route) docked inside room view

**Pros:** Clear product URL; Canopi owns chrome; page and chat stay visually coupled.

**Cons:** iframe + third-party cookie restrictions; DP `/agent` is not iframe-friendly today; double auth (Canopi + DP session); SEO and X-Frame-Options on target pages.

**Fit:** Medium-high effort; needs dedicated **embed-safe Hermes shell** (not full `/agent` page).

### B) iframe / proxy page load, then Canopi overlay with Rooms drawer

**Idea:** Host page loads normally (or via lightweight proxy). After load, `v1.js` opens sidebar on **Rooms** (`data-canopi-auto-open="rooms"` + `openRoomById`). Hermes appears as a **drawer** inside the room panel.

**Pros:** Reuses existing embed boot (`v1.js`, `embed-sidepanel.html`); no full-page Canopi route required for MVP.

**Cons:** Customer sites must install embed (already true for DP); proxying arbitrary URLs is hard; room open requires new query params (`?canopiRoom=`, `?canopiOpen=rooms`) and background handler parity with Discuss deep links.

**Fit:** Best **Phase 1 POC** on DP pages that already run `CanopiWebEmbed`.

### C) Community Hermes room as first-class Canopi room type linked to Neo4j `thread_kind: group`

**Idea:** Extend Supabase `rooms` (or parallel metadata table) with:

```text
room_kind: 'chat' | 'community_hermes'
hermes_thread_id: UUID (Neo4j HermesThread.id)
bound_page_url: string (canonical)
bound_page_id: string (Canopi page_id slug)
```

Room UI for `community_hermes`:

- Message list reads **Hermes turns** via DP API proxy (not `room_messages`), or dual-write during migration
- Member roster maps to **ThreadShare / WATCHES** graph
- Invites reuse **Community Chat** share flows

**Pros:** Aligns product language ("community room") with Community Chat data model; one invite/member story.

**Cons:** Hardest backend path; realtime (WS) may need Hermes polling or new subscriptions; Supabase room messages become redundant for this type.

**Fit:** Target **Phase 2** once POC validates UX; reuses MVP from `HERMES-GROUP-CHAT-SCOPE.md`.

### D) Collapsible floating Hermes panel (PiP-style) over any room

**Idea:** Inside Rooms (or globally in embed), a toggle minimizes chat to a floating card (corner dock, resizable). State persists per room. Implementation options:

- Canopi-native floating div hosting iframe to `/embed/hermes/room?threadId=`
- Or port `HermesChat` `compact` mode into a shadow DOM / preact bundle (large lift)

**Pros:** Solves width constraint without losing conversation.

**Cons:** No PiP primitive in embed today; mobile overlap with trigger; accessibility and focus trap work.

**Fit:** **Phase 3** polish; can ship after in-tab sidebar MVP feels cramped.

### Recommended sequencing

1. **POC:** Option **B** on `desirableproperties.org` (embed already present) + query-param room open.
2. **Product type:** Option **C** metadata + API linkage to Neo4j group threads.
3. **Distribution:** Option **A** room landing URL once embed-safe Hermes shell exists.
4. **UX escape hatch:** Option **D** floating panel.

---

## Meta-domain / page binding model

### How Canopi identifies a page today

- **page_id:** normalized slug from host + pathname (same pattern as `canopiPageIdFromUrl()` in `dp-canopi-chapters.ts`)
- **community_id:** embed instance config (DP uses `c0f30bc5-de17-4328-80d9-ff8f364907da`)
- **Runtime:** embed sets `pageUrl` from `location.href` (prod canonical origin for DP staging parity via `canopiPageUrlForPath()`)

### Proposed binding for community rooms

| Field | Source | Purpose |
|-------|--------|---------|
| `bound_page_url` | Publisher canonical URL (e.g. `https://desirableproperties.org/perspectives/…`) | Human link, Hermes `surface`, dpFocus |
| `bound_page_id` | `canopiPageIdFromUrl(bound_page_url)` | Filter Rooms list, Discuss cross-links |
| `community_id` | Embed instance | Canopi community scope |
| `hermes_thread_id` | Neo4j | Community Chat transcript + members |
| `room_id` | Supabase UUID | Canopi room identity, notifications, discover |
| `meta_domain` (optional) | Gov Hub / ordinal registry | Marketing entry; maps to `bound_page_url` via admin config, not automatic |

### URL patterns (proposed, not implemented)

| Pattern | Behavior |
|---------|----------|
| `https://desirableproperties.org/path?discuss=1&canopiRoom={uuid}` | Existing page + embed; open Rooms tab + room (mirror `canopiOpen` / `canopiMsg` Discuss params) |
| `https://app.canopi.live/r/{roomId}?page={encodedUrl}` | Landing shell (Option A) |
| `https://desirableproperties.org/agent?thread={id}` | Already planned in Community Chat v2; parallel entry, not room chrome |

**Meta-domain note:** Meta-domain as a **DNS/Web4 concept** is not the same as Canopi `page_id`. Binding requires an explicit **registry row** (page URL, community id, default Hermes thread). Gov Hub `meta_domain` fields are coordination metadata, not embed keys.

---

## Reuse from Community Chat MVP

| Asset | Reuse in Canopi Rooms integration |
|-------|-----------------------------------|
| `HermesThread` `thread_kind: group`, member `canPrompt` | **Yes** – backend of community room |
| `HermesShareWizard` / invite by email + public link | **Yes** – invite from room header |
| `HermesCommunityCreateModal` | **Adapt** – create thread + Supabase room in one flow |
| `HermesThreadSidebar` | **Partial** – needs compact / embed variant; thread list UX |
| `HermesChat.tsx` `compact` prop | **Starting point** – already hides some chrome; not yet used in production |
| `/api/agent/threads/*`, `/api/agent/shares/*` | **Yes** – proxy layer unchanged |
| `/api/embed/hermes/*` + `embed-session` | **Yes** – Canopi Agent tab could call DP Hermes instead of `/api/agent` (product decision) |
| Contribution filing (`hermesContribution.ts`) | **Yes** – same as `/agent` group threads |
| Workgroup External Chat entry | **Pattern only** – deep link to create flow with `surface` context |

**Do not reuse:** Supabase `room_messages` as source of truth for Hermes community rooms (unless dual-write during transition). Canopi generic Agent tab LLM path.

---

## UI challenges in room space

| Challenge | Detail |
|-----------|--------|
| **Width** | Canopi sidebar ~320–400px; `/agent` sidebar alone is 260–280px + main chat column |
| **Layout** | Need stacked mode: room header → member strip → Hermes thread (single column) or tab toggle Room meta / Chat |
| **Mobile** | Embed collapses on ≤480px; floating panel may be mandatory for usable Hermes |
| **Sign-in** | Canopi Web3Auth embed session ≠ Hermes verifier session; may need unified handoff or embed Hermes with `skipMemoryRecord` + explicit thread join |
| **Navigation** | Room page chips already navigate host in-place; Hermes context must refresh `pageUrl` on navigation |
| **Contributions** | Filing to Discuss from narrow panel; reuse existing modals but test touch targets |
| **Accessibility** | Sidebar within iframe within page; focus trap for floating mode |

**Design direction:** Treat Rooms community view as **chat-first** with collapsible "Room info" (members, page link, invite), not a miniature `/agent` clone.

---

## Dependencies

| Dependency | Owner | Notes |
|------------|-------|-------|
| Canopi embed deploy | canopi | `v1.js`, sidepanel sync, CORS for DP origin |
| Embed auth bridge | challenge-site | `/api/auth/canopi/embed-session`, refresh route |
| Hermes proxy secret | challenge-site env | `CANOPI_EMBED_AI_PROXY_SECRET` for embed routes |
| Neo4j Community Chat MVP | neo4j-knowledge-graph + challenge-site | Group create, invites, member roles (in progress) |
| `hermes_thread_id` on room | canopi DB migration | New columns or side table |
| DP Hermes embed shell | challenge-site | New route e.g. `/embed/hermes/community` (iframe-safe, compact) |
| Canopi deep link handler | canopi presence + embed | Parse `canopiRoom`, auto-open Rooms tab |
| Hermes server | pm2 ~8790 | Thread list, chat, shares |
| Page canonical URLs | DP content | `canopiPageUrlForPath`, book vs site origins |

**Auth bridge gap:** Today embed-session mints **Canopi** JWT. Hermes thread APIs expect **DP session** (`verifierId`). POC must define one of:

- Server-side map Canopi user id → Contributor verifier on embed Hermes routes, or
- DP session cookie visible to same-origin embed iframe, or
- Hermes calls with service token + explicit `threadId` + membership check

---

## Phased roadmap

### Phase 0: Align terminology (now)

- [ ] Confirm "Community Room" = Hermes `thread_kind: group` + page binding, not vanilla Supabase room chat
- [ ] Finish Community Chat MVP on `/agent` (prerequisite for serious embed port)

### Phase 1: POC – embed page + open Rooms (Option B)

- [ ] Query param `canopiRoom={uuid}` handled in embed boot → `openRoomById`
- [ ] DP page: enable Rooms tab by default for test embed instance
- [ ] Room record with `page_id` matching page; manual create via API/admin
- [ ] Document test URL on staging.desirableproperties.org

**Success:** Land on perspective page, sidebar opens Rooms, correct room visible, page chip navigates in-place.

### Phase 2: Community Hermes room type (Option C)

- [ ] Schema: `room_kind`, `hermes_thread_id`, canonical `bound_page_url`
- [ ] Create flow: one action creates Neo4j group thread + Supabase room
- [ ] Room UI: Hermes transcript via DP API (compact embed iframe or ported widget)
- [ ] Invites: wire room header to `HermesShareWizard` community mode
- [ ] Member list from thread access API

**Success:** Two users in same room see same Hermes turns, both can prompt, invite works.

### Phase 3: Floating panel (Option D)

- [ ] Toggle: docked in room vs floating window
- [ ] Persist preference per room in localStorage / user prefs
- [ ] z-index and pointer-events vs Canopi trigger

### Phase 4: Community room URL product (Option A)

- [ ] `app.canopi.live/r/{id}` or share subdomain landing
- [ ] Optional page proxy policy (allowlist domains only)
- [ ] OG tags for share previews (like `share.canopi.live/message/`)

---

## Open questions for Daveed

1. **Container of truth:** Should community rooms use **Hermes turns only**, **Supabase room_messages only**, or **dual-write** during transition?
2. **Vanilla Rooms vs Community Hermes:** Keep classic Rooms for DMs/page chat and add a separate type, or migrate all "community" use cases to Hermes?
3. **Agent tab on Canopi:** Replace Canopi `/api/agent` LLM with DP Hermes for DP embed instances, or keep separate "page Q&A" vs "Community Hermes"?
4. **Entry URL:** Prefer **query param on publisher site** (Phase 1) or **first-party Canopi room URL** (Phase 4) as the canonical share link?
5. **Meta-domain:** Is meta-domain a **marketing entry** that resolves to a normal HTTPS URL, or a distinct host that must be proxied?
6. **Proxy scope:** Is full-page proxy in scope, or is "embed on the real page" sufficient for all target properties (DP, book, Gov Hub)?
7. **Public discover:** Should community Hermes rooms appear in Canopi **Rooms discover** (`GET /v1/rooms/discover`) or invite-only?
8. **Workgroup linkage:** Should a community room optionally reference a workgroup slug (badge + link) like `/agent` sidebar origin UX?
9. **Mobile:** Is floating Hermes **required** for MVP, or acceptable to defer mobile community rooms?
10. **Timeline vs Rooms:** Any overlap with timeline.canopi.live "room-scoped" timelines spec, or explicitly separate?

---

## Not dreaming: what is real vs what needs building

### Real today (you can demo pieces)

- **Canopi Rooms** work in the extension/embed sidebar: create, join, page-scoped chat, attachments, in-place page navigation from messages.
- **Canopi web embed** on DP with auth bridge and Discuss auto-open.
- **DP `/agent` Hermes** with full sidebar, Community Chat create/share UI (partial MVP), Neo4j group thread backend foundations.
- **Embed Hermes assist/agent** endpoints for Discuss (stateless or memory-backed via proxy).
- **Page id binding** patterns between DP and Canopi (`canopiPageIdFromUrl`, community id constant).

### Not real yet (the dream part)

- **Hermes inside Canopi Rooms UI** (any form factor).
- **Community room URL** that loads arbitrary page + opens Rooms + Hermes together.
- **Single linked model** between Supabase `rooms.id` and Neo4j `HermesThread.id`.
- **Proxy page shell** as a Canopi product route.
- **PiP / floating Hermes** panel.
- **Meta-domain auto-binding** without admin/registry configuration.

### Honest feasibility assessment

**You are not dreaming about the destination.** The estate already treats page-bound social layers (Discuss, Rooms, Visibility) and DP Community Chat (Hermes groups) as complementary ideas. The `/agent` sidebar UX is implemented and reusable in principle (`compact` prop, share wizard, thread_kind group).

**The integration is substantial, not fantasy.** Expect **multi-repo work** (canopi + challenge-site + neo4j-knowledge-graph), **new embed-safe Hermes UI**, and **auth unification**. A focused POC (Phase 1) is **weeks**, not days; a solid community room type (Phase 2) is **roughly 4–8 weeks** after Community Chat MVP stabilizes, plus UI iteration for sidebar constraints.

**Highest-risk bets:** iframe embedding `/agent`, proxying third-party pages, and running two chat backends in one room without a clear source of truth.

**Lowest-risk path:** Finish Community Chat on `/agent`, then embed a **dedicated compact Hermes route** inside Canopi Rooms on DP origins only, with explicit `hermes_thread_id` on the room row and query-param deep links before building share.canopi-style landing pages.

---

## Investigation references (code)

| Area | Path |
|------|------|
| Canopi Rooms UI | `canopi/presence/src/features/RoomsModule.ts` |
| Canopi Rooms API | `canopi/routes/rooms.js`, `canopi/services/roomsService.js` |
| Canopi embed loader | `canopi/public/embed/v1.js`, `canopi/public/embed/embed-sidepanel.html` |
| Canopi Agent (LLM) | `canopi/presence/src/features/AgentModule.ts`, `canopi/app.js` `/api/agent` |
| DP Discuss embed | `challenge-site/src/components/canopi/CanopiWebEmbed.tsx` |
| Embed session auth | `challenge-site/src/app/api/auth/canopi/embed-session/route.ts` |
| Embed Hermes proxy | `challenge-site/src/app/api/embed/hermes/agent/route.ts`, `src/lib/embed-hermes-assist.ts` |
| Full Hermes UI | `challenge-site/src/components/HermesChat.tsx`, `HermesThreadSidebar.tsx` |
| Community Chat scope | `challenge-site/docs/HERMES-GROUP-CHAT-SCOPE.md` |
| Page id helpers | `challenge-site/src/lib/dp-canopi-chapters.ts`, `canopi-embed.ts` |
| Registry | `meta-console/registry.yaml` (`canopi`, `desirable-properties`) |
