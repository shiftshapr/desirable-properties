#!/usr/bin/env python3
"""Expand thin Key Elements for DP9, DP12, DP20 and re-render their markdown.

Writes the updated index to every mirror of desirable-properties.json so the
book, web-app, and challenge-site stay byte-identical.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

MIRRORS = [
    REPO / "desirableproperties-book" / "assets" / "data" / "desirable-properties.json",
    REPO / "challenge-site" / "src" / "data" / "desirable-properties.json",
    REPO / "data" / "compiled" / "desirable-properties.json",
    REPO / "web-app" / "data" / "desirable-properties.json",
    REPO / "web-app" / "data" / "compiled" / "desirable-properties.json",
    REPO / "web-app" / "public" / "data" / "compiled" / "desirable-properties.json",
]

NEW_ELEMENTS: dict[str, list[dict[str, str]]] = {
    "DP9": [
        {
            "name": "Broader Reach for Developers",
            "description": "Developers can build applications that work across the web of relevant pages, reaching more participants and enhancing content in ways not restricted by individual platforms. A tool built once operates wherever the shared interfaces are honored, without per-platform variants.",
        },
        {
            "name": "Community Access and Control",
            "description": "Community organizers and developers have the ability to create persistent, cross-platform communities that enhance collaboration and foster deeper engagement across the web. Facilitation, moderation, curation, and translation count as contributions eligible for the same discovery and reward surfaces as code.",
        },
        {
            "name": "Published Incentive Constitutions",
            "description": "Every incentive program publishes its goals, metrics, weighting, anti-gaming rules, appeals process, funding sources, and sunset conditions before contributions are solicited. Participants learn the rules from the constitution rather than inferring them from rejections.",
        },
        {
            "name": "Portable Recognition and Contribution Receipts",
            "description": "Credentials, attribution artifacts, and receipts of contribution interoperate across tools instead of accruing to the platform that issued them. Contributors carry their history and credibility with them when they move.",
        },
        {
            "name": "Commons Reciprocity and Long-Horizon Stewardship",
            "description": "Systems that benefit commercially from shared infrastructure return value to its upkeep through fees, maintainer support, or upstream contribution. Maintenance work such as triage, security patches, and accessibility fixes is rewarded as value creation rather than treated as background labor.",
        },
        {
            "name": "Anti-Gaming and Containment Safeguards",
            "description": "Scoring uses multiple metrics with safety, privacy, and interoperability as gating red lines rather than optional considerations. Automated submission and bulk AI-generated work is rate-limited, attested, and reviewed so rewards track meaningful contribution instead of extraction.",
        },
    ],
    "DP12": [
        {
            "name": "AI Governance via Meta-Communities",
            "description": "Meta-communities can play a role in overseeing and governing AI behavior, ensuring that AI operates in ways that align with community standards and ethical practices.",
        },
        {
            "name": "Zone-Scoped Governance",
            "description": "Communities define rules within specific zones of interaction, matched to the context and risk of what happens there, with explicit boundaries and inheritance between nested zones. Governance applies where the interaction occurs rather than as a single global setting.",
        },
        {
            "name": "Policy as Executable Objects",
            "description": "Rules are expressed as structured, machine-readable objects carrying scope, triggers, enforcement hooks, authorship, and version history, and they bind to behavior at the moment of generation, moderation, ranking, or data access. Binding is deterministic and inspectable, so identical inputs under the same policy produce the same governed outcome.",
        },
        {
            "name": "Governance Loops and Memory",
            "description": "Governance runs as a continuous cycle of propose, implement, observe, contest, and revise, with stated time bounds and clear state transitions. Decisions, rationale, disputes, and outcomes are persistently recorded and linked to policy versions, so communities can learn from prior rulings instead of relitigating them.",
        },
        {
            "name": "Policy-Bound Verification and Containment",
            "description": "Governed actions emit receipts naming the policies applied, the conditions evaluated, the outcome, and any override, and those receipts are independently verifiable. Containment mechanisms enforce what governance declares through permission gating, quotas, sandboxing tiers, and graduated escalation, with drift between stated intent and observed behavior treated as a detectable defect.",
        },
        {
            "name": "Participatory Ratification with Bounded AI Assistance",
            "description": "Adoption is a defined event with stated quorum and thresholds, a signed policy object, recorded rationale, and a notice period proportional to the change's impact. AI may summarize, simulate, and analyze proposals, and must disclose that assistance, but material decisions require human ratification.",
        },
    ],
    "DP20": [
        {
            "name": "Meta-layer Ownership",
            "description": "Establish mechanisms that enable the community to own and/or control the meta-layer, with decision rights that bind operators rather than advising them.",
        },
        {
            "name": "Universal Knowledge Graph Ownership",
            "description": "Establish mechanisms that enable the community to own, control, and monetize the system and/or aspects of the universal knowledge graph. Vocabularies, classification schemes, annotations, curation, and provenance are treated as ownable and forkable assets rather than exhaust that accrues to whoever hosts them.",
        },
        {
            "name": "Charter and Rights Bundle",
            "description": "A written and machine-readable charter states membership, decision rights, economic rights, data rights, fork rights, and sunset conditions, mapping each role to the powers it actually holds. Tools operating in the zone enforce charter constraints at the interaction level, and prior versions remain inspectable so rule changes cannot happen quietly.",
        },
        {
            "name": "Credible Exit and Fork",
            "description": "Communities can export collective artifacts, migrate identifiers where honest, and continue governing under divergent values without coercion or penalty. A fork inherits provenance, governance memory, and semantic structure, so leaving costs distribution rather than history.",
        },
        {
            "name": "Anti-Capture Controls",
            "description": "Rotation, conflict-of-interest rules, minority protections, and emergency pause pathways keep concentrated stakeholders from converting resources into permanent control. Concentration is measured and disclosed, and intervention pathways exist before capture becomes structural.",
        },
        {
            "name": "Stewardship Obligations",
            "description": "Ownership is custodial as well as proprietary: holders accept duties for moderation, security, inclusion, accessibility, and maintenance of shared knowledge, with defined enforcement and public reporting on fulfillment. Surplus is accounted transparently enough that members can trace value from source to allocation to outcome.",
        },
    ],
}


def render_markdown(dp: dict) -> str:
    lines = [
        f"# {dp['id']} \u2013 {dp['name']}",
        "",
        f"*{dp['landing_subtitle']}*",
        "",
        "## Overview",
        "",
        dp["description"],
        "",
        "## Why It Matters",
        "",
        dp["landing_text"],
        "",
        "## Key Elements",
        "",
    ]
    for el in dp["elements"]:
        lines += [f"### {el['name']}", "", el["description"], ""]
    return "\n".join(lines)


def main() -> int:
    source = MIRRORS[0]
    data = json.loads(source.read_text(encoding="utf-8"))

    for dp in data["desirable_properties"]:
        if dp["id"] in NEW_ELEMENTS:
            dp["elements"] = NEW_ELEMENTS[dp["id"]]
            dp["markdown"] = render_markdown(dp)
            print(f"{dp['id']}: {len(dp['elements'])} elements, markdown rebuilt")

    payload = json.dumps(data, indent=2) + "\n"
    for path in MIRRORS:
        path.write_text(payload, encoding="utf-8")
        print(f"wrote {path.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
