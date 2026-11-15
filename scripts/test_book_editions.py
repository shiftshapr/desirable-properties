#!/usr/bin/env python3
"""Unit tests for the edition record (scripts/book_editions.py). No network required."""
from __future__ import annotations

import copy
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))

import book_editions as ed  # noqa: E402

FIXTURE = SCRIPTS / 'fixtures' / 'govhub-editions-desirableproperties-book.json'


def sha(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def marker(sub: str, rev: str, ml: str) -> str:
    return f'<!-- govhub-sync: ml={ml} revision={rev} submission={sub} hash=0 synced=2026-11-13T00:00:00Z -->\n'


class MiniBook:
    """A three-rail book on disk: an Edition page, an inscribed DP1 and an Introduction."""

    def __init__(self, tmp: Path):
        self.root = tmp / 'desirableproperties-book'
        (self.root / 'json').mkdir(parents=True)
        (self.root / 'content' / 'local' / 'archive' / 'dp01').mkdir(parents=True)
        self.texts = {
            'edition': 'Version 1.0 edition notice\n',
            'dp01': marker('sub-dp01-r06', '06', 'ML-Draft-008') + '# DP1 r06\n',
            'intro': marker('sub-intro-r01', '01', 'ML-Draft-026') + '# Intro r01\n',
        }
        self.write('content/local/edition.md', self.texts['edition'])
        self.write('content/local/dp1.md', self.texts['dp01'])
        self.write('content/local/introduction.md', self.texts['intro'])
        self.archive_text = '# DP1 r05\n'
        self.write('content/local/archive/dp01/5.md', self.archive_text)
        self.inscribed = '# DP1 May draft\n'
        self.sat = {
            'workId': 'desirableproperties-book',
            'bookCoverInscriptionId': 'coveri0',
            'articleRails': ['edition', 'ml-draft-026', 'dp01'],
            'sources': [
                {'railKey': 'edition', 'localOverride': '/content/local/edition.md'},
                {'railKey': 'ml-draft-026', 'mlNumber': 'ML-Draft-026',
                 'localOverride': '/content/local/introduction.md', 'inscriptionId': 'introi0',
                 'block': 950007, 'timestamp': 1779478064, 'inscriptionSha256': sha('# near 1.0\n'),
                 'inscribedRevision': None},
                {'railKey': 'dp01', 'dp': 'DP1', 'mlNumber': 'ML-Draft-008', 'inscriptionId': 'dp01i0',
                 'block': 954019, 'timestamp': 1780081453, 'inscriptionSha256': sha(self.inscribed),
                 'inscribedRevision': {'mlNumber': 'ML-Draft-008', 'revision': '01', 'submissionId': 'sub-dp01-r01'},
                 'localOverride': '/content/local/dp1.md'},
            ],
        }
        self.archives = {
            'schema': 'dp-book-chapter-archives/v1',
            'description': 'x',
            'current_label': 'Version 1.0',
            'archives': [{
                'key': 'dp01', 'rev': '5', 'label': 'Revision 5', 'file': '/content/local/archive/dp01/5.md',
                'live_from': '2026-08-08', 'live_until': '2026-11-13', 'sha256': sha(self.archive_text),
                'govhub': {'ml_number': 'ML-Draft-008', 'revision': '05', 'submission_id': 'sub-dp01-r05'},
            }],
        }
        self.write('json/sources-sat.json', ed.dump_json(self.sat))
        self.write('json/chapter-archives.json', ed.dump_json(self.archives))

    def write(self, rel: str, text: str) -> None:
        (self.root / rel).write_text(text, encoding='utf-8')

    def response(self) -> dict:
        r10 = [
            {'railKey': 'edition', 'mlNumber': None, 'revision': None, 'submissionId': None,
             'sha256': None, 'revisionEdition': None},
            {'railKey': 'ml-draft-026', 'mlNumber': 'ML-Draft-026', 'revision': '01',
             'submissionId': 'sub-intro-r01', 'sha256': 'a' * 64, 'revisionEdition': '1.0'},
            {'railKey': 'dp01', 'mlNumber': 'ML-Draft-008', 'revision': '06',
             'submissionId': 'sub-dp01-r06', 'sha256': 'b' * 64, 'revisionEdition': '1.0'},
        ]
        return {
            'work': 'desirableproperties-book', 'currentEdition': '1.1',
            'editions': [
                {'editionId': '0.77', 'label': 'Version 0.77', 'status': 'released', 'releasedAt': None,
                 'predecessorEditionId': None, 'decisionRef': 'x', 'manifestSha256': None,
                 'rails': [{'railKey': 'ml-draft-026', 'mlNumber': 'ML-Draft-026', 'revision': None,
                            'submissionId': None, 'sha256': sha('# near 1.0\n'), 'revisionEdition': '0.77'},
                           {'railKey': 'dp01', 'mlNumber': 'ML-Draft-008', 'revision': '01',
                            'submissionId': 'sub-dp01-r01', 'sha256': sha(self.inscribed),
                            'revisionEdition': '0.77'}]},
                {'editionId': '1.0', 'label': 'Version 1.0', 'status': 'released',
                 'releasedAt': '2026-11-13T00:00:00Z', 'predecessorEditionId': '0.77', 'decisionRef': 'y',
                 'manifestSha256': None, 'rails': copy.deepcopy(r10)},
                {'editionId': '1.1', 'label': 'Version 1.1', 'status': 'in_progress', 'releasedAt': None,
                 'predecessorEditionId': '1.0', 'decisionRef': None, 'manifestSha256': None,
                 'rails': copy.deepcopy(r10)},
            ],
        }

    def generate(self, response: dict | None = None, previous: dict | None = None) -> ed.Generated:
        response = response or self.response()
        source = {'kind': 'fixture', 'path': 't', 'fetchedAt': '2026-11-15T00:00:00Z',
                  'responseSha256': ed.canonical_sha256(response)}
        gen = ed.generate(response, ed.Book.load(self.root), source=source, previous=previous)
        ed.write_generated(gen, self.root / 'json')
        return gen


class EditionsTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.book = MiniBook(self.tmp)

    def tearDown(self):
        self._tmp.cleanup()

    def check(self) -> ed.Report:
        rep = ed.check_agreement(self.tmp, book_root=self.book.root)
        _, diffs = ed.regenerate_from_snapshot(self.book.root)
        rep.errors.extend(diffs)
        return rep


class ValidationTests(EditionsTestCase):
    def test_fixture_is_valid_for_the_real_book(self):
        sat = json.loads((REPO / 'desirableproperties-book/json/sources-sat.json').read_text(encoding='utf-8'))
        self.assertEqual(ed.validate_response(ed.load_fixture(FIXTURE), sat), [])

    def test_two_editions_in_progress_rejected(self):
        r = self.book.response()
        r['editions'][1]['status'] = 'in_progress'
        r['editions'][1]['releasedAt'] = None
        errs = ed.validate_response(r, self.book.sat)
        self.assertTrue(any('exactly one edition must be in progress' in e for e in errs), errs)

    def test_missing_rail_on_in_progress_list_rejected(self):
        r = self.book.response()
        r['editions'][2]['rails'] = r['editions'][2]['rails'][:2]
        self.assertTrue(any('rails missing' in e for e in ed.validate_response(r, self.book.sat)))

    def test_released_edition_may_omit_rails(self):
        self.assertEqual(ed.validate_response(self.book.response(), self.book.sat), [])

    def test_null_submission_only_on_released_lists(self):
        r = self.book.response()
        r['editions'][2]['rails'][2]['submissionId'] = None
        self.assertTrue(any('only a released edition' in e for e in ed.validate_response(r, self.book.sat)))

    def test_later_stamp_cannot_be_on_earlier_list(self):
        r = self.book.response()
        r['editions'][1]['rails'][2]['revisionEdition'] = '1.1'
        self.assertTrue(any('cannot be on the 1.0 list' in e for e in ed.validate_response(r, self.book.sat)))

    def test_manifest_sha256_contract_method(self):
        r = self.book.response()
        r['editions'][1]['manifestSha256'] = ed.govhub_manifest_sha256(r['editions'][1]['rails'])
        self.assertEqual(ed.validate_response(r, self.book.sat), [])
        r['editions'][1]['manifestSha256'] = '0' * 64
        self.assertTrue(any('manifestSha256' in e for e in ed.validate_response(r, self.book.sat)))

    def test_rail_without_document_in_this_database(self):
        # Dev Gov Hub has no Foreword and numbers some rails differently: the book repo fills the
        # page, and a different mlNumber is only a note.
        r = self.book.response()
        for e in r['editions'][1:]:
            e['rails'][1].update(mlNumber=None, revision=None, submissionId=None, sha256=None, revisionEdition=None)
            e['rails'][2]['mlNumber'] = 'ML-Draft-099'
        self.assertEqual(ed.validate_response(r, self.book.sat), [])
        gen = self.book.generate(r)
        intro = ed.live_rail(gen.manifest, 'ml-draft-026')
        self.assertEqual((intro['source'], intro['localSha256']), ('book-repo', sha(self.book.texts['intro'])))
        self.assertTrue(any('ML-Draft-099' in n for n in gen.notes), gen.notes)

    def test_not_an_object_and_empty(self):
        self.assertTrue(ed.validate_response([], self.book.sat))
        self.assertTrue(ed.validate_response({'work': 'desirableproperties-book', 'editions': []}, self.book.sat))

    def test_generate_refuses_malformed(self):
        r = self.book.response()
        del r['currentEdition']
        with self.assertRaises(ed.EditionsError):
            self.book.generate(r)


class GenerationTests(EditionsTestCase):
    def test_manifest_rows_and_stamps(self):
        gen = self.book.generate()
        m = gen.manifest
        self.assertEqual([e['editionId'] for e in m['editions']], ['0.77', '1.0', '1.1'])
        self.assertEqual(m['liveEdition'], {'editionId': '1.0', 'label': 'Version 1.0', 'status': 'released'})
        live = ed.live_rail(m, 'dp01')
        self.assertEqual(live['localSha256'], sha(self.book.texts['dp01']))
        self.assertIsNone(live['inscriptionId'])  # 1.0 is not on chain
        row077 = m['editions'][0]['rails'][1]
        self.assertEqual(row077['inscriptionId'], 'dp01i0')
        page = ed.live_rail(m, 'edition')
        self.assertEqual(page['source'], 'book-repo')
        self.assertEqual(page['sha256'], sha(self.book.texts['edition']))
        self.assertEqual(page['revisionEdition'], '1.0')
        self.assertEqual(m['editions'][1]['coverImageInscriptionId'], 'coveri0')
        # archive r05 comes after the 0.77 revision (r01) and before 1.0's r06
        self.assertEqual(gen.archives['archives'][0]['edition'], '1.0')
        self.assertEqual(gen.archives['current_label'], 'Version 1.0')
        srcs = {s['railKey']: s for s in gen.sources_sat['sources']}
        self.assertEqual((srcs['dp01']['inscriptionEdition'], srcs['dp01']['inscriptionOnEditionList']), ('0.77', True))
        # The Introduction's inscription: no Gov Hub revision has its bytes, but the 0.77 list does
        self.assertEqual((srcs['ml-draft-026']['inscriptionEdition'], srcs['ml-draft-026']['inscriptionOnEditionList']),
                         ('0.77', True))
        self.assertNotIn('inscriptionEditionNote', srcs['ml-draft-026'])
        self.assertEqual(m['editions'][0]['rails'][0]['inscriptionId'], 'introi0')
        self.assertEqual(gen.sources_sat['currentEdition'], '1.1')
        self.assertEqual(gen.sources_sat['editionsManifest'], '/json/editions.json')

    def test_inscription_matching_nothing_has_no_edition(self):
        r = self.book.response()
        r['editions'][0]['rails'] = r['editions'][0]['rails'][1:]  # drop the Introduction from 0.77
        gen = self.book.generate(r)
        s = next(x for x in gen.sources_sat['sources'] if x['railKey'] == 'ml-draft-026')
        self.assertEqual((s['inscriptionEdition'], s['inscriptionOnEditionList']), (None, None))
        self.assertIn('No edition', s['inscriptionEditionNote'])
        rep = self.check()
        self.assertTrue(rep.ok, rep.errors)
        self.assertTrue(any('inscription ml-draft-026: no edition' in g for g in rep.gaps), rep.gaps)

    def test_inscription_mismatch_recorded_honestly(self):
        r = self.book.response()
        r['editions'][0]['rails'][1]['sha256'] = 'c' * 64  # the 0.77 list names other bytes
        gen = self.book.generate(r)
        s = next(x for x in gen.sources_sat['sources'] if x['railKey'] == 'dp01')
        self.assertEqual((s['inscriptionEdition'], s['inscriptionOnEditionList']), ('0.77', False))
        self.assertTrue(self.check().ok, self.check().errors)

    def test_post_release_revision_labels_in_progress(self):
        r = self.book.response()
        r['editions'][2]['rails'][2].update(revision='07', submissionId='sub-dp01-r07', sha256='d' * 64,
                                            revisionEdition='1.1')
        self.book.write('content/local/dp1.md', marker('sub-dp01-r07', '07', 'ML-Draft-008') + '# r07\n')
        gen = self.book.generate(r)
        self.assertEqual(gen.manifest['liveEdition']['label'], 'Version 1.1, in progress')
        self.assertEqual(ed.display_edition(gen.manifest, 'dp01', 'sub-dp01-r07')['status'], 'in_progress')
        self.assertEqual(ed.display_edition(gen.manifest, 'ml-draft-026', 'sub-intro-r01')['label'], 'Version 1.0')
        # 1.0's dp01 text is no longer live and has no archive copy: a gap, not an error
        rep = self.check()
        self.assertTrue(rep.ok, rep.errors)
        self.assertTrue(any('1.0 dp01' in g and 'no archive copy' in g for g in rep.gaps), rep.gaps)

    def test_edition_page_frozen_on_released_list(self):
        gen = self.book.generate()
        self.book.write('content/local/edition.md', 'Version 1.1 notice\n')
        gen2 = self.book.generate(previous=gen.manifest)
        rel = next(r for r in gen2.manifest['editions'][1]['rails'] if r['railKey'] == 'edition')
        cur = ed.live_rail(gen2.manifest, 'edition')
        self.assertEqual(rel['sha256'], sha(self.book.texts['edition']))
        self.assertEqual(cur['sha256'], sha('Version 1.1 notice\n'))
        self.assertEqual(cur['revisionEdition'], '1.1')

    def test_live_revision_cross_check(self):
        gen = self.book.generate()
        self.assertEqual(ed.check_live_matches_record(gen.manifest, {'dp01': 'sub-dp01-r06'}), [])
        self.assertTrue(ed.check_live_matches_record(gen.manifest, {'dp01': 'sub-dp01-r09'}))


class AgreementTests(EditionsTestCase):
    def test_today_agrees(self):
        self.book.generate()
        rep = self.check()
        self.assertEqual(rep.errors, [])

    def test_rail_changed_without_sync(self):
        self.book.generate()
        self.book.write('content/local/dp1.md', self.book.texts['dp01'] + 'hand edit\n')
        errs = self.check().errors
        self.assertTrue(any('localSha256' in e and 'dp01' in e for e in errs), errs)

    def test_hand_edit_of_manifest_fails(self):
        self.book.generate()
        p = self.book.root / 'json' / 'editions.json'
        m = json.loads(p.read_text(encoding='utf-8'))
        m['editions'][1]['label'] = 'Version One'
        p.write_text(ed.dump_json(m), encoding='utf-8')
        errs = self.check().errors
        self.assertTrue(any('not what the generator makes' in e for e in errs), errs)

    def test_two_in_progress_in_manifest_fails(self):
        self.book.generate()
        p = self.book.root / 'json' / 'editions.json'
        m = json.loads(p.read_text(encoding='utf-8'))
        m['editions'][1]['status'] = 'in_progress'
        p.write_text(ed.dump_json(m), encoding='utf-8')
        self.assertTrue(any('exactly one edition must be in progress' in e
                            for e in ed.check_agreement(self.tmp, book_root=self.book.root).errors))

    def test_wrong_archive_stamp_fails(self):
        self.book.generate()
        p = self.book.root / 'json' / 'chapter-archives.json'
        a = json.loads(p.read_text(encoding='utf-8'))
        a['archives'][0]['edition'] = '0.77'
        a['current_label'] = 'Version 1.0'
        p.write_text(ed.dump_json(a), encoding='utf-8')
        errs = self.check().errors
        self.assertTrue(any('archive dp01/5' in e for e in errs), errs)

    def test_wrong_inscription_stamp_fails(self):
        self.book.generate()
        p = self.book.root / 'json' / 'sources-sat.json'
        s = json.loads(p.read_text(encoding='utf-8'))
        next(x for x in s['sources'] if x['railKey'] == 'dp01')['inscriptionEdition'] = '1.0'
        p.write_text(ed.dump_json(s), encoding='utf-8')
        self.assertTrue(any('inscription dp01' in e for e in self.check().errors))

    def test_pdf_stamps(self):
        gen = self.book.generate()
        out = self.tmp / 'desirableproperties-book' / 'downloads' / 'dp'
        out.mkdir(parents=True)
        good = ed.chapter_pdf_keywords(gen.manifest, 'dp01', 'sub-dp01-r06', None)
        (out / 'DP1.pdf').write_bytes(minimal_pdf(good))
        (out / 'DP1-bad.pdf').write_bytes(minimal_pdf('dp-edition=1.1; dp-rail=dp01; dp-submission=sub-dp01-r06'))
        (out / 'DP1-old.pdf').write_bytes(minimal_pdf(''))
        rep = ed.check_agreement(self.tmp, book_root=self.book.root)
        self.assertEqual([e for e in rep.errors if 'DP1.pdf' in e], [])
        self.assertTrue(any('DP1-bad.pdf' in e and 'stamped 1.1' in e for e in rep.errors), rep.errors)
        self.assertTrue(any('1 PDF(s) with no edition stamp' in g for g in rep.gaps), rep.gaps)

    def test_compilation_pdf_stamp(self):
        self.book.generate()
        out = self.tmp / 'docs'
        (out / 'dp-pdfs').mkdir(parents=True)
        (out / 'dp-pdfs' / 'ok.pdf').write_bytes(minimal_pdf('dp-edition=0.77; dp-rails=dp01'))
        (out / 'dp-pdfs' / 'bad.pdf').write_bytes(minimal_pdf('dp-edition=0.77; dp-rails=dp01,dp24'))
        errs = ed.check_agreement(self.tmp, book_root=self.book.root).errors
        self.assertFalse(any('ok.pdf' in e for e in errs), errs)
        self.assertTrue(any('bad.pdf' in e and 'dp24' in e for e in errs), errs)

    def test_book_pdf_stamp(self):
        gen = self.book.generate()
        out = self.tmp / 'challenge-site' / 'public' / 'downloads'
        out.mkdir(parents=True)
        e10 = gen.manifest['editions'][1]
        kw = f'dp-edition=1.0; dp-edition-status=released; dp-edition-rails-sha256={ed.edition_rails_sha256(e10)}'
        (out / 'desirable-properties-v1.0.pdf').write_bytes(minimal_pdf(kw))
        self.assertEqual(ed.check_agreement(self.tmp, book_root=self.book.root).errors, [])
        bad = kw.replace(ed.edition_rails_sha256(e10), '0' * 64)
        (out / 'desirable-properties-v1.0.pdf').write_bytes(minimal_pdf(bad))
        self.assertTrue(ed.check_agreement(self.tmp, book_root=self.book.root).errors)


class PdfInfoTests(unittest.TestCase):
    def test_reads_literal_and_compressed(self):
        import zlib
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'a.pdf'
            p.write_bytes(minimal_pdf('dp-edition=1.0; dp-rail=dp01'))
            self.assertEqual(ed.parse_pdf_stamp(ed.pdf_info(p)['Keywords']),
                             {'dp-edition': '1.0', 'dp-rail': 'dp01'})
            body = zlib.compress(b'<</Producer (WeasyPrint)/Title (T \\(Version 1.0\\))/Keywords (dp-edition=0.77)>>')
            p.write_bytes(b'%PDF-1.7\n1 0 obj\n<</Type /ObjStm>>\nstream\n' + body + b'\nendstream\nendobj\n')
            info = ed.pdf_info(p)
            self.assertEqual(info['Keywords'], 'dp-edition=0.77')
            self.assertEqual(info['Title'], 'T (Version 1.0)')

    def test_incremental_update_wins_and_outline_titles_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'b.pdf'
            p.write_bytes(b'%PDF-1.4\n1 0 obj\n<</Title (Book)>>\nendobj\n5 0 obj\n<</Title (Chapter 9)>>\nendobj\n'
                          b'trailer\n<</Info 1 0 R>>\n%%EOF\n'
                          b'6 0 obj\n<</Title (Book)/Keywords (dp-edition\\0751.0)>>\nendobj\n'
                          b'trailer\n<</Info 6 0 R/Prev 0>>\n%%EOF\n')
            self.assertEqual(ed.pdf_info(p), {'Keywords': 'dp-edition=1.0', 'Title': 'Book'})


def minimal_pdf(keywords: str) -> bytes:
    info = f'<</Title (t)/Keywords ({keywords})>>' if keywords else '<</Title (t)>>'
    return f'%PDF-1.4\n1 0 obj\n{info}\nendobj\ntrailer\n<</Info 1 0 R>>\n%%EOF\n'.encode('latin-1')


class RepoTests(unittest.TestCase):
    """The committed files agree today (same check CI runs)."""

    def test_repo_agrees(self):
        rep = ed.check_agreement(REPO)
        _, diffs = ed.regenerate_from_snapshot(REPO / 'desirableproperties-book')
        self.assertEqual(rep.errors + diffs, [])


if __name__ == '__main__':
    unittest.main()
