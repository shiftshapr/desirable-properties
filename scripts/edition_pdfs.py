#!/usr/bin/env python3
"""
Edition PDFs, backend job (docs/EDITIONS.md, "Releasing an edition's PDFs").

Runs on the box that serves the site (production box #1, staging box #2): it can reach Gov Hub (HTTP for
the edition record, the CLI on the same host for the one write), has Chrome for rendering, and writes the
store the site serves from. No secret, no commit to publish.

    edition_pdfs.py install                  # tool folder: the builder + its node modules, a Python venv
    edition_pdfs.py run                      # (timer) build, gate, publish any released edition without PDFs
    edition_pdfs.py build --edition ID       # the same for one edition, now
    edition_pdfs.py build --edition ID --manifest FIXTURE.json --fixture   # staging proof edition
    edition_pdfs.py preview                  # the edition in progress, into <store>/previews/ (never served)
    edition_pdfs.py gate --dir BUILD_DIR --manifest M.json   # the quality gate alone

For each released edition whose PDFs are not published: Gov Hub state "building" → build exactly from the
list (scripts/v1-book-pdf/build.mjs) → the gate (below) → copy into <store>/<edition>/ (never overwritten,
with SHA256SUMS) → Gov Hub pdf-publish (the single atomic flip: from now on the site and the viewer offer
it) → check from outside that every URL answers 200 with the right file → if not, pdf-unpublish (the
previous edition is latest again). Any failure: state "failed" with the reason, nothing flips, exit 1.
Then the archive copy: a workflow (the rail sync's automated-commit route) commits the published files
to desirableproperties-book/downloads/editions/<edition>/; it is retried by later runs and never blocks
or undoes a publish.

Gate (each check names itself in the failure reason):
  sources    every source text's sha256 equals the edition list's
  pdf        every PDF opens and parses; fonts are embedded; every image the text references is present at
             a sane size
  text       each part's text in the book and in its chapter PDF equals the listed revision, word for word
             after normalisation (lowercase letters and digits only; the builder's template lines removed)
  structure  every rail once, in list order; Contents numbers equal the real page numbers; no blank page
             except before a part or after the edition page; no page holding only a heading or a closing
             note; no text outside the page's printable area
  stamps     the book's edition, list hash and manifest hash; each chapter's edition, rail and submission
  sanity     page count and file size within a factor of the previous edition's (reason printed)
  links      internal links resolve (stop); external links answer (warning only, listed)
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))

import book_editions as editions  # noqa: E402

WORK = 'desirableproperties-book'
UA = 'Mozilla/5.0 (dp-edition-pdfs job)'
HOME = Path.home()

ENVIRONMENTS = {
    'production': {
        'hub': 'https://interfacehub.net', 'site': 'https://desirableproperties.org',
        'govhub_root': HOME / 'gov-hub-prod', 'flask_env': 'production',
        'book_dir': REPO / 'desirableproperties-book', 'site_public': REPO / 'challenge-site' / 'public',
        'store': HOME / 'dp-edition-pdfs' / 'store', 'archive': True,
    },
    'staging': {
        'hub': 'https://dev.interfacehub.net', 'site': 'https://staging.desirableproperties.org',
        'govhub_root': HOME / 'gov-hub-dev', 'flask_env': 'development',
        'book_dir': HOME / 'desirableproperties-book-staging', 'site_public': REPO / 'challenge-site' / 'public',
        'store': HOME / 'dp-edition-pdfs-staging' / 'store', 'archive': False,
    },
}
SANITY_PAGES = (0.6, 1.6)   # page count vs the previous edition's book
SANITY_BYTES = (0.4, 2.5)   # file size vs the previous edition's book
STALE_BUILDING_S = 3 * 3600

# Page geometry of the book (scripts/v1-book-pdf/build.mjs @page): 6.69 x 9.61 in.
HEAD_PT = 58      # running heads and folios sit above this (top margin 0.85 in)
FOOT_PT = 36      # bottom margin is 0.8 in (57.6 pt); the preview footer sits around 25-32 pt
EDGE_PT = 18      # text closer than 0.25 in to the paper edge has overflowed


class GateFailure(Exception):
    def __init__(self, check: str, message: str):
        super().__init__(f'{check}: {message}')
        self.check = check
        self.message = message


# --------------------------------------------------------------------------- small helpers

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def http_json(url: str, timeout: float = 30) -> dict:
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def log(msg: str) -> None:
    print(f'[{now_iso()}] {msg}', flush=True)


ALNUM = re.compile(r'[^a-z0-9]+')


def norm(text: str) -> str:
    """The gate's normalisation: lowercase letters and digits only (spacing, punctuation, hyphenation and
    line breaks disappear, so PDF layout cannot cause a difference but every word and number counts)."""
    return ALNUM.sub('', (text or '').lower().replace('ß', 'ss'))


def source_printed_text(md: str, dropped: list[str] | None = None) -> str:
    """What of a Markdown source is printed: comments, image references, link targets, HTML tags and code-fence
    lines are not; code (fenced or `inline`) is printed verbatim, even when it looks like a tag (`<label>`)."""
    for p in dropped or []:
        md = md.replace(p, ' ')
    md = re.sub(r'<!--.*?-->', ' ', md, flags=re.S)
    blocks = re.split(r'(?m)^[ \t]*```[^\n]*\n?', md)
    out = []
    for i, block in enumerate(blocks):
        if i % 2 == 1:
            out.append(block)  # inside a code fence
            continue
        block = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', block)
        block = re.sub(r'<img\b[^>]*>', ' ', block)
        parts = re.split(r'(`[^`\n]+`)', block)
        block = ''.join(p if p.startswith('`') else
                        re.sub(r'</?[a-zA-Z][^>]*>', ' ', re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', p)) for p in parts)
        out.append(block)
    return '\n'.join(out)


# --------------------------------------------------------------------------- the gate

def _open_pdfs():
    import pypdf  # noqa: F401
    import pypdfium2  # noqa: F401


def page_body_text(page) -> str:
    """Text inside the printable body of a page (running heads, folios and the preview footer excluded)."""
    w, h = page.get_size()
    tp = page.get_textpage()
    try:
        return tp.get_text_bounded(left=0, bottom=FOOT_PT, right=w, top=h - HEAD_PT) or ''
    finally:
        tp.close()


def page_has_image(reader_page) -> bool:
    try:
        xobjs = (reader_page.get('/Resources') or {}).get('/XObject') or {}
        for v in xobjs.values():
            obj = v.get_object()
            if obj.get('/Subtype') == '/Image':
                return True
            if obj.get('/Subtype') == '/Form' and page_has_image(obj):
                return True
    except Exception:
        return False
    return False


def count_images(reader_page) -> int:
    n = 0
    try:
        for v in ((reader_page.get('/Resources') or {}).get('/XObject') or {}).values():
            obj = v.get_object()
            if obj.get('/Subtype') == '/Image':
                n += 1
            elif obj.get('/Subtype') == '/Form':
                n += count_images(obj)
    except Exception:
        pass
    return n


def fonts_not_embedded(reader) -> list[str]:
    bad = set()
    for page in reader.pages:
        fonts = ((page.get('/Resources') or {}).get('/Font') or {})
        for f in fonts.values():
            font = f.get_object()
            if font.get('/Subtype') == '/Type3':
                continue
            desc = font.get('/FontDescriptor')
            if desc is None and '/DescendantFonts' in font:
                desc = font['/DescendantFonts'][0].get_object().get('/FontDescriptor')
            desc = desc.get_object() if desc is not None else None
            if desc is None or not any(k in desc for k in ('/FontFile', '/FontFile2', '/FontFile3')):
                bad.add(str(font.get('/BaseFont')))
    return sorted(bad)


def overflowing_pages(pdf) -> list[int]:
    out = []
    for i in range(len(pdf)):
        page = pdf[i]
        w, h = page.get_size()
        tp = page.get_textpage()
        try:
            for r in range(tp.count_rects()):
                left, bottom, right, top = tp.get_rect(r)
                if left < EDGE_PT or right > w - EDGE_PT or bottom < EDGE_PT * 0.5 or top > h - EDGE_PT * 0.5:
                    out.append(i + 1)
                    break
        finally:
            tp.close()
    return out


def toc_numbers(pdf, toc_pages: list[int]) -> list[str]:
    """The page numbers printed in the Contents, in order: at the end of a line, or on a line of their own
    after a title that wrapped."""
    nums = []
    for p in toc_pages:
        text = pdf[p - 1].get_textpage().get_text_range() or ''
        for line in text.splitlines():
            m = re.search(r'(?:^|\s)([0-9]+|[ivxlc]+)\s*$', line.strip().replace('\u00a0', ' '))
            if m:
                nums.append(m.group(1))
    return nums


def is_subsequence(needles: list[str], hay: list[str]) -> bool:
    it = iter(hay)
    return all(any(n == h for h in it) for n in needles)


def strip_furniture(stream: str, parts: list[str]) -> str:
    for part in parts:
        n = norm(part)
        if n and n in stream:
            stream = stream.replace(n, '', 1)
    return stream


def first_difference(a: str, b: str, width: int = 40) -> str:
    i = next((k for k in range(min(len(a), len(b))) if a[k] != b[k]), min(len(a), len(b)))
    return f'at character {i}: PDF "…{a[max(0, i - 10):i + width]}…" vs source "…{b[max(0, i - 10):i + width]}…"'


def check_links(reader, outline_ok: set, warnings: list) -> list[str]:
    """Internal links must resolve; external URLs are tried (warnings only)."""
    problems, urls = [], set()
    named = set()
    try:
        named = set((reader.named_destinations or {}).keys())
    except Exception:
        pass
    for i, page in enumerate(reader.pages, start=1):
        for a in page.get('/Annots') or []:
            annot = a.get_object()
            if annot.get('/Subtype') != '/Link':
                continue
            action = annot.get('/A')
            action = action.get_object() if action is not None else None
            dest = annot.get('/Dest') or (action.get('/D') if action is not None and action.get('/S') == '/GoTo' else None)
            if action is not None and action.get('/S') == '/URI':
                urls.add(str(action.get('/URI')))
            elif dest is not None:
                if isinstance(dest, (str, bytes)) or hasattr(dest, 'original_bytes'):
                    if str(dest) not in named:
                        problems.append(f'page {i}: internal link to "{dest}" has no destination')
                else:
                    try:
                        reader.get_destination_page_number(reader._build_destination('', dest))  # noqa: SLF001
                    except Exception:
                        problems.append(f'page {i}: internal link points nowhere')

    def probe(url: str) -> str | None:
        if not url.startswith(('http://', 'https://')):
            return None
        for method in ('HEAD', 'GET'):
            try:
                req = urllib.request.Request(url, method=method, headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=12) as resp:
                    if resp.status < 400:
                        return None
            except urllib.error.HTTPError as e:
                if method == 'GET':
                    return f'{url} answered {e.code}'
            except Exception as e:  # noqa: BLE001
                if method == 'GET':
                    return f'{url}: {e.__class__.__name__}'
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for res in pool.map(probe, sorted(urls)):
            if res:
                warnings.append(f'external link: {res}')
    return problems


def run_gate(build_dir: Path, manifest: dict, *, previous: dict | None = None, check_external: bool = True) -> dict:
    """Every gate check on one build. Returns {"passed", "warnings", "checks"}; raises GateFailure on a stop."""
    import pypdf
    import pypdfium2 as pdfium

    report = json.loads((build_dir / 'build-report.json').read_text(encoding='utf-8'))
    ed = next((e for e in manifest['editions'] if e['editionId'] == report['editionId']), None)
    if ed is None:
        raise GateFailure('sources', f'edition {report["editionId"]} is not in the edition list')
    rows = {r['railKey']: r for r in ed['rails']}
    warnings: list[str] = []
    checks: dict = {}

    # 1. sources
    for sec in report['book']['sections']:
        row = rows.get(sec['railKey'])
        if row is None:
            raise GateFailure('sources', f'{sec["railKey"]} is not on the {ed["label"]} list')
        want = row.get('sha256') if row.get('submissionId') else (row.get('localSha256') or row.get('sha256'))
        got = sha256_file(build_dir / sec['textFile'])
        if got != want or sec['sha256'] != want:
            raise GateFailure('sources', f'{sec["railKey"]}: source sha256 {got} != list {want}')
    checks['sources'] = f'{len(report["book"]["sections"])} sources match the list'

    # 2. pdf
    book_path = build_dir / report['book']['file']
    files = [book_path] + [build_dir / c['file'] for c in report['chapters']]
    readers = {}
    for f in files:
        try:
            readers[f] = pypdf.PdfReader(str(f))
            len(readers[f].pages)
        except Exception as e:  # noqa: BLE001
            raise GateFailure('pdf', f'{f.name} does not open: {e}')
        bad = fonts_not_embedded(readers[f])
        if bad:
            raise GateFailure('pdf', f'{f.name}: fonts not embedded: {", ".join(bad)}')
    for sec in report['book']['sections']:
        for img in sec.get('images', []):
            p = Path(img['file']) if os.path.isabs(img['file']) else None
            if not img.get('width') or img['width'] < 300 or img.get('height', 0) < 100:
                raise GateFailure('pdf', f'{sec["railKey"]}: image {img["src"]} is missing or too small ({img.get("width")}x{img.get("height")})')
            if p is not None and not p.exists():
                raise GateFailure('pdf', f'{sec["railKey"]}: image {img["src"]} not found')
    checks['pdf'] = f'{len(files)} PDFs open, fonts embedded, images present'

    # 3. text (book sections), 4. structure
    book = pdfium.PdfDocument(str(book_path))
    reader = readers[book_path]
    npages = len(book)
    texts = [page_body_text(book[i]) for i in range(npages)]
    starts = {s['railKey']: s['startPage'] for s in report['book']['sections'] if s.get('startPage')}
    order = [s for s in report['book']['sections'] if s['kind'] != 'edition']
    # every rail once, in list order (front, introduction, chapters in list order, back)
    expected = [k for k in (r['railKey'] for r in ed['rails']) if k in {s['railKey'] for s in order}]
    chapter_keys = [s['railKey'] for s in order if s['kind'] == 'chapter']
    listed_chapters = [k for k in expected if k in chapter_keys]
    if chapter_keys != listed_chapters:
        raise GateFailure('structure', f'chapters are in the order {chapter_keys}, the list says {listed_chapters}')
    missing = [s['railKey'] for s in order if not s.get('startPage')]
    if missing:
        raise GateFailure('structure', f'parts not found in the book: {", ".join(missing)}')
    seq = sorted(order, key=lambda s: s['startPage'])
    if [s['railKey'] for s in seq] != [s['railKey'] for s in order]:
        raise GateFailure('structure', 'parts are not in the expected order in the book')
    # the edition page
    edition_sec = next((s for s in report['book']['sections'] if s['kind'] == 'edition'), None)
    edition_page = None
    if edition_sec is not None:
        line = norm(report.get('editionLine') or '')
        edition_page = next((i + 1 for i in range(min(8, npages)) if line and line in norm(texts[i])), None)
        if edition_page is None:
            raise GateFailure('structure', 'the edition page with its "built from the edition list" line was not found')
    # text of each part
    bounds = []
    for k, s in enumerate(seq):
        end = (seq[k + 1]['startPage'] - 1) if k + 1 < len(seq) else npages
        bounds.append((s, s['startPage'], end))
    if edition_sec is not None:
        bounds.insert(0, (edition_sec, edition_page, edition_page))
    for s, a, b in bounds:
        stream = norm(''.join(texts[a - 1:b]))
        fur = s.get('furniture') or {}
        parts = (fur.get('before') or []) + (fur.get('afterHead') or []) + (fur.get('after') or [])
        if s['kind'] == 'edition':
            parts = parts + [report.get('editionLine') or '']
        stream = strip_furniture(stream, parts)
        src_md = (build_dir / s['textFile']).read_text(encoding='utf-8')
        if s['kind'] == 'edition':
            src_md = re.sub(r'(?m)\A\s*#\s[^\n]*\n', '', src_md)  # the page's heading is not printed
        src_md = re.sub(r'\s*\(V\d+\)', '', src_md) if s['kind'] == 'chapter' else src_md
        want = norm(source_printed_text(src_md, s.get('dropped')))
        if stream != want:
            raise GateFailure('text', f'{s["railKey"]} (book pages {a}-{b}) differs from {s["railKey"]} '
                              f'revision {s.get("revision") or "(book repo)"}: {first_difference(stream, want)}')
    checks['text'] = f'{len(bounds)} parts of the book match their sources word for word'

    # chapter PDFs: text, stamps
    for c in report['chapters']:
        sec = next(s for s in report['book']['sections'] if s['railKey'] == c['railKey'])
        doc = pdfium.PdfDocument(str(build_dir / c['file']))
        stream = norm(''.join(page_body_text(doc[i]) for i in range(len(doc))))
        fur = sec.get('furniture') or {}
        stream = strip_furniture(stream, (fur.get('before') or []) + (fur.get('afterHead') or []) +
                                 (fur.get('after') or []) + [c.get('colophon') or ''])
        src_md = re.sub(r'\s*\(V\d+\)', '', (build_dir / sec['textFile']).read_text(encoding='utf-8'))
        want = norm(source_printed_text(src_md, sec.get('dropped')))
        if stream != want:
            raise GateFailure('text', f'chapter PDF {c["file"]} differs from its source: {first_difference(stream, want)}')
        doc.close()
    checks['chapters'] = f'{len(report["chapters"])} chapter PDFs match their sources word for word'

    # Contents numbers = real page numbers
    folios = report['book']['folios']
    shown = [t['shown'] for t in report['book']['toc']]
    ids_to_rail = {s.get('anchor'): s['railKey'] for s in order}
    real = []
    for t in report['book']['toc']:
        rail = ids_to_rail.get(t['id'], t['id'])
        real.append(folios[starts[rail] - 1] if rail in starts else None)
    if shown != real:
        bad = [(t['id'], a, b) for t, a, b in zip(report['book']['toc'], shown, real) if a != b]
        raise GateFailure('structure', f'Contents numbers differ from the real pages: {bad[:5]}')
    printed = toc_numbers(book, list(range(4, min(8, npages) + 1)))
    if shown and not is_subsequence(shown, printed):
        raise GateFailure('structure', f'the printed Contents numbers {printed[:40]} are not the computed ones {shown}')
    # blank pages, orphan pages
    start_pages = {s['startPage'] for s in seq}
    for i in range(npages):
        page_no = i + 1
        t = norm(texts[i])
        has_img = page_has_image(reader.pages[i])
        if not t and not has_img:
            if page_no == 1 or (page_no + 1) in start_pages or (edition_page and page_no == edition_page + 1):
                continue
            raise GateFailure('structure', f'page {page_no} is blank and does not precede a part')
        if 0 < len(t) < 60 and not has_img and page_no not in start_pages and page_no > 3:
            raise GateFailure('structure', f'page {page_no} holds only "{texts[i].strip()[:60]}"')
    over = overflowing_pages(book)
    if over:
        raise GateFailure('structure', f'text outside the printable area on pages {over[:10]}')
    checks['structure'] = f'{npages} pages: parts in list order, Contents numbers right, no stray blank, orphan or overflow'

    # images actually placed in the book
    for s, a, b in bounds:
        need = len(s.get('images') or [])
        have = sum(count_images(reader.pages[i]) for i in range(a - 1, b))
        if have < need:
            raise GateFailure('pdf', f'{s["railKey"]}: {need} image(s) referenced, {have} placed (pages {a}-{b})')

    # 5. stamps
    def keywords(path):
        return editions.parse_pdf_stamp(editions.pdf_info(path).get('Keywords', ''))
    kw = keywords(book_path)
    want_rails = editions.edition_rails_sha256(ed)
    if kw.get('dp-edition') != ed['editionId'] or kw.get('dp-edition-rails-sha256') != want_rails:
        raise GateFailure('stamps', f'book stamp {kw} does not name edition {ed["editionId"]} with list hash {want_rails}')
    if ed.get('manifestSha256') and kw.get('dp-manifest-sha256') != ed['manifestSha256']:
        raise GateFailure('stamps', 'book stamp manifest hash differs from the list')
    for c in report['chapters']:
        row = rows[c['railKey']]
        k = keywords(build_dir / c['file'])
        if k.get('dp-rail') != c['railKey'] or k.get('dp-submission') != str(row.get('submissionId') or 'null') or \
                k.get('dp-edition') != (row.get('revisionEdition') or ed['editionId']):
            raise GateFailure('stamps', f'{c["file"]}: stamp {k} does not match the list')
    checks['stamps'] = 'book and chapter stamps match the list'

    # 6. sanity against the previous edition
    if previous and previous.get('book'):
        pr, br = npages / max(1, previous['book']['pages']), book_path.stat().st_size / max(1, previous['book']['bytes'])
        if not (SANITY_PAGES[0] <= pr <= SANITY_PAGES[1]):
            raise GateFailure('sanity', f'{npages} pages vs {previous["book"]["pages"]} in {previous["label"]} '
                              f'(factor {pr:.2f}, allowed {SANITY_PAGES})')
        if not (SANITY_BYTES[0] <= br <= SANITY_BYTES[1]):
            raise GateFailure('sanity', f'{book_path.stat().st_size} bytes vs {previous["book"]["bytes"]} in '
                              f'{previous["label"]} (factor {br:.2f}, allowed {SANITY_BYTES})')
        checks['sanity'] = f'pages x{pr:.2f}, size x{br:.2f} vs {previous["label"]}'
    else:
        checks['sanity'] = 'no previous edition to compare with'

    # 7. links
    problems = check_links(reader, set(), warnings) if check_external else []
    if problems:
        raise GateFailure('links', '; '.join(problems[:5]))
    checks['links'] = f'internal links resolve; {len([w for w in warnings if w.startswith("external")])} external warning(s)'
    book.close()
    return {'passed': True, 'warnings': warnings, 'checks': checks}


# --------------------------------------------------------------------------- the job

class Env:
    def __init__(self, name: str, args):
        cfg = dict(ENVIRONMENTS[name])
        for key in ('hub', 'site', 'store', 'book_dir', 'govhub_root', 'site_public'):
            v = getattr(args, key, None)
            if v:
                cfg[key] = Path(v) if key not in ('hub', 'site') else v
        self.name = name
        self.__dict__.update(cfg)
        self.store = Path(self.store)
        self.tool = Path(args.tool_dir or (Path(self.store).parent / 'tool'))
        self.work = Path(self.store).parent / 'work'
        self.govhub_python = Path(args.govhub_python) if getattr(args, 'govhub_python', None) else Path(self.govhub_root) / '.venv' / 'bin' / 'python'

    # Gov Hub
    def editions(self) -> dict:
        return http_json(f'{self.hub}/api/doc/editions/?work={WORK}')

    def pdfs(self) -> dict:
        return http_json(f'{self.hub}/api/doc/editions/pdfs/?work={WORK}')

    def govhub(self, *cli: str) -> dict:
        if not (Path(self.govhub_root) / 'run.py').exists() and not (Path(self.govhub_root) / 'app.py').exists():
            raise RuntimeError(f'Gov Hub checkout not found at {self.govhub_root} (pass --govhub-root)')
        env = dict(os.environ, FLASK_APP='app.py', FLASK_ENV=self.flask_env)
        res = subprocess.run([str(self.govhub_python), '-m', 'flask', 'book-editions', *cli], cwd=self.govhub_root,
                             env=env, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f'Gov Hub CLI {cli[0]} failed: {(res.stderr or res.stdout).strip()[-800:]}')
        out = res.stdout[res.stdout.find('{'):] if '{' in res.stdout else '{}'
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            return {'raw': res.stdout}


def builder_version() -> str:
    h = hashlib.sha256()
    for p in (SCRIPTS / 'v1-book-pdf' / 'build.mjs', SCRIPTS / 'v1-book-pdf' / 'pdf-stamp.mjs', Path(__file__)):
        h.update(p.read_bytes())
    return h.hexdigest()


def inputs_sha(edition: dict) -> str:
    return hashlib.sha256(f'{edition.get("manifestSha256")}|{builder_version()}'.encode()).hexdigest()


def book_manifest(env: Env, response: dict) -> dict:
    """The book-format manifest (editions.json shape) from Gov Hub's answer and this box's book tree."""
    book = editions.Book.load(Path(env.book_dir))
    gen = editions.generate(response, book, source={'kind': 'govhub-api', 'url': f'{env.hub}/api/doc/editions/',
                                                    'fetchedAt': now_iso(), 'responseSha256': editions.canonical_sha256(response)})
    return gen.manifest


ARCHIVE_DIR = REPO / 'desirableproperties-book' / 'downloads' / 'editions'


def archived_set(edition_id: str) -> Path | None:
    folder = ARCHIVE_DIR / edition_id
    return folder if (folder / 'SHA256SUMS').exists() and (folder / 'build-report.json').exists() else None


def page_texts(path: Path) -> list[str]:
    import pypdfium2 as pdfium
    doc = pdfium.PdfDocument(str(path))
    try:
        return [doc[i].get_textpage().get_text_range() for i in range(len(doc))]
    finally:
        doc.close()


def adopt_archive(build_dir: Path, archive: Path) -> None:
    """An archived set is published as is when a fresh, gated build from the same list and build date has the
    same text on every page of every file (bytes differ only in creation times and Chrome's object layout)."""
    report = json.loads((build_dir / 'build-report.json').read_text(encoding='utf-8'))
    pairs = [(build_dir / report['book']['file'], archive / 'book.pdf')] + \
        [(build_dir / c['file'], archive / f'{c["railKey"]}.pdf') for c in report['chapters']]
    for fresh, old in pairs:
        if not old.exists():
            raise GateFailure('archive', f'{old.name} is missing from the archived set')
        if page_texts(fresh) != page_texts(old):
            raise GateFailure('archive', f'{old.name}: the archived file\'s text differs from a rebuild of the same list')
    for fresh, old in pairs:
        shutil.copy2(old, fresh)  # publish the archived bytes, so the archive and the store are one set


def run_builder(env: Env, manifest_path: Path, edition_id: str, out_dir: Path, build_date: str | None = None) -> None:
    tool_build = env.tool / 'build.mjs'
    build = tool_build if tool_build.exists() else SCRIPTS / 'v1-book-pdf' / 'build.mjs'
    proc_env = dict(os.environ, DP_REPO_DIR=str(REPO), DP_BOOK_DIR=str(env.book_dir), DP_SITE_PUBLIC=str(env.site_public),
                    DP_PDF_CACHE=str(env.work / 'cache'))
    cmd = ['node', str(build), '--edition', edition_id, '--manifest', str(manifest_path), '--out-dir', str(out_dir),
           '--hub', env.hub] + (['--build-date', build_date] if build_date else [])
    log(' '.join(cmd))
    res = subprocess.run(cmd, env=proc_env, capture_output=True, text=True)
    sys.stdout.write(res.stdout[-4000:])
    if res.returncode != 0:
        msg = (res.stderr.strip().splitlines() or ['builder failed'])
        stop = next((l for l in msg if 'STOP:' in l), msg[-1])
        raise GateFailure('sources' if 'STOP' in stop else 'build', stop.replace('Error: ', '')[:600])


def store_set(env: Env, build_dir: Path, edition_id: str) -> dict:
    """Copy a gated build into <store>/<edition>/ (never overwriting a different set). Returns the record parts."""
    report = json.loads((build_dir / 'build-report.json').read_text(encoding='utf-8'))
    files = {'book.pdf': build_dir / report['book']['file']}
    for c in report['chapters']:
        files[f'{c["railKey"]}.pdf'] = build_dir / c['file']
    sums = {name: sha256_file(p) for name, p in files.items()}
    final = env.store / edition_id
    if final.exists():
        old = (final / 'SHA256SUMS').read_text() if (final / 'SHA256SUMS').exists() else ''
        new = ''.join(f'{sums[n]}  {n}\n' for n in sorted(sums))
        if old != new:
            raise GateFailure('store', f'{final} already holds a different set; published files are never overwritten')
    else:
        env.store.mkdir(parents=True, exist_ok=True)
        tmp = Path(tempfile.mkdtemp(prefix=f'.{edition_id}-', dir=env.store))
        for name, p in files.items():
            shutil.copy2(p, tmp / name)
        (tmp / 'SHA256SUMS').write_text(''.join(f'{sums[n]}  {n}\n' for n in sorted(sums)))
        shutil.copy2(build_dir / 'build-report.json', tmp / 'build-report.json')
        for p in tmp.iterdir():
            p.chmod(0o444)
        tmp.chmod(0o755)
        os.rename(tmp, final)  # atomic on one filesystem
    pages = {'book.pdf': report['book']['pages'], **{f'{c["railKey"]}.pdf': c['pages'] for c in report['chapters']}}

    def entry(name):
        return {'url': f'/downloads/{edition_id}/{name}', 'file': name, 'sha256': sums[name], 'pages': pages[name],
                'bytes': (final / name).stat().st_size}
    return {'book': entry('book.pdf'), 'chapters': {c['railKey']: entry(f'{c["railKey"]}.pdf') for c in report['chapters']},
            'builtAt': report['builtDate'] + 'T00:00:00Z'}


def write_latest_file(env: Env) -> None:
    """A local copy of Gov Hub's answer, for the site's fallback when Gov Hub cannot be reached."""
    try:
        payload = env.pdfs()
    except Exception as e:  # noqa: BLE001
        log(f'latest.json not refreshed: {e}')
        return
    tmp = env.store / '.latest.json.tmp'
    tmp.write_text(json.dumps(payload, indent=1))
    os.replace(tmp, env.store / 'latest.json')


def verify_outside(env: Env, edition_id: str, record: dict) -> list[str]:
    """Each published URL answers 200, is a PDF, has the recorded sha256 and the edition stamp."""
    problems = []
    items = [('book', record['book'])] + [(k, v) for k, v in record['chapters'].items()]
    for name, item in items:
        url = env.site + item['url']
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                ctype = resp.headers.get('Content-Type', '')
            if resp.status != 200 or 'pdf' not in ctype:
                problems.append(f'{url}: {resp.status} {ctype}')
            elif hashlib.sha256(body).hexdigest() != item['sha256']:
                problems.append(f'{url}: sha256 differs from the record')
            else:
                with tempfile.NamedTemporaryFile(suffix='.pdf') as fh:
                    fh.write(body)
                    fh.flush()
                    stamp = editions.parse_pdf_stamp(editions.pdf_info(Path(fh.name)).get('Keywords', ''))
                if not stamp.get('dp-edition'):
                    problems.append(f'{url}: no edition stamp')
        except Exception as e:  # noqa: BLE001
            problems.append(f'{url}: {e}')
    return problems


def process_edition(env: Env, manifest: dict, edition_id: str, *, fixture: bool, previous: dict | None,
                    check_external: bool = True, skip_verify: bool = False) -> bool:
    ed = next(e for e in manifest['editions'] if e['editionId'] == edition_id)
    inputs = inputs_sha(ed)
    state_args = ['--edition', edition_id, '--inputs', inputs]
    if fixture:
        state_args += ['--label', ed['label'], '--fixture', '--released-at', ed.get('releasedAt') or now_iso()]
    env.govhub('pdf-state', *state_args, '--state', 'building')
    env.work.mkdir(parents=True, exist_ok=True)
    out = env.work / f'{edition_id}-{int(time.time())}'
    mpath = env.work / f'manifest-{edition_id}.json'
    mpath.write_text(json.dumps(manifest, indent=1))
    archive = None if fixture else archived_set(edition_id)
    try:
        build_date = json.loads((archive / 'build-report.json').read_text())['builtDate'] if archive else None
        run_builder(env, mpath, edition_id, out, build_date)
        log('gate …')
        gate = run_gate(out, manifest, previous=previous, check_external=check_external)
        if archive:
            adopt_archive(out, archive)
            gate['checks']['archive'] = f'the archived set in {archive.relative_to(REPO)} matches a rebuild page for page'
            log(f'  ok archive: publishing the archived files of {archive.relative_to(REPO)}')
        for name, msg in gate['checks'].items():
            log(f'  ok {name}: {msg}')
        for w in gate['warnings']:
            log(f'  warning {w}')
        record = store_set(env, out, edition_id)
    except GateFailure as e:
        log(f'GATE FAILED {e}')
        env.govhub('pdf-state', *state_args, '--state', 'failed', '--reason', f'{e.check}: {e.message}'[:1000])
        return False
    except Exception as e:  # noqa: BLE001
        log(f'FAILED {e}')
        env.govhub('pdf-state', *state_args, '--state', 'failed', '--reason', f'job: {e}'[:1000])
        return False
    record.update({'editionId': edition_id, 'label': ed['label'], 'fixture': fixture, 'gate': gate,
                   'inputsSha256': inputs, 'editionReleasedAt': ed.get('releasedAt')})
    rpath = env.work / f'record-{edition_id}.json'
    rpath.write_text(json.dumps(record, indent=1))
    env.govhub('pdf-publish', '--record', str(rpath))
    log(f'published {ed["label"]} PDFs (Gov Hub flip)')
    write_latest_file(env)
    if not skip_verify:
        problems = []
        for attempt in range(6):
            problems = verify_outside(env, edition_id, record)
            if not problems:
                break
            time.sleep(10)
        if problems:
            reason = 'outside check: ' + '; '.join(problems[:3])
            env.govhub('pdf-unpublish', '--edition', edition_id, '--reason', reason[:1000])
            write_latest_file(env)
            log(f'ROLLED BACK: {reason}')
            return False
        log('outside check: every URL answers 200 with the recorded file')
    shutil.rmtree(out, ignore_errors=True)
    return True


def previous_published(pdfs: dict, before: str | None) -> dict | None:
    pub = [e for e in pdfs.get('editions', []) if e['state'] == 'published' and not e.get('fixture')]
    return pub[0] if pub else None


def cmd_run(env: Env, args) -> int:
    resp = env.editions()
    manifest = book_manifest(env, resp)
    pdfs = env.pdfs()
    sets = {e['editionId']: e for e in pdfs.get('editions', [])}
    ok = True
    for ed in editions.edition_chain(manifest['editions']):
        if ed['status'] != 'released':
            continue
        s = sets.get(ed['editionId'])
        due = s is None or (s['state'] == 'failed' and s.get('inputsSha256') != inputs_sha(ed)) or \
            (s['state'] == 'building' and time.time() - datetime.fromisoformat((s.get('updatedAt') or now_iso()).replace('Z', '+00:00')).timestamp() > STALE_BUILDING_S) or \
            (s['state'] == 'failed' and args.retry_failed)
        if not due:
            continue
        log(f'{ed["label"]}: building its PDFs')
        ok &= process_edition(env, manifest, ed['editionId'], fixture=False, previous=previous_published(pdfs, ed['editionId']),
                              check_external=not args.no_external)
    archive_pending(env)
    return 0 if ok else 1


def cmd_build(env: Env, args) -> int:
    if args.manifest:
        manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    else:
        manifest = book_manifest(env, env.editions())
    pdfs = env.pdfs()
    ok = process_edition(env, manifest, args.edition, fixture=args.fixture, previous=previous_published(pdfs, args.edition),
                         check_external=not args.no_external, skip_verify=args.no_verify)
    return 0 if ok else 1


def cmd_preview(env: Env, args) -> int:
    manifest = book_manifest(env, env.editions())
    current = next(e for e in manifest['editions'] if e['status'] == 'in_progress')
    out = env.store / 'previews' / f'{current["editionId"]}-{datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")}'
    mpath = env.work / 'manifest-preview.json'
    env.work.mkdir(parents=True, exist_ok=True)
    mpath.write_text(json.dumps(manifest, indent=1))
    run_builder(env, mpath, current['editionId'], out)
    log(f'preview written to {out} (not served, not recorded)')
    return 0


def cmd_gate(args) -> int:
    manifest = json.loads(Path(args.manifest).read_text(encoding='utf-8'))
    try:
        res = run_gate(Path(args.dir), manifest, check_external=not args.no_external)
    except GateFailure as e:
        print(f'GATE FAILED {e}')
        return 1
    print(json.dumps(res, indent=1))
    return 0


def archive_pending(env: Env) -> None:
    """Keep the repo archive copy of each published edition (production only): dispatch the archive workflow
    (the rail sync's automated-commit route) until the folder is in this box's checkout with the recorded sha256s,
    at most once an hour per edition; record pending / committed / failed in Gov Hub. Never touches publish."""
    if not env.archive:
        return
    try:
        pdfs = env.pdfs()
    except Exception:  # noqa: BLE001
        return
    for s in pdfs.get('editions', []):
        if s['state'] != 'published' or s.get('fixture'):
            continue
        ed = s['editionId']
        folder = ARCHIVE_DIR / ed
        want = {s['book']['file']: s['book']['sha256'], **{v['file']: v['sha256'] for v in (s.get('chapters') or {}).values()}}
        if (folder / 'SHA256SUMS').exists():
            have = dict(reversed(l.split('  ', 1)) for l in (folder / 'SHA256SUMS').read_text().split('\n') if '  ' in l)
            state = 'committed' if have == want else 'failed'
            detail = 'in the repo' if state == 'committed' else 'the committed copy differs from the published set'
            if (s.get('archive') or {}).get('state') != state:
                env.govhub('pdf-archive', '--edition', ed, '--state', state, '--detail', detail)
            continue
        marker = env.store.parent / f'.archive-dispatched-{ed}'
        if marker.exists() and time.time() - marker.stat().st_mtime < 3600:
            continue
        gh = shutil.which('gh') or str(HOME / 'bin' / 'gh')
        res = subprocess.run([gh, 'workflow', 'run', 'edition-pdf-archive.yml', '--repo', 'shiftshapr/desirable-properties',
                              '-f', f'edition={ed}', '-f', f'site={env.site}', '-f', f'hub={env.hub}'],
                             capture_output=True, text=True)
        marker.touch()
        if res.returncode == 0:
            env.govhub('pdf-archive', '--edition', ed, '--state', 'pending', '--detail', f'archive workflow dispatched {now_iso()}')
            log(f'archive {ed}: workflow dispatched')
        else:
            detail = f'dispatch failed: {(res.stderr or res.stdout).strip()[:300]}'
            env.govhub('pdf-archive', '--edition', ed, '--state', 'failed', '--detail', detail)
            log(f'archive {ed}: {detail}')


def cmd_install(env: Env, args) -> int:
    env.tool.mkdir(parents=True, exist_ok=True)
    for f in ('build.mjs', 'pdf-stamp.mjs', 'package.json', 'package-lock.json'):
        shutil.copy2(SCRIPTS / 'v1-book-pdf' / f, env.tool / f)
    subprocess.run(['npm', 'ci', '--no-audit', '--no-fund'], cwd=env.tool, check=True)
    venv = env.tool / 'venv'
    if not venv.exists():
        subprocess.run([sys.executable, '-m', 'venv', str(venv)], check=True)
    subprocess.run([str(venv / 'bin' / 'pip'), 'install', '-q', 'pypdf', 'pypdfium2', 'pillow'], check=True)
    env.store.mkdir(parents=True, exist_ok=True)
    log(f'installed: builder in {env.tool}, venv {venv}, store {env.store}')
    log(f'timer: */15 * * * * {venv}/bin/python {Path(__file__).resolve()} --env {env.name} run >> {env.store.parent}/job.log 2>&1')
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--env', choices=sorted(ENVIRONMENTS), default='staging')
    for k in ('hub', 'site', 'store', 'book-dir', 'govhub-root', 'govhub-python', 'site-public', 'tool-dir'):
        ap.add_argument(f'--{k}', dest=k.replace('-', '_'), default=None)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('install')
    r = sub.add_parser('run')
    r.add_argument('--retry-failed', action='store_true')
    r.add_argument('--no-external', action='store_true')
    b = sub.add_parser('build')
    b.add_argument('--edition', required=True)
    b.add_argument('--manifest')
    b.add_argument('--fixture', action='store_true')
    b.add_argument('--no-external', action='store_true')
    b.add_argument('--no-verify', action='store_true')
    sub.add_parser('preview')
    g = sub.add_parser('gate')
    g.add_argument('--dir', required=True)
    g.add_argument('--manifest', required=True)
    g.add_argument('--no-external', action='store_true')
    args = ap.parse_args()
    if args.cmd == 'gate':
        return cmd_gate(args)
    env = Env(args.env, args)
    if args.env == 'production' and getattr(args, 'fixture', False):
        print('Fixture sets are staging proofs; refusing on production.', file=sys.stderr)
        return 2
    return {'install': cmd_install, 'run': cmd_run, 'build': cmd_build, 'preview': cmd_preview}[args.cmd](env, args)


if __name__ == '__main__':
    sys.exit(main())
