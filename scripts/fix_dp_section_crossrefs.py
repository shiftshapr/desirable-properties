#!/usr/bin/env python3
"""
Fix outdated inline DP section cross-references after heading renumbering.

Maps old section numbers (from on-chain ordinals) to current local numbering via
normalized heading titles. Idempotent when re-run on already-fixed files.

Usage:
    python3 scripts/fix_dp_section_crossrefs.py --dry-run
    python3 scripts/fix_dp_section_crossrefs.py --write
    python3 scripts/fix_dp_section_crossrefs.py --write --only dp8,dp11
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'
CACHE_DIR = Path(__file__).resolve().parent / '.cache' / 'dp-onchain'
BOOK_CONTENT_URL = 'https://book.desirableproperties.org/content/{inscription_id}'

HEADING_LINE_RE = re.compile(r'^(#{2,4})\s+(.*)$')
HEADING_NUM_RE = re.compile(r'^(\d+(?:\.\d+)*)\.?\s+')
BOLD_WRAP_RE = re.compile(r'^\*\*(.*)\*\*$')
ESCAPED_DOT_RE = re.compile(r'\\\.')
PUNCT_RE = re.compile(r'[^\w\s]', re.UNICODE)

# Cross-reference patterns (order matters for overlapping matches).
EXTERNAL_SECTION_RE = re.compile(
    r'\bDP(\d{1,2})\s+(?:§|section)\s*(\d+(?:\.\d+)*)',
    re.IGNORECASE,
)
INTERNAL_SECTION_WORD_RE = re.compile(
    r'\bSection\s+(\d+(?:\.\d+)*)',
    re.IGNORECASE,
)
SEE_SECTION_RE = re.compile(
    r'\bsee\s+(\d+\.\d+(?:\.\d+)*)',
    re.IGNORECASE,
)
PAREN_SECTION_RE = re.compile(
    r'\(([^)]+)\)',
)
SECTION_NUM_TOKEN_RE = re.compile(
    r'\b(\d+\.\d+(?:\.\d+)?)\b',
)
BARE_SECTION_IN_PAREN_RE = re.compile(
    r'(?:^|, )(\d{1,2})(?=[,)])',
)
RANGE_RE = re.compile(
    r'(\d+(?:\.\d+)*)\s*([–-])\s*(\d+(?:\.\d+)*)',
)

VERSION_LIKE_RE = re.compile(r'\d+\.\d+\.\d+')


@dataclass
class SectionIndex:
    """number -> normalized title, and title -> best number."""
    number_to_title: dict[str, str] = field(default_factory=dict)
    title_to_number: dict[str, str] = field(default_factory=dict)

    def add(self, number: str, title: str) -> None:
        norm = normalize_title(title)
        if not norm:
            return
        self.number_to_title[number] = norm
        # Prefer shorter numbers (## over ###) when titles collide.
        existing = self.title_to_number.get(norm)
        if existing is None or _num_depth(number) < _num_depth(existing):
            self.title_to_number[norm] = number


@dataclass
class FixResult:
    file: str
    fixes: list[tuple[str, str, str]] = field(default_factory=list)  # old, new, context
    unresolved: list[str] = field(default_factory=list)


def _num_depth(num: str) -> int:
    return num.count('.') + 1


def normalize_title(title: str) -> str:
    t = (title or '').strip()
    m = BOLD_WRAP_RE.match(t)
    if m:
        t = m.group(1).strip()
    t = ESCAPED_DOT_RE.sub('.', t)
    t = HEADING_NUM_RE.sub('', t, count=1).strip()
    t = PUNCT_RE.sub('', t.lower())
    return re.sub(r'\s+', ' ', t).strip()


def strip_heading_decorators(raw: str) -> str:
    t = (raw or '').strip()
    m = BOLD_WRAP_RE.match(t)
    if m:
        t = m.group(1).strip()
    t = ESCAPED_DOT_RE.sub('.', t)
    while HEADING_NUM_RE.match(t):
        t = HEADING_NUM_RE.sub('', t, count=1).strip()
    return t


def parse_section_index(text: str, *, sequential_fallback: bool = True) -> SectionIndex:
    """Build section index from markdown headings."""
    idx = SectionIndex()
    section = 0
    subsection = 0
    subsubsection = 0

    for line in text.replace('\r\n', '\n').split('\n'):
        m = HEADING_LINE_RE.match(line)
        if not m:
            continue
        level, raw = m.group(1), m.group(2)
        title = strip_heading_decorators(raw)
        explicit = HEADING_NUM_RE.match(title) or HEADING_NUM_RE.match(raw.strip().lstrip('*').replace('\\.', '.'))

        if level == '##':
            if explicit:
                num = explicit.group(1)
                idx.add(num, title)
            elif sequential_fallback:
                section += 1
                subsection = 0
                subsubsection = 0
                idx.add(str(section), title)
            continue

        if level == '###':
            if explicit:
                num = explicit.group(1)
                idx.add(num, title)
            elif sequential_fallback and section > 0:
                subsection += 1
                subsubsection = 0
                idx.add(f'{section}.{subsection}', title)
            continue

        if level == '####':
            if explicit:
                num = explicit.group(1)
                idx.add(num, title)
            elif sequential_fallback and section > 0 and subsection > 0:
                subsubsection += 1
                idx.add(f'{section}.{subsection}.{subsubsection}', title)
    return idx


def fuzzy_title_lookup(title: str, new_idx: SectionIndex) -> str | None:
    if title in new_idx.title_to_number:
        return new_idx.title_to_number[title]
    matches = difflib.get_close_matches(title, list(new_idx.title_to_number.keys()), n=1, cutoff=0.82)
    if matches:
        return new_idx.title_to_number[matches[0]]
    return None


def build_old_to_new_map(old_idx: SectionIndex, new_idx: SectionIndex) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for old_num, norm_title in old_idx.number_to_title.items():
        new_num = fuzzy_title_lookup(norm_title, new_idx)
        if new_num:
            mapping[old_num] = new_num
    return mapping


def load_sources_sat() -> dict[int, str]:
    data = json.loads(SOURCES_SAT.read_text(encoding='utf-8'))
    out: dict[int, str] = {}
    for src in data.get('sources', []):
        dp = src.get('dp') or ''
        m = re.match(r'^DP(\d{1,2})$', dp, re.I)
        ins = src.get('inscriptionId')
        if m and ins:
            out[int(m.group(1))] = ins
    return out


def fetch_onchain(inscription_id: str, *, use_cache: bool = True) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f'{inscription_id}.md'
    if use_cache and cache_path.is_file():
        return cache_path.read_text(encoding='utf-8')
    url = BOOK_CONTENT_URL.format(inscription_id=inscription_id)
    req = urllib.request.Request(url, headers={'User-Agent': 'fix-dp-section-crossrefs/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode('utf-8')
    except urllib.error.URLError as exc:
        raise RuntimeError(f'Failed to fetch {url}: {exc}') from exc
    cache_path.write_text(body, encoding='utf-8')
    return body


def expand_only(spec: str) -> list[str]:
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


def _reverse_map(old_to_new: dict[str, str]) -> dict[str, list[str]]:
    rev: dict[str, list[str]] = {}
    for old, new in old_to_new.items():
        rev.setdefault(new, []).append(old)
    return rev


def _titles_differ_at_number(num: str, old_idx: SectionIndex, new_idx: SectionIndex) -> bool:
    old_t = old_idx.number_to_title.get(num)
    new_t = new_idx.number_to_title.get(num)
    return bool(old_t and new_t and old_t != new_t)


def _is_displayed_new_number(
    num: str,
    *,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
) -> bool:
    new_title = new_idx.number_to_title.get(num)
    if not new_title:
        return False
    for old_num, new_num in old_to_new.items():
        if new_num == num and old_num != num:
            if old_idx.number_to_title.get(old_num) == new_title:
                return True
    return False


def resolve_ref(
    num: str,
    *,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
    current_section: str | None,
    reverse: dict[str, list[str]],
) -> tuple[str | None, str | None]:
    """Return (new_number, reason_if_unresolved). None new_number means leave unchanged."""
    if current_section and num == current_section:
        if not _titles_differ_at_number(num, old_idx, new_idx):
            return None, None

    mapped = old_to_new.get(num)
    new_title = new_idx.number_to_title.get(num)
    if new_title and not _titles_differ_at_number(num, old_idx, new_idx):
        for old_num, new_num in old_to_new.items():
            if new_num == num and old_idx.number_to_title.get(old_num) == new_title:
                return None, None

    if mapped is None:
        if num in new_idx.number_to_title:
            return None, None
        return None, f'no old title for section {num}'

    if mapped == num:
        return None, None

    stale_same_number = num in new_idx.number_to_title and _titles_differ_at_number(num, old_idx, new_idx)
    if stale_same_number:
        if num in reverse and num in new_idx.number_to_title:
            new_title = new_idx.number_to_title[num]
            old_direct = old_idx.number_to_title.get(num)
            for old_src in reverse[num]:
                if (old_src != num
                        and old_idx.number_to_title.get(old_src) == new_title
                        and old_direct == new_title):
                    return None, None
        return mapped, None

    # Already displays the new number for this content (old X → num, titles align).
    if num in reverse and num in new_idx.number_to_title:
        new_title = new_idx.number_to_title[num]
        for old_src in reverse[num]:
            if old_src != num and old_idx.number_to_title.get(old_src) == new_title:
                return None, None

    # Number already shows a new target from a different old section (idempotent pass).
    if num in reverse and num in new_idx.number_to_title:
        old_sources = [o for o in reverse[num] if o != num]
        if old_sources and num not in old_to_new:
            return None, None

    return mapped, None


def _is_version_context(text: str, start: int, end: int) -> bool:
    window = text[max(0, start - 40): min(len(text), end + 40)].lower()
    return 'version' in window or 'e.g.' in window or 'semantic version' in window


def _map_tokens_in_text(
    text: str,
    *,
    dp_num: int,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
    current_section: str | None,
    reverse: dict[str, list[str]],
    unresolved: list[str],
    full_line: str,
) -> str:
    def apply_num(num: str) -> str:
        na, err = resolve_ref(
            num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            current_section=current_section, reverse=reverse,
        )
        if err:
            unresolved.append(f'dp{dp_num}: {err} in "{full_line.strip()[:80]}"')
        return na if na else num

    def process_plain(segment: str) -> str:
        def repl_bare(m: re.Match[str]) -> str:
            num = m.group(1)
            mapped = apply_num(num)
            if mapped == num:
                return m.group(0)
            return m.group(0).replace(num, mapped, 1)

        segment = BARE_SECTION_IN_PAREN_RE.sub(repl_bare, segment)

        def repl_token(m: re.Match[str]) -> str:
            token = m.group(1)
            if VERSION_LIKE_RE.fullmatch(token):
                return token
            prefix = segment[:m.start()]
            if re.search(r'Section\s*$', prefix, re.IGNORECASE):
                return token
            if re.search(r'§\s*$', prefix):
                return token
            if re.search(r'see\s*$', prefix, re.IGNORECASE):
                return token
            if re.search(r'\{\d*,?\s*$', prefix):
                return token
            return apply_num(token)

        return SECTION_NUM_TOKEN_RE.sub(repl_token, segment)

    out: list[str] = []
    last = 0
    for m in RANGE_RE.finditer(text):
        if m.start() > last:
            out.append(process_plain(text[last:m.start()]))
        a, dash, b = m.group(1), m.group(2), m.group(3)
        out.append(f'{apply_num(a)}{dash}{apply_num(b)}')
        last = m.end()
    if last < len(text):
        out.append(process_plain(text[last:]))
    return ''.join(out)


def fix_paren_group(
    inner: str,
    *,
    dp_num: int,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
    current_section: str | None,
    reverse: dict[str, list[str]],
    unresolved: list[str],
    full_line: str,
) -> str:
    # Handle ranges first: 5.1–5.2 or 5.4.1–5.4.4
    chunks = re.split(r'(`[^`]*`)', inner)
    out_chunks: list[str] = []
    for chunk in chunks:
        if chunk.startswith('`') and chunk.endswith('`'):
            out_chunks.append(chunk)
            continue
        out_chunks.append(_map_tokens_in_text(
            chunk, dp_num=dp_num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            current_section=current_section, reverse=reverse,
            unresolved=unresolved, full_line=full_line,
        ))
    return ''.join(out_chunks)


def fix_line(
    line: str,
    *,
    dp_num: int,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
    all_old_to_new: dict[int, dict[str, str]],
    all_old: dict[int, SectionIndex],
    all_new: dict[int, SectionIndex],
    current_section: str | None,
    current_top_section: str | None,
    reverse: dict[str, list[str]],
    unresolved: list[str],
    fixes: list[tuple[str, str, str]],
) -> str:
    protected: list[tuple[int, int]] = []

    def mark_span(start: int, end: int) -> None:
        protected.append((start, end))

    def in_protected(pos: int) -> bool:
        return any(s <= pos < e for s, e in protected)

    def repl_external(m: re.Match[str]) -> str:
        target_dp = int(m.group(1))
        num = m.group(2)
        o2n = all_old_to_new.get(target_dp, {})
        rev = _reverse_map(o2n)
        na, err = resolve_ref(
            num, old_to_new=o2n, old_idx=all_old.get(target_dp, SectionIndex()),
            new_idx=all_new.get(target_dp, SectionIndex()),
            current_section=None, reverse=rev,
        )
        if err:
            unresolved.append(f'DP{target_dp} §{num}: {err}')
        if na and na != num:
            fixes.append((f'DP{target_dp} §{num}', f'DP{target_dp} §{na}', line.strip()[:100]))
            mark_span(m.start(), m.end())
            return m.group(0).replace(num, na, 1)
        return m.group(0)

    line = EXTERNAL_SECTION_RE.sub(repl_external, line)

    def repl_internal(m: re.Match[str]) -> str:
        num = m.group(1)
        if current_top_section and num == current_top_section:
            return m.group(0)
        stale = num in new_idx.number_to_title and _titles_differ_at_number(num, old_idx, new_idx)
        if not stale and _is_displayed_new_number(num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx):
            return m.group(0)
        na, err = resolve_ref(
            num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            current_section=current_section, reverse=reverse,
        )
        if err:
            unresolved.append(f'dp{dp_num}: {err} in "{line.strip()[:80]}"')
        if na and na != num:
            fixes.append((num, na, line.strip()[:100]))
            mark_span(m.start(), m.end())
            return f'Section {na}'
        return m.group(0)

    line = INTERNAL_SECTION_WORD_RE.sub(repl_internal, line)

    def repl_see(m: re.Match[str]) -> str:
        num = m.group(1)
        na, err = resolve_ref(
            num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            current_section=current_section, reverse=reverse,
        )
        if err:
            unresolved.append(f'dp{dp_num}: {err} in "{line.strip()[:80]}"')
        if na and na != num:
            fixes.append((num, na, line.strip()[:100]))
            mark_span(m.start(), m.end())
            return f'see {na}'
        return m.group(0)

    line = SEE_SECTION_RE.sub(repl_see, line)

    def repl_paren(m: re.Match[str]) -> str:
        if _is_version_context(line, m.start(), m.end()):
            return m.group(0)
        if in_protected(m.start()):
            return m.group(0)
        inner = m.group(1)
        if inner.startswith('?:') or inner.startswith('?!') or 'a-z0-9' in inner:
            return m.group(0)
        new_inner = fix_paren_group(
            inner, dp_num=dp_num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            current_section=current_section, reverse=reverse,
            unresolved=unresolved, full_line=line,
        )
        if new_inner != inner:
            fixes.append((inner, new_inner, line.strip()[:100]))
        return f'({new_inner})'

    line = PAREN_SECTION_RE.sub(repl_paren, line)
    return line


def heading_context_update(line: str, ctx: dict[str, str | None]) -> str | None:
    m = HEADING_LINE_RE.match(line)
    if not m:
        return ctx.get('current')
    level, raw = m.group(1), m.group(2)
    title = strip_heading_decorators(raw)
    explicit = HEADING_NUM_RE.match(title)
    if level == '##':
        m2 = re.match(r'^##\s+(\d+)\.', line)
        if m2:
            ctx['section'] = m2.group(1)
        elif explicit:
            ctx['section'] = explicit.group(1)
        ctx['subsection'] = None
        ctx['subsubsection'] = None
    elif level == '###':
        m2 = re.match(r'^###\s+(\d+\.\d+)\s', line)
        if m2:
            ctx['subsection'] = m2.group(1)
            ctx['section'] = m2.group(1).split('.')[0]
    elif level == '####':
        m2 = re.match(r'^####\s+(\d+\.\d+\.\d+)\s', line)
        if m2:
            ctx['subsubsection'] = m2.group(1)
    return ctx.get('subsubsection') or ctx.get('subsection') or ctx.get('section')


def fix_file_content(
    text: str,
    *,
    dp_num: int,
    old_to_new: dict[str, str],
    old_idx: SectionIndex,
    new_idx: SectionIndex,
    all_old_to_new: dict[int, dict[str, str]],
    all_old: dict[int, SectionIndex],
    all_new: dict[int, SectionIndex],
) -> tuple[str, FixResult]:
    result = FixResult(file=f'dp{dp_num}.md')
    reverse = _reverse_map(old_to_new)
    ctx: dict[str, str | None] = {'section': None, 'subsection': None, 'subsubsection': None}
    out_lines: list[str] = []

    for line in text.split('\n'):
        heading_context_update(line, ctx)
        current = ctx.get('subsubsection') or ctx.get('subsection') or ctx.get('section')
        fixed = fix_line(
            line, dp_num=dp_num, old_to_new=old_to_new, old_idx=old_idx, new_idx=new_idx,
            all_old_to_new=all_old_to_new, all_old=all_old, all_new=all_new,
            current_section=current, current_top_section=ctx.get('section'),
            reverse=reverse, unresolved=result.unresolved, fixes=result.fixes,
        )
        out_lines.append(fixed)

    return '\n'.join(out_lines), result


def load_indices(
    targets: list[str],
    *,
    fetch: bool = True,
) -> tuple[dict[int, SectionIndex], dict[int, SectionIndex], dict[int, dict[str, str]]]:
    inscriptions = load_sources_sat()
    old_indices: dict[int, SectionIndex] = {}
    new_indices: dict[int, SectionIndex] = {}
    maps: dict[int, dict[str, str]] = {}

    for name in targets:
        dp_num = int(name[2:])
        local_path = DEFAULT_CONTENT_DIR / f'{name}.md'
        new_text = local_path.read_text(encoding='utf-8')
        new_idx = parse_section_index(new_text, sequential_fallback=True)
        new_indices[dp_num] = new_idx

        if dp_num in inscriptions and fetch:
            try:
                old_text = fetch_onchain(inscriptions[dp_num])
            except RuntimeError as exc:
                print(f'warn: {exc}; using local as old index for dp{dp_num}', file=sys.stderr)
                old_text = new_text
        else:
            old_text = new_text

        old_idx = parse_section_index(old_text, sequential_fallback=True)
        old_indices[dp_num] = old_idx
        maps[dp_num] = build_old_to_new_map(old_idx, new_idx)

    return old_indices, new_indices, maps


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--content-dir', default=str(DEFAULT_CONTENT_DIR))
    parser.add_argument('--only', default='dp1-dp23')
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--dry-run', action='store_true', help='Report only (default without --write)')
    parser.add_argument('--no-fetch', action='store_true', help='Use cached/local on-chain only')
    args = parser.parse_args()

    content_dir = Path(args.content_dir)
    try:
        targets = expand_only(args.only)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2

    # Always index all chapters so external DP cross-refs resolve.
    all_targets = expand_only('dp1-dp23')
    old_indices, new_indices, all_maps = load_indices(all_targets, fetch=not args.no_fetch)

    total_fixes = 0
    all_unresolved: list[str] = []
    per_file: dict[str, int] = {}

    for name in targets:
        dp_num = int(name[2:])
        path = content_dir / f'{name}.md'
        original = path.read_text(encoding='utf-8')
        updated, result = fix_file_content(
            original,
            dp_num=dp_num,
            old_to_new=all_maps[dp_num],
            old_idx=old_indices[dp_num],
            new_idx=new_indices[dp_num],
            all_old_to_new=all_maps,
            all_old=old_indices,
            all_new=new_indices,
        )
        count = len(result.fixes)
        per_file[name] = count
        total_fixes += count
        all_unresolved.extend(result.unresolved)

        if count:
            print(f'{name}.md: {count} replacement(s)')
            for old, new, ctx in result.fixes[:20]:
                print(f'  {old!r} -> {new!r}  ({ctx[:70]}...)')
            if len(result.fixes) > 20:
                print(f'  ... and {len(result.fixes) - 20} more')
        else:
            print(f'{name}.md: ok (no changes)')

        if args.write and updated != original:
            path.write_text(updated, encoding='utf-8')
            print(f'  wrote {path}')

    if all_unresolved:
        print('\nUnresolved / ambiguous references:')
        for item in sorted(set(all_unresolved)):
            print(f'  - {item}')

    print(f'\nTotal fixes: {total_fixes}')
    if not args.write and total_fixes:
        print('Re-run with --write to apply.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
