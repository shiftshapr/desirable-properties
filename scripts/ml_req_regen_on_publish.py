#!/usr/bin/env python3
"""Gate 1 hook: a published DP revision opens an unpublished ML-REQ regeneration clone.

Spec: gov-hub-dev/docs/ML-REQ-ML-ADR-SPEC.md §10. For each DP whose Gov Hub served
(approved) revision differs from the last one this hook saw:

  1. generate an ML-REQ set from the served Gov Hub body (same generator as generate-ml-reqs),
  2. diff it against the current working set in overweb/intent/astra/dpN-reqs.json,
  3. write the clone to overweb/intent/astra/pending/dpN-reqs.{json,md} with the diff.

It never overwrites the working set and never publishes ML-REQ-NNN. `--adopt DPn
--human-confirmed` copies a reviewed clone over the working set (still canonical:false);
chairs then publish numbered records on Gov Hub.

Runs from the govhub-rail-sync deploy step (right after a Publish lands in the rails) and
from the scheduled loop monitor as a fallback. See docs/DP-LOOP-OPS.md.

  python3 scripts/ml_req_regen_on_publish.py --init        # record current served revs, no clones
  python3 scripts/ml_req_regen_on_publish.py               # clones for DPs published since
  python3 scripts/ml_req_regen_on_publish.py --dp DP4 --force
  python3 scripts/ml_req_regen_on_publish.py --adopt DP4 --human-confirmed
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sqlite3
import sys
from pathlib import Path
from types import SimpleNamespace

HOME = Path("/home/ubuntu")
DP_ROOT = HOME / "desirable-properties"
GOVHUB_ROOT = Path("/home/ubuntu/gov-hub-dev")  # generator lives on the dev checkout
GOVHUB_DB = HOME / "gov-hub-prod/instance/datatracker.db"
ML_MAP = DP_ROOT / "challenge-site/src/data/dp-ml-draft-map.json"
REQ_DIR = HOME / "overweb/intent/astra"
PENDING = REQ_DIR / "pending"
BASELINE = DP_ROOT / "data/loop/ml-req-baseline.json"


def load_generator():
    sys.path.insert(0, str(GOVHUB_ROOT))
    from services import ml_req_generate  # type: ignore

    return ml_req_generate


def served_revisions(dp_filter: set[str] | None) -> dict[str, dict]:
    ml_map = json.loads(ML_MAP.read_text())["map"]
    con = sqlite3.connect(f"file:{GOVHUB_DB}?mode=ro", uri=True, timeout=5)
    con.row_factory = sqlite3.Row
    out = {}
    for dp_id, meta in ml_map.items():
        if dp_filter and dp_id not in dp_filter:
            continue
        ml = meta["mlNumber"]
        root = con.execute(
            "select id, draft_name from submission where ml_number=? "
            "and (is_revision=0 or is_revision is null) order by submitted_at limit 1", (ml,)
        ).fetchone()
        if not root:
            continue
        refs = (root["id"], root["draft_name"])
        row = con.execute(
            "select id, revision_number, approved_at, file_path, content_hash from submission "
            "where (id in (?,?) or parent_draft_name in (?,?)) and status='approved' and approved_at is not null "
            "order by approved_at desc limit 1", refs + refs
        ).fetchone()
        if row:
            out[dp_id] = {"ml": ml, "submission": row["id"], "revision": row["revision_number"] or "00",
                          "approved_at": row["approved_at"], "file_path": row["file_path"],
                          "content_hash": row["content_hash"]}
    con.close()
    return out


def as_set(payload: dict) -> SimpleNamespace:
    """Adapt a working-set JSON to the attribute shape diff_req_sets expects."""
    reqs = [SimpleNamespace(**{k: r.get(k) for k in ("id", "title", "must", "should", "could")})
            for r in payload.get("reqs") or []]
    return SimpleNamespace(reqs=reqs)


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_baseline() -> dict:
    return json.loads(BASELINE.read_text()) if BASELINE.exists() else {}


def save_baseline(data: dict) -> None:
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    BASELINE.write_text(json.dumps(data, indent=1, sort_keys=True))


def regen(dp_id: str, served: dict, gen, trigger: str, dry_run: bool) -> dict:
    body = Path(served["file_path"]).read_text(encoding="utf-8", errors="replace")
    gs = gen.generate_req_set(dp_id=dp_id, body=body, source_meta={
        "kind": "govhub-served",
        "ml": served["ml"],
        "govhub_revision": served["submission"],
        "revision_number": served["revision"],
        "approved_at": served["approved_at"],
        "govhub_content_hash16": (served["content_hash"] or "")[:16],
        "generated_at": now(),
        "trigger": trigger,
    })
    current_path = REQ_DIR / f"{dp_id.lower()}-reqs.json"
    current = json.loads(current_path.read_text()) if current_path.exists() else {"reqs": []}
    diff = gen.diff_req_sets(as_set(current), gs)
    diff["against"] = {"file": str(current_path), "source": current.get("source")}
    payload = gen.set_to_json(gs)
    payload["diff"] = diff
    payload["notes"] = payload.get("notes", []) + [
        "Pending regeneration clone opened by a Gate 1 publish. Unpublished; review, then "
        "adopt with --adopt --human-confirmed. Never overwrites published ML-REQ-NNN.",
    ]
    summary = {"dp": dp_id, "revision": served["revision"], "reqs": len(gs.reqs), "packing": gs.packing,
               "added": len(diff["added"]), "removed": len(diff["removed"]), "changed": len(diff["changed"])}
    if not dry_run:
        PENDING.mkdir(parents=True, exist_ok=True)
        (PENDING / f"{dp_id.lower()}-reqs.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
        (PENDING / f"{dp_id.lower()}-reqs.md").write_text(gen.render_markdown(gs))
    return summary


def adopt(dp_id: str) -> int:
    src = PENDING / f"{dp_id.lower()}-reqs.json"
    if not src.exists():
        print(f"no pending clone for {dp_id}", file=sys.stderr)
        return 1
    payload = json.loads(src.read_text())
    payload.pop("diff", None)
    payload["canonical"] = False  # adopting a working set is still not publishing ML-REQ-NNN
    payload["status"] = "working"
    payload.setdefault("source", {})["adopted_at"] = now()
    dest = REQ_DIR / f"{dp_id.lower()}-reqs.json"
    archive = PENDING / "adopted"
    archive.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        shutil.copy2(dest, archive / f"{dp_id.lower()}-reqs.previous-{now().replace(':', '')}.json")
    dest.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    md = PENDING / f"{dp_id.lower()}-reqs.md"
    if md.exists():
        shutil.copy2(md, REQ_DIR / md.name)
    src.rename(archive / f"{dp_id.lower()}-reqs.adopted-{now().replace(':', '')}.json")
    if md.exists():
        md.unlink()
    print(f"{dp_id}: adopted clone into {dest} (canonical:false). Commit overweb/intent and rebuild theoverweb.org /reqs/.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--init", action="store_true", help="record current served revisions as baseline; no clones")
    ap.add_argument("--dp", action="append", help="limit to DP id(s), e.g. --dp DP4")
    ap.add_argument("--force", action="store_true", help="regenerate even if served revision is unchanged")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--trigger", default="manual", help="recorded in source.trigger (rail-sync, monitor, manual)")
    ap.add_argument("--adopt", metavar="DP", help="replace working set with its reviewed pending clone")
    ap.add_argument("--human-confirmed", action="store_true", help="required with --adopt (firewall)")
    args = ap.parse_args()

    if args.adopt:
        if not args.human_confirmed:
            print("--adopt requires --human-confirmed (agents cannot accept without a human).", file=sys.stderr)
            return 2
        return adopt(args.adopt.upper())

    dp_filter = {d.upper() for d in args.dp} if args.dp else None
    served = served_revisions(dp_filter)
    baseline = load_baseline()

    if args.init:
        for dp_id, s in served.items():
            baseline[dp_id] = {"submission": s["submission"], "revision": s["revision"], "seen_at": now()}
        if not args.dry_run:
            save_baseline(baseline)
        print(f"baseline recorded for {len(served)} DP(s); no clones generated")
        return 0

    gen = load_generator()
    results = []
    for dp_id, s in sorted(served.items(), key=lambda kv: int(kv[0][2:])):
        seen = (baseline.get(dp_id) or {}).get("submission")
        if not args.force and seen == s["submission"]:
            continue
        if not args.force and seen is None:
            # First sighting: record without flooding chairs with clones.
            baseline[dp_id] = {"submission": s["submission"], "revision": s["revision"], "seen_at": now()}
            continue
        results.append(regen(dp_id, s, gen, args.trigger, args.dry_run))
        baseline[dp_id] = {"submission": s["submission"], "revision": s["revision"], "seen_at": now()}
    if not args.dry_run:
        save_baseline(baseline)
    for r in results:
        print(f"{r['dp']:<5} rev {r['revision']}: {r['reqs']} REQs ({r['packing']}) "
              f"+{r['added']} −{r['removed']} ~{r['changed']} → pending clone")
    if not results:
        print("no newly published DP revisions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
