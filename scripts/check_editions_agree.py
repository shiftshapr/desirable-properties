#!/usr/bin/env python3
"""
Editions agreement check (docs/EDITIONS.md).

Fails, with a readable list, when the edition record and the records that carry an edition disagree:

  * json/editions.json against the rails in content/local (sha256 and the Gov Hub revision each holds);
  * exactly one edition in progress;
  * archive stamps and current_label in chapter-archives.json;
  * inscription records in sources-sat.json (edition, and whether the inscribed text is on that list);
  * edition stamps in chapter and book PDFs;
  * the generated files are exactly what the generator makes from json/editions.source.json
    (so a hand edit fails), and, with --base, every commit that changed them is a [rail-sync] commit.

Records with no stamp yet (PDFs built before editions existed, a manifest made from a fixture) are
listed as gaps: shown on every run, failing only with --strict.

Usage:
    python3 scripts/check_editions_agree.py
    python3 scripts/check_editions_agree.py --base origin/staging     # CI: also the [rail-sync] rule
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import book_editions as editions  # noqa: E402

REPO_ROOT = SCRIPTS_DIR.parent
GENERATED = (
    'desirableproperties-book/json/editions.json',
    'desirableproperties-book/json/editions.source.json',
)


def rail_sync_rule(base: str) -> list[str]:
    """Every commit since ``base`` that touched the generated manifest must say [rail-sync]."""
    try:
        out = subprocess.run(
            ['git', '-C', str(REPO_ROOT), 'log', '--format=%H%x00%s%x00%B%x1e', f'{base}..HEAD', '--', *GENERATED],
            check=True, capture_output=True, text=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        return [f'could not read git history since {base}: {exc}']
    errs = []
    for rec in out.split('\x1e'):
        rec = rec.strip()
        if not rec:
            continue
        sha, subject, body = (rec.split('\x00') + ['', ''])[:3]
        if '[rail-sync]' not in body:
            errs.append(f'commit {sha[:10]} "{subject}" edits the editions manifest without [rail-sync] '
                        f'(only the rail sync may change it)')
    return errs


ARCHIVE = 'desirableproperties-book/downloads/editions'


def archive_immutable_rule(base: str) -> list[str]:
    """An edition's archive folder is written once: no change or removal of a file that existed at base."""
    try:
        out = subprocess.run(['git', '-C', str(REPO_ROOT), 'diff', '--name-status', f'{base}...HEAD', '--', ARCHIVE],
                             check=True, capture_output=True, text=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        return [f'could not read git diff since {base}: {exc}']
    errs = []
    for line in out.splitlines():
        parts = line.split('\t')
        status, path = parts[0], parts[-1]
        if status.startswith('A'):
            folder = '/'.join(path.split('/')[:4])
            existed = subprocess.run(['git', '-C', str(REPO_ROOT), 'cat-file', '-e', f'{base}:{folder}'],
                                     capture_output=True).returncode == 0
            if existed:
                errs.append(f'{path}: a file added to the existing archive folder {folder} (written once)')
        else:
            errs.append(f'{path}: {status} in an edition archive folder (written once, never changed)')
    return errs


def govhub_pdf_record(url: str):
    import json
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (check_editions_agree)'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:  # noqa: BLE001
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--base', default='', help='Git ref to check the [rail-sync] rule against (CI)')
    ap.add_argument('--strict', action='store_true', help='Gaps fail too')
    ap.add_argument('--book-root', default=str(REPO_ROOT / 'desirableproperties-book'))
    ap.add_argument('--govhub', default='', help='Gov Hub base URL: compare archived PDFs with its PDF record')
    args = ap.parse_args()

    book_root = Path(args.book_root).resolve()
    report = editions.check_agreement(REPO_ROOT, book_root=book_root)
    if (book_root / 'json' / editions.MANIFEST_NAME).is_file():
        _, diffs = editions.regenerate_from_snapshot(book_root)
        report.errors.extend(diffs)
    if args.base:
        report.errors.extend(rail_sync_rule(args.base))
        report.errors.extend(archive_immutable_rule(args.base))
    record = None
    if args.govhub:
        record = govhub_pdf_record(f'{args.govhub.rstrip("/")}/api/doc/editions/pdfs/?work=desirableproperties-book')
        if record is None:
            report.gaps.append(f'{args.govhub} has no edition PDF record to compare the archive with (not live yet?)')
    arch = editions.check_edition_archive(REPO_ROOT, record)
    report.errors.extend(arch.errors)
    report.gaps.extend(arch.gaps)
    report.info.extend(arch.info)

    def show(title: str, rows: list[str]) -> None:
        if rows:
            print(f'{title} ({len(rows)}):')
            for row in rows:
                print(f'  - {row}')
            print()

    show('Disagreements', report.errors)
    show('Gaps (no stamp yet)', report.gaps)
    show('Recorded as they are', report.info)
    failed = bool(report.errors) or (args.strict and bool(report.gaps))
    print(f'Editions agreement: {"FAILED" if failed else "OK"} '
          f'({len(report.errors)} disagreement(s), {len(report.gaps)} gap(s))')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
