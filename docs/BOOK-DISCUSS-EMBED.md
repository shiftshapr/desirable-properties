# Book Discuss embed — architecture & Hermes boundary

How chapter conversation works on `book.desirableproperties.org` via Canopi web-embed, and what would be required to bring **Hermes** (DP Community AI) into the sidebar later.

## Current model (ship now)

### User journeys

| Journey | Entry | Opens |
|---------|--------|--------|
| **Discuss on chapter** | Challenge-site “Discuss & Patch”, workgroup collab, activity feed, DP detail | Book viewer + Canopi **Discuss** tab |
| **Patch draft text** | Gov Hub links / “Patch on Gov Hub” | Gov Hub draft editor (not Canopi) |
| **DP Community AI** | `/agent` on challenge-site | Hermes chat (Gov Hub `/api/dp/chat`) |

Book conversation is **social/contextual** — messages anchored to the chapter page in Canopi. Hermes is **AI advisory** — threads, community notes, proposals, teaching loop on the challenge-site.

### Auto-open Discuss (`?discuss=1`)

Challenge-site links that intend “open the conversation” use `bookDiscussHref()` → URLs like:

```text
https://book.desirableproperties.org/viewer/dp07?discuss=1
https://staging.book.desirableproperties.org/viewer/dp07?discuss=1
```

**Book bridge** (`desirableproperties-book/assets/dp-canopi-bridge.js`):

1. Loads before `embed/v1.js` (see `viewer.htm`).
2. On load, if `discuss=1` in the query string, waits for `canopi:embed-ready`.
3. Calls `CanopiEmbed.openSidebar({ pageUrl: dpChapterPageUrl(pathname) })`.
4. Staging uses `pageUrlOrigin: https://book.desirableproperties.org` so Canopi pageIds match prod.

Plain book links (TOC, “read cover”) **do not** append `discuss=1` — sidebar stays collapsed until the reader clicks Go Meta.

### Embed instance

- UUID: `7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c`
- Community: DP Challenge (`canopi/migrations/023_dp_book_embed.sql`)
- Page rules: `/viewer/*`
- Primary tab: **Discuss** (workgroup/public threads on the page)
- Auth: Web3Auth via Canopi embed chrome (shared with other embed sites)

### Code map

| Area | Path |
|------|------|
| Bridge + auto-open | `desirableproperties-book/assets/dp-canopi-bridge.js` |
| Discuss URLs | `challenge-site/src/lib/govhub.ts` → `bookDiscussHref()` |
| Discuss & Patch UI | `DiscussPatchLink`, `WorkgroupGettingStarted`, `siteNav` |
| Canopi SDK | `canopi/public/embed/v1.js` (`openSidebar`, `openOnLoad`, `canopi:embed-ready`) |

---

## Why not Hermes in embed today

Canopi embed public config (`GET /api/embeds/config/:id`) exposes page targeting, trigger UI, tabs, welcome message, etc. It does **not** expose:

- Custom agent / system prompt (Hermes playbook)
- Gov Hub chat proxy or thread storage
- DP focus, community notes, or teaching admin flows

Canopi **Agent tab** (optional via `tab_configuration`) calls Canopi `/api/agent` with a **generic** page-grounded prompt — not Hermes.

Hermes stack:

```text
HermesChat → /api/agent/chat (challenge-site)
           → Gov Hub /api/dp/chat
           → playbook, RAG, threads, contribution hints
```

That stack is separate from Canopi Discuss message APIs.

---

## Future: “Hermes-in-embed” (dedicated project)

If the product goal is *Hermes inside the book sidebar* (not just Discuss), treat it as a bounded integration — not an embed JSON toggle.

### Option A — Deep link (smallest)

- Embed Discuss tab unchanged.
- Add “Ask Hermes about this chapter” → opens `desirableproperties.org/agent?dp=N` in new tab or slide-over.
- Reuses existing auth and threads; no iframe/CSP work.

### Option B — Custom tab in embed (full)

| Workstream | Scope |
|------------|--------|
| **Tab** | New embed tab or replace Agent tab; `tab_configuration` on DP book instance |
| **UI** | Slim Hermes composer + thread list in iframe or embed-sidepanel module |
| **Auth** | Unify Web3Auth session: book embed ↔ challenge-site ↔ Gov Hub (`dp-canopi-bridge` + host auth sync) |
| **API** | Proxy `POST /api/dp/chat` from book origin or Canopi sidebar origin; CORS + CSP for staging book host |
| **Context** | Pass `dpFocus` from viewer pathname (`/viewer/dp07` → `7`) and optional passage selection |
| **Parity** | Community notes, teach flow, contribution CTAs — or explicitly defer v1 |

### Option C — Canopi platform agent profile (medium, incomplete)

- Extend embed instance with `agentProfileId` or community-scoped prompt.
- Route Agent tab to Gov Hub Hermes instead of generic `/api/agent`.
- Still missing Hermes-specific UX (threads, notes) unless built in Canopi.

**Recommendation:** Ship **Discuss + `?discuss=1`** for chapter conversation. Keep Hermes on `/agent`. Revisit Option B only if users need AI *without leaving the book*.

---

## Verification

```bash
# Staging book — Discuss auto-open
open 'https://staging.book.desirableproperties.org/viewer/dp01?discuss=1'
# Expect: Canopi sidebar open on Discuss tab within ~2s of load (desktop push layout).

# Challenge-site link shape
grep -r bookDiscussHref challenge-site/src
```

Manual: from staging collab “Discuss & patch this chapter →”, confirm landing URL contains `discuss=1` and sidebar opens without clicking Go Meta.

---

## Related

- Book deploy: `desirableproperties-book/scripts/deploy-staging-book.sh`
- Staging whitelist: `desirableproperties-book/STAGING.md`
- Collab (workgroup chat): Gov Hub messages API on challenge-site — separate from book Canopi Discuss
