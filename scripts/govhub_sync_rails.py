#!/usr/bin/env python3
"""
Pull Desirable Properties book rails from Gov Hub into content/local/*.md.

Thin wrapper around the generic BRC333 rail pipeline sync.

Usage:
  python3 scripts/govhub_sync_rails.py --dry-run
  python3 scripts/govhub_sync_rails.py --write
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BOOK_ROOT = REPO_ROOT / 'desirableproperties-book'
BRC333_SCRIPTS = Path('/home/ubuntu/BRC333/scripts')
PROJECT_JSON = Path('/home/ubuntu/BRC333/projects/desirableproperties-book-ordinal/project.json')

sys.path.insert(0, str(BRC333_SCRIPTS))

from govhub_rail_pipeline.config import load_pipeline_config  # noqa: E402
from govhub_rail_pipeline.sync import resolve_content_repo, sync_rails_from_hub  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--env', default='main',
                        choices=sorted({'dev', 'development', 'main', 'production'}))
    parser.add_argument('--hub-url', default='')
    parser.add_argument('--local-db', action='store_true')
    parser.add_argument('--govhub-root', default='')
    parser.add_argument('--only', default='')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--report', default='')
    args = parser.parse_args()

    dry_run = not args.write
    sync = load_pipeline_config(PROJECT_JSON)
    content_repo = resolve_content_repo(sync, str(BOOK_ROOT))
    report_path = Path(args.report).resolve() if args.report else None
    govhub_root = Path(args.govhub_root).resolve() if args.govhub_root else None

    _, exit_code = sync_rails_from_hub(
        sync_config=sync,
        content_repo=content_repo,
        env=args.env,
        hub_url=args.hub_url,
        govhub_root=govhub_root,
        local_db=args.local_db,
        dry_run=dry_run,
        only=args.only,
        report_path=report_path,
    )
    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
