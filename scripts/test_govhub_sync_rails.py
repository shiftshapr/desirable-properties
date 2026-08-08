#!/usr/bin/env python3
"""Unit tests for Gov Hub → rail sync helpers (no network required)."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from govhub_dp_common import (  # noqa: E402
    format_sync_marker,
    load_dp_manifest,
    load_front_matter_manifest,
    load_sync_rails_manifest,
    local_rail_filename,
    local_rail_path,
    parse_sync_marker,
    strip_sync_marker,
    upsert_sync_marker,
)


class GovhubSyncCommonTests(unittest.TestCase):
    def test_load_dp_manifest_filters_and_sorts(self):
        payload = {
            'sources': [
                {'railKey': 'dp02', 'dp': 'DP2', 'mlNumber': 'ML-Draft-009',
                 'localOverride': '/content/local/dp2.md'},
                {'railKey': 'book_cover', 'label': 'cover'},
                {'railKey': 'dp01', 'dp': 'DP1', 'mlNumber': 'ML-Draft-008',
                 'localOverride': '/content/local/dp1.md'},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sources-sat.json'
            path.write_text(json.dumps(payload), encoding='utf-8')
            rails = load_dp_manifest(path)
        self.assertEqual([r['dp'] for r in rails], ['DP1', 'DP2'])
        self.assertEqual(rails[0]['ml_number'], 'ML-Draft-008')

    def test_load_front_matter_manifest(self):
        payload = {
            'sources': [
                {'railKey': 'acknowledgements', 'label': 'Acknowledgements',
                 'mlNumber': 'ML-Draft-032', 'localOverride': '/content/local/acknowledgements.md'},
                {'railKey': 'about', 'label': 'About This Digital Monument',
                 'mlNumber': 'ML-Draft-031', 'localOverride': '/content/local/about.md'},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sources-sat.json'
            path.write_text(json.dumps(payload), encoding='utf-8')
            rails = load_front_matter_manifest(path)
        self.assertEqual([r['railKey'] for r in rails], ['about', 'acknowledgements'])
        self.assertEqual(rails[0]['ml_number'], 'ML-Draft-031')

    def test_load_sync_rails_manifest_orders_front_matter_first(self):
        payload = {
            'sources': [
                {'railKey': 'dp01', 'dp': 'DP1', 'mlNumber': 'ML-Draft-008',
                 'localOverride': '/content/local/dp1.md'},
                {'railKey': 'about', 'label': 'About This Digital Monument',
                 'mlNumber': 'ML-Draft-031', 'localOverride': '/content/local/about.md'},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sources-sat.json'
            path.write_text(json.dumps(payload), encoding='utf-8')
            rails = load_sync_rails_manifest(path)
        self.assertEqual([r['railKey'] for r in rails], ['about', 'dp01'])

    def test_local_rail_path_resolution(self):
        rail = {
            'dp_number': 13,
            'local_override': '/content/local/dp13.md',
        }
        self.assertEqual(local_rail_filename(rail), 'dp13.md')
        self.assertEqual(
            local_rail_path(Path('/book/content/local'), rail),
            Path('/book/content/local/dp13.md'),
        )

    def test_local_rail_filename_front_matter(self):
        rail = {
            'kind': 'front_matter',
            'railKey': 'about',
            'local_override': '/content/local/about.md',
        }
        self.assertEqual(local_rail_filename(rail), 'about.md')

    def test_sync_marker_roundtrip(self):
        marker = format_sync_marker(
            ml_number='ML-Draft-008',
            revision_number='02',
            submission_id='abc-123',
            content_hash='a' * 64,
            synced_at='2026-08-03T12:00:00Z',
        )
        body = '# Title\n\nParagraph.\n'
        merged = upsert_sync_marker(body, marker)
        parsed = parse_sync_marker(merged)
        self.assertIsNotNone(parsed)
        assert parsed is not None
        self.assertEqual(parsed['ml'], 'ML-Draft-008')
        self.assertEqual(parsed['revision'], '02')
        self.assertEqual(parsed['submission'], 'abc-123')
        self.assertEqual(strip_sync_marker(merged), body.rstrip('\n'))

    def test_upsert_replaces_existing_marker(self):
        old = (
            '# DP1\n\n<!-- govhub-sync: ml=ML-Draft-008 revision=01 submission=old hash=abc synced=2026-01-01T00:00:00Z -->\n'
        )
        new_marker = format_sync_marker(
            ml_number='ML-Draft-008',
            revision_number='02',
            submission_id='new-id',
            content_hash='deadbeef',
            synced_at='2026-08-03T12:00:00Z',
        )
        merged = upsert_sync_marker(old, new_marker)
        self.assertEqual(merged.count('govhub-sync:'), 1)
        parsed = parse_sync_marker(merged)
        assert parsed is not None
        self.assertEqual(parsed['revision'], '02')
        self.assertEqual(parsed['submission'], 'new-id')

    def test_extract_image_urls(self):
        from govhub_rail_image_sync import extract_image_urls

        body = (
            '# Title\n\n'
            '![DP1 art](https://example.com/DP1.webp)\n\n'
            '<img src="/static/images/dp/dp1.png" alt="inline">\n'
        )
        self.assertEqual(
            extract_image_urls(body),
            [
                'https://example.com/DP1.webp',
                '/static/images/dp/dp1.png',
            ],
        )

    def test_sync_images_copies_and_rewrites(self):
        from govhub_rail_image_sync import sync_images_from_markdown

        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
            b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4'
            b'\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        with tempfile.TemporaryDirectory() as tmp:
            book_root = Path(tmp) / 'book'
            (book_root / 'content' / 'local' / 'assets' / 'dp').mkdir(parents=True)
            body = '![DP1](https://example.com/images/DP1.webp)\n'
            calls: list[str] = []

            def fake_fetch(url: str, *, timeout: float = 30.0) -> bytes:
                calls.append(url)
                return png_bytes

            import govhub_rail_image_sync as mod

            original = mod._fetch_bytes
            mod._fetch_bytes = fake_fetch
            try:
                summary = sync_images_from_markdown(
                    body,
                    book_root=book_root,
                    hub_url='https://hub.example',
                    dry_run=False,
                )
            finally:
                mod._fetch_bytes = original

            dest = book_root / 'content' / 'local' / 'assets' / 'dp' / 'DP1.webp'
            self.assertTrue(dest.is_file())
            self.assertIn('/content/local/assets/dp/DP1.webp', summary.body)
            self.assertTrue(summary.assets_changed)
            self.assertEqual(summary.results[0].status, 'copied')

            summary_again = sync_images_from_markdown(
                summary.body,
                book_root=book_root,
                hub_url='https://hub.example',
                dry_run=False,
            )
            self.assertFalse(summary_again.assets_changed)
            self.assertEqual(summary_again.results[0].status, 'unchanged')


if __name__ == '__main__':
    unittest.main()
