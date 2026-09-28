#!/usr/bin/env python3
"""Seed DEV Gov Hub with the DP review loop structure from PROD (staging sandbox).

Staging challenge-site points at DEV Gov Hub so Review → Promote → Publish can be
rehearsed without touching prod. DEV already carries the DP revision families; it lacks
the people and structure the Review tab needs: users, layers, layer members, DP
workgroups (+ members, chairs, layer links) and the DP proposals queue.

Additive only: rows whose primary key already exists in DEV are skipped; nothing in
DEV is updated or deleted. Users that already exist in DEV by email are remapped to the
DEV id. Password hashes are blanked (sign-in is Web3Auth). Custodial wallets, linked
accounts and notifications are never copied.

The DEV service holds SQLite in WAL mode, so this stops datatracker-dev.service, backs
the DB up with the SQLite backup API, writes, and starts the service again.

  python3 scripts/govhub_seed_dev_dp_loop.py --dry-run
  python3 scripts/govhub_seed_dev_dp_loop.py
"""
from __future__ import annotations

import argparse
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROD_DB = Path("/home/ubuntu/gov-hub-prod/instance/datatracker.db")
DEV_DB = Path("/home/ubuntu/gov-hub-dev/instance_dev/datatracker_dev.db")
DEV_UNIT = "datatracker-dev.service"

# (table, user-reference columns). Order matters for readability, not FKs (SQLite FKs off).
TABLES: list[tuple[str, tuple[str, ...]]] = [
    ("user", ()),
    ("layer", ("approved_by_id",)),
    ("layer_member", ("user_id",)),
    ("working_group", ("coordinator_id", "approved_by_id")),
    ("working_group_member", ("user_id",)),
    ("working_group_chair", ("user_id",)),
    ("workgroup_layer_link", ()),
    ("dp_proposal", ("author_user_id", "reviewed_by_user_id")),
]
BLANK_COLUMNS = {"user": {"password_hash": None}}


def cols(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute(f'pragma table_info("{table}")')]


def notnull_defaults(conn: sqlite3.Connection, table: str) -> dict:
    """Dev NOT NULL columns → value to use when prod has NULL or lacks the column."""
    out = {}
    for _, name, ctype, notnull, dflt, pk in conn.execute(f'pragma table_info("{table}")'):
        if not notnull or pk:
            continue
        if dflt is not None:
            v = dflt.strip("'\"")
            out[name] = int(v) if v.lstrip("-").isdigit() else v
        else:
            out[name] = 0 if any(t in (ctype or "").upper() for t in ("INT", "BOOL")) else ""
    return out


def systemctl(action: str) -> None:
    subprocess.run(["systemctl", "--user", action, DEV_UNIT], check=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-restart", action="store_true", help="do not stop/start the dev service")
    args = ap.parse_args()

    prod = sqlite3.connect(f"file:{PROD_DB}?mode=ro", uri=True)
    prod.row_factory = sqlite3.Row

    stopped = False
    if not args.dry_run and not args.no_restart:
        systemctl("stop")
        stopped = True
    try:
        if not args.dry_run:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup = DEV_DB.with_name(f"{DEV_DB.stem}.backup_pre_dp_loop_seed_{ts}{DEV_DB.suffix}")
            src = sqlite3.connect(DEV_DB)
            dst = sqlite3.connect(backup)
            src.backup(dst)
            dst.close()
            src.close()
            print(f"dev backup: {backup}")
        dev = sqlite3.connect(f"file:{DEV_DB}?mode=ro" if args.dry_run else str(DEV_DB), uri=args.dry_run)

        dev_by_email = {e.lower(): i for e, i in dev.execute("select email, id from user where email is not null")}
        user_map: dict[str, str] = {}
        for pid, email in prod.execute("select id, email from user"):
            if email and email.lower() in dev_by_email and dev_by_email[email.lower()] != pid:
                user_map[pid] = dev_by_email[email.lower()]
        print(f"user id remaps (existing dev accounts by email): {len(user_map)}")
        dev_layer_by_slug = {sl: i for sl, i in dev.execute("select slug, id from layer where slug is not null")}
        layer_map = {pid: dev_layer_by_slug[sl] for pid, sl in prod.execute("select id, slug from layer")
                     if sl in dev_layer_by_slug and dev_layer_by_slug[sl] != pid}
        print(f"layer id remaps (existing dev layers by slug): {len(layer_map)}")

        for table, user_cols in TABLES:
            pc, dc = cols(prod, table), cols(dev, table)
            if not dc:
                print(f"{table:<22} missing in dev; skipped")
                continue
            defaults = notnull_defaults(dev, table)
            common = [c for c in pc if c in dc]
            extra = [c for c in defaults if c not in common]
            existing = {r[0] for r in dev.execute(f'select id from "{table}"')}
            rows = prod.execute(f'select {", ".join(chr(34) + c + chr(34) for c in common)} from "{table}"').fetchall()
            new = []
            for r in rows:
                rec = dict(zip(common, r))
                if table == "user" and rec["id"] in user_map:
                    continue  # account already in dev under another id
                if table == "layer" and rec["id"] in layer_map:
                    continue  # layer already in dev under another id
                if rec.get("layer_id") in layer_map:
                    rec["layer_id"] = layer_map[rec["layer_id"]]
                if rec["id"] in existing:
                    continue
                for c in user_cols:
                    if rec.get(c) in user_map:
                        rec[c] = user_map[rec[c]]
                for c, v in BLANK_COLUMNS.get(table, {}).items():
                    if c in rec:
                        rec[c] = v
                for c, v in defaults.items():
                    if rec.get(c) is None:
                        rec[c] = v
                new.append(rec)
            print(f"{table:<22} prod {len(rows):>4}  dev {len(existing):>4}  insert {len(new):>4}")
            if args.dry_run or not new:
                continue
            names = common + extra
            placeholders = ", ".join("?" for _ in names)
            before = dev.total_changes
            dev.executemany(
                f'insert or ignore into "{table}" ({", ".join(chr(34) + c + chr(34) for c in names)}) values ({placeholders})',
                [tuple(rec.get(c) for c in names) for rec in new],
            )
            skipped = len(new) - (dev.total_changes - before)
            if skipped:
                print(f"{'':<22} {skipped} skipped on a dev unique key (dev row kept)")
        if not args.dry_run:
            dev.commit()
        dev.close()
    finally:
        if stopped:
            systemctl("start")
    return 0


if __name__ == "__main__":
    sys.exit(main())
