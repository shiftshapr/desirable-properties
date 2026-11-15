#!/usr/bin/env python3
"""Edition PDFs: the gate's normalisation, and (with Chrome, pypdf and pypdfium2 available) a full build of a
fixture edition with a new chapter and a removed one: it builds, numbers and names correctly, passes the gate,
a changed word or a sha256 mismatch is stopped, and a rebuild from the same list is reproducible page for page."""
from __future__ import annotations

import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

import edition_pdfs as E  # noqa: E402

FIX = SCRIPTS / 'fixtures' / 'edition-pdfs'
BUILD = SCRIPTS / 'v1-book-pdf' / 'build.mjs'


def have_render_stack() -> bool:
    try:
        import pypdf  # noqa: F401
        import pypdfium2  # noqa: F401
    except ImportError:
        return False
    if not (SCRIPTS / 'v1-book-pdf' / 'node_modules' / 'pagedjs').exists():
        return False
    try:
        subprocess.run(['node', '-e', ''], check=True)
    except Exception:  # noqa: BLE001
        return False
    return bool(os.environ.get('CHROME_PATH') or Path('/usr/bin/google-chrome').exists() or
                list((Path.home() / '.cache' / 'puppeteer').glob('chrome/*/chrome-linux64/chrome')))


class NormalisationTests(unittest.TestCase):
    def test_letters_and_digits_only(self):
        self.assertEqual(E.norm('Low-\nfriction, “DP1”!'), 'lowfrictiondp1')

    def test_printed_text_of_markdown(self):
        md = ('# T\n\n<!-- hidden -->\nSee [the site](https://x.org) and ![alt](/img.png).\n\n'
              '- `<label>` stays\n\n```json\n{"a": "<b>"}\n```\n<span>tag gone</span>\n')
        out = E.norm(E.source_printed_text(md))
        self.assertIn('seethesiteand', out)
        self.assertNotIn('hidden', out)
        self.assertNotIn('xorg', out)
        self.assertIn('labelstays', out)
        self.assertIn('ab', out)            # code kept verbatim, fence language dropped
        self.assertNotIn('json', out)
        self.assertIn('taggone', out)


@unittest.skipUnless(have_render_stack(), 'needs Chrome, node modules, pypdf and pypdfium2')
class FixtureEditionBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix='edition-pdfs-test-'))
        cls.manifest = json.loads((FIX / 'manifest.json').read_text())
        cls.out = cls.tmp / 'a'
        cls.build(cls.out)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def build(cls, out: Path, manifest: Path | None = None, texts: Path | None = None) -> subprocess.CompletedProcess:
        env = dict(os.environ, DP_BOOK_DIR=str(FIX / 'book'), DP_PDF_CACHE=str(cls.tmp / 'cache'))
        res = subprocess.run(['node', str(BUILD), '--edition', '9.9', '--manifest', str(manifest or FIX / 'manifest.json'),
                              '--texts-dir', str(texts or FIX / 'texts'), '--out-dir', str(out), '--build-date', '2026-12-01'],
                             env=env, capture_output=True, text=True)
        return res

    def test_builds_names_and_numbers_from_the_list(self):
        report = json.loads((self.out / 'build-report.json').read_text())
        self.assertEqual(sorted(p.name for p in (self.out / 'chapters').iterdir()), ['dp01.pdf', 'dp02.pdf', 'rights.pdf'])
        kinds = [(s['railKey'], s['kind']) for s in report['book']['sections']]
        self.assertEqual(kinds, [('edition', 'edition'), ('ml-draft-026', 'intro'), ('rights', 'chapter'),
                                 ('dp01', 'chapter'), ('dp02', 'chapter'), ('acknowledgements', 'back')])
        self.assertNotIn('dp24', json.dumps(report))
        self.assertEqual(report['editionLine'], 'Version 9.9 (test) · built December 1, 2026 from the Version 9.9 (test) edition list')
        # Contents numbers are the real folios (the introduction is page 1)
        starts = {s['railKey']: s['startPage'] for s in report['book']['sections']}
        folio = {t['id']: t['shown'] for t in report['book']['toc']}
        self.assertEqual(folio['introduction'], '1')
        self.assertEqual(folio['rights'], report['book']['folios'][starts['rights'] - 1])

    def test_gate_passes(self):
        res = E.run_gate(self.out, self.manifest, check_external=False)
        self.assertTrue(res['passed'])
        self.assertIn('text', res['checks'])

    def test_changed_word_is_stopped(self):
        bad = self.tmp / 'changed'
        shutil.copytree(self.out, bad)
        t = (bad / 'texts' / 'dp01.txt').read_text().replace('accountable identity', 'accountable identities')
        (bad / 'texts' / 'dp01.txt').write_text(t)
        m = copy.deepcopy(self.manifest)
        for e in m['editions']:
            for r in e['rails']:
                if r['railKey'] == 'dp01':
                    r['sha256'] = hashlib.sha256(t.encode()).hexdigest()
        rep = json.loads((bad / 'build-report.json').read_text())
        for s in rep['book']['sections']:
            if s['railKey'] == 'dp01':
                s['sha256'] = hashlib.sha256(t.encode()).hexdigest()
        (bad / 'build-report.json').write_text(json.dumps(rep))
        with self.assertRaises(E.GateFailure) as cm:
            E.run_gate(bad, m, check_external=False)
        self.assertEqual(cm.exception.check, 'text')

    def test_sha_mismatch_stops_the_build(self):
        texts = self.tmp / 'texts-bad'
        shutil.copytree(FIX / 'texts', texts)
        (texts / 'sub-dp02.txt').write_text((texts / 'sub-dp02.txt').read_text() + '\nOne more line.\n')
        res = self.build(self.tmp / 'bad-sha', texts=texts)
        self.assertNotEqual(res.returncode, 0)
        self.assertIn('STOP: dp02', res.stderr)

    def test_missing_image_is_stopped(self):
        texts = self.tmp / 'texts-img'
        shutil.copytree(FIX / 'texts', texts)
        t = (texts / 'sub-dp02.txt').read_text() + '\n![A figure](/content/local/assets/dp/not-there.webp)\n'
        (texts / 'sub-dp02.txt').write_text(t)
        m = copy.deepcopy(self.manifest)
        for e in m['editions']:
            for r in e['rails']:
                if r['railKey'] == 'dp02':
                    r['sha256'] = hashlib.sha256(t.encode()).hexdigest()
        mp = self.tmp / 'm-img.json'
        mp.write_text(json.dumps(m))
        res = self.build(self.tmp / 'bad-img', manifest=mp, texts=texts)
        self.assertNotEqual(res.returncode, 0)
        self.assertIn('Image not found', res.stderr)

    def test_rebuild_is_reproducible_page_for_page(self):
        again = self.tmp / 'b'
        res = self.build(again)
        self.assertEqual(res.returncode, 0, res.stderr)
        for name in ['book.pdf', 'chapters/rights.pdf', 'chapters/dp01.pdf']:
            self.assertEqual(E.page_texts(self.out / name), E.page_texts(again / name), name)
        # Not byte-identical: Chrome writes the creation time into each PDF (and the stamp's info dictionary
        # keeps it); everything printed is pinned by --build-date / SOURCE_DATE_EPOCH.


if __name__ == '__main__':
    unittest.main()
