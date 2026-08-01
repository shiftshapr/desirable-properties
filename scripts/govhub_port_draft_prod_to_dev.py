#!/usr/bin/env python3
"""
Port one approved draft family from the Gov Hub production DB into dev.

scripts/port_prod_documents_to_dev.py in the Gov Hub repo replaces the *entire*
dev approved catalog, which drops dev-only drafts. This is the surgical version:
it copies a single draft family (the root row plus its revisions), its uploaded
file, and its document history, leaving everything else in dev untouched.

The motivating case is DP23 / ML-Draft-030, which exists on production but never
made it to dev, so `govhub_publish_dp_revisions.py` has no parent to hang a new
revision off. Dev also has unrelated test rows squatting on ML-Draft-030; use
--clear-conflicting-ml to blank the ml_number on non-approved rows that collide.

Usage:
    python3 scripts/govhub_port_draft_prod_to_dev.py --ml ML-Draft-030 --dry-run
    python3 scripts/govhub_port_draft_prod_to_dev.py --ml ML-Draft-030 \
        --clear-conflicting-ml

Run with the interpreter Gov Hub itself uses:
    /home/ubuntu/.pyenv/versions/3.9.18/bin/python3
"""
from __future__ import annotations

import argparse
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DEFAULT_DEV_DB = Path('/home/ubuntu/gov-hub-dev/instance_dev/datatracker_dev.db')
DEFAULT_PROD_DB = Path('/home/ubuntu/gov-hub-prod/instance/datatracker.db')
UPLOAD_FOLDER = Path('/home/ubuntu/data-tracker/uploads')
APPROVED = ('approved', 'published')


def table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute(f'PRAGMA table_info("{table}")').fetchall()]


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone() is not None


def family_rows(prod: sqlite3.Connection, ml: str) -> list[sqlite3.Row]:
    """Root row for an ML number plus every revision hanging off it."""
    root = prod.execute(
        f'''SELECT * FROM submission
            WHERE ml_number = ? AND status IN ({",".join("?" * len(APPROVED))})
            ORDER BY is_revision ASC, revision_number ASC''',
        (ml, *APPROVED),
    ).fetchall()
    if not root:
        return []
    refs = set()
    for row in root:
        refs.add(row['id'])
        if row['draft_name']:
            refs.add(row['draft_name'])
    ph = ','.join('?' * len(refs))
    revisions = prod.execute(
        f'SELECT * FROM submission WHERE parent_draft_name IN ({ph})', tuple(refs)
    ).fetchall()
    seen: dict[str, sqlite3.Row] = {}
    for row in list(root) + list(revisions):
        seen[row['id']] = row
    return list(seen.values())


def copy_submission_rows(prod: sqlite3.Connection, dev: sqlite3.Connection,
                         rows: list[sqlite3.Row]) -> int:
    prod_cols = table_columns(prod, 'submission')
    dev_cols = table_columns(dev, 'submission')
    cols = [c for c in prod_cols if c in dev_cols]
    col_sql = ', '.join(f'"{c}"' if c == 'group' else c for c in cols)
    placeholders = ', '.join('?' for _ in cols)
    for row in rows:
        dev.execute(
            f'INSERT OR REPLACE INTO submission ({col_sql}) VALUES ({placeholders})',
            tuple(row[c] for c in cols),
        )
    return len(rows)


def copy_files(rows: list[sqlite3.Row], *, dry_run: bool) -> int:
    copied = 0
    for row in rows:
        raw = row['file_path'] if 'file_path' in row.keys() else None
        if not raw:
            continue
        src = Path(raw)
        if not src.is_file():
            name = row['filename'] if 'filename' in row.keys() else None
            alt = UPLOAD_FOLDER / name if name else None
            if alt and alt.is_file():
                src = alt
            else:
                continue
        dest = UPLOAD_FOLDER / src.name
        copied += 1
        if dry_run:
            continue
        UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
        if src.resolve() != dest.resolve():
            shutil.copy2(src, dest)
    return copied


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--ml', required=True, help='ML number to port, e.g. ML-Draft-030')
    parser.add_argument('--dev-db', default=str(DEFAULT_DEV_DB))
    parser.add_argument('--prod-db', default=str(DEFAULT_PROD_DB))
    parser.add_argument('--clear-conflicting-ml', action='store_true',
                        help='Blank ml_number on non-approved dev rows holding this ML number')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    dev_db, prod_db = Path(args.dev_db), Path(args.prod_db)
    for path in (dev_db, prod_db):
        if not path.is_file():
            print(f'ERROR: missing DB {path}', file=sys.stderr)
            return 2

    prod = sqlite3.connect(f'file:{prod_db}?mode=ro', uri=True)
    prod.row_factory = sqlite3.Row
    dev = sqlite3.connect(dev_db)
    dev.row_factory = sqlite3.Row

    try:
        rows = family_rows(prod, args.ml)
        if not rows:
            print(f'ERROR: no approved production draft for {args.ml}', file=sys.stderr)
            return 1

        print(f'Production family for {args.ml}: {len(rows)} row(s)')
        for row in rows:
            print(f'  {row["draft_name"]:<12} rev={row["revision_number"] or "--":<4} '
                  f'{row["status"]:<10} {(row["title"] or "")[:52]}')

        conflicts = dev.execute(
            f'''SELECT id, draft_name, status, title FROM submission
                WHERE ml_number = ? AND status NOT IN ({",".join("?" * len(APPROVED))})''',
            (args.ml, *APPROVED),
        ).fetchall()
        if conflicts:
            print(f'\nDev rows already holding {args.ml} (non-approved): {len(conflicts)}')
            for row in conflicts:
                print(f'  {row["id"][:12]:<14} {row["status"]:<10} {(row["title"] or "")[:44]}')
            if not args.clear_conflicting_ml:
                print('  -> pass --clear-conflicting-ml to blank their ml_number')

        files = copy_files(rows, dry_run=True)
        print(f'\nUpload files to place: {files}')

        if args.dry_run:
            print('\nDry run - no changes written.')
            return 0

        ts = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup = dev_db.with_name(f'{dev_db.stem}.backup_pre_port_{args.ml}_{ts}{dev_db.suffix}')
        shutil.copy2(dev_db, backup)
        print(f'\nDev backup: {backup}')

        if conflicts and args.clear_conflicting_ml:
            dev.execute(
                f'''UPDATE submission SET ml_number = NULL
                    WHERE ml_number = ? AND status NOT IN ({",".join("?" * len(APPROVED))})''',
                (args.ml, *APPROVED),
            )
            print(f'Cleared ml_number on {len(conflicts)} non-approved dev row(s)')

        inserted = copy_submission_rows(prod, dev, rows)
        copied = copy_files(rows, dry_run=False)

        if table_exists(prod, 'document_history'):
            keys = {r['id'] for r in rows} | {r['draft_name'] for r in rows if r['draft_name']}
            ph = ','.join('?' * len(keys))
            hist_cols = [c for c in table_columns(prod, 'document_history')
                         if c in table_columns(dev, 'document_history')]
            if hist_cols:
                col_sql = ', '.join(hist_cols)
                placeholders = ', '.join('?' for _ in hist_cols)
                hist = prod.execute(
                    f'SELECT {col_sql} FROM document_history WHERE draft_name IN ({ph})',
                    tuple(keys),
                ).fetchall()
                for row in hist:
                    dev.execute(
                        f'INSERT OR REPLACE INTO document_history ({col_sql}) '
                        f'VALUES ({placeholders})',
                        tuple(row),
                    )
                print(f'History rows: {len(hist)}')

        dev.commit()
        print(f'Inserted {inserted} submission row(s), {copied} file(s)')
        return 0
    finally:
        prod.close()
        dev.close()


if __name__ == '__main__':
    sys.exit(main())
