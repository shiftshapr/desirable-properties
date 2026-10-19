#!/usr/bin/env python3
"""Re-anchor Canopi book Discuss posts from a reviewed manifest (production, box #1).

Each manifest entry names a Canopi message and the anchor it should have: the passage's
page text (textQuote exact/prefix/suffix), its occurrence index on the page, and for
inserts the position (above/below). Optional: tag_type (patch|insert) and the corrected
post text (numbering / line-break fixes only).

The anchorIdentityHash is recomputed exactly as Canopi does (utils/anchorIdentityHash.js):
sha256(normalizedPageUrl \\0 lower(collapsed exact) \\0 instanceIndex).

Dry run by default; prints every change. --apply writes all rows in one transaction and
first saves the current values to a backup file for rollback (--rollback <backup>).

    python3 apply_canopi_anchor_fixes.py manifest.json
    python3 apply_canopi_anchor_fixes.py manifest.json --apply
    python3 apply_canopi_anchor_fixes.py --rollback anchor-fixes-backup-<ts>.json --apply
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import secrets
import subprocess
import sys
import urllib.parse
from pathlib import Path

CANOPI_ENV = Path("/home/ubuntu/canopi-prod/.env")


def read_env(path: Path) -> dict[str, str]:
    out = {}
    for line in path.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def db_url() -> str:
    u = urllib.parse.urlparse(read_env(CANOPI_ENV)["DATABASE_URL"])
    keep = [(k, v) for k, v in urllib.parse.parse_qsl(u.query) if k == "sslmode"]
    return urllib.parse.urlunparse(u._replace(query=urllib.parse.urlencode(keep)))


def psql(sql: str, *, read_only: bool) -> str:
    prefix = "set default_transaction_read_only=on; " if read_only else ""
    res = subprocess.run(["psql", db_url(), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-Atc", prefix + sql],
                         capture_output=True, text=True, timeout=120)
    if res.returncode != 0:
        raise SystemExit(f"psql failed: {res.stderr.strip()[:400]}")
    return res.stdout


def lit(value) -> str:
    """Dollar-quoted SQL literal (no escaping problems with quotes in post text)."""
    if value is None:
        return "NULL"
    tag = "q" + secrets.token_hex(4)
    return f"${tag}${value}${tag}$"


def norm_url(url: str) -> str:
    u = urllib.parse.urlparse(url.strip())
    host = u.hostname.replace("www.", "", 1) if u.hostname and u.hostname.startswith("www.") else (u.hostname or "")
    path = u.path[:-1] if len(u.path) > 1 and u.path.endswith("/") else u.path
    origin = f"{u.scheme}://{host}" + (f":{u.port}" if u.port else "")
    out = f"{origin}{path}" + (f"?{u.query}" if u.query else "")
    return out.lower().rstrip("/")


def anchor_hash(page_url: str, exact: str, instance: int) -> str:
    norm_exact = re.sub(r"\s+", " ", exact.lower()).strip()
    return hashlib.sha256(f"{norm_url(page_url)}\0{norm_exact}\0{instance}".encode()).hexdigest()


def load_rows(ids: list[str]) -> dict[str, dict]:
    id_list = ",".join(lit(i) + "::uuid" for i in ids)
    out = psql(
        "select json_agg(json_build_object('id', id, 'context_anchor', context_anchor, 'anchor_content_hash', "
        f"anchor_content_hash, 'payload', payload, 'tag_type', tag_type, 'content', content, 'page_id', page_id)) from messages where id in ({id_list})",
        read_only=True,
    ).strip()
    return {r["id"]: r for r in (json.loads(out) if out and out != "" else [])}


def as_obj(raw):
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str) and raw.strip():
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def plan(entry: dict, row: dict) -> dict:
    anchor = as_obj(row["context_anchor"])
    # A manifest pageUrl moves the post to another chapter page (page_id follows the URL).
    page_url = entry.get("pageUrl") or anchor.get("pageUrl")
    if not page_url:
        raise SystemExit(f"{entry['id']}: no pageUrl on the post or in the manifest")
    anchor["pageUrl"] = page_url
    anchor["anchorType"] = anchor.get("anchorType") or "text"
    anchor["textQuote"] = {"type": "TextQuoteSelector", "exact": entry["exact"],
                           "prefix": entry.get("prefix") or "", "suffix": entry.get("suffix") or ""}
    anchor["instanceIndex"] = int(entry.get("instanceIndex") or 0)
    h = anchor_hash(page_url, entry["exact"], anchor["instanceIndex"])
    anchor["anchorIdentityHash"] = h
    payload = as_obj(row["payload"])
    if entry.get("position"):
        payload["insertPosition"] = entry["position"]
    elif "insertPosition" in payload and entry.get("tag_type") == "patch":
        payload.pop("insertPosition")
    content = row["content"]
    if entry.get("text_from") and entry.get("text_to"):
        if entry["text_from"] not in content:
            raise SystemExit(f"{entry['id']}: text_from not found in the post content; refusing")
        content = content.replace(entry["text_from"], entry["text_to"], 1)
    page_id = row["page_id"]
    if entry.get("pageUrl"):
        u = urllib.parse.urlparse(entry["pageUrl"])
        page_id = re.sub(r"[^a-zA-Z0-9]", "_", f"{u.hostname}{u.path}")[:100].lower()
    return {"context_anchor": json.dumps(anchor, ensure_ascii=False), "anchor_content_hash": h, "page_id": page_id,
            "payload": json.dumps(payload, ensure_ascii=False), "tag_type": entry.get("tag_type") or row["tag_type"],
            "content": content}


def update_sql(mid: str, new: dict) -> str:
    return (f"update messages set context_anchor = {lit(new['context_anchor'])}, anchor_content_hash = {lit(new['anchor_content_hash'])}, "
            f"payload = {lit(new['payload'])}::jsonb, tag_type = {lit(new['tag_type'])}, content = {lit(new['content'])}, page_id = {lit(new['page_id'])}, "
            f"updated_at = now() where id = {lit(mid)}::uuid;")


def main() -> int:
    global CANOPI_ENV
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("manifest", nargs="?")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--rollback", help="restore rows from a backup file written by --apply")
    ap.add_argument("--env-file", default=str(CANOPI_ENV), help="Canopi .env with DATABASE_URL (default: production)")
    args = ap.parse_args()
    CANOPI_ENV = Path(args.env_file)

    if args.rollback:
        rows = json.loads(Path(args.rollback).read_text())
        sql = "begin; " + " ".join(update_sql(r["id"], {**r, "payload": json.dumps(as_obj(r["payload"]))}) for r in rows) + " commit;"
        print(f"rollback: {len(rows)} rows")
        if args.apply:
            psql(sql, read_only=False)
            print("restored")
        return 0

    entries = json.loads(Path(args.manifest).read_text())
    rows = load_rows([e["id"] for e in entries])
    missing = [e["id"] for e in entries if e["id"] not in rows]
    if missing:
        raise SystemExit(f"not found in Canopi: {missing}")
    plans = []
    for e in entries:
        row = rows[e["id"]]
        new = plan(e, row)
        old_exact = (as_obj(as_obj(row["context_anchor"]).get("textQuote")) or {}).get("exact", "")
        print(f"DP{e.get('dp', '?')} {e['id'][:8]} {row['tag_type']}→{new['tag_type']} {e.get('position') or ''}")
        print(f"    old: {old_exact[:110]!r}")
        print(f"    new: {e['exact'][:110]!r}")
        if new["page_id"] != row["page_id"]:
            print(f"    page: {row['page_id']} → {new['page_id']}")
        if new["content"] != row["content"]:
            print(f"    text: {e['text_from'][:60]!r} → {e['text_to'][:60]!r}")
        plans.append((e["id"], row, new))
    print(f"{len(plans)} posts")
    if not args.apply:
        print("dry run; re-run with --apply")
        return 0
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path(f"anchor-fixes-backup-{stamp}.json")
    backup.write_text(json.dumps([{"id": mid, **{k: row[k] for k in ("context_anchor", "anchor_content_hash", "payload", "tag_type", "content", "page_id")}}
                                  for mid, row, _ in plans], ensure_ascii=False, indent=1))
    print(f"backup: {backup.resolve()}")
    psql("begin; " + " ".join(update_sql(mid, new) for mid, _, new in plans) + " commit;", read_only=False)
    print(f"updated {len(plans)} posts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
