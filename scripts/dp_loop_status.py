#!/usr/bin/env python3
"""Collect DP governance-loop status for the two ops dashboards.

Dashboard 1 (book):  Gov Hub DP → BRC333 DP → DP book
Dashboard 2 (reqs):  Gov Hub DP → ML-REQ → ML-ADR → Overweb coding

Read-only. Sources: Gov Hub prod SQLite (opened mode=ro), book rails on disk,
deployed book HTML, GitHub Actions runs (gh), BRC333 sources-sat.json, Overweb
working sets, meta-console ML-REQ/ADR YAML, code references.

Writes one JSON (default data/loop/dp-loop-status.json) that challenge-site
/admin?tab=loop-book and ?tab=loop-reqs render. See docs/DP-LOOP-OPS.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import urllib.request
from pathlib import Path

HOME = Path("/home/ubuntu")
DP_ROOT = HOME / "desirable-properties"
GOVHUB_DB = HOME / "gov-hub-prod/instance/datatracker.db"
GOVHUB_DEV_DB = HOME / "gov-hub-dev/instance_dev/datatracker_dev.db"  # staging sandbox hub
BOOK = DP_ROOT / "desirableproperties-book"
RAILS = BOOK / "content/local"
ML_MAP = DP_ROOT / "challenge-site/src/data/dp-ml-draft-map.json"
ASTRA_RELEASE = DP_ROOT / "astra/releases/2026-09-05-integrated"
REQ_DIR = HOME / "overweb/intent/astra"
META_CONSOLE = HOME / "meta-console"
CODE_REPOS = {
    "canopi-sdk": HOME / "canopi-sdk",
    "canopi": HOME / "canopi",
    "gov-hub-dev": HOME / "gov-hub-dev",
    "meta-console": META_CONSOLE,
}
RAIL_REPO = "shiftshapr/desirable-properties"
RAIL_WORKFLOW = "govhub-rail-sync.yml"
GH_BIN = os.environ.get("GH_BIN") or "/home/ubuntu/bin/gh"
BOOK_URLS = {
    "prod": "https://book.desirableproperties.org",
    "staging": os.environ.get("DP_STAGING_BOOK_URL", "https://staging.book.desirableproperties.org"),
}
DEFAULT_OUT = DP_ROOT / "data/loop/dp-loop-status.json"
INSCRIBE_API = os.environ.get("BRC333_INSCRIBE_API", "http://127.0.0.1:8766")
BOOK_PROJECT = "desirableproperties-book-ordinal"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from govhub_dp_common import strip_sync_marker  # noqa: E402


def body_key(text: str) -> str:
    """Hash of a rail body with the govhub-sync stamp removed (same rule as rail sync)."""
    norm = strip_sync_marker(text).replace("\r\n", "\n").rstrip("\n") + "\n"
    return hashlib.sha256(norm.encode()).hexdigest()[:16]

STAMP_RE = re.compile(
    r"<!--\s*govhub-sync:\s*ml=(?P<ml>\S+)\s+revision=(?P<rev>\S+)\s+submission=(?P<sub>\S+)"
    r"\s+hash=(?P<hash>\S+)\s+synced=(?P<synced>\S+)\s*-->"
)


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dp_num(dp_id: str) -> int:
    return int(re.sub(r"\D", "", dp_id) or 0)


def load_ml_map() -> dict[str, dict]:
    data = json.loads(ML_MAP.read_text())
    return dict(sorted(data["map"].items(), key=lambda kv: dp_num(kv[0])))


# ---------------------------------------------------------------- Gov Hub


def govhub_state(ml_map: dict[str, dict], db: Path = GOVHUB_DB) -> tuple[dict[str, dict], list[str]]:
    """Per DP: served revision, working revision, proposal counts by status/channel."""
    errors: list[str] = []
    out: dict[str, dict] = {}
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=5)
        con.row_factory = sqlite3.Row
    except sqlite3.Error as e:
        return {}, [f"govhub db {db.name}: {e}"]
    for dp_id, meta in ml_map.items():
        ml = meta["mlNumber"]
        row: dict = {"ml": ml, "label": meta.get("label"), "served": None, "working": None,
                     "revisions": 0, "proposals": {}, "channels": {}, "last_proposal_at": None}
        root = con.execute(
            "select id, draft_name from submission where ml_number=? "
            "and (is_revision=0 or is_revision is null) order by submitted_at limit 1", (ml,)
        ).fetchone()
        if not root:
            errors.append(f"{dp_id}: no Gov Hub root for {ml}")
            out[dp_id] = row
            continue
        refs = (root["id"], root["draft_name"])
        fam = con.execute(
            "select id, status, revision_number, approved_at, content_hash, what_changed, file_path "
            "from submission where id in (?,?) or parent_draft_name in (?,?)", refs + refs
        ).fetchall()
        approved = [r for r in fam if r["status"] == "approved" and r["approved_at"]]
        approved.sort(key=lambda r: r["approved_at"])
        row["revisions"] = len(approved)
        if approved:
            s = approved[-1]
            row["served"] = {
                "submission": s["id"], "revision": s["revision_number"] or "00",
                "approved_at": s["approved_at"], "hash": (s["content_hash"] or "")[:16],
                "what_changed": (s["what_changed"] or "")[:160],
                "body_key": None,
            }
            fp = Path(s["file_path"] or "")
            if fp.is_file():
                row["served"]["body_key"] = body_key(fp.read_text(errors="replace"))
        working = [r for r in fam if r["status"] == "working"]
        family_ids = [r["id"] for r in fam]
        q = ",".join("?" * len(family_ids))
        for st, ch, n, last in con.execute(
            f"select status, coalesce(source_channel,'gov-hub'), count(*), max(created_at) "
            f"from dp_proposal where submission_id in ({q}) group by 1, 2", family_ids
        ):
            row["proposals"][st] = row["proposals"].get(st, 0) + n
            row["channels"][ch] = row["channels"].get(ch, 0) + n
            if last and (not row["last_proposal_at"] or last > row["last_proposal_at"]):
                row["last_proposal_at"] = last
        if working:
            w = working[0]
            applied = con.execute(
                "select count(*) from dp_proposal where incorporated_submission_id=? and status='accepted'",
                (w["id"],),
            ).fetchone()[0]
            row["working"] = {"submission": w["id"], "revision": w["revision_number"], "applied": applied}
        out[dp_id] = row
    con.close()
    return out, errors


# ---------------------------------------------------------------- Book / BRC333


def rail_stamps() -> dict[str, dict]:
    out = {}
    for p in RAILS.glob("dp*.md"):
        m = re.fullmatch(r"dp(\d+)\.md", p.name)
        if not m:
            continue
        head = p.read_text(errors="replace")[:4000]
        s = STAMP_RE.search(head)
        out[f"DP{int(m.group(1))}"] = {
            "file": str(p.relative_to(DP_ROOT)),
            "stamp": s.groupdict() if s else None,
            "sha256_16": hashlib.sha256(p.read_bytes()).hexdigest()[:16],
            "body_key": body_key(p.read_text(errors="replace")),
            "mtime": dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc).isoformat()[:19] + "Z",
        }
    return out


def fetch(url: str, timeout: int = 8) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "dp-loop-status/1"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(400_000).decode("utf-8", "replace")
    except Exception:
        return None


def deployed_book_stamps(env: str, dp_ids: list[str]) -> dict[str, dict | None]:
    """Read the govhub-sync stamp from the deployed rail file for each DP."""
    base = BOOK_URLS[env].rstrip("/")
    out: dict[str, dict | None] = {}
    for dp_id in dp_ids:
        body = fetch(f"{base}/content/local/dp{dp_num(dp_id)}.md")
        if body is None:
            out[dp_id] = None
            continue
        s = STAMP_RE.search(body[:4000])
        out[dp_id] = {"stamp": s.groupdict() if s else None, "body_key": body_key(body)}
    return out


def rail_sync_runs(limit: int = 10) -> tuple[list[dict], str | None]:
    try:
        res = subprocess.run(
            [GH_BIN, "run", "list", "-R", RAIL_REPO, "--workflow", RAIL_WORKFLOW, "-L", str(limit),
             "--json", "databaseId,status,conclusion,event,createdAt,updatedAt,url,displayTitle"],
            capture_output=True, text=True, timeout=30,
        )
        if res.returncode != 0:
            return [], res.stderr.strip()[:300]
        return json.loads(res.stdout), None
    except Exception as e:  # gh missing or network
        return [], str(e)[:300]


def brc333_state(skip_network: bool) -> tuple[dict[str, dict], str | None]:
    """Per DP: sources-sat localOverride + inscribe-api inventory drift (local vs on-chain)."""
    out: dict[str, dict] = {}
    src = BOOK / "json/sources-sat.json"
    for it in json.loads(src.read_text()).get("sources", []) if src.exists() else []:
        m = re.fullmatch(r"dp(\d+)", str(it.get("railKey") or ""), re.I)
        if m:
            out[f"DP{int(m.group(1))}"] = {"localOverride": it.get("localOverride"),
                                            "inscriptionId": it.get("inscriptionId"),
                                            "status": it.get("status")}
    if skip_network:
        return out, "skipped"
    try:
        with urllib.request.urlopen(f"{INSCRIBE_API}/v1/projects/{BOOK_PROJECT}/inventory", timeout=60) as r:
            inv = json.load(r)
    except Exception as e:
        return out, f"inscribe-api inventory: {e}"[:300]
    for rail in inv.get("rails", []):
        m = re.fullmatch(r"dp(\d+)", str(rail.get("railKey") or ""), re.I)
        if not m:
            continue
        d = out.setdefault(f"DP{int(m.group(1))}", {})
        d.update({k: rail.get(k) for k in (
            "sat", "latestSatInscriptionId", "operation", "queue", "contentBytes",
            "syncedContentBytes", "localDiffersFromSynced", "hubPreviewDrift", "blockedReason")})
        d.setdefault("inscriptionId", rail.get("inscriptionId"))
    return out, None


# ---------------------------------------------------------------- Overweb


def published_equivalence(gh: dict[str, dict]) -> dict[str, dict]:
    """Regenerate from each served Gov Hub body and diff against the working set (no writes)."""
    try:
        sys.path.insert(0, "/home/ubuntu/gov-hub-dev")
        from services import ml_req_generate as gen  # type: ignore
        from ml_req_regen_on_publish import as_set  # type: ignore
    except Exception as e:  # generator unavailable
        return {"_error": {"error": str(e)[:200]}}
    con = sqlite3.connect(f"file:{GOVHUB_DB}?mode=ro", uri=True, timeout=5)
    out = {}
    for dp_id, g in gh.items():
        sub = (g.get("served") or {}).get("submission")
        wpath = REQ_DIR / f"{dp_id.lower()}-reqs.json"
        if not sub or not wpath.exists():
            continue
        row = con.execute("select file_path from submission where id=?", (sub,)).fetchone()
        if not row or not Path(row[0] or "").is_file():
            continue
        gs = gen.generate_req_set(dp_id=dp_id, body=Path(row[0]).read_text(errors="replace"))
        d = gen.diff_req_sets(as_set(json.loads(wpath.read_text())), gs)
        out[dp_id] = {k: d[k] for k in ("added", "removed", "changed")}
    con.close()
    return out


def req_sets(served: dict[str, dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in sorted(REQ_DIR.glob("dp*-reqs.json"), key=lambda x: dp_num(x.stem)):
        d = json.loads(p.read_text())
        src = d.get("source") or {}
        dp_id = src.get("dp_id") or f"DP{dp_num(p.stem)}"
        reqs = d.get("reqs") or []
        astra = {}
        chap = ASTRA_RELEASE / f"dp{dp_num(dp_id):02d}/chapter.json"
        if chap.exists():
            cj = json.loads(chap.read_text())
            astra = {"baselineMlDraft": cj.get("baselineMlDraft"),
                     "baselineSha256_16": (cj.get("baselineSha256") or "")[:16],
                     "finalSha256_16": (cj.get("finalSha256") or "")[:16]}
        sketch_ids = sorted({s.get("id") for r in reqs for s in r.get("adr_sketches") or []})
        out[dp_id] = {
            "file": str(p),
            "status": d.get("status"), "canonical": d.get("canonical"),
            "packing": d.get("packing"),
            "source_kind": src.get("kind"), "release": src.get("release"),
            "source_revision": src.get("govhub_revision"),  # set by the Gate-1 hook; absent on Astra sets
            "source_hash16": src.get("body_sha256_16"),
            "generated_at": src.get("generated_at"),
            "astra": astra,
            "reqs": len(reqs),
            "must": sum(len(r.get("must") or []) for r in reqs),
            "should": sum(len(r.get("should") or []) for r in reqs),
            "could": sum(len(r.get("could") or []) for r in reqs),
            "req_ids": [r.get("id") for r in reqs],
            "adr_sketches": len(sketch_ids),
            "adr_sketch_ids": sketch_ids,
        }
    return out


def pending_clones() -> dict[str, dict]:
    """Unpublished regeneration clones written by the Gate-1 publish hook."""
    out = {}
    root = REQ_DIR / "pending"
    for p in root.glob("dp*-reqs.json") if root.exists() else []:
        d = json.loads(p.read_text())
        dp_id = (d.get("source") or {}).get("dp_id") or f"DP{dp_num(p.stem)}"
        out[dp_id] = {"file": str(p), "diff": d.get("diff"),
                      "source_revision_number": (d.get("source") or {}).get("revision_number"),
                      "source_revision": (d.get("source") or {}).get("govhub_revision"),
                      "generated_at": (d.get("source") or {}).get("generated_at")}
    return out


def meta_console_records() -> dict:
    recs = {"reqs": [], "adrs": []}
    for kind, sub in (("reqs", "docs/ml-req"), ("adrs", "docs/ml-adr")):
        for p in sorted((META_CONSOLE / sub).glob("ML-*.yaml")):
            text = p.read_text(errors="replace")
            st = re.search(r"^status:\s*(\S+)", text, re.M)
            title = re.search(r"^title:\s*(.+)$", text, re.M)
            links = re.findall(r"ML-REQ-\d+", text) if kind == "adrs" else []
            recs[kind].append({"id": p.stem, "status": st.group(1) if st else None,
                               "title": title.group(1).strip().strip('"') if title else None,
                               "decides_for": sorted(set(links))})
    return recs


GOVHUB_PUBLIC = "https://interfacehub.net"
POSITION_LABELS = {"chair": "Coordinator", "co_editor": "Co-editor", "co_lead": "Co-lead"}


def admin_queue(db: Path = GOVHUB_DB, now: dt.datetime | None = None) -> dict:
    """What is waiting on a person in Gov Hub: nominations, co-editor claims, stale proposals.

    Each item is one stable alert line, so the monitor posts it once when it appears
    and once when it clears.
    """
    now = now or dt.datetime.utcnow()
    out = {"nominations_awaiting_admin": [], "nominations_unanswered": [], "co_editor_claims": [],
           "stale_proposal_dps": [], "alerts": [], "error": None}
    try:
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=5)
        con.row_factory = sqlite3.Row
        cols = {r[1] for r in con.execute("pragma table_info(working_group_chair)")}
        rows = con.execute("select * from working_group_chair").fetchall()
        stale = con.execute(
            "select s.ml_number as ml, count(*) as n from dp_proposal p join submission s on s.id = p.submission_id "
            "where p.status = 'pending' and p.created_at < ? group by s.ml_number order by s.ml_number",
            ((now - dt.timedelta(days=7)).isoformat(sep=" "),),
        ).fetchall()
        con.close()
    except sqlite3.Error as e:
        out["error"] = f"admin queue: {e}"
        return out

    def day(v):
        return str(v or "")[:10]

    review = f"{GOVHUB_PUBLIC}/admin/chair-nominations/"
    for r in rows:
        pos = POSITION_LABELS.get(r["position_key"] or "chair", r["position_key"])
        who = f"{r['chair_name']}, {pos} in {r['group_acronym']}"
        # StorageBoolean is stored as the text 'true' / 'false'
        approved = str(r["approved"]).strip().lower() in ("1", "true") or r["status"] == "approved"
        if r["status"] == "nominee_accepted" and not approved:
            out["nominations_awaiting_admin"].append(who)
            out["alerts"].append(f"Nomination awaiting admin approval: {who} (since {day(r['set_at'])}) {review}")
        elif r["status"] == "pending_nominee" and r["set_at"] and str(r["set_at"]) < (now - dt.timedelta(days=14)).isoformat(sep=" "):
            out["nominations_unanswered"].append(who)
            out["alerts"].append(f"Nomination unanswered by the nominee since {day(r['set_at'])}: {who}")
        elif ("claimed" in cols and r["claimed"] and approved and r["position_key"] == "co_editor"
              and r["set_at"] and str(r["set_at"]) > (now - dt.timedelta(days=7)).isoformat(sep=" ")):
            until = (dt.datetime.fromisoformat(str(r["set_at"])[:19]) + dt.timedelta(days=7)).date().isoformat()
            out["co_editor_claims"].append(who)
            out["alerts"].append(f"Co-editor seat claimed: {r['chair_name']} in {r['group_acronym']} (coordinator can revoke until {until})")
    out["stale_proposal_dps"] = [f"{x['ml']} ({x['n']})" for x in stale if x["ml"]]
    if out["stale_proposal_dps"]:
        out["alerts"].append("Proposals pending over 7 days: " + ", ".join(x["ml"] for x in stale if x["ml"]))
    return out


def govhub_numbered_reqs() -> list[dict]:
    try:
        con = sqlite3.connect(f"file:{GOVHUB_DB}?mode=ro", uri=True, timeout=5)
        rows = con.execute(
            "select ml_number, doc_type, status, title from submission where doc_type in ('req','adr')"
        ).fetchall()
        con.close()
        return [{"ml": r[0], "doc_type": r[1], "status": r[2], "title": r[3]} for r in rows]
    except sqlite3.Error:
        return []


def code_refs(dp_ids: list[str]) -> dict:
    """Count DPn-REQ-/ML-REQ-/ML-ADR- references in tracked code per repo (git grep)."""
    per_dp: dict[str, dict[str, int]] = {d: {} for d in dp_ids}
    repos: dict[str, dict] = {}
    for name, path in CODE_REPOS.items():
        if not (path / ".git").exists():
            continue
        res = subprocess.run(
            ["git", "-C", str(path), "grep", "-I", "-o", "-E", r"DP[0-9]+-REQ-[0-9]+|ML-(REQ|ADR)-[0-9]+",
             "--", ":!*.md", ":!*.json", ":!docs/**"],
            capture_output=True, text=True, timeout=60,
        )
        hits = [ln.rsplit(":", 1)[-1] for ln in res.stdout.splitlines() if ln]
        untracked = subprocess.run(["git", "-C", str(path), "status", "--porcelain"],
                                   capture_output=True, text=True, timeout=30).stdout.count("\n")
        head = subprocess.run(["git", "-C", str(path), "log", "-1", "--format=%h %cI %s"],
                              capture_output=True, text=True, timeout=10).stdout.strip()
        repos[name] = {"refs": len(hits), "uncommitted_paths": untracked, "head": head}
        for h in hits:
            m = re.match(r"DP(\d+)-REQ-", h)
            if m and f"DP{int(m.group(1))}" in per_dp:
                per_dp[f"DP{int(m.group(1))}"][name] = per_dp[f"DP{int(m.group(1))}"].get(name, 0) + 1
    return {"repos": repos, "per_dp": per_dp}


def gh_issue_refs() -> dict:
    try:
        res = subprocess.run(
            [GH_BIN, "search", "issues", "REQ", "--owner", "Bridgit-DAO", "--json",
             "title,url,state,repository", "-L", "50"],
            capture_output=True, text=True, timeout=30,
        )
        items = json.loads(res.stdout) if res.returncode == 0 else []
        items = [i for i in items if re.search(r"DP\d+-REQ-\d+|ML-(REQ|ADR)-\d+", i.get("title", ""))]
        return {"items": items, "error": None if res.returncode == 0 else res.stderr[:200]}
    except Exception as e:
        return {"items": [], "error": str(e)[:200]}


# ---------------------------------------------------------------- assemble


def stage(state: str, note: str = "") -> dict:
    """state: ok | warn | bad | idle | na"""
    return {"state": state, "note": note}


def build(skip_network: bool) -> dict:
    ml_map = load_ml_map()
    dp_ids = list(ml_map)
    gh, gh_err = govhub_state(ml_map)
    gh_dev, _ = govhub_state(ml_map, GOVHUB_DEV_DB)
    rails = rail_stamps()
    brc, brc_err = brc333_state(skip_network)
    runs, runs_err = ([], "skipped") if skip_network else rail_sync_runs()
    deployed = {env: ({} if skip_network else deployed_book_stamps(env, dp_ids)) for env in BOOK_URLS}
    reqs = req_sets(gh)
    equiv = published_equivalence(gh)
    clones = pending_clones()
    mc = meta_console_records()
    numbered = govhub_numbered_reqs()
    code = code_refs(dp_ids)
    issues = {"items": [], "error": "skipped"} if skip_network else gh_issue_refs()

    book_rows, req_rows = [], []
    for dp_id in dp_ids:
        g = gh.get(dp_id, {})
        served = g.get("served") or {}
        pend = g.get("proposals", {}).get("pending", 0)
        rail = rails.get(dp_id) or {}
        stamp = rail.get("stamp") or {}

        # --- dashboard 1
        s_review = stage("warn" if pend else "idle", f"{pend} pending" if pend else "no pending proposals")
        if g.get("working"):
            s_review = stage("warn", f"working rev {g['working']['revision']}: {g['working']['applied']} promoted, unpublished")
        if not served:
            s_gov = stage("bad", "no approved revision")
        else:
            s_gov = stage("ok", f"rev {served['revision']} · {served['approved_at'][:10]}")
        stamp_rev = stamp.get("rev")
        if not rail:
            s_rail = stage("bad", "rail file missing")
        elif not served:
            s_rail = stage("na", "no served revision")
        elif served.get("body_key") and rail.get("body_key") != served["body_key"]:
            s_rail = stage("bad", f"rail body differs from Gov Hub rev {served['revision']}")
        elif stamp.get("sub") == served.get("submission"):
            s_rail = stage("ok", f"rev {stamp_rev} · synced {stamp['synced'][:10]}")
        else:
            s_rail = stage("warn", f"body = rev {served['revision']}; stamp says rev {stamp_rev}")
        envs = {}
        dev_served = (gh_dev.get(dp_id) or {}).get("served") or {}
        dev_work = (gh_dev.get(dp_id) or {}).get("working")
        for env in BOOK_URLS:
            d = deployed[env].get(dp_id) if deployed[env] else None
            # prod book follows the repo rail; the staging book is the sandbox and follows DEV Gov Hub
            want = rail.get("body_key") if env == "prod" else dev_served.get("body_key")
            label = "rail" if env == "prod" else f"dev hub rev {dev_served.get('revision', '?')}"
            if skip_network:
                envs[env] = stage("na", "not checked")
            elif d is None:
                envs[env] = stage("bad", "fetch failed")
            elif d.get("body_key") == want:
                envs[env] = stage("ok", f"= {label}" + (f" · dev working rev {dev_work['revision']} ({dev_work['applied']} promoted)" if env == "staging" and dev_work else ""))
            else:
                envs[env] = stage("bad", f"serves stamp rev {(d.get('stamp') or {}).get('rev', '?')}, differs from {label}")
        b = brc.get(dp_id) or {}
        if b.get("localOverride"):
            s_brc_web = stage("ok", f"reads {b['localOverride']}")
        else:
            s_brc_web = stage("warn", "no localOverride; Live mode reads chain copy")
        if not b.get("inscriptionId"):
            s_brc_chain = stage("idle", "not inscribed yet (first mint)")
        elif b.get("localDiffersFromSynced"):
            s_brc_chain = stage("idle", f"on-chain {b.get('syncedContentBytes')}B vs rail {b.get('contentBytes')}B · reinscribe queue {b.get('queue')}")
        elif "localDiffersFromSynced" in b:
            s_brc_chain = stage("ok", "on-chain = rail")
        else:
            s_brc_chain = stage("na", "inventory not checked")
        book_rows.append({
            "dp": dp_id, "ml": g.get("ml"), "label": g.get("label"),
            "proposals": g.get("proposals", {}), "channels": g.get("channels", {}),
            "served": served, "working": g.get("working"), "rail": rail, "brc333": b,
            "stages": {"review": s_review, "govhub": s_gov, "rail": s_rail,
                       "staging": envs["staging"], "prod": envs["prod"],
                       "brc333_web": s_brc_web, "brc333_chain": s_brc_chain},
        })

        # --- dashboard 2
        r = reqs.get(dp_id)
        clone = clones.get(dp_id)
        eq = equiv.get(dp_id)
        if not r:
            s_req = stage("bad", "no working set")
        elif eq is None:
            s_req = stage("na", f"{r['reqs']} REQs from {r.get('source_kind')}; equivalence not checked")
        elif not (eq["added"] or eq["removed"] or eq["changed"]):
            s_req = stage("ok", f"{r['reqs']} REQs = published rev {served.get('revision')}")
        else:
            s_req = stage("bad", f"differs from published rev {served.get('revision')}: "
                                 f"+{len(eq['added'])} −{len(eq['removed'])} ~{len(eq['changed'])}")
        if clone:
            dd = clone.get("diff") or {}
            s_req = stage("warn", f"{s_req['note']} · regen clone rev {clone.get('source_revision_number') or '?'} pending chair review "
                                  f"(+{len(dd.get('added') or [])} −{len(dd.get('removed') or [])} ~{len(dd.get('changed') or [])})")
        pub = [n for n in numbered if n["doc_type"] == "req" and n["status"] == "approved"
               and dp_id.lower() in (n.get("title") or "").lower()]
        s_pub = stage("ok", f"{len(pub)} ML-REQ published") if pub else stage("idle", "chairs have not published ML-REQ-NNN")
        s_adr = stage("idle", f"{r['adr_sketches']} sketches, 0 accepted") if r else stage("na")
        refs = code["per_dp"].get(dp_id) or {}
        s_code = stage("ok", ", ".join(f"{k}:{v}" for k, v in refs.items())) if refs else stage("idle", "no code cites these REQs")
        req_rows.append({
            "dp": dp_id, "ml": g.get("ml"), "label": g.get("label"), "served": served,
            "reqset": {k: v for k, v in (r or {}).items() if k not in ("req_ids", "adr_sketch_ids")},
            "req_ids": (r or {}).get("req_ids", []), "adr_sketch_ids": (r or {}).get("adr_sketch_ids", []),
            "clone": clone, "code_refs": refs, "published_diff": eq,
            "stages": {"govhub": s_gov, "ml_req_working": s_req, "ml_req_published": s_pub,
                       "ml_adr": s_adr, "coding": s_code},
        })

    totals = {
        "pending_proposals": sum(r["proposals"].get("pending", 0) for r in book_rows),
        "canopi_channel_proposals": sum(r["channels"].get("canopi", 0) for r in book_rows),
        "working_revisions": sum(1 for r in book_rows if r["working"]),
        "rail_drift": sum(1 for r in book_rows if r["stages"]["rail"]["state"] == "bad"),
        "stale_stamps": sum(1 for r in book_rows if r["stages"]["rail"]["state"] == "warn"),
        "chain_behind": sum(1 for r in book_rows if (r.get("brc333") or {}).get("localDiffersFromSynced")),
        "prod_drift": sum(1 for r in book_rows if r["stages"]["prod"]["state"] == "bad"),
        "staging_drift": sum(1 for r in book_rows if r["stages"]["staging"]["state"] == "bad"),
        "reqs": sum((r["reqset"] or {}).get("reqs", 0) for r in req_rows),
        "must": sum((r["reqset"] or {}).get("must", 0) for r in req_rows),
        "reqs_from_published": sum(1 for r in req_rows if r["stages"]["ml_req_working"]["state"] == "ok"),
        "pending_clones": len(clones),
        "numbered_reqs": len([n for n in numbered if n["doc_type"] == "req"]),
        "numbered_adrs": len([n for n in numbered if n["doc_type"] == "adr"]),
    }
    last_run = runs[0] if runs else None
    alerts = []
    if totals["rail_drift"]:
        alerts.append(f"{totals['rail_drift']} rail(s) behind Gov Hub served revision")
    if totals["prod_drift"]:
        alerts.append(f"{totals['prod_drift']} prod book chapter(s) behind rails")
    if last_run and last_run.get("conclusion") not in (None, "", "success"):
        alerts.append(f"last rail-sync run {last_run.get('conclusion')}: {last_run.get('url')}")
    if runs_err and runs_err != "skipped":
        alerts.append(f"rail-sync run list unavailable: {runs_err}")
    if totals["pending_clones"]:
        alerts.append(f"{totals['pending_clones']} ML-REQ regeneration clone(s) awaiting chair review (overweb/intent/astra/pending/)")
    unequal = [r["dp"] for r in req_rows if r["stages"]["ml_req_working"]["state"] in ("bad", "warn")]
    if unequal:
        alerts.append(f"ML-REQ working set differs from published DP: {', '.join(unequal)}")
    if totals["working_revisions"]:
        alerts.append(f"{totals['working_revisions']} working revision(s) promoted but unpublished")
    queue = admin_queue()
    alerts.extend(queue["alerts"])
    return {
        "schema": "dp-loop-status/v1",
        "generated_at": now_iso(),
        "totals": totals,
        "alerts": alerts,
        "admin_queue": {k: v for k, v in queue.items() if k != "alerts"},
        "errors": gh_err + ([brc_err] if brc_err and brc_err != "skipped" else [])
                  + ([equiv["_error"]["error"]] if "_error" in equiv else []),
        "rail_sync": {"repo": RAIL_REPO, "workflow": RAIL_WORKFLOW, "runs": runs, "error": runs_err},
        "book": book_rows,
        "reqs": req_rows,
        "records": {"meta_console": mc, "govhub_numbered": numbered},
        "code": {"repos": code["repos"], "issues": issues},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--skip-network", action="store_true", help="skip gh + deployed book fetches")
    ap.add_argument("--print", action="store_true", help="print a short text summary")
    args = ap.parse_args()
    status = build(args.skip_network)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    tmp = args.out.with_suffix(".tmp")
    tmp.write_text(json.dumps(status, indent=1, default=str))
    tmp.replace(args.out)
    if args.print:
        print(json.dumps({"generated_at": status["generated_at"], "totals": status["totals"],
                          "alerts": status["alerts"], "errors": status["errors"]}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
