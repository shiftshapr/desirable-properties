#!/usr/bin/env python3
"""Unit tests for same-day publish guard helpers (no network or DB required)."""
from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from govhub_dp_common import (  # noqa: E402
    find_same_day_approved_revision,
    same_day_publish_block_message,
    utc_date_from_timestamp,
)


class GovhubPublishGuardTests(unittest.TestCase):
    def test_utc_date_from_naive_datetime(self):
        dt = datetime(2026, 8, 5, 23, 59, 59)
        self.assertEqual(utc_date_from_timestamp(dt), date(2026, 8, 5))

    def test_utc_date_from_iso_string(self):
        self.assertEqual(
            utc_date_from_timestamp('2026-08-05T13:25:28.046258'),
            date(2026, 8, 5),
        )
        self.assertEqual(
            utc_date_from_timestamp('2026-08-05T13:25:28.046258Z'),
            date(2026, 8, 5),
        )

    def test_find_same_day_approved_revision_blocks(self):
        revisions = [
            {'status': 'approved', 'approved_at': datetime(2026, 8, 4, 12, 0), 'revision_number': '02'},
            {'status': 'approved', 'approved_at': datetime(2026, 8, 5, 13, 25), 'revision_number': '03'},
        ]
        hit = find_same_day_approved_revision(revisions, reference_date=date(2026, 8, 5))
        self.assertIsNotNone(hit)
        assert hit is not None
        self.assertEqual(hit['revision_number'], '03')

    def test_find_same_day_approved_revision_ignores_submitted(self):
        revisions = [
            {'status': 'submitted', 'approved_at': None, 'revision_number': '05'},
            {'status': 'approved', 'approved_at': datetime(2026, 8, 4, 9, 0), 'revision_number': '02'},
        ]
        self.assertIsNone(
            find_same_day_approved_revision(revisions, reference_date=date(2026, 8, 5))
        )

    def test_find_same_day_approved_revision_empty_family(self):
        self.assertIsNone(
            find_same_day_approved_revision([], reference_date=date(2026, 8, 5))
        )

    def test_same_day_publish_block_message(self):
        msg = same_day_publish_block_message(
            ml_number='ML-Draft-008',
            display_key='DP1',
            revision_number='03',
            approved_date=date(2026, 8, 5),
        )
        self.assertIn('DP1', msg)
        self.assertIn('ML-Draft-008', msg)
        self.assertIn('revision 03', msg)
        self.assertIn('2026-08-05 UTC', msg)
        self.assertIn('--force', msg)


if __name__ == '__main__':
    unittest.main()
