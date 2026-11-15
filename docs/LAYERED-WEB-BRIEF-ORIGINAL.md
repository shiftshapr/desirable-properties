# Claude Code Implementation Brief (original, as pasted by the owner on 15 Nov 2026; do not edit)

## The Layered Web: Living Book, Encyclopedia, and Governance

### Mission

Evolve the existing Desirable Properties book into The Layered Web, a community-governed knowledge environment with three integrated views:

1. Read: canonical book and chapters
2. Explore: encyclopedia of interconnected knowledge
3. Govern: proposals, deliberation, voting, and version adoption

Implement these on a shared content, identity, relationship, and governance foundation.

The first implementation milestone is the addition of a proposed Rights: The Foundation of Desirable Properties chapter, including community review, voting, adoption, and subsequent versioning.

Do not rewrite the original The Metaweb (2024) book. The second edition is a separate author-led project that will connect to The Layered Web using version-aware semantic bridges.

### Operating rules

* Inspect the actual repositories and live architecture before proposing code changes.
* Reuse existing DPs, proposal systems, Gov Hub workflows, APIs, authentication, roles, smart tags, versioning, and Digital Monument infrastructure.
* Treat this brief as a target design, not proof that any component already exists.
* Preserve existing content, identifiers, URLs, authorship, comments, and governance history.
* Do not introduce an independent encyclopedia database when the existing content or knowledge graph can provide the required functions.
* Do not change production governance rules without explicit approval.
* Do not submit real votes, alter canonical chapters, reinscribe artifacts, or publish production changes without approval.
* Prefer additive schemas, feature flags, migrations, and reversible deployments.
* Write tests and document all major design decisions.
* Explicitly distinguish implemented features from mockups and future specifications.

### Phase 0: Repository and architecture discovery

Inspect the repositories and infrastructure for:

* Desirable Properties book frontend and backend
* Gov Hub governance and proposal workflows
* Canopi / Overweb APIs, SDKs, and identity infrastructure
* Existing Nodes, Claims, and Artifacts model
* Current smart tags, discussions, patches, inserts, endorsements, and voting
* Content versioning and canonical publication
* Digital Monument and on-chain inscription mechanisms
* Cross-project identity, membership, and authorization
* Existing AI retrieval and knowledge-graph infrastructure

Produce:

1. Current architecture diagram
2. Capability inventory
3. Gap analysis
4. Proposed changes by repository
5. Data migration plan
6. Security and privacy risks
7. Recommended implementation sequence

Identify the existing source of truth for every major entity before creating new schema.

### Phase 1: Rights as a first-class content type

Introduce a Rights Register or equivalent representation.

Suggested attributes:

* Stable right identifier
* Title and description
* Historical origin
* Original source and citation
* Proposed or adopted status
* Scope and interpretation
* Relevant rights and potential conflicts
* Supporting DPs and specifications
* Governance status
* Current version and prior versions
* Proposals and decisions
* Contributors and provenance

Represent the 2024 Overweb Bill of Rights accurately as historical source material. Avoid retroactively modifying its wording.

Create a proposed Rights chapter placed after the Introduction and before DP1.

The chapter should initially be a community proposal, not automatically canonical.

### Phase 2: Shared content model

Use or extend existing entities to represent:

Content: Book, Edition, Chapter, Passage, Claim, Right, DP, Requirement, Specification, Artifact.
Participation: Person, Community, Membership, Comment, Reaction, Discussion, Contribution.
Governance: Proposal, Patch, Insert, Ballot, Vote, Decision, Objection, Appeal.
Engineering: Implementation, Repository, Test, Experiment, Result.
Preservation: Version, Inscription, Digital Monument, Content Hash.

Use typed relationships, including:

* derives-from
* motivates
* advances
* conflicts-with
* requires
* implements
* supports
* contradicts
* discusses
* proposes-change-to
* amends
* supersedes
* approved-by
* inscribed-as
* bridges-to

Use stable identifiers and explicit revision references.

Preserve the distinction between an entity's continuing identity and a particular immutable version of it.

### Phase 3: Read, Explore, and Govern

Build the three views around shared records.

Read view

* Chapter navigation and current canonical texts
* Rights chapter before DP1 after adoption
* Passage-level annotations, discussions, and contribution entry points
* Current and historical versions
* Visible links to related rights, evidence, DPs, and specifications

Explore view

* Encyclopedia browsing and search
* Entity pages for rights, DPs, specifications, artifacts, and people where appropriate
* Typed relationship navigation
* Provenance and historical timelines
* Links to source chapters and relevant decisions
* Graph visualization only where it improves comprehension

Govern view

* Open proposals and workgroups
* Comments and threaded deliberation
* Like / endorse / oppose signals
* Patches and inserts
* Structured amendment proposals
* Formal voting through the authorized governance system
* Decision records and publication history

A contribution made from any view should remain available in the relevant context across all views.

### Phase 4: Governance lifecycle

Implement or adapt an explicit lifecycle:

Draft → Submitted → Under Review → Deliberation → Decision → Adopted or Rejected → Canonical Version → Optional Inscription → Subsequent Revision

Important requirements:

* Likes do not automatically equal formal votes.
* A proposal links to the exact target version.
* Votes are counted only under the applicable governance rules.
* Eligibility, quorum, thresholds, and timing are configurable through explicit policy.
* Voting decisions generate durable audit records.
* Rejections, objections, and dissent remain accessible.
* Adopted changes never silently overwrite prior canonical versions.
* Rights Impact Assessments are supported for substantive proposals.

A Rights Impact Assessment should identify supported rights, potentially affected rights, trade-offs, alternative designs, and safeguards.

Initially, governance parameters should remain configurable until the community formally adopts them.

### Phase 5: Versioning and inscription

Treat every chapter as living, including inscribed chapters.

Support immutable historical versions and one unambiguous current canonical version per applicable edition.

A newly adopted revision may produce a subsequent Digital Monument inscription.

Inscription metadata should identify:

* Artifact identity
* Version
* Content hash
* Decision reference
* Predecessor version
* Contributors where authorized
* Inscription transaction or equivalent durable reference
* Timestamp and provenance

Never place private messages, sensitive personal data, or unreleased information on-chain.

Support both living bridges and historical bridges.

A living bridge resolves to the current canonical version. A historical bridge resolves to an exact version or content hash.

### Phase 6: Contextual discussion and the book as a commons

Attach discussion threads to exact passage and artifact anchors.

Preserve conversations across revisions by retaining original anchors and offering explicit relationships to revised passages.

Support live and asynchronous discussions through existing Canopi Events and related services where possible.

Investigate cross-platform participation, but do not imply that external messages are imported or published without authorization.

The durable book record should contain appropriately authorized contributions, evidence, decisions, and summaries.

### Phase 7: AI-assisted exploration

Integrate with existing Agent Lab or related AI infrastructure where available.

Support:

* Questions about individual chapters or passages
* Rights-to-DP gap analysis
* Comparisons between proposed revisions
* Summaries of discussions with source links
* Explanation of governance decisions
* Discovery of contradictory claims
* Version-aware retrieval
* Drafting assistance for rights, patches, and specifications
* Evidence-grounded investigation

The AI must distinguish canonical statements from drafts and independent commentary.

Every factual summary should expose its supporting records.

Preserve user privacy and enforce permissions. Do not expose private community information through shared retrieval or caching.

AI agents cannot independently cast governance votes, impersonate members, or adopt revisions.

### Phase 8: Just-in-Time Trust Signals challenge

Create the first rights-driven community challenge.

The workflow is:

Propose trustworthy digital engagement rights → map existing DPs → identify missing requirements → propose a trust-signal interoperability specification → review → implement an experimental Canopi interface → evaluate findings.

The prototype should explore:

* Signal types and structured claims
* Issuer provenance
* Evidence and method references
* Personal trust-source selections
* Community trust profiles
* Combined views
* Context-sensitive presentation
* Privacy-preserving signal discovery
* Uncertainty and disagreements
* AI synthesis with citations
* Corrections and revocation
* Accountable agent identity and authorization

Do not build an unsourced universal trust score.

Use synthetic or properly licensed demonstration data until integration agreements and privacy reviews are complete.

### Phase 9: Future Metaweb Second Edition integration

Provide interfaces for independently authored books to reference Layered Web artifacts.

Support stable living links and version-pinned links.

Do not modify or republish the 2024 Metaweb text.

A future People's Edition should be treated as a separate editorial lineage with explicit governance and appropriate publication rights.

### Security and privacy requirements

Assess:

* Identity and access control
* Community-specific permissions
* Private versus public discussion
* Voting integrity and duplicate account abuse
* Bot and AI-agent disclosure
* Proposal spam and reward manipulation
* Malicious external content and prompt injection
* Privacy-preserving retrieval
* False or defamatory trust assessments
* Appeals and corrections
* Publishing consent
* Inscription irreversibility
* Data export and deletion constraints
* Recovery from compromised accounts

### First milestone acceptance test

Demonstrate a complete Rights chapter lifecycle without altering existing production governance records:

1. A contributor creates a Rights chapter proposal.
2. Another participant comments and provides evidence.
3. A participant suggests a specific patch.
4. Other participants endorse or challenge it.
5. Eligible members participate in a simulated formal vote.
6. The authorized decision process adopts a revision in a test environment.
7. The adopted version appears in Read mode.
8. Its rights and relationships appear in Explore mode.
9. Its decision history appears in Govern mode.
10. A subsequent amendment produces a new version while the original remains accessible.
11. A simulated or test-network inscription records the newly adopted version.
12. The system demonstrates both historical and living semantic bridges.

### Required initial deliverables

Before implementing major features, provide:

* Architecture and repository inventory
* Prioritized implementation backlog
* Proposed database/API changes
* UI wireframes for all three views
* Governance workflow specifications
* Versioning and inscription design
* Risks and dependencies
* Test plan
* First milestone execution plan

Then implement the smallest complete vertical slice using existing infrastructure.

Success condition: A real community can transparently improve and govern its own living book while preserving historical records and making the resulting knowledge usable across multiple contexts and implementations.
