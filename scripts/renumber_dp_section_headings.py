#!/usr/bin/env python3
"""
Add sequential section numbers to DP chapter markdown headings (dp13+ convention).

  ## N. Section title
  ### N.M Subsection title
  #### N.M.K Sub-subsection title

Existing numeric prefixes and optional **bold** wrappers are stripped first so the
script is idempotent. H1 (# chapter title) and non-heading lines are unchanged.

Typical pipeline (review phase — numbers in source markdown):

  1. python3 scripts/renumber_dp_section_headings.py --only dp1-dp12 --write
  2. python3 scripts/govhub_publish_dp_revisions.py --env dev --approve \\
        --only DP1,DP2,... --what-changed "Add numbered section headings for review"
  3. python3 scripts/govhub_sync_rails_from_hub.py --env dev
  4. bash desirableproperties-book/scripts/deploy-staging-book.sh

See docs/GOVHUB-DP-PUBLISH.md and docs/GOVHUB-RAIL-SYNC.md.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'

HEADING_NUM_RE = re.compile(r'^\d+(?:\.\d+)*\.?\s+')


def strip_heading_decorators(raw: str) -> str:
    """Remove leading section numbers and optional **bold** from a heading title."""
    t = (raw or '').strip()
    t = re.sub(r'^\*\*(.*)\*\*$', r'\1', t).strip()
    while HEADING_NUM_RE.match(t):
        t = HEADING_NUM_RE.sub('', t, count=1).strip()
    return t


def renumber_markdown(text: str) -> str:
    """Return markdown with ## / ### / #### headings renumbered."""
    lines = text.replace('\r\n', '\n').split('\n')
    out: list[str] = []
    section = 0
    subsection = 0
    subsubsection = 0

    for line in lines:
        m4 = re.match(r'^(####)\s+(.*)$', line)
        m3 = re.match(r'^(###)\s+(.*)$', line)
        m2 = re.match(r'^(##)\s+(.*)$', line)
        if m2:
            section += 1
            subsection = 0
            subsubsection = 0
            title = strip_heading_decorators(m2.group(2))
            out.append(f'## {section}. {title}')
        elif m3:
            if section == 0:
                out.append(line)
                continue
            subsection += 1
            subsubsection = 0
            title = strip_heading_decorators(m3.group(2))
            out.append(f'### {section}.{subsection} {title}')
        elif m4:
            if section == 0 or subsection == 0:
                out.append(line)
                continue
            subsubsection += 1
            title = strip_heading_decorators(m4.group(2))
            out.append(f'#### {section}.{subsection}.{subsubsection} {title}')
        else:
            out.append(line)

    return '\n'.join(out)


def expand_only(spec: str) -> list[str]:
    """Parse --only dp1,dp2-dp5,DP12 → sorted unique dp filenames without .md."""
    if not spec.strip():
        return []
    out: set[str] = set()
    for part in spec.replace(' ', '').split(','):
        if not part:
            continue
        part = part.lower()
        m = re.match(r'^dp(\d{1,2})$', part)
        if m:
            out.add(f'dp{int(m.group(1))}')
            continue
        m = re.match(r'^dp(\d{1,2})-dp(\d{1,2})$', part)
        if m:
            lo, hi = int(m.group(1)), int(m.group(2))
            for n in range(min(lo, hi), max(lo, hi) + 1):
                out.add(f'dp{n}')
            continue
        raise ValueError(f'Unrecognized --only token: {part!r}')
    return sorted(out, key=lambda s: int(s[2:]))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR),
                        help='Directory holding dpN.md chapters')
    parser.add_argument('--only', default='dp1-dp23',
                        help='Comma-separated dp files or ranges (default: dp1-dp23)')
    parser.add_argument('--write', action='store_true',
                        help='Write renumbered files (default: dry-run stdout diff summary)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Alias for default preview mode')
    args = parser.parse_args()

    content_dir = Path(args.content_dir)
    try:
        targets = expand_only(args.only)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    changed = 0
    for name in targets:
        path = content_dir / f'{name}.md'
        if not path.is_file():
            print(f'skip: missing {path}', file=sys.stderr)
            continue
        original = path.read_text(encoding='utf-8')
        updated = renumber_markdown(original)
        if updated == original:
            print(f'ok:   {name}.md (already numbered or no ## headings)')
            continue
        changed += 1
        if args.write:
            path.write_text(updated, encoding='utf-8')
            print(f'wrote {name}.md')
        else:
            # Count heading changes for preview
            before = sum(1 for ln in original.splitlines() if re.match(r'^#{2,4}\s', ln))
            after = sum(1 for ln in updated.splitlines() if re.match(r'^#{2,4}\s', ln))
            print(f'would update {name}.md ({before} headings renumbered)')

    if not args.write and changed:
        print(f'\n{changed} file(s) would change — re-run with --write to apply.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
