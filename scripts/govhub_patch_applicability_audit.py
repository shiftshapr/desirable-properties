#!/usr/bin/env python3
"""
Audit whether existing Gov Hub patches still apply after a DP text refresh.

A Gov Hub patch (models/dp_proposal.py::DpProposal) anchors to an exact passage
of the document body. When a DP is revised - sections renamed, renumbered,
merged, or reworded - a patch whose `original_text` no longer appears in the new
body can no longer be applied, and Gov Hub marks it `orphaned`.

This script answers "which patches survive the refresh?" by testing each
patch's anchor passage against three bodies:

  1. the Gov Hub body currently served for the draft family (Gov Hub's own
     classify_proposal_location: current / superseded / bogus)
  2. the newest revision body in the family
  3. the book's local chapter (content/local/dpN.md) - the text being published

Verdicts:
  applies         anchor found in the new local chapter -> patch can still merge
  needs-review    anchor found in an older body but not the new chapter -> the
                  passage was reworded or moved; re-anchor or re-author it
  obsolete        anchor not found anywhere in the family -> already stale
                  before this refresh (usually test data or a deleted passage)
  not-a-dp        patch targets a non-DP document, so the DP refresh is neutral

Matching reuses Gov Hub's own normalizer (services.dp_proposals) so the verdict
matches what the application will decide.

Usage:
    python3 scripts/govhub_patch_applicability_audit.py
    python3 scripts/govhub_patch_applicability_audit.py \
        --govhub-root /home/ubuntu/gov-hub-prod --flask-env production \
        --report docs/patch-audit-prod.json --markdown docs/patch-audit-prod.md

Run with the interpreter Gov Hub itself uses:
    /home/ubuntu/.pyenv/versions/3.9.18/bin/python3
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GOVHUB_ROOT = Path('/home/ubuntu/gov-hub-dev')
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
DEFAULT_SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'


def ml_to_dp_map(sources_sat: Path) -> dict[str, dict]:
    """ML-Draft number -> DP metadata, from the book manifest."""
    data = json.loads(sources_sat.read_text(encoding='utf-8'))
    out = {}
    for src in data.get('sources', []):
        rail = src.get('railKey') or ''
        ml = src.get('mlNumber') or ''
        if not re.fullmatch(r'dp\d{2}', rail) or not ml:
            continue
        out[ml] = {
            'dp': src.get('dp') or f'DP{int(rail[2:])}',
            'dp_number': int(rail[2:]),
            'label': src.get('label') or '',
        }
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--govhub-root', default=str(DEFAULT_GOVHUB_ROOT))
    parser.add_argument('--flask-env', default='development',
                        choices=['development', 'production'])
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR))
    parser.add_argument('--sources-sat', default=str(DEFAULT_SOURCES_SAT))
    parser.add_argument('--report', default='', help='Write JSON report here')
    parser.add_argument('--markdown', default='', help='Write a Markdown matrix here')
    args = parser.parse_args()

    govhub_root = Path(args.govhub_root).resolve()
    if not (govhub_root / 'app.py').is_file():
        print(f'ERROR: {govhub_root} is not a Gov Hub checkout', file=sys.stderr)
        return 2

    content_dir = Path(args.content_dir).resolve()
    sources_sat = Path(args.sources_sat).resolve()

    os.environ['FLASK_ENV'] = args.flask_env
    sys.path.insert(0, str(govhub_root))
    os.chdir(govhub_root)

    from app import create_app  # noqa: E402
    from config import DB_PATH  # noqa: E402
    from models.artifact import Submission  # noqa: E402
    from models.dp_proposal import DpProposal  # noqa: E402
    from services.dp_proposals import (  # noqa: E402
        classify_proposal_location,
        load_submission_plain_document_text,
        passage_text_in_haystack,
        proposal_passage_text,
        resolve_canonical_submission,
    )

    dp_by_ml = ml_to_dp_map(sources_sat)

    print(f'Gov Hub root : {govhub_root}')
    print(f'FLASK_ENV    : {args.flask_env}')
    print(f'Database     : {DB_PATH}')
    print()

    app = create_app()
    rows: list[dict] = []

    with app.app_context():
        local_cache: dict[int, str] = {}
        body_cache: dict[str, str] = {}

        def body_for(submission) -> str:
            if submission is None:
                return ''
            if submission.id not in body_cache:
                try:
                    body_cache[submission.id] = load_submission_plain_document_text(submission)
                except Exception:
                    body_cache[submission.id] = ''
            return body_cache[submission.id]

        proposals = DpProposal.query.order_by(DpProposal.created_at.asc()).all()
        print(f'Patches found: {len(proposals)}')
        print()

        for proposal in proposals:
            target = Submission.query.get(proposal.submission_id)
            canonical = resolve_canonical_submission(target)
            ml = (canonical.ml_number if canonical else None) or (target.ml_number if target else None)
            dp_meta = dp_by_ml.get(ml or '')

            entry = {
                'patch_id': proposal.id,
                'short_id': proposal.id[:8],
                'status': proposal.status,
                'scope': proposal.scope,
                'source_channel': proposal.source_channel,
                'created_at': proposal.created_at.isoformat() if proposal.created_at else None,
                'ml_number': ml,
                'dp': dp_meta['dp'] if dp_meta else None,
                'document_title': (canonical.title if canonical else None),
                'original_text': (proposal.original_text or '').strip(),
                'proposed_text': (proposal.proposed_text or '').strip(),
                'rationale': (proposal.rationale or '').strip() or None,
            }

            passage = proposal_passage_text(proposal)
            entry['anchor_passage'] = passage

            try:
                entry['govhub_location'] = classify_proposal_location(proposal, canonical)
            except Exception as exc:
                entry['govhub_location'] = f'error: {exc}'

            # Newest revision body in this family (what the catalog shows).
            newest = None
            if canonical:
                refs = {canonical.id}
                if canonical.draft_name:
                    refs.add(canonical.draft_name)
                revisions = Submission.query.filter(
                    Submission.parent_draft_name.in_(list(refs)),
                    Submission.is_revision == True,  # noqa: E712
                    Submission.status.in_(['approved', 'published']),
                ).all()

                def rev_key(row):
                    try:
                        return int(row.revision_number)
                    except (TypeError, ValueError):
                        return -1

                if revisions:
                    newest = max(revisions, key=rev_key)
            entry['newest_revision'] = newest.revision_number if newest else None
            entry['newest_revision_draft'] = newest.draft_name if newest else None

            in_current = bool(passage) and passage_text_in_haystack(body_for(canonical), passage)
            in_newest = bool(passage) and bool(newest) and passage_text_in_haystack(
                body_for(newest), passage)

            # The text being published: the book's local chapter.
            in_local = None
            if dp_meta:
                num = dp_meta['dp_number']
                if num not in local_cache:
                    path = content_dir / f'dp{num}.md'
                    local_cache[num] = path.read_text(encoding='utf-8') if path.is_file() else ''
                in_local = bool(passage) and passage_text_in_haystack(local_cache[num], passage)

            entry.update(
                anchor_in_govhub_current=in_current,
                anchor_in_newest_revision=in_newest,
                anchor_in_local_chapter=in_local,
            )

            if not dp_meta:
                verdict = 'not-a-dp'
                why = 'patch targets a non-DP document; the DP refresh does not affect it'
            elif in_local:
                verdict = 'applies'
                why = 'anchor passage is present in the new local chapter'
            elif in_current or in_newest:
                verdict = 'needs-review'
                why = ('anchor passage exists in a Gov Hub body but not in the new local '
                       'chapter; the passage was reworded, renumbered, or moved')
            else:
                verdict = 'obsolete'
                why = 'anchor passage not found in any body for this document family'

            entry['verdict'] = verdict
            entry['reason'] = why
            rows.append(entry)

    # ---- console matrix ----
    counts = Counter(r['verdict'] for r in rows)
    dp_counts = Counter(r['dp'] for r in rows if r['dp'])

    def sort_key(r):
            return (r['dp'] or 'zzz', r['created_at'] or '')

    print(f'{"patch":<9} {"target":<7} {"ml":<14} {"status":<9} {"govhub":<11} {"verdict":<13} title')
    print('-' * 108)
    for r in sorted(rows, key=sort_key):
        print(f'{r["short_id"]:<9} {str(r["dp"] or "-"):<7} {str(r["ml_number"] or "-"):<14} '
              f'{r["status"]:<9} {str(r["govhub_location"]):<11} {r["verdict"]:<13} '
              f'{(r["document_title"] or "")[:34]}')

    print()
    print('Verdict totals:')
    for verdict in ('applies', 'needs-review', 'obsolete', 'not-a-dp'):
        if counts.get(verdict):
            print(f'  {verdict:<13} {counts[verdict]}')
    print()
    print('Patches per DP:')
    for dp, n in sorted(dp_counts.items(), key=lambda kv: int(re.sub(r'\D', '', kv[0]) or 0)):
        print(f'  {dp:<6} {n}')
    dp_targets = {r['dp'] for r in rows if r['dp']}
    untouched = sorted(
        (m['dp'] for m in dp_by_ml.values() if m['dp'] not in dp_targets),
        key=lambda d: int(re.sub(r'\D', '', d) or 0),
    )
    print('\nDPs with zero patches: ' + (', '.join(untouched) or 'none'))

    if args.report:
        path = Path(args.report)
        if not path.is_absolute():
            path = REPO_ROOT / path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'govhub_root': str(govhub_root),
            'flask_env': args.flask_env,
            'totals': dict(counts),
            'patches': rows,
        }, indent=2) + '\n', encoding='utf-8')
        print(f'\nJSON report: {path}')

    if args.markdown:
        path = Path(args.markdown)
        if not path.is_absolute():
            path = REPO_ROOT / path
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            '# Gov Hub patch applicability audit',
            '',
            f'- Generated: {datetime.utcnow().isoformat()}Z',
            f'- Gov Hub: `{govhub_root}` (`FLASK_ENV={args.flask_env}`)',
            f'- Local chapters: `{content_dir}`',
            f'- Patches examined: {len(rows)}',
            '',
            '| Verdict | Count | Meaning |',
            '| --- | --- | --- |',
            f'| applies | {counts.get("applies", 0)} | Anchor still present in the new chapter text |',
            f'| needs-review | {counts.get("needs-review", 0)} | Anchor exists in an older body only; re-anchor needed |',
            f'| obsolete | {counts.get("obsolete", 0)} | Anchor absent everywhere in the document family |',
            f'| not-a-dp | {counts.get("not-a-dp", 0)} | Targets a non-DP document; unaffected |',
            '',
            '| Patch | Target | ML-Draft | Patch status | Gov Hub location | Verdict | Anchor (truncated) |',
            '| --- | --- | --- | --- | --- | --- | --- |',
        ]
        for r in sorted(rows, key=sort_key):
            anchor = (r['anchor_passage'] or '').replace('|', '\\|').replace('\n', ' ')[:70]
            lines.append(
                f'| `{r["short_id"]}` | {r["dp"] or "—"} | {r["ml_number"] or "—"} | '
                f'{r["status"]} | {r["govhub_location"]} | **{r["verdict"]}** | {anchor} |'
            )
        path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print(f'Markdown matrix: {path}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
