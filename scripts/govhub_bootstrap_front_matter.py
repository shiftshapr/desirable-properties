#!/usr/bin/env python3
"""
Bootstrap NEW root Gov Hub drafts from local about.md / acknowledgements.md.

Creates approved root submissions (is_revision=False) with ML numbers assigned via
get_next_ml_number — typically ML-Draft-031 and ML-Draft-032 on production.

Usage:
    python3 scripts/govhub_bootstrap_front_matter.py --env main --dry-run
    python3 scripts/govhub_bootstrap_front_matter.py --env main --approve

Run with the Gov Hub interpreter:
    /home/ubuntu/.pyenv/versions/3.9.18/bin/python3
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import shutil
import string
import sys
from datetime import datetime
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from govhub_dp_common import (  # noqa: E402
    canonical_env,
    default_govhub_root,
    filter_rails_by_only,
    flask_env_for_env,
    hub_url_for_env,
    load_front_matter_manifest,
    local_rail_filename,
    local_rail_path,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
DEFAULT_SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'
DEFAULT_REFERENCE_ML = 'ML-Draft-008'


def slugify(value: str) -> str:
    value = re.sub(r'[^a-z0-9]+', '_', (value or '').lower())
    return value.strip('_') or 'draft'


def _layer_prefix_for_submission(submission) -> str:
    from services.layer_prefixes import effective_prefix_for_submission

    return effective_prefix_for_submission(submission)


def _find_reference_parent(Submission, reference_ml: str):
    return Submission.query.filter(
        Submission.ml_number == reference_ml,
        Submission.is_revision == False,  # noqa: E712
        Submission.status.in_(['approved', 'published']),
    ).first()


def _approved_root_exists(Submission, *, ml_number: str, title: str) -> bool:
    if ml_number:
        existing = Submission.query.filter(
            Submission.ml_number == ml_number,
            Submission.is_revision == False,  # noqa: E712
            Submission.status.in_(['approved', 'published']),
        ).first()
        if existing is not None:
            return True

    title = (title or '').strip()
    if not title:
        return False
    return Submission.query.filter(
        Submission.title == title,
        Submission.is_revision == False,  # noqa: E712
        Submission.status.in_(['approved', 'published']),
    ).first() is not None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--env', default='main',
                        choices=sorted({'dev', 'development', 'main', 'production'}),
                        help='Target hub (default: main)')
    parser.add_argument('--govhub-root', default='',
                        help='Gov Hub checkout (default: from --env)')
    parser.add_argument('--flask-env', default='',
                        choices=['', 'development', 'production'],
                        help='Gov Hub FLASK_ENV (default: from --env)')
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR))
    parser.add_argument('--sources-sat', default=str(DEFAULT_SOURCES_SAT))
    parser.add_argument('--reference-ml', default=DEFAULT_REFERENCE_ML,
                        help='Existing DP parent to copy layer metadata from')
    parser.add_argument('--only', default='',
                        help='Comma-separated front matter rails (about, acknowledgements)')
    parser.add_argument('--submitted-by', default='Gov Hub',
                        help='Display name recorded as submitter')
    parser.add_argument('--approve', action='store_true',
                        help='Approve each new root draft and assign ML numbers')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--report', default='')
    args = parser.parse_args()

    try:
        canonical_env(args.env)
    except ValueError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 2

    flask_env = args.flask_env or flask_env_for_env(args.env)
    govhub_root = (
        Path(args.govhub_root).resolve()
        if args.govhub_root
        else default_govhub_root(args.env).resolve()
    )
    if not (govhub_root / 'app.py').is_file():
        print(f'ERROR: {govhub_root} does not look like a Gov Hub checkout', file=sys.stderr)
        return 2

    content_dir = Path(args.content_dir).resolve()
    sources_sat = Path(args.sources_sat).resolve()
    for path in (content_dir, sources_sat):
        if not path.exists():
            print(f'ERROR: missing {path}', file=sys.stderr)
            return 2

    os.environ['FLASK_ENV'] = flask_env
    sys.path.insert(0, str(govhub_root))
    os.chdir(govhub_root)

    from app import create_app  # noqa: E402
    from config import DB_PATH  # noqa: E402
    from extensions import db  # noqa: E402
    from models.artifact import Submission  # noqa: E402
    from services.documents import calculate_pages_and_words  # noqa: E402
    from services.submission_dedup import (  # noqa: E402
        compute_content_hash_for_file,
        conflict_message,
        find_submission_conflict,
    )
    from services.submissions import get_next_ml_number  # noqa: E402

    rails = load_front_matter_manifest(sources_sat)
    rails = filter_rails_by_only(rails, args.only)

    print(f'Env          : {args.env} ({hub_url_for_env(args.env)})')
    print(f'Gov Hub root : {govhub_root}')
    print(f'FLASK_ENV    : {flask_env}')
    print(f'Database     : {DB_PATH}')
    print(f'Content dir  : {content_dir}')
    print(f'Rails target : {len(rails)}')
    print(f'Mode         : {"DRY RUN" if args.dry_run else "WRITE"}'
          f'{" + APPROVE" if args.approve and not args.dry_run else ""}')
    print()

    app = create_app()
    results: list[dict] = []
    assigned_ml_numbers: list[str] = []

    with app.app_context():
        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        reference = _find_reference_parent(Submission, args.reference_ml)
        if reference is None:
            print(f'ERROR: reference parent {args.reference_ml} not found', file=sys.stderr)
            return 2

        for rail in rails:
            display = rail.get('display_key') or rail['railKey']
            title = rail.get('label') or display
            ml_hint = rail.get('ml_number') or ''
            local_name = local_rail_filename(rail)
            local_path = local_rail_path(content_dir, rail)
            entry: dict = {
                'display_key': display,
                'rail_key': rail['railKey'],
                'title': title,
                'ml_hint': ml_hint,
                'status': 'pending',
            }

            if _approved_root_exists(Submission, ml_number=ml_hint, title=title):
                entry.update(status='skipped', reason='approved root draft already exists')
                results.append(entry)
                print(f'{display:<18} SKIP  approved draft already exists ({ml_hint or title})')
                continue

            if not local_path.is_file():
                entry.update(status='error', error=f'local file missing: {local_name}')
                results.append(entry)
                print(f'{display:<18} ERR   missing {local_name}')
                continue

            submission_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            stored_name = f'{submission_id}-{rail["railKey"]}_{slugify(title)}.txt'
            file_path = os.path.join(upload_folder, stored_name)

            if args.dry_run:
                next_ml = get_next_ml_number(
                    'draft',
                    layer_prefix=_layer_prefix_for_submission(reference),
                )
                entry.update(status='dry-run', expected_ml_number=next_ml)
                results.append(entry)
                assigned_ml_numbers.append(next_ml)
                print(f'{display:<18} DRY   would create root draft -> {next_ml} ({local_name})')
                continue

            shutil.copyfile(local_path, file_path)
            pages, words = calculate_pages_and_words(file_path, stored_name)
            content_hash = compute_content_hash_for_file(file_path, stored_name)
            entry.update(pages=pages, words=words, content_hash=content_hash, filename=stored_name)

            conflict = find_submission_conflict(title=title, content_hash=content_hash)
            if conflict:
                os.remove(file_path)
                entry.update(status='skipped', error=conflict_message(conflict[0], conflict[1]))
                results.append(entry)
                print(f'{display:<18} SKIP  {entry["error"]}')
                continue

            submission = Submission(
                draft_name=submission_id,
                title=title,
                authors=reference.authors,
                abstract=reference.abstract,
                group=reference.group,
                layer_id=reference.layer_id,
                filename=stored_name,
                file_path=file_path,
                submitted_by=args.submitted_by,
                submitter_user_id=reference.submitter_user_id,
                sourceType='file',
                doc_type=reference.doc_type or 'draft',
                document_category=getattr(reference, 'document_category', None),
                pages=pages,
                words=words,
                content_hash=content_hash,
                is_revision=False,
                prefix_code=getattr(reference, 'prefix_code', None),
            )
            db.session.add(submission)
            db.session.flush()

            if args.approve:
                doc_type = getattr(submission, 'doc_type', 'draft') or 'draft'
                submission.ml_number = get_next_ml_number(
                    doc_type,
                    layer_prefix=_layer_prefix_for_submission(submission),
                )
                submission.status = 'approved'
                submission.approved_at = datetime.utcnow()
                assigned_ml_numbers.append(submission.ml_number)
                entry['ml_number'] = submission.ml_number

            db.session.commit()

            entry.update(
                status='approved' if args.approve else 'submitted',
                submission_id=submission.id,
                draft_name=submission.draft_name,
            )
            results.append(entry)
            ml_label = entry.get('ml_number') or '(pending approval)'
            print(f'{display:<18} OK    {ml_label} -> {submission.draft_name} ({words} words)')

    print()
    if assigned_ml_numbers:
        print('Assigned ML numbers:')
        for ml in assigned_ml_numbers:
            print(f'  {ml}')
    else:
        print('No ML numbers assigned.')

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'govhub_root': str(govhub_root),
            'env': args.env,
            'flask_env': flask_env,
            'dry_run': args.dry_run,
            'approved': bool(args.approve),
            'assigned_ml_numbers': assigned_ml_numbers,
            'results': results,
        }, indent=2) + '\n', encoding='utf-8')
        print(f'Report: {report_path}')

    errors = [r for r in results if r['status'] in ('error',)]
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
