# The Layered Web: Living Book, Encyclopedia, and Governance

Implementation brief for Claude Code. Revised 15 Nov 2026 from the owner's brief (kept verbatim in [LAYERED-WEB-BRIEF-ORIGINAL.md](LAYERED-WEB-BRIEF-ORIGINAL.md)) after three read-only surveys of what exists. Nothing in this document has been built yet. It is a target design plus the decisions needed to start.

Status marks used throughout:

- **[Implemented]**: exists and works today.
- **[Partly]**: something exists but does not do what the brief needs.
- **[New]**: nothing exists; needs building.
- **[Decision N]**: blocked until Tension N is settled.

---

## 1. What changed from the original and why

The mission, the three views (Read, Explore, Govern), the Rights chapter as the first milestone, the operating rules and all ten phases (0 to 9) are kept. What changed:

1. **Each phase now starts from the real systems.** The original assumed some things that do not exist and named others generically. Corrections:
   - There is no "Nodes, Claims, and Artifacts" model in Canopi. Gov Hub has `artifact` and `artifact_relation`; its `Claim` is a role claim, not a factual claim.
   - There is no Agent Lab. Hermes is the AI layer.
   - The canonical text is Gov Hub `ML-Draft-NNN` documents with revisions r01, r02 (`Submission` rows). The rail sync (`scripts/govhub_sync_rails_from_hub.py`, workflow `govhub-rail-sync.yml`) copies the latest approved revision into `desirableproperties-book/content/local/*.md`. The book is a BRC333-BOOK; the Digital Monument (BRC333-MONUMENT) is a separate profile.
   - A Gov Hub proposal (`DpProposal`) is a patch on existing anchored text. It cannot propose a whole new chapter as it stands.
   - Gov Hub's lifecycle has no Draft, Deliberation or Decision state. It has pending, accepted, considered, declined, incorporated, orphaned, withdrawn.
   - Formal decisions are steering votes (`VOTES_NEEDED = 2`, hard-coded) or, without a freeze, approval by every co-editor seat (minimum two). Eligibility, quorum and thresholds are not configurable policy. The older `Vote`/`Ballot` engine has 0 rows in production, leaks voter choices and crashes on opening.
2. **Version 1.0 is not on chain.** The original treats chapters as inscribed. On Bitcoin mainnet, DP1 to DP22 are early-May 2026 drafts; the Introduction is a near-1.0 draft; Cover text, Edition, Foreword, About, Acknowledgements, DP23 and DP24 were never inscribed. Inscriptions carry no metadata. The metadata the brief asks for (decision reference, predecessor, contributors) exists nowhere.
3. **The relationship list was reconciled with BRC222.** Of the 15 names, only `supports` and `contradicts` exist in the BRC222 vocabulary (v2.1.0). Structural and governance links (amends, supersedes, approved-by, inscribed-as) are record links, not bridges. `bridges-to` is a category error: every BRC222 relationship is a bridge. See Tension 10.
4. **Living and historical bridges need anchor versions.** Canopi and BRC222 anchors are URL plus quote, with no version and no content hash. See Tension 7.
5. **The governance gap was made explicit.** No rule or body covers adopting a new chapter. The V1 freeze is lifted in production, steering's mandate was per release, and the DP Council has no members. See Tension 1.
6. **The acceptance test was rewritten** so each step names the real mechanism or says what is missing (section 4).
7. **Facts the original stated as given were softened where unconfirmed.** The year of the Overweb Bill of Rights ("2024") is not confirmed. It is a section of *The Metaweb*, Chapter 12 (`metaweb-book/ch12.htm`), with ten rights: Privacy, Security, Data Sovereignty, Cognitive Freedom, Context, Safety, Transparency, Free Speech, Expression, Presence.
8. **One rule was already broken and is now named.** "Adopted changes never silently overwrite prior canonical versions": the Cover (ML-Draft-033 r01) was edited in place on production on 14 Nov (`changelog.json`). See Tension 13.

---

## 2. Tensions

A tension is a place where two things the owner wants, or the brief and reality, pull against each other and someone has to choose. Tensions 1 to 9 block the Rights-chapter milestone. Tensions 10 to 15 do not block it but shape the later phases.

Summary:

| # | Tension | Blocks milestone | Who decides |
|---|---|---|---|
| 1 | Who can adopt a new chapter, and who adopts that rule | Yes | Owner sets the interim rule; steering ratifies |
| 2 | A whole chapter does not fit a patch-shaped proposal | Yes | Owner |
| 3 | Living book against a finished Version 1.0 | Yes | Owner, then steering |
| 4 | Which Bill of Rights wording is the source | Yes | Owner (as author of both books) |
| 5 | Rights as a foundation added after the DPs | Yes | Owner on title; steering on gates |
| 6 | Two voting channels plus likes, and no proof of one person one vote | Yes | Owner |
| 7 | Living against historical bridges with unversioned anchors | Yes (step 12) | Owner; bridges stay with @bridger-one |
| 8 | Inscription: permanence against living chapters, and sequence | Yes (step 11) | Owner |
| 9 | Nine phases against a small team: the smallest honest slice | Yes | Owner |
| 10 | One relationship vocabulary or two layers | No | Owner |
| 11 | Several stores of truth against "no encyclopedia database" | No | Owner |
| 12 | Discussions across revisions | No | Owner; Canopi implements |
| 13 | Quick fixes against immutable versions | No | Owner; steering for canonical text |
| 14 | AI that auto-posts against AI that must mark canon | No | Owner |
| 15 | Councils against steering as the long-term governing body | No | Owner; then the councils |

### Tension 1. Who can adopt a new chapter, and who adopts that rule

**Pulls one way:** the brief wants a community proposal, a formal vote and adoption. **Pulls the other:** no rule or body covers it.
- The freeze is lifted in production (`dp_v1_freeze_at_utc = 2099-12-31T23:59:59`), so co-editors decide patches again. A new chapter has no co-editors.
- Steering (five members in production) was set up per release; V1.1 steering is volunteers with no selection rule. MTP lines and chapter-title changes still need steering.
- The DP Council and the Overweb Council each have one draft election (5 seats, approval counting, `verified_account` electorate), no members and no admins.
- Chapters are ML-Draft documents created by admins.
- "Governance parameters remain configurable until the community formally adopts them" needs someone to adopt the first rule. There is no community body that can do that today.

**Options:**
- A. Owner writes an interim rule; current steering adopts the Rights chapter under it.
- B. Wait for the DP Council election, then the council adopts.
- C. Assign co-editors to the new document (as for any ML-Draft) and let the existing co-editor rule decide; steering signs off the chapter title as it already must.
- D. Open a community-wide vote. Not possible honestly yet (Tension 6).

**Recommendation:** A, with C's mechanics. The owner writes a one-page interim rule: a proposed chapter is a new ML-Draft document with named co-editors; co-editors decide patches as today; adopting the chapter into an edition needs a steering vote (two agreeing, as `VOTES_NEEDED`); the rule lapses when the DP Council is seated and the council confirms or replaces it. Steering votes to adopt the rule itself, recorded in `DpSteeringOutcome`. This is the first "formal adoption of a governance parameter", and it is honest about who adopted it.

**Who decides:** owner drafts; steering ratifies.

### Tension 2. A whole chapter does not fit a patch-shaped proposal

**Pulls one way:** the brief's first step is "a contributor creates a Rights chapter proposal". **Pulls the other:** `DpProposal` requires `anchor_hash` and `original_text` (both non-null in `models/dp_proposal.py`) and is pinned to a `submission_id`. There is no text to patch until a document exists.

**Options:**
- A. An admin creates a new document (next free ML number; highest today is 057) with an r01 `Submission` drafted by the contributor and marked *proposed*. It is on no rail. All later changes are ordinary `DpProposal` patches against r01.
- B. A new "document proposal" type in Gov Hub.
- C. A one-line seed document that the whole chapter is inserted into with `insert_after`.

**Recommendation:** A. It reuses the revision model, patches, steering votes and the rail sync unchanged. The new work is small: a "proposed, not in any edition" flag on the document, and a way for a non-admin contributor to submit r01 (or an admin does it on their behalf, with authorship recorded). Adoption then means: steering adopts a revision, a rail key is added to `sources-sat.json` and `viewer.htm`.

**Who decides:** owner.

### Tension 3. Living book against a finished Version 1.0

**Pulls one way:** "treat every chapter as living", "one canonical version per edition", Rights chapter placed after the Introduction. **Pulls the other:** Version 1.0 was released on 13 Nov after all 28 documents were signed off in four stages. Adding a chapter to 1.0 changes a signed-off book. V1.1 exists only as a carry-over bucket (deferred items, MTPs, DP5's BRC333 removal, the glossary); no V1.1 process is coded. The Edition page has no Gov Hub document, so "edition" is not a record anywhere.

**Options:**
- A. The Rights chapter enters Version 1.1. 1.0 stays closed and is archived as a whole.
- B. Version 1.0 stays the canonical book; the Rights chapter lives beside it as "proposed" until a later edition.
- C. Treat each chapter as its own living line and drop editions.

**Recommendation:** A. Make "edition" a real record (a Gov Hub document or a manifest entry) listing the exact revision of each chapter. 1.0 is then a frozen list; 1.1 is the first living edition. Before any 1.1 change publishes, give 1.0 itself archive keys (today 1.0 has no archive key; archive numbers are pre-1.0 Gov Hub revisions).

**Who decides:** owner on the edition model; steering on what enters 1.1.

### Tension 4. Which Bill of Rights wording is the source

**Pulls one way:** the brief says represent the Bill of Rights accurately as historical source and do not modify the 2024 *Metaweb* text. **Pulls the other:** the second-edition plan (`metaweb-book/docs/second-edition-plan.md`) revises the Chapter 12 Bill of Rights: it says the Bill overclaims ("you have no privacy" ignores GDPR, CCPA and the DSA), wants cornerstones merged with rights where they duplicate, and says each right should be marked as secured by interface design, by community governance, or as an aspiration. D1 says no new chapters in the second edition; D25 routes all its changes through Gov Hub revisions. So the "historical source" is about to have a revised twin, and the Rights chapter could derive from either.

**Options:**
- A. Cite the first-edition wording verbatim as history; draft the Rights chapter fresh, using the second-edition plan's own rule (each right marked secured, governed or aspirational).
- B. Wait for the second edition's revised Bill and derive from it.
- C. Copy the ten rights as they are into the chapter.

**Recommendation:** A. The Rights Register records each right's origin as the first-edition Chapter 12 passage (pinned to its existing inscription), and links to the second-edition revision when it exists, with a historical bridge. The Rights chapter does not inherit the overclaims. The year should be confirmed before the word "2024" appears anywhere public.

**Who decides:** owner, as author of both books.

### Tension 5. Rights as "the foundation of Desirable Properties", added after the DPs

**Pulls one way:** the chapter title says rights are the foundation; the brief adds Rights Impact Assessments for every substantive proposal. **Pulls the other:** 24 DPs were written and approved without them. The Introduction never uses the word "right"; DP4, DP14 and DP20 mention rights in passing. A foundation added afterwards is retroactive. A mandatory assessment is a new gate on every substantive proposal that no one has voted for. And when a right conflicts with an adopted DP, there is no rule for which wins.

**Options:**
- A. Keep the title; make rights binding; require an assessment on every substantive proposal from adoption.
- B. Present rights as the values the DPs serve; record links (supports, contradicts) without precedence; assessments optional and encouraged.
- C. Keep the title as proposed and let the vote settle it.

**Recommendation:** B for the milestone, with C on the title. The title is part of what steering votes on (chapter-title changes already need steering). Assessments start as an optional template on proposals. A conflict is recorded as a `contradicts` link and resolved by an ordinary patch to the DP or the right. Making assessments mandatory is a later governance rule under Tension 1.

**Who decides:** owner on the framing; steering on the title and on any mandatory gate.

### Tension 6. Two voting channels plus likes, and no proof of one person one vote

**Pulls one way:** "likes are not votes", "votes counted under the applicable rules", "eligible members vote", voting integrity. **Pulls the other:**
- Formal votes: Gov Hub steering votes (`DpSteeringVote`, superseded never deleted) and co-editor approval.
- Signals that look like votes: Canopi patch votes (one per user), artifact support/opposition, `CommentLike`, DP-site UP/DOWN.
- Identity: Gov Hub `User` and Canopi `AppUser` are both keyed by Web3Auth verifier id but are separate tables. Account linking (PR #130) is unmerged. Tallies count rows, not people. Proof of unique humanity does not exist.

**Options:**
- A. One formal channel (Gov Hub); everything in Canopi is labelled a signal in the UI.
- B. Promote Canopi patch votes to formal votes.
- C. Fix the old `Vote`/`Ballot` engine for community-wide votes.

**Recommendation:** A. In the product, rename Canopi patch "votes" to something that cannot be confused with a decision, or label them "signal, not a decision". The milestone's "eligible members" are the people the Tension 1 rule names (co-editors and steering), which needs no unique-humanity proof. Do not claim community-wide voting integrity until account linking and proof of unique humanity exist (connect accounts first, then unique humanity). Do not revive the `Vote`/`Ballot` engine without a privacy fix.

**Who decides:** owner.

### Tension 7. Living against historical bridges with unversioned anchors

**Pulls one way:** a living bridge resolves to the current canonical version; a historical bridge resolves to an exact version or hash. **Pulls the other:** bridge anchors are URL plus TextQuoteSelector, with no version and no hash. A bridge on `/viewer/dpNN` follows live text but breaks when the quote changes; one on `/viewer/dpNN/<rev>` is effectively pinned. BRC222's entry rule judges a relationship from the two passages and their dates. A living bridge whose quote changes may no longer be true, and the judgment was made on the old wording.

**Options:**
- A. Add an optional version and content hash to bridge anchors (additive). Historical bridges carry both. Living bridges carry the version they were judged on; when the live quote changes, the bridge is flagged "needs re-check" rather than silently followed.
- B. Only historical bridges; "living" is a UI convenience that shows the latest revision next to the pinned one.
- C. Leave anchors as they are and use the URL pattern alone.

**Recommendation:** A. A living bridge is a historical bridge plus a pointer to "current", with re-verification when the text moves. Use the sha256 already in `chapter-archives.json`. Bridges stay authored by @bridger-one and verified before entering a registry; same-book pairs never corroborate or confirm; no Foreword anchors.

**Who decides:** owner (BRC222 schema change).

### Tension 8. Inscription: permanence against living chapters, and sequence

**Pulls one way:** "treat every chapter as living, including inscribed chapters"; "a newly adopted revision may produce an inscription"; rich inscription metadata. **Pulls the other:**
- 1.0 is not on chain. What is on chain is early drafts, so readers who trust the monument read old text.
- Inscriptions are raw markdown (`text/plain`) with no metadata. Off chain, `sources-sat.json` holds inscription id, block, timestamp and ML number; `chapter-archives.json` holds sha256 and Gov Hub revision. Decision reference, predecessor and contributors are nowhere.
- Re-inscription (a new inscription on the same sat) is designed but the UniSat path does not document it. Box 1 `~/BRC333` holds August text, so inscribing from it would put old text on chain. The test network exists only as an unused `unisat_testnet` flag.
- Inscribing is irreversible. "Optional inscription" of living chapters sits against a monument that means permanence.

**Options:**
- A. Inscribe Version 1.0 first (from Gov Hub, not from Box 1 `~/BRC333`), then consider inscribing adopted 1.1 revisions.
- B. Inscribe only at edition boundaries; living revisions are recorded off chain.
- C. Inscribe every adopted revision.

**Recommendation:** A, then B. The Rights chapter is not inscribed until it is adopted into an edition that is itself inscribed. Put the brief's metadata in an off-chain manifest record keyed by inscription id and sha256, and decide separately whether a small on-chain sidecar is worth it. For the milestone, step 11 is a manifest record written in staging, labelled simulated.

**Who decides:** owner (every inscription needs his approval).

### Tension 9. Nine phases against a small team: the smallest honest slice

**Pulls one way:** ten phases, three views, a register, a shared content model, AI and a trust-signal challenge. **Pulls the other:** the team is small and launch was 13 Nov. Several acceptance steps cannot pass without new decisions: the vote (Tension 1, 6), the inscription (Tension 8) and the living bridge (Tension 7).

**Options:**
- A. Build the whole Phase 1 to 5 model, then run the test.
- B. Run the 12 steps on staging with existing systems plus the minimum new pieces (section 4), and mark what is simulated.

**Recommendation:** B. The smallest slice that honestly passes: a proposed ML-Draft document on dev.interfacehub.net, patches and a steering vote there, a new rail on staging.desirableproperties.org, a minimal Rights Register generated from the adopted chapter, Gov Hub's existing history as the Govern view, a manifest record for step 11, and two bridges on staging with Tension 7's version field. Explore is a list and entity pages, not a graph.

**Who decides:** owner.

### Tension 10. One relationship vocabulary or two layers

**Pulls one way:** the brief's 15 typed relationships in one list. **Pulls the other:** BRC222 v2.1.0 lists a relationship only if a verifier can judge it from the two passages and their dates alone. Only `supports` and `contradicts` match (`conflicts-with` = `contradicts`; `derives-from` is nearest `extends`). Gov Hub has its own list (builds_on, references, supports, opposes, amends, implements, awarded_for). Neo4j has a stale pre-2.0 list.

**Options:**
- A. Extend BRC222 with all 15.
- B. Two layers: BRC222 bridges for claims about meaning between passages; record links for structure and governance (amends, supersedes, proposes-change-to, approved-by, inscribed-as, implements, discusses), held where the record lives.
- C. A third, new vocabulary.

**Recommendation:** B. Record links come from data already in Gov Hub (`incorporated_submission_id`, `revised_from_id`, `DpSteeringOutcome`) and BRC333, not from verifier judgment. Candidates for BRC222 (motivates, advances, requires) go through its normal entry rule. Drop `bridges-to`.

**Who decides:** owner.

### Tension 11. Several stores of truth against "no independent encyclopedia database"

**Pulls one way:** "do not introduce an independent encyclopedia database". **Pulls the other:** Explore needs search and typed navigation across records that live in six stores with their own relationship models (Canopi Postgres, Gov Hub SQLite, bridge registry, Overweb registry, Neo4j, dp-memory-graph). Patches live in both Canopi messages and Gov Hub `DpProposal`. The Canopi to Neo4j sync is an unimplemented TODO.

**Options:**
- A. A derived, rebuildable index that is never written to directly and owns no fact.
- B. Make Neo4j the single graph.
- C. Query each store live.

**Recommendation:** A. Each entity keeps one source of truth (table below). The index can be thrown away and rebuilt. That respects the owner's rule in spirit. Pick one owner for patches: Gov Hub for the book's canonical text, Canopi messages as the entry point that mirrors into it (today's `canopi_overlay_id` link).

| Entity | Source of truth today |
|---|---|
| Chapter text and revisions | Gov Hub `Submission` (ML-Draft) |
| Published book text | DP repo rails, via rail sync |
| Passage anchor | Canopi `Anchor` / `anchor_registry` |
| Patch, insert | Canopi messages and Gov Hub `DpProposal` (two) |
| Proposal status, steering vote, decision | Gov Hub |
| Community, membership | Canopi |
| Version archive | DP repo `chapter-archives.json` |
| Bridge | bridge registry (production), Overweb registry (staging) |
| Inscription | BRC333 / `sources-sat.json` |
| Right | none [New] |
| Edition | none [New] |

**Who decides:** owner.

### Tension 12. Discussions across revisions

**Pulls one way:** "preserve conversations across revisions, with relationships to revised passages". **Pulls the other:** on 13 and 14 Nov, 24 chapter discussions (and DP5 a day later) were moved to `/viewer/dpNN/<rev>` archive URLs. No mapping from old passages to revised ones exists. Canopi anchors are keyed by a hash of URL plus anchor, not the text.

**Options:**
- A. At each new revision, compute a passage map (old anchor to new anchor, or "removed") from page-version block fingerprints, and show "this passage changed in rN" links in both directions.
- B. Keep moving threads to archive URLs and link archive to current at page level only.

**Recommendation:** A, built after the milestone. Until then, B continues, with the archive page linking to the current chapter.

**Who decides:** owner; Canopi implements.

### Tension 13. Quick fixes against immutable versions

**Pulls one way:** "adopted changes never silently overwrite prior canonical versions". **Pulls the other:** operational fixes happen. The Cover (ML-Draft-033 r01) was edited in place on production on 14 Nov; a backup was kept and the change logged in `changelog.json`, but the revision number did not change.

**Options:**
- A. Every change to an approved revision makes a new revision, even a link fix.
- B. Allow a named class of non-text fixes (links, image references) in place, logged, with the content hash updated and the old hash kept.

**Recommendation:** B for non-text fixes only, written down as a rule; anything a reader would read differently gets a new revision.

**Who decides:** owner; steering for canonical text.

### Tension 14. AI that auto-posts against AI that must mark canon

**Pulls one way:** "AI must distinguish canonical from draft", "expose supporting records", "AI agents cannot cast votes or adopt revisions". **Pulls the other:**
- Hermes book retrieval is keyword search over markdown with a hard-coded `CANONICAL_DP_MAX = 22` (so DP23 and DP24 are not canon to it), reading from the deploy target. (Survey finding; not re-checked.)
- Hermes agents auto-post every 15 minutes.
- Bot disclosure is only a `BOT_USERNAMES` allowlist (`services/dp_acknowledgements.py`), which omits `@bridger-one`; there is no per-user bot flag.
- There is no shared retrieval layer, so no permission enforcement over community content either.
- Already true: agent tokens can never accept, decline or publish (`services/agent_rep.agent_canonical_write_block`).

**Options:** fix Hermes first; or build Phase 7 as a new retrieval layer and retire Hermes's book search.

**Recommendation:** before Phase 7, give Hermes the edition manifest (Tension 3) as its source of canon, remove the hard-coded cap, add a per-user bot flag and set it for @bridger-one and the Hermes agents, and label every auto-post as AI. Phase 7 builds on that.

**Who decides:** owner.

### Tension 15. Councils against steering as the long-term governing body

**Pulls one way:** the brief wants explicit, community-adopted governance. **Pulls the other:** steering (V1.1, volunteers) and the DP Council (drafted, unseated) are separate, and how they relate is an open owner decision. The milestone can run on steering under Tension 1, but Phase 4's configurable policy needs a body that owns it.

**Recommendation:** decide after the first DP Council election, with the interim rule from Tension 1 lapsing on that date.

**Who decides:** owner; then the councils.

---

## 3. Revised phases

### Operating rules (kept from the original)

- Inspect the actual repositories and live architecture before proposing code changes.
- Reuse existing DPs, proposal systems, Gov Hub workflows, APIs, authentication, roles, smart tags, versioning, and BRC333 infrastructure.
- Treat this brief as a target design, not proof that any component already exists.
- Preserve existing content, identifiers, URLs, authorship, comments, and governance history.
- Do not introduce an independent encyclopedia database when existing stores can provide the functions (see Tension 11 for the derived index).
- Do not change production governance rules without explicit approval.
- Do not submit real votes, alter canonical chapters, reinscribe artifacts, or publish production changes without approval.
- Prefer additive schemas, feature flags, migrations, and reversible deployments.
- Write tests and document all major design decisions.
- Explicitly distinguish implemented features from mockups and future specifications.

Added: work on staging (dev.interfacehub.net, staging.desirableproperties.org) first. `~/desirable-properties` is a deploy target; never work in it.

### Phase 0: Repository and architecture discovery [Partly]

The three surveys of 15 Nov covered most of the inventory (book, Gov Hub, Canopi, BRC222, BRC333, Hermes). Still to produce, from the real repositories (`desirable-properties`, `interface-gov-hub`, `canopi`, `canopi-sdk`, `brc222`, `overweb-registry`, bridge registry, `BRC333`, `metaweb-book`, Hermes):

1. Current architecture diagram.
2. Capability inventory (start from the status marks in this brief).
3. Gap analysis.
4. Proposed changes by repository.
5. Data migration plan.
6. Security and privacy risks.
7. Recommended implementation sequence.

Confirm the source of truth for each entity (table in Tension 11) before adding schema. Unknowns to resolve: where Hermes's code lives and who runs it; whether "2024" is the right year for the Bill of Rights; whether the UniSat path supports re-inscription on the same sat.

### Phase 1: Rights as a first-class content type [New]

Start from: *The Metaweb* Chapter 12 Bill of Rights (ten rights); the second-edition plan's revision rules (Tension 4); DP4, DP14, DP20.

- **Rights Register** [New, Decision 11]. One record per right, attributes as in the original: stable id, title, description, historical origin, source and citation, status, scope and interpretation, related and conflicting rights, supporting DPs and specifications, governance status, current and prior versions, proposals and decisions, contributors. Start it as a structured block generated from the adopted Rights chapter (or a JSON file in the DP repo next to `sources-sat.json`), not a new database.
- **Historical source** [Decision 4]. Cite the first-edition Chapter 12 wording verbatim, pinned to its inscription. Do not modify it.
- **Proposed Rights chapter** [New, Decisions 1, 2]. A new ML-Draft document (next free number after 057) with an r01 marked proposed, on no rail. Placed after the Introduction (ML-Draft-026) and before DP1 when adopted. DP numbering does not change. Not canonical until adopted.

### Phase 2: Shared content model [Partly]

Use what exists; add only what is missing.

| Brief's entity | Real system | Status |
|---|---|---|
| Book, Chapter | BRC333-BOOK; Gov Hub ML-Draft documents; rails in `sources-sat.json` | Implemented |
| Edition | Edition page only; no record | New [Decision 3] |
| Passage | Canopi `Anchor` (URL + anchor hash) | Implemented, no version |
| Claim | none (Gov Hub `Claim` is a role claim) | New |
| Right | none | New |
| DP | Gov Hub ML-Draft + DP repo rails | Implemented |
| Requirement, Specification | MTPs (`services/dp_mtp.py`) are the nearest | Partly |
| Artifact | Gov Hub `artifact`, `artifact_relation` | Implemented |
| Person, Membership | Gov Hub `User`, Canopi `AppUser`, linking unmerged (PR #130) | Partly |
| Community | Canopi communities, memberships, constellations | Implemented |
| Comment, Reaction, Discussion | Canopi messages; Gov Hub comments, `CommentLike` | Implemented (two places) |
| Proposal, Patch, Insert | Gov Hub `DpProposal`; Canopi patch messages | Implemented (two places) |
| Ballot, Vote, Decision | `DpSteeringVote`, `DpSteeringOutcome`; old `Vote`/`Ballot` broken | Partly |
| Objection, Appeal | none | New |
| Version | Gov Hub `Submission` revisions; `chapter-archives.json` | Implemented |
| Inscription, Content Hash | BRC333, `sources-sat.json`, sha256 in `chapter-archives.json` | Partly |
| Digital Monument | BRC333-MONUMENT (separate profile from the book) | Implemented, separate |
| Implementation, Repository, Test, Experiment, Result | none in this model | New, later |

Relationships: two layers (Tension 10). BRC222 bridges for meaning between passages; record links for structure and governance, derived from existing fields. Keep the original's rule: a continuing identity (the ML-Draft document, the right id) is distinct from an immutable version (a revision with its hash).

### Phase 3: Read, Explore, and Govern

**Read** [Partly]. The viewer (`viewer.htm`) on desirableproperties.org already shows rails, archive routes `/viewer/dpNN/<rev>`, and Canopi discussion on passages. Needed: a rail and route for the Rights chapter (`viewer.htm` hard-codes rail keys), PDF and acknowledgements updates, an edition switcher, links to related rights and DPs.

**Explore** [New, Decision 11]. Nearest existing surfaces: Canopi `/anchor/[hash]`, `/tag/[label]`, `/c/[slug]`, the registry browsing API. Build entity pages for rights, DPs and specifications from the derived index; typed navigation over record links and bridges; timelines from Gov Hub history. Graph view only where it helps.

**Govern** [Partly]. Gov Hub already has proposals, patches and inserts, comments, steering votes, decision records and history. Needed: a way into it from the book for each passage; objections as a record; a clear split between signals and decisions (Tension 6).

A contribution made in any view stays visible in the others. Today this works for Canopi patches mirrored into Gov Hub (`canopi_overlay_id`); it does not yet work for Explore.

### Phase 4: Governance lifecycle [Partly]

The original lifecycle mapped to Gov Hub:

| Brief | Gov Hub today | Status |
|---|---|---|
| Draft | none (proposals start as pending) | New, small |
| Submitted, Under Review | `pending` | Implemented |
| Deliberation | comments while `pending` | Partly |
| Decision | `accepted`, `declined`, `considered`; `DpSteeringOutcome` | Implemented |
| Adopted | `accepted` then `incorporated` in the next approved revision | Implemented |
| Canonical Version | approved revision, rail-synced | Implemented |
| Optional Inscription | manual, irreversible | Partly [Decision 8] |
| Subsequent Revision | next revision r(N+1) | Implemented |

Requirements, with status:
- Likes are not votes [Partly; needs labelling, Tension 6].
- A proposal links to the exact target version [Implemented: `submission_id`, `content_hash_at_create`].
- Votes are counted under the applicable rules [Implemented for steering and co-editors].
- Eligibility, quorum, thresholds, timing configurable [New: today `VOTES_NEEDED = 2` is hard-coded; only roster and freeze time are config]. Move them into `site_config` behind the Tension 1 rule.
- Durable audit records [Implemented: `StatusChange`, `EventLog`, `DocumentHistory`, `DpSteeringVote`].
- Rejections and dissent remain accessible [Partly: declined and considered stay listed; no dissent record].
- No silent overwrite [Partly; Tension 13].
- Rights Impact Assessments [New; optional at first, Tension 5].
- Governance parameters stay configurable until formally adopted [Decision 1].

### Phase 5: Versioning and inscription [Partly]

- Immutable historical versions [Implemented: Gov Hub revisions; archive routes; sha256 in `chapter-archives.json`].
- One current canonical version per edition [New: needs the edition record, Tension 3].
- Inscription of adopted revisions [Partly, Decision 8]. Inscribe from Gov Hub text, never from Box 1 `~/BRC333`. Version 1.0 first.
- Inscription metadata [New]. Off-chain manifest record per inscription: artifact id, version, content hash, decision reference, predecessor, contributors where authorized, inscription id, timestamp, provenance.
- Never place private messages, sensitive personal data or unreleased information on chain [kept].
- Living and historical bridges [New, Decision 7].

### Phase 6: Contextual discussion and the book as a commons [Partly]

- Threads on exact passage anchors [Implemented: Canopi anchors and messages].
- Preserve conversations across revisions [Partly: archive moves; no passage map, Tension 12].
- Live and asynchronous discussion through `canopi_events` [Implemented: events attach to a page or passage, with live messages and RSVPs].
- Cross-platform participation [New]. No import from WhatsApp, Signal, Discord or Slack exists. Do not imply external messages are imported or published without consent.
- The durable book record holds authorized contributions, evidence, decisions and summaries [Partly: decisions and patches yes; summaries no].

### Phase 7: AI-assisted exploration [Partly]

Build on Hermes, not an Agent Lab (none exists). Fix Tension 14 first. Then the original list: questions on chapters and passages, rights-to-DP gap analysis, revision comparison, discussion summaries with links, explanation of decisions, contradictory claims, version-aware retrieval, drafting help, evidence-grounded investigation.

Rules kept: canonical, draft and commentary are always distinguished; every factual summary exposes its records; private community content is never exposed through shared retrieval or caching (there is no shared retrieval layer yet, so this is a design requirement, not a fix); AI agents cannot vote, impersonate members or adopt revisions (already enforced for agent tokens by `agent_canonical_write_block`).

### Phase 8: Just-in-Time Trust Signals challenge [Partly]

Start from Canopi's existing patch trust signals (append-only, policy `patch.default.personal_trust_signal.v1`). Note that "challenge-site" in the DP repo is the DP Challenge app, not a dispute mechanism.

Workflow kept: propose trustworthy digital engagement rights, map existing DPs, find missing requirements, propose a trust-signal interoperability specification, review, build an experimental Canopi interface, evaluate. Prototype scope kept as in the original. No unsourced universal trust score. Synthetic or licensed data only until agreements and privacy reviews are done.

### Phase 9: Future Metaweb Second Edition integration [Partly]

The second-edition plan already routes changes through Gov Hub revisions and inscriptions (D25) and serves the book from metawebbook.com. Provide stable living links and version-pinned links into Layered Web artifacts using the Tension 7 bridge design. Do not modify or republish the first-edition text. A People's Edition is a separate editorial lineage with its own governance and publication rights.

### Security and privacy requirements

Kept from the original, with what is known today:

| Area | Today |
|---|---|
| Identity and access control | Web3Auth verifier id; Gov Hub and Canopi separate users; linking unmerged |
| Community-specific permissions | Canopi communities and memberships |
| Private versus public discussion | Canopi visibility; no shared retrieval layer |
| Voting integrity, duplicate accounts | Tallies count rows; no unique humanity (Tension 6) |
| Bot and AI disclosure | `BOT_USERNAMES` allowlist only; omits @bridger-one (Tension 14) |
| Proposal spam, reward manipulation | unknown; not surveyed |
| Malicious content, prompt injection | unknown; Hermes reads markdown from the deploy target |
| Privacy-preserving retrieval | none yet |
| False or defamatory trust assessments | Phase 8 design requirement |
| Appeals and corrections | no appeal model |
| Publishing consent | no external import, so no consent flow yet |
| Inscription irreversibility | owner approval for every inscription (Tension 8) |
| Data export and deletion | unknown; not surveyed |
| Recovery from compromised accounts | unknown; not surveyed |

---

## 4. First milestone acceptance test

Run on staging (dev.interfacehub.net and staging.desirableproperties.org, which have their own database and can run a full proposal, vote and publish cycle). No production governance record changes.

| # | Step | Real mechanism | Status |
|---|---|---|---|
| 1 | A contributor creates a Rights chapter proposal | New ML-Draft document on staging Gov Hub, r01 marked proposed, on no rail; contributor recorded as author | Needs building (proposed flag; contributor-submitted r01). Blocked on Decisions 1 and 2 |
| 2 | Another participant comments and gives evidence | Gov Hub comments on the document; Canopi discussion on the passage; evidence via `DpProposal.reference_url` or Canopi patch evidence | Implemented in Gov Hub. Canopi needs a viewer route for an unrailed document (needs building) |
| 3 | A participant suggests a specific patch | `DpProposal` (replace / insert / insert_after) against r01 `anchor_hash` | Implemented |
| 4 | Others endorse or challenge it | Artifact support/opposition, `CommentLike`, Canopi patch vote; challenge as opposition or comment | Partly (no objection record). Labelling blocked on Decision 6 |
| 5 | Eligible members take part in a formal vote | Real co-editor approval and `DpSteeringVote` flow, on staging data with test accounts. "Simulated" means staging, not a special mode (none exists) | Implemented mechanism. Who is eligible: blocked on Decision 1 |
| 6 | The authorized process adopts a revision | Accept patches, publish r02 on staging Gov Hub; rail sync to staging | Partly: needs a rail key in `sources-sat.json` and `viewer.htm`, and an edition record. Blocked on Decision 3 |
| 7 | The adopted version appears in Read | `/viewer/<new key>` between the Introduction and DP1 on staging | Needs building (rail, route, navigation) |
| 8 | Its rights and relationships appear in Explore | Rights Register entries and entity pages from the derived index | Needs building. Blocked on Decisions 10 and 11 |
| 9 | Its decision history appears in Govern | Gov Hub `StatusChange`, `DocumentHistory`, `DpSteeringOutcome`, linked from the book | Implemented in Gov Hub; link from the book needs building |
| 10 | An amendment makes a new version; the original stays | Second patch, r03; r02 kept as a `Submission`, archived at `/viewer/<key>/r02` with sha256 in `chapter-archives.json` | Partly (archive move is a manual step today) |
| 11 | A simulated or test-network inscription records the version | Off-chain manifest record in staging with the Phase 5 metadata, labelled simulated. Test network: unused `unisat_testnet` flag only | Needs building. Blocked on Decision 8 |
| 12 | Historical and living bridges | Two bridges by @bridger-one in the staging Overweb registry: one pinned to r02 with its hash, one living with "needs re-check" after r03 | Needs building (anchor version and hash). Blocked on Decision 7 |

Steps 3, 5 (mechanism) and 9 (in Gov Hub) pass today. Steps 1, 6, 7, 8, 11 and 12 need building. Steps 1, 4, 5, 6, 8, 11 and 12 also need a decision first.

---

## 5. Required initial deliverables (kept)

Before implementing major features:

- Architecture and repository inventory
- Prioritized implementation backlog
- Proposed database and API changes (additive)
- UI wireframes for all three views
- Governance workflow specification, including the interim rule (Tension 1)
- Versioning and inscription design (Tensions 3, 7, 8)
- Risks and dependencies
- Test plan
- First milestone execution plan

Then build the smallest complete vertical slice (Tension 9) on existing infrastructure.

**Success condition (kept):** a real community can transparently improve and govern its own living book while preserving historical records and making the resulting knowledge usable across multiple contexts and implementations.
