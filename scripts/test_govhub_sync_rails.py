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


if __name__ == '__main__':
    unittest.main()
