#!/usr/bin/env python3
"""Extract and analyze DP content from inscriptions → local files."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
INSCRIPTIONS = REPO / "docs" / "desirable-property-inscriptions.md"
LOCAL_DIR = REPO / "desirableproperties-book" / "content" / "local"
DP_INDEX = REPO / "desirableproperties-book" / "assets" / "data" / "desirable-properties.json"

TIER1 = [
    "Purpose of This Draft",
    "Problem Statement",
    "Threats and Failure Modes",
    "Core Principle",
    "Primary Mechanisms and Structural Conditions",
]
TIER2 = [
    "Relationship to Other Desirable Properties",
    "Non-Goals and Explicit Boundaries",
    "Minimum",
    "Open Questions",
    "Path Toward ML-RFC",
    "Closing Orientation",
]
SKIP_EXTRACT = {13, 23}  # keep existing local working copies


def normalize_heading(h: str) -> str:
    h = re.sub(r"\*+", "", h).strip()
    h = re.sub(r"^\d+(?:\.\d+)?\\?\.\s*", "", h)
    return re.sub(r"\s+", " ", h)


def matches_bucket(h: str, keywords: list[str]) -> bool:
    low = h.lower()
    return any(k.lower() in low for k in keywords)


def classify_heading(h: str) -> str | None:
    n = normalize_heading(h)
    low = n.lower()
    if "purpose of this draft" in low:
        return "tier1:Purpose"
    if low.startswith("problem statement"):
        return "tier1:Problem"
    if "threat" in low and ("failure" in low or "risk" in low):
        return "tier1:Threats"
    if "core principle" in low:
        return "tier1:Core"
    if "primary mechanisms" in low or "structural conditions" in low:
        return "tier1:Mechanisms"
    if "relationship to other" in low:
        return "tier2:Relationships"
    if "non-goals" in low or "explicit boundaries" in low:
        return "tier2:NonGoals"
    if "minimum" in low and "alignment" in low:
        return "tier2:Minimum"
    if "open questions" in low:
        return "tier2:OpenQuestions"
    if "path toward ml-rfc" in low:
        return "tier2:MLRFC"
    if "closing" in low:
        return "tier2:Closing"
    return None


def extract_dps(text: str) -> dict[int, str]:
    pattern = re.compile(
        r"<!-- DP(\d+) \|([^|]+)\|([^|]+)\|([^>]+)-->\s*\n(.*?)(?=\n<!-- DP|\Z)",
        re.S,
    )
    out: dict[int, str] = {}
    for m in pattern.finditer(text):
        num = int(m.group(1))
        out[num] = m.group(5).strip()
    return out


def analyze_body(body: str) -> dict:
    headings = [normalize_heading(h) for h in re.findall(r"^## (.+)$", body, re.M)]
    buckets: set[str] = set()
    for h in re.findall(r"^## (.+)$", body, re.M):
        c = classify_heading(h)
        if c:
            buckets.add(c)
    words = len(body.split())
    return {"headings": headings, "buckets": buckets, "words": words}


def dp_titles() -> dict[int, str]:
    import json

    data = json.loads(DP_INDEX.read_text(encoding="utf-8"))
    return {
        int(d["id"].replace("DP", "")): d["name"]
        for d in data["desirable_properties"]
    }


def cmd_extract(force: bool = False) -> int:
    text = INSCRIPTIONS.read_text(encoding="utf-8")
    dps = extract_dps(text)
    titles = dp_titles()
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    for n in range(1, 24):
        if n in SKIP_EXTRACT:
            print(f"DP{n:02d}: skip extract (local working copy)")
            continue
        if n not in dps:
            print(f"DP{n:02d}: WARNING no inscription block", file=sys.stderr)
            continue
        path = LOCAL_DIR / f"dp{n}.md"
        if path.exists() and not force:
            print(f"DP{n:02d}: exists, skip (use --force)")
            continue
        body = dps[n]
        title = titles.get(n, f"DP{n}")
        header = f"# DP{n} – {title}\n\n"
        path.write_text(header + body + "\n", encoding="utf-8")
        info = analyze_body(body)
        print(f"DP{n:02d}: extracted {info['words']} words → {path.name}")
    return 0


def cmd_analyze() -> int:
    print(f"{'DP':<5} {'Words':>6} {'T1':>3} {'T2':>3} {'Local':>6}  Missing Tier-1")
    print("-" * 70)
    for n in range(1, 24):
        path = LOCAL_DIR / f"dp{n}.md"
        if not path.exists():
            print(f"DP{n:02d}  —     —   —   —   NO")
            continue
        body = path.read_text(encoding="utf-8")
        info = analyze_body(body)
        t1 = sum(1 for b in info["buckets"] if b.startswith("tier1:"))
        t2 = sum(1 for b in info["buckets"] if b.startswith("tier2:"))
        missing = []
        for label, keys in [
            ("Purpose", ["tier1:Purpose"]),
            ("Problem", ["tier1:Problem"]),
            ("Threats", ["tier1:Threats"]),
            ("Core", ["tier1:Core"]),
            ("Mechanisms", ["tier1:Mechanisms"]),
        ]:
            if not any(k in info["buckets"] for k in keys):
                missing.append(label)
        print(
            f"DP{n:02d}  {info['words']:6} {t1:3} {t2:3}   yes  "
            + (", ".join(missing) if missing else "—")
        )
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="DP local content pipeline")
    sub = p.add_subparsers(dest="cmd", required=True)
    ex = sub.add_parser("extract", help="Extract ordinal → content/local/")
    ex.add_argument("--force", action="store_true")
    sub.add_parser("analyze", help="Report section coverage")
    args = p.parse_args()
    if args.cmd == "extract":
        return cmd_extract(force=args.force)
    if args.cmd == "analyze":
        return cmd_analyze()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
