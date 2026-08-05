#!/usr/bin/env python3
"""
Publish content/local/dpN.md as new Gov Hub revisions for DP1-DP23.

Each DP chapter in the book has a local working copy (the "Live" rail) that can
drift ahead of the Gov Hub ML-Draft. This script pushes each local chapter into
Gov Hub as a *new revision* of the existing draft, so revision history is
preserved and nothing is overwritten in place.

It replicates routes/submissions.py::submit_revision rather than POSTing the
form, because Gov Hub has no REST endpoint for revisions (the form is session
authenticated). The row it writes is identical in shape to a form submission:

    Submission(parent_draft_name=<root draft>, revision_number=<next>,
               is_revision=True, sourceType='file', status='submitted')

Gov Hub only allows txt/pdf/xml/doc/docx uploads, so the markdown is stored
with a .txt extension. The reader runs text_looks_like_markdown() on .txt
bodies and renders them as markdown, so formatting survives.

New revisions land as status='submitted' and require admin approval before they
become the document body shown in the reader (approval also copies the parent's
ml_number onto the revision). Pass --approve to do that in the same run; that is
appropriate on DEV but on production you normally want the review queue.

Usage:
    # dry run against DEV (default), all DPs
    python3 scripts/govhub_publish_dp_revisions.py --dry-run

    # publish + approve on DEV
    python3 scripts/govhub_publish_dp_revisions.py --approve

    # single DP, submit only (leave in review queue)
    python3 scripts/govhub_publish_dp_revisions.py --only DP22

    # production (submit only; approve via the Gov Hub admin queue)
    python3 scripts/govhub_publish_dp_revisions.py --env main

    # explicit checkout + flask env (same as --env main)
    python3 scripts/govhub_publish_dp_revisions.py \
        --govhub-root /home/ubuntu/gov-hub-prod --flask-env production

Run with the interpreter Gov Hub itself uses:
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
    load_sync_rails_manifest,
    local_rail_filename,
    local_rail_path,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
DEFAULT_SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'

DEFAULT_WHAT_CHANGED = (
    'Synced from the book local rail (content/local/dpN.md), which carries the '
    'current working text for this chapter: expanded sections, renamed and '
    'renumbered headings, and editorial cleanup since the last revision. '
    'Published as a new revision so prior revisions stay intact.'
)


def slugify(value: str) -> str:
    """Filename-safe token for the stored upload name."""
    value = re.sub(r'[^a-z0-9]+', '_', (value or '').lower())
    return value.strip('_') or 'draft'
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--env', default='dev',
                        choices=sorted({'dev', 'development', 'main', 'production'}),
                        help='Target hub: dev/development or main/production (default: dev)')
    parser.add_argument('--govhub-root', default='',
                        help='Gov Hub checkout (default: from --env)')
    parser.add_argument('--flask-env', default='',
                        choices=['', 'development', 'production'],
                        help='Gov Hub FLASK_ENV / DB (default: from --env)')
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR),
                        help='Directory holding dpN.md local chapters')
    parser.add_argument('--sources-sat', default=str(DEFAULT_SOURCES_SAT),
                        help='sources-sat.json providing the DP -> ML-Draft mapping')
    parser.add_argument('--only', default='',
                        help='Comma-separated rails to publish (about, acknowledgements, DP1, …)')
    parser.add_argument('--what-changed', default=DEFAULT_WHAT_CHANGED,
                        help='Revision notes recorded on each new revision')
    parser.add_argument('--submitted-by', default='',
                        help='Display name recorded as submitter (default: parent submitter)')
    parser.add_argument('--approve', action='store_true',
                        help='Also approve each revision so it becomes the current body')
    parser.add_argument('--dry-run', action='store_true',
                        help='Report what would happen without writing anything')
    parser.add_argument('--report', default='',
                        help='Write a JSON report of the run to this path')
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
    hub_url = hub_url_for_env(args.env)
    if not (govhub_root / 'app.py').is_file():
        print(f'ERROR: {govhub_root} does not look like a Gov Hub checkout', file=sys.stderr)
        return 2

    content_dir = Path(args.content_dir).resolve()
    sources_sat = Path(args.sources_sat).resolve()
    for path in (content_dir, sources_sat):
        if not path.exists():
            print(f'ERROR: missing {path}', file=sys.stderr)
            return 2

    # Gov Hub reads FLASK_ENV at config import time to pick instance dir + DB.
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

    rails = load_sync_rails_manifest(sources_sat)
    rails = filter_rails_by_only(rails, args.only)

    print(f'Env          : {args.env} ({hub_url})')
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

    with app.app_context():
        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        for rail in rails:
            display = rail.get('display_key') or rail.get('railKey') or ''
            ml = rail['ml_number']
            entry: dict = {
                'display_key': display,
                'ml_number': ml,
                'rail_key': rail['railKey'],
                'status': 'pending',
            }
            if rail.get('dp'):
                entry['dp'] = rail['dp']

            local_name = local_rail_filename(rail)
            local_path = local_rail_path(content_dir, rail)
            if not local_path.is_file():
                entry.update(status='error', error=f'local chapter missing: {local_name}')
                results.append(entry)
                print(f'{display:<18} SKIP  local chapter missing ({local_name})')
                continue

            # Resolve the draft family: prefer the approved root row for the ML
            # number, then walk to the root parent so every revision hangs off the
            # same parent_draft_name. Preferring approved rows matters because test
            # rows can squat on an ML number in non-production environments.
            parent = None
            if ml:
                parent = Submission.query.filter(
                    Submission.ml_number == ml,
                    Submission.is_revision == False,  # noqa: E712
                    Submission.status.in_(['approved', 'published']),
                ).first()
            if parent is None and ml:
                any_row = Submission.query.filter(
                    Submission.ml_number == ml,
                    Submission.status.in_(['approved', 'published']),
                ).first() or Submission.query.filter_by(ml_number=ml).first()
                if any_row is not None:
                    root_ref = (getattr(any_row, 'parent_draft_name', '') or '').strip()
                    parent = (
                        Submission.query.filter_by(draft_name=root_ref).first()
                        or Submission.query.filter_by(id=root_ref).first()
                        if root_ref else any_row
                    )
            if parent is None:
                entry.update(
                    status='blocked',
                    error=f'no Gov Hub draft found for {ml or "(no ML number)"} in this environment',
                )
                results.append(entry)
                print(f'{display:<18} BLOCK no draft for {ml or "(none)"} on this Gov Hub')
                continue

            parent_ref = (parent.draft_name or parent.id or '').strip()
            entry['parent_draft_name'] = parent_ref
            entry['parent_id'] = parent.id
            entry['title'] = parent.title

            if (parent.status or '') not in ('approved', 'published'):
                entry.update(status='blocked',
                             error=f'parent draft status is {parent.status!r}; revisions '
                                   'require an approved parent')
                results.append(entry)
                print(f'{display:<18} BLOCK parent {parent_ref} status={parent.status}')
                continue

            # Next revision number across the whole family (matches approve_submission
            # deconfliction, so the number we pick survives approval).
            family = Submission.query.filter(
                Submission.parent_draft_name.in_([parent_ref, parent.id]),
                Submission.is_revision == True,  # noqa: E712 - SQLAlchemy column compare
            ).all()
            existing = []
            for row in family:
                try:
                    existing.append(int(row.revision_number))
                except (TypeError, ValueError):
                    continue
            next_num = max(existing) + 1 if existing else 1
            new_rev = f'{next_num:02d}'
            entry['revision_number'] = new_rev
            entry['previous_revisions'] = sorted(existing)

            submission_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            slug_token = slugify(rail.get('label') or rail.get('railKey') or display)
            stored_name = f'{submission_id}-{rail["railKey"]}_{slug_token}.txt'
            file_path = os.path.join(upload_folder, stored_name)
            entry['filename'] = stored_name

            if args.dry_run:
                entry.update(status='dry-run')
                results.append(entry)
                print(f'{display:<18} DRY   {ml} rev {new_rev} <- {local_name} '
                      f'(parent {parent_ref})')
                continue

            shutil.copyfile(local_path, file_path)
            pages, words = calculate_pages_and_words(file_path, stored_name)
            content_hash = compute_content_hash_for_file(file_path, stored_name)
            entry.update(pages=pages, words=words, content_hash=content_hash)

            conflict = find_submission_conflict(
                title=parent.title or display,
                content_hash=content_hash,
                exclude_family_parent_id=parent_ref,
            )
            if conflict:
                os.remove(file_path)
                entry.update(status='skipped', error=conflict_message(conflict[0], conflict[1]))
                results.append(entry)
                print(f'{display:<18} SKIP  {entry["error"]}')
                continue

            revision = Submission(
                draft_name=submission_id,
                title=parent.title,
                authors=parent.authors,
                abstract=parent.abstract,
                group=parent.group,
                layer_id=parent.layer_id,
                filename=stored_name,
                file_path=file_path,
                submitted_by=args.submitted_by or parent.submitted_by or 'Gov Hub',
                submitter_user_id=parent.submitter_user_id,
                sourceType='file',
                doc_type=parent.doc_type or 'draft',
                document_category=getattr(parent, 'document_category', None),
                pages=pages,
                words=words,
                content_hash=content_hash,
                parent_draft_name=parent_ref,
                revision_number=new_rev,
                what_changed=args.what_changed,
                is_revision=True,
            )
            db.session.add(revision)
            db.session.flush()

            if args.approve:
                # Mirrors approve_submission: an approved revision inherits the
                # parent's ML number and becomes the document body in the reader.
                revision.ml_number = parent.ml_number
                revision.status = 'approved'
                revision.approved_at = datetime.utcnow()

            db.session.commit()

            entry.update(
                status='approved' if args.approve else 'submitted',
                submission_id=revision.id,
                draft_name=revision.draft_name,
                revision_url=f'/doc/draft/{revision.draft_name}/',
                read_url=f'/doc/draft/{ml or revision.draft_name}/read/',
                revisions_url=f'/doc/draft/{parent_ref}/revisions/',
            )
            results.append(entry)
            print(f'{display:<18} OK    {ml} rev {new_rev} -> {revision.draft_name} '
                  f'({entry["status"]}, {words} words)')

    ok = [r for r in results if r['status'] in ('submitted', 'approved', 'dry-run')]
    bad = [r for r in results if r['status'] not in ('submitted', 'approved', 'dry-run')]
    print()
    print(f'Published: {len(ok)}/{len(results)}')
    if bad:
        print('Not published:')
        for row in bad:
            label = row.get('display_key') or row.get('dp') or row.get('rail_key') or '?'
            print(f'  {label}: {row["status"]} – {row.get("error", "")}')

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'govhub_root': str(govhub_root),
            'env': args.env,
            'hub_url': hub_url,
            'flask_env': flask_env,
            'dry_run': args.dry_run,
            'approved': bool(args.approve),
            'results': results,
        }, indent=2) + '\n', encoding='utf-8')
        print(f'Report: {report_path}')

    return 0 if not bad else 1


if __name__ == '__main__':
    sys.exit(main())
