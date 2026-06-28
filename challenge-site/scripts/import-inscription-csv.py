#!/usr/bin/env python3
"""Merge OrdinalsBot CSV export(s) into submission-inscriptions.json.

Each CSV row maps filename like ``21.html`` to inscription ID; we store
``21.json`` as the submission source_file key used in provenance data.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/submission-inscriptions.json'


def parse_csv(path: Path) -> dict[str, str]:
    mapping: dict[str, str] = {}
    with path.open(newline='', encoding='utf-8-sig') as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames:
            reader.fieldnames = [name.strip().strip('"') for name in reader.fieldnames]
        for row in reader:
            norm = {k.strip().strip('"'): (v or '').strip().strip('"') for k, v in row.items()}
            filename = norm.get('filename', '')
            inscription_id = norm.get('inscriptionId', '')
            match = re.match(r'^(\d+)\.html$', filename, re.I)
            if not match or not inscription_id:
                continue
            key = f"{match.group(1)}.json"
            mapping[key] = inscription_id
    return mapping


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv_files', nargs='+', type=Path, help='OrdinalsBot CSV export(s)')
    parser.add_argument('--replace', action='store_true', help='Replace existing map instead of merging')
    args = parser.parse_args()

    existing: dict[str, str] = {}
    existing_meta: dict = {}
    if OUT.exists() and not args.replace:
        payload = json.loads(OUT.read_text(encoding='utf-8'))
        existing = payload.get('by_source_file', {})
        existing_meta = payload.get('meta', {})

    merged = dict(existing)
    batches = list(existing_meta.get('source_batches', []))
    for csv_path in args.csv_files:
        merged.update(parse_csv(csv_path))
        batches.append(csv_path.name)

    filtered = {
        key: value
        for key, value in merged.items()
        if key.replace('.json', '').isdigit() and 1 <= int(key.replace('.json', '')) <= 46
    }
    ordered = dict(sorted(filtered.items(), key=lambda item: int(item[0].replace('.json', ''))))

    payload = {
        'by_source_file': ordered,
        'meta': {
            'updated_at': existing_meta.get('updated_at'),
            'source_batches': sorted(set(batches)),
            'mapped_count': len(ordered),
            'note': 'Mapped N.html inscription filenames to N.json submission source_file keys (submissions 1–46).',
        },
    }
    OUT.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(ordered)} mappings to {OUT}')


if __name__ == '__main__':
    main()
