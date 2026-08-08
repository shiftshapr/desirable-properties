# DP6 – Commerce

*Fair value, everywhere — the Meta-Layer supports seamless, flexible transactions, empowering communities and individuals to earn, exchange, and sustain themselves on their own terms.*

![Illustration for Desirable Property DP6: Commerce](/content/local/assets/dp/DP6.webp)

<!-- dp-local-version: 1.0 | standardized: 2026-07-27 -->
<!-- govhub-sync: ml=ML-Draft-013 revision=02 submission=4319d3f8-7bab-42b6-b9c0-47628a60ed10 hash=c607d67e8e1644d0 synced=2026-08-08T21:35:00Z -->

---

## 1. Purpose of This Draft

This draft articulates Desirable Property 6 (DP6) as the condition under which value exchange in the meta-layer is fair, legible, and aligned with human and community flourishing, not reducible to extraction, dark patterns, or attention rents dressed as markets.

Commerce is not an add-on to the meta-layer. It is how incentives (DP9), ownership (DP20), and sustainability (DP17) become real.

DP6 therefore defines the minimum conditions under which exchange remains trustworthy at the interface where money moves and value is recognized.

Commerce is the highest-value attack surface in the meta-layer. Systems that appear fair locally but fail across system boundaries, delegation, or routing layers will be systematically exploited.

DP6 connects to:

- DP4 (data minimization in payments and ads)
- DP2 (participant agency and consent)
- DP9 (incentive alignment)
- DP12 (executable policy at checkout)
- DP13 (containment of automation and abuse)
- DP15 (receipts and provenance)
- DP17 (financial sustainability)

If DP6 is weak, predictable failures follow: surveillance advertising as hidden tax, fee obfuscation, lock-in through proprietary rails, platform capture of creator revenue, and AI-mediated manipulation at conversion.

DP6 does not prescribe a specific payment rail, currency, or chain. It defines legitimacy conditions for commerce in the meta-layer.

---

## 2. Problem Statement

In today's web, commerce is fused with attention manipulation and opacity.

Participants encounter:

- pricing that cannot be verified before commitment
- fee stacks that are only visible after settlement
- payment flows bundled with surveillance and data extraction
- AI systems that optimize for conversion rather than user welfare

This produces recurring failures:

- surprise charges and coercive conversion flows
- creator and worker value hidden behind opaque fee structures
- failed micropayment systems due to friction and rent extraction
- communities unable to capture value from activity they host

These failures are structural. When transparency and portability are optional, extraction dominates.

DP6 reframes commerce as governed exchange: visible rules, bounded automation, and enforceable fairness at the point of transaction.

---

## 3. Threats and Failure Modes

### 3.1 Fee fog and stacked take rates

Participants cannot see effective take rates across layers.

**Example:** A creator sees a platform fee but not downstream processing, ranking, or conversion costs.

**Why this matters:** Fairness requires full distribution visibility.

### 3.2 Dark patterns at conversion

Design exploits cognitive load to increase conversion.

**Example:** A free trial converts with hidden renewal and hard-to-find cancellation.

**Why this matters:** Coercive commerce violates DP2 agency.

### 3.3 Attention rents disguised as markets

"Free" is subsidized by hidden data extraction.

**Example:** Ad SDKs exfiltrate unrelated data to fund access.

**Why this matters:** Externalities shift cost to users without consent (DP4).

### 3.4 Lock-in through wallets and closed loops

Value cannot exit proprietary rails.

**Example:** Credits and reputation cannot be ported without loss.

**Why this matters:** Undermines DP7 interoperability and DP4 export.

### 3.5 AI-mediated financial harm

Agents steer decisions without accountability.

**Example:** Assistants recommend higher-commission products as "best".

**Why this matters:** Requires DP11 disclosure and DP13 bounds.

### 3.6 Community extraction without reciprocity

Economic activity uses community trust without funding it.

**Example:** Marketplaces leverage forums without contributing to moderation or safety.

**Why this matters:** Violates DP20 ownership and DP17 sustainability.

### 3.7 Cross-border confusion

Fees, taxes, and currencies are unclear.

**Example:** Display currency differs from settlement with hidden spreads.

**Why this matters:** Legibility must include jurisdictional honesty.

### 3.8 Predatory targeting

Dynamic pricing or credit targets vulnerable users.

**Example:** BNPL prompts cluster around financially stressed users.

**Why this matters:** Intersects DP4 inference limits and DP11 ethics.

### 3.9 Platform self-preferencing in AI commerce

Default assistants route to house inventory.

**Example:** "Buy now" prioritizes sibling brands under "personalization".

**Why this matters:** Requires disclosure and contestability.

### 3.10 Cross-system commerce distortion

Commerce terms, attribution, or protections change or become exploitable when transactions, identities, or value move across systems.

**Example:** A checkout with full fee disclosure exports to a partner flow where additional fees are added post-commitment, or a refund policy is not honored after handoff.

**Why this matters:** Commerce that fails at system boundaries enables arbitrage and hidden extraction.

### 3.11 Community economic capture

A community's economic surface is controlled by a subset of its participants, or by the operator hosting it, such that surcharges, treasury allocation, or vendor admission serve narrow rather than collective interests.

**Example:** A community treasury funded by transaction surcharges is directed by a small group of long-tenured members toward projects they benefit from, with no rotation, disclosure, or contestation pathway.

**Why this matters:** Giving communities economic power creates a new capture surface. The remedy is not to withhold the power but to bind it to governance (DP3) and ownership (DP20) conditions. A captured community economy is harder to exit than a captured platform, because the social relationships and the economic relationships are the same.

---

## 4. Core Principle

Commerce in the meta-layer is fair only when pricing, fees, risks, and responsibilities are legible at the point of exchange; defaults are non-exploitative; automation and AI assistance are accountable and bounded; and communities can shape and, where appropriate, capture economic activity that depends on shared trust and infrastructure.

**Example:** A checkout shows item price, full fee breakdown, data uses tied to the transaction, AI involvement, cancellation path, and any community surcharge with a link to governance.

**What this feels like:** Paying feels like choosing, not being herded.

Commerce guarantees must remain valid not only within a single interface, but across the systems, tools, and contexts where transactions are initiated, routed, and settled.

When commerce flows cross systems, pricing, fees, policies, and responsibilities must either:

- persist with integrity, or
- degrade in a way that is visible and contestable

Commerce that becomes opaque at handoff points is structurally unsafe.

---

## 5. Primary Mechanisms and Structural Conditions

### 5.1 Commerce Layer: Execution, Proof, and Settlement

Commerce in the meta-layer cannot rely on interface clarity alone. It must be anchored in a substrate that binds pricing, allocation, and settlement to verifiable, enforceable structures. Without this, even well-designed interfaces can be subverted downstream, where actual value movement occurs.

DP6 therefore defines a commerce layer composed of primitives that make exchange legible, auditable, and governable across the full lifecycle of a transaction, from intent to settlement to dispute.

#### 5.1.1 Transaction objects

Transactions are not ephemeral UI events. They are structured, machine-readable objects that encode the full economic reality of an exchange. This includes itemized pricing, discounts, fee distribution, data use, jurisdictional context, and the governing policies at the moment of commitment.

By binding these elements together, transaction objects ensure that what a participant sees at checkout is not merely descriptive, but enforceable. This is what connects commerce to executable policy (DP12).

A failure mode here is selective omission or delayed disclosure, where certain fees or conditions are only materialized after commitment. Systems must therefore ensure that transaction objects are complete before commitment and immutable afterward except through governed updates.

#### 5.1.2 Fee and allocation objects

Fee structures must be computable and attributable prior to commitment, not inferred after settlement. This includes platform fees, payment processing costs, ranking or promotion adjustments, and any community-level surcharges.

Rather than presenting fees as a flat percentage or opaque deduction, the system must expose how value is distributed across all participating layers. This enables participants to understand not only the price, but the economic structure behind it.

The primary attack surface here is fee fragmentation, where costs are distributed across layers in ways that are individually legible but collectively opaque. DP6 requires that fee objects recombine into a clear total cost of participation.

#### 5.1.3 Settlement and flow proofs

Settlement must be provable, not assumed. Participants and communities need to be able to trace how value moved: who received what, when, and under what conditions.

Settlement proofs create continuity between intent and outcome. Without them, systems can display one set of expectations at checkout and execute another at settlement.

Failure modes include delayed settlement visibility, partial disclosure of recipients, or selective omission of intermediary captures. Systems must treat settlement as a first-class observable state, not a backend detail.

#### 5.1.4 Commerce policy binding

Zones and communities attach policy objects directly to transactions. These are not advisory rules; they execute at runtime and shape what is allowed, required, or disallowed in a transaction.

This includes restrictions on categories, required disclosures, surcharge logic, and AI usage constraints. The key shift is that commerce behavior is governed at the point of execution, not after harm occurs.

The adversarial pressure here is policy bypass through integration pathways. Transactions must carry their governing policy context with them across systems or explicitly signal where enforcement no longer holds.

#### 5.1.5 AI disclosure and constraint hooks

AI participation in commerce must be visible, attributable, and bounded. This includes pricing adjustments, ranking decisions, bundling, and negotiation.

Participants must be able to distinguish between neutral presentation and optimized persuasion. Without this, AI becomes a hidden incentive layer that distorts economic decisions.

A critical failure mode is undisclosed optimization, where AI systems steer users toward outcomes that maximize commission or retention while presenting themselves as neutral assistants.

#### 5.1.6 Exit and portability primitives

Participants must be able to leave economic relationships without disproportionate friction. This includes exporting receipts, transaction history, and where supported, balances or entitlements.

Portability is not only a convenience feature; it is a constraint on extraction. Systems that make exit costly create economic capture even when pricing appears fair.

The adversarial pattern here is soft lock-in, where exit is technically possible but practically costly due to fragmentation of records, identity, or value.

#### 5.1.7 Dispute and evidence bundles

Every transaction should produce an evidence bundle that can be used in dispute resolution. This includes signed receipts, policy state at the time of purchase, and clear identification of responsible parties.

This shifts dispute resolution from subjective interpretation to evidence-based adjudication. It also creates incentives for systems to maintain accurate and complete records.

Failure modes include missing policy context, unverifiable receipts, or ambiguity about responsibility across multi-party transactions.

#### 5.1.8 Commerce memory

Commerce systems must retain a structured memory of transactions and policy evolution. This includes prior fee structures, changes in rules, and the outcomes of disputes.

This historical layer enables accountability over time and allows communities to detect drift toward extraction or manipulation.

Without commerce memory, each transaction exists in isolation, making systemic issues difficult to detect and correct.

These primitives transform commerce from a series of isolated interactions into a coherent, governable system that can withstand adversarial pressure and evolve over time.

### 5.2 Fee and take-rate transparency

Fee transparency is not simply about showing a number. It is about ensuring that participants can understand the full economic structure of a transaction before they commit.

In many systems, fees are fragmented across layers—platform fees, payment processing, ranking adjustments, or currency spreads—each of which may be individually legible but collectively opaque. This creates a situation where the true cost of participation cannot be known until after settlement.

DP6 requires that effective fees be computable before commitment, not reconstructed after the fact. Participants must be able to see the full take rate across all layers in a way that is coherent and comparable.

A core failure mode is fee fragmentation, where systems distribute costs in ways that obscure total extraction. Systems must therefore recombine all fee components into a clear, pre-commitment view of total cost.

### 5.3 Honest defaults and reversal paths

Defaults are one of the most powerful levers in commerce systems. When defaults are misaligned, even transparent systems can become coercive in practice.

DP6 requires that material commitments be opt-in, not opt-out, and that reversal paths such as cancellation or refund follow the same level of friction as signup. This creates symmetry between entry and exit, which is essential for real agency (DP2).

A common failure mode is asymmetrical friction, where signup is immediate but cancellation is buried, delayed, or requires additional steps. Systems must treat reversibility as a first-class design constraint, not a secondary feature.

### 5.4 Separation of payments and surveillance

Commerce systems often bundle payment with data extraction, turning transactions into opportunities for surveillance. This creates hidden costs that are not reflected in price.

DP6 requires that payment does not require unrelated data processing (DP4). The data required to complete a transaction must be limited to what is strictly necessary, and any additional data use must be explicitly disclosed and optional.

A key failure mode is covert bundling, where data collection is technically optional but practically unavoidable. Systems must ensure that participants can complete transactions without consenting to unrelated data flows.

### 5.5 Interoperable value rails

Value must be able to move without losing meaning, ownership, or accountability. When value is trapped within proprietary systems, participants are subject to platform-defined rules that cannot be contested or exited.

DP6 therefore prefers open protocols and requires export and audit capabilities for closed systems (DP7). Participants must be able to move balances, receipts, and transaction history without losing integrity.

A primary failure mode is economic lock-in, where value can technically be withdrawn but at significant loss or friction. Systems must treat portability as a constraint on extraction, not an optional feature.

### 5.6 Creator and worker fairness

Commerce systems depend on contributors whose work generates value, yet those contributors are often the least protected participants in the system.

DP6 requires that attribution and payouts be tamper-evident and that disputes be resolved in a timely and transparent manner. Contributors must be able to verify how their work is valued and compensated.

A failure mode here is delayed or opaque payout logic, where contributors cannot trace how their compensation was calculated or why it changed. Systems must ensure that payout logic is both visible and contestable.

### 5.7 Community economic surfaces

Communities create the conditions under which commerce is trusted, yet often lack the ability to shape the economic activity that depends on them.

DP6 enables zones to impose rules, surcharges, or bans with executable policy (DP12). This allows communities to align commerce with their values and to capture a portion of the value generated within their environments.

A key failure mode is extraction without reciprocity, where economic activity leverages community trust without contributing to its maintenance. Systems must ensure that communities can define and enforce economic participation terms.

### 5.8 High-stakes commerce pathways

Not all transactions carry the same level of risk. High-stakes categories such as financial products, healthcare, or legal services require additional safeguards.

DP6 requires human confirmation or expert gating for sensitive categories. This ensures that automation and AI do not make consequential decisions without appropriate oversight.

A failure mode is over-automation, where systems optimize for efficiency at the cost of safety. Systems must introduce friction where necessary to prevent harm.

### 5.9 Sustainability linkage

Commerce systems do not exist in isolation. They depend on shared infrastructure, communities, and public goods that must be maintained over time.

DP6 requires that fees transparently fund commons maintenance (DP17). This creates a visible link between economic activity and the sustainability of the systems that support it.

A failure mode is invisible extraction, where value is removed from ecosystems without reinvestment. Systems must make sustainability contributions explicit and traceable.

### 5.10 Receipts and dispute evidence

Receipts are not merely confirmations of payment. They are the foundation of accountability in commerce systems.

DP6 requires machine-readable receipts that support fair resolution (DP15). These receipts must include sufficient detail to reconstruct the transaction and its governing conditions.

A failure mode is incomplete or unverifiable receipts, which make disputes difficult or impossible to resolve. Systems must treat receipts as evidence, not just records.

### 5.11 Accessibility of economic surfaces

Commerce must be accessible to all participants, regardless of ability, device, or connectivity constraints.

DP6 requires that checkout and transaction flows work across assistive technologies and low-bandwidth contexts. Accessibility is not only a usability concern, but a fairness constraint.

A failure mode is exclusion by design, where systems assume high bandwidth, modern devices, or specific interaction patterns. Systems must ensure that economic participation is not gated by technical privilege.

### 5.12 Cross-system commerce integrity (DP7 alignment)

Commerce systems must preserve the relationship between price, fee, policy, and settlement across environments.

This includes:

- maintaining itemized pricing and fee visibility across handoffs
- preserving policy bindings (refunds, cancellations, disclosures) across integrations
- ensuring receipt and provenance continuity across tools (DP15)
- signaling when guarantees or protections change in a new environment

Commerce must not be portable in ways that enable hidden fees, policy resets, or accountability gaps.

### 5.13 Agent-to-agent commerce integrity

Commerce is increasingly mediated not just by humans, but by agents acting on behalf of participants. These agents may search, negotiate, bundle, and execute transactions across multiple systems without direct human interaction at each step.

DP6 requires that agent-to-agent commerce remains legible, bounded, and accountable at the same level as human-facing transactions.

This includes:

- ensuring agents carry explicit mandates, constraints, and budget limits from their principals
- preserving transaction visibility such that participants can inspect decisions made on their behalf
- binding agent actions to the same policy, fee, and disclosure requirements as direct transactions
- preventing agents from exploiting speed, scale, or opacity to bypass safeguards

A critical failure mode is delegated opacity, where agents transact in ways that are technically valid but practically uninspectable, allowing hidden fees, biased routing, or exploitative bundling.

Systems must ensure that delegation does not reduce accountability. Agent-mediated commerce must remain reconstructable, auditable, and interruptible by participants and governance systems.

---

## 6. Meta-Community Economies

The mechanisms above describe fairness conditions at the level of a transaction. This section describes what becomes possible when communities themselves hold economic surfaces: the ability to fund what they depend on, to set terms for economic activity that relies on their trust, and to retain value that would otherwise flow entirely outward.

A **meta-community economy** is the economic layer of a community zone. It exists because communities generate the conditions that make commerce trustworthy — moderation, reputation, curation, norms, dispute resolution, and the social relationships within which exchange feels safe — and because in current systems that contribution is uncompensated by default. Marketplaces leverage forums; recommendation systems harvest curation; platforms monetize trust they did not build. *Community extraction without reciprocity* is not a marginal harm; it is the normal operating condition.

### 6.1 What a community economy comprises

- **A treasury or common pool**, funded through zone surcharges, membership contributions, revenue shares on activity conducted in the zone, or grants, with allocation governed by the community rather than the host.
- **Zone economic policy**, expressed as policy objects that execute at transaction time: which commerce categories are permitted, which require disclosures, what surcharge applies, which vendors are admitted, and what AI participation is allowed at conversion.
- **Contribution accounting**, recording who produced the value the zone depends on — moderation, curation, translation, dispute resolution, infrastructure — so that distribution is grounded in a record rather than in social standing. This is where DP6 meets DP9.
- **Reciprocity terms**, defining what external commercial actors owe when they conduct business inside the zone or rely on its trust signals, and making that obligation enforceable rather than voluntary.
- **Inter-community settlement**, allowing value, credits, or obligations to move between zones without requiring a single currency or clearing authority, and without losing provenance in transit.

### 6.2 Composition across zones

Communities are not economically isolated. A participant may belong to several zones with different economic rules, and a transaction may touch more than one. DP6 requires that when zone economic policies compose, the result be determinate and visible rather than emergent.

Two rules follow. First, **surcharges and constraints must be enumerable at checkout**: a participant sees each zone's contribution as a distinct line, not a blended total, so that what they are funding is legible. Second, **the stricter constraint governs**: where one zone prohibits a category another permits, the prohibition applies to transactions within its scope. A zone's economic policy may raise the floor of protection for its participants; it may not lower another zone's floor.

### 6.3 Sustainability rather than rent

The distinction between a community economy and a rent-seeking intermediary is not the presence of a fee. It is whether the fee is bound to the maintenance of something participants depend on, and whether that binding is verifiable.

DP6 therefore requires, for community economic surfaces:

- **Traceable use of funds.** A surcharge is linked to what it maintains — moderation capacity, appeals capacity, infrastructure, translation, accessibility work — with settlement proofs that participants can inspect. This is the same requirement as *Sustainability linkage*, applied at community scale.
- **Proportionality to contribution.** A community's claim on economic activity should bear a defensible relationship to what the community actually provides. A zone that hosts a transaction and enforces its rules has a stronger claim than one that merely happens to be adjacent.
- **Exit that preserves value.** Participants and vendors must be able to leave a zone economy with their receipts, history, and where supported their balances or entitlements. Without this, community economic power becomes lock-in with better rhetoric.
- **Governed allocation.** Treasury decisions are governance decisions, subject to DP3's requirements for tiered thresholds, receipts, visible diffs, and revocable delegation, and to DP20's ownership conditions.

### 6.4 The capture problem

Giving communities economic power creates a new capture surface, described above under *Community economic capture*. This is the central structural risk of this section and cannot be designed away, only bounded.

The bounds DP6 requires are:

- **Visible allocation.** Where treasury funds go, and who decided, is inspectable by every participant subject to the surcharge that funded them.
- **Rotation and mandate limits** on the roles controlling economic policy and allocation, since economic authority entrenches faster than moderation authority.
- **Contestable admission.** Vendor admission and exclusion decisions are appealable, because the power to exclude from a market is more consequential than the power to exclude from a conversation.
- **Forkability with economic continuity.** A community that disagrees with how its economy is being run must be able to fork, carrying contribution records and member continuity, or the disciplining effect of exit disappears (DP20).
- **Audit without surveillance.** Aggregate economic outcomes — concentration of payouts, vendor diversity, surcharge burden distribution — should be reviewable without exposing individual transaction histories (DP4).

### 6.5 Why this matters

Without community economies, the meta-layer reproduces the current arrangement in new architecture: communities supply trust, platforms and intermediaries capture its value, and the work of maintaining a habitable space is performed for free until the people performing it stop.

With them, a community can fund its own moderation, compensate its curators and translators, set terms for commerce that depends on its reputation, and sustain itself without a host extracting the difference. That is the point at which DP6 stops being a set of protections against bad commerce and becomes infrastructure for economic self-determination — and the point at which DP17's sustainability and DP20's ownership become achievable rather than aspirational.

---

## 7. Governance, Accountability, and Agency Surfaces

Commerce is not neutral infrastructure. It encodes choices about power, risk, and value distribution, often in ways that are invisible to participants. In many systems, these choices are embedded in defaults, routing logic, or fee structures that cannot be contested or even observed.

DP6 requires that these choices become visible and governable at the point of transaction. This means participants are not only protected from harm, but able to understand and shape the economic conditions they are subject to.

Without these surfaces, commerce systems revert to extraction: participants transact, but cannot see how value flows, cannot challenge outcomes, and cannot meaningfully exit or redirect the system.

Participants must be able to:

- see true prices, fees, and net outcomes before commitment
- understand what data is used in the transaction and revoke unrelated scopes (DP4)
- identify AI involvement in pricing, ranking, or negotiation (DP11)
- access clear cancellation, refund, and dispute pathways
- export receipts and transaction history where honest (DP7, DP15)

Participants must also be able to understand how commerce terms change across systems.

This includes:

- whether pricing and fee structures persist across integrated flows
- whether policies such as refunds, disputes, and disclosures carry over
- where accountability shifts between parties during multi-system transactions

Participants must not be required to reverse-engineer commerce conditions across environments.

Communities must be able to:

- define allowed and disallowed commerce patterns within zones
- impose disclosures, caps, or surcharges via executable policy (DP12)
- audit aggregate outcomes for fairness, capture, and harm (without exposing individuals)
- evolve rules with memory of prior incidents and outcomes (DP12 governance loops)

**Example:** A community zone bans predatory lending ads and requires fee disclosures for all financial products. Enforcement occurs at runtime through policy binding, not moderator memory.

---

## 8. Incentives and Power Analysis

Commerce determines where value accumulates. Incentives determine how that value is pursued.

In many systems, pricing and ranking are optimized for conversion and revenue, while governance claims prioritize safety or fairness. This creates a structural mismatch where economic incentives override stated values.

DP6 requires incentive legibility within commerce systems:

- how ranking, promotion, or bundling affects price and visibility
- how commissions, fees, or partnerships influence recommendations
- how optimization targets (conversion, revenue, retention) shape outcomes

**Example:** A marketplace ranks products based on commission rather than relevance, while presenting results as "best match."

**Why this matters:** When incentives are hidden, markets become extraction systems. When visible, they become governable.

DP6 therefore expects:

- disclosure of materially relevant incentive structures
- the ability for communities to constrain or rebalance those incentives
- alignment between commerce incentives and governance rules (DP3, DP12)

Power also concentrates when commerce fragments across systems.

Actors who control routing, aggregation, or interface layers can reshape pricing, visibility, or policy without formally changing them.

DP6 therefore requires resistance to cross-system arbitrage, where value is extracted through boundary manipulation rather than contribution or service.

---

## 9. Community Signals Informing DP6

Across ecosystems, consistent signals point to structural failures in commerce design. These are not isolated grievances, but recurring patterns that reveal where systems break under real-world use.

Participants repeatedly encounter environments where economic behavior is shaped by hidden incentives, opaque fee structures, and limited recourse. Over time, this produces erosion of trust, disengagement from participation, and migration toward systems perceived as more fair or legible.

Common signals include:

- creators reporting opaque fee stacks and unpredictable income
- users expressing fatigue with subscription traps and hidden renewals
- demand for receipt-level clarity on who was paid and why
- interest in local economic rules for civic, educational, and community spaces
- concern that AI-mediated shopping optimizes for commission rather than user welfare

These signals reflect a deeper pattern: participants are not rejecting commerce itself, but commerce that is misaligned with their understanding of fairness, agency, and contribution.

DP6 treats these signals as design inputs, not complaints. They indicate where economic systems fail to align with human expectations and where intervention is required.

---

## 10. Foresight and Failure Design

DP6 assumes that commerce systems will be pressured toward opacity, capture, and manipulation. This pressure increases with scale, competition, and the introduction of automation and agent-mediated transactions.

Common failure paths include:

- reintroduction of hidden fees and bundled costs under competitive pressure
- AI-driven persuasion targeting vulnerable users at conversion points
- consolidation of value within closed payment or loyalty systems
- divergence between displayed prices and actual settlement outcomes

These failures rarely occur as singular events. They emerge gradually as systems optimize for short-term metrics, allowing small deviations from fairness to accumulate into systemic extraction.

DP6 therefore requires designing safeguards in advance:

- circuit breakers for harmful pricing or targeting patterns
- policy-based enforcement at transaction time
- rate limits and constraints on high-risk automation
- public postmortems linking failures to rule and system changes

Designers must also assume that commerce will be attacked at system boundaries.

Common boundary failure paths include:

- hidden fees introduced during cross-system routing
- policy resets when transactions move between providers
- accountability gaps between integrated services
- divergence between displayed and settled outcomes across systems

In agent-mediated environments, additional failure modes emerge:

- agents colluding or routing through opaque pathways to maximize hidden incentives
- delegated decision-making that exceeds user intent or understanding
- rapid transaction loops that bypass human oversight entirely

Community economies introduce a further set of failure paths that DP6 must anticipate:

- **surcharge accretion**, where each individually modest community fee is defensible and the aggregate burden on participants transacting across many zones is not
- **treasury entrenchment**, where control of allocation becomes the most durable form of authority in a community because it is the least visible
- **reciprocity avoidance**, where commercial actors restructure to appear external to a zone while continuing to rely on its trust signals
- **inter-zone rate arbitrage**, where activity migrates to whichever zone imposes the lowest obligations, undermining the zones doing the maintenance work

Each of these is a predictable consequence of giving communities economic power, and each is addressed by the bounds set out under *Meta-Community Economies* — enumerable surcharges, rotation on allocation authority, enforceable reciprocity terms, and audit of aggregate burden distribution.

DP6-compliant systems include detection, signaling, and governance responses for these failures. They treat commerce not as a static system, but as an adversarial environment that must be continuously monitored and corrected.

Failure is expected. Invisible failure is not.

---

## 11. Relationship to Other Desirable Properties

DP6 connects commerce to the full meta-layer system:

- DP2 ensures participant agency at checkout and over subscriptions
- DP3 defines how commerce rules evolve through governance
- DP4 constrains data use in payments and advertising
- DP7 enables portability of receipts, balances, and history
- DP9 aligns incentives with non-extractive exchange
- DP11–DP13 bound AI behavior in commerce contexts
- DP15 provides verifiable receipts and auditability
- DP17 ensures commerce contributes to sustainable infrastructure
- DP20 defines how surplus and value flows are owned and governed

Two additional couplings are load-bearing for the community economy described above.

**DP1** is what makes agent-mediated and community commerce accountable. Anti-replay and sybil resistance matter most where value moves: without them, the same identity collects twice from a treasury, a single actor manufactures the appearance of vendor diversity, and contribution accounting becomes a payout exploit rather than a record.

**DP5** is what makes economic objects addressable. Tradeable meta-assets, community identifiers that survive migration, and artifact identifiers that carry provenance across transfer are namespace properties on which settlement integrity depends. A transfer receipt is only as meaningful as the identifier it references.

DP6 is where these properties converge into real economic behavior.

---

## 12. Non-Goals and Explicit Boundaries

DP6 does not:

- mandate a single currency, ledger, or payment rail
- eliminate all forms of advertising (it requires honesty, bounds, and contestability)
- replace financial regulation or tax law
- guarantee equal economic outcomes

DP6 also does not:

- require that communities operate an economy; economic surfaces are a capability, not an obligation
- entitle a community to capture value from activity it neither hosts nor supports, since proportionality to contribution is a condition of legitimate claims
- prohibit profit, intermediation, or paid promotion; it requires that they be disclosed, bounded, and contestable
- guarantee that a transaction will be cheap, only that its full cost will be knowable before commitment
- resolve tax, licensing, or consumer-protection obligations, which remain matters for competent jurisdictions

Failure mode: **fairness theater**, where full disclosure is provided in a form no participant can act on, and the appearance of legibility substitutes for the ability to choose differently.

DP6 defines the conditions under which exchange is legitimate and non-coercive.

---

## 13. Minimum DP6 Alignment (Non-Normative)

A DP6-aligned commerce system should, at minimum:

- present itemized pricing and full fee breakdowns before commitment
- expose data uses tied to transactions and allow revocation of unrelated scopes
- label AI involvement in pricing, ranking, or recommendation
- provide cancellation and refund pathways with parity to signup friction
- generate verifiable, machine-readable receipts with responsible parties (DP15)
- bind transactions to enforceable policy and dispute mechanisms (DP12, DP13)
- ensure pricing, fees, and policy bindings persist or explicitly degrade across systems
- maintain receipt and transaction continuity across tools (DP7)
- prevent hidden fee introduction or policy resets during cross-system flows

Where community economic surfaces are operated, a DP6-aligned system should further:

- enumerate community surcharges as distinct, attributable line items at the point of commitment
- link surcharge revenue to what it maintains, with settlement proofs participants can inspect
- govern treasury allocation through visible, revocable, tiered process (DP3)
- support exit from a community economy with receipts, history, and supported balances intact
- expose aggregate economic outcomes for audit without revealing individual transaction histories (DP4)

Partial compliance that omits execution, auditability, or exit should not be treated as alignment.

---

## 14. Open Questions and Future Work

Key open questions include:

- how to reconcile cross-border commerce with local community rules and norms
- how to provide stable units of account without sacrificing accessibility or neutrality
- how to standardize receipt portability across wallets and platforms (DP7)
- how to provide meaningful transparency in ranking without enabling gaming
- how to fund public goods through commerce without creating new forms of extraction
- how to assign liability when AI agents mediate transactions (DP11–DP13)

Community economic surfaces raise a further set of unresolved questions:

- how to bound cumulative surcharge burden when a participant transacts across many zones, each with a defensible individual claim
- how to measure a community's economic contribution well enough to ground proportional claims without turning contribution accounting into a gameable scoring system
- how to settle obligations between community economies without a clearing authority and without collapsing to a single currency
- how to prevent contribution accounting from becoming a surveillance record of participants' community labor (tension with DP4)
- what recourse exists when a community economy is captured, given that exit costs include social relationships rather than only economic ones

These questions sit at the intersection of economic design, governance, and law.

---

## 15. Path Toward ML-RFC

Advancing DP6 toward ML-RFC requires:

- standardizing transaction, fee, and receipt schemas
- publishing reference checkout patterns with full disclosure models
- piloting community-defined economic rules and surcharges
- aligning dispute evidence with provenance standards (DP15)
- collaborating with regulators, platforms, and civil society on interoperable approaches

Progress should be demonstrated through working systems, not only conceptual agreement.

---

## 16. Closing Orientation

DP6 is where the meta-layer proves whether it can support real economic life without reverting to extraction.

Fair commerce is not the opposite of innovation. It is the condition under which innovation remains trustworthy.

When DP6 is strong, participants can pay, earn, and fund commons with clarity, agency, and dignity.

When it is weak, every other property is undermined at the moment money changes hands.

DP6 is where the meta-layer proves it is not building another opaque marketplace.

Fair commerce is the condition under which innovation does not depend on misdirection.

When DP6 is strong, people can pay, earn, and fund commons without trading away dignity or control.

Commerce that fails under interoperability pressure is not fair commerce. DP6 requires that fairness survive movement.

---
