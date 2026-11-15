#!/usr/bin/env python3
"""
Stamp an existing PDF with its edition, without rebuilding it (docs/EDITIONS.md, "PDFs").

Only for a PDF whose text has been shown to be exactly a revision on an edition list. The stamp goes into
the document info only (Keywords ``dp-edition=<id>; dp-rail=<rail>; dp-submission=<id>``), written as an
incremental update: the original bytes stay untouched as a prefix of the new file, so every page is the
same content. The script refuses unless the edition lists that submission for that rail, and checks
afterwards that the original bytes are a prefix and that every page's extracted text is unchanged.

Needs pypdf (``pip install pypdf``); the agreement check itself does not.

Usage:
    python3 scripts/stamp_pdf_edition.py --edition 0.77 --rail dp01 --submission fmpzlexh docs/dp-pdfs/dp1-....pdf
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

import book_editions as editions  # noqa: E402

REPO_ROOT = SCRIPTS_DIR.parent


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--edition', required=True)
    ap.add_argument('--rail', required=True)
    ap.add_argument('--submission', required=True)
    ap.add_argument('pdfs', nargs='+')
    args = ap.parse_args()
    from pypdf import PdfReader, PdfWriter  # noqa: PLC0415

    manifest = json.loads((REPO_ROOT / 'desirableproperties-book/json/editions.json').read_text(encoding='utf-8'))
    ed = next((e for e in manifest['editions'] if e['editionId'] == args.edition), None)
    row = next((r for r in (ed or {}).get('rails', []) if r['railKey'] == args.rail), None)
    if not row or row.get('submissionId') != args.submission:
        print(f'ERROR: edition {args.edition} does not list submission {args.submission} for {args.rail}', file=sys.stderr)
        return 2
    keywords = f'dp-edition={row.get("revisionEdition") or args.edition}; dp-rail={args.rail}; dp-submission={args.submission}'
    for name in args.pdfs:
        path = Path(name)
        before = path.read_bytes()
        texts = [p.extract_text() for p in PdfReader(path).pages]
        writer = PdfWriter(str(path), incremental=True)
        writer.add_metadata({'/Keywords': keywords})
        tmp = path.with_suffix('.stamping')
        writer.write(str(tmp))
        after = tmp.read_bytes()
        same_text = [p.extract_text() for p in PdfReader(tmp).pages] == texts
        if not after.startswith(before) or not same_text:
            tmp.unlink()
            print(f'ERROR: {path}: the stamped file would not keep the original pages; not written', file=sys.stderr)
            return 3
        tmp.replace(path)
        print(f'{path}: {keywords} (+{len(after) - len(before)} bytes appended; {len(texts)} pages unchanged)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
