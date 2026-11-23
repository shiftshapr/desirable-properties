# META-LENS v0.1: Lens Specification

**Status:** Draft  
**Date:** 2026-11-22  
**Author:** Daveed Benjamin, Meta-Layer Initiative

## Purpose and scope

A lens is a portable, shareable configuration of the smart filter: the settings that decide how one person, community, org or enterprise sees the web through the meta-layer.

This spec defines a common lens format so that any layer can build, publish, fork and stack lenses, and so that a lens made in one overlay client works in another. It covers what a lens contains, how lenses combine, how they change over time, and what keeps them transparent and trustworthy.

Out of scope for v0.1: the ranking algorithms a client uses to apply a lens, user interface design, and payment or token mechanics.

## Core concepts

Six terms carry the whole spec.

| Term | Meaning |
| --- | --- |
| Lens | A named configuration of the smart filter: rules, preferences, examples and optional embeddings, plus metadata and provenance. |
| Layer | The kind of entity that publishes a lens: person, community, org or enterprise. Every layer uses the same format. |
| Stack | An ordered set of lenses applied together, for example enterprise, then community, then personal. |
| Screened-out view | An on-demand view of everything the active stack is hiding, with the reason and the responsible lens for each item. |
| Fork | A copy of a lens that the new holder owns and edits; it keeps a link to its parent. |
| Subscribe | Loading a lens by reference so the holder receives the publisher's updates. |

## Lens object structure

A lens has seven parts. Only metadata and provenance are required; a minimal lens can be a single mute rule.

| Part | Contents | Readable by humans | Default privacy |
| --- | --- | --- | --- |
| Metadata | id, name, description, publisher, layer type, version, created and updated dates, license | Yes | Public |
| Rules | Mutes (people, topics, sources, domains), gradient levels per content category, feed rules (boost, group, hold back) | Yes | Public |
| Preferences | Stated values and leanings in plain language or tags, such as "more local", "long-form over hot takes" | Yes | Public |
| Examples | Positive and negative exemplars: pages, posts or passages that capture the lens's taste | Yes | Choice of publisher |
| Embeddings | Optional vectors for taste (positive and negative centroids or clusters), each with model id, dimensions and creation date | No | Private |
| Privacy map | A privacy level per part: public, shared (named people or groups), or private | Yes | Public |
| Provenance | Publisher signature, parent lens (if forked), version history, change log | Yes | Public |

Two principles shape this structure:

- **Examples are the portable core of taste.** Embeddings only mean something to the model that made them. A receiving client can rebuild embeddings from the examples on its own model, so examples travel where vectors cannot.
- **Each part has its own privacy level.** A person can publish their rules and preferences while keeping their learned embeddings private.

## Stacking and precedence

The person has the final say over their own view, except in a context they knowingly entered, and even then every layer stays visible.

A typical stack applies from the outside in:

1. **Enterprise lens**: compliance, confidentiality, brand safety. Applies only on enterprise devices or accounts.
2. **Org lens**: team context, internal knowledge brought onto public pages.
3. **Community lens**: the shared taste and norms of each community the person belongs to. Several can be active at once.
4. **Personal lens**: the person's own rules, preferences and learned taste.
5. **Session lens** (optional): a temporary mode such as "focus" or "try on a friend's lens".

Precedence rules:

- **Default: the person wins.** When a personal rule conflicts with a community or org rule, the personal rule applies.
- **Binding lenses are declared, not hidden.** An enterprise or org can mark its lens as binding only within a scope the person accepted (a work account, a work device). The client must show that a binding lens is active.
- **Additive vs. subtractive.** Lenses that add context (annotations, knowledge) combine freely. Lenses that remove content follow the precedence above.
- **Exit.** Any non-binding lens can be switched off at any time, and the page can always be viewed without it.

## Sharing, forking, subscribing, versioning

A lens can be loaded in two ways, and the holder always knows which one they chose.

| Mode | What the holder gets | Who controls changes | Good for |
| --- | --- | --- | --- |
| Subscribe | A live reference to the publisher's lens | Publisher | Community and org lenses, trusted curators |
| Fork | An owned copy linked to its parent | Holder | Personal adaptation, experiments, remixing |

- **Versioning.** Every published change creates a new version with a change log. Subscribers can pin a version or follow the latest.
- **Update notices.** When a subscribed lens changes in a way that removes more content, the subscriber is notified before it takes effect.
- **Attribution.** Forks keep a parent chain, so a lens's lineage is always visible.
- **Export.** Sharing exports only the parts the privacy map allows. Private embeddings never leave with a shared lens.

## Adaptation with consent

A lens may learn, but it never changes itself without the holder's approval.

- **Drift proposals.** When browsing behavior suggests the lens should change, the client proposes the change in plain language: "your lens is leaning toward local food systems lately; keep it?" The holder accepts, rejects or edits.
- **Scope of learning.** The holder chooses which parts can adapt (for example, embeddings and gradients yes, mutes no).
- **Community lenses evolve by governance.** A community's examples and embeddings change through member contributions and an agreed proposal process, not through silent aggregation.
- **Rollback.** Any accepted change can be undone by returning to an earlier version.

## Transparency

Nothing a lens hides is hidden for good: the screened-out view is mandatory for any compliant client.

- **Per-layer attribution.** Each hidden item shows which lens hid it: "hidden by your org lens", "hidden by RegenWorld", "hidden by you".
- **Reasons.** Rules explain themselves ("muted source"). Embedding-based decisions give a readable reason drawn from examples or labeled clusters ("far from your regenerative economics cluster").
- **Boosts are visible too.** Items a lens promoted can be marked, so people see what was amplified as well as what was removed.
- **Lens inspector.** At any time the holder can see the active stack, each lens's version, and its publisher.

## Trust, security and privacy

Lenses shape what people see, so they need the same protections as code that runs on a person's behalf.

| Risk | Mitigation |
| --- | --- |
| A lens is altered after publication | Publisher signatures on every version; clients reject unsigned or mismatched lenses |
| Poisoned examples or embeddings steer a community lens | Contributions are attributed and reviewed through the community's governance; anomaly checks on large shifts |
| Embeddings reveal private interests | Embeddings private by default; shared lenses carry examples instead, or embeddings only with explicit consent |
| A binding lens is used for covert control | Binding status must be declared and shown; screened-out view with attribution cannot be disabled |
| Lock-in to one client or model | Open format; examples allow embeddings to be rebuilt on any model |

## Lenses and myspace

myspace is how others see you; your lens is how you see everything. myspace is where your lens can go public.

- **Show your lens.** A myspace can display the public parts of its owner's lens: rules, preferences, examples.
- **Preview through it.** Visitors can view any page through that lens before loading it.
- **Fork or subscribe from there.** myspace becomes a natural place to discover lenses.
- **Top 8 lenses.** A person's favorite lenses, shown as a statement of how they like to see the web.

## Desirable Properties alignment

The lens spec builds on the personal filters proposal (self-set gradient filters, mutes, feed rules, adaptive with consent, screened-out view on demand) and adds the social layer: filters that can be shared, forked and stacked across every layer.

| Theme | How the spec serves it |
| --- | --- |
| Agency | The person has the final say; exit is always available; adaptation needs consent |
| Transparency | Mandatory screened-out view with per-layer attribution and reasons |
| Interoperability | One open format for every layer and client; examples make embeddings portable |
| Privacy | Per-part privacy levels; embeddings private by default |
| Community governance | Community lenses change through member contribution and agreed process |
| Trust | Signatures, versioning and fork lineage |

Specific DP numbers for each theme are still to be mapped.

## Implementation

The lens core ships as its own small package; the main SDK depends on it and re-exports it, so SDK users get lenses without extra setup.

Why a separate package:

- **Adoption.** Other overlay builders, enterprise tools and agent frameworks can read and write lenses without taking on the whole SDK.
- **Commons.** A standalone package next to the spec signals that the format belongs to everyone, not to one product.
- **Independent versioning.** The lens format changes slowly and deliberately; SDK releases do not force format changes.
- **Auditability.** Signing, precedence and the screened-out view are the trust-critical parts, and a small package is easier to inspect.

| Lens package (core) | Main SDK |
| --- | --- |
| Schema and validation | Identity and accounts |
| Signing and verification | Storage and sync of lenses |
| Stack resolution and precedence | Communities and their governance hooks |
| Screened-out view with per-layer attribution | UI components: lens inspector, screened-out view, lens picker |
| Import and export that respects the privacy map | Agent integration |
| Fork, subscribe and version logic | Lens discovery: myspace, registries |
| Pluggable embedding adapter (rebuild from examples on any model) | Choice of default embedding model |

**Boundary test:** if another builder with a different identity system and UI would still need it to handle lenses correctly, it belongs in the core package.

**Repository layout:** one monorepo holding the spec, the lens package and the main SDK, published as separate packages.

## Open questions

- [ ] Is subscribe or fork the default when someone loads a shared lens?
- [ ] Who may declare a lens binding, and how does a person see and accept that scope?
- [ ] Should embeddings ever be shareable, or only examples?
- [ ] How does a community govern changes to its lens embedding?
- [ ] Which standard embedding models should the spec recommend, if any?
- [ ] How do agents act through a lens, and can an agent hold its own lens?
- [ ] Where does a lens live: in the client, in a personal data store, or in a registry?
- [ ] Which DP numbers does each theme map to?

## Example lens

A sketch of a community lens forked from a parent, with embeddings kept private. Field names are illustrative, not final.

```json
{
  "spec": "lens/0.1",
  "metadata": {
    "id": "lens:regenworld:core",
    "name": "RegenWorld Core",
    "description": "How the RegenWorld community sees the web",
    "publisher": "community:regenworld",
    "layer": "community",
    "version": "1.3.0",
    "license": "CC-BY-4.0"
  },
  "rules": {
    "mutes": { "topics": ["greenwashing ads"], "domains": [] },
    "gradients": { "outrage": 0.2, "promotional": 0.3, "local": 0.9 },
    "feed": [{ "boost": "regenerative agriculture" }, { "group": "events" }]
  },
  "preferences": ["long-form over hot takes", "practitioners over pundits"],
  "examples": {
    "positive": ["https://example.org/soil-carbon-field-notes"],
    "negative": ["https://example.org/clickbait-climate-listicle"]
  },
  "embeddings": [
    { "model": "example-embed-v2", "dims": 1024, "kind": "positive-centroid", "privacy": "private" }
  ],
  "privacy": {
    "rules": "public", "preferences": "public",
    "examples": "public", "embeddings": "private"
  },
  "binding": false,
  "provenance": {
    "parent": "lens:overweb-commons:base@2.0.0",
    "signature": "<publisher signature>",
    "changelog": [{ "version": "1.3.0", "note": "raised local gradient" }]
  }
}
```
