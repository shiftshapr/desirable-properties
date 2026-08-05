#!/usr/bin/env python3
"""
Pull latest approved Gov Hub revisions into book local rails (content/local/dpN.md).

This is the inverse of govhub_publish_dp_revisions.py: Gov Hub is the editorial
source of truth; the local rails are a synced working copy for the BRC333 book.

Usage:
    # dry run against production hub API (default)
    python3 scripts/govhub_sync_rails_from_hub.py --dry-run

    # write rails from production hub API
    python3 scripts/govhub_sync_rails_from_hub.py

    # sync from local Gov Hub SQLite (automation / no network)
    python3 scripts/govhub_sync_rails_from_hub.py --local-db --dry-run

    # production hub, single chapter
    python3 scripts/govhub_sync_rails_from_hub.py --env main --only DP1

Commit synced rails with [rail-sync] in the message so CI accepts the diff.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from govhub_dp_common import (
    default_govhub_root,
    fetch_body_via_api,
    fetch_body_via_db,
    filter_rails_by_only,
    flask_env_for_env,
    format_sync_marker,
    hub_url_for_env,
    load_sync_rails_manifest,
    local_rail_path,
    strip_sync_marker,
    upsert_sync_marker,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
DEFAULT_SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'


def _normalize(text: str) -> str:
    return strip_sync_marker(text).replace('\r\n', '\n').rstrip('\n') + '\n'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--env', default='main',
                        choices=sorted({'dev', 'development', 'main', 'production'}),
                        help='Gov Hub environment (default: main)')
    parser.add_argument('--hub-url', default='',
                        help='Override hub base URL (default: from --env)')
    parser.add_argument('--local-db', action='store_true',
                        help='Read from local Gov Hub SQLite instead of HTTP API')
    parser.add_argument('--govhub-root', default='',
                        help='Gov Hub checkout for --local-db (default: from --env)')
    parser.add_argument('--flask-env', default='',
                        choices=['', 'development', 'production'],
                        help='Flask env for --local-db (default: matches --env)')
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR),
                        help='Directory holding dpN.md local chapters')
    parser.add_argument('--sources-sat', default=str(DEFAULT_SOURCES_SAT),
                        help='sources-sat.json providing the DP -> ML-Draft mapping')
    parser.add_argument('--only', default='',
                        help='Comma-separated rails to sync (about, acknowledgements, DP1, …)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Report what would change without writing files')
    parser.add_argument('--report', default='',
                        help='Write a JSON report of the run to this path')
    args = parser.parse_args()

    content_dir = Path(args.content_dir).resolve()
    sources_sat = Path(args.sources_sat).resolve()
    for path in (content_dir, sources_sat):
        if not path.exists():
            print(f'ERROR: missing {path}', file=sys.stderr)
            return 2

    hub_url = (args.hub_url or hub_url_for_env(args.env)).rstrip('/')
    flask_env = args.flask_env or flask_env_for_env(args.env)
    govhub_root = (
        Path(args.govhub_root).resolve()
        if args.govhub_root
        else default_govhub_root(args.env).resolve()
    )

    rails = load_sync_rails_manifest(sources_sat)
    rails = filter_rails_by_only(rails, args.only)

    mode = 'local-db' if args.local_db else 'api'
    print(f'Content dir  : {content_dir}')
    print(f'Sources sat  : {sources_sat}')
    print(f'Rails target : {len(rails)}')
    print(f'Source mode  : {mode}')
    if args.local_db:
        print(f'Gov Hub root : {govhub_root}')
        print(f'FLASK_ENV    : {flask_env}')
    else:
        print(f'Hub URL      : {hub_url}')
    print(f'Run mode     : {"DRY RUN" if args.dry_run else "WRITE"}')
    print()

    synced_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    results: list[dict] = []

    for rail in rails:
        display = rail.get('display_key') or rail.get('railKey') or ''
        ml = rail['ml_number']
        local_path = local_rail_path(content_dir, rail)
        entry: dict = {
            'display_key': display,
            'ml_number': ml,
            'rail_key': rail['railKey'],
            'local_path': str(local_path),
            'status': 'pending',
        }
        if rail.get('dp'):
            entry['dp'] = rail['dp']

        if not ml:
            entry.update(status='error', error='missing mlNumber in sources-sat.json')
            results.append(entry)
            print(f'{display:<18} SKIP  no ML number in sources-sat.json')
            continue

        try:
            if args.local_db:
                body, info = fetch_body_via_db(govhub_root, flask_env, ml)
            else:
                body, info = fetch_body_via_api(hub_url, ml)
        except RuntimeError as exc:
            entry.update(status='error', error=str(exc))
            results.append(entry)
            print(f'{display:<18} ERR   {exc}')
            continue

        revision = info.get('revision_number') or '00'
        submission_id = info.get('submission_id') or ''
        content_hash = info.get('content_hash') or ''
        marker = format_sync_marker(
            ml_number=ml,
            revision_number=revision,
            submission_id=submission_id,
            content_hash=content_hash,
            synced_at=synced_at,
        )
        new_text = upsert_sync_marker(body, marker)
        old_text = local_path.read_text(encoding='utf-8') if local_path.is_file() else ''

        changed = _normalize(new_text) != _normalize(old_text)
        entry.update(
            submission_id=submission_id,
            revision_number=revision,
            content_hash=content_hash,
            changed=changed,
        )

        if not changed:
            entry['status'] = 'unchanged'
            results.append(entry)
            print(f'{display:<18} OK    {ml} rev {revision} unchanged')
            continue

        if args.dry_run:
            entry['status'] = 'dry-run'
            results.append(entry)
            print(f'{display:<18} DRY   {ml} rev {revision} would update {local_path.name}')
            continue

        local_path.write_text(new_text, encoding='utf-8')
        entry['status'] = 'written'
        results.append(entry)
        print(f'{display:<18} OK    {ml} rev {revision} -> {local_path.name}')

    changed_rows = [r for r in results if r.get('changed')]
    errors = [r for r in results if r['status'] == 'error']
    print()
    print(f'Changed: {len(changed_rows)}/{len(results)}')
    if errors:
        print('Errors:')
        for row in errors:
            label = row.get('display_key') or row.get('dp') or row.get('rail_key') or '?'
            print(f'  {label}: {row.get("error", "")}')

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps({
            'generated_at': synced_at,
            'mode': mode,
            'hub_url': hub_url if not args.local_db else None,
            'govhub_root': str(govhub_root) if args.local_db else None,
            'flask_env': flask_env if args.local_db else None,
            'dry_run': args.dry_run,
            'results': results,
        }, indent=2) + '\n', encoding='utf-8')
        print(f'Report: {report_path}')

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
