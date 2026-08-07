#!/usr/bin/env python3
"""
Publish a book front-matter markdown file as a new Gov Hub ML-Draft (root) or revision.

Used for cover, about, acknowledgements, and similar non-DP rails that are authored
locally under desirableproperties-book/content/local/ and pushed to Gov Hub.

Usage:
    python3 scripts/govhub_publish_front_matter_draft.py --title "The Layered Web" \\
        --file cover.md --env dev --dry-run

    python3 scripts/govhub_publish_front_matter_draft.py --title "The Layered Web" \\
        --file cover.md --ml ML-Draft-033 --env main --approve
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
    flask_env_for_env,
    hub_url_for_env,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'


def slugify(value: str) -> str:
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
                        help='Directory holding front-matter markdown files')
    parser.add_argument('--file', required=True,
                        help='Markdown filename under --content-dir (e.g. cover.md)')
    parser.add_argument('--title', required=True,
                        help='Gov Hub document title')
    parser.add_argument('--ml', default='',
                        help='Existing ML number for a new revision (omit to create a root draft)')
    parser.add_argument('--authors', default='The Meta-Layer Initiative',
                        help='Comma-separated author list')
    parser.add_argument('--what-changed', default='Updated from book local front matter',
                        help='Revision notes when --ml is set')
    parser.add_argument('--submitted-by', default='book-pipeline',
                        help='Display name recorded as submitter')
    parser.add_argument('--approve', action='store_true',
                        help='Approve the submission (assigns ML number on root drafts)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Report actions without writing')
    parser.add_argument('--report', default='',
                        help='Write JSON run report to this path')
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
    local_path = content_dir / args.file
    if not local_path.is_file():
        print(f'ERROR: missing {local_path}', file=sys.stderr)
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

    authors_list = [a.strip() for a in args.authors.split(',') if a.strip()]
    ml = (args.ml or '').strip()
    is_revision = bool(ml)

    print(f'Env          : {args.env} ({hub_url})')
    print(f'Gov Hub root : {govhub_root}')
    print(f'FLASK_ENV    : {flask_env}')
    print(f'Database     : {DB_PATH}')
    print(f'Source file  : {local_path}')
    print(f'Title        : {args.title}')
    print(f'Mode         : {"revision of " + ml if is_revision else "new root draft"}')
    print(f'Run          : {"DRY RUN" if args.dry_run else "WRITE"}'
          f'{" + APPROVE" if args.approve and not args.dry_run else ""}')
    print()

    app = create_app()
    result: dict = {'title': args.title, 'file': args.file, 'status': 'pending'}

    with app.app_context():
        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        parent = None
        if is_revision:
            parent = Submission.query.filter(
                Submission.ml_number == ml,
                Submission.is_revision == False,  # noqa: E712
                Submission.status.in_(['approved', 'published']),
            ).first()
            if parent is None:
                any_row = Submission.query.filter_by(ml_number=ml).first()
                if any_row is not None:
                    root_ref = (getattr(any_row, 'parent_draft_name', '') or '').strip()
                    parent = (
                        Submission.query.filter_by(draft_name=root_ref).first()
                        or Submission.query.filter_by(id=root_ref).first()
                        if root_ref else any_row
                    )
            if parent is None:
                print(f'ERROR: no approved draft family for {ml}', file=sys.stderr)
                result.update(status='blocked', error=f'no draft for {ml}')
                return 1
            if (parent.status or '') not in ('approved', 'published'):
                print(f'ERROR: parent status is {parent.status!r}', file=sys.stderr)
                return 1
            parent_ref = (parent.draft_name or parent.id or '').strip()
            family = Submission.query.filter(
                Submission.parent_draft_name.in_([parent_ref, parent.id]),
                Submission.is_revision == True,  # noqa: E712
            ).all()
            existing = []
            for row in family:
                try:
                    existing.append(int(row.revision_number))
                except (TypeError, ValueError):
                    continue
            next_num = max(existing) + 1 if existing else 1
            new_rev = f'{next_num:02d}'
            layer_id = parent.layer_id
            group = parent.group
            doc_type = parent.doc_type or 'draft'
            document_category = getattr(parent, 'document_category', None)
            title = parent.title or args.title
        else:
            # Anchor new front matter to the About draft's layer/group conventions.
            anchor = Submission.query.filter_by(ml_number='ML-Draft-031').first()
            layer_id = anchor.layer_id if anchor else None
            group = anchor.group if anchor else 'dp1-federated-auth'
            doc_type = 'draft'
            document_category = 'guide'
            title = args.title
            parent_ref = ''
            new_rev = ''

        submission_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        stored_name = f'{submission_id}-{slugify(args.file)}.txt'
        file_path = os.path.join(upload_folder, stored_name)

        if args.dry_run:
            if is_revision:
                print(f'DRY   {ml} rev {new_rev} <- {local_path.name}')
            else:
                print(f'DRY   new root draft <- {local_path.name} (ML assigned on approve)')
            result.update(status='dry-run')
            return 0

        shutil.copyfile(local_path, file_path)
        pages, words = calculate_pages_and_words(file_path, stored_name)
        content_hash = compute_content_hash_for_file(file_path, stored_name)

        conflict = find_submission_conflict(
            title=title,
            content_hash=content_hash,
            exclude_family_parent_id=parent_ref or None,
        )
        if conflict:
            os.remove(file_path)
            print(f'SKIP  {conflict_message(conflict[0], conflict[1])}')
            return 1

        if is_revision:
            submission = Submission(
                draft_name=submission_id,
                title=title,
                authors=authors_list or parent.authors,
                abstract=getattr(parent, 'abstract', None),
                group=group,
                layer_id=layer_id,
                filename=stored_name,
                file_path=file_path,
                submitted_by=args.submitted_by,
                sourceType='file',
                doc_type=doc_type,
                document_category=document_category,
                pages=pages,
                words=words,
                content_hash=content_hash,
                parent_draft_name=parent_ref,
                revision_number=new_rev,
                what_changed=args.what_changed,
                is_revision=True,
            )
        else:
            submission = Submission(
                draft_name=submission_id,
                title=title,
                authors=authors_list,
                abstract=(
                    'Book cover for The Layered Web — the open-access Desirable Properties edition.'
                ),
                group=group,
                layer_id=layer_id,
                filename=stored_name,
                file_path=file_path,
                submitted_by=args.submitted_by,
                sourceType='file',
                doc_type=doc_type,
                document_category=document_category,
                pages=pages,
                words=words,
                content_hash=content_hash,
            )

        db.session.add(submission)
        db.session.flush()

        if args.approve:
            if is_revision:
                submission.ml_number = ml
            else:
                submission.ml_number = get_next_ml_number(doc_type, layer_prefix='ML')
            submission.status = 'approved'
            submission.approved_at = datetime.utcnow()

        db.session.commit()

        assigned_ml = submission.ml_number or ml or '(pending approval)'
        result.update(
            status='approved' if args.approve else 'submitted',
            ml_number=assigned_ml,
            submission_id=submission.id,
            draft_name=submission.draft_name,
            read_url=f'{hub_url}/doc/draft/{assigned_ml}/read/',
        )
        print(f'OK    {assigned_ml} -> {submission.draft_name} ({result["status"]}, {words} words)')
        print(f'Read  {result["read_url"]}')

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'env': args.env,
            'hub_url': hub_url,
            'dry_run': args.dry_run,
            'approved': bool(args.approve),
            'result': result,
        }, indent=2) + '\n', encoding='utf-8')

    return 0


if __name__ == '__main__':
    sys.exit(main())
