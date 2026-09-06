# Web embed — in-page presence scope

Product and engineering scope for **on-page co-presence** on publisher sites via the Canopi web embed: a lightweight, always-visible signal on the host page (e.g. “3 people here”) that works **without opening the Canopi sidebar** — similar to Google Docs’ top collaborator strip.

**Status:** Design / scope only — not implemented.

**Canonical home:** `canopi/docs/WEB-EMBED-PRESENCE-SCOPE.md` (Canopi product repo). A copy may live in integration repos (e.g. desirable-properties) for cross-team reference.

**Related:** `docs/BOOK-DISCUSS-EMBED.md`, `challenge-site/docs/CANOPI-ROOMS-COMMUNITY-CHAT-SCOPE.md`, `docs/meta_layer_rag.md` (On-Page Presence primitive), DP2 (visibility agency).

---

## What you are describing (plain language)

A visitor lands on a **publisher page** (e.g. a Desirable Properties perspective or book chapter). They should be able to see **who else is on the page** — or at least that others are present — **without opening the Canopi extension or sidebar**.

Examples:

- A strip at the top of the page showing avatars of active visitors (Google Docs style)
- A count badge: “3 people reading this”
- Optional room/status badges: “2 in Community Room”

This is **ambient presence**, distinct from Discuss (async comments) and Rooms (chat). Presence is ephemeral session state keyed to the same `page_id` Discuss and Rooms already use.

---

## Current state

### Canopi web embed today

| Layer | What exists |
|-------|-------------|
| **Embed loader** | `canopi/public/embed/v1.js` |
| **Sidebar iframe** | `embed-sidepanel.html` (Discuss, Rooms, Agent tabs when enabled) |
| **Host DOM** | `#canopi-overlay-root` — trigger + sidebar only |
| **Page identity** | `page_id` = normalized host + pathname; `pageUrl`, `communityId` |
| **Client SDK** | `CanopiEmbed.setAuth()`, `CanopiEmbed.openSidebar({ pageUrl })` |
| **Lifecycle events** | `canopi:embed-ready`, `canopi:embed-sidebar-open`, `canopi:embed-sidebar-closed` |
| **Host auth bridge** | Publisher route mints embed JWT → `setAuth()` (e.g. DP `/api/auth/canopi/embed-session`) |
| **Cross-service verify** | `POST /v1/internal/metaweb/verify-embed-token` |
| **On-page presence strip** | **Not built** |

All social UI lives **inside the sidebar iframe**. The host page has no awareness of live visitors unless the reader opens Canopi.

### Meta-Layer product vocabulary

| Term | Meaning in this scope |
|------|------------------------|
| **On-Page Presence** | Visibility of others on the same page (`docs/meta_layer_rag.md`) |
| **Visibility tab** | Referenced as a future complementary sidebar tab alongside Discuss and Rooms — settings/home for presence preferences; not implemented |
| **Web embed** | Delivery mode via `embed/v1.js` on publisher origin (vs browser extension) |

Sites are **not proxied** by Canopi today; embed runs on the **real page origin** with canonical `pageUrl` rules for thread identity.

---

## Gap analysis

| Vision | Gap |
|--------|-----|
| See who’s on the page without sidebar open | No host-page presence UI |
| Easy integration for underlying sites | No presence methods/events on `CanopiEmbed` |
| REST for SSR or custom host UI | No page-scoped presence API |
| Real-time updates | No WebSocket channel exposed (or SDK-mediated) |
| Privacy / opt-in visibility | DP2 specifies per-zone controls; no runtime implementation |
| Default strip UI | No injectable strip component in `v1.js` |
| Cloud page shells (`app.canopi.live/r/…`) | Future; strip easier in Canopi chrome, harder for iframe-only targets |

**Bottom line:** Page-scoped **conversation** exists (Discuss, Rooms). Page-scoped **co-presence** does not.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│  Presence strip (host DOM, optional)          ← NEW       │
│  [avatar][avatar][avatar]  +2                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Publisher page content (real DOM, real URL)            │
│                                                         │
│                                    [Canopi trigger] ────┤  ← existing
└─────────────────────────────────────────────────────────┘
         │                              │
         └──────── page_id / pageUrl ───┘
                    ↓
         api.canopi.live (presence service)  ← NEW
                    ↓
         Redis / ephemeral store + WS fan-out
```

Presence must be **decoupled from sidebar open state**. Strip mounts at embed-ready (when enabled), not sidebar-open.

---

## What to build (four layers)

### 1. Presence backend (Canopi API)

Page-scoped presence service keyed by `(community_id, page_id)`:

| Capability | Detail |
|------------|--------|
| **Heartbeat / join / leave** | On embed boot; re-bind on SPA `updatePageContext()` |
| **Real-time fan-out** | WebSocket or SSE per `page_id` channel |
| **Session record** | `user_id`, display name/avatar, optional status, `last_seen` |
| **Privacy policy** | Per embed instance: public strip vs community-only vs signed-in only |
| **Aggregation** | Count + viewer list; optional `activeRoomId` badge |
| **Storage** | Ephemeral (Redis or similar) — not Postgres Discuss/Rooms tables |
| **TTL** | ~30–60s heartbeat; auto-expire stale sessions |
| **Failure domain** | Separate SLO from Discuss/Rooms — presence outage must not take down chat |

### 2. Host-page UI in embed SDK

**Optional default strip** (convenience path):

- `CanopiEmbed.renderPresenceStrip({ target, theme })` or `data-canopi-presence-strip="top"`
- Variants: top bar, corner pill, count-only badge
- Respects push vs overlay layout and host z-index contracts (see DP `dp-canopi-bridge.js`, `dp-header-above-canopi`)

**Host-controlled UI** (recommended default when enabling presence):

- SDK exposes data via `getPagePresence()` and `onPagePresence()`; host renders in their header

### 3. Host-site integration hooks

| Hook | Purpose |
|------|---------|
| `data-canopi-presence="true"` | Opt-in declarative enablement |
| `data-canopi-presence-strip="top"` | Opt-in auto-mount strip |
| `#canopi-presence-slot` | Host-declared mount point inside site header |
| `canopi:presence-update` | DOM event for custom UI |
| `updatePageContext({ pageUrl })` | Existing call; presence subscribes to page context changes |
| Auth reuse | Same embed JWT from host `embed-session` route |

Minimal host change (when strip auto-mount is configured):

```html
<script src="https://api.canopi.live/embed/v1.js"
        data-canopi-id="…"
        data-canopi-auth-session="/api/auth/canopi/embed-session"
        data-canopi-presence="true"
        async></script>
```

### 4. Privacy and agency (DP2)

Presence is not only UI — participants must **sculpt visibility**:

| Control | Options |
|---------|---------|
| **Per-session** | `visible` / `count_only` / `hidden` |
| **Per-embed defaults** | Embed instance config |
| **Persistent user defaults** | Canopi app settings |
| **Enforcement** | Server-side filtering before REST/WS/SDK responses — never trust client to redact |
| **Trust tier** | DP1: verified humans in named strip; bots excluded or labeled |

---

## Exposing presence via API to web embed host pages

Three tiers, mirroring existing embed patterns (`openSidebar`, `embed-session`, `verify-embed-token`).

### Tier 1: Client SDK API (`CanopiEmbed.*` on host page)

Primary integration surface for publisher sites.

**Read**

```javascript
const presence = await CanopiEmbed.getPagePresence();
// → { pageId, count, viewers: PresenceUser[], updatedAt, available: boolean }

const off = CanopiEmbed.onPagePresence((presence) => { /* … */ });

const mine = CanopiEmbed.getMyPresenceVisibility();
// → 'visible' | 'count_only' | 'hidden'
```

**Write**

```javascript
CanopiEmbed.updatePageContext({ pageUrl }); // existing — presence re-binds on this

CanopiEmbed.setMyPresenceVisibility('count_only');
CanopiEmbed.setMyPresenceStatus({ state: 'viewing', label: 'Reading §4' });
```

**UI helpers (optional)**

```javascript
CanopiEmbed.renderPresenceStrip({ target: '#site-header', theme: 'dark' });
CanopiEmbed.destroyPresenceStrip();
```

**Events**

```javascript
window.addEventListener('canopi:presence-update', (e) => { /* … */ });
window.addEventListener('canopi:presence-user-joined', …);
window.addEventListener('canopi:presence-user-left', …);
window.addEventListener('canopi:presence-unavailable', …); // debug only; non-fatal
```

**Design rule:** one WebSocket per embed instance, owned inside `v1.js`. Hosts subscribe via SDK methods — not raw WS — unless an explicit escape hatch is added later.

### Tier 2: REST API (`api.canopi.live`)

For host server-side rendering, edge middleware, or HTTP-preferring custom UI.

**Anonymous / aggregate (embed-scoped)**

```http
GET /v1/presence/pages/{pageId}?embedId={uuid}
```

Returns count only when embed config allows. Gated by domain whitelist + embed instance.

**Authenticated (embed JWT)**

```http
GET  /v1/presence/pages/{pageId}/viewers
POST /v1/presence/pages/{pageId}/heartbeat
POST /v1/presence/me/visibility
```

Headers (same pattern as Hermes embed routes):

```http
Authorization: Bearer <embedToken>
X-User-Id: <uuid>
X-Canopi-Display-Name: <optional>
```

Reuse `POST /v1/internal/metaweb/verify-embed-token` for host-origin proxy routes.

**Embed config extension**

Extend `GET /api/embeds/config/:id`:

```json
{
  "presence": {
    "enabled": false,
    "defaultVisibility": "community",
    "hostApiAccess": "aggregate_only",
    "strip": { "position": "top", "maxAvatars": 5, "autoMount": false }
  }
}
```

### Tier 3: Realtime (SDK-internal)

```
WSS /v1/presence/subscribe?pageId=…&embedId=…&token=…
```

Message types: `snapshot`, `join`, `leave`, `update`, `count`.

Not exposed directly to host pages in MVP. SDK mediates via `onPagePresence()`.

### Auth and privacy contract (API-visible)

| Viewer state | `GET viewers` | Aggregate endpoint | `getPagePresence()` |
|--------------|---------------|--------------------|---------------------|
| Anonymous | 401 or empty | `{ count: N }` only | count only |
| Signed in, visible | filtered list | config-dependent | avatars + names |
| Signed in, hidden | excluded | count policy per config | self only |

---

## Stability — doing this without destabilizing the web embed

Presence **can** destabilize the embed if wired into core init. It **does not have to** if treated as an optional, failure-isolated module — same pattern as adding the Rooms tab without breaking Discuss.

### What “destabilize” means

| Failure mode | Impact |
|--------------|--------|
| Presence blocks `canopi:embed-ready` | Discuss/Rooms never boot |
| Presence auth failure breaks `setAuth()` | Whole embed broken |
| Bundle bloat in `v1.js` | Every embed host pays load cost |
| Auto strip layout conflicts | Host header / push sidebar regressions |
| Always-on WS on all instances | Unwanted traffic on Discuss-only sites |

### Safe architecture principles

#### 1. Opt-in only, config-gated

**Off by default** on every embed instance. Existing script tags unchanged until admin enables presence or host adds `data-canopi-presence="true"`.

#### 2. Lazy load — separate chunk, separate lifecycle

```
v1.js (core — unchanged contract)
  ├── boot overlay + sidebar
  ├── fire canopi:embed-ready          ← must always succeed first
  └── IF config.presence.enabled:
        dynamic import('./presence.js')
        └── connect WS, mount strip, expose API
```

If `presence.js` fails: Discuss still works. Presence fails silently; optional `canopi:presence-unavailable` for debugging.

#### 3. Failure isolation (circuit breaker)

| Failure | Behavior |
|---------|----------|
| WS disconnect | Backoff reconnect; strip shows stale count or hides |
| Heartbeat 5xx/429 | Pause retries; embed unaffected |
| Auth missing | Anonymous aggregate mode only |
| CSP blocks WS | Presence disabled; embed unaffected |
| Strip mount fails | No strip; `getPagePresence()` returns `{ available: false }` |

**Rule:** presence is **best-effort ambient state**, not a prerequisite for conversation.

#### 4. Additive API only — no breaking changes

Existing methods and events remain semver-stable. Presence adds new surface under an optional module flag.

`updatePageContext()` stays owned by core page-id logic. Presence listens to an internal `canopi:page-context-changed` event — does not re-implement URL normalization.

#### 5. Host UI host-controlled by default

- **Default when enabled:** SDK exposes data; host renders if desired
- **Opt-in strip:** `data-canopi-presence-strip="top"` or `presence.strip.autoMount: true`

API-first rollout reduces layout risk on sites with delicate header stacking (DP book, challenge-site).

#### 6. Separate backend, separate SLO

Presence on ephemeral store + dedicated WS namespace. Outage must not affect `v1/rooms` or Discuss.

#### 7. Versioned contract

| Surface | Stability |
|---------|-----------|
| **Core embed (v1)** | `embed-ready`, `openSidebar`, `setAuth` — breaking changes require major version |
| **Presence module** | Beta flag; can iterate independently |

### Compatibility matrix

| Concern | Safe approach |
|---------|---------------|
| Sites without presence config | Zero new code path; identical to today |
| Book bridge (`dp-canopi-bridge.js`) | Unchanged unless host opts in |
| Auth bridge (`embed-session`) | Same JWT; presence optional consumer |
| Deep links (`?discuss=1`, `?canopiRoom=`) | Unchanged |
| Push vs overlay layout | Strip uses host slot or respects z-index contract |
| Trigger gating | Independent of presence |
| Staging `pageUrlOrigin` parity | Reuses core `page_id` |

---

## Relationship to existing Canopi tabs

| Tab | Relationship |
|-----|--------------|
| **Discuss** | Same `page_id`; strip click may call `openSidebar({ tab: 'discuss' })` |
| **Rooms** | Optional `viewers[].activeRoomId`; click → `openSidebar({ tab: 'rooms', roomId })` |
| **Visibility** | Settings UI for defaults; presence API is runtime read/write |
| **Agent** | Independent |

---

## Cloud pages vs publisher-origin pages

| Surface | Presence implication |
|---------|---------------------|
| **Publisher origin** | Strip injects into host DOM; `page_id` from canonical URL |
| **Canopi cloud shell** (`app.canopi.live/r/{roomId}?page=…`) | Strip in Canopi chrome; target page may be iframed |
| **Extension** | Same SDK contract for parity with web embed |

---

## Phased roadmap

### Phase 1 — Backend + SDK read API (MVP)

- [ ] Ephemeral presence store + heartbeat
- [ ] Embed config `presence.enabled` (default `false`)
- [ ] Lazy-loaded `presence.js` module
- [ ] `getPagePresence()`, `onPagePresence()`, `canopi:presence-update`
- [ ] Authenticated viewer list + anonymous aggregate REST
- [ ] Failure isolation verified on staging embed instance

**Success:** Staging page with presence enabled shows live count; Discuss/Rooms/auth unchanged on presence-disabled instances.

### Phase 2 — Host integration + write API

- [ ] `setMyPresenceVisibility()`, `setMyPresenceStatus()`
- [ ] SSR aggregate proxy pattern documented (like `embed-session`)
- [ ] `renderPresenceStrip()` opt-in helper
- [ ] DP staging opt-in on one test page

### Phase 3 — Rich presence + cloud shells

- [ ] Room/status badges in payload
- [ ] Persistent user visibility defaults in Canopi app
- [ ] Click handlers → sidebar navigation
- [ ] Cloud page shell strip in Canopi chrome

---

## Open questions

1. **Anonymous count policy:** Do hidden users increment the public count?
2. **Idle vs active:** Show “viewing” vs “away” after N minutes?
3. **Cross-page presence:** Same community, different pages — ever aggregate?
4. **Rate limits:** Per embed instance vs per IP for anonymous aggregate?
5. **Extension parity timeline:** Ship web embed first or simultaneously?

---

## Code map (Canopi product repo)

| Area | Path |
|------|------|
| Embed loader | `canopi/public/embed/v1.js` |
| Presence module (new) | `canopi/public/embed/presence.js` (proposed) |
| Sidepanel / tabs | `canopi/presence/src/features/` |
| Embed config API | embed instance admin + `GET /api/embeds/config/:id` |
| Presence API (new) | `canopi/routes/presence.js` (proposed) |
| DP integration reference | `desirableproperties-book/assets/dp-canopi-bridge.js`, `challenge-site/src/components/canopi/CanopiWebEmbed.tsx` |

---

## Summary

To make in-page presence easy for web embed host pages:

1. **Backend:** ephemeral page presence + realtime, scoped by `page_id`, separate failure domain
2. **SDK:** lazy-loaded optional module with read/subscribe/write methods and DOM events
3. **REST:** aggregate + authenticated endpoints; reuse embed JWT verification
4. **Config:** opt-in per embed instance; off by default
5. **Stability:** core embed reaches `canopi:embed-ready` before presence starts; presence fails silently
6. **Privacy:** server-enforced visibility rules (DP2)

Publisher sites that never enable presence behave exactly as they do today.
