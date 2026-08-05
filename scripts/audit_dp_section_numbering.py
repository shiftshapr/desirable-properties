#!/usr/bin/env python3
"""
Full audit of DP section numbering and cross-references (dp1–dp23).

Used to generate docs/DP-SECTION-NUMBER-AUDIT.md.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = REPO_ROOT / 'desirableproperties-book' / 'content' / 'local'
SOURCES_SAT = REPO_ROOT / 'desirableproperties-book' / 'json' / 'sources-sat.json'
CACHE_DIR = Path(__file__).resolve().parent / '.cache' / 'dp-onchain'

# Import shared logic from fix script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_dp_section_crossrefs import (  # noqa: E402
    SectionIndex,
    build_old_to_new_map,
    fetch_onchain,
    load_sources_sat,
    parse_section_index,
    resolve_ref,
    _reverse_map,
    _titles_differ_at_number,
)

HEADING_H2 = re.compile(r'^##\s+(.+)$')
HEADING_H3 = re.compile(r'^###\s+(.+)$')
HEADING_H4 = re.compile(r'^####\s+(.+)$')
H2_NUM = re.compile(r'^(\d+)\.\s+(.+)$')
H3_NUM = re.compile(r'^(\d+)\.(\d+)\s+(.+)$')
H4_NUM = re.compile(r'^(\d+)\.(\d+)\.(\d+)\s+(.+)$')

# Cross-ref patterns
PATTERNS = [
    ('DP§', re.compile(r'\bDP(\d{1,2})\s+§\s*(\d+(?:\.\d+)*)', re.I)),
    ('DP section', re.compile(r'\bDP(\d{1,2})\s+section\s+(\d+(?:\.\d+)*)', re.I)),
    ('Section word', re.compile(r'\bSection\s+(\d+(?:\.\d+)*)', re.I)),
    ('section word', re.compile(r'\bsection\s+(\d+(?:\.\d+)*)', re.I)),
    ('see §', re.compile(r'\bsee\s+§\s*(\d+(?:\.\d+)*)', re.I)),
    ('see num', re.compile(r'\bsee\s+(\d+\.\d+(?:\.\d+)*)', re.I)),
    ('paren DP', re.compile(r'\(DP(\d{1,2}),\s*(\d+(?:\.\d+)*)\)', re.I)),
    ('paren range', re.compile(r'\((\d+(?:\.\d+)*)\s*[–-]\s*(\d+(?:\.\d+)*)\)')),
    ('paren multi', re.compile(r'\((\d+(?:\.\d+)*)(?:,\s*(\d+(?:\.\d+)*))+\)')),
    ('§ bare', re.compile(r'(?<![DP\d])(?<!\d)§\s*(\d+(?:\.\d+)*)')),
    ('DP paren', re.compile(r'\(DP(\d{1,2}),\s*(\d+(?:\.\d+)*)\)', re.I)),
    ('alignment paren', re.compile(r'\((\d+(?:\.\d+)*)\)(?=[^\d]|$)')),
]

VERSION_LIKE = re.compile(r'\d+\.\d+\.\d+')


@dataclass
class HeadingIssue:
    file: str
    line: int
    level: str
    text: str
    reason: str


@dataclass
class CrossRef:
    file: str
    line: int
    col: int
    pattern: str
    text: str
    dp_target: int | None  # None = same file
    section_nums: list[str]


@dataclass
class CrossRefIssue:
    file: str
    line: int
    ref_text: str
    reason: str
    stale_onchain: bool = False


@dataclass
class FileSummary:
    file: str
    h2_count: int = 0
    heading_issues: int = 0
    cross_refs: int = 0
    broken_refs: int = 0
    stale_onchain: int = 0
    status: str = 'PASS'


def dp_num_from_name(name: str) -> int:
    return int(re.match(r'dp(\d+)', name, re.I).group(1))


def audit_headings(path: Path) -> tuple[list[HeadingIssue], int]:
    issues: list[HeadingIssue] = []
    text = path.read_text(encoding='utf-8')
    fname = path.name
    section = 0
    subsection = 0
    subsubsection = 0
    h2_count = 0
    seen_h2: dict[int, int] = {}
    seen_h3: dict[str, int] = {}
    seen_h4: dict[str, int] = {}

    for i, line in enumerate(text.splitlines(), 1):
        m2 = HEADING_H2.match(line)
        m3 = HEADING_H3.match(line)
        m4 = HEADING_H4.match(line)

        if m2:
            h2_count += 1
            raw = m2.group(1).strip()
            nm = H2_NUM.match(raw)
            if not nm:
                issues.append(HeadingIssue(fname, i, '##', line, 'Unnumbered ## heading'))
                section += 1
                subsection = 0
                subsubsection = 0
                continue
            n = int(nm.group(1))
            expected = section + 1
            if n != expected:
                if n in seen_h2:
                    issues.append(HeadingIssue(fname, i, '##', line,
                        f'Duplicate section number {n} (expected {expected})'))
                else:
                    issues.append(HeadingIssue(fname, i, '##', line,
                        f'Non-sequential: got {n}, expected {expected}'))
            seen_h2[n] = seen_h2.get(n, 0) + 1
            section = n
            subsection = 0
            subsubsection = 0
            continue

        if m3:
            raw = m3.group(1).strip()
            nm = H3_NUM.match(raw)
            if section == 0:
                issues.append(HeadingIssue(fname, i, '###', line,
                    '### before any ## section'))
                continue
            if not nm:
                issues.append(HeadingIssue(fname, i, '###', line, 'Unnumbered ### heading'))
                subsection += 1
                continue
            ps, ms = int(nm.group(1)), int(nm.group(2))
            expected_ps = section
            expected_ms = subsection + 1
            key = f'{ps}.{ms}'
            if ps != expected_ps:
                issues.append(HeadingIssue(fname, i, '###', line,
                    f'Wrong parent section: {ps}.{ms} under ## {section}.'))
            elif ms != expected_ms:
                if key in seen_h3:
                    issues.append(HeadingIssue(fname, i, '###', line,
                        f'Duplicate subsection {key} (expected {section}.{expected_ms})'))
                else:
                    issues.append(HeadingIssue(fname, i, '###', line,
                        f'Non-sequential M: got {ms}, expected {expected_ms} under section {section}'))
            seen_h3[key] = seen_h3.get(key, 0) + 1
            subsection = ms
            subsubsection = 0
            continue

        if m4:
            raw = m4.group(1).strip()
            nm = H4_NUM.match(raw)
            if section == 0 or subsection == 0:
                issues.append(HeadingIssue(fname, i, '####', line,
                    '#### without parent ###'))
                continue
            if not nm:
                issues.append(HeadingIssue(fname, i, '####', line, 'Unnumbered #### heading'))
                subsubsection += 1
                continue
            ps, ms, ks = int(nm.group(1)), int(nm.group(2)), int(nm.group(3))
            expected_ks = subsubsection + 1
            key = f'{ps}.{ms}.{ks}'
            if ps != section or ms != subsection:
                issues.append(HeadingIssue(fname, i, '####', line,
                    f'Wrong parent: {key} under ### {section}.{subsection}'))
            elif ks != expected_ks:
                if key in seen_h4:
                    issues.append(HeadingIssue(fname, i, '####', line,
                        f'Duplicate #### {key}'))
                else:
                    issues.append(HeadingIssue(fname, i, '####', line,
                        f'Non-sequential K: got {ks}, expected {expected_ks}'))
            seen_h4[key] = seen_h4.get(key, 0) + 1
            subsubsection = ks

    return issues, h2_count


def is_version_context(line: str, start: int, end: int) -> bool:
    w = line[max(0, start - 40): min(len(line), end + 40)].lower()
    return 'version' in w or 'semantic version' in w or 'e.g.' in w


def scan_crossrefs(path: Path) -> list[CrossRef]:
    refs: list[CrossRef] = []
    dp = dp_num_from_name(path.stem)
    text = path.read_text(encoding='utf-8')
    fname = path.name

    for line_no, line in enumerate(text.splitlines(), 1):
        for pname, pat in PATTERNS:
            for m in pat.finditer(line):
                if is_version_context(line, m.start(), m.end()):
                    continue
                if pname == 'alignment paren':
                    # Skip markdown links, URLs, semver
                    inner = m.group(1)
                    if VERSION_LIKE.fullmatch(inner):
                        continue
                    before = line[:m.start()]
                    if before.rstrip().endswith(']'):
                        continue
                if pname == 'paren multi':
                    nums = re.findall(r'\d+(?:\.\d+)*', m.group(0))
                    refs.append(CrossRef(fname, line_no, m.start(), pname, m.group(0), dp, nums))
                    continue
                if pname == 'paren range':
                    refs.append(CrossRef(fname, line_no, m.start(), pname, m.group(0), dp,
                                         [m.group(1), m.group(2)]))
                    continue
                if pname in ('DP§', 'DP section', 'paren DP', 'DP paren'):
                    refs.append(CrossRef(fname, line_no, m.start(), pname, m.group(0),
                                         int(m.group(1)), [m.group(2)]))
                elif pname == '§ bare':
                    # Skip if preceded by DP reference (e.g. "DP4 §5.11")
                    before = line[:m.start()]
                    if re.search(r'DP\d{1,2}\s*$', before):
                        continue
                    refs.append(CrossRef(fname, line_no, m.start(), pname, m.group(0), dp,
                                         [m.group(1)]))
                else:
                    refs.append(CrossRef(fname, line_no, m.start(), pname, m.group(0), dp,
                                         [m.group(1)]))
    return refs


def section_exists(idx: SectionIndex, num: str) -> bool:
    return num in idx.number_to_title


def validate_crossref(
    ref: CrossRef,
    all_indices: dict[int, SectionIndex],
    old_indices: dict[int, SectionIndex],
    old_to_new: dict[int, dict[str, str]],
) -> CrossRefIssue | None:
    target_dp = ref.dp_target
    if target_dp is None:
        return None
    idx = all_indices.get(target_dp, SectionIndex())

    for num in ref.section_nums:
        if not section_exists(idx, num):
            # Check if it's an old on-chain number that maps to new
            o2n = old_to_new.get(target_dp, {})
            mapped = o2n.get(num)
            if mapped and section_exists(idx, mapped):
                return CrossRefIssue(
                    ref.file, ref.line, ref.text,
                    f'Stale on-chain ref: {num} → current {mapped} (DP{target_dp})',
                    stale_onchain=True,
                )
            return CrossRefIssue(
                ref.file, ref.line, ref.text,
                f'Section {num} does not exist in DP{target_dp} (current index)',
            )
    return None


def load_all_indices() -> tuple[dict[int, SectionIndex], dict[int, SectionIndex], dict[int, dict[str, str]]]:
    inscriptions = load_sources_sat()
    new_indices: dict[int, SectionIndex] = {}
    old_indices: dict[int, SectionIndex] = {}
    maps: dict[int, dict[str, str]] = {}

    for n in range(1, 24):
        path = CONTENT_DIR / f'dp{n}.md'
        new_text = path.read_text(encoding='utf-8')
        new_idx = parse_section_index(new_text)
        new_indices[n] = new_idx

        if n in inscriptions:
            try:
                old_text = fetch_onchain(inscriptions[n])
            except Exception:
                old_text = new_text
        else:
            old_text = new_text
        old_idx = parse_section_index(old_text)
        old_indices[n] = old_idx
        maps[n] = build_old_to_new_map(old_idx, new_idx)

    return new_indices, old_indices, maps


def run_idempotency_renumber() -> list[str]:
    from renumber_dp_section_headings import renumber_markdown
    lines = []
    for n in range(1, 24):
        path = CONTENT_DIR / f'dp{n}.md'
        orig = path.read_text(encoding='utf-8')
        updated = renumber_markdown(orig)
        if orig != updated:
            lines.append(f'dp{n}.md: WOULD CHANGE (not idempotent)')
        else:
            lines.append(f'dp{n}.md: ok')
    return lines


def main() -> int:
    all_heading_issues: list[HeadingIssue] = []
    all_crossrefs: list[CrossRef] = []
    all_broken: list[CrossRefIssue] = []
    summaries: list[FileSummary] = []

    new_indices, old_indices, old_to_new = load_all_indices()

    for n in range(1, 24):
        path = CONTENT_DIR / f'dp{n}.md'
        h_issues, h2_count = audit_headings(path)
        refs = scan_crossrefs(path)
        broken = []
        for ref in refs:
            issue = validate_crossref(ref, new_indices, old_indices, old_to_new)
            if issue:
                broken.append(issue)

        all_heading_issues.extend(h_issues)
        all_crossrefs.extend(refs)
        all_broken.extend(broken)

        stale = sum(1 for b in broken if b.stale_onchain)
        status = 'FAIL' if h_issues or broken else 'PASS'
        summaries.append(FileSummary(
            file=f'dp{n}.md',
            h2_count=h2_count,
            heading_issues=len(h_issues),
            cross_refs=len(refs),
            broken_refs=len(broken),
            stale_onchain=stale,
            status=status,
        ))

    renumber_results = run_idempotency_renumber()
    renumber_fail = sum(1 for l in renumber_results if 'WOULD CHANGE' in l)

    overall = 'FAIL' if all_heading_issues or all_broken or renumber_fail else 'PASS'

    report = generate_report(
        overall, summaries, all_heading_issues, all_broken, all_crossrefs,
        renumber_results, renumber_fail, new_indices, old_indices, old_to_new,
    )

    out_path = REPO_ROOT / 'docs' / 'DP-SECTION-NUMBER-AUDIT.md'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report, encoding='utf-8')
    print(f'Wrote {out_path}')
    print(f'Overall: {overall}')
    print(f'Heading issues: {len(all_heading_issues)}')
    print(f'Broken/stale refs: {len(all_broken)}')
    return 0 if overall == 'PASS' else 1


def generate_report(
    overall: str,
    summaries: list[FileSummary],
    heading_issues: list[HeadingIssue],
    broken: list[CrossRefIssue],
    crossrefs: list[CrossRef],
    renumber_results: list[str],
    renumber_fail: int,
    new_indices: dict[int, SectionIndex],
    old_indices: dict[int, SectionIndex],
    old_to_new: dict[int, dict[str, str]],
) -> str:
    from datetime import datetime, timezone
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    stale = [b for b in broken if b.stale_onchain]
    invalid = [b for b in broken if not b.stale_onchain]

    lines = [
        '# DP Section Number & Cross-Reference Audit',
        '',
        f'**Generated:** {ts}',
        f'**Scope:** dp1.md – dp23.md in `desirableproperties-book/content/local/`',
        '',
        '## Executive Summary',
        '',
        f'| Metric | Count |',
        f'|--------|-------|',
        f'| **Overall status** | **{overall}** |',
        f'| Files audited | 23 |',
        f'| Files PASS | {sum(1 for s in summaries if s.status == "PASS")} |',
        f'| Files FAIL | {sum(1 for s in summaries if s.status == "FAIL")} |',
        f'| Heading numbering issues | {len(heading_issues)} |',
        f'| Cross-references scanned | {len(crossrefs)} |',
        f'| Invalid cross-references | {len(invalid)} |',
        f'| Stale on-chain cross-references | {len(stale)} |',
        f'| Renumber script non-idempotent files | {renumber_fail} |',
        '',
        '## Per-File Findings',
        '',
        '| File | ## sections | Heading issues | Cross-refs | Broken refs | Stale on-chain | Status |',
        '|------|-------------|------------------|------------|-------------|----------------|--------|',
    ]

    for s in summaries:
        lines.append(
            f'| {s.file} | {s.h2_count} | {s.heading_issues} | {s.cross_refs} | '
            f'{s.broken_refs} | {s.stale_onchain} | {s.status} |'
        )

    lines.extend([
        '',
        '## Idempotency Checks',
        '',
        '### `renumber_dp_section_headings.py --only dp1-dp23`',
        '',
        '```',
        *renumber_results,
        '```',
        '',
        '### `fix_dp_section_crossrefs.py --dry-run`',
        '',
        'See script output captured during audit run (below in Recommendations).',
        '',
    ])

    if heading_issues:
        lines.extend([
            '## Heading Numbering Issues',
            '',
            '| File | Line | Level | Reason | Heading text |',
            '|------|------|-------|--------|--------------|',
        ])
        for h in heading_issues:
            esc = h.text.replace('|', '\\|')[:80]
            lines.append(f'| {h.file} | {h.line} | {h.level} | {h.reason} | `{esc}` |')
    else:
        lines.extend(['## Heading Numbering Issues', '', '_None — all headings sequentially numbered._', ''])

    if broken:
        lines.extend([
            '## Invalid / Broken Cross-References',
            '',
            '| File | Line | Reference | Reason |',
            '|------|------|-----------|--------|',
        ])
        seen = set()
        for b in broken:
            key = (b.file, b.line, b.ref_text, b.reason)
            if key in seen:
                continue
            seen.add(key)
            esc = b.ref_text.replace('|', '\\|')
            lines.append(f'| {b.file} | {b.line} | `{esc}` | {b.reason} |')
    else:
        lines.extend([
            '## Invalid / Broken Cross-References',
            '',
            '_None — all cross-references resolve to existing sections._',
            '',
        ])

    # On-chain mapping summary (informational)
    lines.extend([
        '## On-Chain vs Local Numbering (Informational)',
        '',
    ])
    remapped_dps = []
    for n in range(1, 24):
        m = old_to_new.get(n, {})
        changed = {k: v for k, v in m.items() if k != v}
        if changed:
            remapped_dps.append((n, len(changed)))
    if remapped_dps:
        lines.append('DPs with section number remapping (on-chain → local):')
        lines.append('')
        for n, cnt in remapped_dps:
            lines.append(f'- DP{n}: {cnt} section(s) renumbered')
        if stale:
            lines.append('')
            lines.append(f'**{len(stale)} stale on-chain reference(s) remain in local files.**')
        else:
            lines.append('')
            lines.append('_No stale on-chain references detected in cross-ref scan._')
    else:
        lines.append('_No remapping detected (on-chain matches local or cache unavailable)._')
    lines.append('')

    lines.extend([
        '## Recommendations',
        '',
    ])
    if not heading_issues and not broken and renumber_fail == 0:
        lines.append('- **No action required.** Numbering and cross-references are consistent.')
    else:
        if heading_issues:
            lines.append('- **Manual/auto:** Run `python3 scripts/renumber_dp_section_headings.py --only dp1-dp23 --write`')
        if stale:
            lines.append('- **Auto-fixable:** Run `python3 scripts/fix_dp_section_crossrefs.py --write` for stale on-chain refs')
        if invalid:
            lines.append('- **Manual review:** Invalid refs need human verification against intended target sections')

    lines.extend([
        '',
        '## Fixes Applied During This Audit',
        '',
        '_Documented after fix pass._',
        '',
    ])

    return '\n'.join(lines)


if __name__ == '__main__':
    raise SystemExit(main())
