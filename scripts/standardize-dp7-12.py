#!/usr/bin/env python3
"""Standardize content/local/dp7.md .. dp12.md against DP-TEMPLATE.md and DP-SECTION-MATRIX.md.

Existing prose is preserved verbatim; only top-level headings are renamed to the
canonical tier names, sections are reordered by tier, and missing sections are
generated (marked with <!-- generated: ... --> ).
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("/home/ubuntu/desirable-properties/desirableproperties-book/content/local")
STAMP = "<!-- dp-local-version: 1.0 | standardized: 2026-07-27{extra} -->"

TITLES = {
    7: ("Simplicity and Interoperability",
        "The Meta-Layer is designed to reduce friction, not add it — prioritizing clarity, composability, and seamless interaction across domains."),
    8: ("Collaborative Environment and Meta-Communities",
        "The Meta-Layer supports real-time collaboration that travels across the web — so your people are always close."),
    9: ("Developer and Community Incentives",
        "The Meta-Layer gives developers and community builders the tools and incentives to create shared value across the web."),
    10: ("Education",
         "The Meta-Layer supports dynamic, AI-powered learning tools that adapt to you — not the other way around."),
    11: ("Safe and Ethical AI",
         "The Meta-Layer makes AI transparent, explainable, and aligned with human values and community goals."),
    12: ("Community-based AI Governance",
         "AI systems in the Meta-Layer are governed not by corporations — but by the communities that use them."),
}

EXTRA_STAMP = {12: " | source: DP12 V1.1"}


# --------------------------------------------------------------------------- #
# parsing helpers
# --------------------------------------------------------------------------- #

def norm_title(raw: str) -> str:
    t = raw.strip()
    t = re.sub(r"^\*\*(.*)\*\*$", r"\1", t).strip()
    t = re.sub(r"^\d+\.\s*", "", t).strip()
    t = re.sub(r"^\*\*(.*)\*\*$", r"\1", t).strip()
    return t


def strip_trailing_rules(body: str) -> str:
    body = body.rstrip()
    while body.endswith("---"):
        body = body[: -3].rstrip()
    return body


def parse(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    sections: dict[str, str] = {}
    current: str | None = None
    buf: list[str] = []
    for line in lines:
        m = re.match(r"^##\s+(?!#)(.*)$", line)
        if m:
            if current is not None:
                sections[current] = strip_trailing_rules("\n".join(buf))
            current = norm_title(m.group(1))
            buf = []
        elif current is not None:
            buf.append(line)
    if current is not None:
        sections[current] = strip_trailing_rules("\n".join(buf))
    return sections


def extract_sub(body: str, sub_pattern: str) -> tuple[str, str]:
    """Pull a `### ...` block matching sub_pattern out of `body`.

    Returns (remaining_body, block_without_its_heading).
    """
    lines = body.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.match(r"^###\s+(?!#)", line) and re.search(sub_pattern, line):
            start = i
            break
    if start is None:
        raise SystemExit(f"sub-section not found: {sub_pattern}")
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if re.match(r"^###\s+(?!#)", lines[j]):
            end = j
            break
    block = "\n".join(lines[start + 1: end])
    remaining = "\n".join(lines[:start] + lines[end:])
    return strip_trailing_rules(remaining) + "\n", strip_trailing_rules(block)


def promote(block: str) -> str:
    """Raise `#### x` sub-heads to `### x` after a block becomes a top-level section."""
    out = []
    for line in block.splitlines():
        m = re.match(r"^####\s+(?!#)(.*)$", line)
        if m:
            out.append("### " + re.sub(r"^\d+(\.\d+)*\s+", "", m.group(1).strip()))
        else:
            out.append(line)
    return "\n".join(out)


def render(entries: list[tuple[str, str]]) -> str:
    parts = []
    for title, body in entries:
        body = re.sub(r"\n{3,}", "\n\n", strip_trailing_rules(body).lstrip())
        parts.append(f"## {title}\n\n{body}\n")
    return "\n---\n\n".join(parts)


def write(dp: int, entries: list[tuple[str, str]]) -> None:
    name, tagline = TITLES[dp]
    stamp = STAMP.format(extra=EXTRA_STAMP.get(dp, ""))
    head = f"# DP{dp} – {name}\n\n*{tagline}*\n\n{stamp}\n\n---\n\n"
    (ROOT / f"dp{dp}.md").write_text(head + render(entries) + "\n---\n", encoding="utf-8")


def G(slug: str, text: str) -> str:
    return f"<!-- generated: {slug} -->\n\n{text.strip()}"


# --------------------------------------------------------------------------- #
# generated content
# --------------------------------------------------------------------------- #

DP7_EVAL = """
DP7 alignment cannot be assessed by inspecting an API surface. It must be evaluated by moving real objects across real boundaries and measuring what survives.

The following criteria are diagnostic rather than exhaustive. Each is written so that a negative answer identifies a specific structural defect rather than a general complaint.

### Continuity of meaning

- After transfer, can objects still be interpreted without access to the origin system?
- Do identity, reputation, and credential objects retain the context that made them meaningful (source, method, scope)?
- Can a receiving system reconstruct lineage across multiple hops?

### Symmetry of movement

- Is export as capable, fast, and complete as import?
- Are fees, rate limits, and friction comparable in both directions?
- Are material asymmetries disclosed at the point of decision rather than in terms of service?

### Enforceability after transfer

- Do governance rules continue to bind behavior in the receiving environment, or do they degrade to advisory text?
- Are precedence rules declared when the origin and destination policies conflict?
- Can a community refuse, quarantine, or probate an import under its own policy?

### Integrity and verifiability

- Are signatures, authorship, and timestamps preserved and checkable?
- Are broken lineage chains flagged as risk rather than treated as benign gaps?
- Can a participant reject a degraded import without losing the rest of their history?

### Disclosure of loss

- Does the system state, before the transfer commits, what meaning will be lost and what guarantees will no longer apply?
- Is degradation signaled in the interface at decision time, not only in logs?
- Are transfers blocked or gated when degradation cannot be described?

### Auditability

- Does every cross-system transfer produce a receipt naming what moved, how it was transformed, and who mediated it?
- Can aggregate interop flows be audited for capture and leakage without exposing individual participants?
- Are disputes, reversals, and postmortems linked back to the schema, policy, or bridge change that caused them?

### Anti-capture posture

- Are indexes, relays, registries, and discovery surfaces controlled by more than one party?
- Can a competing implementation pass a public conformance suite without privileged access?
- Do discovery rankings resist paid or incumbent advantage for pluggable tools?

### Participant experience of exit

- Can a non-technical participant leave with their identity, history, balances, and rights intact?
- How long does a complete exit take, and what is measurably lost?
- Is the exit path tested regularly, or only claimed?

**Why this matters:** Interoperability claims are cheap. These criteria convert the claim into an observable property of a specific transfer between two specific systems.
"""

DP7_IMPL = """
These patterns translate DP7 into design moves that can be adopted incrementally. None of them require a global standards body, and each can be evaluated against the criteria above.

### Public conformance suites

Publish versioned, executable test suites for every shared interface. Any implementation can run them, and results can be published as attestations. Conformance becomes evidence rather than assertion.

### Object envelopes with declared intent

Wrap every portable object in an envelope carrying schema version, intended use, trust assumptions, consent scope, and signature. Receiving systems enforce constraints from the envelope rather than inferring them.

### Lossiness manifests

Ship every mapping with a machine-readable statement of what is preserved, transformed, and dropped. Interfaces render the manifest as a plain-language preview before a transfer commits.

### Receipt logs for transfers

Emit a signed receipt for every import and export, linked to the policy version applied and the mediating party. Receipts are queryable by the participant, the origin community, and the destination community.

### Probation tiers for new integrations

Admit third-party tools at reduced privilege and visibility. Increase capability as audits pass and non-abusive usage accumulates. Demote automatically on policy violation, with a public receipt explaining why.

### Bridge attestation and risk tiers

Treat bridges and translators as accountable actors with published operators, audit history, and risk tiers. Apply circuit breakers, volume caps, and anomaly detection proportional to tier.

### Dual-write migration windows

During schema evolution, write both old and new representations for a bounded period, with explicit deprecation dates and migration guidance. Historical continuity is preserved rather than reconstructed later.

### Scheduled exit drills

Periodically perform and publish a full export-and-reimport of a representative account into an independent implementation. Report duration, failures, and losses. Untested exit paths are assumed broken.

### Federated discovery with reputation weighting

Distribute indexing and discovery across multiple operators, weight surfacing by reputation and audit status, and rate-limit new entrants to resist flooding without gatekeeping participation.

### Degradation-aware interfaces

Standardize visual and textual signals for reduced guarantees, so participants encounter the same vocabulary of degradation across tools rather than per-platform euphemisms.
"""

DP8_THREAT_INDEX = """
DP8 names its failure modes inline throughout the sections that follow, because each mechanism fails in a specific way. The list below indexes that vocabulary so it can be tested, monitored, and referenced as a set.

**Governance that does not bind**

- **phantom governance**: rules exist but do not change visibility, amplification, or access
- **declarative governance**: governance artifacts are published but not machine-enforceable
- **governance stripping**: constraints are lost when content or participants cross a boundary
- **module bypass**: a governance module influences outcomes without passing enforcement checks

**Context and continuity failures**

- **context collapse**: rules carry silently across zones that do not share norms or risk
- **governance fragmentation**: state does not persist across pages, sessions, or systems
- **zone conflict ambiguity**: overlapping rules resolve non-deterministically
- **interop deception**: transfers claim preservation of governance that did not survive
- **semantic mismatch**: signals are reinterpreted incorrectly across implementations

**Participation and influence failures**

- **tier gaming** and **fast-track escalation**: influence accrues without verifiable contribution
- **privilege ossification**: roles never decay, entrenching early participants
- **amplification spoofing**: automation or sybil identities drive high-impact reach
- **reputation laundering**: signals are reshaped across contexts to manufacture trust
- **cross-zone escalation**: standing in one zone confers illegitimate power in another
- **throughput abuse**: volume substitutes for trust

**Automation failures**

- **AI governance bypass**: agents act outside zone-defined constraints
- **identity masking** and **attribution gaps**: AI is indistinguishable from humans, or unattributable
- **scope creep** and **irrevocable delegation**: delegated authority expands or cannot be withdrawn
- **automation overrun**: agent actions are neither interruptible nor reversible
- **consent bypass via pipelines**: data or inference constraints are lost between stages

**Systemic failures**

- **governance capture**: coordinated influence or opaque concentration of decision power
- **brigading**: coordinated surges that overwhelm legitimate participation
- **composed attack success**: individually mitigated vectors succeed in combination
- **perverse incentives**: abuse is profitable, funding further attacks
- **fail-open amplification**: under load or uncertainty, systems default to permissive behavior
- **governance opacity** and **silent rule drift**: decisions and changes cannot be reconstructed
- **governance rigidity**: communities cannot evolve or fork their governance model

**Why this matters:** These are not incident categories to be triaged after the fact. Each names a condition that can be monitored continuously, and each has a corresponding structural condition elsewhere in DP8.
"""

DP8_MECH = """
DP8 differs structurally from most Desirable Properties: its mechanisms are specified as an architecture rather than a flat list of conditions. The sections that follow this one carry that specification in depth. This section states the structural conditions that must hold regardless of how the architecture is implemented, and points to where each is elaborated.

### Enforcement must occur at the point of interaction

Governance rules bind before actions propagate, at the interface layer, not in a platform backend that reviews outcomes afterward. Overlays, extensions, and native integrations are the execution surface. Elaborated in **System Architecture** (overlay-based governance, 5.1–5.2) and **Governance Composition** (composition constraints, 8.2).

### Policy must be attached to context, not to platforms

Zones are the unit of governance: composable, overlapping, portable policy containers that declare participation thresholds, governance rules, AI permissions, and trust signals. Rules do not leak silently across zone boundaries, and boundary transitions signal changes in guarantees. Elaborated in **System Architecture** (5.3, 5.4.1–5.4.4).

### Capability must be tiered, stateful, and revocable

Participation maps to enforced tiers with entry conditions, verifiable progression, and decay. Capability cannot be acquired out of band, and high-impact actions require proofs proportional to their reach. Elaborated in **Participation Model**.

### Automation must be a governed actor class

AI agents hold verifiable identity, bounded scope with expiry, disclosure at the interface, and revocation pathways. Agents are subordinate to zone policy at runtime, not to policy documents. Elaborated in **AI Governance (DP12 Link)**.

### Governance must be composable without becoming bypassable

Voting, moderation, reputation, access control, and dispute resolution operate as modules with typed and scoped outputs, declared precedence, and bounded feedback cycles. Elaborated in **Governance Composition**.

### Every governance action must produce reconstructable evidence

Attribution, authority, applied rules, outcome impact, and appeal traces are recorded so that decisions can be audited and contested. Elaborated in **Minimum DP8 Alignment** (10.7) and the auditability requirements of **Path Toward ML-RFC** (12.4).

### Degradation must be safe and visible

Under load, uncertainty, or attack, systems move toward stricter defaults — reduced amplification, higher proof requirements, narrower scopes — and disclose that they have done so. Elaborated in **Core Principles (Normative and Enforceable)** (4.9) and **Threats and Failure Modes**.

### Communities must be able to evolve and fork

Governance stacks are versioned, forkable, and migratable, with explicit signaling to participants when rules change. Continuity of governance does not mean permanence of a single configuration. Elaborated in **System Architecture** (5.4.8) and **Governance Composition** (8.4).

**Failure mode:** **architecture without conditions**, where a system implements zones, overlays, and modules as features while leaving enforcement, continuity, attribution, or degradation unspecified.
"""

DP8_GOV = """
Governance in DP8 is the subject matter of the property, not an adjacent concern. What this section adds is the requirement that the governance system itself be governed: that participants and communities can see how rules were made, act on them, and hold their operators accountable.

A zone can enforce rules perfectly and still be illegitimate if the participants subject to those rules cannot inspect, influence, or leave them.

Participants must be able to:

- see which zone they are in, which rules apply, and which guarantees are currently active or degraded
- understand their own tier, how it was assigned, what it permits, and what would raise or lower it
- see when a governance action affected them, under what authority, and with what stated reason
- contest decisions through a defined appeal path with timelines and reachable outcomes
- distinguish human from automated actors and inspect the scope of any agent acting in the zone
- exit a zone without forfeiting identity, history, or standing held outside it (DP1, DP7)

Communities must be able to:

- author, version, and fork their governance configuration without vendor permission
- assign, bound, and revoke steward authority, including term limits and decay
- audit enforcement in aggregate for bias, over-escalation, and missed harm without exposing individuals
- publish precedence rules for overlapping zones and the arbitration path when they conflict
- suspend or roll back a rule that produced harm, with the rationale recorded in governance memory
- bind third-party tools and agents to zone policy as a condition of operating in the zone

Stewards must be accountable in the same terms as participants. Moderation, adjudication, and rule configuration are high-impact actions, and DP8 treats them as attributable governance events rather than administrative privileges.

**Example:** A participant's comment is down-ranked in a civic zone. The interface shows which rule applied, which steward or module executed it, the evidence class cited, and the appeal window. The appeal enters a queue with a published service level, and the outcome is written to governance memory whether or not the appeal succeeds. A quarterly audit reports how often that rule was applied, to whom, and how often appeals reversed it.

**Failure mode:** **steward exceptionalism**, where enforcement is auditable for participants but discretionary and unlogged for those who hold authority.
"""

DP8_INCENTIVES = """
Governance competes with incentives. Where the two diverge, incentives usually win, because they operate continuously while governance operates episodically.

DP8 therefore treats amplification, visibility, and reputation as economic surfaces, not neutral mechanics. Whoever controls what becomes visible controls what becomes true in practice, and that control has value that others will pay to acquire.

Predictable pressures on community-defined governance include:

- **attention arbitrage:** actors invest in tier progression or steward proximity because visibility is monetizable, not because they value the community
- **moderation cost shifting:** platforms externalize enforcement labor onto unpaid stewards while capturing the resulting engagement value (DP9, DP17)
- **steward capture:** small groups accumulate adjudication authority because turnover is unrewarded and continuity is required for competence
- **compliance theater as competitive advantage:** systems adopt the vocabulary of zones and tiers without enforcement, then compete against systems that pay the real cost of enforcing
- **engagement-weighted defaults:** ranking systems inherited from the host platform quietly override zone policy at the margin
- **sanction externalities:** zones export sanctions and advisories to shift enforcement cost outward, or withhold them to avoid reputational exposure

DP8 therefore expects:

- disclosure of the optimization targets operating inside a zone, including any inherited from the host environment
- the ability for communities to set hard gates that incentives cannot bypass (DP12), rather than weights that incentives can outbid
- compensation or resourcing pathways for stewardship labor, so that governance capacity does not depend on volunteer exhaustion (DP9, DP17)
- rotation, decay, and shared authority as structural defenses against entrenchment rather than as norms of good behavior
- no material reward for abusive throughput, so that brigading and farming are unprofitable rather than merely prohibited

**Why this matters:** A zone whose rules are enforceable but whose incentives reward circumventing them will drift toward circumvention. Governance holds only where the cheapest path is also the compliant one.
"""

DP8_SIGNALS = """
Community input across the Meta-Layer submission process, moderation research, and platform governance experience converges on a consistent set of signals. They are not requests for more moderation. They are reports that governance is not real where it matters.

Recurring signals include:

- moderation experienced as arbitrary because the rule, the actor, and the evidence are never shown together
- rules that apply visibly to ordinary participants and invisibly, if at all, to influential ones
- communities that build norms in one environment and lose them entirely when the conversation moves
- reputation that cannot be carried, or that arrives stripped of the context that made it meaningful
- suspicion that a substantial share of amplification is automated, with no way to verify or contest it
- exhaustion among the people who actually do moderation and facilitation work
- distrust of appeals processes that accept submissions but produce no observable outcome
- concern that AI participants already operate with effective autonomy while governance debates continue
- marginalized communities reporting that automated enforcement misreads their context and vocabulary as violation

These signals identify structural breaks rather than usability defects: enforcement without attribution, continuity without portability, participation without impact, and automation without constraint.

DP8 treats them as design requirements. A zone that cannot answer "which rule, applied by whom, on what evidence, and how do I contest it" has not implemented governance regardless of how many controls it exposes.
"""

DP8_REL = """
DP8 is the layer at which the other properties become locally binding. It supplies the context — the zone — in which identity, agency, data, incentives, and automation are constrained in ways a specific community can define and defend.

- **DP1** supplies the identity and attribution guarantees that make tiers, roles, and governance actions accountable; without it, participation integrity and capture resistance cannot hold
- **DP2** supplies participant agency, ensuring zone rules change outcomes participants can perceive and control rather than preferences they merely configure
- **DP3** supplies the adaptive governance patterns through which zone rules evolve, fork, and scale beyond a single community
- **DP4** supplies purpose binding and consent propagation, so that moderation, ranking, and reputation cannot launder data use through governance actions
- **DP5** supplies stable naming and resolution for zones, roles, and governance artifacts so that references survive movement
- **DP7** carries governance state across systems and requires honest signaling of what degraded in transit; DP8 defines what must not be silently lost
- **DP9** aligns rewards with sustained contribution, so influence cannot be purchased through throughput and stewardship labor is resourced
- **DP11** defines the ethical floor for AI participation that zone policy tightens but may not fall below
- **DP12** turns zone rules into executable policy objects with receipts; DP8 defines what communities are entitled to govern
- **DP13** enforces containment, sandboxing, and rate limits that make zone constraints binding on automated actors
- **DP14–DP15** supply transparency and provenance for governance decisions, making auditability and contestability practical
- **DP18** supplies feedback and reputation dynamics that participation tiers depend on
- **DP20** ensures communities own their governance configuration and can fork it, rather than licensing it from an operator

A failure in any of these layers surfaces inside DP8 as illegitimate governance: rules that exist, apply unevenly, and cannot be traced or changed.
"""

DP8_NONGOALS = """
DP8 does not:

- prescribe a single governance model, voting method, moderation policy, or tier structure
- require communities to converge on shared norms, or treat disagreement between zones as a defect
- guarantee that community-defined governance produces good, fair, or wise decisions
- eliminate moderation, expertise, delegation, or stewardship roles in favor of pure direct participation
- replace legal systems, jurisdictional obligations, or platform liability
- promise that every governance guarantee survives every interoperability boundary, only that loss is signaled rather than hidden
- treat zone autonomy as a shield against baseline safety, identity, data, and AI constraints defined elsewhere in the stack
- assume communities are internally homogeneous or that majority processes protect minorities within them

DP8 defines the conditions under which community-defined governance is enforceable, portable, attributable, and contestable. It does not define what communities should decide.
"""

DP9_IMPL = """
These patterns turn DP9 from a set of legitimacy conditions into operational choices a program can adopt now. Each is compatible with multiple funding models and none require a token.

### Published incentive constitution

Ship the program's rules as a versioned document with machine-readable metrics, weights, constraints, eligibility, appeal paths, funding sources, and sunset conditions. Changes are diffed, dated, and announced before they take effect.

### Rubric-first review

Publish the scoring rubric and reviewer conflict disclosures before submissions open. Score against the rubric, publish aggregate score distributions afterward, and report where reviewers disagreed.

### Retrospective allocation with evidence bundles

Reward demonstrated outcomes rather than proposals for a portion of each pool. Contributors submit evidence bundles — artifacts, usage, downstream reuse, audits — that reviewers score against published criteria.

### Reward event splitting

At each value-generating event, distribute across the primary contributor, the interface layer, the access layer, and shared infrastructure using declared split rules, so invisible layers are not systematically unpaid.

### Streaming maintenance grants

Fund upkeep as a continuous stream tied to documented care work (triage, security patches, dependency updates, accessibility fixes) with periodic review rather than reapplication. Escrow vests against evidence.

### Probation and staged payout

Pay new contributors in tranches as work is verified. Farming attempts are throttled at the first tranche rather than after full payout, and legitimate contributors reach full rate quickly.

### Quality-weighted throttles

Rate-limit rewardable actions per identity and per time window, weight signals by uniqueness and downstream usage, and discount clustered or synthetic behavior pending review (DP13).

### Portable contribution receipts

Issue signed receipts for every allocation, naming the metric applied, the version of the rubric, the evidence cited, and the responsible reviewer or process. Receipts travel with the contributor (DP7, DP15).

### Public appeal queues with service levels

Run appeals as a visible queue with stated timelines, published outcome categories, and periodic reporting on reversal rates. Appeals are governance evidence, not customer support.

### Circuit breakers and pool freezes

Define in advance the anomaly thresholds that pause a pool, who may trigger a freeze, how long it may last, and what must be published when it happens. Carry funds forward rather than forfeiting them.

### Reachable on-ramps

Provide mentorship pairing, translated rubrics, asynchronous participation, regional eligibility, and small first-contribution bounties so that program access does not depend on language, timezone, or insider familiarity (DP10).

### Post-round impact reporting

Publish what was funded, what shipped, what failed, what was rejected for gaming, and what the program changed as a result. Reporting closes the loop between allocation and evidence.
"""

DP9_REACH = """
DP9 pairs incentives with reach, because compensation without distribution is a grant program rather than an ecosystem. A developer who can be paid but cannot be found, installed, or trusted has no durable position in the Meta-Layer.

Reach in the meta-layer means that a tool built once can operate across contexts, be discovered on merit, and accumulate reputation that its author keeps. In today's web, distribution is the primary lever platforms use to extract terms after dependency forms: rankings change, APIs close, and the cost of the switch falls entirely on the builder.

### Build once, operate across contexts

Overlay apps, smart tags, agents, and services bind to shared interfaces rather than to a host platform. A tool written against declared interfaces operates wherever those interfaces are honored, and its author is not required to maintain per-platform variants to remain reachable (DP7).

### Permissionless publication with governed operation

Publication does not require approval. Operation requires conformance: declared permissions and data scopes, runtime binding to zone policy, containment tiers and rate limits, signed artifacts with provenance, and auditable event logs (DP12, DP13, DP15). Openness is at the point of entry; accountability is at the point of execution.

### Discovery that cannot be bought outright

Discovery surfaces weight conformance, audit status, and reputation earned through non-abusive usage. New entrants begin in a probation tier with limited visibility and graduate on evidence. Paid placement, where it exists, is labeled and cannot displace merit-based surfacing.

### Reputation the builder keeps

Install counts, audit results, incident history, review outcomes, and contribution receipts are portable artifacts bound to the builder's identity rather than to a store listing. Leaving a distribution surface costs distribution, not history (DP1, DP7).

### Stable interface contracts

Interfaces are versioned, publicly tested, and deprecated on published schedules with migration guidance. Dependency is safe when the terms of dependency cannot change without notice.

### Reach for community builders, not only code

Facilitation, moderation, curation, translation, and education produce reach in the same sense: a well-run zone, a maintained glossary, or a trusted collection carries audience and credibility. DP9 treats these as distributable contributions eligible for the same discovery and reward surfaces (DP10, DP19).

**Example:** A two-person team publishes a provenance-checking sidebar. It appears immediately in a probation tier, declares read-only annotation access, and runs sandboxed with signed logs. As communities adopt it and audits pass, its visibility and permissions expand. Six months later the team moves to a different distribution surface; installs must be re-earned, but audit history, reviews, and contribution receipts move with them.

**Failure mode:** **distribution hostage-taking**, where reach is granted cheaply, becomes load-bearing, and is then repriced against builders who cannot leave.

**Failure mode:** **conformance as gatekeeping**, where safety requirements are set at a cost only incumbents can pay, converting legitimate constraints into a moat.
"""

DP9_MECHANISMS = """
The structural conditions above define what makes an incentive system legitimate. This section catalogs the concrete instruments that satisfy them, and the specific way each fails. No single instrument is sufficient; healthy ecosystems run several with different time horizons and risk profiles.

### Bounties

Fixed rewards for scoped, verifiable tasks. Fast, legible, and well suited to defect repair, accessibility fixes, and integration work.

- **Requires:** clear acceptance criteria, reviewer capacity, and duplicate-claim handling
- **Failure mode:** volume optimization, where payment per task invites low-quality submission floods

### Grants

Forward-looking allocation for proposed work. Suited to exploratory or infrastructural efforts that cannot be scoped as tasks.

- **Requires:** published rubrics, conflict disclosure, staged milestones, and timely payout
- **Failure mode:** proposal craft displacing delivery, and insider advantage in selection

### Retrospective funding

Backward-looking allocation for demonstrated impact. Removes proposal overhead and rewards work that was done without a promise of payment.

- **Requires:** evidence bundles, impact criteria, and protection against popularity proxies
- **Failure mode:** visibility bias, where legible work is funded and load-bearing invisible work is not

### Matching pools

Community signal amplified by a shared pool, so that many small endorsements direct larger allocation.

- **Requires:** sybil resistance and identity-aware weighting (DP1, DP13)
- **Failure mode:** collusion rings and wealth-weighted signal masquerading as community preference

### Streaming rewards

Continuous payment tied to ongoing conditions rather than discrete events. Suited to maintenance, moderation, facilitation, and stewardship.

- **Requires:** liveness checks, documented care work, and review with graceful termination
- **Failure mode:** annuity capture, where streams persist after the work stops

### Reward splitting

Automatic distribution of a value event across contributing layers, including the primary contributor, the interface, the access layer, and shared infrastructure.

- **Requires:** attribution lineage and declared split rules (DP15, DP20)
- **Failure mode:** endpoint capture when lineage is missing, and split gaming when it is manipulable

### Commons levies and reciprocity fees

Charges on commercial beneficiaries of shared infrastructure, routed to its maintenance.

- **Requires:** transparent basis of assessment and independent stewardship of proceeds (DP6, DP17)
- **Failure mode:** rent extraction under the language of reciprocity

### Stewardship endowments

Long-horizon funds that pay for critical upkeep independent of annual program cycles.

- **Requires:** governed disbursement, published mandate, and succession planning
- **Failure mode:** endowment capture, where control of the fund becomes the prize

### Recognition and credentials

Non-financial rewards: attribution, credentials, badges, and roles that carry across systems.

- **Requires:** evidence backing, portability, and revocability (DP7, DP10, DP18)
- **Failure mode:** recognition substituting for compensation

### Ownership and stake pathways

Conversion of sustained contribution into governance rights and long-term value participation.

- **Requires:** clear vesting, decay, and enforceable rights rather than symbolic tokens (DP20)
- **Failure mode:** extractive participation, where contributors generate value but never acquire standing

### Clawbacks and negative incentives

Reversal or reduction of rewards when outcomes prove harmful, fraudulent, or abandoned.

- **Requires:** defined triggers, appeal paths, and bounded retroactivity
- **Failure mode:** arbitrary retroactive punishment that makes participation unpredictable

**Why this matters:** Instrument choice determines behavior more than stated program values. A system that funds only launches will produce launches; a system that funds only tasks will produce task volume. Portfolios of instruments, published with their failure modes, are what allow incentive systems to be debugged rather than merely defended.
"""

DP10_GOV_ADD = """
Governance of education is also a matter of agency for those being educated. Learners are not only subjects of curriculum decisions; they are participants whose comprehension, objections, and lived context are evidence about whether the material works.

Learners must be able to:

- see who authored a learning material, when it was last reviewed, and whether it is current
- see the version and provenance of any glossary term, including dispute status
- submit structured feedback on clarity, accessibility, or error, and see its resolution status (5.14)
- contest a badge decision, request review, and have the outcome recorded
- understand what an AI Learning Assistant can and cannot do, and reach a human instead
- learn in their own language and modality without receiving a degraded version of the material (DP21, DP23)
- decline data collection about their learning without losing access to the learning itself (DP4)

Communities and educators must be able to:

- author, adapt, and translate materials for their own context without seeking central approval
- set stricter conditions for youth-facing and high-stakes materials
- issue, review, and revoke credentials under published criteria
- audit badge issuance for farming, bias, and inconsistency
- retire or mark outdated materials and publish what changed

Institutions must be able to evaluate learning evidence without acquiring control of the learning process. Recognition should flow toward evidence, not toward whoever administers the platform (5.7, 5.8).

**Failure mode:** **curriculum capture**, where a single authority determines what counts as understanding and learners have no route to contest it.

**Failure mode:** **feedback theater**, where learners can report confusion but materials never change.
"""

DP10_SIGNALS = """
Signals from educators, parents, youth participants, community facilitators, and self-taught builders converge on a consistent picture: access to information has increased while support for developing understanding has not.

Recurring signals include:

- newcomers reporting that documentation assumes the knowledge it is supposed to provide
- participants who can operate tools but cannot explain the rights, risks, or governance around them
- communities discovering mid-conversation that they have been using the same words differently
- educators asking for materials that work in a classroom without a technical prerequisite
- parents and caregivers looking for accessible guidance on synthetic media and AI companions, and finding whitepapers
- learners with disabilities encountering onboarding that assumes dense text, video, and high bandwidth
- concern that AI assistants produce fluent answers while leaving learners less capable than before
- skepticism about badges, driven by experience with credentials that signal attendance rather than capability
- informal educators, translators, and peer mentors doing substantial teaching work that no system recognizes
- youth participants reporting that they are addressed as an adoption target rather than as future stewards

These are not requests for more content. They describe a missing layer: contextual, accessible, community-grounded learning with recognition that travels.

DP10 treats these signals as requirements. A system that cannot be learned by the people it governs is not public infrastructure, however open its specifications.
"""

DP10_NONGOALS = """
DP10 does not:

- prescribe a single curriculum, pedagogy, learning platform, or credentialing authority
- require formal education, enrollment, or institutional affiliation to participate in the meta-layer
- treat credentials as a prerequisite for rights, access, or standing
- guarantee that learning produces agreement, or treat disagreement as a comprehension failure
- replace schools, libraries, universities, employers, or professional certification
- mandate AI-assisted learning, or prohibit it
- require participants to disclose learning history, difficulty, or progress as a condition of access (DP4)
- assume literacy, bandwidth, language, ability, or device access as a baseline
- promise that all learning can be evidenced, or that unevidenced learning is invalid

DP10 defines the conditions under which learning remains accessible, adaptive, community-grounded, and portable. It does not define what participants must know.
"""

DP10_MINIMUM = """
Minimum alignment is not a feature checklist. It is the threshold at which a system can be learned, questioned, and grown into by the people it affects, rather than only by those who already understand it.

A DP10-aligned implementation should, at minimum:

- provide a plain-language entry path that explains what the system is, what participants can do, and what risks exist, before requiring any consequential action (5.1)
- disclose complexity progressively, with role-specific pathways rather than a single undifferentiated onboarding flow
- publish a versioned glossary with plain-language definitions, provenance, dispute status, and access at the point of confusion (5.5)
- disclose AI learning assistance clearly, bound its scope, cite sources for educational claims, express uncertainty, and provide escalation to a human (5.3, DP11)
- back any credential with evidence, and support verification, correction, revocation, and appeal (**PEARL Digital Badges**, 5.8)
- make credentials and learning artifacts portable across systems and legible to institutions without transferring control of the learning process (5.7, 5.8, DP7)
- provide accessible alternatives for every core educational artifact across ability, language, modality, device, and bandwidth (5.13, DP21, DP23)
- accept structured learner feedback and connect it to material revision with visible resolution status (5.14, DP18)
- teach governance and agency alongside tool use, including how to contest decisions and participate in rule-making (DP2, DP3)
- mark or retire outdated materials rather than leaving stale guidance in circulation
- avoid conditioning access to learning on data collection about the learner (DP4)

Partial compliance that provides tutorials without accessibility, badges without evidence, AI assistance without disclosure, or feedback without revision should not be treated as alignment. Each of those omissions reproduces the failure DP10 exists to prevent: a system that can be operated but not understood, and therefore not governed.
"""

DP11_CONSTITUTIONAL = """
DP11 requires that ethical constraints be legible, bounded, and contestable at runtime. A recurring implementation strategy is to give an AI system an explicit written constitution — a ranked set of principles the system is trained and prompted to follow, and against which its own outputs are critiqued and revised.

This approach is valuable because it externalizes values into text that can be read, argued with, and versioned. It is insufficient on its own, because a constitution authored by a single laboratory, applied uniformly across every context, and enforced only by the model itself reproduces the concentration of authority DP11 exists to constrain.

DP11 therefore treats constitutional methods as necessary infrastructure with specific conditions attached.

### Constitutions must be public and versioned

The operative text, its ranking or precedence structure, and its change history must be publicly inspectable. Participants cannot evaluate a system against principles they cannot read, and silent revision is indistinguishable from having no constitution at all.

**Failure mode:** **constitutional opacity**, where a system claims principled behavior and declines to state the principles.

### Authorship must be accountable and plural

Whoever writes the constitution exercises governing power over everyone the system touches. DP11 requires that authorship be attributable, that the process for revision be stated, and that affected communities have a route to propose, contest, and — within their own zones — tighten provisions (DP12).

**Failure mode:** **unilateral constitutionalism**, where a vendor's values are presented as universal ethics.

### Constitutions must not be uniform across unequal stakes

A single global rule set cannot govern casual conversation and medical guidance appropriately. Baseline constraints apply everywhere; zones layer stricter provisions where stakes are higher (5.5, 5.14). Zone provisions may raise the floor but may not lower it.

**Failure mode:** **flattened ethics**, where uniformity is mistaken for fairness.

### Self-critique must not be the only enforcement

A model evaluating its own compliance is evidence, not verification. Constitutional adherence must be checked by mechanisms outside the model: capability envelopes, runtime policy binding, containment, logging, and independent audit (5.1, 5.6, DP12, DP13).

**Failure mode:** **self-certified compliance**, where the system grades its own behavior and reports a pass.

### Conflicts must resolve visibly

Principles collide: helpfulness against harm avoidance, transparency against privacy, autonomy against protection. A usable constitution declares precedence and records which principle governed a contested decision, so the tradeoff can be reviewed rather than inferred (5.13, 5.15).

**Failure mode:** **hidden arbitration**, where the system resolves value conflicts silently and consistently in its operator's favor.

### Drift must be detectable

Retraining, fine-tuning, prompt changes, and optimization pressure move behavior away from stated principles. DP11 requires ongoing measurement of the gap between constitutional text and observed behavior, with published results and rollback pathways (3.3).

**Failure mode:** **constitutional drift**, where the document remains stable while behavior does not.

### Participants must be able to see the constitution at the point of interaction

A constitution that exists only in a research paper does not inform judgment. Interfaces should surface the governing rule set, its version, and the zone provisions in force, with access to the full text (5.12, and **Governance, Accountability, and Agency Surfaces**).

**Failure mode:** **paper ethics**, where principles are published for reviewers rather than made available to the people affected.

**Example:** An assistant operating in a community health zone shows that it is governed by baseline constitution v4.2 plus three zone provisions requiring citation of clinical sources, prohibiting diagnostic language, and mandating escalation on distress indicators. When a response is modified, the interface names which provision applied. The zone's audit log shows how often each provision fired, and a quarterly report compares stated provisions against measured behavior.

**What this feels like:** The rules governing the system are something you can read, cite, and argue with — not something you infer from how it behaves.
"""

DP11_PERSONAL = """
Most current AI deployment places the agent on the operator's side of the relationship. The system knows the participant, is funded by someone else, and optimizes for objectives the participant cannot see. DP11's disclosure, bounding, and contestability requirements reduce the harm of that arrangement but do not change its structure.

Personal and community AI changes the structure. An agent that a participant or community controls — whose objectives they set, whose memory they hold, and whose operation they can inspect and stop — is the configuration in which ethical AI is easiest to sustain, because accountability and interest are aligned by default rather than by regulation.

DP11 does not require personal or community AI. It requires that this configuration remain possible, and that its specific risks be addressed rather than assumed away.

### Personal agents

A personal agent acts on behalf of one participant, under their instruction, with their data.

Conditions:

- **Principal clarity:** the agent's principal is unambiguous, disclosed to counterparties, and cannot be silently reassigned (DP1, 5.2)
- **Participant-held memory and data:** context, history, and inferences remain under participant control, portable and deletable (DP4, DP7)
- **Inspectable objectives:** the agent's goals are stated and editable by the participant, not inherited from a vendor's optimization target (5.12)
- **Bounded delegation:** scopes are explicit, time-limited, renewable, and revocable, with a reachable stop control (5.1, 5.3)
- **Disclosure to others:** counterparties can tell they are interacting with a delegated agent and identify the responsible human (**Governance, Accountability, and Agency Surfaces**)
- **Exit without loss:** switching providers preserves memory, preferences, and history (DP7)

**Failure mode:** **captured advocate**, where an agent presented as acting for the participant is funded by, and optimized for, someone else.

**Failure mode:** **delegation without comprehension**, where a participant authorizes scopes they cannot evaluate and inherits responsibility for outcomes they did not anticipate.

### Community agents

A community agent acts on behalf of a group under its governance: summarizing deliberation, surfacing precedent, drafting policy, facilitating moderation, or maintaining shared knowledge.

Conditions:

- **Governed authority:** scope, capabilities, and escalation paths are set by community governance rather than by the operator (DP8, DP12)
- **Attributable action:** every action names the agent, the authorizing rule, and the responsible steward (5.2, 5.15)
- **Contestability by members:** members can challenge outputs, request human review, and trigger rollback (5.13)
- **Bounded influence:** agents inform ranking, framing, and summary but do not hold decision authority over material outcomes (DP8, DP12)
- **Plurality preservation:** summarization and synthesis must represent disagreement rather than manufacturing consensus (5.8, 5.16.3)
- **Forkability:** communities can modify, replace, or leave with their accumulated context intact (DP7, DP20)

**Failure mode:** **synthetic consensus**, where a community agent's summaries become the record and minority positions disappear from it.

**Failure mode:** **governance outsourcing**, where deliberation load is shifted to an agent and participation atrophies until the agent's framing is the only framing available.

### Shared conditions

Both configurations require:

- capability envelopes and containment equivalent to any other agent, since ownership does not reduce risk to third parties (5.1, DP13)
- confidence propagation, so that participant-owned agents do not launder uncertainty into confident personal advice (5.16)
- resourcing models that do not reintroduce hidden optimization: local execution, participant-funded operation, or community-funded infrastructure (DP17)
- literacy support, so that control is exercisable rather than nominal (DP10)

**Why this matters:** Ethical AI is easier to maintain when the agent's interests are structurally aligned with the participant's than when misalignment must be continuously disclosed, bounded, and policed. Personal and community AI are not a substitute for DP11's requirements. They are the arrangement in which those requirements are cheapest to satisfy and hardest to quietly abandon.
"""

DP12_PROCESSES = """
DP12 requires that governance be executable, but execution presupposes decisions. This section specifies the processes by which communities produce, revise, and retire the policy objects that the execution layer binds to behavior.

Process design is where governance legitimacy is won or lost. A system can bind policy perfectly to runtime and still be illegitimate if the policies were authored by a few, adopted without notice, and never revisited.

### Proposal and standing

Communities must define who may propose a rule, what a proposal must contain, and how it enters consideration.

- proposals declare scope, affected actors, expected behavioral change, and enforcement hooks
- standing to propose is stated explicitly, including whether affected non-members may petition
- proposals are versioned artifacts from the moment they are filed, not messages in a channel

**Failure mode:** **agenda capture**, where the ability to put a question forward is the real locus of power.

### Deliberation with bounded load

Deliberation must scale without collapsing into either noise or delegation to whoever has the most time.

- time-boxed comment periods with published start and end
- structured argument capture, so positions and evidence are linked to the proposal rather than scattered
- sampling, juries, or randomized panels where full participation is impractical
- AI-assisted summarization permitted, disclosed, and never authoritative (5.10)
- explicit protection for minority positions in the record

**Failure mode:** **deliberation fatigue**, where volume ensures that only the most invested participate and their preferences are recorded as consensus.

### Norm-adaptive mediation

Where rules govern discourse, mediation should adjust to community norms rather than apply static enforcement. Soft interventions — modulated visibility, reflection prompts, friction before amplification — can achieve alignment without punitive action, and their calibration is itself a governance decision subject to review.

**Failure mode:** **static enforcement**, where rules written for one moment are applied unchanged as context, membership, and risk shift.

### Ratification and thresholds

Adoption must be a defined event with a recorded outcome.

- quorum, threshold, and tie-breaking rules stated before the vote
- material decisions require human ratification; AI may analyze and simulate but not ratify (5.10)
- adoption produces a signed policy object with version, rationale, and effective date
- notice periods before enforcement begins, proportional to the change's impact

**Failure mode:** **silent adoption**, where a rule takes effect before those subject to it can observe that it changed.

### Delegation and representation

Participants may delegate governance capacity, and delegation must remain accountable.

- scopes are explicit and revocable at any time (5.8)
- term limits and decay prevent entrenchment
- delegates' votes and rationales are visible to those who delegated to them
- concentration of delegated authority is measured and disclosed

**Failure mode:** **representation drift**, where delegation is durable and revocation is theoretically available but practically inert.

### Emergency and expedited pathways

Automated systems act faster than deliberation. Rapid response must exist without becoming the normal path.

- emergency policies are scoped, time-bound, and expire automatically unless ratified
- authority to invoke is named in advance, as is the notification requirement
- every emergency action enters the ordinary review queue afterward
- repeated invocation of the same emergency provision triggers mandatory permanent review

**Failure mode:** **permanent emergency**, where expedited authority becomes the governing mode.

### Appeal and correction

Governance produces wrong outcomes; the process must metabolize that.

- defined appeal paths with published timelines and reachable outcomes
- standing to appeal for those affected, not only those sanctioned
- reversal produces a receipt and, where feasible, remediation of the original effect
- patterns of reversal feed back into rule revision rather than only individual relief

**Failure mode:** **appeal as absorption**, where objections are collected, resolved individually, and never change the rule that produced them.

### Federated coordination across jurisdictions

Some AI risks exceed any single community's scope. DP12 anticipates cross-jurisdictional coordination for norm-setting and emergency response, structured to prevent centralized domination: mutual recognition of policy objects, scoped advisory sharing, and explicit limits on what coordination bodies may compel.

**Failure mode:** **coordination capture**, where cross-community structures become the venue through which local autonomy is overridden.

### Review, sunset, and retirement

Rules accumulate. Governance must include a path out.

- scheduled review dates attached to every policy object at adoption
- sunset conditions for rules addressing temporary conditions
- retirement produces a record explaining what changed and what replaced it
- governance memory retains superseded rules and their rationale (5.4)

**Failure mode:** **rule sediment**, where obsolete constraints persist because no process retires them and enforcement becomes selective by necessity.

**Why this matters:** The execution layer determines whether rules bind. Process determines whether they deserve to.
"""

DP12_VERIFICATION = """
Governance that binds policy to behavior must be able to demonstrate that it did so. Without verification, a governance receipt is a claim about enforcement rather than evidence of it, and a community cannot distinguish a system that follows its rules from one that reports following them.

Policy-bound verification is the requirement that the connection between a policy object and an observed outcome be independently checkable.

### Determinism as a verification precondition

Runtime binding must be reproducible: the same inputs, under the same policy version, produce the same governed outcome. Where models introduce nondeterminism, the governed decision — allowed, modified, blocked, escalated — must remain stable even when the generated content varies.

**Failure mode:** **unreproducible enforcement**, where outcomes cannot be re-derived and therefore cannot be audited.

### Receipts as verifiable artifacts

Governance receipts (5.0) must be more than logs. A receipt should be signed, tamper-evident, and sufficient for a third party to check the claimed evaluation.

A verifiable receipt includes:

- policy identifiers and exact versions applied
- a hash or reference to the inputs and conditions evaluated
- the decision, any modification applied, and any override invoked
- the components that executed the evaluation, with attestations
- the zone and authority under which the decision was made
- links to prior receipts in the same chain of decisions

**Failure mode:** **receipt theater**, where records are produced that cannot be checked against anything.

### Policy simulation and pre-deployment testing

Policies must be testable before they bind. Communities should be able to run a candidate policy against historical or synthetic cases and observe what would have changed.

- conformance suites for policy objects, versioned alongside them
- differential testing between policy versions, reporting behavioral deltas
- publication of simulation results as part of ratification (see AI Governance Processes)

**Failure mode:** **blind adoption**, where rules are enacted without knowing what they will do.

### Drift detection between intent and behavior

Adaptive systems learn to satisfy the letter of a constraint while defeating its purpose. Verification must therefore measure outcomes, not only compliance events.

- continuous sampling of governed interactions against policy intent
- detection of surface compliance with divergent outcomes
- alerting when enforcement rates change without a corresponding policy change
- explicit measurement of the gap between declared and observed behavior (**Foresight and Failure Design**)

**Failure mode:** **specification gaming**, where the audit passes and the harm continues.

### Independent verifiability

A community must not be required to trust the operator's own attestation.

- receipts and policy objects are exportable and checkable outside the system that produced them
- third parties can replay a decision given the policy version and recorded inputs
- attestations are anchored so that after-the-fact revision is detectable
- verification does not require access to private participant data (DP4)

**Failure mode:** **self-audit monopoly**, where only the enforcing party can confirm enforcement.

### Override and exception accounting

Overrides are legitimate and must be accounted for as first-class governance events.

- every override records authority, scope, duration, and rationale (5.0)
- override rates are published and reviewed as an aggregate signal
- undisclosed exception pathways are treated as a compliance failure, not a configuration detail

**Failure mode:** **shadow exception layer**, where formal policy holds for most traffic and quietly does not for some.

### Verification across boundaries

When policies move between systems, verification must move with them or the loss must be declared (5.9, DP7).

- receiving systems state whether they can enforce the transferred policy, partially enforce it, or only record it
- verification artifacts from the origin remain checkable after transfer
- degradation of enforceability is signaled at the boundary, not discovered afterward

**Failure mode:** **verification laundering**, where a policy transferred into a weaker environment retains the appearance of enforcement.

### Participant-facing verification

Verification that only auditors can perform does not restore participant trust.

- participants can retrieve the receipt for a decision that affected them
- receipts are rendered in plain language with the technical artifact available beneath
- appeal paths accept receipts as evidence and produce receipts in turn

**Example:** A participant's post is modified by an AI moderation policy. The receipt names Policy A v3.2, the evaluated conditions, the modification applied, and the executing component's attestation. The participant exports the receipt, an independent auditor replays the decision against the published policy version and reproduces the outcome, and the community's monthly report shows the enforcement rate for that policy alongside its override count.

**Why this matters:** Governance becomes authoritative at the point where its claims can be checked by someone with no stake in the answer. Until then, communities are asked to trust that rules bound behavior — which is the condition DP12 exists to end.
"""


# --------------------------------------------------------------------------- #
# per-DP assembly
# --------------------------------------------------------------------------- #

def build_dp7() -> None:
    s = parse(ROOT / "dp7.md")
    mech, layer = extract_sub(
        s["Primary Mechanisms and Structural Conditions"],
        r"5\.0 Interoperability Layer",
    )
    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", s["Threats and Failure Modes"]),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions", mech),
        ("Governance, Accountability, and Agency Surfaces",
         s["Governance, Accountability, and Agency Surfaces"]),
        ("Incentives and Power Analysis", s["Incentives and Power Analysis"]),
        ("Community Signals Informing DP7", s["Community Signals Informing DP7"]),
        ("Evaluation Criteria", G("evaluation-criteria", DP7_EVAL)),
        ("Implementation Patterns", G("implementation-patterns", DP7_IMPL)),
        ("Foresight and Failure Design", s["Foresight and Failure Design"]),
        ("Interoperability System Layer: Continuity, Translation, and Power", promote(layer)),
        ("Relationship to Other Desirable Properties",
         s["Relationship to Other Desirable Properties"]),
        ("Non-Goals and Explicit Boundaries", s["Non-Goals and Explicit Boundaries"]),
        ("Minimum DP7 Alignment (Non-Normative)", s["Minimum Alignment (Non-Normative)"]),
        ("Open Questions and Future Work", s["Open Questions and Future Work"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(7, entries)


def build_dp8() -> None:
    s = parse(ROOT / "dp8.md")

    # Security and Adversarial Considerations becomes the Tier-1 threats section.
    threats = s["Security and Adversarial Considerations"]
    threats = re.sub(r"^###\s+\*\*9\.", "### **3.", threats, flags=re.M)
    lines = threats.splitlines()
    first_sub = next(i for i, l in enumerate(lines) if l.startswith("### "))
    threats = (
        "\n".join(lines[:first_sub]).rstrip()
        + "\n\n"
        + G("threats-failure-mode-index", "### 3.0 Security and Adversarial Failure Modes (Index)\n\n" + DP8_THREAT_INDEX)
        + "\n\n---\n\n"
        + "\n".join(lines[first_sub:]).strip()
    )

    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", threats),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions",
         G("primary-mechanisms-and-structural-conditions", DP8_MECH)),
        ("Governance, Accountability, and Agency Surfaces",
         G("governance-accountability-and-agency-surfaces", DP8_GOV)),
        ("Incentives and Power Analysis", G("incentives-and-power-analysis", DP8_INCENTIVES)),
        ("Community Signals Informing DP8", G("community-signals-informing-dp8", DP8_SIGNALS)),
        ("Core Principles (Normative and Enforceable)", s["Core Principles"]),
        ("System Architecture", s["System Architecture"]),
        ("Participation Model", s["Participation Model"]),
        ("AI Governance (DP12 Link)", s["AI Governance (DP12 Link)"]),
        ("Governance Composition", s["Governance Composition"]),
        ("Relationship to Other Desirable Properties",
         G("relationship-to-other-desirable-properties", DP8_REL)),
        ("Non-Goals and Explicit Boundaries",
         G("non-goals-and-explicit-boundaries", DP8_NONGOALS)),
        ("Minimum DP8 Alignment (Non-Normative)", s["Minimum Alignment (Non-Normative)"]),
        ("Open Questions and Future Work", s["Open Questions"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(8, entries)


def build_dp9() -> None:
    s = parse(ROOT / "dp9.md")
    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", s["Threats and Failure Modes"]),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions",
         s["Primary Mechanisms and Structural Conditions"]),
        ("Governance, Accountability, and Agency Surfaces",
         s["Governance, Accountability, and Agency Surfaces"]),
        ("Incentives and Power Analysis", s["Incentives and Power Analysis"]),
        ("Community Signals Informing DP9", s["Community Signals Informing DP9"]),
        ("Implementation Patterns", G("implementation-patterns", DP9_IMPL)),
        ("Foresight and Failure Design", s["Foresight and Failure Design"]),
        ("Developer Reach", G("developer-reach", DP9_REACH)),
        ("Incentive Mechanisms", G("incentive-mechanisms", DP9_MECHANISMS)),
        ("Relationship to Other Desirable Properties",
         s["Relationship to Other Desirable Properties"]),
        ("Non-Goals and Explicit Boundaries", s["Non-Goals and Explicit Boundaries"]),
        ("Minimum DP9 Alignment (Non-Normative)", s["Minimum Alignment (Non-Normative)"]),
        ("Open Questions and Future Work", s["Open Questions and Future Work"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(9, entries)


def build_dp10() -> None:
    s = parse(ROOT / "dp10.md")
    mech, lifelong = extract_sub(
        s["Primary Mechanisms and Structural Conditions"], r"5\.4 Lifelong learning")
    mech, pearl = extract_sub(mech, r"5\.6 PEARL Digital Badges")

    gov = s["Governance Requirements"].rstrip() + "\n\n---\n\n" + G(
        "governance-agency-surfaces",
        "### Participant and Community Agency Surfaces\n\n" + DP10_GOV_ADD,
    )

    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", s["Threats and Failure Modes"]),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions", mech),
        ("Governance, Accountability, and Agency Surfaces", gov),
        ("Community Signals Informing DP10", G("community-signals-informing-dp10", DP10_SIGNALS)),
        ("Evaluation Criteria", s["Evaluation Criteria"]),
        ("Implementation Patterns", s["Implementation Patterns"]),
        ("Lifelong Learning Opportunities", promote(lifelong)),
        ("PEARL Digital Badges", promote(pearl)),
        ("Relationship to Other Desirable Properties",
         s["Relationship to Other Desirable Properties"]),
        ("Non-Goals and Explicit Boundaries", G("non-goals-and-explicit-boundaries", DP10_NONGOALS)),
        ("Minimum DP10 Alignment (Non-Normative)",
         G("minimum-dp10-alignment", DP10_MINIMUM)),
        ("Open Questions and Future Work", s["Open Questions for ML-RFC Development"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(10, entries)


def build_dp11() -> None:
    s = parse(ROOT / "dp11.md")
    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", s["Threats and Failure Modes"]),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions",
         s["Primary Mechanisms and Structural Conditions"]),
        ("Governance, Accountability, and Agency Surfaces",
         s["Governance, Accountability, and Agency Surfaces"]),
        ("Incentives and Power Analysis", s["Incentives and Power Analysis"]),
        ("Community Signals Informing DP11", s["Community Signals Informing DP11"]),
        ("Foresight and Failure Design", s["Foresight and Failure Design"]),
        ("Constitutional AI", G("constitutional-ai", DP11_CONSTITUTIONAL)),
        ("Personal and Community AI", G("personal-and-community-ai", DP11_PERSONAL)),
        ("Relationship to Other Desirable Properties",
         s["Relationship to Other Desirable Properties"]),
        ("Non-Goals and Explicit Boundaries", s["Non-Goals and Explicit Boundaries"]),
        ("Minimum DP11 Alignment (Non-Normative)", s["Minimum Alignment (Non-Normative)"]),
        ("Open Questions and Future Work", s["Open Questions and Future Work"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(11, entries)


def build_dp12() -> None:
    s = parse(ROOT / "dp12.md")
    entries = [
        ("Purpose of This Draft", s["Purpose of This Draft"]),
        ("Problem Statement", s["Problem Statement"]),
        ("Threats and Failure Modes", s["Threats and Failure Modes"]),
        ("Core Principle", s["Core Principle"]),
        ("Primary Mechanisms and Structural Conditions",
         s["Primary Mechanisms and Structural Conditions"]),
        ("Governance, Accountability, and Agency Surfaces",
         s["Governance, Accountability, and Agency Surfaces"]),
        ("Incentives and Power Analysis", s["Incentives and Power Analysis"]),
        ("Community Signals Informing DP12", s["Community Signals Informing DP12"]),
        ("Foresight and Failure Design", s["Foresight and Failure Design"]),
        ("AI Governance Processes", G("ai-governance-processes", DP12_PROCESSES)),
        ("Policy-Bound Verification", G("policy-bound-verification", DP12_VERIFICATION)),
        ("Relationship to Other Desirable Properties",
         s["Relationship to Other Desirable Properties"]),
        ("Non-Goals and Explicit Boundaries", s["Non-Goals and Explicit Boundaries"]),
        ("Minimum DP12 Alignment (Non-Normative)", s["Minimum Alignment (Non-Normative)"]),
        ("Open Questions and Future Work", s["Open Questions and Future Work"]),
        ("Path Toward ML-RFC", s["Path Toward ML-RFC"]),
        ("Closing Orientation", s["Closing Orientation"]),
    ]
    write(12, entries)


if __name__ == "__main__":
    build_dp7()
    build_dp8()
    build_dp9()
    build_dp10()
    build_dp11()
    build_dp12()
    print("done")
