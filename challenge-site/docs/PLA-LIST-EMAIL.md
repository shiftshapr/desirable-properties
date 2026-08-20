# Project Liberty Alliance list email

Generic send to the PLA list. Replace `{estate-property}` with the live host if not `desirableproperties.org`.

## Subject

Did we get your concerns right?

## Body (plain text)

```text
We opened org landing pads in Desirable Properties Studio (public beta). Each pad starts from your public corpus and asks whether we heard your concerns correctly. Unlike a landing page, a pad can learn from your choices (with consent) and invite you to refine how your perspective is captured. Follow an interest until it becomes a patch idea.

Version 0.77 of The Layered Web is open for review now. Version 1.0 and the public launch of DP Studio are September 16, 2026.

Find your pad at https://desirableproperties.org/pad (enter your org website, name, or slug). Three members have full briefing pads today; ~200 Alliance roster members get a reserved stub page; any other valid website opens a request page.

• Project Liberty – https://desirableproperties.org/pad/project-liberty
• Project Liberty Institute – https://desirableproperties.org/pad/project-liberty-institute
• Project Liberty Labs – https://desirableproperties.org/pad/project-liberty-labs

You can also bookmark https://desirableproperties.org/pad/your-org-name (hyphens optional, e.g. https://desirableproperties.org/pad/projectliberty). Add ?tab=dp only when you want to force the Desirable Properties tab regardless of the current default.

Only three Alliance members have full pads in this first packet. Roster matches (~200 orgs from the public alliance page) open a stub at `/pad/{slug}`. Any other website domain opens a request stub with `?domain=`.
```

## Body (HTML)

Use the hero image at the top:

- Image URL: `https://desirableproperties.org/media/be-part-of-1.0-hero.png`
- Alt text: Be part of 1.0 – Desirable Properties Studio public beta, September 16, 2026

Suggested structure:

1. Hero image linked to `https://desirableproperties.org/pad`
2. Plain-text paragraphs above (Studio beta, September 16, invitation to correct us)
3. Bulleted direct links for the three orgs
4. Footer note on `/pad/{your-org-name}` (hyphens optional)

## Footer direct links

| Organization | URL |
| --- | --- |
| Project Liberty | https://desirableproperties.org/pad/project-liberty |
| Project Liberty Institute | https://desirableproperties.org/pad/project-liberty-institute |
| Project Liberty Labs | https://desirableproperties.org/pad/project-liberty-labs |

Pad index (lookup form): https://desirableproperties.org/pad

## URL pattern

Each org has a stable direct link:

`https://desirableproperties.org/pad/{your-org-name}`

Hyphens are optional in the slug segment. Both `project-liberty` and `projectliberty` resolve to the Project Liberty pad (canonical slug uses hyphens; dashless URLs redirect).
