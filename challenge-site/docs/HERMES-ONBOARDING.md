# Hermes On pages (`/on/{slug}`)

Living org briefings at `{estate-property}/on/{slug}` (first property: desirableproperties.org).

## URLs

- Index: `/on`
- Member: `/on/project-liberty` (default tab is admin-chosen)
- Explicit tab: `/on/project-liberty?tab=dp`

Old `/onboard` and `/onboard/alliance/{slug}` redirect to `/on`.

## Default tab

Precedence: `?tab=` in the URL, then site setting, then env `DP_ON_DEFAULT_TAB`, then `dp`.

- DP site admin: `/admin` → Site admin → `/on default tab`
- Estate default in `meta-console/registry.yaml` (`desirable-properties.hermes_on.default_tab`)
- PM2/env: `DP_ON_DEFAULT_TAB=dp` (used until an admin save exists)

## PLA email

https://desirableproperties.org/on/[slug]

Add `?tab=dp` only when you want to force that tab regardless of the current default.

## Tests

```bash
npm run test:hermes-onboard
```
