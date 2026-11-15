# The Layered Web: Living Book, Encyclopedia, and Governance

Implementation brief for Claude Code. Revised 15 Nov 2026 from the owner's brief (kept verbatim in [LAYERED-WEB-BRIEF-ORIGINAL.md](LAYERED-WEB-BRIEF-ORIGINAL.md)) after three read-only surveys of what exists. Nothing in this document has been built yet. It is a target design plus the decisions needed to start. The owner ruled on Tensions 1 to 8 on 15 Nov (section 2). Still open: who counts as the community for a chapter vote and its threshold and quorum (Tension 1), how API answers report editions (Tension 3), and Tension 9.

Status marks used throughout:

- **[Implemented]**: exists and works today.
- **[Partly]**: something exists but does not do what the brief needs.
- **[New]**: nothing exists; needs building.
- **[Decision N]**: blocked until Tension N is settled.
- **Decided**: the owner has ruled. The tension's analysis is kept for the record and the ruling follows it.

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
6. **The acceptance test was rewritten** so each step names the real mechanism or says what is missing (section 5).
7. **Facts the original stated as given were softened where unconfirmed.** The year of the Overweb Bill of Rights ("2024") is not confirmed. It is a section of *The Metaweb*, Chapter 12 (`metaweb-book/ch12.htm`), with ten rights: Privacy, Security, Data Sovereignty, Cognitive Freedom, Context, Safety, Transparency, Free Speech, Expression, Presence.
8. **One rule was already broken and is now named.** "Adopted changes never silently overwrite prior canonical versions": the Cover (ML-Draft-033 r01) was edited in place on production on 14 Nov (`changelog.json`). See Tension 13.

---

## 2. Decisions (15 Nov 2026)

The owner ruled on Tensions 2 to 8, then on Tension 1 and the edition model (Tension 3).

| # | Ruling |
|---|---|
| 1 | Anyone can propose a new chapter. Steering is the gate that decides whether it goes to a community vote. The community accepts or rejects it. |
| 2 | The Rights chapter goes on Gov Hub as a new ML-Draft document. |
| 3 | It belongs to Version 1.1. Edition is all three options together: a Gov Hub edition record, a manifest generated from it, and an edition stamp. Every draft revision, every proposal incorporated into a revision, every inscription record and every PDF has an edition, and they must agree. Bridges do not have an edition. |
| 4 | No conflict. Document what the first book said (Chapter 12, verbatim, as history) and expand it in the DP book. Confirm the year before "2024" is used. |
| 5 | Rights are the foundation of what we collectively want for our digital life and experience. Rights are the why; the DPs are the how. Rights Impact Assessments stay optional until a rule is adopted. |
| 6 | True today, and it has to evolve. Gov Hub stays the one formal channel; other votes are labelled signals. Roadmap: account linking, then proof of unique humanity, then community-wide votes. |
| 7 | New requirement: when a bridge breaks, the Overweb registry writes a bridge incident record, and broken bridges can be shifted to the Wayback Machine. |
| 8 | Version 1.0 may be inscribed soon. Prerequisites stay visible: inscribe from Gov Hub text, not Box 1 `~/BRC333`; include the pages never inscribed; create the edition record first, so the inscription record carries the edition. |

Still open: for Tension 1, who counts as the community for a chapter vote, its threshold and quorum, and which body holds the gate after V1.1; for Tension 3, how API answers report editions (the owner is still thinking); Tension 9 (the owner asked for an explanation, no ruling); the rule that would make Rights Impact Assessments required (minor); Tensions 10 to 15.

---

## 3. Tensions

A tension is a place where two things the owner wants, or the brief and reality, pull against each other and someone has to choose. Tensions 1 to 9 blocked the Rights-chapter milestone. After the 15 Nov rulings, the open parts of Tension 1 (electorate, threshold, quorum) and Tension 9 still block it. Tensions 10 to 15 do not block it but shape the later phases.

Summary:

| # | Tension | Blocks milestone now | Status; who decides |
|---|---|---|---|
| 1 | Who can adopt a new chapter, and who adopts that rule | Yes (step 5), until electorate, threshold and quorum are set | Decided: anyone proposes, steering gates, community accepts. Electorate, threshold, quorum open (owner, then steering) |
| 2 | A whole chapter does not fit a patch-shaped proposal | No | Decided: new ML-Draft document |
| 3 | Living book against a finished Version 1.0 | No decision left for the milestone; the edition record needs building | Decided: Version 1.1; record, manifest and stamp, which must agree; no edition on bridges. API answers open (owner) |
| 4 | Which Bill of Rights wording is the source | No | Decided: Chapter 12 verbatim as history, expanded in the DP book |
| 5 | Rights as a foundation added after the DPs | No | Decided on framing. Assessment rule open (steering) |
| 6 | Two voting channels plus likes, and no proof of one person one vote | No | Decided for now; roadmap to evolve |
| 7 | Living against historical bridges with unversioned anchors | No decision left; step 12 needs building | Decided: versioned anchors plus bridge incident records |
| 8 | Inscription: permanence against living chapters, and sequence | No decision left; step 11 needs the edition record | Decided: prerequisites kept |
| 9 | Nine phases against a small team: the smallest honest slice | Yes | Open (owner) |
| 10 | One relationship vocabulary or two layers | No | Owner |
| 11 | Several stores of truth against "no encyclopedia database" | No | Owner |
| 12 | Discussions across revisions | No | Owner; Canopi implements |
| 13 | Quick fixes against immutable versions | No | Owner; steering for canonical text |
| 14 | AI that auto-posts against AI that must mark canon | No | Owner |
| 15 | Councils against steering as the long-term governing body | No | Owner; then the councils |

### Tension 1. Who can adopt a new chapter, and who adopts that rule (Decided; vote details open)

**Ruling (15 Nov):** "anyone can propose a new chapter"; "the community should accept new chapters"; "steering may have to put the new chapter to vote by community. gate". The flow:

1. **Anyone proposes** a new chapter: a new ML-Draft document on Gov Hub with an r01 marked proposed (Tension 2).
2. **Steering gates it.** Steering decides whether the proposal goes to a community vote.
3. **The community accepts or rejects it** by vote. If accepted, the chapter enters the edition in progress (Tension 3).

**What was in the way (kept for the record).** No rule or body covered adopting a new chapter.
- The freeze is lifted in production (`dp_v1_freeze_at_utc = 2099-12-31T23:59:59`), so co-editors decide patches again. A new chapter has no co-editors.
- Steering (five members in production) was set up per release; V1.1 steering is volunteers with no selection rule. MTP lines and chapter-title changes still need steering.
- The DP Council and the Overweb Council each have one draft election (5 seats, approval counting, `verified_account` electorate), no members and no admins.
- Chapters are ML-Draft documents created by admins.

**Steering's gate.** It replaces an endorsement threshold as the main guard against spam proposals. It checks three things:
- **Well-formed:** a complete r01, a title, a stated place in the book, an author on record.
- **In scope:** it belongs in *The Layered Web* (for the Rights chapter, the framing in Tension 5).
- **Not a duplicate:** it does not repeat an existing chapter or another open proposal.

Endorsements (artifact support, `CommentLike`, Canopi signals) stay a signal steering can weigh, not a trigger. The gate decision is recorded as a `DpSteeringOutcome` with its reasons, using the existing steering vote (`DpSteeringVote`, two agreeing members, `VOTES_NEEDED`). A refusal stays publicly visible with its reasons, as declined proposals already do. The gate passes or refuses; it does not adopt.

**The remaining tension is with Tension 6.** "The community accepts" needs a community-wide vote, and its integrity cannot be proven yet: account linking (PR #130) is unmerged, tallies count accounts not people, and proof of unique humanity does not exist.

**Still open:**
- Who counts as the community for this vote.
- The threshold and quorum.
- Which body holds the gate after V1.1: steering or the DP Council (Tension 15).

**Options, from what exists.** Gov Hub staging has the council-election models (`models/council.py`: `CouncilElection` with `counting` and an `eligibility` JSON rule, `CouncilBallot` with one active ballot per voter and supersede, `CouncilEligibility`). The ballot is secret and emits no event. Its eligibility rules are `verified_account` (any Gov Hub account with an email created before the announcement), `contributors` (proposal authors, co-editors, approvers, steering members, submission authors) and `roll` (an admin-approved list). The old `Vote`/`Ballot` engine is not reused.

- **A. Reuse the council ballot for a yes/no chapter vote**, with a `verified_account` electorate. Widest reach; weakest against duplicate accounts until account linking.
- **B. Same ballot, `contributors` electorate.** The people who wrote and reviewed the book. Smaller and harder to flood; it leaves out readers.
- **C. The DP Council votes** as the community's elected body, once seated. Easy to count and defend; one step removed from "the community".
- **D. Community vote advises; the council or steering ratifies.**

**Recommendation:** B now, on the council ballot machinery with a yes/no counting mode added beside `approval`. Publish the threshold and quorum with each vote: a simple majority of ballots cast, and a quorum stated as a share of the eligible count, which the results already report (`eligible_count`, `turnout`). Label every result with the duplicate-account caveat until account linking ships. Move to A once account linking is in, and revisit after proof of unique humanity (the Tension 6 roadmap). Steering holds the gate through V1.1; the DP Council decides whether it takes the gate once seated.

**Who decides:** owner on the electorate, threshold and quorum, and the counting mode; steering adopts the rule as a recorded decision; the DP Council, once seated, on who holds the gate.

### Tension 2. A whole chapter does not fit a patch-shaped proposal (Decided)

**Pulls one way:** the brief's first step is "a contributor creates a Rights chapter proposal". **Pulls the other:** `DpProposal` requires `anchor_hash` and `original_text` (both non-null in `models/dp_proposal.py`) and is pinned to a `submission_id`. There is no text to patch until a document exists.

**Options:**
- A. An admin creates a new document (next free ML number; highest today is 057) with an r01 `Submission` drafted by the contributor and marked *proposed*. It is on no rail. All later changes are ordinary `DpProposal` patches against r01.
- B. A new "document proposal" type in Gov Hub.
- C. A one-line seed document that the whole chapter is inserted into with `insert_after`.

**Recommendation:** A. It reuses the revision model, patches, steering votes and the rail sync unchanged. The new work is small: a "proposed, not in any edition" flag on the document, and a way for a non-admin contributor to submit r01 (or an admin does it on their behalf, with authorship recorded). Adoption then means: steering adopts a revision, a rail key is added to `sources-sat.json` and `viewer.htm`.

**Ruling (15 Nov):** option A. The Rights chapter goes on Gov Hub as a new ML-Draft document. Steering gates it and the community accepts it (Tension 1).

### Tension 3. Living book against a finished Version 1.0 (Decided; API answers open)

**Pulls one way:** "treat every chapter as living", "one canonical version per edition", Rights chapter placed after the Introduction. **Pulls the other:** Version 1.0 was released on 13 Nov after all 28 documents were signed off in four stages. Adding a chapter to 1.0 changes a signed-off book. V1.1 exists only as a carry-over bucket (deferred items, MTPs, DP5's BRC333 removal, the glossary); no V1.1 process is coded. The Edition page has no Gov Hub document, so "edition" is not a record anywhere.

**Options:**
- A. The Rights chapter enters Version 1.1. 1.0 stays closed and is archived as a whole.
- B. Version 1.0 stays the canonical book; the Rights chapter lives beside it as "proposed" until a later edition.
- C. Treat each chapter as its own living line and drop editions.

**Ruling (15 Nov):** option A. The Rights chapter belongs to Version 1.1. "Edition" must become a record, and it must be carried along so that anything (an archive copy, an inscription, a PDF, an API answer) can say which edition it is part of. The owner asked for the options for that record; his later ruling is below.

**What exists today.**
- `desirableproperties-book/json/sources-sat.json` (BRC333 `source_inventory`, camelCase): top level `protocol`, `operation`, `project`, `schemaVersion`, `workId`, `title`, `summary`, `bookCoverInscriptionId`, `articleRails` (30 keys in order); `sources[]` with `railKey`, `label`, `mlNumber` (29 of 30; the Edition page has none), `dp`, `localOverride`, `inscriptionId`, `block`, `timestamp` (23 of 30), `status`, `reinscribable`, `reason`. It says nothing about which revision a rail holds.
- `desirableproperties-book/json/chapter-archives.json` (schema `dp-book-chapter-archives/v1`, snake_case): top level `current_label: "Version 1.0"` (a label only); `archives[]` with `key`, `rev`, `label`, `title`, `file`, `live_from`, `live_until`, `source_commit`, `source_path`, `text_since_commit`, `sha256`, `govhub { ml_number, revision, submission_id, text_url, read_url }`, `note`. These are the pre-1.0 copies; 1.0 itself has no entry.
- Gov Hub `Submission` already has `content_hash`; sign-off records are `DpSteeringStage` and `DpSteeringOutcome`.

**Rule that shapes every option:** an edition lists revisions; it does not own them. One chapter revision can sit in several editions (a DP unchanged between 1.0 and 1.1 is the same revision in both). Revisions published after 1.0 and before 1.1 is released belong to "1.1 in progress": an edition record with status `in_progress` whose list moves with each approved revision, then freezes on release.

**Options for the record:**

- **(a) Edition manifest in the book repo.** Either a new top-level `editions` array in `sources-sat.json`, or a separate `desirableproperties-book/json/editions.json` (schema `dp-book-editions/v1`) with a pointer in `sources-sat.json` (`currentEdition`, `editionsManifest`). camelCase, to match `sources-sat.json`:

  ```json
  {
    "editionId": "1.0",
    "label": "Version 1.0",
    "status": "released",
    "releasedAt": "2026-11-13",
    "predecessorEditionId": null,
    "decisionRef": "govhub:dp_steering_outcome/<id>",
    "govhubEditionId": "<id, under option b>",
    "manifestSha256": "<sha256 of the canonical JSON of rails>",
    "rails": [
      {
        "railKey": "dp01",
        "mlNumber": "ML-Draft-008",
        "revision": "<Gov Hub revision, e.g. 06>",
        "submissionId": "<Gov Hub Submission id>",
        "sha256": "<sha256 of the published markdown>",
        "archiveKey": "dp01",
        "archiveRev": "<rev served at /viewer/dp01/<rev>>",
        "inscriptionId": null
      }
    ]
  }
  ```

  Pages with no Gov Hub document (Edition) carry `mlNumber: null` and the sha256 of the local file. `inscriptionId` stays null until the exact revision is inscribed; the May drafts on chain are not 1.0 and must not be listed as its inscriptions. Weakness: a JSON file is not a decision. Anyone with repo access can change it.

- **(b) Edition as a Gov Hub record, adopted by a recorded decision.** New additive models: `BookEdition` (`id`, `work_id` = `desirableproperties-book`, `edition_id`, `label`, `status` = draft / in_progress / released, `predecessor_id`, `decision_outcome_id` → `DpSteeringOutcome`, `released_at`) and `BookEditionEntry` (`edition_id`, `rail_key`, `ml_number`, `submission_id`, `content_hash`). Releasing an edition is a steering decision (or whatever body Tension 1 names). The rail sync (`scripts/govhub_sync_rails_from_hub.py`) reads the edition from the Gov Hub API and writes the (a) manifest. The Edition page needs a Gov Hub document to fit.

- **(c) An edition stamp on travelling records.** Records that leave the book carry the edition with them:
  - `chapter-archives.json` entries: `editions: ["1.0"]` (a list, because a revision can be in several), and top level `current_edition: "1.0"` beside `current_label`;
  - inscription records: `edition`, `rail_key`, `revision`, `sha256` (Tension 8);
  - PDFs: the edition id and `manifestSha256` on the edition page and in the PDF metadata;
  - API responses (book, Canopi, Hermes): `edition` and `revision` on every chapter or passage returned.

  Bridges are not on this list (see the ruling below).

**Recommendation:** (b) as the source of truth, (a) generated from it by the rail sync, and (c) on every travelling record. Before any 1.1 change publishes, write the 1.0 edition record (with each rail's exact revision and sha256) and give 1.0 archive keys, since today 1.0 has neither.

**Who decides:** owner on the record form; steering on what enters 1.1.

**Ruling (15 Nov, later):** all three together, with bounds. Every draft revision, every approved proposal that goes into a revision, every inscription record and every PDF has an edition, and **they must agree**. **Bridges do not have an edition.** A bridge pinned to an archived revision can have that revision's edition looked up; it is never stored on the bridge.

**Model (proposed; conductor's design):**

- **Stamp = origin.** A revision's edition is the edition it was made for. It is set once, when the revision is created, from the edition in progress, and never changes. Field: `Submission.edition_id` in Gov Hub.
- **List = membership.** An edition record lists exact revisions (`BookEditionEntry`). An unchanged chapter is carried forward, so the 1.1 list can include a revision whose own stamp is 1.0.
- **Proposals.** A pending proposal has no edition of its own; it shows the edition of the text it targets (`submission_id`). When it is incorporated, it takes the edition of the revision it went into (`DpProposal.edition_id`, set with `incorporated_submission_id`).
- **"Agree" is a check**, run in CI and before any inscription:
  - a proposal's edition equals the edition of the revision it was incorporated into;
  - an inscription record's edition and sha256 equal the revision's;
  - a chapter PDF's edition equals its revision's;
  - a whole-book PDF is built from one edition's list, and every revision in it is on that list.

**API answers (open; the owner is still thinking).** Proposal:
- The API never computes or hard-codes an edition.
- An answer that returns or cites a revision reports that revision's edition, read from the edition record, with the edition's status (released or in progress).
- A request can name an edition (`?edition=1.0`) and gets exactly that edition's revision.
- With none named, it gets the live text, labelled with its edition and status.
- Answers not tied to a revision (lists of people, councils, bridges) carry no edition.

Open question: after 1.0, any published revision is already live through the rail sync, so the live book is "1.1 in progress". Should the default answer be the live text or the last released edition? Note that `chapter-archives.json` hard-codes `current_label: "Version 1.0"` today, which is already wrong for any chapter revised since 13 Nov.

### Tension 4. Which Bill of Rights wording is the source (Decided)

**Pulls one way:** the brief says represent the Bill of Rights accurately as historical source and do not modify the 2024 *Metaweb* text. **Pulls the other:** the second-edition plan (`metaweb-book/docs/second-edition-plan.md`) revises the Chapter 12 Bill of Rights: it says the Bill overclaims ("you have no privacy" ignores GDPR, CCPA and the DSA), wants cornerstones merged with rights where they duplicate, and says each right should be marked as secured by interface design, by community governance, or as an aspiration. D1 says no new chapters in the second edition; D25 routes all its changes through Gov Hub revisions. So the "historical source" is about to have a revised twin, and the Rights chapter could derive from either.

**Options:**
- A. Cite the first-edition wording verbatim as history; draft the Rights chapter fresh, using the second-edition plan's own rule (each right marked secured, governed or aspirational).
- B. Wait for the second edition's revised Bill and derive from it.
- C. Copy the ten rights as they are into the chapter.

**Recommendation:** A. The Rights Register records each right's origin as the first-edition Chapter 12 passage (pinned to its existing inscription), and links to the second-edition revision when it exists, with a historical bridge. The Rights chapter does not inherit the overclaims. The year should be confirmed before the word "2024" appears anywhere public.

**Ruling (15 Nov):** there is no conflict. Document what the first book said (*The Metaweb*, Chapter 12, verbatim, as history) and expand it in the DP book. The second edition's revision of Chapter 12 is its own lineage and does not change what the first book said. Left open: confirm the year before "2024" appears anywhere public.

### Tension 5. Rights as "the foundation of Desirable Properties", added after the DPs (Decided on framing)

**Pulls one way:** the chapter title says rights are the foundation; the brief adds Rights Impact Assessments for every substantive proposal. **Pulls the other:** 24 DPs were written and approved without them. The Introduction never uses the word "right"; DP4, DP14 and DP20 mention rights in passing. A foundation added afterwards is retroactive. A mandatory assessment is a new gate on every substantive proposal that no one has voted for. And when a right conflicts with an adopted DP, there is no rule for which wins.

**Options:**
- A. Keep the title; make rights binding; require an assessment on every substantive proposal from adoption.
- B. Present rights as the values the DPs serve; record links (supports, contradicts) without precedence; assessments optional and encouraged.
- C. Keep the title as proposed and let the vote settle it.

**Recommendation:** B for the milestone, with C on the title. The title is part of what steering votes on (chapter-title changes already need steering). Assessments start as an optional template on proposals. A conflict is recorded as a `contradicts` link and resolved by an ordinary patch to the DP or the right. Making assessments mandatory is a later governance rule under Tension 1.

**Ruling (15 Nov):** rights are the foundation of what we collectively want for our digital life and experience. Rights are the why; the DPs are the how. This is not a retroactive gate on the 24 DPs. Rights Impact Assessments stay optional until a rule is adopted. Still open (minor): who adopts that rule, and when.

### Tension 6. Two voting channels plus likes, and no proof of one person one vote (Decided for now)

**Pulls one way:** "likes are not votes", "votes counted under the applicable rules", "eligible members vote", voting integrity. **Pulls the other:**
- Formal votes: Gov Hub steering votes (`DpSteeringVote`, superseded never deleted) and co-editor approval.
- Signals that look like votes: Canopi patch votes (one per user), artifact support/opposition, `CommentLike`, DP-site UP/DOWN.
- Identity: Gov Hub `User` and Canopi `AppUser` are both keyed by Web3Auth verifier id but are separate tables. Account linking (PR #130) is unmerged. Tallies count rows, not people. Proof of unique humanity does not exist.

**Options:**
- A. One formal channel (Gov Hub); everything in Canopi is labelled a signal in the UI.
- B. Promote Canopi patch votes to formal votes.
- C. Fix the old `Vote`/`Ballot` engine for community-wide votes.

**Recommendation:** A. In the product, rename Canopi patch "votes" to something that cannot be confused with a decision, or label them "signal, not a decision". Under the Tension 1 ruling, the community vote on a new chapter is the first place this matters; until account linking ships, its results carry a duplicate-account caveat. Do not claim community-wide voting integrity until account linking and proof of unique humanity exist (connect accounts first, then unique humanity). Do not revive the `Vote`/`Ballot` engine without a privacy fix.

**Ruling (15 Nov):** accepted as true today, "but we have to evolve this". Gov Hub stays the one formal channel now. Canopi patch votes, likes and support/opposition are labelled signals in the product.

**Roadmap:**

| Step | What | Today |
|---|---|---|
| 1. Account linking | Link Gov Hub `User` and Canopi `AppUser`; multi-email login; signals counted per linked person | Open PR #130, unmerged |
| 2. Proof of unique humanity | One person, one counted voice | Does not exist; method open |
| 3. Community-wide votes | A ballot that counts people, keeps choices private, with eligibility set by an adopted rule | Old `Vote`/`Ballot` leaks choices and crashes; council electorates use `verified_account` |

Each step needs the one before. Until step 3, no community-wide vote result is presented as a decision.

### Tension 7. Living against historical bridges with unversioned anchors (Decided)

**Pulls one way:** a living bridge resolves to the current canonical version; a historical bridge resolves to an exact version or hash. **Pulls the other:** bridge anchors are URL plus TextQuoteSelector, with no version and no hash. A bridge on `/viewer/dpNN` follows live text but breaks when the quote changes; one on `/viewer/dpNN/<rev>` is effectively pinned. BRC222's entry rule judges a relationship from the two passages and their dates. A living bridge whose quote changes may no longer be true, and the judgment was made on the old wording.

**Options:**
- A. Add an optional version and content hash to bridge anchors (additive). Historical bridges carry both. Living bridges carry the version they were judged on; when the live quote changes, the bridge is flagged "needs re-check" rather than silently followed.
- B. Only historical bridges; "living" is a UI convenience that shows the latest revision next to the pinned one.
- C. Leave anchors as they are and use the URL pattern alone.

**Recommendation:** A. A living bridge is a historical bridge plus a pointer to "current", with re-verification when the text moves. Use the sha256 already in `chapter-archives.json`. Bridges stay authored by @bridger-one and verified before entering a registry; same-book pairs never corroborate or confirm; no Foreword anchors.

**Ruling (15 Nov):** option A, plus a new requirement: when a bridge breaks, the Overweb bridge registry writes a **bridge incident record**, and broken bridges can be shifted to the Wayback Machine.

**What exists today.**
- The Overweb registry checks anchors once, at intake (`src/anchors/ends.py`: "quote not found in the rendered chapter text", "quote not found on the fetched page"). Unreadable ends go to `unverifiable` and are retried. A verified bridge is re-checked only when it is edited or re-published upstream. Nothing re-checks verified bridges later, so a break today goes unnoticed.
- Every step is logged in `judgements`, an append-only public log. Statuses: pending, unverifiable, awaiting_judge, disputed, verified, rejected, withdrawn.
- Canopi's `wayback-tab` (`presence/src/features/WaybackTabManager.ts`) runs in the extension only, because the Wayback CDX API sends no CORS header. It opens Save Page Now for the current page, lists snapshots through the CDX API, opens archived versions and compares present against archive through the Wayback diff. It records nothing for bridges.
- Canopi also has a server-side capture queue (`services/waybackCaptureService.js`, migration 081, `wayback_captures`). It sends one Save Page Now request per new page version, dedups on `(page_key, content_hash)`, applies privacy guards (public discussion only, public hosts, no tokens, site opt-out, kill switch) and a daily cap per page. It is off unless `WAYBACK_CAPTURE=on`. Whether it is on in production is unknown.

**Design.**

1. **Versioned anchors** [New]. Each bridge end gains optional `revision` and `sha256`, plus `judged_text_sha256`: the hash of the quote and its context as the judges saw it.
   Bridges carry no edition (Tension 3). The edition of a pinned revision is looked up from the edition record when needed.
2. **Snapshot at verification** [New]. When a bridge is verified, request a Wayback capture of each outside end and store `snapshot_url` and `snapshot_timestamp` in the verification record. Then a copy of the judged wording always exists. Reuse Canopi's capture queue, with "bridge verified" as a new trigger reason under the same guards. For book ends, the archive route `/viewer/dpNN/<rev>` and its sha256 are the primary record; whether a Wayback capture of the JavaScript-rendered viewer contains the chapter text is unknown. If Wayback refuses (robots, exclusion), record no snapshot and the reason.
3. **Re-check** [New]. A worker in the Overweb registry re-checks verified bridges: book ends after each rail sync publishes a revision, outside pages on a schedule.
4. **Bridge incident record** [New], append-only like `judgements`. Fields:

   | Field | Meaning |
   |---|---|
   | `incident_id` | Stable id |
   | `bridge_id` | The bridge |
   | `end` | source or target |
   | `kind` | quote_not_found, page_moved, page_gone |
   | `detected_at`, `detected_by` | When; re-check worker, rail sync, or a person's report |
   | `judged_text_sha256`, `judged_revision` | What the bridge was judged on (no edition; look it up from the revision) |
   | `observed` | HTTP status, final URL, sha256 of the live text |
   | `cause` | If known (for example "r03 published"); otherwise unknown |
   | `repair` | Written as a later row: kind (re_anchored_archive, re_anchored_wayback, retired), new anchor, by whom, when, and the id of the re-judgement |

   A repair never edits the incident row; it appends one. The bridge moves to a new status `broken` while the incident is open, so the change feed tells mirrors such as Canopi.
5. **Repairs.** Book passage: re-anchor to the archived revision it was judged on (`/viewer/dpNN/<rev>`). Outside page: re-anchor to the Wayback snapshot (`https://web.archive.org/web/<timestamp>/<url>`). Then re-judge through the normal pipeline (two judges, agreement rule), since the anchor changed. If the quote is in neither, retire the bridge with the incident as its reason.
6. **Living bridges.** A living bridge follows the current revision while its quote is found. When a new revision removes or changes the quote, the re-check writes a `quote_not_found` incident with cause "new revision"; the bridge falls back to the archived revision and is flagged for a new judgement on the new wording.

Rules kept: bridges by @bridger-one, verified before entering a registry; same-book pairs never corroborate or confirm; no Foreword anchors. Canopi's `wayback-tab` can later show a broken bridge's incident and snapshot.

**Who builds:** Overweb registry (re-check worker, incident log, `broken` status); bridge registry and BRC222 schema (anchor fields); Canopi (capture trigger, mirror display).

### Tension 8. Inscription: permanence against living chapters, and sequence (Decided)

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

**Ruling (15 Nov):** Version 1.0 is not on chain, and the owner says inscribing it may be soon. The prerequisites stay visible:

1. **Edition record first** (Tension 3), so each inscription record carries `edition: "1.0"`, the rail, the Gov Hub revision, submission id and sha256.
2. **Inscribe from Gov Hub text**, the exact 1.0 revisions in the edition record. Never from Box 1 `~/BRC333`, which holds August text.
3. **Include the pages never inscribed:** Cover text, Edition, Foreword, About, Acknowledgements, DP23, DP24. The Edition page has no Gov Hub document; it needs one, or its sha256 from the book repo.
4. **Off-chain inscription record** per rail: edition, rail, revision, submission id, sha256, inscription id, block, timestamp, the predecessor inscription (the May draft on the same sat, if re-inscribed), and the decision reference (the 1.0 sign-off stage records).
5. **Confirm re-inscription on the same sat** works on the UniSat path (not documented today).
6. **Owner approval** for every inscription.

The Rights chapter is inscribed only as part of 1.1, after 1.1 is released.

### Tension 9. Nine phases against a small team: the smallest honest slice

**Status:** open. The owner asked for an explanation; no ruling yet.

**Pulls one way:** ten phases, three views, a register, a shared content model, AI and a trust-signal challenge. **Pulls the other:** the team is small and launch was 13 Nov. Several acceptance steps still wait on a decision (electorate, threshold and quorum for the community vote, Tension 1), and the 15 Nov rulings added work: the edition record and agreement check, steering's gate, a yes/no community ballot, versioned anchors, a re-check worker and bridge incident records.

**Options:**
- A. Build the whole Phase 1 to 5 model, then run the test.
- B. Run the 12 steps on staging with existing systems plus the minimum new pieces (section 5), and mark what is simulated.

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
| Edition | none [New]; decided to become a record (Tension 3) |

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

**Pulls one way:** the brief wants explicit, community-adopted governance. **Pulls the other:** steering (V1.1, volunteers) and the DP Council (drafted, unseated) are separate, and how they relate is an open owner decision. Under Tension 1, steering holds the gate on new chapters through V1.1; Phase 4's configurable policy needs a body that owns it after that.

**Recommendation:** decide after the first DP Council election, including whether the council takes over steering's gate on new chapters.

**Who decides:** owner; then the councils.

---

## 4. Revised phases

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

Start from: *The Metaweb* Chapter 12 Bill of Rights (ten rights); DP4, DP14, DP20.

Framing (decided, Tension 5): rights are the foundation of what we collectively want for our digital life and experience. Rights are the why; the DPs are the how.

- **Rights Register** [New, Decision 11]. One record per right, attributes as in the original: stable id, title, description, historical origin, source and citation, status, scope and interpretation, related and conflicting rights, supporting DPs and specifications, governance status, current and prior versions, proposals and decisions, contributors. Start it as a structured block generated from the adopted Rights chapter (or a JSON file in the DP repo next to `sources-sat.json`), not a new database.
- **Historical source** [Decided, Tension 4]. Document what the first book said: Chapter 12, verbatim, as history, pinned to its inscription. Do not modify it. Expand it in the DP book. Confirm the year before using "2024".
- **Proposed Rights chapter** [New; form decided (Tension 2); steering gate and community vote decided, electorate and threshold open (Tension 1)]. A new ML-Draft document on Gov Hub (next free number after 057) with an r01 marked proposed, on no rail. Belongs to Version 1.1 (Tension 3). Placed after the Introduction (ML-Draft-026) and before DP1 when adopted. DP numbering does not change. Not canonical until adopted.

### Phase 2: Shared content model [Partly]

Use what exists; add only what is missing.

| Brief's entity | Real system | Status |
|---|---|---|
| Book, Chapter | BRC333-BOOK; Gov Hub ML-Draft documents; rails in `sources-sat.json` | Implemented |
| Edition | Edition page only; `current_label` in `chapter-archives.json` | New; decided to become a record; form open (Tension 3) |
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

**Read** [Partly]. The viewer (`viewer.htm`) on desirableproperties.org already shows rails, archive routes `/viewer/dpNN/<rev>`, and Canopi discussion on passages. Needed: a rail and route for the Rights chapter (`viewer.htm` hard-codes rail keys), PDF and acknowledgements updates, an edition switcher (1.0 released, 1.1 in progress) driven by the edition record, the edition named on every chapter page and in the PDF, links to related rights and DPs.

**Explore** [New, Decision 11]. Nearest existing surfaces: Canopi `/anchor/[hash]`, `/tag/[label]`, `/c/[slug]`, the registry browsing API. Build entity pages for rights, DPs and specifications from the derived index; typed navigation over record links and bridges; timelines from Gov Hub history. Graph view only where it helps.

**Govern** [Partly]. Gov Hub already has proposals, patches and inserts, comments, steering votes, decision records and history. Needed: a way into it from the book for each passage; objections as a record; a clear split between signals and decisions (decided, Tension 6: Gov Hub is the one formal channel; everything else is labelled a signal).

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
| Optional Inscription | manual, irreversible | Partly; prerequisites decided (Tension 8) |
| Subsequent Revision | next revision r(N+1) | Implemented |

Requirements, with status:
- Likes are not votes [Partly; decided (Tension 6): Gov Hub is the one formal channel; Canopi patch votes, likes and support/opposition are labelled signals. Roadmap: account linking (PR #130), then proof of unique humanity, then community-wide votes].
- A proposal links to the exact target version [Implemented: `submission_id`, `content_hash_at_create`].
- Votes are counted under the applicable rules [Implemented for steering and co-editors].
- Eligibility, quorum, thresholds, timing configurable [New: today `VOTES_NEEDED = 2` is hard-coded; only roster and freeze time are config]. Move them into `site_config`. The first rule to set: the electorate, threshold and quorum for community votes on new chapters (Tension 1).
- Durable audit records [Implemented: `StatusChange`, `EventLog`, `DocumentHistory`, `DpSteeringVote`].
- Rejections and dissent remain accessible [Partly: declined and considered stay listed; no dissent record].
- No silent overwrite [Partly; Tension 13].
- Rights Impact Assessments [New; optional until a rule is adopted (Tension 5)].
- Governance parameters stay configurable until formally adopted [Partly decided: anyone proposes a chapter, steering gates, the community accepts (Tension 1)].
- Steering's gate on new chapters [New]: checks well-formed, in scope, not a duplicate; recorded as `DpSteeringOutcome` with reasons; refusals stay visible.
- Community chapter vote [New]: reuse the council ballot (`CouncilElection`, `CouncilBallot`) with a yes/no counting mode.

### Phase 5: Versioning and inscription [Partly]

- Immutable historical versions [Implemented: Gov Hub revisions; archive routes; sha256 in `chapter-archives.json`].
- One current canonical version per edition [New; decided (Tension 3): an edition record listing each rail's exact revision and sha256; a revision can sit in several editions; revisions after 1.0 belong to "1.1 in progress". Decided: a Gov Hub `BookEdition` record, a generated `editions` manifest, and an `edition` stamp set once on each revision; proposals, inscription records and PDFs must agree with it, checked in CI and before inscription; bridges carry no edition].
- Inscription of adopted revisions [Partly; prerequisites decided (Tension 8)]. The edition record first. Inscribe from Gov Hub text, never from Box 1 `~/BRC333`. Version 1.0 first, including the pages never inscribed (Cover text, Edition, Foreword, About, Acknowledgements, DP23, DP24). The Rights chapter with 1.1.
- Inscription metadata [New]. Off-chain record per inscription: artifact id, edition, version, content hash, decision reference, predecessor, contributors where authorized, inscription id, timestamp, provenance.
- Never place private messages, sensitive personal data or unreleased information on chain [kept].
- Living and historical bridges [New; decided (Tension 7)]:
  - versioned anchors: `revision`, `sha256`, `judged_text_sha256` on each bridge end (no edition);
  - a Wayback snapshot of each outside end captured at verification, reusing Canopi's capture queue (`services/waybackCaptureService.js`);
  - a re-check worker in the Overweb registry (book ends after each rail sync; outside pages on a schedule);
  - an append-only **bridge incident record** when a bridge breaks (quote not found, page moved, page gone), with a `broken` status in the change feed;
  - repair by re-anchoring to `/viewer/dpNN/<rev>` (book) or a Wayback snapshot (outside pages), then re-judging.

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

## 5. First milestone acceptance test

Run on staging (dev.interfacehub.net and staging.desirableproperties.org, which have their own database and can run a full proposal, vote and publish cycle). No production governance record changes.

| # | Step | Real mechanism | Status |
|---|---|---|---|
| 1 | A contributor creates a Rights chapter proposal | New ML-Draft document on staging Gov Hub, r01 marked proposed, on no rail; contributor recorded as author | Needs building (proposed flag; contributor-submitted r01). Decided: anyone may propose (Tensions 1, 2) |
| 2 | Another participant comments and gives evidence | Gov Hub comments on the document; Canopi discussion on the passage; evidence via `DpProposal.reference_url` or Canopi patch evidence | Implemented in Gov Hub. Canopi needs a viewer route for an unrailed document (needs building) |
| 3 | A participant suggests a specific patch | `DpProposal` (replace / insert / insert_after) against r01 `anchor_hash` | Implemented |
| 4 | Others endorse or challenge it | Artifact support/opposition, `CommentLike`, Canopi patch vote; challenge as opposition or comment | Partly (no objection record). Labelling decided (Tension 6): Canopi votes and likes shown as signals; needs building |
| 5 | Eligible members take part in a formal vote | Two votes on staging, with test accounts. First steering's gate: `DpSteeringVote`, recorded as `DpSteeringOutcome` with reasons. Then the community vote: a yes/no ballot on the council-election machinery. "Simulated" means staging, not a special mode (none exists) | Gate: implemented mechanism. Community vote: needs building (yes/no counting mode). Electorate, threshold and quorum: blocked on Decision 1 |
| 6 | The authorized process adopts a revision | After the community accepts, publish r02 on staging Gov Hub (stamped `edition_id` 1.1); rail sync to staging; r02 listed in edition "1.1" (status in_progress); edition-agreement check passes | Partly: needs a rail key in `sources-sat.json` and `viewer.htm`, the edition record and the agreement check. Design decided (Tension 3) |
| 7 | The adopted version appears in Read | `/viewer/<new key>` between the Introduction and DP1 on staging | Needs building (rail, route, navigation) |
| 8 | Its rights and relationships appear in Explore | Rights Register entries and entity pages from the derived index | Needs building. Blocked on Decisions 10 and 11 |
| 9 | Its decision history appears in Govern | Gov Hub `StatusChange`, `DocumentHistory`, `DpSteeringOutcome`, linked from the book | Implemented in Gov Hub; link from the book needs building |
| 10 | An amendment makes a new version; the original stays | Second patch, r03; r02 kept as a `Submission`, archived at `/viewer/<key>/r02` with sha256 in `chapter-archives.json` | Partly (archive move is a manual step today) |
| 11 | A simulated or test-network inscription records the version | Off-chain inscription record in staging with the Phase 5 metadata and `edition: "1.1"`, labelled simulated. Test network: unused `unisat_testnet` flag only | Needs building. Prerequisites decided (Tension 8); needs the edition record first |
| 12 | Historical and living bridges | Two bridges by @bridger-one in the staging Overweb registry, each with a Wayback snapshot or archive route recorded at verification: one pinned to r02 with its hash; one living, on a passage r03 changes, so the re-check writes a bridge incident record and the repair re-anchors it to `/viewer/<key>/r02` and re-judges | Needs building (anchor version and hash, re-check worker, incident record). Design decided (Tension 7) |

Steps 3, 5 (mechanism) and 9 (in Gov Hub) pass today. Steps 1, 4, 6, 7, 8, 11 and 12 need building. Still waiting on a decision: step 5 (electorate, threshold and quorum, Tension 1) and step 8 (Tensions 10 and 11).

---

## 6. Required initial deliverables (kept)

Before implementing major features:

- Architecture and repository inventory
- Prioritized implementation backlog
- Proposed database and API changes (additive)
- UI wireframes for all three views
- Governance workflow specification, including steering's gate and the community chapter vote (Tension 1)
- Versioning and inscription design (Tensions 3, 7, 8)
- Risks and dependencies
- Test plan
- First milestone execution plan

Then build the smallest complete vertical slice (Tension 9) on existing infrastructure.

**Success condition (kept):** a real community can transparently improve and govern its own living book while preserving historical records and making the resulting knowledge usable across multiple contexts and implementations.
