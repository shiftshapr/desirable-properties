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

    # editions manifest from a recorded Gov Hub answer (tests; until the endpoint is live)
    python3 scripts/govhub_sync_rails_from_hub.py --editions-fixture scripts/fixtures/govhub-editions-desirableproperties-book.json

The run also generates json/editions.json from Gov Hub's edition record
(GET /api/doc/editions/?work=desirableproperties-book) and stamps chapter-archives.json and the
inscription records in sources-sat.json (docs/EDITIONS.md). When that endpoint is missing or its
answer is malformed, the run stops before writing anything.

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
    sync_marker_is_stale,
    upsert_sync_marker,
)
from govhub_rail_image_sync import sync_images_from_markdown
import book_editions as editions

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
DEFAULT_BOOK_ROOT = REPO_ROOT / 'desirableproperties-book'
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
    parser.add_argument('--book-root', default=str(DEFAULT_BOOK_ROOT),
                        help='Book root (parent of content/, assets/)')
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
    parser.add_argument('--editions-fixture', default='',
                        help='Read the edition record from this recorded Gov Hub answer instead of '
                             'GET /api/doc/editions/ (tests, and until the endpoint is live)')
    parser.add_argument('--editions-only', action='store_true',
                        help='Do not fetch rails: regenerate json/editions.json and the stamps from '
                             'the edition record and the rails as they are on disk')
    parser.add_argument('--skip-editions', action='store_true',
                        help='Emergency only: sync rails without regenerating json/editions.json. '
                             'The editions agreement check in CI will then fail until a full run.')
    args = parser.parse_args()

    content_dir = Path(args.content_dir).resolve()
    book_root = Path(args.book_root).resolve()
    sources_sat = Path(args.sources_sat).resolve()
    for path in (content_dir, sources_sat, book_root):
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

    # Edition record first: if Gov Hub's answer is missing or malformed, change nothing.
    editions_response = None
    editions_source: dict = {}
    if not args.skip_editions:
        try:
            if args.editions_fixture:
                fixture = Path(args.editions_fixture).resolve()
                editions_response = editions.load_fixture(fixture)
                try:
                    shown = str(fixture.relative_to(REPO_ROOT))
                except ValueError:
                    shown = str(fixture)
                editions_source = {'kind': 'fixture', 'path': shown}
            else:
                editions_response, url = editions.fetch_editions(hub_url)
                editions_source = {'kind': 'govhub-api', 'url': url}
            problems = editions.validate_response(
                editions_response, json.loads(sources_sat.read_text(encoding='utf-8')))
            if problems:
                raise editions.EditionsError(
                    'Gov Hub editions answer is malformed:\n  - ' + '\n  - '.join(problems))
        except editions.EditionsError as exc:
            print(f'ERROR: edition record unavailable; nothing was changed.\n{exc}', file=sys.stderr)
            return 3
        editions_source['fetchedAt'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        editions_source['responseSha256'] = editions.canonical_sha256(editions_response)
    else:
        print('WARNING: --skip-editions: json/editions.json is not regenerated; the editions '
              'agreement check will fail until a full sync runs.', file=sys.stderr)

    if args.editions_only and args.skip_editions:
        print('ERROR: --editions-only and --skip-editions contradict each other', file=sys.stderr)
        return 2
    rails = load_sync_rails_manifest(sources_sat)
    rails = filter_rails_by_only(rails, args.only)
    if args.editions_only:
        rails = []
    elif editions_response is not None:
        # Gov Hub resolves rails per database (dev: book_cover is ML-Draft-054, dp24 ML-Draft-057, no
        # Foreword). Fetch each rail by the document the edition in progress names for it.
        current = next(e for e in editions_response['editions'] if e.get('status') == 'in_progress')
        by_key = {r.get('railKey'): r for r in current.get('rails', [])}
        kept = []
        for rail in rails:
            row = by_key.get(rail['railKey'])
            if row is not None and editions.is_book_repo_entry(row):
                print(f'{rail.get("display_key") or rail["railKey"]:<18} SKIP  no Gov Hub document for this rail here')
                continue
            if row is not None and row.get('mlNumber') and row['mlNumber'] != rail['ml_number']:
                print(f'{rail.get("display_key") or rail["railKey"]:<18} NOTE  Gov Hub holds this rail as '
                      f'{row["mlNumber"]} (sources-sat.json: {rail["ml_number"]})')
                rail = dict(rail, ml_number=row['mlNumber'])
            kept.append(rail)
        rails = kept

    mode = 'local-db' if args.local_db else 'api'
    print(f'Content dir  : {content_dir}')
    print(f'Book root    : {book_root}')
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
    # Rail writes wait until the edition record has been generated and checked.
    pending_writes: list[tuple[Path, str]] = []
    synced_submissions: dict[str, str] = {}

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

        synced_submissions[rail['railKey']] = submission_id
        image_summary = sync_images_from_markdown(
            body,
            book_root=book_root,
            hub_url=hub_url,
            dry_run=args.dry_run,
        )
        body = image_summary.body
        if image_summary.results:
            entry['images'] = [
                {
                    'source': row.source,
                    'status': row.status,
                    'dest_path': row.dest_path,
                    'canonical_url': row.canonical_url,
                    'detail': row.detail,
                }
                for row in image_summary.results
            ]

        marker = format_sync_marker(
            ml_number=ml,
            revision_number=revision,
            submission_id=submission_id,
            content_hash=content_hash,
            synced_at=synced_at,
        )
        new_text = upsert_sync_marker(body, marker)
        old_text = local_path.read_text(encoding='utf-8') if local_path.is_file() else ''

        body_changed = _normalize(new_text) != _normalize(old_text)
        stamp_stale = bool(old_text) and sync_marker_is_stale(old_text, submission_id)
        rail_changed = body_changed or stamp_stale
        assets_changed = image_summary.assets_changed
        changed = rail_changed or assets_changed
        entry.update(
            submission_id=submission_id,
            revision_number=revision,
            content_hash=content_hash,
            changed=changed,
            rail_changed=rail_changed,
            body_changed=body_changed,
            stamp_stale=stamp_stale,
            assets_changed=assets_changed,
        )

        image_note = ''
        if image_summary.copied:
            image_note = f' images={image_summary.copied}'
        elif any(row.status == 'error' for row in image_summary.results):
            image_note = ' image-errors'

        if not changed:
            entry['status'] = 'unchanged'
            results.append(entry)
            print(f'{display:<18} OK    {ml} rev {revision} unchanged{image_note}')
            continue

        if args.dry_run:
            entry['status'] = 'dry-run'
            results.append(entry)
            parts = []
            if rail_changed:
                parts.append(f'would update {local_path.name}'
                             + ('' if body_changed else ' (stamp only)'))
            if assets_changed:
                parts.append(f'would sync {image_summary.copied or len(image_summary.results)} image(s)')
            print(f'{display:<18} DRY   {ml} rev {revision} {"; ".join(parts)}{image_note}')
            continue

        if rail_changed:
            pending_writes.append((local_path, new_text))
        entry['status'] = 'written'
        results.append(entry)
        action = local_path.name if rail_changed else 'images only'
        if rail_changed and not body_changed:
            action += ' (stamp only)'
        print(f'{display:<18} OK    {ml} rev {revision} -> {action}{image_note}')

    editions_summary: dict = {}
    if editions_response is not None:
        overlay: dict[str, bytes] = {}
        for path, text in pending_writes:
            try:
                overlay['/' + str(path.resolve().relative_to(book_root))] = text.encode('utf-8')
            except ValueError:
                pass
        manifest_path = sources_sat.parent / editions.MANIFEST_NAME
        previous = (json.loads(manifest_path.read_text(encoding='utf-8'))
                    if manifest_path.is_file() else None)
        try:
            book = editions.Book.load(book_root, overlay=overlay, sources_sat_path=sources_sat)
            gen = editions.generate(editions_response, book, source=editions_source, previous=previous)
            held = dict(synced_submissions)
            if held is not None:
                # Rails not fetched in this run (--editions-only, --only, a fetch error) hold what their
                # govhub-sync markers name; they must agree with the edition in progress too.
                for key in json.loads(sources_sat.read_text(encoding='utf-8')).get('articleRails') or []:
                    if key in held:
                        continue
                    row = editions.live_rail(gen.manifest, key) or {}
                    local = row.get('localPath')
                    data = book.read_local(local) if local else None
                    sub = editions.sync_marker_submission(data.decode('utf-8', 'replace')) if data else None
                    if sub and row.get('submissionId'):
                        held[key] = sub
            mismatch = editions.check_live_matches_record(gen.manifest, held)
            if mismatch:
                raise editions.EditionsError(
                    'Gov Hub\'s edition in progress does not list the revisions it serves:\n  - '
                    + '\n  - '.join(mismatch))
        except editions.EditionsError as exc:
            print(f'\nERROR: {exc}\nNo rail or manifest was written.', file=sys.stderr)
            return 3
        live = gen.manifest.get('liveEdition') or {}
        print()
        print(f'Editions     : current {gen.manifest["currentEdition"]}; live book labelled '
              f'"{live.get("label")}" ({editions_source.get("kind")})')
        for note in gen.notes:
            print(f'  note: {note}')
        editions_summary = {'currentEdition': gen.manifest['currentEdition'], 'liveEdition': live,
                            'source': editions_source, 'notes': gen.notes}

    if not args.dry_run:
        for path, text in pending_writes:
            path.write_text(text, encoding='utf-8')
        if editions_response is not None:
            written = editions.write_generated(gen, sources_sat.parent)
            editions_summary['written'] = [str(p) for p in written]
            for p in written:
                print(f'Editions     : wrote {p}')
            if editions_response is not None:
                repo_root = REPO_ROOT if book_root == DEFAULT_BOOK_ROOT else book_root.parent
                report = editions.check_agreement(repo_root, book_root=book_root)
                editions_summary['agreement_errors'] = report.errors
                if report.errors:
                    print('ERROR: editions agreement check failed after writing:', file=sys.stderr)
                    for e in report.errors:
                        print(f'  - {e}', file=sys.stderr)
                    return 4

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
            'editions': editions_summary,
            'results': results,
        }, indent=2) + '\n', encoding='utf-8')
        print(f'Report: {report_path}')

    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
