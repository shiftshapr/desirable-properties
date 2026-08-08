# Canopi web-embed — Fork in the Web Perspective

The challenge-site loads Canopi Discuss on:

`https://desirableproperties.org/perspectives/the-fork-in-the-web`

(staging: `https://staging.desirableproperties.org/perspectives/the-fork-in-the-web`)

**Embed instance ID:** `7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c`  
**Community:** DP Challenge (`c0f30bc5-de17-4328-80d9-ff8f364907da`)

Configure the instance in **canopi.live admin** (not via SQL). Until the steps below are done, the page loads the embed script but the trigger/sidebar will not appear.

---

## 1. Open the embed instance

1. Sign in at [canopi.live](https://canopi.live) (or your Canopi admin URL).
2. Go to **Web embeds** / **Embed instances** (or **Settings → Embeds**).
3. Open **Desirable Properties book** — ID `7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c`.

---

## 2. Domain whitelist

Under **Allowed domains** (domain whitelist), ensure these hosts are present:

| Domain | Purpose |
|--------|---------|
| `desirableproperties.org` | Production challenge-site |
| `www.desirableproperties.org` | Production www |
| `staging.desirableproperties.org` | Staging challenge-site |
| `book.desirableproperties.org` | Book reader (existing) |
| `staging.book.desirableproperties.org` | Staging book (existing) |
| `book.themetalayer.org` | Legacy book host (existing) |

Add **`staging.desirableproperties.org`** if it is missing.

---

## 3. Page targeting (exception rules)

The instance uses **disable all pages except listed rules** (same as the book).

Under **Page targeting** → **Exception rules**, add:

```
/perspectives/the-fork-in-the-web
```

Optional (if you add more Perspectives later):

```
/perspectives/*
```

Keep existing book rules:

```
/viewer/*
/viewer.htm
```

**Do not** remove book rules when adding the perspective rule.

---

## 4. Welcome copy (optional)

Suggested tweaks for Perspective visitors:

| Field | Suggested text |
|-------|----------------|
| **Welcome title** | `Discuss this Perspective` |
| **Welcome message** | `Welcome! Share reactions to *The Fork in the Web* and how it connects to the Desirable Properties Challenge.` |

Book chapter pages can keep the existing DP workgroup welcome if the UI supports per-rule welcome (otherwise one shared welcome is fine).

---

## 5. Verify

After saving in canopi.live:

1. Open  
   `https://staging.desirableproperties.org/perspectives/the-fork-in-the-web`
2. Confirm the **Join the discussion** trigger (bottom-right) appears within a few seconds.
3. Click it — Canopi Discuss sidebar should open for this page.
4. Test auto-open:  
   `…/perspectives/the-fork-in-the-web?discuss=1`  
   Sidebar should open on load (after embed ready).
5. Post a test comment; confirm it appears under the page context for  
   `https://desirableproperties.org/perspectives/the-fork-in-the-web`  
   (staging uses prod page URL for thread identity).

---

## Code reference (repo mirror)

| Piece | Path |
|-------|------|
| Bridge + v1 loader | `challenge-site/public/assets/dp-canopi-bridge.js` |
| React loader | `challenge-site/src/components/canopi/CanopiWebEmbed.tsx` |
| Perspective page | `challenge-site/src/app/perspectives/the-fork-in-the-web/page.tsx` |
| Config mirror | `desirableproperties-book/json/canopi-embed.json` |
| Book bridge (reference) | `desirableproperties-book/assets/dp-canopi-bridge.js` |

---

## Auth note

Discuss sign-in uses Canopi’s embed Web3Auth popup (same as the book). Challenge-site session cookies are not automatically synced to the embed in v1; users sign in via the sidebar if needed.

---

## Related

- Book embed architecture: `docs/BOOK-DISCUSS-EMBED.md`
- Staging book whitelist: `desirableproperties-book/STAGING.md`
