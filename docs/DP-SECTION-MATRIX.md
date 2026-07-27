# DP Section Matrix

Per-DP section plan for local `content/local/dpN.md` files.

**Legend:** ✓ = required | ○ = include when useful (generate if missing) | ★ = DP-specific section

## Tier definitions

| Tier | Sections | Rule |
|------|----------|------|
| **1 Core** | Purpose, Problem, Threats, Core Principle, Primary Mechanisms | Every DP |
| **2 Standard** | Relationship to Other DPs, Non-Goals, Minimum Alignment, Open Questions, Path Toward ML-RFC, Closing Orientation | Every DP — generate if missing |
| **3 Conditional** | Governance Surfaces, Incentives & Power, Community Signals, Evaluation Criteria, Implementation Patterns, Foresight | Include when useful; generate if missing |
| **4 DP-specific** | Named domain sections | Only where topic requires depth |

---

## Matrix

| DP | Tier 3 | Tier 4 (DP-specific) |
|----|--------|----------------------|
| DP1 | Gov, Incentives, Community, Foresight | Federated Authentication; Identity System Layer; Sociotechnical Zones |
| DP2 | Gov, Incentives, Community, Foresight | Tensions and Tradeoffs; Agency System Layer; Portability and Exit |
| DP3 | Gov, Incentives, Community, Foresight | Scalable Governance Patterns |
| DP4 | Gov, Incentives, Community, Foresight | Data Vaults and Personas |
| DP5 | Gov, Incentives, Community, Foresight | Namespace Objects; Resolution Protocol; Attack Taxonomy |
| DP6 | Gov, Incentives, Community, Foresight | Meta-Community Economies |
| DP7 | Gov, Community, Eval, Impl Patterns | Interoperability System Layer |
| DP8 | Gov, Incentives, Community | System Architecture; Participation Model; AI Governance Link |
| DP9 | Gov, Incentives, Community, Impl Patterns | Developer Reach; Incentive Mechanisms |
| DP10 | Gov, Community, Eval, Impl Patterns | Lifelong Learning; PEARL Badges |
| DP11 | Gov, Incentives, Community, Foresight | Constitutional AI; Personal/Community AI |
| DP12 | Gov, Incentives, Community, Foresight | AI Governance Processes; Policy-Bound Verification |
| DP13 | Gov, Community, Foresight | ★ Containment Dimensions; Verification and Transparency; Cross-DP Loop (DP11/12) |
| DP14 | Gov, Incentives, Community, Eval, Foresight | Adversarial Model; Epistemic Incident Model |
| DP15 | Gov, Community, Foresight | Security Core; Provenance and Archive |
| DP16 | Gov, Community, Eval, Impl Patterns | Milestone Framework; Phased Rollout |
| DP17 | Gov, Incentives, Community, Foresight | Funding Models; Token Ecosystems |
| DP18 | Gov, Incentives, Community, Eval, Impl Patterns | Feedback and AI; Privacy Requirements |
| DP19 | Gov, Incentives, Community, Eval, Impl Patterns | Engagement Metrics; Public Narrative Governance |
| DP20 | Gov, Incentives, Community, Foresight | Ownership Mechanisms; Knowledge Graph Stewardship |
| DP21 | Gov, Community, Eval, Impl Patterns | Multimodal Devices and Interfaces; Accessibility |
| DP22 | Gov, Community, Eval, Foresight | Civic Memory Layer; Transformation-Sensitive Memory |
| DP23 | Gov, Incentives, Community, Eval, Impl, Foresight | ★ Linguistic Access; Translation Provenance; Multilingual Glossaries; Global Issue Participation |

---

## Backend plumbing checklist (all DPs)

- [ ] `content/local/dpN.md`
- [ ] `sources-sat.json` → `localOverride: "/content/local/dpN.md"`
- [ ] `dp-inscriptions.json` entry (inscribed or `draft_only` for DP23)
- [ ] `desirable-properties.json` entry synced
- [ ] `assets/data/dpN.json` provenance file
