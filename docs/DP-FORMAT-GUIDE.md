# DP Chapter Format Guide

**Version:** 1.0 (draft) · **Measured on:** the 23 chapters `dp1.md`–`dp23.md` in `desirableproperties-book/content/local/` at `main` 635d794, October 31, 2026

This guide says what a Desirable Property chapter contains: which sections are required, which are optional and when to include them, and when a chapter has earned a section of its own. It codifies what the 23 chapters already do and settles the points where they disagree.

It sits beside three existing documents and does not replace them:

| Document | What it covers |
|---|---|
| [`DP-TEMPLATE.md`](../desirableproperties-book/content/local/DP-TEMPLATE.md) | The heading skeleton to copy for a new chapter |
| `/style-guide` ([`dp-style-guide.ts`](../challenge-site/src/data/dp-style-guide.ts)) | How to write: voice, MUST/SHOULD/MAY, headings, terms, punctuation, citations |
| [`DP-SECTION-MATRIX.md`](DP-SECTION-MATRIX.md) | Which optional and DP-specific sections each chapter has |
| **This guide** | What each section is for and must contain, and when to add a new one |

Chapters are edited on Gov Hub and synced here (see [`content/local/README.md`](../desirableproperties-book/content/local/README.md)). Structural changes to a chapter go through a Gov Hub proposal like any other edit.

---

## 1. Chapter anatomy at a glance

```
# DPn – Title                                  ┐
*Tagline*                                      │ Front matter (required)
![Illustration …](/content/local/assets/dp/DPn.webp)
<!-- dp-local-version … -->                    ┘

## Purpose of This Draft                       ┐
## Problem Statement                           │
## Threats and Failure Modes                   │ Core (required, in this order)
## Core Principle                              │
## Primary Mechanisms and Structural Conditions┘

## <DP-specific sections>                      ← only when warranted (Section 5)

                                               Middle (Section 4, in this order)
## Governance, Accountability, and Agency Surfaces ← required
## Incentives and Power Analysis               ← when it applies
## Community Signals Informing DPn             ← required
## Evaluation Criteria                         ← when it applies
## Implementation Patterns                     ← when it applies
## Foresight and Failure Design                ← when it applies

## Relationship to Other Desirable Properties  ┐
## Non-Goals and Explicit Boundaries           │
## Minimum DPn Alignment                       │ Closing (required, in this order)
## Open Questions and Future Work              │
## Path Toward ML-RFC                          │
## Closing Orientation                         ┘
```

Every `##` section is numbered (`## 7.`) and every subsection too (`### 7.2`). Sections are separated by `---`. Standard section headings use the exact wording above. Put any qualifier in the section's first sentence, not in the heading. DP14's "Threats and Failure Modes (Adversarial Model)" is the pattern to avoid.

**How often each section appears in the 23 chapters, and how long it typically runs:**

| Section | Part | Required | Chapters with it | Median length |
|---|---|---|---|---|
| Purpose of This Draft | Core | Yes | 23 | 175 words |
| Problem Statement | Core | Yes | 23 | 150 words |
| Threats and Failure Modes | Core | Yes | 23 | 500 words |
| Core Principle | Core | Yes | 23 | 115 words |
| Primary Mechanisms and Structural Conditions | Core | Yes | 23 | 860 words |
| Governance, Accountability, and Agency Surfaces | Middle | Yes | 23 (DP22 under another name, rename pending) | 275 words |
| Incentives and Power Analysis | Middle | When it applies | 19 (not DP10, 13, 21, 22) | 230 words |
| Community Signals Informing DPn | Middle | Yes | 23 | 145 words |
| Evaluation Criteria | Middle | When it applies | 9 | 235 words |
| Implementation Patterns | Middle | When it applies | 9 | 250 words |
| Foresight and Failure Design | Middle | When it applies | 18 (not DP8, 10, 18, 19, 21) | 290 words |
| Relationship to Other Desirable Properties | Closing | Yes | 23 | 190 words |
| Non-Goals and Explicit Boundaries | Closing | Yes | 23 | 175 words |
| Minimum DPn Alignment | Closing | Yes | 23 | 290 words |
| Open Questions and Future Work | Closing | Yes | 23 | 160 words |
| Path Toward ML-RFC | Closing | Yes | 23 | 125 words |
| Closing Orientation | Closing | Yes | 23 | 95 words |

Lengths are a guide to proportion, not a limit. A section several times its median length is usually carrying material that belongs in a DP-specific section (Section 5). One under a third of its median length usually needs a real paragraph or should be merged.

---

## 2. Front matter (required)

Every chapter opens with these four elements, in this order, before `## 1.`:

1. **Title.** `# DPn – Title`, with a spaced en dash. The title is the property's canonical name and matches `desirable-properties.json`.
2. **Tagline.** One italic line written for participants: what the property gives them, not what it specifies. All 23 chapters have one. The strongest taglines name a felt condition ("*The Conditions for Trust – …*"). Avoid version labels in the tagline (DP14's "*Epistemic Integrity (V2) – …*").
3. **Illustration.** `![Illustration for Desirable Property DPn: Title](/content/local/assets/dp/DPn.webp)`.
4. **Version comment.** `<!-- dp-local-version: X.Y | standardized: YYYY-MM-DD -->`. The `govhub-sync` comment below it is written by the sync script. Never write it by hand.

Then `---`, then `## 1.`.

---

## 3. Required core sections

These five open every chapter in this order. Together they answer: why this draft, what is broken, how it fails, the one rule, and how the rule is met.

### 3.1 Purpose of This Draft

**Job:** Says what the property is a condition for, and where it sits among the other DPs.

**Must contain**
- The property named in full on first use: "Desirable Property 12 (DP12) …".
- The gap it fills, in one or two sentences.
- Its nearest neighbors, with a phrase on how it differs ("If DP11 defines what ethical AI requires, DP12 defines who decides …").
- What the draft does *not* prescribe: a single tool, vendor, or governance model. Many chapters already say this, usually as "DPn does not prescribe …".

**Avoid:** Restating the Problem Statement. Purpose is about the draft; Problem is about the world.

### 3.2 Problem Statement

**Job:** Describes how today's web fails on this dimension, as a structural problem rather than a list of complaints.

**Must contain**
- The present-day failure, concretely.
- Named recurring failure patterns, usually as a short list ("scale shock", "governance theater").
- A reframing sentence that sets up the Core Principle ("DP3 reframes governance as adaptive infrastructure …").
- Sources for any factual claim about the world (style guide, *Evidence and sources*).

**Subsections:** Optional. Use them when the problem has distinct layers (DP1: 2.1 limits of login-centric trust, 2.2 structural failure modes, 2.3 a shift in framing). A Problem Statement over about 400 words should be split into subsections.

### 3.3 Threats and Failure Modes

**Job:** Names who or what will attack or erode the property, and how.

**Must contain**
- One `###` subsection per threat or actor (scammers, capture by stakeholders, procedural overload …).
- For each one: a one-line description, a **`**Example:**`** line, and a **`**Why this matters:**`** line. This is the most consistent pattern in the book: 277 Example lines across 22 chapters and 189 Why-this-matters lines across 20.
- At least one non-malicious failure mode (drift, lag, overload), not only adversaries.

**Note:** Threats look ahead to known, present adversaries. *Foresight and Failure Design* (Section 4.6) covers how the system degrades over time and at scale. Keep a threat in one place.

### 3.4 Core Principle

**Job:** States the one rule the whole chapter defends.

**Must contain**
- One principle statement in a sentence or two, quotable on its own. A blockquote is acceptable.
- Usually followed by the three-line triad used in 18 chapters:
  - `**Example:**` – a concrete case of the principle working.
  - `**What this feels like:**` – the participant's experience.
  - `**Without this:**` – what breaks.

**Avoid:** A second principle section later in the chapter. DP8's §9 "Core Principles (Normative and Enforceable)" duplicates this section. Several principles mean either one principle with listed conditions, or requirements that belong in Primary Mechanisms.

### 3.5 Primary Mechanisms and Structural Conditions

**Job:** Says how the principle is met: the concrete mechanisms, requirements, and conditions a system needs.

**Must contain**
- The mechanisms, each as a `###` subsection or a clearly bounded list.
- The chapter's binding requirements, in capital MUST / SHOULD / MAY, one per sentence, each naming who it applies to (style guide, *Requirements*). This section and Minimum DPn Alignment are the only places capital keywords belong.

**Size:** The longest section in most chapters (median 860 words, up to 2,850). When one mechanism grows past about 300 words with subsections of its own, promote it to a DP-specific section (Section 5) and leave a one-sentence pointer here.

---

## 4. Middle sections

These six sit after any DP-specific sections and before the closing block, in this order. Two are required: Governance, Accountability, and Agency Surfaces (4.1) and Community Signals Informing DPn (4.3) are in every chapter. The other four are conditional: include each one when the chapter has something specific to say. A generic paragraph that could be pasted into any chapter does not justify a conditional section.

### 4.1 Governance, Accountability, and Agency Surfaces

**Required.** Every property has to be visible, contestable, and changeable by the people it governs, so every chapter says how. All 23 chapters have it. DP22 has it under its own name, "Governance Conditions for Civic Memory" (§16.1 Accountability surfaces, §16.2 Participant agency surfaces). A rename to the standard heading has been prepared as a Gov Hub proposal.

**Contains:** Two lists, "Participants must be able to …" and "Communities must be able to …", followed by an `**Example:**` of the surface at the interface (DP12: "Policy A (v3.2) … file an appeal that triggers a review queue").

### 4.2 Incentives and Power Analysis

**Include when:** Money, ranking, attention, or control could pull behavior away from the property. 19 chapters include it. It is reasonable to leave out when the property is mainly about experience or capability (DP10 Education, DP21 Multi-modal).

**Contains:** What must be visible or controllable (optimization targets, ranking criteria, economic relationships). Then named capture patterns in bold (`**incentive override:**`, `**sponsor capture:**`), then what the DP expects in response.

### 4.3 Community Signals Informing DPn

**Required.** All 23 chapters have it. This section ties the chapter to what the community actually said. It is where the book shows it was written with participants, not for them.

**Contains:** The recurring signals from community input, as a short list in the participants' terms. Then one or two sentences on what they mean structurally ("These signals are not usability complaints. They indicate …").

**Avoid:** Inventing signals. Each signal should trace to submissions, workgroup discussion, or Gov Hub comments.

### 4.4 Evaluation Criteria

**Include when:** Alignment can be tested from outside and the tests are not already obvious from Minimum Alignment. Nine chapters include it: DP7, 10, 14, 16, 18, 19, 21, 22, 23.

**Contains:** Diagnostic questions grouped by `###` dimension (DP7: continuity of meaning, symmetry of movement, enforceability after transfer). Each question is written so that a "no" identifies a specific defect.

**Distinct from Minimum Alignment:** Minimum Alignment says what a system must do. Evaluation Criteria says how an outside reviewer would find out.

### 4.5 Implementation Patterns

**Include when:** There are known, reusable design moves a builder can adopt incrementally. Nine chapters include it: DP7, 9, 10, 16, 18, 19, 21, 22 (as "Implementation Pathways"), 23.

**Contains:** Named patterns as `###` subsections (DP7: public conformance suites, object envelopes, lossiness manifests …). Each is a few sentences on what to build and which criterion or requirement it satisfies.

### 4.6 Foresight and Failure Design

**Include when:** The property will be contested or will degrade over time, at scale, or under future technology (adaptive AI, quantum, capture). 18 chapters include it. It descends from the "Foresight and Minefield Thinking" element in the original DP definitions.

**Contains:** Likely failure paths in bold-label form (`**governance lag:**`, `**hidden override pathways:**`). Then the pre-mortem design that answers them: circuit breakers, sunset conditions, drift detection.

---

## 5. DP-specific sections – when a new section is warranted

Nearly every chapter (22 of 23; DP14 is the exception) has at least one section that no other chapter has. These sections are where a chapter goes deep on what makes its property distinct. They are also where chapters most often lose shape, so they have the strictest entry test.

### 5.1 The families that already exist

Every DP-specific section in the 23 chapters falls into one of these families. A new section should fit one too.

| Family | What it is | Examples |
|---|---|---|
| **A. Key Element deep-dive** | A named element of the property's original definition (`docs/desirable_properties.md`, "Key Elements") that needs more than a subsection of Primary Mechanisms. The most common family. | DP1 Federated Strong Authentication; DP1 Adaptive Intelligence Integration (RLADP); DP3 Scalable Governance Patterns; DP4 Data Vaults and Personas; DP6 Meta-Community Economies; DP9 Developer Reach; DP10 PEARL Digital Badges; DP11 Constitutional AI; DP11 Personal and Community AI; DP15 Security Core, Provenance and Archive; DP17 Funding Models, Token Ecosystems; DP20 Knowledge Graph Stewardship |
| **B. System Layer** | How the property behaves as a layer across systems: continuity, integrity, adversarial resilience. It uses a fixed heading form: "*X* System Layer: *A*, *B*, and *C*". | DP1 Identity System Layer; DP2 Agency System Layer; DP5 Namespace System Layer; DP7 Interoperability System Layer; DP22 Civic Memory Layer |
| **C. Entry condition** | A precondition for any participation, stated before the mechanisms that build on it. | DP1 Federated Strong Authentication (Entry Condition); DP23 Linguistic Access as an Entry Condition |
| **D. Reference model** | A technical specification precise enough to implement or test: objects, protocols, state machines, taxonomies, architectures. | DP5 Primary Namespace Objects, Name Resolution Protocol, Namespace State Machine, Namespace Attack Taxonomy, Meta-Domain Registry Architecture; DP8 System Architecture |
| **E. Process or rollout** | How the property is produced or adopted over time: phases, milestones, decision processes. | DP12 AI Governance Processes; DP16 Milestone Framework, Phased Rollout |
| **F. Cross-DP binding** | A mechanism this DP shares so tightly with one or two others that a single sentence under Relationship to Other Desirable Properties cannot carry it. | DP13 Cross-DP Loop: Relationship to DP11 and DP12; DP8 AI Governance (DP12 Link) |
| **G. Tensions and tradeoffs** | Real conflicts inside the property that a reader must weigh, with no single right answer. | DP2 Tensions and Tradeoffs; DP22 Tensions and Tradeoffs |

### 5.2 The entry test

A new `##` section is warranted only when **all four** of these hold:

1. **It fits a family.** The material is one of A–G above. If it fits none, it is probably a subsection of an existing section or belongs in another DP.
2. **It is too big for a subsection.** It carries at least about 250 words and two or more `###` subsections of its own. Below that size, make it a `###` under Primary Mechanisms or the closest standard section.
3. **It is not a standard section in disguise.** It does not duplicate the job of a section in Sections 3–4 or 6. Cases in the book that fail this test:
   - DP8 "Core Principles (Normative and Enforceable)" duplicates Core Principle and Primary Mechanisms.
   - DP13 "Cross-DP Loop" passes only because it carries a full mechanism. A list of links would belong in Relationship to Other Desirable Properties.
   - DP23 "Strong DP23 Alignment" and "Failure Conditions" are Minimum Alignment content. They should be subsections of it (see Section 6.3).
   - DP23 "Initial Implementation Path" is a family E rollout plan, but it sat inside the closing block. Because it sequences the chapter's Implementation Patterns, it belongs as a subsection there. Path Toward ML-RFC is about maturing the specification, not about building it.
   - DP23 "Proposed Constitutional Statement" is a third principle quote. It belongs as the last lines of Closing Orientation, so Core Principle keeps the one principle statement.
4. **This DP owns it.** When two DPs both cover an idea, it lives fully in one (style guide, *Cross-references*). Before adding a section, check that another chapter does not already own the topic. DP19's "Inclusion and Localization" (76 words) overlaps DP23 and should be a pointer to it.

**Strong signals that a section is warranted**
- Primary Mechanisms has a subsection that has grown past about 300 words and is still growing.
- Co-editors keep proposing inserts to the same place in Primary Mechanisms.
- A Key Element from the original definition has no clear home in the chapter.
- Builders need a reference model (objects, states, protocol steps) to implement the property.

**Signals that it is not**
- The proposed section would be under about 120 words with no subsections. DP2 §7–8, DP10 §10, DP18 §7, DP19 §7–9, and many of DP22's 18 extra sections are this size. Each is a candidate for merging into a neighbor.
- Its heading names a relationship ("Relationship to Existing Platforms") or a feeling rather than a mechanism.
- Its content restates points made elsewhere in the chapter. Extend the existing passage instead (style guide, *Synthesis, not stacking*).

### 5.3 Placement, naming, and numbering

- **Placement:** Put DP-specific sections immediately after Primary Mechanisms and before the middle sections, as the template says. A Category C entry-condition section comes first. A Category G tradeoffs section comes last among them. Seven chapters (DP7–DP12, DP20) currently place them after the middle sections. Move them when those chapters are next revised.
- **Naming:** Title case, a noun phrase naming the thing ("Data Vaults and Personas", not "How DP4 Handles Vaults"). Family B uses the "*X* System Layer: *A*, *B*, and *C*" form.
- **Numbering:** The new section takes the next number in its position, and every later section is renumbered, including in-chapter cross-references ("Section 7.2"). `scripts/renumber_dp_section_headings.py` renumbers; run the cross-reference audit (`DP-SECTION-NUMBER-AUDIT.md`) afterward.
- **Bookkeeping:** Add the section to the chapter's row in `DP-SECTION-MATRIX.md`.

### 5.4 How many

Most chapters carry one or two DP-specific sections (14 of 23). Chapters with a technical reference model justify more (DP5 has nine). If a chapter passes about seven, the property may be two properties, or the sections may be subsections of a smaller number of parents. DP22 (18 extra sections) and DP23 (14) are the chapters to review first.

---

## 6. Required closing sections

These six close every chapter, in this order. Together they bound the property, make it testable, and hand it forward.

### 6.1 Relationship to Other Desirable Properties

**Contains:** One line per related DP in a contrastive form: "DPx does A; DPn ensures B" (DP12's section is the model). Then one closing sentence on what the other properties lose without this one. Most chapters relate to 10–15 others. Name only the real relationships.

### 6.2 Non-Goals and Explicit Boundaries

**Contains:** "DPn does not:" followed by a short list (guarantee unanimity, replace legal systems, mandate a single tool …). Then one sentence on what the property *does* define. This section protects the chapter from scope creep and from being read as a product spec.

### 6.3 Minimum DPn Alignment

**Contains:** The testable baseline a system must meet to claim alignment, written as capital-keyword requirements, one per sentence, each naming who it applies to. Then one sentence on what the system is if any requirement is missing ("… governance is functionally symbolic").

**Heading:** "Minimum DPn Alignment", with the DP number and no "(Non-Normative)" label. Under the style guide, this section holds requirements, so the label contradicts it. DP14 and DP15 currently omit the DP number. All 23 chapters still carry the label (see Section 7).

**Optional subsections** (instead of new sections): "Strong DPn alignment" for what a strongly aligned implementation adds, and "Failure conditions" for when a system must not claim alignment. These are DP23's §25–26, which belong here. The move is drafted, together with DP23's §27 and §28 moves (Section 5.2), as one dedup bundle in [`bundles/dp23-minimum-alignment.json`](bundles/dp23-minimum-alignment.json).

### 6.4 Open Questions and Future Work

**Contains:** One framing sentence ("These questions are not blockers; they are invitations …"). Then genuinely unresolved questions, where reasonable implementers currently disagree, not tasks waiting for someone to do them.

### 6.5 Path Toward ML-RFC

**Contains:** The concrete steps from draft to ML-RFC: schemas to standardize, reference implementations, pilots, conformance tests, and who to iterate with. Progress is measured by working systems, not by documents.

### 6.6 Closing Orientation

**Contains:** Three to five short paragraphs, no lists. What the property ultimately decides, then "When DPn is strong, … When it is weak, …", then one final sentence a reader will remember. No new content. Nothing here should be news to someone who read the chapter. A short quotable statement of the property, such as DP23's proposed constitutional statement, may close the section as a blockquote.

---

## 7. Where the 23 chapters stand against this guide

The deviations below were found in this review. No chapter has been changed. Fixes go through Gov Hub proposals as chapters are next revised.

| Issue | Chapters |
|---|---|
| Closing block out of order (Non-Goals, Minimum Alignment, and Open Questions before Relationship; Foresight inside the closing block) | DP13, DP14, DP15, DP16, DP17 |
| Content before Purpose of This Draft ("Orientation"), and a section between Purpose and Problem ("Reality Anchors") | DP22 |
| DP-specific sections after the middle sections | DP7, DP8, DP9, DP10, DP11, DP12, DP20 |
| Qualifiers in standard headings | DP14 (§3, §13–§16) |
| Standard section under a non-standard name | DP22 §16 "Governance Conditions for Civic Memory" (rename to "Governance, Accountability, and Agency Surfaces" prepared) |
| Duplicate principle section | DP8 §9 |
| "(Non-Normative)" on Minimum Alignment, which holds requirements | All 23. Removed by the Gov Hub style-pass bundle (`create_style_pass_bundles.py`), which has not yet been run in production. It skips chapters with a pending dedup bundle (DP3, 6, 9, 12, 20, 22 as of October 31, 2026). The DP23 bundle above also removes it. |
| "Minimum Alignment" without the DP number | DP14, DP15 |
| Alignment, rollout, or principle content as new sections instead of subsections | DP23 §25–28 (one bundle drafted); DP22 §23 "Minimum Viable Civic Memory Layer", §27 "Without DP22" |
| DP-specific sections under about 120 words with no subsections (merge candidates) | DP2 §7–8; DP5 §14; DP10 §10; DP18 §7; DP19 §7–9; DP22 several |
| Section overlapping another DP's ownership | DP19 §8 Inclusion and Localization (DP23) |
| `DP-SECTION-MATRIX.md` out of date with the chapters | e.g. DP1 lists 3 of 7 DP-specific sections; DP21 lists "Multimodal Devices and Interfaces; Accessibility", but the chapter has "Multi-Modal Intelligence and Data Fusion" |

---

## 8. Checklist for a new or restructured chapter

- [ ] Title, italic tagline, illustration, and version comment present, in that order
- [ ] Five core sections present, in order, with standard headings
- [ ] Threats use `###` per threat with **Example** and **Why this matters**
- [ ] Core Principle is one quotable statement; no second principle section
- [ ] Capital MUST / SHOULD / MAY only in Primary Mechanisms and Minimum DPn Alignment
- [ ] Governance, Accountability, and Agency Surfaces and Community Signals Informing DPn present
- [ ] Each conditional section included has something specific to this DP
- [ ] Each DP-specific section passes all four tests in Section 5.2 and sits after Primary Mechanisms
- [ ] Six closing sections present, in order, with standard headings
- [ ] Sections and subsections numbered; in-chapter cross-references updated
- [ ] `DP-SECTION-MATRIX.md` row updated
