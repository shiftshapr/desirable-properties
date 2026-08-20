# DP Studio landing pads (`/pad/{slug}`)

Org landing pads in **Desirable Properties Studio** at `{estate-property}/pad/{slug}` (first property: desirableproperties.org).

The Desirable Properties Challenge is the ongoing program. DP Studio is the tooling (landing pads, Hermes, workgroups, patches). Studio is in **public beta** now; **Version 1.0** of *The Layered Web* and the public Studio launch are **September 16, 2026**.

## URLs

- Index: `/pad` (org lookup form + directory list)
- Member: `/pad/project-liberty` (default tab is admin-chosen)
- Dashless alias: `/pad/projectliberty` (308 redirect to canonical slug; hyphen-insensitive lookup)
- Explicit tab: `/pad/project-liberty?tab=dp`

Visitors can enter an org website, name, or slug on `/pad` to resolve to the right landing pad. Switch to **Person** on the same form to create a person pad from LinkedIn, CV, work links, and perspectives.

Lookup order: full directory pads (3 orgs today) → prework roster (`alliance-roster.json`, ~200 PLA members from [projectliberty.io/alliance](https://www.projectliberty.io/alliance/)) → dynamic request page for any other valid website domain.

Person pads live at `/pad/person/{slug}` (slug from LinkedIn handle, CV path, or normalized name). POST `/api/pad/person` to create; GET `/api/pad/person/{slug}` to fetch.

## PLA list email

Use this body for the generic Project Liberty Alliance list send. Replace `{estate-property}` with the live host (first property: `desirableproperties.org`).

```text
Subject: Your DP Studio landing pad – review before September 16

We opened org landing pads in Desirable Properties Studio (public beta). Each pad starts from your public corpus and asks whether we heard your concerns correctly. Version 0.77 is open for review now; Version 1.0 of The Layered Web and the public Studio launch are September 16, 2026.

Find your pad at https://{estate-property}/pad or go directly:

• Project Liberty – https://{estate-property}/pad/project-liberty
• Project Liberty Institute – https://{estate-property}/pad/project-liberty-institute
• Project Liberty Labs – https://{estate-property}/pad/project-liberty-labs

You can also bookmark `/pad/your-org-name` (hyphens optional, e.g. `/pad/projectliberty`). Add `?tab=dp` only when you want to force the Desirable Properties tab regardless of the current default.
```

Only three orgs have full pads in `alliance-directory.json`. Roster-only matches open a stub page at `/pad/{slug}` until the org claims and completes their packet. Re-import roster: `node scripts/import-pla-alliance-roster.mjs`.

## Default tab

Precedence: `?tab=` in the URL, then site setting, then env `DP_ON_DEFAULT_TAB`, then `dp`.

- DP site admin: `/admin` → Site admin → `/pad default tab`
- Estate default in `meta-console/registry.yaml` (`desirable-properties.hermes_on.default_tab`)
- PM2/env: `DP_ON_DEFAULT_TAB=dp` (used until an admin save exists)

Legacy `/on`, `/onboard`, and `/onboard/alliance/{slug}` redirect to `/pad`.

## Pad lookup

Resolver: `src/lib/hermes-onboard/pad-lookup.mjs` (`resolvePadLookup`, `resolvePadSlugFromInput`), wrapped by `pad-lookup.ts`. Returns `{ status, slug, domain, name, href }` with status `found | roster | dynamic | not_found`.

Lookup order:

1. Directory slug, claim domain, or fuzzy name (`alliance-directory.json`)
2. Roster domain, slug, or fuzzy name (`alliance-roster.json`)
3. Dynamic stub for any other valid website URL (slug derived from domain label)

API: `GET /api/pad/resolve?input=` returns the same JSON shape.

UI: `src/components/onboard/PadOrgLookup.tsx` on `/pad` (Organization | Person tabs). Roster and dynamic org matches render `src/components/onboard/DynamicPadClient.tsx` on `/pad/[slug]`. Person pads render `src/components/onboard/PersonPadClient.tsx` on `/pad/person/[slug]`.

Person lookup: `src/lib/hermes-onboard/person-pad-lookup.mjs` (`slugFromLinkedInUrl`, `resolvePersonPadSlug`, `validatePersonPadCreateInput`). Candidate discovery: `src/lib/hermes-onboard/person-pad-discovery.mjs` (local corpus grep; Open Graph for public work URLs in `person-pad-discovery.ts`). Storage: `src/lib/hermes-onboard/person-pad-store.ts` (Postgres `hermes_person_pad` or `data/hermes-person-pad/{slug}.json`). Perspective URL parsing: `src/lib/hermes-onboard/person-perspectives.ts`.

### Person pad flow (MVP)

1. On `/pad` → **Person** tab: user enters LinkedIn URL (stored as slug only; never scraped), optional CV URL, name, org, work links, and optional pasted bio/profile text or uploaded papers.
2. **Find public work** calls `POST /api/pad/person/preview`. If LinkedIn is present without paste/upload, `DpDialog` explains the blocked read and invites paste.
3. Server returns up to 15 candidates from local corpus: perspectives index, PCI email authors (`pci-emails-corpus.json`), Alliance roster org match (optional org field), submitted work/perspective links, and Open Graph metadata for up to 4 public work URLs (LinkedIn excluded, 3.5s timeout each).
4. User checks items on the candidate step, then **Create my pad** posts to `POST /api/pad/person` with `bioText`, `profilePaste`, `selectedSources[]`, and uploads.
5. Pad renders at `/pad/person/{slug}` with bio excerpt, selected source cards, and empty states linking back to `/pad` for paste/upload.

This is not a score or ranking. The user chooses what we consider.

### LinkedIn (V2, not implemented)

LinkedIn OAuth (read profile with user consent) is planned for a later release. MVP uses URL slug only plus user-pasted export/bio text. Do not scrape LinkedIn.

Person API:

- `POST /api/pad/person/preview` – candidate discovery JSON body (`displayName`, `linkedinUrl`, `orgAffiliation`, `workLinks`, `perspectiveLinks`, `bioText`, `profilePaste`)
- `POST /api/pad/person` – JSON or `multipart/form-data` (papers field; optional `selectedSources` JSON string in form)
- `GET /api/pad/person/{slug}`
- `POST /api/pad/person/upload` – optional standalone doc upload

Discovery limits (MVP): no paid APIs; no LinkedIn fetch; local JSON indexes only; Open Graph best-effort on user-supplied public URLs.

Roster import: `scripts/import-pla-alliance-roster.mjs` → `src/data/alliance-roster.json`.

## Tests

```bash
npm run test:hermes-onboard
```

## Slug aliases (hyphens)

Canonical slugs live in `src/data/alliance-directory.json` (e.g. `project-liberty`). The app accepts dashless variants (`projectliberty`) via hyphen-insensitive lookup in `src/lib/hermes-onboard/directory.ts`. Session data is always keyed by the canonical slug.

NGINX can redirect known aliases, but generic hyphen stripping is awkward without `njs`/`lua` and duplicates `alliance-directory.json`. Prefer the app-layer lookup above.

Optional nginx patterns (not deployed; for reference only):

```nginx
# A) Permanent redirect for one known alias (simple, explicit)
location = /pad/projectliberty {
    return 301 /pad/project-liberty$is_args$args;
}

# B) map table when several aliases are known (still duplicates directory.json)
map $uri $pad_uri {
    default $uri;
    /pad/projectliberty /pad/project-liberty;
}
# then: if ($pad_uri != $uri) { return 301 https://desirableproperties.org$pad_uri$is_args$args; }
```
