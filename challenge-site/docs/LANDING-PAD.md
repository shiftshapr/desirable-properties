# Landing pad vs landing page

A **landing page** is usually a one-way brochure: read the pitch, click the CTA, leave.

A **landing pad** is built for dialogue. Over time it can learn from a visitor's choices and submissions, suggest how their perspective might be read, and invite them to refine that capture until it reflects what they actually mean.

## How learning works (product-honest)

- **Learn** means session memory, confirms, and chosen sources, not silent profiling.
- **Suppositions** are working hypotheses until the visitor confirms sources, mappings, or text.
- **Refine** means correct us, add sources, patch text, or update consent.

Visitors stay in control. Nothing inferred from public corpus alone becomes fact until they confirm or edit it.

## Where this shows up in DP Studio

| Surface | URL pattern | Notes |
| --- | --- | --- |
| Pad index | `/pad` | Org lookup, person pad creation, directory |
| Org pad | `/pad/{slug}` | Public corpus briefing, Desirable Properties invite, Community Chat |
| Person pad | `/pad/person/{slug}` | Profile links, chosen sources, perspectives |

Implementation and ops detail: [`docs/HERMES-ONBOARDING.md`](HERMES-ONBOARDING.md).

## Short copy blocks

**UI (one line):** Landing pads learn from your choices (with consent), suggest how your perspective might be read, and let you refine how you are captured.

**Docs / email (paragraph):** Unlike a landing page, a landing pad is built for dialogue. Over time it can learn from a visitor's choices and submissions, suggest how their perspective might be read, and invite them to refine that capture until it reflects what they actually mean.
